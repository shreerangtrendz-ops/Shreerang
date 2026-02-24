export const TierPricingService = {
  // Pricing Rules
  // PUBLIC: Show range (Base Price + 20% to Base Price + 40%)
  // REGISTERED: Show Base Price + 20% (Standard Retail) + Wholesale option (Base + 10%)
  // VIP: Show Base Price + 5% (Special) + Bulk discounts
  
  calculatePricing(basePrice, tier) {
    const price = parseFloat(basePrice || 0);
    if (!price) return null;

    switch (tier?.toUpperCase()) {
      case 'VIP':
        return {
          displayPrice: price * 1.05, // 5% markup
          label: 'VIP Price',
          wholesalePrice: price * 1.02, // 2% markup for bulk
          bulkThreshold: 500, // meters
          currency: '₹'
        };
      case 'REGISTERED':
        return {
          displayPrice: price * 1.20, // 20% markup
          label: 'Member Price',
          wholesalePrice: price * 1.10, // 10% markup
          bulkThreshold: 100, // meters
          currency: '₹'
        };
      case 'PUBLIC':
      default:
        return {
          minPrice: price * 1.20,
          maxPrice: price * 1.40,
          label: 'Retail Range',
          currency: '₹',
          isRange: true
        };
    }
  },

  getPricingDisplayInfo(basePrice, tier) {
    const pricing = this.calculatePricing(basePrice, tier);
    
    if (!pricing) return { text: 'Contact for Price', type: 'contact' };

    if (pricing.isRange) {
      return {
        text: `${pricing.currency}${pricing.minPrice.toFixed(2)} - ${pricing.currency}${pricing.maxPrice.toFixed(2)}`,
        subtext: 'Log in for wholesale pricing',
        type: 'range'
      };
    } else {
      return {
        text: `${pricing.currency}${pricing.displayPrice.toFixed(2)}`,
        subtext: pricing.wholesalePrice ? `(${pricing.currency}${pricing.wholesalePrice.toFixed(2)} for ${pricing.bulkThreshold}+ m)` : '',
        type: 'fixed'
      };
    }
  }
};