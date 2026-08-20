@echo off
title MIE GACOAN - DUAL PORT SERVER (PORT 3000 & 4000)
color 0C
cls

echo =====================================================================
echo           MIE GACOAN ONLINE ORDERING SYSTEM (DUAL PORT)
echo =====================================================================
echo.
echo  [1] Portal Pemesan (Customer) -> Port 3000: http://localhost:3000
echo  [2] Portal Dapur   (Merchant) -> Port 4000: http://localhost:4000
echo.
echo  Menyalakan server multi-port dan membuka peramban...
echo =====================================================================
echo.

start "" "http://localhost:3000"
timeout /t 1 /nobreak >nul
start "" "http://localhost:4000"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"

pause
