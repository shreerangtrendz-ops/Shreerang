export const AIShortCodeGenerator = {
  cache: new Map(),

  async generateShortCode(fabricName, baseType) {
    const key = `${fabricName}-${baseType}`;
    if (this.cache.has(key)) return this.cache.get(key);

    let code = '';
    const base = this.getBaseAbbreviation(baseType);
    
    // Extract number from fabric name
    const number = this.extractNumberFromName(fabricName);
    
    if (base && number) {
        code = `${base}-${number}`;
    } else if (base) {
        code = base;
        // Add random or hash if needed to uniqueness, but for now simple
        // If just base, maybe add 3 chars of name
        const namePart = fabricName ? fabricName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() : '';
        if (namePart) code += `-${namePart}`;
    } else {
        // Fallback
        code = (fabricName || 'FAB').substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
    }
    
    // Check length constraint if any (3-4 chars? usually more like 6-8 with dash)
    // The prompt says "COT-60" which is 6 chars. 
    
    this.cache.set(key, code);
    return code;
  },

  getBaseAbbreviation(baseName) {
      if (!baseName) return 'GEN';
      const upper = baseName.toUpperCase();
      
      if (upper.includes('COTTON')) return 'COT';
      if (upper.includes('POLYESTER') || upper.includes('POLY')) return 'POLY';
      if (upper.includes('VISCOSE')) return 'VISC';
      if (upper.includes('RAYON')) return 'RAY'; // Prompt said RAY or RP? "Rayon=RP"? Let's stick to standard or prompt specific if conflicting. Prompt said "Rayon=RP".
      // Wait, prompt text: "Cotton=COT, Polyester=POLY, Viscose=VISC, Rayon=RP, PV=PV, PC=PC".
      if (upper.includes('RAYON')) return 'RP';
      if (upper.includes('PV')) return 'PV';
      if (upper.includes('PC')) return 'PC';
      if (upper.includes('SILK')) return 'SLK';
      if (upper.includes('LINEN')) return 'LIN';
      if (upper.includes('NYLON')) return 'NYL';
      if (upper.includes('WOOL')) return 'WOL';
      
      return upper.substring(0, 3);
  },

  extractNumberFromName(fabricName) {
      if (!fabricName) return null;
      const match = fabricName.match(/(\d+)/);
      return match ? match[0] : null;
  }
};