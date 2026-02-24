# Fabric Master Features Summary

## Feature List

### 1. Bulk Import Engine
*   **Multi-Format Support**: Excel (`.xlsx`) and CSV.
*   **Intelligent Mapping**: Maps headers flexibly (e.g., "Name" or "Fabric Name").
*   **Validation Layer**: Checks types, ranges, and allowed enum values instantly.
*   **Preview Mode**: Review data validity before writing to the database.

### 2. Automation
*   **Auto-SKU**: Automatically generates standard SKUs (`58-COT-60-GREIGE`).
*   **Auto-Short Code**: Derives abbreviations from fabric names (`Cotton 60s` -> `COT-60`).
*   **Duplicate Protection**: Prevents duplicate SKUs from entering the system.

### 3. Bulk Management
*   **Checkbox Selection**: Standardized UI for selecting multiple items.
*   **Bulk Delete**: Safe deletion that checks for dependencies (e.g., Design usage) before removing.
*   **Progress Feedback**: Real-time bars and counters for long-running operations.

### 4. User Experience
*   **Template Download**: One-click access to the correct data format.
*   **Error Tooltips**: Specific, actionable error messages on every invalid cell.
*   **Resiliency**: Ability to import "Valid Rows Only" even if the file has some errors.

---

## Benefits

### ⏱️ Speed
*   **Old Way**: 2 minutes per fabric entry manually.
*   **New Way**: 2 minutes for **500 fabrics**.
*   **Impact**: 99% reduction in data entry time.

### 🎯 Accuracy
*   **Validation**: Eliminates typos in standard fields (Width, Base).
*   **Standardization**: Enforces SKU formats automatically, preventing human error.

### 🛡️ Safety
*   **Dependency Checks**: Prevents accidental deletion of fabrics that are actively used in designs or orders.
*   **Preview**: Allows users to catch mistakes before they pollute the database.

---

## Usage Statistics (Estimated)
*   **Typical Batch**: 50-200 items.
*   **Import Time**: ~5 seconds for parsing, ~10 seconds for DB insert (100 items).
*   **Error Rate**: Expect 5-10% rows to have errors initially (typos, duplicates) which are easily fixed via the UI feedback.

---

## Roadmap
1.  **Export Feature**: Ability to export the current filtered list to Excel.
2.  **Edit via Import**: Ability to update *existing* rows by matching SKU (currently only creates new).
3.  **Custom Mappings**: UI to let users map Excel columns manually if headers don't match.