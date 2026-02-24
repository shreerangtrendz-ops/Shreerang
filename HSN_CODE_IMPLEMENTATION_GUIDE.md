# HSN Code Implementation Guide

## 1. Overview
The Harmonized System of Nomenclature (HSN) code is mandatory for GST compliance in India. This system now tracks HSN codes at multiple levels:
- **Base Fabrics**: The raw material HSN (e.g., 5208 for Cotton).
- **Processes**: Service HSN codes for job work (e.g., 9988).
- **Value Additions**: Specific HSN codes for embroidery/handwork.
- **Expenses**: Accounting codes for overheads.
- **Garments**: Final product HSN codes.

## 2. Master Management
Navigate to `Admin > HSN Code Master` to manage all codes centrally.
- **Process HSN**: Define codes for Printing, Dyeing, etc.
- **Value Addition HSN**: Define codes for Embroidery, etc.
- **Expense HSN**: Define codes for Packaging, Transport, etc.
- **Garment HSN**: Define codes for Kurtis, Suits, etc.

## 3. Fabric Logic
### Base Fabric
- **Compulsory**: Every Base Fabric MUST have an HSN code.
- **Default**: 5208 (Cotton) is set as a placeholder but should be updated.
- **Impact**: This HSN code is inherited by all child finish fabrics.

### Finish Fabric
- **Inheritance**: Automatically inherits the Base Fabric's HSN code.
- **Job Work**: Also tracks a `Process HSN Code` (e.g., 9988) for the finishing service itself.
- **Billing**: When creating a Job Work Order, the system uses the `Process HSN Code` to calculate GST on the *service charge*.

### Fancy Finish Fabric
- **Inheritance**: Inherits the Finish Fabric's HSN code.
- **Value Addition**: Tracks a specific `Value Addition HSN Code` for the embroidery/handwork service.

## 4. GST Calculation Rules
1.  **Fabric Sale**: Uses the Fabric's main HSN code (usually 5% or 12%).
2.  **Job Work Bill**: Uses the Process/Value Addition HSN code (usually 5%, 12%, or 18% depending on the service).
3.  **Expense Booking**: Uses the Expense HSN code for accurate input tax credit (ITC).

## 5. Best Practices
- **Update Master First**: Before creating new fabrics, ensure the relevant HSN codes exist in the Master.
- **Verify Rates**: GST rates change periodically. Use the HSN Master to update rates globally.
- **Description**: Add clear descriptions to HSN codes to help staff select the correct one.