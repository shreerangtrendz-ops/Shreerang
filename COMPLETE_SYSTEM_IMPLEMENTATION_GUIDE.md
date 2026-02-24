# Complete System Implementation Guide

## PART 1: SYSTEM OVERVIEW

The Fabric Master System is a comprehensive ERP solution designed for textile and garment manufacturing businesses. It streamlines the entire lifecycle of fabric management, from raw material procurement to finished garment production and sales.

### System Architecture
- **Frontend**: React.js with Vite, TailwindCSS, and Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Realtime)
- **Integrations**: Google Drive (Asset Sync), Meta WhatsApp API (Communication)

### Core Modules
1.  **Fabric Master**: Three-tier hierarchy (Base -> Finish -> Fancy Finish).
2.  **Inventory**: Multi-warehouse stock tracking, roll-level management.
3.  **Sales**: Order processing, invoicing, and dispatch.
4.  **People**: Management of Customers, Suppliers, Job Workers, and Agents.
5.  **Costing**: Dynamic costing sheets for Mill, Embroidery, Hakoba, and Garments.

---

## PART 2: BASE FABRIC MANAGEMENT

**Definition**: Base fabrics represent the raw material (greige/grey) before any processing.

### Key Features
- **Creation**: Navigate to `Fabric Master > Base Fabric > Add New`.
- **Fields**: Name, HSN Code, Base Material (Cotton, Rayon, etc.), Width, GSM, Weight, Yarn Count.
- **Note**: The "Finish" field has been removed from Base Fabric to strictly define it as raw material.
- **Supplier Linking**: Link specific suppliers who provide this raw material.

---

## PART 3: FINISH FABRIC MANAGEMENT

**Definition**: Processed versions of base fabrics (e.g., Dyed, Printed).

### Key Features
- **Creation**: Navigate to `Fabric Master > Finish Fabric > Add New`.
- **Inheritance**: Must select a parent Base Fabric.
- **New Field**: "Finish" specification (e.g., Bio-wash, Silicon, Soft) is now defined here.
- **Process Definition**: Define process type (Printing, Dyeing) and link Job Workers.
- **Design Upload**: Upload multiple designs/patterns for a single finish fabric.

---

## PART 4: FANCY FINISH FABRIC MANAGEMENT

**Definition**: Value-added fabrics created from Finish Fabrics (e.g., Embroidered, Hakoba).

### Key Features
- **Creation**: Navigate to `Fabric Master > Fancy Finish > Add New`.
- **Inheritance**: Must select a parent Finish Fabric.
- **Value Addition**: Define specific techniques (Sequins, Mirror work, Embroidery).
- **Component**: Specify if it's for Top, Bottom, or Dupatta.

---

## PART 5: EXCEL IMPORT/EXPORT

### Import Workflow
1.  **Download Template**: Go to `Fabric Master > Import` and download the `.xlsx` template.
2.  **Prepare Data**: Fill in required fields. Ensure unique names.
3.  **Upload**: Upload the file to the wizard.
4.  **Map Columns**: The system auto-detects headers. Verify mappings manually if needed.
5.  **Validate**: The system checks for data integrity errors.
6.  **Import**: Click "Start Import" to commit to the database.

### Export
- Use the "Export Data" button in any master list to download current records as Excel.

---

## PART 6: GOOGLE DRIVE INTEGRATION

### Setup
1.  Go to `Settings > Integrations > Google Drive`.
2.  Click **Connect**. Authenticate with your Google Workspace account.
3.  **Folder Selection**: Choose the root folder where your design assets are stored.
4.  **Sync Settings**: Enable "Auto-Sync" to have the system periodically check for new images.

---

## PART 7: WHATSAPP INTEGRATION

### Setup
1.  Go to `Settings > Integrations > WhatsApp`.
2.  Enter **Business Account ID**, **Phone Number ID**, and **Access Token** from Meta Developer Portal.
3.  **Webhook**: Copy the generated Webhook URL to your Meta App settings to receive incoming messages.

### Usage
- **Broadcast**: Send bulk updates about new arrivals.
- **Transactional**: Automated order confirmations and dispatch updates.
- **Templates**: Create and sync templates for standardized communication.

---

## PART 8: AI DESCRIPTION GENERATION

### Overview
The system uses an AI engine to generate SEO-friendly, professional descriptions for fabrics based on their technical specifications.

### Usage
1.  In any Fabric Form, fill out the technical fields (Base, GSM, Weave, etc.).
2.  Click the **Magic Wand Icon** next to the Description field.
3.  The system generates a paragraph like: *"Premium 140 GSM Rayon fabric with a soft Bio-wash finish, featuring a durable plain weave structure ideal for casual wear."*

---

## PART 9: SUPPLIER MANAGEMENT

**Role**: External entities that provide raw materials or finished goods.

### Types
- **Fabric Supplier**: Provides Base or Finish fabrics.
- **Accessory Supplier**: Provides buttons, zippers, packaging, etc.

### Actions
- **Link to Fabric**: In the Fabric Form, select the default supplier to streamline Purchase Orders.

---

## PART 10: JOB WORKER MANAGEMENT

**Role**: Third-party units that perform processing tasks.

### Specializations
- **Dyeing Unit**: Colors the fabric.
- **Printing Mill**: Applies digital or rotary prints.
- **Embroidery Unit**: Adds value addition.
- **Stitching Unit**: Converts fabric to garments.

### Usage
- Assign Job Workers to Finish/Fancy fabrics to track who is responsible for the process.
- Define **Rate per Meter/Piece** in the Job Worker master for automated costing.

---

## PART 11: DESIGN MANAGEMENT

### Workflow
1.  **Upload**: Go to `Design Management > Upload`. Drag & drop images.
2.  **Pending Info**: Go to `Pending Information` dashboard to see designs without Fabric/Price links.
3.  **Mapping**: Assign designs to specific Finish Fabrics.
4.  **Gallery**: View the visual catalog of all active designs.

---

## PART 12: BEST PRACTICES

1.  **Naming**: Let the system auto-generate names for Finish/Fancy fabrics to ensure consistency.
2.  **Starring**: Star frequently used fabrics to keep them at the top of selection lists.
3.  **Inactive Status**: Don't delete old fabrics with transaction history; mark them as "Inactive".
4.  **Backup**: Export Excel backups weekly.

---

## PART 13: TROUBLESHOOTING

- **Import Fails**: Check for special characters in the Excel header row.
- **Drive Sync Stuck**: Disconnect and Reconnect the Google account to refresh the token.
- **WhatsApp Failed**: Ensure the template exists and is approved in the Meta Dashboard.