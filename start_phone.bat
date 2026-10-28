@echo off
setlocal
cd /d "%~dp0app"

rem The app runs on the phone alone (phone SQLite + bundled model), so no server is needed.
rem This only starts Expo so the dev build app can load the JS from this PC.
rem Scan the QR code with the dev build app (press s to switch to Expo Go). Phone and PC must be on the same Wi-Fi.
npx expo start
