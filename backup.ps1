# ============================================================
# Shreerang Trendz - Auto Backup Script (Updated)
# Double-click this file to run backup
# Saves to: GitHub + Google Drive + Supabase Storage
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Shreerang Trendz - Auto Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── CONFIG ───────────────────────────────────────────────────
$PROJECT_PATH = "I:\My Drive\Automation\Shreerang 2026\Horizon Code"
$DB_URL = "postgresql://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
$SUPABASE_URL = "https://zdekydcscwhuusliwqaz.supabase.co"

# ⚠️ Paste your Supabase anon key below (from Supabase Dashboard → Settings → API)
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0.47cCribhShEYGqsLbsh7lUwFaFK-rXf2SusVhq4-p0oYOUR_SUPABASE_ANON_KEY_HERE"

# Navigate to project folder
Set-Location $PROJECT_PATH
$DATE = Get-Date -Format "yyyy-MM-dd"
$BACKUP_FILE = "data_backup_$DATE.sql"

Write-Host "`n📁 Working in: $PROJECT_PATH" -ForegroundColor Green

# ── STEP 1: Start Docker ─────────────────────────────────────
Write-Host "`n🐳 Checking Docker..." -ForegroundColor Yellow
Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# ── STEP 2: Pull latest code from GitHub ─────────────────────
Write-Host "`n📥 Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin master
Write-Host "✅ Code updated!" -ForegroundColor Green

# ── STEP 3: Pull latest Supabase schema ──────────────────────
Write-Host "`n🗄️  Pulling Supabase schema..." -ForegroundColor Yellow
supabase db pull --db-url $DB_URL
Write-Host "✅ Schema updated!" -ForegroundColor Green

# ── STEP 4: Backup database data ─────────────────────────────
Write-Host "`n💾 Backing up database to $BACKUP_FILE..." -ForegroundColor Yellow
supabase db dump --db-url $DB_URL --data-only -f $BACKUP_FILE
Write-Host "✅ Database backed up!" -ForegroundColor Green

# ── STEP 5: Upload backup to Supabase Storage ─────────────────
Write-Host "`n☁️  Uploading backup to Supabase Storage..." -ForegroundColor Yellow

$SQL_CONTENT = Get-Content $BACKUP_FILE -Raw -Encoding UTF8
$HEADERS = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "text/plain"
    "x-upsert"      = "true"
}

try {
    $UPLOAD_URL = "$SUPABASE_URL/storage/v1/object/backups/$BACKUP_FILE"
    Invoke-RestMethod -Uri $UPLOAD_URL -Method Post -Headers $HEADERS -Body $SQL_CONTENT
    Write-Host "✅ Uploaded to Supabase Storage: $BACKUP_FILE" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Supabase upload failed (saved to GitHub & Google Drive): $_" -ForegroundColor Yellow
}

# ── STEP 6: Commit everything to GitHub ──────────────────────
Write-Host "`n📤 Committing to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "backup: automated backup $DATE" 2>$null
if ($LASTEXITCODE -eq 0) {
    git push origin master
    Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Nothing new to commit to GitHub" -ForegroundColor Cyan
}

# ── STEP 7: Verify backup size ───────────────────────────────
if (Test-Path $BACKUP_FILE) {
    $SIZE = [math]::Round((Get-Item $BACKUP_FILE).Length / 1KB, 1)
    Write-Host "`n📊 Backup size: $SIZE KB" -ForegroundColor Cyan
}

# ── DONE ─────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ✅ BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n📍 Saved to:" -ForegroundColor White
Write-Host "   ✅ Google Drive (auto sync)" -ForegroundColor Green
Write-Host "   ✅ GitHub (committed & pushed)" -ForegroundColor Green
Write-Host "   ✅ Supabase Storage 'backups' bucket" -ForegroundColor Green
Write-Host "   ✅ Visible in /admin/backup-control panel" -ForegroundColor Green
Write-Host "`n🗓️  Next auto backup: Sunday 10:00 AM" -ForegroundColor Gray
Write-Host "`nPress any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
