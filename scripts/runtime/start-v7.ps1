param(
    [string]$LegacyConfigPath = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$previousKey = [Environment]::GetEnvironmentVariable('GoogleMaps__BrowserApiKey', 'Process')
$exitCode = 0
Push-Location $root
try {
    if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
        throw 'SDK .NET 10 introuvable. Installer le SDK (pas seulement le runtime), puis rouvrir PowerShell.'
    }
    $sdks = @(& dotnet --list-sdks)
    if ($LASTEXITCODE -ne 0 -or -not ($sdks | Where-Object { $_ -match '^10\.0\.\d+\s' })) {
        throw 'SDK .NET 10 stable requis. Aucun SDK 10.0.x compatible trouve.'
    }
    $pathWasProvided = -not [string]::IsNullOrWhiteSpace($LegacyConfigPath)
    if (-not $pathWasProvided) { $LegacyConfigPath = Join-Path $root 'config\config.js' }
    if ([string]::IsNullOrWhiteSpace($previousKey) -and (Test-Path -LiteralPath $LegacyConfigPath -PathType Leaf)) {
        # Extraction de la chaine uniquement : le JavaScript local n'est jamais execute.
        $content = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $LegacyConfigPath).Path)
        $match = [regex]::Match($content, 'googleMapsApiKey\s*:\s*["''](?<key>[^"''\r\n]+)["'']')
        if (-not $match.Success -or $match.Groups['key'].Value -match 'PASTE_') {
            throw 'Le fichier indique ne contient pas une cle navigateur utilisable. Aucun fichier ne sera modifie.'
        }
        [Environment]::SetEnvironmentVariable('GoogleMaps__BrowserApiKey', $match.Groups['key'].Value.Trim(), 'Process')
        Write-Host 'Cle navigateur importee en memoire pour ce lancement. Aucun fichier modifie, aucune valeur affichee.'
    } elseif ($pathWasProvided -and [string]::IsNullOrWhiteSpace($previousKey)) {
        throw 'Fichier de configuration V6 introuvable.'
    }
    Write-Host 'LostPin V7-001 - ASP.NET Core / .NET 10'
    Write-Host 'Arrete tout autre serveur LostPin utilisant le port 8080.'
    Write-Host 'Quand le serveur ecoute, ouvre http://127.0.0.1:8080/ dans ton navigateur.'
    Write-Host 'Ctrl+C pour arreter. Ne pas lancer start.bat : il reste reserve a la V6.'
    & dotnet run --project 'server/LostPin.Web/LostPin.Web.csproj' --launch-profile 'LostPin'
    $exitCode = $LASTEXITCODE
} catch {
    Write-Error $_ -ErrorAction Continue
    $exitCode = 1
} finally {
    # Le secret importe ne doit pas rester dans le processus parent apres l'arret.
    [Environment]::SetEnvironmentVariable('GoogleMaps__BrowserApiKey', $previousKey, 'Process')
    Pop-Location
}
exit $exitCode
