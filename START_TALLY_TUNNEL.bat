@echo off
:: START_TALLY_TUNNEL.bat — Auto-start FRP for Office PC (tally.shreerangtrendz.com)
:: Place this in C:\frp\ on Office PC
:: Run as Administrator OR add to Task Scheduler at login

echo ==========================================
echo  SHREERANG TRENDZ — TALLY FRP TUNNEL
echo  tally.shreerangtrendz.com → Port 19000
echo ==========================================

:: Check if frpc is already running
tasklist /fi "imagename eq frpc.exe" | find "frpc.exe" >nul 2>&1
if %errorlevel%==0 (
    echo [INFO] FRP already running. Skipping.
    goto :done
)

:: Start frpc
echo [INFO] Starting FRP tunnel...
cd /d "%~dp0"
start /min "" frpc.exe -c frpc.toml
timeout /t 3 /nobreak >nul

:: Verify it started
tasklist /fi "imagename eq frpc.exe" | find "frpc.exe" >nul 2>&1
if %errorlevel%==0 (
    echo [SUCCESS] FRP tunnel started! tally.shreerangtrendz.com is live.
) else (
    echo [ERROR] FRP failed to start. Check frpc.toml and VPS connectivity.
)

:done
timeout /t 5 /nobreak >nul
