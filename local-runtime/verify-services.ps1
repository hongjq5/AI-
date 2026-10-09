<#
.SYNOPSIS
Verify only the Docker Compose services belonging to this checkout.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$runtimeDirectory = $PSScriptRoot
. (Join-Path $runtimeDirectory 'runtime-common.ps1')
Assert-ComposeOwnership
$taskRabbitPort = & docker @taskComposeArgs port rabbitmq 15672
if ($LASTEXITCODE -ne 0 -or $taskRabbitPort -ne '127.0.0.1:15673') {
    throw 'This checkout does not own the expected RabbitMQ management port; no verification requests were sent.'
}
$settings = @{}
foreach ($line in [System.IO.File]::ReadAllLines((Join-Path $runtimeDirectory '.env'))) {
    if ($line -match '^([^#=]+)=(.*)$') {
        $settings[$matches[1]] = $matches[2]
    }
}

$mysqlScript = @'
export MYSQL_PWD="$MYSQL_PASSWORD"
mysql --protocol=TCP -h 127.0.0.1 -u "$MYSQL_USER" "$MYSQL_DATABASE" --batch <<'SQL'
SELECT 1 AS connection_ok, DATABASE() AS database_name, CURRENT_USER() AS database_user;
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME;
START TRANSACTION;
INSERT INTO user (userAccount, userPassword, userName) VALUES (CONCAT('local_validation_', UUID()), 'validation-only', 'Temporary service validation');
SELECT ROW_COUNT() AS insert_ok;
ROLLBACK;
SQL
exit $?
'@
($mysqlScript + "`n") | docker @taskComposeArgs exec -T mysql sh
if ($LASTEXITCODE -ne 0) { throw 'MySQL authenticated schema/write validation failed.' }

$redisScript = @'
export REDISCLI_AUTH="$REDIS_PASSWORD"
set -eu
redis-cli ping
test "$(redis-cli set yubi:local-validation:connection verified EX 60)" = OK
test "$(redis-cli get yubi:local-validation:connection)" = verified
redis-cli del yubi:local-validation:connection >/dev/null
echo 'Redis authenticated SET/GET/DEL: PASS'
exit 0
'@
($redisScript + "`n") | docker @taskComposeArgs exec -T redis sh
if ($LASTEXITCODE -ne 0) { throw 'Redis authenticated read/write validation failed.' }

docker @taskComposeArgs exec -T rabbitmq rabbitmq-diagnostics -q ping
if ($LASTEXITCODE -ne 0) { throw 'RabbitMQ node health validation failed.' }

$credentialText = $settings['RABBITMQ_DEFAULT_USER'] + ':' + $settings['RABBITMQ_DEFAULT_PASS']
$headers = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($credentialText)) }
$apiBase = 'http://127.0.0.1:15673/api'
$vhost = [Uri]::EscapeDataString($settings['RABBITMQ_DEFAULT_VHOST'])
$queue = 'ai-bi-local-validation-' + [Guid]::NewGuid().ToString('N')
$queueUrl = "$apiBase/queues/$vhost/$queue"
$queueCreated = $false
try {
    $null = Invoke-RestMethod -Uri $queueUrl -Method Put -Headers $headers -ContentType 'application/json' -Body '{"durable":false,"auto_delete":false,"arguments":{}}'
    $queueCreated = $true
    $message = 'BI local service validation'
    $publishBody = @{ properties = @{}; routing_key = $queue; payload = $message; payload_encoding = 'string' } | ConvertTo-Json -Compress
    $published = Invoke-RestMethod -Uri "$apiBase/exchanges/$vhost/amq.default/publish" -Method Post -Headers $headers -ContentType 'application/json' -Body $publishBody
    if (-not $published.routed) { throw 'RabbitMQ test message was not routed.' }
    $received = @(Invoke-RestMethod -Uri "$queueUrl/get" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto","truncate":1000}')
    if ($received.Count -ne 1 -or $received[0].payload -ne $message) { throw 'RabbitMQ published/consumed payload mismatch.' }
    Write-Output 'RabbitMQ authenticated queue declare/publish/consume/delete: PASS'
}
finally {
    if ($queueCreated) {
        $null = Invoke-RestMethod -Uri $queueUrl -Method Delete -Headers $headers
    }
    $credentialText = $null
    $headers = $null
    $settings.Clear()
}

docker @taskComposeArgs ps
if ($LASTEXITCODE -ne 0) { throw 'Unable to read Docker Compose service status.' }
