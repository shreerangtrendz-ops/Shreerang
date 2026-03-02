# ============================================
# Shreerang Trendz - Setup Auto Backup Task
# Run this ONCE to schedule weekly backup
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setting Up Auto Weekly Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Define backup script path
$scriptPath = "I:\My Drive\Automation\Shreerang 2026\Horizon Code\backup.ps1"

# Create the scheduled task
$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

# Run every Sunday at 10:00 AM
$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Sunday `
    -At "10:00AM"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

# Register the task
Register-ScheduledTask `
    -TaskName "Shreerang Weekly Backup" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "`n✅ Auto backup scheduled!" -ForegroundColor Green
Write-Host "📅 Runs every Sunday at 10:00 AM" -ForegroundColor White
Write-Host "📁 Backs up to Google Drive automatically" -ForegroundColor White
Write-Host "🐙 Pushes to GitHub automatically" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nPress any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
