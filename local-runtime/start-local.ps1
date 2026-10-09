<#
.SYNOPSIS
Start this checkout's isolated local services and application.
.DESCRIPTION
Requires PowerShell 7, Docker Compose, JDK 17, Maven and Node.js 18.
Copy .env.example to .env, replace its password placeholders, install frontend
dependencies and build its dist before starting. No credentials are printed.
.PARAMETER JavaHome
JDK location. Defaults to JAVA_HOME, then the java executable on PATH.
.PARAMETER MavenCommand
Maven command or executable path. Defaults to mvn on PATH.
.PARAMETER NodeCommand
Node command or executable path. Defaults to node on PATH.
#>
[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$SkipServices,
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$MavenCommand = 'mvn',
    [string]$NodeCommand = 'node'
)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
. (Join-Path $taskRoot 'runtime-common.ps1')
$taskBackend = Join-Path (Split-Path $taskRoot) 'yubi-backend-master/yubi-backend-master'
$taskJar = Join-Path $taskBackend 'target/yubi-backend-0.0.1-SNAPSHOT.jar'
$taskFrontend = Join-Path (Split-Path $taskRoot) 'yubi-frontend-master/yubi-frontend-master'
$taskFrontendScript = Join-Path $taskRoot 'serve-frontend.cjs'
$taskSocketDir = Join-Path ([IO.Path]::GetTempPath()) 'ai-bi-sockets'
$taskLogs = Join-Path $taskRoot 'logs'

function Resolve-LocalCommand([string]$Command) {
    $taskCommandInfo = Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (!$taskCommandInfo) { throw "Required executable is missing: $Command" }
    return $taskCommandInfo.Source
}
if ($JavaHome) {
    $taskJava = Join-Path $JavaHome 'bin/java.exe'
    if (!(Test-Path -LiteralPath $taskJava)) { throw 'JavaHome must point to an installed JDK.' }
} else {
    $taskJava = Resolve-LocalCommand 'java'
    $JavaHome = Split-Path (Split-Path $taskJava)
}
$taskNode = Resolve-LocalCommand $NodeCommand
if (!(Test-Path -LiteralPath (Join-Path $taskFrontend 'dist/index.html'))) {
    throw 'Frontend dist is missing. Install dependencies and build the frontend first; see README.md.'
}

function Import-LocalEnv([string]$File) {
    if (!(Test-Path -LiteralPath $File)) { return }
    foreach ($taskLine in Get-Content -LiteralPath $File) {
        if ($taskLine -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}
# Isolate this child launch from another project's inherited Spring settings.
Get-ChildItem Env: | Where-Object {$_.Name -match '^(SPRING_|SERVER_|YUAPI_|BI_AI_|YUCONGMING_)'} | ForEach-Object {
    [Environment]::SetEnvironmentVariable($_.Name, $null, 'Process')
}
if (!(Test-Path -LiteralPath (Join-Path $taskRoot '.env'))) {
    throw 'Copy .env.example to .env and replace the password placeholders before starting.'
}
Import-LocalEnv (Join-Path $taskRoot '.env')
Import-LocalEnv (Join-Path $taskRoot 'private/ai.env')
foreach ($taskKey in @('MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'REDIS_PASSWORD', 'RABBITMQ_DEFAULT_PASS', 'MYSQL_DATABASE', 'MYSQL_USER', 'RABBITMQ_DEFAULT_USER', 'RABBITMQ_DEFAULT_VHOST')) {
    $taskValue = [Environment]::GetEnvironmentVariable($taskKey, 'Process')
    if ([string]::IsNullOrWhiteSpace($taskValue) -or $taskValue.StartsWith('CHANGE_ME')) {
        throw "Configure $taskKey in .env before starting."
    }
}
$taskAiEnabled = if ($env:BI_AI_ENABLED -eq 'true') {'true'} else {'false'}

function Get-ManagedProcess([string]$Name, [string]$Marker) {
    $taskPidFile = Join-Path $taskRoot ($Name + '.pid')
    if (!(Test-Path -LiteralPath $taskPidFile)) { return $null }
    $taskSavedId = [int](Get-Content -LiteralPath $taskPidFile -Raw)
    $taskExisting = Get-CimInstance Win32_Process -Filter "ProcessId = $taskSavedId" -ErrorAction SilentlyContinue
    if ($taskExisting -and $taskExisting.CommandLine -and $taskExisting.CommandLine.Contains($Marker)) { return $taskExisting }
    return $null
}
function Assert-ApplicationPort([string]$Name, [int]$Port, [string]$Marker) {
    $taskExisting = Get-ManagedProcess $Name $Marker
    $taskListeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    if ($taskListeners.Count -and (!$taskExisting -or @($taskListeners | Where-Object {$_.OwningProcess -ne $taskExisting.ProcessId}).Count)) {
        throw "Port $Port is occupied by another process; it has not been stopped."
    }
}
# Check app conflicts before creating services or building anything.
Assert-ApplicationPort 'backend' 8080 $taskJar
Assert-ApplicationPort 'frontend' 8000 $taskFrontendScript
if ($Build -and (Get-ManagedProcess 'backend' $taskJar)) {
    throw 'Stop this checkout with stop-local.ps1 before rebuilding its running backend.'
}
Assert-ComposeOwnership
if (!$SkipServices) {
    & docker @taskComposeArgs up -d --wait --wait-timeout 120
    if ($LASTEXITCODE -ne 0) { throw 'Local service startup failed. Check for occupied service ports; no other process is stopped.' }
}
# Even with -SkipServices, never connect to another project's services on these ports.
foreach ($taskBinding in @(@('mysql', '3306', '127.0.0.1:3307'), @('redis', '6379', '127.0.0.1:6380'), @('rabbitmq', '5672', '127.0.0.1:5673'))) {
    $taskPublishedPort = & docker @taskComposeArgs port $taskBinding[0] $taskBinding[1]
    if ($LASTEXITCODE -ne 0 -or $taskPublishedPort -ne $taskBinding[2]) {
        throw ('This checkout does not own the required service port for ' + $taskBinding[0] + '. No application was started.')
    }
}
if ($Build -or !(Test-Path -LiteralPath $taskJar)) {
    $taskMaven = Resolve-LocalCommand $MavenCommand
    $env:JAVA_HOME = $JavaHome
    $env:JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
    Push-Location $taskBackend
    try {
        & $taskMaven package '-DskipTests'
        if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    } finally { Pop-Location }
}
New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
New-Item -ItemType Directory -Path $taskSocketDir -Force | Out-Null

function Start-Managed([string]$Name, [int]$Port, [string]$Executable, [string[]]$Arguments, [string]$Marker) {
    $taskExisting = Get-ManagedProcess $Name $Marker
    if ($taskExisting) {
        Write-Output "$Name already running (PID $($taskExisting.ProcessId))."
        return
    }
    Assert-ApplicationPort $Name $Port $Marker
    $taskProcess = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLogs "$Name.log") -RedirectStandardError (Join-Path $taskLogs "$Name-error.log")
    Set-Content -LiteralPath (Join-Path $taskRoot ($Name + '.pid')) -Value $taskProcess.Id
    Write-Output "$Name started (PID $($taskProcess.Id))."
}

Start-Managed 'backend' 8080 $taskJava @('-Dfile.encoding=UTF-8', ('"-Djdk.net.unixdomain.tmpdir=' + $taskSocketDir + '"'), '-jar', ('"' + $taskJar + '"'), '--spring.profiles.active=local', '--spring.config.additional-location=file:./backend-local.yml', "--bi.ai.enabled=$taskAiEnabled") $taskJar
Start-Managed 'frontend' 8000 $taskNode @(('"' + $taskFrontendScript + '"')) $taskFrontendScript
$taskBackendId = [int](Get-Content -LiteralPath (Join-Path $taskRoot 'backend.pid') -Raw)
$taskReady = $false
for ($taskAttempt = 0; $taskAttempt -lt 60; $taskAttempt++) {
    if (!(Get-Process -Id $taskBackendId -ErrorAction SilentlyContinue)) {
        throw 'Backend exited. See logs/backend.log and logs/backend-error.log.'
    }
    try {
        $taskProbe = Invoke-RestMethod 'http://127.0.0.1:8080/api/user/get/login' -TimeoutSec 2
        if ($taskProbe.code -eq 40100) { $taskReady = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
}
if (!$taskReady) { throw 'Backend is not ready yet. See logs/backend.log.' }
Write-Output 'Frontend: http://localhost:8000 | Backend: http://localhost:8080/api'
Write-Output "AI enabled for this launch: $taskAiEnabled"
