/**
 * Shreerang Costing Engine
 * Core logic for textile costing calculations across 10 specific manufacturing paths.
 */

class CostingEngine {
  constructor() {
    this.paths = {
      TRADING: 'TRADING',
      GREY_ONLY: 'GREY_ONLY',
      RFD_ONLY: 'RFD_ONLY',
      GREY_RFD_DIGITAL: 'GREY_RFD_DIGITAL',
      GREY_MILL: 'GREY_MILL',
      GREY_DYED: 'GREY_DYED',
      GREY_MILL_SCHIFFLI_DECA: 'GREY_MILL_SCHIFFLI_DECA',
      GREY_SCHIFFLI_DYED: 'GREY_SCHIFFLI_DYED',
      GREY_SCHIFFLI_DECA_WASH: 'GREY_SCHIFFLI_DECA_WASH',
      GREY_SCHIFFLI_RFD_DIGITAL: 'GREY_SCHIFFLI_RFD_DIGITAL'
    };
  }

  /**
   * Main entry point for calculation
   * @param {string} path - One of the 10 defined paths
   * @param {object} params - Input parameters (rates, quantities, percentages)
   */
  calculate(path, params) {
    if (!this.paths[path]) {
      throw new Error(`Invalid calculation path: ${path}`);
    }

    // Standardize inputs
    const inputs = this.normalizeInputs(params);
    let result = {};

    switch (path) {
      case this.paths.TRADING:
        result = this.calculateTrading(inputs);
        break;
      case this.paths.GREY_ONLY:
        result = this.calculateGreyOnly(inputs);
        break;
      case this.paths.RFD_ONLY:
        result = this.calculateRfdOnly(inputs);
        break;
      case this.paths.GREY_RFD_DIGITAL:
        result = this.calculateGreyRfdDigital(inputs);
        break;
      case this.paths.GREY_MILL:
        result = this.calculateGreyMill(inputs);
        break;
      case this.paths.GREY_DYED:
        result = this.calculateGreyDyed(inputs);
        break;
      case this.paths.GREY_MILL_SCHIFFLI_DECA:
        result = this.calculateGreyMillSchiffliDeca(inputs);
        break;
      case this.paths.GREY_SCHIFFLI_DYED:
        result = this.calculateGreySchiffliDyed(inputs);
        break;
      case this.paths.GREY_SCHIFFLI_DECA_WASH:
        result = this.calculateGreySchiffliDecaWash(inputs);
        break;
      case this.paths.GREY_SCHIFFLI_RFD_DIGITAL:
        result = this.calculateGreySchiffliRfdDigital(inputs);
        break;
      default:
        throw new Error(`Path implementation missing for: ${path}`);
    }

    return this.finalize(result, inputs, path);
  }

  normalizeInputs(params) {
    return {
      grey_qty: Number(params.grey_qty) || 100, // Default 100 base units for calculation if not provided
      grey_rate: Number(params.grey_rate) || 0,
      
      mill_rate: Number(params.mill_rate) || 0,
      schiffli_rate: Number(params.schiffli_rate) || 0,
      deca_rate: Number(params.deca_rate) || 0,
      rfd_rate: Number(params.rfd_rate) || 0,
      digital_rate: Number(params.digital_rate) || 0,
      dyeing_rate: Number(params.dyeing_rate) || 0,
      
      shortage_percent: Number(params.shortage_percent) || 0,
      dhara_percent: Number(params.dhara_percent) || 0, // Profit/Wastage factor
      profit_margin: Number(params.profit_margin) || 0,
      
      transport_cost: Number(params.transport_cost) || 0,
      overhead_cost: Number(params.overhead_cost) || 0,
    };
  }

  // --- Helper Methods ---

  getFabricBase(inputs) {
    const amount = inputs.grey_qty * inputs.grey_rate;
    return {
      qty: inputs.grey_qty,
      rate: inputs.grey_rate,
      amount: amount,
      step: 'Base Fabric Cost'
    };
  }

  applyShortage(currentQty, percentage) {
    const shortageQty = currentQty * (percentage / 100);
    const netQty = currentQty - shortageQty;
    return {
      inputQty: currentQty,
      shortagePercent: percentage,
      shortageQty: shortageQty,
      netQty: netQty,
      step: 'Shortage Adjustment'
    };
  }

  getSchiffliCost(qty, rate) {
    return {
      qty: qty,
      rate: rate,
      amount: qty * rate,
      step: 'Schiffli Process'
    };
  }

  getProcessCost(qty, rate, name) {
    return {
      qty: qty,
      rate: rate,
      amount: qty * rate,
      step: name
    };
  }

  // --- Calculation Paths ---

  calculateTrading(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);
    
    // Trading usually implies buying finished goods, so we might treat grey_rate as purchase_rate
    // Assuming simple margin addition
    
    let totalCost = base.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: inputs.grey_qty, steps };
  }

  calculateGreyOnly(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    const transport = { step: 'Transport & Handling', amount: inputs.transport_cost };
    steps.push(transport);

    let totalCost = base.amount + transport.amount;
    
    // Dhara usually applied on top for grey trading
    const dharaAmount = totalCost * (inputs.dhara_percent / 100);
    steps.push({ step: 'Dhara/Margin', amount: dharaAmount, rate: inputs.dhara_percent + '%' });
    
    totalCost += dharaAmount;

    return { totalCost, finalQty: inputs.grey_qty, steps };
  }

  calculateRfdOnly(inputs) {
    // Usually means converting Grey to RFD
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    const rfdProcess = this.getProcessCost(inputs.grey_qty, inputs.rfd_rate, 'RFD Process'); // Usually charged on input qty
    steps.push(rfdProcess);

    let totalCost = base.amount + rfdProcess.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreyRfdDigital(inputs) {
    const steps = [];
    // 1. Grey
    const base = this.getFabricBase(inputs);
    steps.push(base);

    // 2. Shortage
    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    // 3. RFD
    const rfd = this.getProcessCost(inputs.grey_qty, inputs.rfd_rate, 'RFD Process');
    steps.push(rfd);

    // 4. Digital Print (Usually on RFD qty)
    const digital = this.getProcessCost(shortage.netQty, inputs.digital_rate, 'Digital Print');
    steps.push(digital);

    let totalCost = base.amount + rfd.amount + digital.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreyMill(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    // Mill rates often inclusive or specific per meter on input
    const mill = this.getProcessCost(inputs.grey_qty, inputs.mill_rate, 'Mill Processing');
    steps.push(mill);

    let totalCost = base.amount + mill.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreyDyed(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    const dyeing = this.getProcessCost(inputs.grey_qty, inputs.dyeing_rate, 'Dyeing Process');
    steps.push(dyeing);

    let totalCost = base.amount + dyeing.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreyMillSchiffliDeca(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    // 1. Mill Process
    const mill = this.getProcessCost(inputs.grey_qty, inputs.mill_rate, 'Mill Processing');
    steps.push(mill);

    // Shortage after mill
    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    // 2. Schiffli on processed fabric
    const schiffli = this.getSchiffliCost(shortage.netQty, inputs.schiffli_rate);
    steps.push(schiffli);

    // 3. Deca on Schiffli fabric
    const deca = this.getProcessCost(shortage.netQty, inputs.deca_rate, 'Deca/Finishing');
    steps.push(deca);

    let totalCost = base.amount + mill.amount + schiffli.amount + deca.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreySchiffliDyed(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    // 1. Schiffli on Grey
    const schiffli = this.getSchiffliCost(inputs.grey_qty, inputs.schiffli_rate);
    steps.push(schiffli);

    // 2. Dyeing
    const dyeing = this.getProcessCost(inputs.grey_qty, inputs.dyeing_rate, 'Dyeing Process');
    steps.push(dyeing);
    
    // Shortage applies at end of wet processing
    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    let totalCost = base.amount + schiffli.amount + dyeing.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreySchiffliDecaWash(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    // 1. Schiffli on Grey
    const schiffli = this.getSchiffliCost(inputs.grey_qty, inputs.schiffli_rate);
    steps.push(schiffli);

    // 2. Deca/Wash
    const deca = this.getProcessCost(inputs.grey_qty, inputs.deca_rate, 'Deca Wash');
    steps.push(deca);

    // Minimal shortage usually, but applying user input
    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    let totalCost = base.amount + schiffli.amount + deca.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }

  calculateGreySchiffliRfdDigital(inputs) {
    const steps = [];
    const base = this.getFabricBase(inputs);
    steps.push(base);

    // 1. Schiffli
    const schiffli = this.getSchiffliCost(inputs.grey_qty, inputs.schiffli_rate);
    steps.push(schiffli);

    // 2. RFD
    const rfd = this.getProcessCost(inputs.grey_qty, inputs.rfd_rate, 'RFD Process');
    steps.push(rfd);

    // Shortage
    const shortage = this.applyShortage(inputs.grey_qty, inputs.shortage_percent);
    steps.push(shortage);

    // 3. Digital Print on result
    const digital = this.getProcessCost(shortage.netQty, inputs.digital_rate, 'Digital Print');
    steps.push(digital);

    let totalCost = base.amount + schiffli.amount + rfd.amount + digital.amount + inputs.transport_cost;
    steps.push({ step: 'Transport', amount: inputs.transport_cost });

    return { totalCost, finalQty: shortage.netQty, steps };
  }


  /**
   * Finalizes calculation by adding overheads, profit, and per-meter cost
   */
  finalize(result, inputs, path) {
    const { totalCost, finalQty, steps } = result;

    // Profit Margin
    const profitAmount = totalCost * (inputs.profit_margin / 100);
    if (profitAmount > 0) {
      steps.push({ step: 'Profit Margin', amount: profitAmount, rate: inputs.profit_margin + '%' });
    }

    const grandTotal = totalCost + profitAmount;
    const costPerMeter = finalQty > 0 ? (grandTotal / finalQty) : 0;

    return {
      path: path,
      inputs: inputs,
      breakdown: steps,
      summary: {
        totalCost: Number(grandTotal.toFixed(2)),
        finalQty: Number(finalQty.toFixed(2)),
        costPerMeter: Number(costPerMeter.toFixed(2)),
        baseQty: inputs.grey_qty
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Export as named and default
export { CostingEngine };
export default new CostingEngine();