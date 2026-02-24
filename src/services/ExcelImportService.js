import * as XLSX from 'xlsx';
import { SKUGenerator } from './SKUGenerator';
import { AIShortCodeGenerator } from './AIShortCodeGenerator';

const ALLOWED_WIDTHS = ["28", "30", "36", "40", "44", "48", "50", "54", "56", "58", "62", "66", "72", "78"];
const ALLOWED_BASES = ["Cotton", "Polyester", "Viscose", "Rayon", "PV", "PC", "Silk", "Linen", "Nylon", "Wool", "Blended"]; // Extensible
const ALLOWED_FINISHES = ["Greige", "RFD", "PPF", "Dyed", "Printed", "Bleached"]; // Extensible

export const ExcelImportService = {
  /**
   * Parse file and return structured data with validation
   */
  async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Assume first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          const processedData = await this.validateAndProcess(rawData);
          resolve(processedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  async validateAndProcess(rows) {
    const results = [];
    const skuListToCheck = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const errors = [];
      const warnings = [];
      let status = 'valid';

      // 1. Map Columns (Flexible matching)
      const mapped = {
        name: row['Fabric Name'] || row['Name'] || '',
        width: String(row['Width'] || '').replace(/"/g, '').trim(),
        base: row['Base'] || row['Base Fabric'] || '',
        finish: row['Finish'] || row['Finish Type'] || '',
        weight: row['Weight (kg)'] || row['Weight'] || 0,
        gsm: row['GSM'] || 0,
        construction: row['Construction'] || '',
        hsnCode: row['HSN Code'] || '',
        sku: row['SKU'] || '', // Optional in input, can be generated
        shortCode: row['Short Code'] || '', // Optional
      };

      // 2. Required Field Validation
      if (!mapped.name) errors.push('Fabric Name is required');
      if (!mapped.width) errors.push('Width is required');
      if (!mapped.base) errors.push('Base is required');
      if (!mapped.finish) errors.push('Finish is required');

      // 3. Value Validation
      if (mapped.width && !ALLOWED_WIDTHS.includes(mapped.width)) {
        errors.push(`Invalid width: ${mapped.width}. Allowed: ${ALLOWED_WIDTHS.join(', ')}`);
      }
      
      // Fuzzy matching for Base (case insensitive check)
      const matchedBase = ALLOWED_BASES.find(b => b.toLowerCase() === mapped.base.toLowerCase());
      if (!matchedBase && mapped.base) {
        warnings.push(`Unknown Base: ${mapped.base}. Will be imported as custom.`);
      } else if (matchedBase) {
        mapped.base = matchedBase;
      }

      const matchedFinish = ALLOWED_FINISHES.find(f => f.toLowerCase() === mapped.finish.toLowerCase());
      if (!matchedFinish && mapped.finish) {
         warnings.push(`Unknown Finish: ${mapped.finish}. Will be imported as custom.`);
      } else if (matchedFinish) {
        mapped.finish = matchedFinish;
      }

      // 4. Auto-generation logic
      if (!mapped.shortCode && mapped.name && mapped.base) {
        mapped.shortCode = await AIShortCodeGenerator.generateShortCode(mapped.name, mapped.base);
        warnings.push('Short Code auto-generated');
      }

      if (!mapped.sku && mapped.width && mapped.shortCode && mapped.finish) {
        mapped.sku = SKUGenerator.generateSKU(mapped.width, mapped.shortCode, mapped.finish);
        warnings.push('SKU auto-generated');
      }

      // Add to list for bulk duplicate check
      if (mapped.sku) skuListToCheck.push(mapped.sku);

      if (errors.length > 0) status = 'invalid';
      else if (warnings.length > 0) status = 'warning';

      results.push({
        id: i, // temp id
        rowNum,
        data: mapped,
        errors,
        warnings,
        status,
        selected: true // default selected for import
      });
    }

    // 5. Check Duplicates (Internal & External)
    // Internal
    const skuCounts = {};
    skuListToCheck.forEach(sku => { skuCounts[sku] = (skuCounts[sku] || 0) + 1; });
    
    // External (DB)
    const existingSKUs = await SKUGenerator.checkBulkDuplicates([...new Set(skuListToCheck)]);

    results.forEach(row => {
      const sku = row.data.sku;
      if (sku) {
        if (skuCounts[sku] > 1) {
          row.errors.push(`Duplicate SKU in file: ${sku}`);
          row.status = 'invalid';
        }
        if (existingSKUs.includes(sku)) {
          row.errors.push(`SKU already exists in database: ${sku}`);
          row.status = 'invalid'; // Can change to warning if we implement 'skip' or 'update'
        }
      }
    });

    return {
      rows: results,
      summary: {
        total: results.length,
        valid: results.filter(r => r.status !== 'invalid').length,
        invalid: results.filter(r => r.status === 'invalid').length
      }
    };
  },

  /**
   * Generate Template Workbook
   */
  generateTemplate() {
    const headers = [
      "Fabric Name", "Width", "Base", "Finish", "Weight (kg)", "GSM", 
      "GSM Tolerance", "Construction", "Yarn Type", "Yarn Count", 
      "Handfeel", "Stretch", "Transparency", "HSN Code", "Cost Code"
    ];
    
    const sampleData = [
      {
        "Fabric Name": "Cotton Poplin",
        "Width": "58",
        "Base": "Cotton",
        "Finish": "Greige",
        "Weight (kg)": 0.2,
        "GSM": 120,
        "Construction": "Plain Weave",
        "HSN Code": "5208"
      },
      {
        "Fabric Name": "Poly Satin",
        "Width": "44",
        "Base": "Polyester",
        "Finish": "RFD",
        "Weight (kg)": 0.15,
        "GSM": 90,
        "Construction": "Satin Weave",
        "HSN Code": "5407"
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    
    // Add validation help sheet
    const helpData = [
      { Field: "Width", Allowed: ALLOWED_WIDTHS.join(", ") },
      { Field: "Base", Allowed: ALLOWED_BASES.join(", ") },
      { Field: "Finish", Allowed: ALLOWED_FINISHES.join(", ") }
    ];
    const wsHelp = XLSX.utils.json_to_sheet(helpData);

    XLSX.utils.book_append_sheet(wb, ws, "Fabric Data");
    XLSX.utils.book_append_sheet(wb, wsHelp, "Instructions");
    
    return wb;
  }
};