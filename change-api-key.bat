@echo off
setlocal
cd /d "%~dp0"
if exist config.js del /q config.js
echo La cle locale a ete effacee.
call start.bat
