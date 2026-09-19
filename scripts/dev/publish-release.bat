@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

if "%~1"=="" (
    echo Usage: publish-release.bat 4.4.12
    exit /b 1
)

set "VERSION=%~1"
set "TAG=v%VERSION%"

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" (
    echo [ERREUR] Tu dois etre sur main. Branche actuelle : %BRANCH%
    exit /b 1
)

set "DIRTY="
for /f "delims=" %%S in ('git status --porcelain') do set "DIRTY=1"
if defined DIRTY (
    echo [ERREUR] Le depot contient des modifications ou fichiers non suivis.
    git status --short
    exit /b 1
)

echo Mise a jour de main...
git pull --ff-only
if errorlevel 1 exit /b 1

git rev-parse -q --verify "refs/tags/%TAG%" >nul 2>&1
if not errorlevel 1 (
    echo [ERREUR] Le tag %TAG% existe deja en local.
    exit /b 1
)

git ls-remote --exit-code --tags origin "refs/tags/%TAG%" >nul 2>&1
if not errorlevel 1 (
    echo [ERREUR] Le tag %TAG% existe deja sur GitHub.
    exit /b 1
)

echo Creation du tag %TAG%...
git tag -a "%TAG%" -m "LostPin %TAG%"
if errorlevel 1 exit /b 1

echo Envoi du tag sur GitHub...
git push origin "%TAG%"
if errorlevel 1 (
    echo [ERREUR] Le push a echoue. Suppression du tag local.
    git tag -d "%TAG%" >nul 2>&1
    exit /b 1
)

echo.
echo OK : %TAG% a ete pousse.
echo GitHub Actions va construire LostPin-%TAG%.zip et creer la Release.
endlocal
