/**
 * Service to provide AI-powered suggestions for fabric fields.
 * Simulates intelligent responses based on input context.
 */

export const DropdownAISuggestionService = {
  /**
   * Suggests an HSN Code based on fabric details.
   */
  getSuggestionForHSNCode: async (fabricName, base, construction, weight) => {
    await simulateNetworkDelay();
    
    // Logic to mock realistic HSN codes
    if (base?.toLowerCase().includes('cotton')) return { value: '520811', confidence: 0.9 };
    if (base?.toLowerCase().includes('silk')) return { value: '500720', confidence: 0.85 };
    if (base?.toLowerCase().includes('wool')) return { value: '511211', confidence: 0.88 };
    if (base?.toLowerCase().includes('polyester') || base?.toLowerCase().includes('synthetic')) return { value: '540752', confidence: 0.92 };
    
    return { value: '520890', confidence: 0.7 }; // Default
  },

  /**
   * Suggests Construction based on base material and weight.
   */
  getSuggestionForConstruction: async (base, weight) => {
    await simulateNetworkDelay();

    if (weight > 200) return { value: 'Canvas', confidence: 0.8 };
    if (base?.toLowerCase().includes('silk')) return { value: 'Satin', confidence: 0.85 };
    if (base?.toLowerCase().includes('cotton')) return { value: 'Plain Weave', confidence: 0.9 };
    
    return { value: 'Twill', confidence: 0.6 };
  },

  /**
   * Suggests Process based on fabric name or base.
   */
  getSuggestionForProcess: async (fabricName, base) => {
    await simulateNetworkDelay();

    const nameLower = fabricName?.toLowerCase() || '';
    if (nameLower.includes('white') || nameLower.includes('bleach')) return { value: 'Bleached', confidence: 0.95 };
    if (nameLower.includes('raw') || nameLower.includes('grey')) return { value: 'Greige', confidence: 0.95 };
    if (nameLower.includes('print')) return { value: 'Printed', confidence: 0.9 };
    
    return { value: 'RFD', confidence: 0.75 };
  },

  /**
   * Suggests Base Material based on fabric name.
   */
  getSuggestionForBase: async (fabricName) => {
    await simulateNetworkDelay();
    
    const nameLower = fabricName?.toLowerCase() || '';
    if (nameLower.includes('cot')) return { value: 'Cotton', confidence: 0.98 };
    if (nameLower.includes('poly')) return { value: 'Polyester', confidence: 0.98 };
    if (nameLower.includes('silk')) return { value: 'Silk', confidence: 0.98 };
    if (nameLower.includes('lin')) return { value: 'Linen', confidence: 0.98 };
    if (nameLower.includes('ray')) return { value: 'Rayon', confidence: 0.98 };
    
    return { value: 'Blend Base', confidence: 0.6 };
  },

  /**
   * Suggests Finish Type based on process.
   */
  getSuggestionForFinishType: async (processType) => {
    await simulateNetworkDelay();

    if (processType === 'Printed') return { value: 'Soft Finish', confidence: 0.8 };
    if (processType === 'Greige') return { value: 'Unfinished', confidence: 0.95 };
    
    return { value: 'Regular', confidence: 0.5 };
  },

  /**
   * Generic suggestion for new dropdown values (for the "Add New" modal).
   */
  generateNewValueSuggestions: async (category) => {
    await simulateNetworkDelay();
    
    switch(category) {
      case 'process': return ['Bio-Wash', 'Mercerized', 'Peach Finish', 'Teflon Coated'];
      case 'base': return ['Bamboo', 'Hemp', 'Tencel', 'Recycled Polyester'];
      case 'construction': return ['Herringbone', 'Oxford', 'Poplin', 'Velvet'];
      case 'handfeel': return ['Buttery', 'Crisp', 'Grainy', 'Dry'];
      case 'yarn_type': return ['Ring Spun', 'Open End', 'Compact', 'Vortex'];
      default: return ['Option 1', 'Option 2', 'Option 3'];
    }
  }
};

const simulateNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 800));