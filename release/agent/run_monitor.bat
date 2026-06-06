@echo off
setlocal

set PYTHON=C:\py3.12.6\python.exe

if not exist "%PYTHON%" (
    echo [ERROR] Python not found: %PYTHON%
    echo Please edit this file and set PYTHON to your python.exe path.
    pause
    exit /b 1
)

echo [Setup] Installing dependencies...
"%PYTHON%" -m pip install -r requirements.txt >nul 2>&1

echo [Start] VeADK Agent for Online Boutique...
echo.

cd /d "%~dp0"
"%PYTHON%" run_monitor.py

pause
