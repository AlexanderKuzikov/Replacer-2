@echo off
chcp 65001 >nul
if not exist "node_modules" npm install
start /B timeout /t 2 /nobreak >nul && start http://localhost:3000
npm start
pause
