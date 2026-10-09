<#
.SYNOPSIS
Verify this checkout's running local application without printing login credentials.
#>
[CmdletBinding()]
param([switch]$VerifyDisabledAi)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskApi = 'http://127.0.0.1:8080/api'
# Never register or log in against another project that happens to use this port.
$taskPidFile = Join-Path $taskRoot 'backend.pid'
if (!(Test-Path -LiteralPath $taskPidFile)) { throw 'Start this BI backend before running verification.' }
$taskBackendId = [int](Get-Content -LiteralPath $taskPidFile -Raw)
$taskJar = Join-Path (Split-Path $taskRoot) 'yubi-backend-master/yubi-backend-master/target/yubi-backend-0.0.1-SNAPSHOT.jar'
$taskBackendProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskBackendId" -ErrorAction SilentlyContinue
$taskListeners = @(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue)
if (!$taskBackendProcess -or !$taskBackendProcess.CommandLine.Contains($taskJar) -or !$taskListeners.Count -or @($taskListeners | Where-Object {$_.OwningProcess -ne $taskBackendId}).Count) {
    throw 'Port 8080 is not owned exclusively by this BI backend; no requests were sent.'
}
$taskPrivate = Join-Path $taskRoot 'private'
New-Item -ItemType Directory -Path $taskPrivate -Force | Out-Null
$taskAccountFile = Join-Path $taskPrivate 'login-account.json'
if (!(Test-Path -LiteralPath $taskAccountFile)) {
    $taskRandom = [byte[]]::new(16)
    [Security.Cryptography.RandomNumberGenerator]::Fill($taskRandom)
    @{ userAccount = 'local_check_' + [Guid]::NewGuid().ToString('N').Substring(0, 12); userPassword = [Convert]::ToHexString($taskRandom) } |
        ConvertTo-Json | Set-Content -LiteralPath $taskAccountFile -Encoding utf8
}
$taskAccount = Get-Content -LiteralPath $taskAccountFile -Raw | ConvertFrom-Json
$taskRegistration = @{
    userAccount = $taskAccount.userAccount
    userPassword = $taskAccount.userPassword
    checkPassword = $taskAccount.userPassword
} | ConvertTo-Json
$taskRegisterResult = Invoke-RestMethod "$taskApi/user/register" -Method Post -ContentType 'application/json' -Body $taskRegistration
# Repeated runs reuse the same account; login verifies the existing password.
$taskLogin = Invoke-RestMethod "$taskApi/user/login" -Method Post -ContentType 'application/json' -Body ($taskAccount | ConvertTo-Json) -SessionVariable taskSession
if ($taskLogin.code -ne 0) { throw "Local login failed (code $($taskLogin.code))." }
$taskCurrent = Invoke-RestMethod "$taskApi/user/get/login" -WebSession $taskSession
if ($taskCurrent.code -ne 0 -or $taskCurrent.data.id -ne $taskLogin.data.id) { throw 'Session verification failed.' }
Write-Output 'MySQL registration/login and authenticated session: PASS'
$taskList = Invoke-RestMethod "$taskApi/chart/my/list/page" -Method Post -ContentType 'application/json' -Body '{"current":1,"pageSize":10}' -WebSession $taskSession
if ($taskList.code -ne 0) { throw 'Chart list query failed.' }
Write-Output 'Authenticated chart list query: PASS'
$taskFront = Invoke-WebRequest 'http://localhost:8000/user/login'
if ($taskFront.StatusCode -ne 200) { throw 'Frontend route failed.' }
Write-Output 'Frontend production SPA route: PASS'

if ($VerifyDisabledAi) {
    if ($taskBackendProcess.CommandLine -notmatch '--bi\.ai\.enabled=false(?:\s|$)') {
        throw 'The running BI process must explicitly disable AI for this check; no AI requests were sent.'
    }
    $taskExcel = Join-Path (Split-Path $taskRoot) 'yubi-backend-master/yubi-backend-master/src/main/resources/test_excel.xlsx'
    $taskForm = @{ file = Get-Item -LiteralPath $taskExcel; name = 'Local integration - AI disabled'; goal = 'Analyze sample counts'; chartType = 'line' }
    $taskSync = Invoke-RestMethod "$taskApi/chart/gen" -Method Post -Form $taskForm -WebSession $taskSession
    if ($taskSync.code -ne 50001 -or $taskSync.message -notmatch 'AI.*尚未启用') { throw 'Expected an explicit AI unavailable response.' }
    Write-Output 'Excel parsing and Redis rate-limiter request path: PASS; AI unavailable response expected'

    foreach ($taskEndpoint in @('gen/async', 'gen/async/mq')) {
        Start-Sleep -Milliseconds 1200
        $taskSubmit = Invoke-RestMethod "$taskApi/chart/$taskEndpoint" -Method Post -Form $taskForm -WebSession $taskSession
        if ($taskSubmit.code -ne 0 -or !$taskSubmit.data.chartId) { throw "Task submit failed: $taskEndpoint" }
        $taskChartId = $taskSubmit.data.chartId
        $taskState = $null
        for ($taskAttempt = 0; $taskAttempt -lt 40; $taskAttempt++) {
            $taskState = Invoke-RestMethod "$taskApi/chart/get?id=$taskChartId" -WebSession $taskSession
            if ($taskState.code -ne 0) { throw 'Task lookup failed.' }
            if ($taskState.data.status -in @('succeed', 'failed')) { break }
            Start-Sleep -Milliseconds 250
        }
        if ($taskState.data.status -ne 'failed' -or [string]::IsNullOrWhiteSpace($taskState.data.execMessage)) {
            throw "Task $taskChartId did not persist the expected AI-disabled failure."
        }
        Write-Output "$taskEndpoint : PASS (chart $taskChartId -> failed, reason recorded; AI disabled)"
    }
}
Write-Output 'Login credentials saved in private/login-account.json; secret not printed.'
