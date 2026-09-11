@echo off
title ISI-SUPTECH - Arret des Conteneurs Docker
color 0c
echo ======================================================================
echo           ARRET DES CONTENEURS DOCKER (ISI-SUPTECH)
echo ======================================================================
echo.
cd /d "%~dp0"
docker compose down
echo.
echo Les conteneurs ont ete arretes proprement. Les donnees restent sauvegardees dans le volume.
pause
