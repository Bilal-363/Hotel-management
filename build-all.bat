@echo off
echo ================================
echo Building Haji Waris Hotel POS System
echo ================================

echo.
echo [1/3] Building Backend Executable...
cd Backend
call npm install
call npm run build-exe
if %ERRORLEVEL% NEQ 0 (
    echo Backend build failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/3] Building Frontend...
cd Frontend
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Packaging with Electron...
call npx electron-builder
if %ERRORLEVEL% NEQ 0 (
    echo Electron packaging failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo ================================
echo Build Complete!
echo ================================
echo Installer is located in: Frontend\release
echo.
pause
