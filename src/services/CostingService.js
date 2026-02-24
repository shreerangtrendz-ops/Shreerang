import { CostingEngine } from '@/logic/CostingEngine';
import { supabase } from '@/lib/customSupabaseClient';

export const CostingService = {
  /**
   * Calculates cost based on selected path and parameters
   */
  calculateCost(path, parameters) {
    try {
      if (!path) throw new Error("Calculation path is required");
      return CostingEngine.calculate(path, parameters);
    } catch (error) {
      console.error("Cost Calculation Error:", error);
      throw new Error(error.message || "Failed to calculate cost");
    }
  },

  /**
   * Formats raw results for display or export
   */
  formatResults(result) {
    if (!result || !result.summary) return null;

    return {
      ...result,
      formattedTotal: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(result.summary.totalCost),
      formattedRate: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(result.summary.costPerMeter),
      breakdown: result.breakdown.map(step => ({
        ...step,
        formattedAmount: step.amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(step.amount) : '-'
      }))
    };
  },

  /**
   * Validates parameters before calculation
   */
  validateParameters(params) {
    const errors = [];
    if (!params.grey_rate || params.grey_rate <= 0) errors.push("Grey Rate is required");
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Returns a human-readable description for a path key
   */
  getPathDescription(path) {
    const descriptions = {
      TRADING: 'Direct Trading (Buy & Sell)',
      GREY_ONLY: 'Grey Fabric Sales with Margin',
      RFD_ONLY: 'Grey to Ready-For-Dyeing conversion',
      GREY_RFD_DIGITAL: 'Grey -> RFD -> Digital Printing',
      GREY_MILL: 'Grey -> Mill Processing (Dyeing/Printing)',
      GREY_DYED: 'Grey -> Standard Dyeing',
      GREY_MILL_SCHIFFLI_DECA: 'Grey -> Mill -> Embroidery -> Finishing',
      GREY_SCHIFFLI_DYED: 'Grey -> Embroidery -> Dyeing',
      GREY_SCHIFFLI_DECA_WASH: 'Grey -> Embroidery -> Washing',
      GREY_SCHIFFLI_RFD_DIGITAL: 'Grey -> Embroidery -> RFD -> Digital'
    };
    return descriptions[path] || path;
  },

  async saveCalculationTemplate(templateName, templateData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('costing_sheets')
        .insert([{
          type: 'WIDGET_TEMPLATE',
          costing_data: { 
            name: templateName,
            ...templateData 
          }
        }])
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Save Template Error:", error);
      throw error;
    }
  },

  async loadCalculationTemplate(templateId) {
    const { data, error } = await supabase
      .from('costing_sheets')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async listCalculationTemplates() {
    const { data, error } = await supabase
      .from('costing_sheets')
      .select('*')
      .eq('type', 'WIDGET_TEMPLATE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("List Templates Error:", error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      parameter_name: item.costing_data?.name || 'Untitled Template',
      parameter_value: item.costing_data,
      created_at: item.created_at
    }));
  },

  async deleteCalculationTemplate(templateId) {
    const { error } = await supabase
      .from('costing_sheets')
      .delete()
      .eq('id', templateId);
    
    if (error) throw error;
    return true;
  },

  async getHistoricalRates(processName) {
    return [];
  },

  exportCalculationAsCSV(calculationData) {
    if (!calculationData) return '';
    const headers = Object.keys(calculationData).join(',');
    const values = Object.values(calculationData).join(',');
    return `${headers}\n${values}`;
  },

  importRatesFromCSV(csvFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = reject;
      reader.readAsText(csvFile);
    });
  },

  // --- New Methods ---

  calculateFoldLessPct(inputQty, shrinkagePct) {
    const shrink = Number(shrinkagePct) || 0;
    const qty = Number(inputQty) || 100;
    if (qty <= 0) return 0;
    
    // Simple shrinkage calculation logic
    // If you shrink 10%, you lose 10%
    return Number(shrink.toFixed(2));
  },

  generateWhatsAppMessage(result, inputs) {
    if (!result || !inputs) return "";

    const date = new Date().toLocaleDateString();
    
    return `*Shreerang Costing Report* 🧵
📅 Date: ${date}

*Inputs:*
• Grey Rate: ₹${inputs.greyRate || 0}
• Dyeing: ₹${inputs.dyeingRate || 0} (Shrink: ${inputs.dyeingShrink || 0}%)
• Schiffli: ₹${inputs.schiffliRate || 0}
• Finishing: ₹${inputs.finishRate || 0} (Shrink: ${inputs.finishShrink || 0}%)

*Results (1000m Batch):*
📉 Final Yield: ${result.finalQty} mtr (${result.yieldPercentage}%)
💰 *Net Cost: ₹${result.totalCost} / meter*

_Generated by Shreerang Costing_`;
  },

  formatCostingDataForSharing(data) {
    if (!data) return null;
    return {
      title: "Costing Calculation",
      text: JSON.stringify(data, null, 2)
    };
  }
};