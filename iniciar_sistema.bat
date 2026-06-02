@echo off
title Royal Gantt Planner - Sistema de Sincronizacion
echo =====================================================================
echo    Royal Gantt Planner - Sincronizacion Activa en Tiempo Real
echo =====================================================================
echo.
echo Iniciando Servidor de WebSockets (Puerto 3001)...
start "Gantt-WebSockets" cmd /c "node socket-server.js"

echo Iniciando Servidor Web Principal Gantt Planner (Puerto 3000)...
npm run dev
