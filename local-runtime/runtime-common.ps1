# Dot-source this file from the local runtime scripts.
$taskComposeArgs = @('compose', '--project-name', 'ai-bi-platform', '--project-directory', $PSScriptRoot, '-f', (Join-Path $PSScriptRoot 'compose.yaml'))

function Assert-ComposeOwnership {
    # Do not reuse or stop a Compose project created from a different checkout.
    $taskIds = @(& docker ps -aq --filter 'label=com.docker.compose.project=ai-bi-platform')
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Docker containers.' }
    foreach ($taskContainerId in $taskIds) {
        $taskOwner = & docker inspect --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' $taskContainerId
        if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Docker container ownership.' }
        if (!$taskOwner -or [IO.Path]::GetFullPath($taskOwner).TrimEnd('\', '/') -ne [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\', '/')) {
            throw 'The ai-bi-platform Docker project belongs to another checkout. No containers were changed.'
        }
    }
}
