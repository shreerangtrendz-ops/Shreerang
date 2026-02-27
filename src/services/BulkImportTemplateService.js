import * as XLSX from 'xlsx';
import {
  BASE_FABRIC_COLUMNS,
  FINISH_FABRIC_COLUMNS,
  FANCY_FINISH_FABRIC_COLUMNS,
  EXAMPLE_BASE_FABRICS,
  EXAMPLE_FINISH_FABRICS,
  EXAMPLE_FANCY_FINISH_FABRICS,
  INSTRUCTIONS_TEXT,
} from '@/lib/excelTemplateConstants';

/**
 * BulkImportTemplateService
 * Generates Excel import templates for Base / Finish / Fancy Finish fabrics.
 *
 * Template structure per workbook:
 *   Sheet 1 — Instructions  (human readable guide)
 *   Sheet 2 — Template      (headers + 3 example rows)
 *   Sheet 3 — Reference     (valid dropdown values)
 */
export const BulkImportTemplateService = {

  // ── GENERATORS ─────────────────────────────────────────────────────────────
  generateBaseFabricTemplate() {
    const wb = XLSX.utils.book_new();
    this._addInstructionSheet(wb, INSTRUCTIONS_TEXT.base);
    this._addDataSheet(wb, BASE_FABRIC_COLUMNS, EXAMPLE_BASE_FABRICS, 'Base Fabrics');
    this._addReferenceSheet(wb, 'Reference', BASE_REFERENCE_DATA);
    return wb;
  },

  generateFinishFabricTemplate() {
    const wb = XLSX.utils.book_new();
    this._addInstructionSheet(wb, INSTRUCTIONS_TEXT.finish);
    this._addDataSheet(wb, FINISH_FABRIC_COLUMNS, EXAMPLE_FINISH_FABRICS, 'Finish Fabrics');
    this._addReferenceSheet(wb, 'Reference', FINISH_REFERENCE_DATA);
    return wb;
  },

  generateFancyFinishFabricTemplate() {
    const wb = XLSX.utils.book_new();
    this._addInstructionSheet(wb, INSTRUCTIONS_TEXT.fancy);
    this._addDataSheet(wb, FANCY_FINISH_FABRIC_COLUMNS, EXAMPLE_FANCY_FINISH_FABRICS, 'Fancy Finish Fabrics');
    this._addReferenceSheet(wb, 'Reference', FANCY_REFERENCE_DATA);
    return wb;
  },

  // ── DOWNLOAD ───────────────────────────────────────────────────────────────
  downloadTemplate(type) {
    const map = {
      base:   { gen: () => this.generateBaseFabricTemplate(),        file: 'Base_Fabric_Import_Template.xlsx' },
      finish: { gen: () => this.generateFinishFabricTemplate(),      file: 'Finish_Fabric_Import_Template.xlsx' },
      fancy:  { gen: () => this.generateFancyFinishFabricTemplate(), file: 'Fancy_Finish_Import_Template.xlsx' },
    };
    const entry = map[type];
    if (!entry) return;
    XLSX.writeFile(entry.gen(), entry.file);
  },

  // ── PRIVATE HELPERS ────────────────────────────────────────────────────────
  _addInstructionSheet(wb, text) {
    const rows = [['IMPORT INSTRUCTIONS'], [''], ...text.split('\n').map(line => [line])];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Instructions');
  },

  _addDataSheet(wb, columns, examples, sheetName) {
    // Header row
    const headerRow = columns.map(col => col);
    const dataRows  = examples.map(row => columns.map(col => row[col] ?? ''));
    const aoa = [headerRow, ...dataRows];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Style header row (bold + blue background via cell styles is limited in xlsx,
    // but we can widen columns)
    ws['!cols'] = columns.map(() => ({ wch: 22 }));

    // Freeze first row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  },

  _addReferenceSheet(wb, sheetName, refData) {
    const aoa = [['Field', 'Valid Values (use exactly as shown)']];
    for (const [field, values] of Object.entries(refData)) {
      aoa.push([field, values.join(' | ')]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 28 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  },
};

// ─── REFERENCE DATA FOR EACH TEMPLATE TYPE ────────────────────────────────────
const BASE_REFERENCE_DATA = {
  'Base': ['Cotton', 'Polyester', 'Rayon', 'Viscose', 'Modal', 'Linen', 'Silk', 'Wool', 'PV', 'PC', 'NV', 'Synthetic Base'],
  'Base Code': ['COTT', 'POLY', 'RAY', 'VISC', 'MOD', 'LIN', 'SLK', 'WOL', 'PV', 'PC', 'NV'],
  'Process': ['Greige', 'RFD'],
  'Finish Width': ['28"', '35"', '36"', '44"', '45"', '48"', '54"', '58"', '60"', '68"', '72"', '78"'],
  'Construction': ['Plain Weave', 'Twill', 'Satin', 'Dobby', 'Georgette', 'Crepe', 'Chiffon', 'Velvet', 'Knitted', 'Non Woven'],
  'Stretchability': ['Rigid', 'Mechanical', '2 Way', '4 Way'],
  'Transparency': ['Opaque', 'Semi Sheer', 'Sheer'],
  'Handfeel': ['Soft', 'Crisp', 'Silky', 'Rough'],
  'Yarn Type': ['Spun', 'Filament'],
};

const FINISH_REFERENCE_DATA = {
  'Process': ['Mill Print', 'Screen Print', 'Table Print', 'Block Print', 'ODP Print', 'Digital Print', 'Solid Dyed'],
  'Process Code': ['MP', 'SP', 'TP', 'BP', 'ODP', 'DP', 'SLD'],
  'Process Type': ['Procion', 'Discharge', 'Sublimation', 'Reactive', 'Pigment', 'Vat', 'Acid'],
  'Class': ['Regular (omitted from name)', 'Premium', 'Khadi'],
  'Tags': ['Without Foil (omitted from name)', 'Foil', 'Gold', 'Glitter'],
  'Intermediate Process': ['(leave blank if none)', 'RFD'],
  'Finish': ['Bio Wash', 'Silicon Finish', 'Stone Wash', 'Heat Set', 'Soft Finish', 'Anti-Crease'],
};

const FANCY_REFERENCE_DATA = {
  'Value Addition': ['Hakoba', 'Embroidered', 'Handwork', 'Foil/Gold/Glitter', 'Crush/Pleated', 'Deca/Washing'],
  'VA Code': ['HK', 'EMB', 'HW', 'FOIL/GLD/GLT', 'CRH/PLT', 'DEC/WSH'],
  'Thread (Hakoba/Emb only)': ['Semi Dull Poly', 'Full Dull Poly', 'Cotton (+5)', 'GPO'],
  'Concept (Hakoba)': ['Eyelet/Borer', 'Sequins (Sitara)', 'Multi-Thread', 'Cording', 'Cutwork', 'Desi Patti', 'Stonework', 'Beads', 'Lace Cutting'],
  'Concept Code': ['EYL', 'SQN', 'MTH', 'CRD', 'CUT', 'DP', 'STW', 'BDS', 'LC'],
};
