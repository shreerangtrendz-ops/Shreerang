// Mock AI Service - In real app, connect to OpenAI
// Simulating AI responses for dropdown suggestions based on context

const MOCK_DELAY = 800; // Simulate network delay for AI API

export const AIDropdownSuggestionService = {
  // Suggests ink types based on fabric type
  async suggestInkTypes(fabricTypeName) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    
    const lowerFabric = (fabricTypeName || '').toLowerCase();
    let suggestions = [];

    if (lowerFabric.includes('cotton') || lowerFabric.includes('linen')) {
       suggestions = ['Reactive Dye', 'Pigment Dye', 'Discharge Print', 'Direct Dye', 'Vat Dye'];
    } else if (lowerFabric.includes('polyester')) {
       suggestions = ['Disperse Dye', 'Sublimation Printing', 'Pigment Print'];
    } else if (lowerFabric.includes('silk') || lowerFabric.includes('wool')) {
       suggestions = ['Acid Dye', 'Reactive Dye', 'Direct Dye', 'Digital Print'];
    } else if (lowerFabric.includes('rayon') || lowerFabric.includes('viscose')) {
       suggestions = ['Reactive Dye', 'Direct Dye', 'Pigment Dye'];
    } else {
       suggestions = ['Pigment Dye', 'Reactive Dye', 'Disperse Dye', 'Acid Dye', 'Digital Print'];
    }
    
    return suggestions.map(s => ({ value: s, label: s, confidence: 0.9 }));
  },

  // Suggests care instructions based on composition
  async suggestCareInstructions(composition) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const lowerComp = (composition || '').toLowerCase();
    
    if (lowerComp.includes('silk') || lowerComp.includes('wool')) {
      return [
        { value: 'Dry Clean Only', label: 'Dry Clean Only', confidence: 0.95 },
        { value: 'Hand Wash Cold', label: 'Hand Wash Cold', confidence: 0.8 },
        { value: 'Do Not Tumble Dry', label: 'Do Not Tumble Dry', confidence: 0.85 }
      ];
    } else if (lowerComp.includes('cotton')) {
       return [
        { value: 'Machine Wash Warm', label: 'Machine Wash Warm', confidence: 0.9 },
        { value: 'Tumble Dry Medium', label: 'Tumble Dry Medium', confidence: 0.85 },
        { value: 'Iron High Heat', label: 'Iron High Heat', confidence: 0.8 },
        { value: 'Do Not Bleach', label: 'Do Not Bleach', confidence: 0.9 }
      ];
    } else if (lowerComp.includes('polyester') || lowerComp.includes('nylon')) {
      return [
        { value: 'Machine Wash Cold', label: 'Machine Wash Cold', confidence: 0.9 },
        { value: 'Tumble Dry Low', label: 'Tumble Dry Low', confidence: 0.85 },
        { value: 'Do Not Iron', label: 'Do Not Iron', confidence: 0.7 }
      ];
    }
    
    return [
      { value: 'Machine Wash Cold', label: 'Machine Wash Cold', confidence: 0.7 },
      { value: 'Do Not Bleach', label: 'Do Not Bleach', confidence: 0.9 },
      { value: 'Line Dry', label: 'Line Dry', confidence: 0.6 }
    ];
  },

  // Suggests business types (less context-dependent for now)
  async suggestBusinessTypes() {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return [
      { value: 'Boutique Owner', label: 'Boutique Owner', confidence: 0.8 },
      { value: 'Fashion Designer', label: 'Fashion Designer', confidence: 0.75 },
      { value: 'Online Retailer', label: 'Online Retailer', confidence: 0.7 },
      { value: 'Textile Agent', label: 'Textile Agent', confidence: 0.6 }
    ];
  },

  // Suggests colors based on general trends or fabric type
  async suggestColors(fabricType) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const trends = ['Emerald Green', 'Sapphire Blue', 'Ruby Red', 'Terracotta', 'Mustard Yellow', 'Charcoal Grey', 'Pastel Pink', 'Sky Blue'];
    return trends.map(c => ({ value: c, label: c, confidence: 0.85 }));
  },
  
  // Suggests compositions based on common fabric types
  async suggestCompositions(fabricType) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const lowerFabric = (fabricType || '').toLowerCase();
    if (lowerFabric.includes('denim')) {
      return [
        { value: '100% Cotton', label: '100% Cotton', confidence: 0.9 },
        { value: '98% Cotton 2% Spandex', label: '98% Cotton 2% Spandex', confidence: 0.85 }
      ];
    } else if (lowerFabric.includes('jersey')) {
      return [
        { value: '100% Cotton Single Jersey', label: '100% Cotton Single Jersey', confidence: 0.9 },
        { value: 'Poly-Cotton Blend', label: 'Poly-Cotton Blend', confidence: 0.8 }
      ];
    }
    return [
       { value: '100% Cotton', label: '100% Cotton', confidence: 0.9 },
       { value: '95% Cotton 5% Spandex', label: '95% Cotton 5% Spandex', confidence: 0.85 },
       { value: 'Poly-Cotton Blend', label: 'Poly-Cotton Blend', confidence: 0.8 }
    ];
  },

  // Suggests GSM based on common fabric uses
  async suggestWeightGSM(fabricType) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const lowerFabric = (fabricType || '').toLowerCase();
    if (lowerFabric.includes('shirting')) {
      return [
        { value: '80 GSM', label: '80 GSM (Light Shirting)', confidence: 0.8 },
        { value: '120 GSM', label: '120 GSM (Medium Shirting)', confidence: 0.7 }
      ];
    } else if (lowerFabric.includes('denim') || lowerFabric.includes('bottomwear')) {
      return [
        { value: '250 GSM', label: '250 GSM (Heavy Bottomwear)', confidence: 0.9 },
        { value: '350 GSM', label: '350 GSM (Very Heavy Bottomwear)', confidence: 0.8 }
      ];
    }
    return [
       { value: '60 GSM', label: '60 GSM (Very Light)', confidence: 0.8 },
       { value: '140 GSM', label: '140 GSM (Medium)', confidence: 0.8 },
       { value: '220 GSM', label: '220 GSM (Heavy)', confidence: 0.8 }
    ];
  },
  
  // Suggests shrinkage levels based on composition
  async suggestShrinkageLevel(composition) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const lowerComp = (composition || '').toLowerCase();
    if (lowerComp.includes('cotton') || lowerComp.includes('linen')) {
       return [
         { value: 'High (> 5%)', label: 'High (> 5%)', confidence: 0.9 },
         { value: 'Medium (2-5%)', label: 'Medium (2-5%)', confidence: 0.7 }
       ];
    } else if (lowerComp.includes('polyester') || lowerComp.includes('nylon') || lowerComp.includes('synthetic')) {
       return [{ value: 'Low (< 2%)', label: 'Low (< 2%)', confidence: 0.9 }];
    } else if (lowerComp.includes('rayon') || lowerComp.includes('viscose')) {
      return [
        { value: 'Medium (2-5%)', label: 'Medium (2-5%)', confidence: 0.8 },
        { value: 'High (> 5%)', label: 'High (> 5%)', confidence: 0.6 }
      ];
    }
    return [{ value: 'Medium (2-5%)', label: 'Medium (2-5%)', confidence: 0.7 }];
  }
};