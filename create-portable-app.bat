@echo off
echo ================================
echo Creating HWH POS Portable App
echo ================================

echo.
echo [1/4] Building Backend...
cd Backend
call npm run build-exe
if not exist "backend-server.exe" (
    echo ERROR: Backend build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] Building Frontend...
cd Frontend
call npm run build
if not exist "dist\index.html" (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Creating Package Structure...
rmdir /S /Q "HWH-POS-Portable" 2>nul
mkdir "HWH-POS-Portable" 2>nul
mkdir "HWH-POS-Portable\frontend" 2>nul

echo.
echo [4/4] Copying Files...
copy "Backend\backend-server.exe" "HWH-POS-Portable\hwh-server.exe" /Y
copy "Backend\.env" "HWH-POS-Portable\.env" /Y
xcopy "Frontend\dist\*" "HWH-POS-Portable\frontend\" /E /I /Y

echo.
echo Creating Launcher Scripts...

REM Main Launcher
(
echo @echo off
echo title Haji Waris Hotel POS System
echo echo ================================
echo echo Starting HWH POS System...
echo echo ================================
echo echo.
echo echo [1/2] Starting Server...
echo start /B hwh-server.exe
echo timeout /t 3 /nobreak ^>nul
echo echo [2/2] Opening Application...
echo echo.
echo echo System is running! Do not close this window.
echo echo.
echo REM Try to open in App Mode ^(Chrome/Edge^) which looks like a native app
echo start msedge --app=http://localhost:5000 2^>nul ^|^| start chrome --app=http://localhost:5000 2^>nul ^|^| start http://localhost:5000
) > "HWH-POS-Portable\START-APP.bat"

REM Stop Script
(
echo @echo off
echo echo Stopping HWH POS System...
echo taskkill /F /IM hwh-server.exe 2^>nul
echo echo System stopped!
echo timeout /t 2
) > "HWH-POS-Portable\STOP-APP.bat"

REM Create Desktop Shortcut Script
(
echo @echo off
echo echo Creating Desktop Shortcut...
echo set "SCRIPT=%%TEMP%%\CreateShortcut_%%RANDOM%%.vbs"
echo echo Set oWS = WScript.CreateObject^("WScript.Shell"^) ^> "%%SCRIPT%%"
echo echo sLinkFile = "%%USERPROFILE%%\Desktop\Haji Waris POS.lnk" ^>^> "%%SCRIPT%%"
echo echo Set oLink = oWS.CreateShortcut^(sLinkFile^) ^>^> "%%SCRIPT%%"
echo echo oLink.TargetPath = "%%CD%%\START-APP.bat" ^>^> "%%SCRIPT%%"
echo echo oLink.WorkingDirectory = "%%CD%%" ^>^> "%%SCRIPT%%"
echo echo oLink.IconLocation = "%%SystemRoot%%\System32\shell32.dll,3" ^>^> "%%SCRIPT%%"
echo echo oLink.Save ^>^> "%%SCRIPT%%"
echo cscript /nologo "%%SCRIPT%%"
echo del "%%SCRIPT%%"
echo echo.
echo echo Shortcut created on Desktop!
echo pause
) > "HWH-POS-Portable\Create-Shortcut.bat"

REM Debug Launcher (For finding errors)
(
echo @echo off
echo title HWH POS DEBUG MODE
echo echo ==============================================
echo echo   DEBUG MODE - DO NOT CLOSE THIS WINDOW
echo echo   See errors below if app is not working
echo echo ==============================================
echo echo.
echo echo [1] Checking Backend...
echo hwh-server.exe
echo echo.
echo echo Server stopped or crashed.
echo pause
) > "HWH-POS-Portable\DEBUG-MODE.bat"

echo.
echo ================================
echo ✅ SUCCESS!
echo ================================
echo.
echo Portable app created in: HWH-POS-Portable
echo.
echo To use:
echo 1. Open "HWH-POS-Portable" folder
echo 2. Double-click "START-APP.bat"
echo.
pause
