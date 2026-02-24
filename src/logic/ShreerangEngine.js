/**
 * Shreerang Costing Engine
 * Logic for specific textile costing calculations involving Schiffli and Billing standards.
 */

export const SCHIFFLI_PIECE_LENGTH = 0.9;
export const BILL_MTR_PER_PC = 1.1;
export const SCHIFFLI_RATE_PER_MTR = 0; // Base constant if needed, currently dynamic

export class CostingEngine {
  constructor() {
    this.SCHIFFLI_PIECE_LENGTH = SCHIFFLI_PIECE_LENGTH;
    this.BILL_MTR_PER_PC = BILL_MTR_PER_PC;
  }

  /**
   * Legacy method - maintained for backward compatibility
   */
  calculateCost(greyRate, dyeingRate, schiffliRate, finishRate, shrinkagePercent) {
    const safeGreyRate = Number(greyRate) || 0;
    const safeDyeingRate = Number(dyeingRate) || 0;
    const safeSchiffliRate = Number(schiffliRate) || 0;
    const safeFinishRate = Number(finishRate) || 0;
    const safeShrinkage = Number(shrinkagePercent) || 0;

    let adjustedGreyCost = safeGreyRate;
    if (safeShrinkage > 0 && safeShrinkage < 100) {
      adjustedGreyCost = safeGreyRate / (1 - (safeShrinkage / 100));
    }

    const totalCost = adjustedGreyCost + safeDyeingRate + safeSchiffliRate + safeFinishRate;
    
    return {
      totalCost: Number(totalCost.toFixed(2)),
      breakdown: {
        greyRaw: safeGreyRate,
        greyAdjusted: Number(adjustedGreyCost.toFixed(2)),
        dyeing: safeDyeingRate,
        schiffli: safeSchiffliRate,
        finish: safeFinishRate
      }
    };
  }

  /**
   * New Batch Calculation Method simulating 1000m run
   * Handles multiple stages with shrinkage
   */
  calculateBatchCost(params) {
    const BASE_QTY = 1000; // 1000 meters simulation base
    let currentQty = BASE_QTY;
    let totalCostAccumulated = 0;
    
    // 1. Grey Stage
    const greyRate = Number(params.greyRate) || 0;
    const greyShrink = Number(params.greyShrink) || 0;
    
    const greyCostAmount = BASE_QTY * greyRate;
    totalCostAccumulated += greyCostAmount;
    
    // Apply Grey Shrinkage
    const greyOutputQty = BASE_QTY * (1 - (greyShrink / 100));
    currentQty = greyOutputQty;

    // 2. Dyeing Stage
    const dyeingRate = Number(params.dyeingRate) || 0;
    const dyeingShrink = Number(params.dyeingShrink) || 0;
    
    // Dyeing is typically charged on the input quantity (grey output)
    const dyeingCostAmount = currentQty * dyeingRate;
    totalCostAccumulated += dyeingCostAmount;
    
    // Apply Dyeing Shrinkage
    const dyeingOutputQty = currentQty * (1 - (dyeingShrink / 100));
    currentQty = dyeingOutputQty;

    // 3. Schiffli Stage
    const schiffliRate = Number(params.schiffliRate) || 0;
    // Schiffli usually calculated on fabric length available
    const schiffliCostAmount = currentQty * schiffliRate;
    totalCostAccumulated += schiffliCostAmount;
    // Assuming no shrinkage in Schiffli for now unless specified in future
    const schiffliOutputQty = currentQty; 

    // 4. Finishing Stage
    const finishRate = Number(params.finishRate) || 0;
    const finishShrink = Number(params.finishShrink) || 0;
    
    const finishCostAmount = currentQty * finishRate;
    totalCostAccumulated += finishCostAmount;
    
    // Apply Finish Shrinkage
    const finishOutputQty = currentQty * (1 - (finishShrink / 100));
    currentQty = finishOutputQty;

    // Final Calculations
    const finalQty = currentQty;
    const costPerMeter = finalQty > 0 ? totalCostAccumulated / finalQty : 0;
    const yieldPercentage = (finalQty / BASE_QTY) * 100;

    return {
      totalCost: Number(costPerMeter.toFixed(2)),
      totalBatchCost: Number(totalCostAccumulated.toFixed(2)),
      finalQty: Number(finalQty.toFixed(2)),
      baseQty: BASE_QTY,
      yieldPercentage: Number(yieldPercentage.toFixed(2)),
      breakdown: {
        grey: {
          rate: greyRate,
          amount: Number(greyCostAmount.toFixed(2)),
          outputQty: Number(greyOutputQty.toFixed(2))
        },
        dyeing: {
          rate: dyeingRate,
          amount: Number(dyeingCostAmount.toFixed(2)),
          outputQty: Number(dyeingOutputQty.toFixed(2))
        },
        schiffli: {
          rate: schiffliRate,
          amount: Number(schiffliCostAmount.toFixed(2)),
          outputQty: Number(schiffliOutputQty.toFixed(2))
        },
        finish: {
          rate: finishRate,
          amount: Number(finishCostAmount.toFixed(2)),
          outputQty: Number(finishOutputQty.toFixed(2))
        }
      }
    };
  }

  /**
   * Calculates cost per meter based on total cost and billable meters per piece.
   */
  calculateCostPerMeter(totalCost, billMeterPerPiece = BILL_MTR_PER_PC) {
    const cost = Number(totalCost) || 0;
    const factor = Number(billMeterPerPiece) || 1;
    return Number((cost * factor).toFixed(2));
  }
  
  /**
   * Calculates fold less percentage (effective loss)
   */
  calculateFoldLessPct(inputQty, shrinkagePct) {
    const shrink = Number(shrinkagePct) || 0;
    const qty = Number(inputQty) || 100; // default to 100 base if 0
    
    const output = qty * (1 - (shrink / 100));
    const loss = qty - output;
    
    // In this simple context, it's same as shrink pct, but method allows for more complex logic later
    // e.g. if fold less includes other factors
    return Number((loss / qty * 100).toFixed(2));
  }

  getProcessStages() {
    return [
      { id: 'grey', label: 'Grey Fabric' },
      { id: 'dyeing', label: 'Dyeing' },
      { id: 'schiffli', label: 'Schiffli' },
      { id: 'finish', label: 'Finishing' }
    ];
  }

  calculateStageWiseCost(stage, rate) {
    return {
      stage,
      rate: Number(rate) || 0,
      amount: Number(rate) || 0
    };
  }
}

export class HistoryManager {
  constructor() {
    this.history = [];
  }

  addRate(processName, rate, date = new Date()) {
    this.history.push({
      processName,
      rate: Number(rate),
      date: new Date(date).toISOString(),
      timestamp: Date.now()
    });
  }

  getHistoricalRates(processName) {
    return this.history
      .filter(item => item.processName === processName)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAverageRate(processName, days = 30) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const rates = this.history.filter(item => 
      item.processName === processName && item.timestamp >= cutoff
    );

    if (rates.length === 0) return 0;

    const sum = rates.reduce((acc, curr) => acc + curr.rate, 0);
    return Number((sum / rates.length).toFixed(2));
  }

  clearHistory() {
    this.history = [];
  }
}