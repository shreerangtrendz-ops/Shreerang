import fs from 'fs';
import * as xlsx from 'xlsx';

const trackerPath = 'I:/My Drive/Automation/Shreerang 2026/Change Tracker/Change Tracker.xlsx';

try {
    let workbook;
    if (fs.existsSync(trackerPath)) {
        workbook = xlsx.readFile(trackerPath);
    } else {
        workbook = xlsx.utils.book_new();
        workbook.SheetNames.push('Sheet1');
        workbook.Sheets['Sheet1'] = xlsx.utils.aoa_to_sheet([['Date', 'Feature', 'Description', 'Author', 'Status']]);
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    data.push([
        new Date().toLocaleDateString(),
        "Admin Dashboard Redesign",
        "Applied shreerang_dashboard_v10 layout to React components, integrated Tally Prime URL",
        "AI Assistant",
        "Completed"
    ]);

    const newWorksheet = xlsx.utils.aoa_to_sheet(data);
    workbook.Sheets[sheetName] = newWorksheet;
    xlsx.writeFile(workbook, trackerPath);
    console.log('Tracker updated successfully.');
} catch (error) {
    console.error('Error updating tracker:', error.message);
}
