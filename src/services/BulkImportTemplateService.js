import * as XLSX from 'xlsx';
import { 
  BASE_FABRIC_COLUMNS, FINISH_FABRIC_COLUMNS, FANCY_FINISH_FABRIC_COLUMNS,
  EXAMPLE_BASE_FABRICS, EXAMPLE_FINISH_FABRICS, EXAMPLE_FANCY_FINISH_FABRICS,
  INSTRUCTIONS_TEXT 
} from '@/lib/excelTemplateConstants';

export const BulkImportTemplateService = {
  generateBaseFabricTemplate() {
    return this._createWorkbook(BASE_FABRIC_COLUMNS, EXAMPLE_BASE_FABRICS, INSTRUCTIONS_TEXT.base, 'Base Fabrics');
  },

  generateFinishFabricTemplate() {
    return this._createWorkbook(FINISH_FABRIC_COLUMNS, EXAMPLE_FINISH_FABRICS, INSTRUCTIONS_TEXT.finish, 'Finish Fabrics');
  },

  generateFancyFinishFabricTemplate() {
    return this._createWorkbook(FANCY_FINISH_FABRIC_COLUMNS, EXAMPLE_FANCY_FINISH_FABRICS, INSTRUCTIONS_TEXT.fancy, 'Fancy Finish Fabrics');
  },

  _createWorkbook(columns, examples, instructions, sheetName) {
    const wb = XLSX.utils.book_new();

    // Instructions Sheet
    const instructionsData = instructions.split('\n').map(line => [line]);
    const wsInstructions = XLSX.utils.aoa_to_sheet([['Instructions'], ...instructionsData]);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Data Sheet
    const wsData = XLSX.utils.json_to_sheet(examples, { header: columns });
    XLSX.utils.book_append_sheet(wb, wsData, sheetName);

    return wb;
  },

  downloadTemplate(type) {
    let wb;
    let filename;

    switch (type) {
      case 'base':
        wb = this.generateBaseFabricTemplate();
        filename = 'Base_Fabric_Import_Template.xlsx';
        break;
      case 'finish':
        wb = this.generateFinishFabricTemplate();
        filename = 'Finish_Fabric_Import_Template.xlsx';
        break;
      case 'fancy':
        wb = this.generateFancyFinishFabricTemplate();
        filename = 'Fancy_Finish_Fabric_Import_Template.xlsx';
        break;
      default:
        return;
    }

    XLSX.writeFile(wb, filename);
  }
};