/**
 * AI Service for Fabric Master
 * Includes heuristics and Canvas-based analysis to simulate AI features
 */
export const AIDescriptionService = {
  
  // 1. Description Generation
  generateBaseFabricDescription(data) {
    const { base_fabric_name, base, width, gsm, construction } = data;
    const adjectives = ['Premium', 'High-quality', 'Durable', 'Versatile', 'Classic'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    
    let desc = `${adj} ${base || 'fabric'} suitable for various garment applications. `;
    if (width) desc += `Features a width of ${width}. `;
    if (gsm) desc += `Medium weight at ${gsm} GSM. `;
    if (construction) desc += `Constructed with a ${construction} weave. `;
    
    return Promise.resolve(desc);
  },

  generateFinishFabricDescription(data) {
    const { base_name, process, finish, tag, design_concept, color } = data;
    let desc = `Exquisite ${process || 'finished'} fabric crafted from ${base_name || 'premium base'}. `;
    
    if (finish) desc += `Enhanced with a ${finish} finish. `;
    if (color) desc += `Presented in a stunning ${color} shade. `;
    if (tag && tag !== 'Without Foil') desc += `Includes ${tag} detailing. `;
    
    return Promise.resolve(desc);
  },

  // 2. Client-side "AI" Color Detection
  extractDominantColor(imageSource) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      // Handle both File objects (via URL.createObjectURL) and URL strings
      img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        
        // Draw 1x1 pixel to get average
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        
        // Convert RGB to rough Color Name
        const colorName = this.rgbToColorName(r, g, b);
        resolve({
            hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`,
            name: colorName
        });
      };

      img.onerror = () => resolve({ hex: '#000000', name: 'Multi-color' });
    });
  },

  // Simple RGB to Name mapper
  rgbToColorName(r, g, b) {
    if (r > 200 && g > 200 && b > 200) return 'White';
    if (r < 50 && g < 50 && b < 50) return 'Black';
    if (r > 200 && g < 50 && b < 50) return 'Red';
    if (r < 50 && g > 200 && b < 50) return 'Green';
    if (r < 50 && g < 50 && b > 200) return 'Blue';
    if (r > 200 && g > 200 && b < 50) return 'Yellow';
    if (r > 200 && g < 50 && b > 200) return 'Magenta';
    if (r < 50 && g > 200 && b > 200) return 'Cyan';
    if (Math.abs(r - g) < 20 && Math.abs(r - b) < 20) return 'Grey';
    return 'Multi-color';
  },

  // 3. "AI" Text Extraction (Simulated via smart filename parsing)
  extractDesignNumber(filename) {
    // Logic: Look for patterns like "D-123", "5001", "Design 45"
    // Remove extension
    const name = filename.replace(/\.[^/.]+$/, "");
    
    // Check for common design number patterns
    const numberPattern = /([A-Z]{0,3}[-_\s]?\d{3,6})/i;
    const match = name.match(numberPattern);
    
    if (match) return match[0].toUpperCase().replace(/\s/g, '-');
    
    // Fallback: Clean up filename
    return name.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  }
};