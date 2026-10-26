@echo off
setlocal
cd /d "%~dp0"
set "taskRuntime=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
if exist "%taskRuntime%\node\bin\node.exe" set "PATH=%taskRuntime%\node\bin;%PATH%"
set "taskPnpm=%taskRuntime%\bin\fallback\pnpm.cmd"
if not exist "%taskPnpm%" (
  echo Bundled pnpm not found: %taskPnpm%
  exit /b 1
)
for /d %%J in ("%~dp0.tools\*") do if exist "%%J\bin\java.exe" if not defined taskJavaHome set "taskJavaHome=%%J"
if defined taskJavaHome set "PATH=%taskJavaHome%\bin;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 22.12+ or restore the Codex runtime.
  exit /b 1
)
if "%~1"=="check" goto check
if "%~1"=="emulators" goto emulators
if "%~1"=="server" goto server
if "%~1"=="web" goto web
if "%~1"=="pwa" goto pwa
echo Usage: mvhunt.cmd check ^| emulators ^| server ^| web ^| pwa
exit /b 1
:check
node --version
call "%taskPnpm%" --version
java -version
exit /b %errorlevel%
:emulators
where java >nul 2>nul
if errorlevel 1 (
  echo Java not found. RTDB emulator requires Java 21+.
  exit /b 1
)
call "%taskPnpm%" emulators
exit /b %errorlevel%
:server
set "LOBBY_EMULATORS=true"
call "%taskPnpm%" lobby:server
exit /b %errorlevel%
:web
set "VITE_DATA_MODE=production"
set "VITE_USE_EMULATORS=true"
set "VITE_FIREBASE_PROJECT_ID=demo-mvhunt"
set "VITE_FIREBASE_API_KEY=fake-api-key"
set "VITE_FIREBASE_AUTH_DOMAIN=demo-mvhunt.firebaseapp.com"
set "VITE_FIREBASE_DATABASE_URL=https://demo-mvhunt.firebaseio.com"
set "VITE_FIREBASE_APP_ID=demo-app"
set "VITE_LOBBY_API_URL=/api/lobby"
call "%taskPnpm%" dev --port 5173 --strictPort
exit /b %errorlevel%
:pwa
set "MVHUNT_BASE=/MVHunt/"
call "%taskPnpm%" build
if errorlevel 1 exit /b 1
call "%taskPnpm%" preview --host 127.0.0.1 --port 4188 --strictPort
exit /b %errorlevel%
