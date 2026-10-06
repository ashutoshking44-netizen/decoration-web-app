# Cloudflare Tunnel Launcher with Auto-Clipboard & Setup Route
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Decoration Dashboard - Share Live Link"
Clear-Host

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       STARTING CLOUDFLARE LIVE SHARE TUNNEL...                  " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to your project on port 8080..." -ForegroundColor Gray

# 1. Locate cloudflared binary
$cloudflaredDir = Join-Path $env:LOCALAPPDATA "Temp\node-untun"
$cfExe = $null
if (Test-Path $cloudflaredDir) {
    $found = Get-ChildItem -Path $cloudflaredDir -Filter "cloudflared*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $cfExe = $found.FullName }
}

if (-not $cfExe) {
    Write-Host "Downloading cloudflared binary..." -ForegroundColor Yellow
    & npx -y untun tunnel 8080 | Out-Null
    $found = Get-ChildItem -Path $cloudflaredDir -Filter "cloudflared*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $cfExe = $found.FullName }
}

if (-not $cfExe) {
    Write-Host "Error: Could not find or download cloudflared." -ForegroundColor Red
    Pause
    exit 1
}

# 2. Launch cloudflared process
$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = $cfExe
$pinfo.Arguments = "tunnel --url http://127.0.0.1:8080"
$pinfo.UseShellExecute = $false
$pinfo.RedirectStandardError = $true
$pinfo.RedirectStandardOutput = $true
$pinfo.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($pinfo)

$shareUrl = $null
$stream = $proc.StandardError

while (-not $proc.HasExited) {
    $line = $stream.ReadLine()
    if ($null -eq $line) {
        Start-Sleep -Milliseconds 100
        continue
    }

    if ($line -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
        $baseUrl = $matches[1]
        $shareUrl = "$baseUrl/setup"
        break
    }
}

if ($shareUrl) {
    # Copy to clipboard
    try {
        Set-Clipboard -Value $shareUrl
    } catch {
        # Fallback to clip.exe
        $shareUrl | clip.exe
    }

    Clear-Host
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "   🎉 YOUR SHAREABLE LIVE LINK IS READY!" -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   👉 $shareUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   ✅ COPIED TO CLIPBOARD!" -ForegroundColor Green
    Write-Host "   You can now directly press [ Ctrl + V ] in WhatsApp to send it!" -ForegroundColor White
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "   NOTE: Keep this window OPEN while testing/sharing." -ForegroundColor DarkYellow
    Write-Host "   (Closing this window will stop the live link.)" -ForegroundColor Gray
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""

    # Keep alive while process is running
    $proc.WaitForExit()
} else {
    Write-Host "Failed to obtain tunnel link. Check if port 8080 is running." -ForegroundColor Red
    Pause
}
