@echo off
title ISI-SUPTECH Prediction - Serveur de Production Unifie
color 0a
echo ======================================================================
echo           DEPLOIEMENT DE PRODUCTION UNIFIE (ON-PREMISE)
echo               Application ISI-SUPTECH Prediction
echo ======================================================================
echo.
echo [1/3] Verification de l'environnement Python...
cd /d "%~dp0backend"
if not exist "venv\Scripts\python.exe" (
    echo ERREUR : Environnement virtuel introuvable dans backend\venv.
    pause
    exit /b 1
)

echo [2/3] Verification de la compilation du Frontend (React dist)...
if not exist "..\frontend\dist\index.html" (
    echo Compilation du frontend en cours...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0backend"
)

echo [3/3] Lancement du serveur de production unifie (Port 5000)...
echo.
echo ======================================================================
echo  APPLICATION ACCESSIBLE AUX ADRESSES SUIVANTES :
echo  ------------------------------------------------------------------
echo   * Sur ce PC (Localhost) : http://localhost:5000
echo   * Sur Smartphone / Jury : http://192.168.1.15:5000
echo ======================================================================
echo.
echo Appuyez sur une touche si vous souhaitez ouvrir l'application dans le navigateur...
timeout /t 3 >nul
start http://localhost:5000

echo.
echo Serveur en cours d'execution. Ne fermez pas cette fenetre.
echo.
venv\Scripts\python run.py
pause
