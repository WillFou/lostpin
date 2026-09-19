@echo off
call "%~dp0scripts\dev\publish-release.bat" %*
exit /b %ERRORLEVEL%
