@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "CONFIG_DIR=%~dp0config"
set "CONFIG_FILE=%CONFIG_DIR%\config.js"
set "LEGACY_CONFIG=%~dp0config.js"
set "SERVER_SCRIPT=%~dp0scripts\runtime\server.ps1"

if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

rem Migration transparente depuis l'ancienne arborescence (<= V6.0.8).
if exist "%LEGACY_CONFIG%" (
  if not exist "%CONFIG_FILE%" (
    copy /y "%LEGACY_CONFIG%" "%CONFIG_FILE%" >nul
  ) else (
    findstr /c:"PASTE_YOUR_GOOGLE_MAPS_KEY_HERE" "%CONFIG_FILE%" >nul 2>nul && copy /y "%LEGACY_CONFIG%" "%CONFIG_FILE%" >nul
  )
  del /q "%LEGACY_CONFIG%" >nul 2>nul
)

if not exist "%CONFIG_FILE%" goto ASKKEY
findstr /c:"PASTE_YOUR_GOOGLE_MAPS_KEY_HERE" "%CONFIG_FILE%" >nul 2>nul && goto ASKKEY
goto START

:ASKKEY
echo.
echo ============================================================
echo   LostPin - configuration Google Maps
echo ============================================================
echo.
echo Colle ici ta cle Google Maps API.
echo Elle sera enregistree uniquement dans config\config.js sur ce PC.
echo Ne partage pas ce fichier si tu y as mis ta cle.
echo.
set "APIKEY="
set /p "APIKEY=Cle API Google Maps : "
if not defined APIKEY (
  echo.
  echo Aucune cle saisie. Relance start.bat quand tu es pret.
  pause
  exit /b 1
)
>"%CONFIG_FILE%" echo window.PG_CONFIG = { googleMapsApiKey: "%APIKEY%" };
echo.
echo Cle enregistree localement dans config\config.js.

:START
if not exist "%SERVER_SCRIPT%" (
  echo.
  echo ERREUR : scripts\runtime\server.ps1 est introuvable.
  echo Reextrais completement l'archive ZIP puis relance start.bat.
  echo.
  pause
  exit /b 1
)

echo.
echo Demarrage de LostPin sur http://127.0.0.1:8080/
echo Garde cette fenetre ouverte pendant la partie.
echo Ferme-la ou fais Ctrl+C pour arreter le serveur local.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SERVER_SCRIPT%"
set "SERVER_EXIT=%ERRORLEVEL%"
echo.
if not "%SERVER_EXIT%"=="0" (
  echo Le serveur s'est arrete avec le code %SERVER_EXIT%.
  echo Verifie notamment que le port 8080 n'est pas deja utilise.
) else (
  echo Le serveur local s'est arrete.
)
echo.
echo Appuie sur une touche pour fermer cette fenetre.
pause >nul
exit /b %SERVER_EXIT%
