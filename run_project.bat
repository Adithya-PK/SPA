@echo off
cd /d "%~dp0"
start "Student Performance Analyzer Backend" cmd /k start_backend.bat
start "Student Performance Analyzer Frontend" cmd /k start_frontend.bat
echo Backend:  http://127.0.0.1:8001
echo Frontend: http://127.0.0.1:5173
echo If Vite chooses another frontend port, use the URL shown in the frontend window.
