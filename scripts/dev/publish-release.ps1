param([Parameter(Mandatory = $true)][string]$Version)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$tagCreated = $false
$tagPushed = $false
Push-Location $root
try {
    # Version and credential checks happen BEFORE any remote operation.
    & (Join-Path $PSScriptRoot 'Test-Release.ps1') -Version $Version
    if ($LASTEXITCODE -ne 0) { throw 'Safety checks failed.' }
    $versionNumber = (Get-Content -LiteralPath 'version.json' -Raw | ConvertFrom-Json).version
    $tag = "v$versionNumber"
    $branch = & git branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Publish from the main branch only.' }
    if (@(& git status --porcelain).Count -gt 0) { throw 'Working tree is not clean. Commit and push before publishing.' }

    Write-Host 'Updating main...'
    & git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw 'git pull failed.' }
    & (Join-Path $PSScriptRoot 'Test-Release.ps1') -Version $Version
    if ($LASTEXITCODE -ne 0) { throw 'Safety checks failed after pull.' }
    $headCommit = & git rev-parse HEAD
    $originCommit = & git rev-parse refs/remotes/origin/main
    if ($LASTEXITCODE -ne 0 -or $headCommit -ne $originCommit) { throw 'Push main first (git push), then rerun publication.' }

    & git show-ref --verify --quiet "refs/tags/$tag"
    if ($LASTEXITCODE -eq 0) { throw "Tag $tag already exists locally. No replacement will be attempted." }
    $remote = @(& git ls-remote --tags origin "refs/tags/$tag")
    if ($LASTEXITCODE -ne 0) { throw 'Cannot check remote tags.' }
    if ($remote.Count -gt 0) { throw "Tag $tag already exists remotely. No replacement will be attempted." }

    & git tag -a $tag -m "LostPin $tag"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create tag.' }
    $tagCreated = $true
    & git push origin "refs/tags/$tag"
    if ($LASTEXITCODE -ne 0) { throw 'Tag push failed. Check the remote before retrying.' }
    $tagPushed = $true
    Write-Host "OK: $tag published. GitHub Actions will build the release."
} catch {
    # Do not automatically delete/rewrite a tag: a network error may hide a successful push.
    Write-Error $_ -ErrorAction Continue
    if ($tagCreated -and -not $tagPushed) { Write-Host "Local tag $tag retained; verify the remote before changing it." }
    exit 1
} finally {
    Pop-Location
}
