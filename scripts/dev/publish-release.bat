@echo off
setlocal EnableExtensions
if "%~1"=="" (
    echo Usage: publish-release.bat 6.2.1
    exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-release.ps1" -Version "%~1"
exit /b %ERRORLEVEL%
