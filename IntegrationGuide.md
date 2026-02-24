# Hostinger Horizons Integration Guide

## Part 1: System Overview

The Fabric Management System is a comprehensive platform built with React and Supabase. It manages the entire lifecycle of fabric production, from raw base fabrics to finished products, including sales, inventory, and design management.

### Key Modules:
- **Masters:** Base Fabrics, Finish Fabrics, Fancy Fabrics
- **Designs:** Design sets, photo gallery, combo packs
- **Inventory:** Stock tracking, Google Drive sync
- **Sales:** Order management, tracking
- **Production:** Costing sheets for various processes

---

## Part 2: Database Setup

The system uses Supabase (PostgreSQL) with the following key tables:

- `base_fabrics`: Stores raw material definitions (e.g., Rayon, Cotton).
- `finish_fabrics`: Stores processed fabrics linked to base fabrics.
- `finish_fabric_designs`: Individual designs linked to finish fabrics.
- `design_sets` & `design_set_components`: Manages combo packs (e.g., Top + Bottom).
- `sales_orders` & `sales_order_items`: Handles customer orders.
- `product_masters`: Defines final sellable products with costing.

---

## Part 3: Excel Upload Workflow

1. Navigate to **Masters > Base Fabrics > Import**.
2. Download the template using the "Download Template" button.
3. Fill in the required fields: `Base Fabric Name` (compulsory).
4. Upload the file.
5. The system validates entries before insertion.
   - **Validation:** Checks for duplicate names and empty required fields.
   - **Errors:** Displayed per row with specific messages.

---

## Part 4: Finish Fabric Creation

1. Go to **Masters > Fabric Master**.
2. Locate a Base Fabric card and click **"Add Finish"**.
3. Fill in process details (e.g., Printed, Dyed).
4. **Design Information:** Add design numbers manually or upload via Excel later.
5. **Value Addition:** Add Hakoba or Embroidery details if applicable.
6. The system auto-generates a standardized name based on your inputs.

---

## Part 5: Design Combo Packs

1. Use the **Design Set Manager** (available in Finish Fabric form or Product Master).
2. Click **"Add Design Set"**.
3. Select type: Single, 2-Pc, 3-Pc, or Combo.
4. Add components:
   - Select Component Type (e.g., Top).
   - Enter Design Number.
   - Select Fabric.
   - Upload Component Photo.
5. The system auto-generates a Master Design Number (e.g., `5001-5002`).

---

## Part 6: Google Drive Sync

1. Go to **Inventory > Drive Sync**.
2. Enter your Google Drive Folder URL.
3. **Folder Structure Requirement:**
   - Root > Category (Rayon) > Width (58") > Design Images.
4. Click **Sync Now**.
5. The system scans folders and links images to existing design numbers in the database.

---

## Part 7: Sales Order Integration

1. Go to **Orders > Sales Orders > Create Order**.
2. Select a Customer.
3. **Add Items:**
   - Enter a Design Number in the input field.
   - The system **Auto-Fetches** details from:
     1. Combo Packs
     2. Individual Designs
     3. Legacy Fabric Lists
   - Details like Fabric Name, Process, and Photo are auto-filled.
4. Enter Quantity and Rate.
5. Save Order.

---

## Part 8: Troubleshooting

**Issue:** Auto-fetch not working in Sales Order.
**Fix:** Ensure the design number exists in `finish_fabric_designs` or `design_sets`. Check if the design status is 'Active'.

**Issue:** Excel upload fails.
**Fix:** Ensure column headers match exactly as per the template. Remove empty rows at the bottom of the sheet.

**Issue:** Images not showing.
**Fix:** Check Supabase Storage bucket permissions. Ensure `design-images` bucket is public.