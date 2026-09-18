@echo off
setlocal
cd /d "%~dp0"

where dotnet >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] .NET SDK 8 introuvable.
    echo Installe le SDK .NET 8 puis relance ce script.
    exit /b 1
)

if not exist "dist" mkdir "dist"
if not exist "dist\updater" mkdir "dist\updater"

dotnet publish "tools\LostPinUpdater\LostPinUpdater.csproj" ^
  -c Release ^
  -r win-x64 ^
  --self-contained true ^
  -p:PublishSingleFile=true ^
  -p:IncludeNativeLibrariesForSelfExtract=true ^
  -p:EnableCompressionInSingleFile=true ^
  -o "dist\updater"

if errorlevel 1 exit /b 1

echo.
echo OK : dist\updater\LostPinUpdater.exe
endlocal
