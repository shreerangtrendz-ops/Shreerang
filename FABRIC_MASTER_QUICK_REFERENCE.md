# ⚡ Fabric Master Quick Reference

## 🔢 SKU Formula
The system automatically builds SKUs using this logic:
`[Clean Width][BaseCode][ConstructionCode]-[Finish]`

**Examples:**
*   **58" Cotton Poplin Greige** -> `58CTPO-Greige`
*   **60" Polyester Satin Dyed** -> `60PLST-Dyed`

---

## 📝 Field Reference

| Field | Type | Example | Notes |
| :--- | :--- | :--- | :--- |
| **Base** | Dropdown | Cotton | Primary material |
| **Construction** | Dropdown | Twill | Weave structure |
| **Width** | Dropdown | 58" | Usable width |
| **Finish** | Dropdown | RFD | Current processing stage |
| **GSM** | Number | 140 | Weight per sq meter |
| **Weight** | Number | 0.250 | Weight per linear meter (kg) |
| **Yarn Count** | Text | 40s | Thread thickness |
| **HSN** | Text | 5407 | Tax classification code |

---

## ⌨️ Shortcuts
*   **Search**: `Ctrl+F` (Browser default, focuses page)
*   **Submit Form**: `Enter` (if on last field)
*   **Navigation**: `Tab` / `Shift+Tab` to move between inputs

---

## 🔍 Filter Combinations
*   **Find Heavy Cotton**: Filter Base=`Cotton` + Sort by `GSM (High to Low)`
*   **Find Wide Widths**: Filter Width=`60"` or `72"`
*   **Find Greige Stock**: Filter Finish=`Greige`

---

## ⚠️ Common Validation Errors
*   **"SKU already exists"**: You are trying to create a duplicate fabric. Use the Edit function on the existing fabric instead.
*   **"GSM must be a positive number"**: Check for negative signs or non-numeric characters.
*   **"Width is required"**: This field is mandatory for SKU generation.