export const BASE_FABRIC_COLUMNS = [
  'Fabric Name', 'Width', 'Base', 'Finish', 'Weight', 'GSM', 'GSM Tolerance', 
  'Construction', 'Stretchability', 'Transparency', 'Handfeel', 'HSN Code', 
  'Yarn Type', 'Yarn Count', 'Short Code'
];

export const FINISH_FABRIC_COLUMNS = [
  'Base Fabric SKU', 'Process', 'Process Type', 'Ink Type', 'Width', 'Class', 'Tags', 'Finish'
];

export const FANCY_FINISH_FABRIC_COLUMNS = [
  'Finish Fabric SKU', 'Value Addition', 'Thread', 'Concept'
];

export const EXAMPLE_BASE_FABRICS = [
  {
    'Fabric Name': 'Poplin', 'Width': '58"', 'Base': 'Cotton', 'Finish': 'Greige', 'Weight': '0.150', 
    'GSM': '120', 'GSM Tolerance': '+/- 5%', 'Construction': 'Plain Weave', 'Stretchability': 'Rigid', 
    'Transparency': 'Opaque', 'Handfeel': 'Soft', 'HSN Code': '5208', 'Yarn Type': 'Spun', 
    'Yarn Count': '40s', 'Short Code': 'COTTPL'
  },
  {
    'Fabric Name': 'Satin', 'Width': '44"', 'Base': 'Polyester', 'Finish': 'RFD', 'Weight': '0.100', 
    'GSM': '80', 'GSM Tolerance': '+/- 5%', 'Construction': 'Satin', 'Stretchability': 'Rigid', 
    'Transparency': 'Opaque', 'Handfeel': 'Silky', 'HSN Code': '5407', 'Yarn Type': 'Filament', 
    'Yarn Count': '50D', 'Short Code': 'POLYSAT'
  }
];

export const EXAMPLE_FINISH_FABRICS = [
  {
    'Base Fabric SKU': '58COTTPL-GRG', 'Process': 'Mill Print', 'Process Type': 'Procion', 
    'Ink Type': 'Reactive Dye', 'Width': '58"', 'Class': 'Regular', 'Tags': 'Without Foil', 'Finish': 'Bio Wash'
  },
  {
    'Base Fabric SKU': '44POLYSAT-RFD', 'Process': 'Digital Print', 'Process Type': 'Sublimation', 
    'Ink Type': 'Disperse Dye', 'Width': '44"', 'Class': 'Premium', 'Tags': 'Foil', 'Finish': 'Silicon Finish'
  }
];

export const EXAMPLE_FANCY_FINISH_FABRICS = [
  {
    'Finish Fabric SKU': '58COTTPL-MPPRC', 'Value Addition': 'Hakoba', 'Thread': 'Cotton', 'Concept': 'Eyelet/Borer'
  },
  {
    'Finish Fabric SKU': '44POLYSAT-DPSUB', 'Value Addition': 'Embroidered', 'Thread': 'Poly', 'Concept': 'Sequins (Sitara)'
  }
];

export const INSTRUCTIONS_TEXT = {
  base: "1. Fabric Name, Width, Base, and Finish are required.\n2. Width must be one of the standard widths (e.g., 58\", 44\").\n3. Base must match standard base types.\n4. Short Code will be auto-generated if left empty.",
  finish: "1. Base Fabric SKU must match an existing Base Fabric.\n2. Process and Process Type must be valid combinations.\n3. Width override is optional.",
  fancy: "1. Finish Fabric SKU must match an existing Finish Fabric.\n2. Value Addition, Thread, and Concept must be valid combinations."
};