<#
.SYNOPSIS
Stop only this checkout's local applications and optionally its Compose services.
#>
[CmdletBinding()]
param([switch]$Services)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
. (Join-Path $taskRoot 'runtime-common.ps1')
$taskMarkers = @{
    backend = (Join-Path (Split-Path $taskRoot) 'yubi-backend-master/yubi-backend-master/target/yubi-backend-0.0.1-SNAPSHOT.jar')
    frontend = (Join-Path $taskRoot 'serve-frontend.cjs')
}
foreach ($taskName in $taskMarkers.Keys) {
    $taskPidFile = Join-Path $taskRoot ($taskName + '.pid')
    if (!(Test-Path -LiteralPath $taskPidFile)) { continue }
    $taskSavedId = [int](Get-Content -LiteralPath $taskPidFile -Raw)
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskSavedId" -ErrorAction SilentlyContinue
    if ($taskProcess -and $taskProcess.CommandLine.Contains($taskMarkers[$taskName])) {
        Stop-Process -Id $taskSavedId
        Write-Output "Stopped $taskName."
    } elseif ($taskProcess) {
        throw "PID $taskSavedId belongs to another process; it has not been stopped."
    }
    Remove-Item -LiteralPath $taskPidFile
}
if ($Services) {
    Assert-ComposeOwnership
    & docker @taskComposeArgs stop
    if ($LASTEXITCODE -ne 0) { throw 'Stopping BI services failed.' }
}
Write-Output 'BI data volumes are preserved.'
