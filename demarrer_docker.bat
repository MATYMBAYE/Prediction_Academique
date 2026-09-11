@echo off
title ISI-SUPTECH - Deploiement Docker Conteneurise
color 0b
echo ======================================================================
echo           DEPLOIEMENT CONTENEURISE SUR DOCKER (PRODUCTION)
echo                  Application ISI-SUPTECH Prediction
echo ======================================================================
echo.
echo [1/3] Verification du service Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Demarrage de Docker Desktop en cours...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Veuillez patienter quelques secondes que Docker Desktop s'initialise...
    timeout /t 10 >nul
)

echo.
echo [2/3] Construction et demarrage des conteneurs (App + Base MySQL)...
cd /d "%~dp0"
docker compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] Impossible de lancer Docker Compose.
    echo Assurez-vous que Docker Desktop est bien ouvert et tourne.
    pause
    exit /b 1
)

echo.
echo [3/3] Deploiement reussi avec succes !
echo ======================================================================
echo  CONTENEURS ACTIFS :
echo  - Base de donnees : isi_prediction_db (MySQL 8.0)
echo  - Application     : isi_prediction_app (React + Flask + Scikit-Learn)
echo.
echo  ACCES A L'APPLICATION :
echo  * Sur ce PC      : http://localhost:5000
echo  * Sur Smartphone : http://192.168.1.15:5000
echo ======================================================================
echo.
echo Appuyez sur une touche pour ouvrir l'application dans le navigateur...
timeout /t 3 >nul
start http://localhost:5000

echo.
echo Pour arreter les conteneurs proprement, double-cliquez sur arreter_docker.bat.
pause
