param(
    [string]$Version = '',
    [switch]$Staged
)

# Never print matching key values. Git index inspection also catches an empty config.js
# that would later receive a real key from start.bat.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Push-Location $root
try {
    & git rev-parse --is-inside-work-tree 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'This check must run inside the LostPin Git repository.' }

    if ($Staged) {
        $versionText = (& git show ':version.json') -join "`n"
        if ($LASTEXITCODE -ne 0) { throw 'version.json is missing from the Git index.' }
    } else {
        $versionText = Get-Content -LiteralPath 'version.json' -Raw
    }
    $actual = ($versionText | ConvertFrom-Json).version
    if ($actual -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid version.json: expected X.Y.Z.' }
    if ($Version) {
        $requested = $Version -replace '^[vV]', ''
        if ($requested -cne $actual) {
            throw "Version mismatch: requested '$Version', version.json contains '$actual'. No tag was created."
        }
    }

    $files = @(& git -c core.quotepath=false ls-files)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the Git index.' }
    $problems = [Collections.Generic.List[string]]::new()
    foreach ($file in $files) {
        $normalized = $file.Replace('\', '/')
        $leaf = ($normalized -split '/')[-1]
        if ($leaf -match '^config(?:\.local)?\.js$' -or ($leaf -match '^\.env(?:\..*)?$' -and $leaf -ne '.env.example')) {
            $problems.Add("Local configuration is tracked: $normalized. Run git rm --cached -- `"$normalized`".")
            continue
        }
        if ($normalized -like 'benchmark guessers/*') {
            $problems.Add("Benchmark material is tracked: $normalized")
            continue
        }
        if ($normalized -notmatch '\.(js|mjs|cjs|json|html|css|md|txt|yml|yaml|ps1|bat|cmd|cs|xml|config)$') { continue }
        if ($Staged) {
            $content = (& git show ":$normalized") -join "`n"
            if ($LASTEXITCODE -ne 0) { throw "Cannot inspect indexed file: $normalized" }
        } else {
            if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
            $content = Get-Content -LiteralPath $file -Raw
        }
        if ($content -match 'AIza[0-9A-Za-z_-]{35}') {
            $problems.Add("Google API key pattern detected in: $normalized (value withheld)")
        }
    }
    if ($problems.Count -gt 0) {
        throw ("Release/commit blocked:`n" + ($problems -join "`n"))
    }
    Write-Host "LostPin checks passed (version $actual; no tracked local config or Google key pattern)."
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
} finally {
    Pop-Location
}
