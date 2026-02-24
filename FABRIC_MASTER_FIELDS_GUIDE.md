# Fabric Master: Field Reference Guide

## 1. Introduction
This document details the data structure for the Fabric Master module. Understanding these fields ensures data integrity, correct auto-generation of SKUs, and accurate reporting.

---

## 2. Required Fields
These fields are mandatory for creating a fabric record.

### Fabric Name
- **Description**: The primary commercial or technical name of the fabric.
- **Format**: Text (Alphanumeric).
- **Validation**: Required. Unique constraint (soft check).
- **Examples**: `60 x 60 Cotton`, `Poly Crepe`, `Rayon 14kg`, `Satin Silk`.

### Width
- **Description**: The usable width of the fabric roll in inches.
- **Format**: Text/Number. Must match allowed list.
- **Allowed Values**: `28"`, `30"`, `36"`, `40"`, `44"`, `48"`, `50"`, `54"`, `56"`, `58"`, `62"`, `66"`, `72"`, `78"`.
- **Validation**: Must match exactly (e.g., `58` or `58"`).

### Base
- **Description**: The primary fiber composition or category.
- **Format**: Text (Dropdown in UI).
- **Allowed Values**: `Cotton`, `Polyester`, `Viscose`, `Rayon`, `PV`, `PC`, `Nylon`, `Silk`, `Linen`, `Wool`, `Blend`.
- **Validation**: Must match allowed list.

### Finish
- **Description**: The processing state of the fabric.
- **Format**: Text (Dropdown in UI).
- **Allowed Values**:
    - `Greige`: Raw, unprocessed fabric.
    - `RFD`: Ready for Dyeing.
    - `PPF`: Pre-Process Finish.
    - `Dyed`: Solid color dyed.
    - `Printed`: Printed pattern.
    - `Bleached`: White/Bleached.
- **Validation**: Must match allowed list.

---

## 3. Optional Fields
These fields are not mandatory but highly recommended for complete specifications.

### Weight (kg)
- **Description**: Average weight of the fabric per unit (usually meter or yard).
- **Format**: Decimal Number (e.g., `0.150`).
- **Range**: 0.01 to 5.00.

### GSM
- **Description**: Grams per Square Meter. A standard measure of fabric density.
- **Format**: Integer or Decimal.
- **Example**: `110`, `80`, `220`.

### GSM Tolerance
- **Description**: Acceptable manufacturing variance in GSM.
- **Format**: Text.
- **Example**: `+/- 5%`, `+/- 10`.

### Construction
- **Description**: Technical details of the weave (warp x weft / ends x picks).
- **Format**: Text.
- **Example**: `92 x 88 / 40s x 40s`, `Plain Weave`, `Twill`.

### Yarn Type
- **Description**: Characteristics of the yarn used.
- **Allowed Values**: `Spun`, `Filament`, `Texturized`.

### Yarn Count
- **Description**: The count/thickness of the yarn.
- **Format**: Text.
- **Example**: `60s`, `40s`, `150D`.

### Handfeel
- **Description**: The tactile sensation of the fabric.
- **Allowed Values**: `Soft`, `Crisp`, `Rough`, `Silky`, `Dry`.

### Stretch
- **Description**: Elasticity properties.
- **Allowed Values**: `None`, `Mechanical`, `2-Way`, `4-Way`.

### Transparency
- **Description**: Light transmission properties.
- **Allowed Values**: `Opaque`, `Semi-Sheer`, `Sheer`.

### HSN Code
- **Description**: Harmonized System of Nomenclature code for tax purposes.
- **Format**: Numeric string (4-8 digits).
- **Example**: `5208`, `5407`.

---

## 4. Auto-Generated Fields
The system automatically creates these fields to ensure standardization.

### Short Code
- **Generation Logic**: Derived from `Base` + `Fabric Name`.
- **Logic**:
    1.  Base Abbreviation (e.g., Cotton -> `COT`).
    2.  Number extraction from Name (e.g., "60 x 60" -> `60`).
    3.  Combination: `COT-60`.
- **Examples**:
    - `Poly Crepe` -> `POLY`
    - `Rayon 14kg` -> `RAY-14`

### SKU (Stock Keeping Unit)
- **Generation Logic**: `Width` + `Short Code` + `Finish`.
- **Format**: `[WIDTH]-[CODE]-[FINISH]`.
- **Examples**:
    - `58-COT-60-GREIGE`
    - `44-POLY-RFD`

---

## 5. Validation Rules Matrix

| Field | Rule | Error Message |
| :--- | :--- | :--- |
| **Fabric Name** | Not Empty | "Fabric Name is required" |
| **Width** | In Allowed List | "Invalid Width. Allowed: 28, 30..." |
| **Base** | In Allowed List | "Invalid Base. Allowed: Cotton, Polyester..." |
| **Finish** | In Allowed List | "Invalid Finish. Allowed: Greige, RFD..." |
| **SKU** | Unique in Database | "Duplicate SKU: [SKU] already exists" |

---

## 6. Examples

### Complete Record
- **Name**: 60 x 60 Cotton
- **Width**: 58"
- **Base**: Cotton
- **Finish**: Greige
- **GSM**: 110
- **Weight**: 0.12
- **Construction**: Plain Weave
- **HSN**: 5208
- **Resulting SKU**: `58-COT-60-GREIGE`

### Minimal Record
- **Name**: Poly Satin
- **Width**: 44"
- **Base**: Polyester
- **Finish**: RFD
- **Resulting SKU**: `44-POLY-RFD`

---

## 7. Best Practices
1.  **Consistent Naming**: Always use "Poly" for Polyester blends, "Cot" for Cotton blends in names to help the AI generator.
2.  **Standard Widths**: Stick to the industry standard widths in the dropdown. Avoid custom values like "57.5" unless absolutely necessary (which may cause validation errors).
3.  **Review Auto-Gen**: Always glance at the generated SKU in the preview to ensure it makes sense. If "Cotton Unknown" generates `COT-UNK`, consider renaming the fabric.