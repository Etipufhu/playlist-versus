@echo off
echo Installing and starting PLVersus...
call npm install
echo Opening browser...
start http://localhost:3000
echo Server is running. You can close this window to stop the server.
call npm start
pause
