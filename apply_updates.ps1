# SRTPL Horizon — Apply Claude's updates
# Run this from: C:\Shreerang 2026\Horizon Code
# Usage: powershell -ExecutionPolicy Bypass -File apply_updates.ps1

Write-Host "Applying Claude's 5 commit updates..." -ForegroundColor Cyan

$repoRoot = "C:\Shreerang 2026\Horizon Code"
$patchFile = "$repoRoot\horizon_updates.patch"

if (-not (Test-Path $patchFile)) {
    Write-Host "ERROR: horizon_updates.patch not found in $repoRoot" -ForegroundColor Red
    Write-Host "Download it from Claude's outputs and save to the Horizon Code folder" -ForegroundColor Yellow
    exit 1
}

Write-Host "Applying patch..." -ForegroundColor Yellow
Set-Location $repoRoot

# Apply the patch
git am $patchFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Patch applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin master

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS! All 5 commits pushed to GitHub." -ForegroundColor Green
        Write-Host "Vercel will auto-deploy in ~60 seconds." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Files deployed:" -ForegroundColor White
        Write-Host "  src/pages/admin/PartyMastersPage.jsx      (inline edit, completeness)" -ForegroundColor Gray
        Write-Host "  src/pages/admin/accounting/TallyAccountingHub.jsx  (CA dashboard, 5 tabs)" -ForegroundColor Gray
        Write-Host "  src/pages/admin/SmartFinancePage.jsx      (OCR, GST recon, TDS)" -ForegroundColor Gray
        Write-Host "  src/components/admin/AdminLayout.jsx      (mobile hamburger)" -ForegroundColor Gray
        Write-Host "  src/components/admin/AdminSidebar.jsx     (Smart Finance in nav)" -ForegroundColor Gray
        Write-Host "  src/styles/accounting.css                 (font size updates)" -ForegroundColor Gray
        Write-Host "  src/App.jsx                               (SmartFinance route)" -ForegroundColor Gray
    } else {
        Write-Host "Push failed. Try: git push origin master" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "Patch failed. Try manually:" -ForegroundColor Red
    Write-Host "  git am --abort" -ForegroundColor Yellow
    Write-Host "  Then copy files manually from Claude outputs" -ForegroundColor Yellow
}
