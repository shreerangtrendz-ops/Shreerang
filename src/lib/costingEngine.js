/**
 * Intelligent Costing Engine
 * Implements standard textile industry formulas for Grey/Finish/Job-Work costing
 */

export const costingEngine = {
  /**
   * Calculate Cost based on Grey Meters (Standard)
   * Formula: ((Grey Rate * (1 + Exp%)) + Job Rate) / (1 - Shortage%)
   */
  calculateGreyCharge: (greyRate, jobRate, expensePercent, shortagePercent) => {
    const rate = Number(greyRate) || 0;
    const job = Number(jobRate) || 0;
    const exp = (Number(expensePercent) || 0) / 100;
    const shortage = (Number(shortagePercent) || 0) / 100;

    if (shortage >= 1) return 0; // Avoid division by zero
    
    return ((rate * (1 + exp)) + job) / (1 - shortage);
  },

  /**
   * Calculate Cost based on Finish Meters (Net Deal)
   * Formula: ((Grey Rate * (1 + Exp%)) / (1 - Shortage%)) + Job Rate
   */
  calculateFinishCharge: (greyRate, jobRate, expensePercent, shortagePercent) => {
    const rate = Number(greyRate) || 0;
    const job = Number(jobRate) || 0;
    const exp = (Number(expensePercent) || 0) / 100;
    const shortage = (Number(shortagePercent) || 0) / 100;

    if (shortage >= 1) return 0;

    return ((rate * (1 + exp)) / (1 - shortage)) + job;
  },

  /**
   * Embroidery Cost
   * Formula: Grey Rate / (1 - Shrinkage%) + Job Rate
   */
  calculateEmbroideryCost: (greyRate, jobRate, shrinkagePercent) => {
    const rate = Number(greyRate) || 0;
    const job = Number(jobRate) || 0;
    const shrink = (Number(shrinkagePercent) || 0) / 100;

    if (shrink >= 1) return 0;

    return (rate / (1 - shrink)) + job;
  },

  /**
   * Schiffli Cost
   * Formula: (Grey Rate / (1 - Shrinkage%)) + Job Rate + Deca Washing Charge
   */
  calculateSchiffliCost: (greyRate, jobRate, shrinkagePercent, decaCharge) => {
    const rate = Number(greyRate) || 0;
    const job = Number(jobRate) || 0;
    const deca = Number(decaCharge) || 0;
    const shrink = (Number(shrinkagePercent) || 0) / 100;

    if (shrink >= 1) return 0;

    return (rate / (1 - shrink)) + job + deca;
  },

  /**
   * Calculate Total Batch Cost
   * Sum of all costs
   */
  calculateBatchCost: (fabricCost, jobCost, accessories, labor, packing, overheads) => {
    return Number(fabricCost) + Number(jobCost) + Number(accessories) + Number(labor) + Number(packing) + Number(overheads);
  },

  /**
   * Calculate Final Selling Price
   * Formula: (Factory Cost Per Mtr * (1 + Margin%)) / Reverse Dhara
   */
  calculateFinalPrice: (factoryCost, marginPercent, reverseDharaPercent = 0) => {
    const cost = Number(factoryCost) || 0;
    const margin = (Number(marginPercent) || 0) / 100;
    const dhara = (Number(reverseDharaPercent) || 0) / 100;

    const withMargin = cost * (1 + margin);
    
    if (dhara >= 1) return withMargin; // Avoid division error, fallback to just margin
    if (dhara === 0) return withMargin;

    return withMargin / (1 - dhara); 
  }
};