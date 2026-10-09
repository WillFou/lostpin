@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
set "TARGET=%~1"
if not defined TARGET set "TARGET=D:\Web\LostPin"
echo.
echo ============================================================
echo   LostPin - copie sure vers le depot Git
echo ============================================================
echo Source : %CD%
echo Cible  : %TARGET%
echo.
echo config\config.js et les autres configurations locales ne seront PAS copiees.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev\sync-to-repo.ps1" -Source "%CD%" -Target "%TARGET%"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo ECHEC de la copie sure ^(code %RC%^).
if "%RC%"=="0" echo OK. Tu peux maintenant verifier git status dans le depot.
echo.
pause
exit /b %RC%
