Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Push-Location $root
try {
    & git rev-parse --is-inside-work-tree 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Ce script doit etre execute dans le depot Git LostPin.' }

    & git rm --cached --ignore-unmatch -- config.js config/config.js config.local.js config/config.local.js | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Impossible de retirer les configurations locales de l index.' }

    & git config core.hooksPath .githooks
    if ($LASTEXITCODE -ne 0) { throw 'Impossible d activer .githooks.' }

    & (Join-Path $PSScriptRoot 'Test-Release.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Le controle LostPin a echoue.' }

    Write-Host 'OK : config locale hors index et hooks pre-commit/pre-push actives.'
} finally {
    Pop-Location
}
