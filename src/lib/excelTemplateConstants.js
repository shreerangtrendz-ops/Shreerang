/**
 * Excel Import Template Constants
 * Columns match the actual Fabric Master Excel (New_Fabric_Master_V2.xlsx)
 * 
 * SKU Formula:
 *   Base Fabric SKU  = Width + Short Code + Process Code
 *   Finish Fabric SKU = Width + Short Code + ProcessType Code + Class Code + Tag Code + Process Code
 *   Fancy Finish SKU  = FinishSKU + VA Code + Concept Code
 */

// ─── BASE FABRIC ────────────────────────────────────────────────────────────────
export const BASE_FABRIC_COLUMNS = [
  'Fabric Name',
  'Short Code',        // e.g. COTTPL — same Short Code must be used for Base/Finish/Fancy
  'Base',              // Fiber base: Cotton, Polyester, Rayon, Viscose, etc.
  'Base Code',         // Auto-filled from Base (COTT, POLY, RAY…)
  'Process',           // Greige / RFD
  'Base Width',        // Width before processing e.g. 60"
  'Finish Width',      // Width after processing e.g. 58"
  'Construction',      // Plain Weave, Satin, Georgette…
  'Construction Code', // PL, SAT, GT…
  'Stretchability',    // Rigid / Mechanical / 2 Way / 4 Way
  'Transparency',      // Opaque / Semi Sheer / Sheer
  'Handfeel',          // Soft / Crisp / Silky
  'HSN Code',          // Auto from Base (5208, 5407, 5516…) — can override
  'Weight',            // e.g. 8kg per thaan
  'GSM',               // e.g. 110
  'GSM Tolerance',     // e.g. ± 5%
  'Yarn Type',         // Spun / Filament
  'Yarn Count',        // e.g. 60x60 / 75D / 40s
];

export const EXAMPLE_BASE_FABRICS = [
  {
    'Fabric Name': '60 x 60 Cotton', 'Short Code': 'COTTPL',
    'Base': 'Cotton', 'Base Code': 'COTT',
    'Process': 'Greige', 'Base Width': '60"', 'Finish Width': '58"',
    'Construction': 'Plain Weave', 'Construction Code': 'PL',
    'Stretchability': 'Rigid', 'Transparency': 'Semi Sheer', 'Handfeel': 'Soft',
    'HSN Code': '5208', 'Weight': '8kg', 'GSM': 75, 'GSM Tolerance': '± 5%',
    'Yarn Type': 'Spun', 'Yarn Count': '60x60',
  },
  {
    'Fabric Name': 'Rayon Capsule', 'Short Code': 'RAYCAP',
    'Base': 'Rayon', 'Base Code': 'RAY',
    'Process': 'Greige', 'Base Width': '62"', 'Finish Width': '58"',
    'Construction': 'Plain Weave', 'Construction Code': 'PL',
    'Stretchability': 'Rigid', 'Transparency': 'Opaque', 'Handfeel': 'Soft',
    'HSN Code': '5516', 'Weight': '10kg', 'GSM': 90, 'GSM Tolerance': '± 5%',
    'Yarn Type': 'Spun', 'Yarn Count': '30s',
  },
  {
    'Fabric Name': 'Poly Georgette', 'Short Code': 'POLYGT',
    'Base': 'Polyester', 'Base Code': 'POLY',
    'Process': 'RFD', 'Base Width': '58"', 'Finish Width': '44"',
    'Construction': 'Georgette', 'Construction Code': 'GT',
    'Stretchability': 'Rigid', 'Transparency': 'Semi Sheer', 'Handfeel': 'Silky',
    'HSN Code': '5407', 'Weight': '7kg', 'GSM': 65, 'GSM Tolerance': '± 5%',
    'Yarn Type': 'Filament', 'Yarn Count': '75D',
  },
];

// ─── FINISH FABRIC ───────────────────────────────────────────────────────────────
// Name Formula : Width + Fabric Name + Process Type + Class + Tags + Process
// SKU Formula  : Width + Short Code + ProcessType Code + Class Code + Tag Code + Process Code
export const FINISH_FABRIC_COLUMNS = [
  'Base Fabric Short Code', // Must match Short Code of Base Fabric
  'Width',                  // Finish width e.g. 58" / 44"
  'Process',                // The LAST process (defines the name): Mill Print, Digital Print, Solid Dyed…
  'Process Code',           // MP, DP, SLD… (auto from Process)
  'Process Type',           // Procion, Discharge, Sublimation, Reactive…
  'Process Type Code',      // Auto from Process Type
  'Class',                  // Regular (omitted from name) / Premium / Khadi
  'Tags',                   // Without Foil (omitted from name) / Foil / Gold / Glitter
  'Ink Type',               // Dye Used, Pigment Dye, Reactive Dye…
  'Finish',                 // Bio Wash, Silicon Finish, Stone Wash…
  'Intermediate Process',   // Optional: RFD (if Grey → RFD → Print)
];

export const EXAMPLE_FINISH_FABRICS = [
  {
    'Base Fabric Short Code': 'COTTPL', 'Width': '58"',
    'Process': 'Mill Print', 'Process Code': 'MP',
    'Process Type': 'Procion', 'Process Type Code': 'PRC',
    'Class': 'Regular', 'Tags': 'Without Foil',
    'Ink Type': 'Reactive Dye', 'Finish': 'Bio Wash',
    'Intermediate Process': 'RFD',
  },
  {
    'Base Fabric Short Code': 'RAYCAP', 'Width': '44"',
    'Process': 'Digital Print', 'Process Code': 'DP',
    'Process Type': 'Sublimation', 'Process Type Code': 'SUB',
    'Class': 'Regular', 'Tags': 'Foil',
    'Ink Type': 'Disperse Dye', 'Finish': 'Heat Set',
    'Intermediate Process': '',
  },
  {
    'Base Fabric Short Code': 'POLYGT', 'Width': '44"',
    'Process': 'Solid Dyed', 'Process Code': 'SLD',
    'Process Type': 'Reactive', 'Process Type Code': 'REA',
    'Class': 'Regular', 'Tags': 'Without Foil',
    'Ink Type': 'Reactive Dye', 'Finish': 'Soft Finish',
    'Intermediate Process': 'RFD',
  },
];

// ─── FANCY FINISH FABRIC ─────────────────────────────────────────────────────────
// Name Formula : Finish Fabric Name + VA + Concept
// SKU Formula  : Finish Fabric SKU + VA Code + Concept Code
export const FANCY_FINISH_FABRIC_COLUMNS = [
  'Finish Fabric SKU',  // Must match an existing Finish Fabric SKU
  'Value Addition',     // Hakoba, Embroidered, Handwork, Foil/Gold/Glitter…
  'VA Code',            // HK, EMB, HW…
  'Thread',             // Semi Dull Poly, Full Dull Poly, Cotton (+5), GPO  [only for Hakoba/Emb]
  'Concept',            // Eyelet/Borer, Sequins (Sitara), Multi-Thread…
  'Concept Code',       // HK, SQN… (auto from Concept)
];

export const EXAMPLE_FANCY_FINISH_FABRICS = [
  {
    'Finish Fabric SKU': '58COTTPL-MP-PRC', 'Value Addition': 'Hakoba',
    'VA Code': 'HK', 'Thread': 'Semi Dull Poly',
    'Concept': 'Eyelet/Borer', 'Concept Code': 'EYL',
  },
  {
    'Finish Fabric SKU': '44RAYCAP-DP-SUB-FOI', 'Value Addition': 'Hakoba',
    'VA Code': 'HK', 'Thread': 'Cotton (+5)',
    'Concept': 'Sequins (Sitara)', 'Concept Code': 'SQN',
  },
  {
    'Finish Fabric SKU': '44POLYGT-SLD-REA', 'Value Addition': 'Embroidered',
    'VA Code': 'EMB', 'Thread': 'Full Dull Poly',
    'Concept': 'Multi-Thread', 'Concept Code': 'MTH',
  },
];

// ─── INSTRUCTIONS ────────────────────────────────────────────────────────────────
export const INSTRUCTIONS_TEXT = {
  base: `BASE FABRIC IMPORT INSTRUCTIONS
================================
1. Fabric Name    : Full name of the base fabric (e.g. "60 x 60 Cotton", "Rayon Capsule")
2. Short Code     : 4-7 char code used in SKU. MUST be same for Base/Finish/Fancy of same fabric.
3. Base           : Fiber type — Cotton, Polyester, Rayon, Viscose, Modal, Linen, Silk, Wool, PV, PC, NV
4. Process        : Greige or RFD
5. HSN Code       : Auto-detected from Base fiber. You can override.
6. Base Width     : Width as received from mill (e.g. 60")
7. Finish Width   : Width after processing (e.g. 58")
8. Class          : Regular = omitted from SKU/name. Premium / Khadi = included.
9. Tags           : Without Foil = omitted from SKU/name. Foil/Gold/Glitter = included.

SKU GENERATED: [FinishWidth][ShortCode][ProcessCode]
Example: 58COTTPL-GRI  |  44RAYCAP-RFD`,

  finish: `FINISH FABRIC IMPORT INSTRUCTIONS
===================================
1. Base Fabric Short Code : Must exactly match a Short Code already in Base Fabric master.
2. Width                  : Finish width of this fabric.
3. Process                : The LAST process applied — this defines the fabric name and SKU.
4. Process Type           : Sub-type of the process (e.g. Procion, Reactive, Sublimation).
5. Class                  : Regular (omitted) / Premium / Khadi.
6. Tags                   : Without Foil (omitted) / Foil / Gold / Glitter.
7. Intermediate Process   : Optional. If fabric went through RFD before the final process, enter "RFD".

NAME:  [Width] [Fabric Name] [ProcessType] [Class?] [Tags?] [Process]
SKU:   [Width][ShortCode]-[ProcessTypeCode]-[ClassCode?]-[TagCode?]
Example: 58 60x60 Cotton Procion Mill Print  →  SKU: 58COTTPL-MP-PRC`,

  fancy: `FANCY FINISH FABRIC IMPORT INSTRUCTIONS
=========================================
1. Finish Fabric SKU : Must exactly match an existing Finish Fabric SKU in the system.
2. Value Addition    : Hakoba / Embroidered / Handwork / Foil/Gold/Glitter / Crush/Pleated / Deca/Washing
3. Thread            : Required for Hakoba and Embroidered. Options: Semi Dull Poly, Full Dull Poly, Cotton (+5), GPO
4. Concept           : Sub-category of VA. For Hakoba: Eyelet/Borer, Sequins (Sitara), Multi-Thread, etc.

NAME:  [Finish Fabric Name] [Value Addition] [Concept]
SKU:   [Finish Fabric SKU]-[VA Code]-[Concept Code]
Example: 58 60x60 Cotton Procion Mill Print Hakoba Eyelet/Borer  →  58COTTPL-MP-PRC-HK-EYL`,
};
