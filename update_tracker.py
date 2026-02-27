import openpyxl
import datetime
import os
import sys

tracker_path = r'I:\My Drive\Automation\Shreerang 2026\Change Tracker\Change Tracker.xlsx'

try:
    if os.path.exists(tracker_path):
        wb = openpyxl.load_workbook(tracker_path)
        ws = wb.active
    else:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['Date', 'Feature', 'Description', 'Author', 'Status'])

    today = datetime.datetime.now().strftime("%d-%m-%Y")
    ws.append([
        today, 
        "Admin Dashboard Redesign & Tally Link", 
        "Replicated shreerang_dashboard_v10 layout to React AdminDashboard.jsx & AdminLayout.jsx. Integrated ngrok-free Tally URL.", 
        "AI Assistant", 
        "Completed"
    ])

    wb.save(tracker_path)
    print("Tracker updated successfully using Python.")
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
