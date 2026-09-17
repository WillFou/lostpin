@echo off
setlocal
cd /d "%~dp0"

if not exist config.js goto ASKKEY
findstr /c:"PASTE_YOUR_GOOGLE_MAPS_KEY_HERE" config.js >nul 2>nul
if %errorlevel%==0 goto ASKKEY
goto START

:ASKKEY
echo.
echo ============================================================
echo   LostPin V4.1.3 - configuration Google Maps
echo ============================================================
echo.
echo Colle ici ta NOUVELLE cle Google Maps API.
echo Elle sera enregistree uniquement dans config.js sur ce PC.
echo Ne partage pas ce fichier si tu y as mis ta cle.
echo.
set /p "APIKEY=Cle API Google Maps : "
if "%APIKEY%"=="" (
  echo.
  echo Aucune cle saisie. Relance start.bat quand tu es pret.
  pause
  exit /b 1
)
>config.js echo window.PG_CONFIG = { googleMapsApiKey: "%APIKEY%" };
echo.
echo Cle enregistree localement dans config.js.

:START
echo.
echo Demarrage de LostPin V4 sur http://127.0.0.1:8080/
echo Garde cette fenetre ouverte pendant la partie.
echo Ferme-la ou fais Ctrl+C pour arreter le serveur local.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if errorlevel 1 (
  echo.
  echo Le serveur n'a pas pu demarrer. Verifie que le port 8080 n'est pas deja utilise.
  pause
)
