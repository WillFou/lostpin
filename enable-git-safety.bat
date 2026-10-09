@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev\enable-git-safety.ps1"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo ECHEC ^(code %RC%^).
if "%RC%"=="0" echo Protection Git LostPin activee.
pause
exit /b %RC%
