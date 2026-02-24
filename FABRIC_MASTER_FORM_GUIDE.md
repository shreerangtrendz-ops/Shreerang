# Fabric Master Form Guide

## 1. Overview
The Fabric Master form is a powerful tool for quickly adding new base fabrics to the system. It features a visual selection interface that reduces data entry time by auto-populating fields based on the chosen fabric type. The system also automatically generates standardized SKUs and Base Fabric Names.

## 2. Getting Started
1. Navigate to **Admin Dashboard**.
2. Click on **Fabric & Design**.
3. Select **Base Fabrics**.
4. Click the **"+ New Fabric"** button.
5. You will see the **Fabric Image Selector** at the top of the form.

## 3. Image Selection
The form begins with a grid of 7 common fabric types.
- **60x60 Cotton**: Defaults to Cotton base.
- **Poly Crepe**: Defaults to Polyester base.
- **Rayon 14kg**: Defaults to Rayon base with 14kg weight.
- **Viscose Blend**: Defaults to Viscose base.
- **Cotton Linen**: Defaults to Cotton base.
- **Polyester Satin**: Defaults to Polyester base.
- **Rayon Silk**: Defaults to Rayon base.

**Action:** Click on any image to select it. The card will highlight with a blue border and checkmark.

**Benefit:** Clicking an image automatically fills in the **Fabric Name**, **Base**, and default **Technical Details** like Yarn Type and Construction.

## 4. Form Fields

### Basic Info
- **Fabric Name** (Auto-filled): The commercial name of the fabric.
- **Width** (Required): Select from standard widths (e.g., 44", 58"). *This field is mandatory.*
- **Base** (Auto-filled/Required): The material composition (Cotton, Polyester, etc.).
- **Finish** (Default: Greige): The processing stage.

### Technical Details
- **Weight**: Enter weight in kg.
- **GSM**: Grams per Square Meter.
- **GSM Tolerance**: E.g., +/- 5%.
- **Construction**: E.g., 92 x 88 / 40s x 40s.
- **Yarn Type**: Spun, Filament, etc.
- **Yarn Count**: E.g., 60s.
- **Handfeel**: Soft, Crisp, etc.
- **Stretch**: None, 2-Way, etc.
- **Transparency**: Opaque, Sheer, etc.
- **HSN Code**: Tax classification code.

## 5. SKU & Base Fabric Name
The system automatically generates standard identifiers:

*   **SKU Format**: `[Width]-[ShortCode]-[Finish]`
    *   Example: `58-COT-60-GRG`
*   **Base Fabric Name Format**: `[Width] [FabricName] [Finish]`
    *   Example: `58 60x60 Cotton Greige`

## 6. Dynamic Updates
As you change fields in the form, the Preview card on the right updates in real-time.
- Changing **Width** from 44" to 58" updates both SKU and Name.
- Changing **Finish** from Greige to RFD updates the suffix (e.g., GRG -> RFD).

## 7. Submission
1. Review the **Preview** card to ensure the SKU looks correct.
2. Click **"Add Fabric to Master"**.
3. If successful, you will see a green success message.
4. The form clears automatically so you can add another fabric immediately.

## 8. Tips & Tricks
*   **Speed Entry**: Click an image -> Select Width -> Click Submit. You can add a fabric in under 10 seconds.
*   **Manual Override**: You can edit any auto-filled field if the specific fabric differs from the default.
*   **Short Code**: If the auto-generated short code (e.g., "COT") isn't what you want, you can manually type a 3-letter code in the "Short Code" field at the bottom of the Technical Details section.

## 9. Troubleshooting
*   **"Fabric Name is required"**: Ensure you clicked an image or typed a name.
*   **Submit Button Disabled**: Check for red error messages under required fields (Width is often missed).
*   **SKU Not Updating**: Try clearing the "Short Code" field to force a re-generation.

## 10. FAQ
**Q: Can I add a custom fabric not in the images?**
A: Yes, just ignore the images and fill the form manually.

**Q: How do I change the SKU format?**
A: The format is standardized for consistency. You can only influence it by changing the Width, Name, or Short Code.