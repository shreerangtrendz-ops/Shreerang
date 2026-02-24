import * as XLSX from 'xlsx';

export const ExportService = {
  /**
   * Generates and downloads an Excel file from JSON data
   */
  exportToExcel(data, fileName) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  },

  /**
   * Generates template for Base Fabric import
   */
  generateBaseFabricTemplate() {
    const headers = [
      {
        'Fabric Name': 'Polyester Taffeta',
        'Base': 'Polyester',
        'Width': '58"',
        'GSM': 110,
        'GSM Tolerance': '+/- 5%',
        'Weight': 0.150,
        'Construction': 'Plain Weave',
        'Stretchability': 'Mechanical',
        'Transparency': 'Opaque',
        'Handfeel': 'Crisp',
        'Finish': 'Greige',
        'HSN Code': '5407',
        'Yarn Type': 'Filament',
        'Yarn Count': '75D'
      },
      {
        'Fabric Name': 'Cotton Voile',
        'Base': 'Cotton',
        'Width': '44"',
        'GSM': 80,
        'GSM Tolerance': '+/- 3%',
        'Weight': 0.110,
        'Construction': 'Plain Weave',
        'Stretchability': 'Rigid',
        'Transparency': 'Semi Sheer',
        'Handfeel': 'Soft',
        'Finish': 'Greige',
        'HSN Code': '5208',
        'Yarn Type': 'Spun',
        'Yarn Count': '60s'
      }
    ];
    this.exportToExcel(headers, 'Base_Fabric_Import_Template');
  },

  /**
   * Generates template for Finish Fabric import
   */
  generateFinishFabricTemplate() {
    const headers = [
      {
        'Base Fabric Name': 'Polyester Taffeta',
        'Process Type': 'Dyeing',
        'Suffix Name': 'Navy Blue',
        'Material Used': 'Disperse Dye',
        'Class': 'Regular',
        'Tags': 'Solid',
        'Shortage %': 2,
        'HSN Code': '5407'
      },
      {
        'Base Fabric Name': 'Cotton Voile',
        'Process Type': 'Printing',
        'Suffix Name': 'Floral Print',
        'Material Used': 'Pigment',
        'Class': 'Premium',
        'Tags': 'Summer',
        'Shortage %': 3,
        'HSN Code': '5208'
      }
    ];
    this.exportToExcel(headers, 'Finish_Fabric_Import_Template');
  },

  /**
   * Generates template for Fancy Finish Fabric import
   */
  generateFancyFinishTemplate() {
    const headers = [
      {
        'Finish Fabric Name': 'Polyester Taffeta Navy Blue',
        'Value Addition Type': 'Embroidery',
        'Fancy Suffix': 'Sequin Border',
        'Thread Type': 'Polyester',
        'Concept': 'Sequins',
        'Description': '5mm Sequin border work',
        'HSN Code': '5810'
      },
      {
        'Finish Fabric Name': 'Cotton Voile Floral Print',
        'Value Addition Type': 'Hakoba',
        'Fancy Suffix': 'Eyelet Design',
        'Thread Type': 'Cotton',
        'Concept': 'Eyelet',
        'Description': 'All over eyelet work',
        'HSN Code': '5810'
      }
    ];
    this.exportToExcel(headers, 'Fancy_Fabric_Import_Template');
  }
};