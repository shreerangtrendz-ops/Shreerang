export const BASES = [
  'Polyester', 'Nylon', 'Blend Base', 'PV', 'NV', 'PC', 'Rayon x Poly', // Synthetic
  'Viscose', 'Rayon', 'Modal', // Semi-Synthetic
  'Cotton', 'Linen', 'Silk', 'Wool', 'Hemp' // Natural
];

export const FINISHES = [
  'Greige', 'RFD', 'PPF', 'Dyed', 'Printed', 'Bleached', 'Mercerized', 'Coated', 'Bio-Wash', 'Silicon Wash'
];

export const WIDTHS = [
  '28"', '30"', '36"', '38"', '40"', '42"', '44"', '46"', '48"', '50"', '52"', '54"', '56"', '58"', '60"', '62"', '66"', '68"', '72"', '78"', '96"', '108"'
];

export const CONSTRUCTIONS = [
  'Plain Weave', 'Twill', 'Drill', 'Satin', 'Dobby', 'Jacquard', 'Canvas', 'Voile', 'Georgette', 'Crepe', 'Organza', 'Chiffon', 'Velvet', // Woven
  'Knitted', 'Single Jersey', 'Interlock', 'Rib', 'Pique', 'French Terry', 'Fleece', // Knitted
  'Non Woven'
];

export const STRETCHABILITIES = [
  'Rigid', 'Mechanical', '2 Way', '4 Way', 'Lycra', 'Spandex', 'Power Stretch'
];

export const TRANSPARENCIES = [
  'Opaque', 'Semi Sheer', 'Sheer', 'Blackout', 'Translucent', 'Transparent'
];

export const HANDFEELS = [
  'Soft', 'Crisp', 'Rough', 'Silky', 'Dry', 'Smooth', 'Textured', 'Stiff', 'Flowy', 'Paper-touch', 'Cool'
];

export const YARN_TYPES = [
  'Spun', 'Filament', 'Texturized', 'Combed', 'Carded', 'Rotary', 'Open End', 'Ring Spun'
];

export const YARN_COUNT_UNITS = [
  's', 'D', 'Lea', 'Nm', 'Tex'
];

export const GSM_TOLERANCES = [
  '+/- 3%', '+/- 5%', '+/- 10%'
];

// Mappings for Code Generation
export const BASE_CODES = {
  'Polyester': 'POLY', 'Nylon': 'NYL', 'Blend Base': 'BLND', 
  'PV': 'PV', 'NV': 'NV', 'PC': 'PC', 'Rayon x Poly': 'RP',
  'Viscose': 'VISC', 'Rayon': 'RAY', 'Modal': 'MOD',
  'Cotton': 'COTT', 'Linen': 'LIN', 'Silk': 'SLK', 'Wool': 'WOL', 'Hemp': 'HEM'
};

export const CONSTRUCTION_CODES = {
  'Plain Weave': 'PL', 'Twill': 'TW', 'Drill': 'TW', 'Satin': 'SAT', 
  'Dobby': 'DOB', 'Jacquard': 'JAC', 'Canvas': 'CAN', 'Voile': 'VOI', 
  'Georgette': 'GEO', 'Crepe': 'CRP', 'Organza': 'ORG', 'Chiffon': 'CHF', 
  'Velvet': 'VEL', 'Knitted': 'KNT', 'Single Jersey': 'SJ', 
  'Interlock': 'INT', 'Rib': 'RIB', 'Pique': 'PIQ', 'French Terry': 'FT', 
  'Fleece': 'FLC', 'Non Woven': 'NW'
};

// Helper Functions
export const generateSKU = (width, shortCode, finish) => {
  if (!width || !shortCode || !finish) return '';
  const cleanWidth = width.replace(/[^0-9]/g, '');
  return `${cleanWidth}${shortCode}-${finish}`;
};

export const generateBaseFabricName = (width, fabricName, finish) => {
  if (!width || !fabricName || !finish) return '';
  const cleanWidth = width.replace(/[^0-9]/g, '');
  return `${cleanWidth} ${fabricName} ${finish}`;
};

export const generateShortCode = (base, construction) => {
  const bCode = BASE_CODES[base] || base?.substring(0, 3).toUpperCase() || 'XXX';
  const cCode = CONSTRUCTION_CODES[construction] || construction?.substring(0, 2).toUpperCase() || 'XX';
  return `${bCode}${cCode}`;
};