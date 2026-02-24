# Fabric Master Simplified Guide

## PART 1: FABRIC MASTER OVERVIEW
The Fabric Master is now a pure "Product Library". It answers the question **"What are we selling/making?"**. It no longer contains data about **"Who we bought it from?"** (that is now in the People module).

## PART 2: BASE FABRIC
**Definition:** The raw material.
*   **Action:** Create a Base Fabric.
*   **Key Fields:** Name (e.g., "60x60 Cotton"), Base Material (Cotton), Width (58"), GSM (90).
*   **Change:** You will **not** see a Supplier dropdown here anymore.
*   **Why?** Because "60x60 Cotton" is the same technical product whether you buy it from Supplier A or Supplier B.

## PART 3: FINISH FABRIC
**Definition:** A Base Fabric that has undergone a process.
*   **Action:** Create a Finish Fabric derived from a Base Fabric.
*   **Key Fields:**
    *   **Base Fabric:** Select from your list of Base Fabrics.
    *   **Process:** e.g., "Digital Print".
    *   **Finish Name:** Auto-generated (e.g., "Cotton 60x60 Digital Print").
*   **Change:** You will **not** see a Job Worker dropdown here.
*   **Why?** You might send the same base fabric to 5 different printers. The specific printer is selected when you create a **Job Order** or **Purchase Order**, not when you define the fabric type.

## PART 4: FANCY FINISH FABRIC
**Definition:** A Finish Fabric with additional value (e.g., Embroidery).
*   **Action:** Create a Fancy Finish derived from a Finish Fabric.
*   **Key Fields:**
    *   **Parent Fabric:** Select a Finish Fabric.
    *   **Value Addition:** e.g., "Hakoba".
*   **Change:** No Job Worker selection.

## PART 5: SIMPLIFIED WORKFLOW
1.  **Define:** Define your library of fabrics in **Fabric Master**.
2.  **Onboard:** Register your vendors in **People > Suppliers**.
3.  **Purchase:** When you actually buy fabric, you will create a **Purchase Order** (coming in Inventory update) where you say: *"Buying [Base Fabric X] from [Supplier Y]"*.

This structure keeps your data clean, searchable, and scalable.