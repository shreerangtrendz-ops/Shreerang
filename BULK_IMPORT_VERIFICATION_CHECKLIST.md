# Bulk Import Verification Checklist

## ✅ Pre-Import Checklist
- [ ] **Template**: Are you using the latest version of the Excel template?
- [ ] **Data Cleanliness**: Have you checked for typos in Base, Finish, and Width?
- [ ] **Dependencies**: For Finish/Fancy imports, do the parent fabrics already exist?
- [ ] **File Format**: Is the file saved as `.xlsx` or `.csv`?
- [ ] **Batch Size**: Is the file under 1000 rows? (Recommended)

## 🔄 During-Import Checklist
- [ ] **Mapping**: Do the "System Fields" match your "Excel Headers" correctly?
- [ ] **Validation**: Are there any Red errors? (Must fix before proceeding).
- [ ] **Warnings**: Are the auto-generated codes acceptable?
- [ ] **Progress**: Is the progress bar moving?

## 🏁 Post-Import Checklist
- [ ] **Success Count**: Does the "Success" count match your row count?
- [ ] **Data Verification**: Go to the Fabric Master list. Search for 2-3 new items.
- [ ] **SKU Check**: Do the SKUs look correct? (e.g., `58-COTT-GRG`)
- [ ] **Cleanup**: Delete the import file from your computer (to avoid confusion later).

## 🛡️ Security & Quality Checklist
- [ ] **No Macros**: Ensure Excel file has no macros (.xlsm).
- [ ] **Sanitization**: Ensure no HTML or script tags in text fields.
- [ ] **Backup**: (Admin only) Is database backup active before massive imports?