param([switch]$SkipPublish)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Push-Location $root
try {
    & dotnet build LostPin.sln --configuration Release
    if ($LASTEXITCODE -ne 0) { throw 'Compilation V7 en echec.' }
    $testDll = Join-Path $root 'tests/LostPin.Web.SmokeTests/bin/Release/net10.0/LostPin.Web.SmokeTests.dll'
    $serverDll = Join-Path $root 'server/LostPin.Web/bin/Release/net10.0/LostPin.Web.dll'
    & dotnet $testDll $serverDll
    if ($LASTEXITCODE -ne 0) { throw 'Tests HTTP sur la compilation en echec.' }
    if (-not $SkipPublish) {
        # Dossier neuf pour eviter tout faux positif lie a une ancienne publication.
        $out = Join-Path ([IO.Path]::GetTempPath()) ('LostPin-v7-publish-' + [guid]::NewGuid().ToString('N'))
        try {
            & dotnet publish 'server/LostPin.Web/LostPin.Web.csproj' -c Release --no-restore -o $out
            if ($LASTEXITCODE -ne 0) { throw 'Publication locale V7 en echec.' }
            & dotnet $testDll (Join-Path $out 'LostPin.Web.dll')
            if ($LASTEXITCODE -ne 0) { throw 'Tests HTTP sur le dossier publie en echec.' }
        } finally {
            if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Recurse -Force }
        }
    }
    Write-Host 'V7-001 : compilation et controles HTTP termines. Google reel reste a tester.'
} finally { Pop-Location }
