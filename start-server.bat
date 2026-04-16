@echo off
title NAOSERVICES - Serveur Backend
color 0A

echo.
echo  =============================================
echo   NAOSERVICES INVENTORY - Demarrage serveur
echo  =============================================
echo.

echo  [1/2] Demarrage Django sur le port 8000...
start "Django API" cmd /k "D:\Inventory\env\Scripts\python.exe D:\Inventory\inventory\backend\manage.py runserver 0.0.0.0:8000"

timeout /t 3 /nobreak > nul

echo  [2/2] Lancement du tunnel Cloudflare...
powershell -ExecutionPolicy Bypass -File "D:\Inventory\inventory\tunnel\Launch-Tunnels.ps1"

pause
