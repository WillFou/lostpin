param([Parameter(Mandatory = $true)][string]$Path)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
try {
    $root = (Resolve-Path -LiteralPath $Path).Path
    $problems = [Collections.Generic.List[string]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $root -File -Recurse -Force) {
        $relative = $file.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
        if ($file.Name -match '^config(?:\.local)?\.js$' -or
            ($file.Name -match '^\.env(?:\..*)?$' -and $file.Name -ne '.env.example') -or
            $relative -match '(^|/)benchmark guessers/') {
            $problems.Add("Forbidden file in package: $relative")
            continue
        }
        if ($file.Extension -notmatch '^\.(js|mjs|cjs|json|html|css|md|txt|yml|yaml|ps1|bat|cmd|cs|xml|config)$') { continue }
        if ((Get-Content -LiteralPath $file.FullName -Raw) -match 'AIza[0-9A-Za-z_-]{35}') {
            $problems.Add("Google API key pattern in package: $relative (value withheld)")
        }
    }
    if ($problems.Count) { throw ($problems -join "`n") }
    Write-Host 'Package check passed: no local config or Google key pattern.'
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
