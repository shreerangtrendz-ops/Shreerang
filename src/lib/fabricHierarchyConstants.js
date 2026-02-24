export const WIDTHS_GRIEGE = ['38"', '40"', '42"', '44"', '46"', '48"', '50"', '52"', '54"', '56"', '58"', '60"', '62"', '66"', '68"', '72"', '78"'];
export const WIDTHS_RFD_PPF = ['28"', '30"', '36"', '38"', '40"', '42"', '44"', '46"', '48"', '50"', '52"', '54"', '56"', '58"', '60"', '62"', '66"', '68"', '72"'];
export const WIDTHS = [...new Set([...WIDTHS_GRIEGE, ...WIDTHS_RFD_PPF])].sort((a, b) => parseInt(a) - parseInt(b));

export const BASE_HIERARCHY = {
  'Synthetic Base': ['Polyester', 'Nylon'],
  'Blend Base': ['PV', 'NV', 'PC', 'Rayon x Poly', 'Semi-Synthetic'],
  'Natural Base': ['Viscose', 'Rayon', 'Modal', 'Cotton', 'Linen', 'Silk', 'Wool', 'Hemp']
};

export const BASE_PROCESS_TYPES = ['Greige', 'RFD', 'PPF'];

export const PROCESSES_BY_BASE_PROCESS = {
  'Greige': ['Mill Print', 'Digital Print', 'Dyed', 'RFD'],
  'RFD': ['Mill Print', 'Digital Print', 'Dyed'],
  'PPF': ['Mill Print', 'Digital Print']
};

export const PROCESS_SUB_CATEGORIES = {
  'Mill Print': ['Procion', 'Discharge', 'Khadi', 'Pigment Table', 'Table', 'Block', 'ODP'],
  'Digital Print': ['Sublimation', 'Direct'],
  'Dyed': ['Procion', 'Discharge', 'Khadi', 'Pigment Table', 'Table', 'Block', 'ODP'], // Assuming same as Mill Print based on prompt
  'RFD': ['Procion', 'Discharge', 'Khadi', 'Pigment Table', 'Table', 'Block', 'ODP'] // Assuming same as Mill Print
};

export const VALUE_ADDITIONS = [
  'Hakoba', 'Embroidered', 'Handwork', 'Foil', 'Gold', 'Glitter', 'Crush', 'Pleated', 'Deca', 'Washing'
];

export const THREAD_OPTIONS_BY_VA = {
  'Hakoba': ['Semi Dull Poly', 'Full Dull Poly', 'Cotton'],
  'Embroidered': ['Poly', 'Nylon', 'Viscose', 'Cotton']
};

export const CONCEPT_OPTIONS_BY_VA = {
  'Hakoba': ['Eyelet', 'Borer', 'Sequins', 'Multi Thread', 'GPO'],
  'Embroidered': ['Multi Thread', 'Sequins', 'Cording', 'Chain Stitch', 'Applique', 'Beads', 'Laser Cutting', 'Cutwork', 'Flat Embroidery'],
  'Handwork': ['Khatli', 'Zardosi', 'Gota Patti', 'Mirror Real', 'Mirror Foil', 'Cutdana', 'Stone', 'Pearl', 'Mix Work'],
  'Washing': ['Silicon Wash BIO', 'Silicon Wash SIL', 'Enzyme Wash', 'Stone Wash', 'Acid Wash', 'Chemical Wash', 'Soft Wash', 'Garment Wash']
};

export const FABRIC_CLASSES = ['Regular', 'Premium', 'Export'];
export const FABRIC_TAGS = ['Foil', 'Without Foil'];
export const FINISH_TYPES = ['Bio Wash', 'Silicon Finish', 'Zero Finish'];

// Codes for SKU Generation
export const PROCESS_CODES = {
  'Greige': 'GR', 'RFD': 'RF', 'PPF': 'PF',
  'Mill Print': 'MP', 'Digital Print': 'DP', 'Dyed': 'DY'
};

export const PROCESS_SUB_CODES = {
  'Procion': 'PRC', 'Discharge': 'DIS', 'Sublimation': 'SUB', 'Direct': 'DIR',
  'Khadi': 'KHA', 'Pigment Table': 'PGT', 'Table': 'TBL', 'Block': 'BLK', 'ODP': 'ODP'
};

export const VA_CODES = {
  'Hakoba': 'SCH', 'Embroidered': 'EMB', 'Handwork': 'HW', 'Foil': 'FOIL', 
  'Gold': 'GLD', 'Glitter': 'GLT', 'Crush': 'CRH', 'Pleated': 'PLT', 
  'Deca': 'DEC', 'Washing': 'WSH'
};

export const VA_CONCEPT_CODES = {
  'Sequins': 'SQN', 'Multi Thread': 'MH', 'Eyelet': 'HK', 'Borer': 'HK', 'GPO': 'GPO',
  'Cording': 'CRD', 'Chain Stitch': 'CHN', 'Applique': 'APL', 'Beads': 'BDS', 'Laser Cutting': 'LC', 'Cutwork': 'CW', 'Flat Embroidery': 'FLT',
  'Khatli': 'KH', 'Zardosi': 'ZRD', 'Gota Patti': 'GTP', 'Mirror Real': 'MR', 'Mirror Foil': 'MRF', 'Cutdana': 'CTD', 'Stone': 'ST', 'Pearl': 'PRL', 'Mix Work': 'MIXW',
  'Silicon Wash BIO': 'BIO', 'Silicon Wash SIL': 'SIL', 'Enzyme Wash': 'ENZ', 'Stone Wash': 'STN', 'Acid Wash': 'ACD', 'Chemical Wash': 'CHM', 'Soft Wash': 'SFT', 'Garment Wash': 'GMW'
};

export const CLASS_CODES = { 'Regular': 'R', 'Premium': 'P', 'Export': 'E' };
export const TAG_CODES = { 'Foil': 'F', 'Without Foil': 'WF' };
export const FINISH_TYPE_CODES = { 'Bio Wash': 'BW', 'Silicon Finish': 'SF', 'Zero Finish': 'ZF' };