@echo off
:: Auto-request Administrator elevation
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting Administrator privileges to configure Windows Firewall...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Configuring Windows Network and Firewall for Vite (Port 8080)...
powershell -Command "Set-NetConnectionProfile -InterfaceAlias Wi-Fi -NetworkCategory Private -ErrorAction SilentlyContinue"
netsh advfirewall firewall delete rule name="Vite Dev 8080" >nul 2>&1
netsh advfirewall firewall add rule name="Vite Dev 8080" dir=in action=allow protocol=TCP localport=8080 profile=any
echo.
echo ==============================================================
echo [SUCCESS] Firewall rule added and Wi-Fi configured!
echo Local Network URL: http://192.168.2.14:8080/
echo You can now open this URL on your phone or other device on this Wi-Fi!
echo ==============================================================
pause
