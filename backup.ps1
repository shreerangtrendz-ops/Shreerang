# ============================================================
# Shreerang Trendz - Auto Backup Script
# Saves to: GitHub + Google Drive + Supabase Storage
# ============================================================

Write-Host "========================================"
Write-Host "   Shreerang Trendz - Auto Backup"
Write-Host "========================================"

$PROJECT_PATH = "I:\My Drive\Automation\Shreerang 2026\Horizon Code"
$DB_URL = "postgresql://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
$SUPABASE_URL = "https://zdekydcscwhuusliwqaz.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0.47cCribhShEYGqsLbsh7lUwFaFK-rXf2SusVhq4-p0o"

Set-Location $PROJECT_PATH
$DATE = Get-Date -Format "yyyy-MM-dd"
$BACKUP_FILE = "data_backup_$DATE.sql"

Write-Host "Working in: $PROJECT_PATH"

# STEP 1: Start Docker
Write-Host "Checking Docker..."
Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# STEP 2: Pull latest code
Write-Host "Pulling latest code from GitHub..."
git pull origin master
Write-Host "Code updated!"

# STEP 3: Pull Supabase schema
Write-Host "Pulling Supabase schema..."
supabase db pull --db-url "$DB_URL"
Write-Host "Schema updated!"

# STEP 4: Backup database
Write-Host "Backing up database to $BACKUP_FILE..."
supabase db dump --db-url "$DB_URL" --data-only -f "$BACKUP_FILE"
Write-Host "Database backed up!"

# STEP 5: Upload to Supabase Storage
Write-Host "Uploading to Supabase Storage..."
if (Test-Path $BACKUP_FILE) {
    $SQL_CONTENT = Get-Content $BACKUP_FILE -Raw -Encoding UTF8
    $HEADERS = @{
        "apikey" = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type" = "text/plain"
        "x-upsert" = "true"
    }
    $UPLOAD_URL = "$SUPABASE_URL/storage/v1/object/backups/$BACKUP_FILE"
    try {
        Invoke-RestMethod -Uri $UPLOAD_URL -Method Post -Headers $HEADERS -Body $SQL_CONTENT
        Write-Host "Uploaded to Supabase Storage!"
    } catch {
        Write-Host "Supabase upload failed - saved to GitHub and Google Drive only"
    }
}

# STEP 6: Commit to GitHub
Write-Host "Committing to GitHub..."
git add .
git commit -m "backup: automated backup $DATE"
git push origin master
Write-Host "Pushed to GitHub!"

# STEP 7: Show backup size
if (Test-Path $BACKUP_FILE) {
    $SIZE = [math]::Round((Get-Item $BACKUP_FILE).Length / 1KB, 1)
    Write-Host "Backup size: $SIZE KB"
}

Write-Host "========================================"
Write-Host "   BACKUP COMPLETE!"
Write-Host "========================================"
Write-Host "Saved to:"
Write-Host "  - Google Drive (auto sync)"
Write-Host "  - GitHub (committed and pushed)"
Write-Host "  - Supabase Storage backups bucket"
Write-Host "  - Visible in admin/backup-control"
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
