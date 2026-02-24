export const FABRIC_TYPES = {
  BASE: 'Base',
  FINISH: 'Finish',
  FANCY: 'Fancy'
};

export const PROCESS_TYPES = [
  'Mill Print', 
  'Digital Print Poly', 
  'Digital Print Pure', 
  'Solid Dyed', 
  'Embroidery', 
  'Schiffli', 
  'Hakoba', 
  'Value Addition'
];

export const VALUE_ADDITION_TYPES = [
  'Embroidery',
  'Schiffli',
  'Hakoba',
  'Deca',
  'Washing',
  'Bio-wash',
  'Foil',
  'Glitter',
  'Handwork'
];

export const PRODUCT_STATUSES = {
  READY: 'Ready',
  OUT_OF_STOCK: 'Out of Stock'
};

export const PAYMENT_TERMS = [
  'Immediate',
  '15 Days',
  '30 Days',
  '45 Days',
  '60 Days'
];

export const ALLOWED_WIDTHS = [
  '28"', '30"', '36"', '40"', '44"', '48"', '50"', '54"', '56"', '58"', '62"', '66"', '72"', '78"'
];

export const ALLOWED_BASES = [
  'Cotton', 'Polyester', 'Viscose', 'Rayon', 'PV', 'PC', 'Nylon', 'Silk', 'Linen', 'Wool', 'Blend'
];

export const ALLOWED_FINISHES = [
  'Greige', 'RFD', 'PPF', 'Dyed', 'Printed', 'Bleached'
];

export const YARN_TYPES = [
  'Spun', 'Filament', 'Texturized', 'Cotton', 'Polyester', 'Silk', 'Linen', 'Viscose', 'Wool', 'Blend'
];

export const HANDFEEL_OPTIONS = [
  'Soft', 'Crisp', 'Rough', 'Silky', 'Dry', 'Smooth', 'Textured'
];

export const STRETCH_OPTIONS = [
  'None', 'Mechanical', '2-Way', '4-Way'
];

export const TRANSPARENCY_OPTIONS = [
  'Opaque', 'Semi-Sheer', 'Sheer'
];

export const COSTING_PATHS = [
  { id: 1, name: 'Grey Only', description: 'Grey Rate + Folding/Packing + Transport' },
  { id: 2, name: 'RFD Only', description: 'Grey + Scouring/Bleaching + Washing' },
  { id: 3, name: 'Digital Print on RFD', description: 'Grey + RFD + Coating + Digital Ink + Steam/Wash + Finishing' },
  { id: 4, name: 'Mill Process', description: 'Grey + Desizing + Scouring + Bleaching + Mercerizing' },
  { id: 5, name: 'Solid Dyed', description: 'Grey + Dyeing (Vat/Reactive) + Finishing' },
  { id: 6, name: 'Dyed/Print + Schiffli', description: 'Grey + Printing + Schiffli + Deca/Wash' },
  { id: 7, name: 'Schiffli + Dyed/Print', description: 'Grey + Schiffli (on Grey) + Dyeing/Printing' },
  { id: 8, name: 'Schiffli + Wash', description: 'Grey + Schiffli + Deca or Bio-wash' },
  { id: 9, name: 'Schiffli + RFD + Digital', description: 'Grey + Schiffli + RFD + Digital Print' }
];