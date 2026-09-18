@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

if not exist config.js goto ASKKEY
findstr /c:"PASTE_YOUR_GOOGLE_MAPS_KEY_HERE" config.js >nul 2>nul && goto ASKKEY
goto START

:ASKKEY
echo.
echo ============================================================
echo   LostPin V4.4.4 - configuration Google Maps
echo ============================================================
echo.
echo Colle ici ta NOUVELLE clé Google Maps API.
echo Elle sera enregistrée uniquement dans config.js sur ce PC.
echo Ne partage pas ce fichier si tu y as mis ta clé.
echo.
set "APIKEY="
set /p "APIKEY=Clé API Google Maps : "
if not defined APIKEY (
  echo.
  echo Aucune clé saisie. Relance start.bat quand tu es prêt.
  pause
  exit /b 1
)
>config.js echo window.PG_CONFIG = { googleMapsApiKey: "%APIKEY%" };
echo.
echo Clé enregistrée localement dans config.js.

:START
if not exist server.ps1 (
  echo.
  echo ERREUR : server.ps1 est introuvable dans le dossier de LostPin.
  echo Réextrais complètement l'archive ZIP puis relance start.bat.
  echo.
  pause
  exit /b 1
)

echo.
echo Démarrage de LostPin V4.4.4 sur http://127.0.0.1:8080/
echo Garde cette fenêtre ouverte pendant la partie.
echo Ferme-la ou fais Ctrl+C pour arrêter le serveur local.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
set "SERVER_EXIT=%ERRORLEVEL%"
echo.
if not "%SERVER_EXIT%"=="0" (
  echo Le serveur s'est arrêté avec le code %SERVER_EXIT%.
  echo Vérifie notamment que le port 8080 n'est pas déjà utilisé.
) else (
  echo Le serveur local s'est arrêté.
)
echo.
echo Appuie sur une touche pour fermer cette fenêtre.
pause >nul
exit /b %SERVER_EXIT%
