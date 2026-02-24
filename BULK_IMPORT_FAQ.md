# Bulk Import FAQ

## General
**Q: Is there an Undo button?**
A: No. You must delete items manually or use Bulk Delete if you make a mistake.

**Q: Can I update prices via Bulk Import?**
A: No, this tool is for **Creating** new records only. Use the "Edit" function or a separate "Price Update" tool for updates.

**Q: Why is my file rejected?**
A: Check if it's over 5MB, or if it's the wrong format (must be .xlsx or .csv).

## Data Logic
**Q: How is the SKU generated?**
A: For Base Fabrics: `Width + ShortCode + Finish`. For Finish Fabrics: `BaseSKU + ProcessCode`.

**Q: Can I provide my own SKU?**
A: Currently, no. SKUs are auto-generated to ensure consistency across the system.

**Q: What if my "Base" isn't in the dropdown?**
A: Contact the Admin/Developer to add the new Base type to the system configuration code.

## Errors
**Q: "Row 5: SKU Duplicate" - what does this mean?**
A: It means an item with identical attributes (Name, Width, Finish, etc.) already exists in the database.

**Q: My import stopped halfway. What happened?**
A: Likely an internet disconnect. Check "Import History" to see how many succeeded, then re-upload the remaining rows.