@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if exist config.js del /q config.js
echo La clé locale a été effacée.
call start.bat
