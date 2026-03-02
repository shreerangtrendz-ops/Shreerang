# ============================================
# Shreerang Trendz - Auto Backup Script
# Double-click this file to run backup
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Shreerang Trendz - Auto Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to project folder
Set-Location "I:\My Drive\Automation\Shreerang 2026\Horizon Code"
Write-Host "`n✅ Moved to project folder..." -ForegroundColor Green

# Step 1: Start Docker (if not running)
Write-Host "`n🐳 Checking Docker..." -ForegroundColor Yellow
Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Step 2: Pull latest code from GitHub
Write-Host "`n📥 Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin master
Write-Host "✅ Code updated!" -ForegroundColor Green

# Step 3: Pull latest Supabase schema
Write-Host "`n🗄️ Pulling Supabase schema..." -ForegroundColor Yellow
supabase db pull --db-url "postgresql://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
Write-Host "✅ Schema updated!" -ForegroundColor Green

# Step 4: Backup actual data
Write-Host "`n💾 Backing up database data..." -ForegroundColor Yellow
$date = Get-Date -Format "yyyy-MM-dd"
supabase db dump --db-url "postgresql://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" --data-only -f "data_backup_$date.sql"
Write-Host "✅ Data backed up as data_backup_$date.sql!" -ForegroundColor Green

# Step 5: Commit everything to GitHub
Write-Host "`n📤 Committing backup to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "backup: weekly backup $date - schema + data"
git push origin master
Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green

# Done!
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ✅ BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n📁 Google Drive  - Auto synced" -ForegroundColor White
Write-Host "🐙 GitHub        - Pushed" -ForegroundColor White
Write-Host "🗄️ Supabase      - Schema saved" -ForegroundColor White
Write-Host "💾 Data Backup   - data_backup_$date.sql" -ForegroundColor White
Write-Host "`nPress any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
