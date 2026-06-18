@echo off
title Royal Gantt Planner - Sistema de Produccion
echo =====================================================================
echo    Royal Gantt Planner v1.0 - Royal Transport
echo    Servidor de Produccion
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/2] Iniciando Servidor de WebSockets (Puerto 3001)...
start "Gantt-WebSockets" cmd /k "node socket-server.js"

echo [2/2] Iniciando Servidor Web en modo produccion (Puerto 3000)...
echo    Acceso: http://localhost:3000
echo.
npm start
