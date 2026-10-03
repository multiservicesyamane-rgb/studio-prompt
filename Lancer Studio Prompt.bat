@echo off
title Studio Prompt
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n est pas installe : telecharge la version LTS sur https://nodejs.org puis relance ce fichier.
  pause
  exit /b
)
echo Studio Prompt demarre. Garde cette fenetre ouverte tant que tu utilises l application.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
node server.js
pause
