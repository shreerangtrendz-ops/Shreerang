export const VALUE_ADDITION_TYPES = [
  'Hakoba',
  'Embroidered',
  'Handwork',
  'Foil',
  'Gold',
  'Glitter',
  'Crush',
  'Pleated',
  'Deca',
  'Washing'
];

export const VALUE_ADDITION_CODES = {
  'Hakoba': 'SCH',
  'Embroidered': 'EMB',
  'Handwork': 'HW',
  'Foil': 'FOIL',
  'Gold': 'GLD',
  'Glitter': 'GLT',
  'Crush': 'CRH',
  'Pleated': 'PLT',
  'Deca': 'DEC',
  'Washing': 'WSH'
};

export const THREAD_OPTIONS = {
  'Hakoba': [
    'Semi Dull Poly',
    'Full Dull Poly',
    'Cotton'
  ],
  'Embroidered': [
    'Poly',
    'Nylon',
    'Viscose',
    'Cotton'
  ]
};

export const CONCEPT_OPTIONS = {
  'Hakoba': [
    'Eyelet/Borer',
    'Sequins (Sitara)',
    'Multi Thread',
    'GPO'
  ],
  'Embroidered': [
    'Multi Thread',
    'Sequins (Sitara)',
    'Cording',
    'Chain Stitch',
    'Applique',
    'Beads',
    'Laser Cutting',
    'Cutwork (Scalloped Edge)',
    'Flat Embroidery'
  ],
  'Handwork': [
    'Khatli (Aari)',
    'Zardosi',
    'Gota Patti',
    'Mirror (Real)',
    'Mirror (Foil)',
    'Cutdana',
    'Stone / Hotfix',
    'Pearl / Moti',
    'Mix Work'
  ],
  'Washing': [
    'Silicon Wash',
    'Enzyme Wash',
    'Stone Wash',
    'Acid Wash',
    'Chemical Wash',
    'Soft Wash / Softener',
    'Garment Wash (Normal)'
  ]
};

export const CONCEPT_CODES = {
  'Eyelet/Borer': 'HK',
  'Sequins (Sitara)': 'SQN',
  'Multi Thread': 'MH',
  'GPO': 'GPO',
  'Cording': 'CRD',
  'Chain Stitch': 'CHN',
  'Applique': 'APL',
  'Beads': 'BDS',
  'Laser Cutting': 'LC',
  'Cutwork (Scalloped Edge)': 'CW',
  'Flat Embroidery': 'FLT',
  'Khatli (Aari)': 'KH',
  'Zardosi': 'ZRD',
  'Gota Patti': 'GTP',
  'Mirror (Real)': 'MR',
  'Mirror (Foil)': 'MRF',
  'Cutdana': 'CTD',
  'Stone / Hotfix': 'ST',
  'Pearl / Moti': 'PRL',
  'Mix Work': 'MIXW',
  'Silicon Wash': 'SIL', // Note: Duplicate key in table (Silicon Wash -> BIO/SIL). Assuming context or user choice. Using SIL for unique map or manual override needed for BIO.
  'Enzyme Wash': 'ENZ',
  'Stone Wash': 'STN',
  'Acid Wash': 'ACD',
  'Chemical Wash': 'CHM',
  'Soft Wash / Softener': 'SFT',
  'Garment Wash (Normal)': 'GMW'
};

// Handle special case for 'Silicon Wash' if needed, or just map one default.
// The provided table has 'Silicon Wash' -> 'BIO' and 'Silicon Wash' -> 'SIL'. 
// Let's manually handle washing codes if they overlap with names.
export const WASHING_CODES = {
  'Silicon Wash (Bio)': 'BIO',
  'Silicon Wash': 'SIL',
  'Enzyme Wash': 'ENZ',
  'Stone Wash': 'STN',
  'Acid Wash': 'ACD',
  'Chemical Wash': 'CHM',
  'Soft Wash / Softener': 'SFT',
  'Garment Wash (Normal)': 'GMW'
};