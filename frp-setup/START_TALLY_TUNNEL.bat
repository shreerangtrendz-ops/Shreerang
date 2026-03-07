@echo off
echo ============================================
echo  SHREERANG TALLY FRP TUNNEL STARTER
echo ============================================
echo.

REM First: delete the broken Windows service if it exists
sc query frpc >nul 2>&1
if %errorlevel% equ 0 (
    echo [1] Removing broken frpc service...
    sc stop frpc >nul 2>&1
    sc delete frpc >nul 2>&1
    echo     Done.
)

REM Kill any existing frpc.exe processes
taskkill /F /IM frpc.exe >nul 2>&1

echo [2] Starting FRP tunnel directly...
cd /d C:\frp_0.58.1_windows_amd64

REM Start frpc in a new minimized window that stays open
start "Tally FRP Tunnel" /MIN cmd /k frpc.exe -c frpc.toml

echo.
echo [3] FRP tunnel window started!
echo     Watch the tunnel window for: "start proxy success"
echo.
echo NEXT STEP - Enable Tally HTTP Server:
echo   1. In Tally Prime press F12
echo   2. Click Advanced Configuration
echo   3. Set "Enable Tally.ERP 9 as HTTP Server" = Yes
echo   4. Port = 9000
echo   5. Press Ctrl+A to save
echo.
echo Press any key to close this window...
pause >nul
