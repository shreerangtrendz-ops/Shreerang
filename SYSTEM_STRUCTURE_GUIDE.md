# System Structure Guide

## PART 1: SYSTEM OVERVIEW
The Horizons Admin System has been restructured to improve data integrity and workflow efficiency. The core architecture is divided into three distinct, interconnected modules:

1.  **Fabric Master Module:** Strictly defines technical specifications of fabrics (What it is).
2.  **People Management Module:** Centralizes all external entities like Suppliers and Job Workers (Who provides/processes it).
3.  **Design Management Module:** Handles creative assets and product development (What it looks like).

**Key Benefit:** By separating "What" (Fabric) from "Who" (Supplier), we eliminate duplicate data entries when the same fabric is sourced from multiple vendors.

## PART 2: FABRIC MASTER MODULE
Located at: `Admin > Fabric Master`

This module is the technical library of the system. It contains **only** fabric categories and their physical properties.

*   **Base Fabric:** Raw materials defined by Base (Cotton, Rayon), Width, GSM, and Yarn Count.
    *   *Inputs:* Name, Base Material, Width, GSM, Weight.
    *   *Removed:* Supplier selection (Moved to People).
*   **Finish Fabric:** Processed versions of base fabrics (e.g., Dyed, Printed).
    *   *Inputs:* Parent Base Fabric, Process Type (Print, Dye), Finish Type.
    *   *Removed:* Job Worker selection (Moved to People/Orders).
*   **Fancy Finish Fabric:** Value-added fabrics (e.g., Embroidery, Hakoba).
    *   *Inputs:* Parent Finish Fabric, Value Addition Type.

**Features:**
*   **AI Description Generation:** Automatically generates standardized descriptions based on technical specs.
*   **Simplified Forms:** Clean interfaces focusing purely on product attributes.

## PART 3: PEOPLE MANAGEMENT MODULE
Located at: `Admin > People`

This module centralizes the management of all external partners.

### Supplier Management
*   **Purpose:** Manage vendors for raw materials (fabrics) and accessories.
*   **Capabilities:**
    *   Add/Edit/Delete Suppliers.
    *   Store Banking & GST details for PO generation.
    *   Filter by Supplier Type (Fabric vs Accessory).
    *   Import/Export via Excel.

### Job Worker Management
*   **Purpose:** Manage contractors who perform services (Dyeing, Printing, Stitching).
*   **Capabilities:**
    *   Add/Edit/Delete Job Workers.
    *   Define **Specializations** (e.g., Dyer, Printer) to categorize them for specific tasks.
    *   Store standard Rates per Unit for costing.

## PART 4: DESIGN MANAGEMENT MODULE
Located at: `Admin > Design Management`

*   **Upload Designs:** Interface for adding new creative concepts and linking them to fabrics.
*   **Pending Information:** A dashboard to track designs that are missing critical data (images, prices) before they can be sold.

## PART 5: INTEGRATIONS
Located at: `Admin > Settings > Integrations` (or via sidebar)

*   **Google Drive Sync:** Automatically syncs high-resolution design images to/from Google Drive.
*   **WhatsApp Integration:** Handles automated notifications and marketing broadcasts.
*   **Excel Import/Export:** Robust tools for bulk data operations across all modules.

## PART 6: MENU STRUCTURE
The Admin Sidebar has been reorganized for logical flow:

*   **Fabric Master**
    *   Base Fabric
    *   Finish Fabric
    *   Fancy Finish Fabric
*   **Design Management**
    *   Upload Designs
    *   Pending Information
*   **People**
    *   Suppliers
    *   Job Workers
    *   Customers
    *   Agents
*   **Integrations**
    *   Google Drive
    *   WhatsApp
*   **Import/Export**
    *   Import from Excel
    *   Export to Excel
*   **Inventory**
*   **Orders**
*   **Reports**
*   **Settings**