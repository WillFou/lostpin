param(
    [string]$Source = '',
    [string]$Target = 'D:\Web\LostPin'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Source)) {
    $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}
$Source = [IO.Path]::GetFullPath($Source)
$Target = [IO.Path]::GetFullPath($Target)

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Source introuvable : $Source"
}
if ($Source.TrimEnd('\') -ieq $Target.TrimEnd('\')) {
    throw 'La source et la cible doivent etre deux dossiers differents.'
}
if (-not (Test-Path -LiteralPath $Target -PathType Container)) {
    New-Item -ItemType Directory -Force -Path $Target | Out-Null
}

$skipExact = @(
    'config.js',
    'config/config.js',
    'config.local.js',
    'config/config.local.js'
)
$skipPrefixes = @(
    '.git/',
    'benchmark guessers/'
)

$copied = 0
$skipped = [Collections.Generic.List[string]]::new()
Get-ChildItem -LiteralPath $Source -File -Recurse -Force | ForEach-Object {
    # Compatible Windows PowerShell 5.1 / .NET Framework: avoid Path.GetRelativePath.
    $sourcePrefix = $Source.TrimEnd('\') + '\'
    $relative = $_.FullName.Substring($sourcePrefix.Length).Replace('\', '/')
    $leaf = $_.Name
    $blocked = $skipExact -contains $relative
    if (-not $blocked) {
        foreach ($prefix in $skipPrefixes) {
            if ($relative.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
                $blocked = $true
                break
            }
        }
    }
    if (-not $blocked -and $leaf -match '^\.env(?:\..*)?$' -and $leaf -ne '.env.example') {
        $blocked = $true
    }
    if ($blocked) {
        $skipped.Add($relative)
        return
    }

    $destination = Join-Path $Target $relative
    $parent = Split-Path -Parent $destination
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
    $copied++
}

Write-Host "Copie terminee : $copied fichiers vers $Target"
Write-Host 'Configurations locales ignorees : config.js, config/config.js, config.local.js, config/config.local.js et .env*.'
Write-Host 'Le dossier /benchmark guessers/ est egalement exclu.'

$gitDir = Join-Path $Target '.git'
if (Test-Path -LiteralPath $gitDir -PathType Container) {
    Push-Location $Target
    try {
        # A config file that was tracked before .gitignore was fixed stays tracked until removed from the index.
        & git rm --cached --ignore-unmatch -- config.js config/config.js config.local.js config/config.local.js | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'Impossible de retirer une ancienne configuration de l index Git.' }

        & git config core.hooksPath .githooks
        if ($LASTEXITCODE -ne 0) { throw 'Impossible d activer les garde-fous Git.' }

        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/dev/Test-Release.ps1
        if ($LASTEXITCODE -ne 0) { throw 'Le controle de securite LostPin a echoue.' }

        Write-Host ''
        Write-Host 'Securite Git activee : pre-commit + pre-push.'
        Write-Host 'La configuration locale de D:\Web\LostPin est conservee et n est plus copiable depuis le dossier de test.'
        Write-Host 'Controle maintenant git status avant git add/commit.'
    } finally {
        Pop-Location
    }
} else {
    Write-Warning 'La cible ne contient pas de dossier .git : copie effectuee, activation des hooks ignoree.'
}
