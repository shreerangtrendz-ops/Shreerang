@echo off
cd /d "C:\Shreerang 2026\Horizon Code"
echo Running git status...
git status --short
echo.
echo Running git add and commit...
git add src/pages/admin/accounting/ProcessIssuesPage.jsx
git add src/pages/admin/accounting/SalesBillsPage.jsx
git add src/pages/admin/accounting/JobWorkBillsPage.jsx
git add src/pages/admin/accounting/RecFromMillPage.jsx
git commit -m "fix: remove 1000-row cap on all accounting pages - ProcessIssues summary paginates, SalesBills summary all pages, JobWork fetchAll helper, RecFromMill paginated summary"
echo.
echo Running git push...
git push origin master
echo.
echo Done. Press any key to close.
pause
