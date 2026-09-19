@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
if exist "config\config.js" del /q "config\config.js"
if exist "config.js" del /q "config.js"
echo La cle locale a ete effacee.
call start.bat
