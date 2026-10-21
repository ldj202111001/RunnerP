@echo off
setlocal
cd /d "%~dp0"

rem 1) Find this PC's LAN IP (adapter with a default gateway)
set "IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration).Where({$_.IPv4DefaultGateway})[0].IPv4Address[0].IPAddress"`) do set "IP=%%i"
if "%IP%"=="" (
  echo [ERROR] Could not find this PC's IP address. Check Wi-Fi / LAN connection.
  pause
  exit /b 1
)
echo PC IP: %IP%

rem 2) Point the app at the server on the current IP
> "app\.env.local" echo EXPO_PUBLIC_API_URL=http://%IP%:8000/api/v1
echo Updated app\.env.local : http://%IP%:8000/api/v1

rem 3) Server (FastAPI) in a new window, on 0.0.0.0 so the phone can reach it
start "Runner Server" /D "%~dp0server" cmd /k ".venv\Scripts\python.exe -m alembic upgrade head & .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

rem 4) App (Expo) in a new window. Scan the QR code with Expo Go.
start "Runner App" /D "%~dp0app" cmd /k "npx expo start"

echo.
echo Two windows will open:
echo   Runner Server : check http://%IP%:8000/api/v1/health
echo   Runner App    : scan the QR code with Expo Go on your phone
echo The phone and this PC must be on the same Wi-Fi.
echo.
pause