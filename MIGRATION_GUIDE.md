# Migration Guide

## From Excel/Legacy System
1.  **Data Cleaning**: Ensure all legacy Excel sheets match the templates in `ExportService.js`.
2.  **Order of Import**:
    1.  Base Fabrics (No dependencies).
    2.  Finish Fabrics (Depends on Base).
    3.  Designs (Depends on Finish).
    4.  Customers.
    5.  Stock Levels.

## Verification
*   Spot check 5 random designs after import.
*   Verify total count of records matches legacy system.