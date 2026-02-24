# Complete System Guide

## PART 1: SYSTEM OVERVIEW

### What is the System?
The Fabric & Inventory Management System is a comprehensive web application designed to streamline the operations of textile businesses. It handles the entire lifecycle of fabric management, from base materials to finished designs, including supplier management, inventory tracking, and sales order processing.

### Key Features
- **Fabric Master Management**: Hierarchical management of Base Fabrics, Finish Fabrics, and Fancy Finish Fabrics.
- **Design Management**: Advanced upload tools, bulk processing, and automated design number extraction.
- **People Management**: Centralized directory for Suppliers and Job Workers with deep integration into fabric workflows.
- **Inventory Control**: Real-time stock tracking, roll management, and stock alerts.
- **Order Processing**: End-to-end sales order management with approval workflows.
- **Bulk Operations**: Bulk delete with dependency protection and bulk excel imports.

### System Architecture
- **Frontend**: React (Vite) with Tailwind CSS and shadcn/ui.
- **Backend/Database**: Supabase (PostgreSQL) for data persistence and authentication.
- **Storage**: Supabase Storage for images and documents.
- **State Management**: React Context & Hooks.

---

## PART 2: BASE FABRIC MANAGEMENT

### Create Base Fabric
1. Navigate to **Fabric Master > Base Fabrics**.
2. Click **+ Add Base Fabric**.
3. Fill in mandatory fields: Fabric Name, Base Category, Base Type.
4. Add Alias names for better searchability.
5. Click **Save**.

### View & Filter
- **View**: The dashboard lists all base fabrics.
- **Filter**: Use the search bar or the "Filter" button to drill down by Category (Natural, Synthetic) or Specifications (Width, GSM).

### Edit & Delete
- **Edit**: Click the **Edit (Pencil)** icon on any row.
- **Delete**: Click the **Delete (Trash)** icon. *Note: If the fabric has dependent Finish Fabrics, you will be prompted to delete them first or use Cascading Delete.*

### Bulk Delete
1. Select multiple fabrics using checkboxes.
2. Click **Delete Selected**.
3. Review the **Dependency Report**.
4. Option to check **"Also delete all dependent items"** to remove related Finish Fabrics automatically.

---

## PART 3: FINISH FABRIC MANAGEMENT

### Create Finish Fabric
1. Navigate to **Fabric Master > Finish Fabrics**.
2. Click **New from Base**.
3. Select a Base Fabric.
4. Define the Process (Printed, Dyed, etc.) and Value Additions.
5. Add initial Designs (optional).
6. Click **Save**.

### Upload Designs
- **Direct Upload**: In the Finish Fabric form, use the "Design Information" section.
- **Bulk Tool**: Use the **Bulk Upload Images** button to upload multiple files at once.

---

## PART 4: DESIGN MANAGEMENT

### Option 1: Upload to Existing Fabric
*Best for adding a new collection to a specific fabric.*
1. Go to **Design Management > Upload Options**.
2. Select **Upload to Specific Fabric**.
3. Choose the fabric.
4. Drag & drop images.
5. Edit Design Numbers if auto-extraction is incorrect.
6. Click **Save**.

### Option 2: Bulk Upload Library
*Best for rapid ingestion of unstructured images.*
1. Go to **Design Management > Upload Options**.
2. Select **Bulk Library Upload**.
3. Upload 50+ images at once.
4. Apply a global Fabric tag or assign later.
5. Images go to the **Pending Information** dashboard if details are missing.

### Pending Information Dashboard
- Located at **Design Management > Pending Info**.
- Shows designs with missing Names, Aliases, or Links.
- Use **Bulk Edit** to assign properties to multiple designs simultaneously.

---

## PART 5: PEOPLE MANAGEMENT

### Suppliers
1. Go to **People > Suppliers**.
2. Click **Add Supplier**.
3. Enter Firm Name, Contact, GST, and Banking details.
4. **Link to Fabric**: In any Fabric Form, select the supplier from the dropdown to associate them.

### Job Workers
1. Go to **People > Job Workers**.
2. Click **Add Job Worker**.
3. Define Role (Tailor, Embroiderer, etc.) and Base Rates.
4. **Link**: Assign Job Workers to specific processing stages in Finish Fabric forms.

---

## PART 6: BULK DELETE SYSTEM & SAFETY

### Dependency Checking
The system automatically scans for relationships before deletion:
- **Base Fabric** checks for -> **Finish Fabrics**
- **Finish Fabric** checks for -> **Designs** & **Fancy Fabrics**
- **Supplier** checks for -> **Linked Fabrics** & **POs**

### Cascading Delete
- When authorized, the system deletes the parent item AND all its children.
- **Warning**: This action is irreversible. A confirmation modal requires explicit approval.

---

## PART 7: TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| **Image Upload Failed** | Check file size (max 5MB). Ensure file is JPG/PNG. Check internet connection. |
| **Delete Blocked** | The item has dependencies. Use "Delete with Dependencies" or remove children manually. |
| **Missing Design No** | Go to Pending Info Dashboard. The system requires Design Number for cataloging. |
| **Login Issues** | Verify email case sensitivity. Contact admin to reset password. |