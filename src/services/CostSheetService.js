import { supabase } from '@/lib/customSupabaseClient';
import { PROCESS_STAGES } from '@/lib/costing_constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const CostSheetService = {
  
  /**
   * Calculates cost following strict execution order
   */
  async calculateCostBreakdown(designNumber, pathId, stageData) {
    const BASE_QTY = 1000;
    let currentQty = BASE_QTY;
    let totalCost = 0;
    
    const stages = stageData.map((stageInput, index) => {
        const rate = parseFloat(stageInput.rate) || 0;
        const shrink = parseFloat(stageInput.shortage) || 0;
        const inputQty = parseFloat(stageInput.inputQty) || currentQty; // Use input or carry over
        
        // Ensure input qty logic is consistent - usually flows from previous output
        // If user overrides input qty, we use that, otherwise use previous output
        const effectiveInputQty = index === 0 ? BASE_QTY : (stageInput.inputQty ? parseFloat(stageInput.inputQty) : currentQty);
        
        const stageCost = effectiveInputQty * rate;
        const outputQty = effectiveInputQty * (1 - (shrink / 100));
        
        totalCost += stageCost;
        currentQty = outputQty;
        
        // Resolve name
        const stageName = this.getStageName(stageInput.stageCode);

        return {
            name: stageName,
            code: stageInput.stageCode,
            inputQty: Number(effectiveInputQty.toFixed(2)),
            rate: rate,
            shrink: shrink,
            cost: Number(stageCost.toFixed(2)),
            outputQty: Number(outputQty.toFixed(2))
        };
    });

    const finalYield = Number(currentQty.toFixed(2));
    const costPerMeter = finalYield > 0 ? Number((totalCost / finalYield).toFixed(2)) : 0;
    
    return {
        stages,
        totalCost: Number(totalCost.toFixed(2)),
        costPerMeter,
        finalYield
    };
  },

  getStageName(code) {
    if (typeof code === 'number' || !isNaN(Number(code))) {
        return PROCESS_STAGES[String(code)]?.name || `Stage ${code}`;
    }
    const foundStage = Object.values(PROCESS_STAGES).find(s => s.codes.includes(code));
    return foundStage ? foundStage.name : code;
  },

  async saveCostSheet(sheetData) {
    try {
        const { data, error } = await supabase.from('cost_sheets').insert([sheetData]).select().single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error saving cost sheet:", error);
        throw error;
    }
  },
  
  async getCostSheets(filters = {}) {
    try {
        let query = supabase.from('cost_sheets').select('*').order('created_at', { ascending: false });
        
        if (filters.search) {
            query = query.ilike('design_number', `%${filters.search}%`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error listing cost sheets:", error);
        throw error;
    }
  },

  async getCostSheetById(id) {
    try {
        const { data, error } = await supabase.from('cost_sheets').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    } catch (error) {
        throw error;
    }
  },

  async deleteCostSheet(id) {
     try {
        const { error } = await supabase.from('cost_sheets').delete().eq('id', id);
        if (error) throw error;
        return true;
     } catch (error) {
        throw error;
     }
  },

  async generatePDF(elementId, fileName = 'cost-sheet.pdf') {
    const input = document.getElementById(elementId);
    if (!input) {
        console.error("Element not found for PDF generation");
        return;
    }
    
    try {
        // Temporarily make visible if hidden for print
        const wasHidden = input.classList.contains('hidden');
        if (wasHidden) input.classList.remove('hidden');

        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        // A4 dimensions
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;

        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // Full A4 stretch or calculate ratio
        pdf.save(fileName);

        if (wasHidden) input.classList.add('hidden');
        return true;
    } catch (error) {
        console.error("PDF Gen Error:", error);
        return false;
    }
  }
};