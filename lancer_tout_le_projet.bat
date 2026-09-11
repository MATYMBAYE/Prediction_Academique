@echo off
title Lancement Global ISI-SUPTECH - Backend + Frontend + Tunnel
color 0f
echo ======================================================================
echo    LANCEMENT COMPLET - APPLICATION DE PREDICTION ACADEMIQUE
echo ======================================================================
echo.

echo [1/3] Demarrage du Backend Flask (Port 5000)...
start "Backend Flask" /d "%~dp0backend" .\venv\Scripts\python run.py

echo [2/3] Demarrage du Frontend Vite (Port 5173)...
start "Frontend React" /d "%~dp0frontend" npm run dev

echo Attente de l'initialisation des serveurs (5s)...
timeout /t 5 /nobreak >nul

echo [3/3] Demarrage du Tunnel distant Cloudflare...
start "Tunnel Cloudflare" "%~dp0demarrer_tunnel_cloudflare.bat"

echo.
echo ======================================================================
echo Tous les services ont ete lances !
echo - Frontend local : http://localhost:5173
echo - Backend API    : http://localhost:5000/api
echo - Tunnel distant : Regardez la fenetre "Tunnel Cloudflare" pour l'URL
echo ======================================================================
echo.
pause
