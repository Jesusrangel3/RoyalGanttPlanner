@echo off
title Royal Gantt Planner - Sistema de Produccion
chcp 65001 >nul

echo =====================================================================
echo    Royal Gantt Planner v1.0 - Royal Transport
echo    Sistema de Produccion
echo =====================================================================
echo.

cd /d "%~dp0"

:: Verificar que .env.local existe
if not exist ".env.local" (
    echo [ERROR] No se encontro el archivo .env.local
    echo         Copia .env.example a .env.local y configura las variables.
    pause
    exit /b 1
)

:: Verificar que node_modules existe
if not exist "node_modules" (
    echo [SETUP] Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

:: Verificar que el build existe
if not exist ".next" (
    echo [BUILD] Construyendo la aplicacion para produccion...
    npm run build
    if errorlevel 1 (
        echo [ERROR] Fallo la construccion. Revisa los errores de TypeScript.
        pause
        exit /b 1
    )
)

echo [1/2] Iniciando Servidor WebSocket (Puerto 3001)...
start "Royal-WebSockets" cmd /k "node socket-server.js"
timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Servidor Web en modo produccion (Puerto 3000)...
echo.
echo    Acceso local:  http://localhost:3000
echo    Acceso red:    http://%COMPUTERNAME%:3000
echo.
echo    Para detener: cierra ambas ventanas de consola.
echo =====================================================================
echo.
npm start
