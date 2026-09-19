@echo off
setlocal
cd /d "%~dp0..\.."

if not exist ".gitignore" type nul > ".gitignore"

findstr /x /c:"/dist/" ".gitignore" >nul 2>&1
if errorlevel 1 echo /dist/>>".gitignore"

echo Configuration terminee.
echo Le dossier /dist/ est maintenant ignore par Git.
endlocal
