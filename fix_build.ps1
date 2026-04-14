# SRTPL Horizon — Fix Vercel build error
# Run from: C:\Shreerang 2026\Horizon Code
# Usage: powershell -ExecutionPolicy Bypass -File fix_build.ps1

$root = "C:\Shreerang 2026\Horizon Code"
Set-Location $root

Write-Host "Step 1: Fixing App.jsx (add SmartFinancePage import + route)..." -ForegroundColor Yellow

$appPath = "$root\src\App.jsx"
$app = [System.IO.File]::ReadAllText($appPath, [System.Text.Encoding]::UTF8)

# Add SmartFinancePage import after PartyMastersPage import
if ($app -notlike "*SmartFinancePage*") {
    $app = $app -replace "import PartyMastersPage from '@/pages/admin/PartyMastersPage';", "import PartyMastersPage from '@/pages/admin/PartyMastersPage';`nimport SmartFinancePage from '@/pages/admin/SmartFinancePage';"
    Write-Host "  Added SmartFinancePage import" -ForegroundColor Green
} else {
    Write-Host "  SmartFinancePage import already exists" -ForegroundColor Gray
}

# Add route
if ($app -notlike "*smart-finance*") {
    $app = $app -replace '<Route path="masters" element=\{<PartyMastersPage />\} />', '<Route path="masters" element={<PartyMastersPage />} />' + "`n" + '                     <Route path="smart-finance" element={<SmartFinancePage />} />'
    Write-Host "  Added smart-finance route" -ForegroundColor Green
} else {
    Write-Host "  smart-finance route already exists" -ForegroundColor Gray
}

[System.IO.File]::WriteAllText($appPath, $app, [System.Text.UTF8Encoding]::new($false))
Write-Host "App.jsx saved" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Download the 2 large files from Claude outputs and copy them:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  From your Downloads folder, copy:" -ForegroundColor White
Write-Host "  DEPLOY_SmartFinancePage.jsx  ->  src\pages\admin\SmartFinancePage.jsx" -ForegroundColor Cyan
Write-Host "  DEPLOY_TallyAccountingHub.jsx -> src\pages\admin\accounting\TallyAccountingHub.jsx" -ForegroundColor Cyan
Write-Host ""

# Check if files were already copied
$smartPath = "$root\src\pages\admin\SmartFinancePage.jsx"
$hubPath   = "$root\src\pages\admin\accounting\TallyAccountingHub.jsx"

$smartReady = Test-Path $smartPath
$hubOld = $false
if (Test-Path $hubPath) {
    $hubLines = (Get-Content $hubPath).Count
    $hubOld = $hubLines -lt 900
}

if ($smartReady -and -not $hubOld) {
    Write-Host "Both files found! Committing..." -ForegroundColor Green
    git add src/App.jsx src/pages/admin/SmartFinancePage.jsx src/pages/admin/accounting/TallyAccountingHub.jsx
    git commit -m "Fix Vercel build: SmartFinancePage + TallyAccountingHub v35 + App routes"
    git push origin master
    Write-Host ""
    Write-Host "DONE! Vercel will deploy in ~60 seconds." -ForegroundColor Green
    Write-Host "Check: https://shreerangtrendz.com/admin/accounting/hub" -ForegroundColor Cyan
} else {
    Write-Host "Waiting for large files..." -ForegroundColor Yellow
    if (-not $smartReady) { Write-Host "  MISSING: src\pages\admin\SmartFinancePage.jsx" -ForegroundColor Red }
    if ($hubOld) { Write-Host "  OLD VERSION: src\pages\admin\accounting\TallyAccountingHub.jsx (need 991-line version)" -ForegroundColor Red }
    Write-Host ""
    Write-Host "After copying the files, run:" -ForegroundColor White
    Write-Host "  cd `"C:\Shreerang 2026\Horizon Code`"" -ForegroundColor Cyan
    Write-Host "  git add -A && git commit -m `"Fix build: add SmartFinancePage + TallyAccountingHub v35`" && git push origin master" -ForegroundColor Cyan
}
