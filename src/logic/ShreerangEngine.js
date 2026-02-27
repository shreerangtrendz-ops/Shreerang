/**
 * Shreerang Costing Engine
 * ========================
 * Implements the exact costing formulas used by Shreerang Trendz.
 * All formulas validated against New_Fabric_Master_V2.xlsx and Cost_Analysis.txt.
 *
 * KEY CONCEPTS:
 *  - Grey Qty: Fabric sent to process unit (input)
 *  - Shortage %: The % that does NOT come back (loss at mill/unit)
 *  - Output Qty = Grey Qty × (1 - Shortage%)
 *  - Piece-based Schiffli: Grey is cut into pieces of fixed length, billed per piece
 *  - Final Cost Per Mtr = Total All Costs / Final Finish Meters received in office
 *
 * COSTING PATHS (from Cost_Analysis.txt):
 *  Path 1: Grey Only
 *  Path 2: Grey → RFD
 *  Path 3: Grey → RFD → Digital
 *  Path 4: Grey → Mill Process
 *  Path 5: Grey → Dyed
 *  Path 6: Grey → Dyed/Mill Print → Schiffli → Deca
 *  Path 7: Grey → Schiffli → Dyed/Mill Print
 *  Path 8: Grey → Schiffli → Deca/Wash
 *  Path 9: Grey → Schiffli → RFD → Digital
 */

// ─── PROCESS MASTER DATA (from Final Cost Sheet tab) ──────────────────────────
export const PROCESS_RATE_DEFAULTS = {
  Greige:              { rate: 28,  shortage: 0,     chargeOn: 'purchase' },
  'RFD':               { rate: 6,   shortage: 0.05,  chargeOn: 'output' },
  'Mill Print':        { rate: 30,  shortage: 0.15,  chargeOn: 'input' },
  'Screen Print':      { rate: 30,  shortage: 0.15,  chargeOn: 'input' },
  'Table Print':       { rate: 25,  shortage: 0.15,  chargeOn: 'input' },
  'Block Print':       { rate: 25,  shortage: 0.15,  chargeOn: 'input' },
  'ODP Print':         { rate: 25,  shortage: 0.15,  chargeOn: 'input' },
  'Digital Print':     { rate: 70,  shortage: 0.07,  chargeOn: 'output' },
  'Solid Dyed':        { rate: 14,  shortage: 0.15,  chargeOn: 'output' },
  'Foil/Gold/Glitter': { rate: 10,  shortage: 0.02,  chargeOn: 'input' },
  'Embroidered':       { rate: 250, shortage: 0.02,  chargeOn: 'input' },
  'Hakoba':            { rate: 50,  shortage: 0.02,  chargeOn: 'input' },
  'Handwork':          { rate: 70,  shortage: 0,     chargeOn: 'input' },
  'Crush/Pleated':     { rate: 20,  shortage: 0,     chargeOn: 'input' },
  'Deca/Washing':      { rate: 1.5, shortage: 0,     chargeOn: 'input' },
};

// ─── SIMPLE PROCESS CHARGE FORMULAS ──────────────────────────────────────────

/**
 * Scenario A: Mill charges on GREY (input) meters — Standard
 * Formula: ((GreyRate × (1 + Exp%)) + JobRate) / (1 - Shortage%)
 */
export function calcCostOnGrey(greyRate, jobRate, expPct = 0, shortagePct = 0) {
  const r = +greyRate || 0;
  const j = +jobRate  || 0;
  const e = (+expPct  || 0) / 100;
  const s = (+shortagePct || 0) / 100;
  if (s >= 1) return 0;
  return ((r * (1 + e)) + j) / (1 - s);
}

/**
 * Scenario B: Mill charges on FINISH (output) meters — Net Deal
 * Formula: ((GreyRate × (1 + Exp%)) / (1 - Shortage%)) + JobRate
 */
export function calcCostOnFinish(greyRate, jobRate, expPct = 0, shortagePct = 0) {
  const r = +greyRate || 0;
  const j = +jobRate  || 0;
  const e = (+expPct  || 0) / 100;
  const s = (+shortagePct || 0) / 100;
  if (s >= 1) return 0;
  return ((r * (1 + e)) / (1 - s)) + j;
}

/**
 * Simple Embroidery Cost Per Meter
 * Formula: (GreyRate / (1 - Shrinkage%)) + JobRate
 */
export function calcEmbroideryCost(greyRate, jobRate, shrinkagePct = 0) {
  const r = +greyRate || 0;
  const j = +jobRate  || 0;
  const s = (+shrinkagePct || 0) / 100;
  if (s >= 1) return 0;
  return (r / (1 - s)) + j;
}

// ─── HAKOBA / SCHIFFLI BATCH CALCULATOR ──────────────────────────────────────
/**
 * The main Hakoba batch costing engine.
 *
 * Schiffli works on PIECES (TPs / Takas), not metres.
 * The mill cuts the grey into pieces of `pieceLengthMtr` each.
 * It bills on `billMtrPerPiece` (slightly less than cut — chargeable portion).
 * Deca unit bills on `decaMtrPerPiece` per piece.
 *
 * Supported paths:
 *   'grey_schiffli_deca'          → Grey → Schiffli → Deca/Wash (Path 8)
 *   'grey_dyed_schiffli_deca'     → Grey → Dyed → Schiffli → Deca (Path 6 variant)
 *   'grey_schiffli_dyed'          → Grey → Schiffli → Dyed/Mill Print (Path 7)
 *   'grey_rfd_schiffli_digital'   → Grey → RFD → Schiffli → Digital (Path 9)
 *   'grey_schiffli_deca_digital'  → Grey → Schiffli → Deca → Digital (Path 3 variant)
 *
 * Pre-process (RFD/Dyed before Schiffli): charged on OUTPUT qty (finish mtr from mill)
 * Post-process (Digital/Dyed after Schiffli): charged on OUTPUT qty
 *
 * VALIDATED RESULTS (from Cost_Analysis.txt):
 *   Path grey_schiffli_deca         → 79.50 ✓
 *   Path grey_dyed_schiffli_deca    → 97.70 ✓
 *   Path grey_schiffli_dyed         → 90.60 ✓
 */
export function calcHakobaBatch(p) {
  const greyQty         = +p.greyQty          || 100;
  const greyRate        = +p.greyRate         || 0;
  const buyingCommPct   = +p.buyingCommPct    || 0;
  const pieceLengthMtr  = +p.pieceLengthMtr   || 21.25;
  const billMtrPerPiece = +p.billMtrPerPiece  || 20.25;
  const schiffliRate    = +p.schiffliJobRate  || 0;
  const decaMtrPerPiece = +p.decaMtrPerPiece  || 20.0;
  const decaRate        = +p.decaRate         || 1.50;
  const hasSequins      = !!p.hasSequins;
  const effectiveDecaRate = hasSequins ? decaRate + 5 : decaRate;

  const preShort  = (+p.preProcessShortPct  || 0) / 100;
  const preRate   = +p.preProcessRate        || 0;
  const postShort = (+p.postProcessShortPct || 0) / 100;
  const postRate  = +p.postProcessRate       || 0;
  const path      = p.path || 'grey_schiffli_deca';

  const steps = [];
  let currentQty = greyQty;
  let totalCost  = 0;

  // ── STEP 1: Grey Cost ────────────────────────────────────────────────────
  const greyCost  = greyQty * greyRate;
  const commAmt   = greyCost * (buyingCommPct / 100);
  const totalGrey = greyCost + commAmt;
  totalCost += totalGrey;
  steps.push({
    id: 'grey',
    label: 'Grey Purchase Cost',
    formula: `${greyQty} mtr × ₹${greyRate}${buyingCommPct ? ` + ${buyingCommPct}% Comm` : ''}`,
    amount: totalGrey,
    outputQty: greyQty,
  });

  // ── STEP 2 (Optional): Pre-Process (RFD or Dyed BEFORE Schiffli) ─────────
  // IMPORTANT: charged on OUTPUT qty (finish metres received from mill)
  // Per Cost_Analysis.txt example: 100 grey → 12% short → 88 output → 88 × ₹12 = ₹1056
  if (preRate > 0 && (
    path === 'grey_dyed_schiffli_deca'   ||
    path === 'grey_rfd_schiffli_digital' ||
    path === 'grey_rfd_schiffli_deca'
  )) {
    const preOutput = currentQty * (1 - preShort);
    const preCost   = preOutput * preRate;  // charge on OUTPUT
    const preLabel  = path.includes('dyed')
      ? 'Dyeing Charge (Pre-Schiffli)'
      : 'RFD Charge (Pre-Schiffli)';
    steps.push({
      id: 'pre_process',
      label: preLabel,
      formula: `${round(preOutput)} mtr (output after ${preShort * 100}% short) × ₹${preRate}`,
      amount: preCost,
      outputQty: preOutput,
    });
    currentQty  = preOutput;
    totalCost  += preCost;
  }

  // ── STEP 3: Schiffli Piece Calculation ───────────────────────────────────
  const completePcs   = Math.floor(currentQty / pieceLengthMtr);
  const incompleteMtr = currentQty % pieceLengthMtr;
  const totalMtrSent  = completePcs * pieceLengthMtr;
  const billMtr       = completePcs * billMtrPerPiece;
  const schiffliCost  = billMtr * schiffliRate;

  steps.push({
    id: 'schiffli_pieces',
    label: 'Schiffli — Piece Count',
    formula: `${round(currentQty)} mtr ÷ ${pieceLengthMtr} mtr/pc = ${completePcs} pcs (waste: ${round(incompleteMtr)} mtr)`,
    completePcs,
    incompleteMtr: round(incompleteMtr),
    totalMtrSent: round(totalMtrSent),
    amount: null,
    outputQty: totalMtrSent,
  });
  steps.push({
    id: 'schiffli_charge',
    label: 'Schiffli Job Charge',
    formula: `${completePcs} pcs × ${billMtrPerPiece} bill mtr × ₹${schiffliRate}`,
    billMtr: round(billMtr),
    amount: schiffliCost,
    outputQty: totalMtrSent,
  });
  totalCost  += schiffliCost;
  currentQty  = totalMtrSent;

  // ── STEP 4: Deca / Washing ────────────────────────────────────────────────
  const needsDeca = (
    path === 'grey_schiffli_deca'        ||
    path === 'grey_dyed_schiffli_deca'   ||
    path === 'grey_rfd_schiffli_deca'    ||
    path === 'grey_schiffli_deca_digital'
  );
  if (needsDeca) {
    const decaMtr  = completePcs * decaMtrPerPiece;
    const decaCost = decaMtr * effectiveDecaRate;
    steps.push({
      id: 'deca',
      label: 'Deca / Washing Charge',
      formula: `${completePcs} pcs × ${decaMtrPerPiece} mtr × ₹${effectiveDecaRate}${hasSequins ? ' (+₹5 sequin surcharge)' : ''}`,
      decaMtr: round(decaMtr),
      amount: decaCost,
      outputQty: decaMtr,
    });
    totalCost  += decaCost;
    currentQty  = decaMtr;
  }

  // ── STEP 5 (Optional): Post-Process (Dyed / Digital AFTER Schiffli) ──────
  // Charged on OUTPUT qty (finish mtr received after this process)
  if (postRate > 0 && (
    path === 'grey_schiffli_dyed'        ||
    path === 'grey_schiffli_deca_digital'||
    path === 'grey_rfd_schiffli_digital'
  )) {
    const postInputQty  = currentQty;
    const postOutputQty = p.postProcessOutputMtr
      ? +p.postProcessOutputMtr
      : postInputQty * (1 - postShort);
    const postCost  = postOutputQty * postRate;  // charge on OUTPUT
    const postLabel = path.includes('digital')
      ? 'Digital Print Charge'
      : 'Dyeing Charge (Post-Schiffli)';
    steps.push({
      id: 'post_process',
      label: postLabel,
      formula: `${round(postOutputQty)} mtr (output after ${postShort * 100}% short) × ₹${postRate}`,
      amount: postCost,
      outputQty: postOutputQty,
    });
    totalCost  += postCost;
    currentQty  = postOutputQty;
  }

  // ── FINAL ─────────────────────────────────────────────────────────────────
  const finishMtr  = round(currentQty);
  const costPerMtr = finishMtr > 0 ? totalCost / finishMtr : 0;

  return {
    steps,
    summary: {
      greyQty,
      finishMtr,
      totalCost:  round(totalCost),
      costPerMtr: round(costPerMtr),
      yieldPct:   round((finishMtr / greyQty) * 100),
    },
  };
}

// ─── PATH-BASED MULTI-STAGE COSTING ──────────────────────────────────────────
/**
 * General multi-stage costing engine for any path.
 * Each stage: { name, rate, chargeOn: 'input'|'output', shortagePct }
 */
export function calcMultiStageCost(greyQty, greyRate, buyingCommPct = 0, stages = []) {
  const qty     = +greyQty      || 100;
  const rate    = +greyRate     || 0;
  const commPct = +buyingCommPct || 0;

  const greyCost = qty * rate * (1 + commPct / 100);
  let currentQty = qty;
  let totalCost  = greyCost;

  const stepResults = [{
    name: 'Grey Purchase',
    inputQty: qty, outputQty: qty,
    rate, amount: round(greyCost),
    note: `+ ${commPct}% buying comm`,
  }];

  for (const stage of stages) {
    const sRate     = +stage.rate || 0;
    const sPct      = (+stage.shortagePct || 0) / 100;
    const outputQty = currentQty * (1 - sPct);
    const chargeQty = stage.chargeOn === 'output' ? outputQty : currentQty;
    const amount    = chargeQty * sRate;

    stepResults.push({
      name: stage.name,
      inputQty: round(currentQty), chargeQty: round(chargeQty),
      outputQty: round(outputQty), rate: sRate,
      shortagePct: stage.shortagePct || 0, amount: round(amount),
    });

    totalCost  += amount;
    currentQty  = outputQty;
  }

  const finishMtr  = round(currentQty);
  const costPerMtr = finishMtr > 0 ? round(totalCost / finishMtr) : 0;

  return { stepResults, finishMtr, totalCost: round(totalCost), costPerMtr, yieldPct: round((finishMtr / qty) * 100) };
}

// ─── SELLING PRICE ────────────────────────────────────────────────────────────
/**
 * @param {number} factoryCostPerMtr
 * @param {number} marginPct   - e.g. 15 for 15%
 * @param {number} dharaPct    - Cash Disc + Broker, e.g. 7 for 7%
 */
export function calcSellingPrice(factoryCostPerMtr, marginPct = 0, dharaPct = 0) {
  const cost       = +factoryCostPerMtr || 0;
  const margin     = (+marginPct || 0) / 100;
  const dhara      = (+dharaPct  || 0) / 100;
  const withMargin = cost * (1 + margin);
  const finalPrice = dhara < 1 ? withMargin / (1 - dhara) : withMargin;
  return { withMargin: round(withMargin), finalPrice: round(finalPrice) };
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
export function round(n, dp = 2) {
  return Math.round((+n || 0) * 10 ** dp) / 10 ** dp;
}

// ─── BACKWARD-COMPATIBLE CLASS ────────────────────────────────────────────────
export class CostingEngine {
  constructor() {}

  calculateCost(greyRate, dyeingRate, schiffliRate, finishRate, shrinkagePct) {
    const s = (+shrinkagePct || 0) / 100;
    const ag = s > 0 && s < 1 ? (+greyRate || 0) / (1 - s) : (+greyRate || 0);
    return {
      totalCost: round(ag + (+dyeingRate||0) + (+schiffliRate||0) + (+finishRate||0)),
      breakdown: { greyRaw: greyRate, greyAdjusted: round(ag), dyeing: dyeingRate, schiffli: schiffliRate, finish: finishRate },
    };
  }

  calculateHakobaBatch(params) { return calcHakobaBatch(params); }
  calculateSellingPrice(c, m, d) { return calcSellingPrice(c, m, d); }
}

export class HistoryManager {
  constructor() { this.history = []; }
  addRate(n, r, d = new Date()) {
    this.history.push({ processName: n, rate: +r, date: new Date(d).toISOString(), timestamp: Date.now() });
  }
  getHistoricalRates(n) {
    return this.history.filter(i => i.processName === n).sort((a, b) => b.timestamp - a.timestamp);
  }
  getAverageRate(n, days = 30) {
    const cutoff = Date.now() - days * 86400000;
    const rates  = this.history.filter(i => i.processName === n && i.timestamp >= cutoff);
    if (!rates.length) return 0;
    return round(rates.reduce((s, i) => s + i.rate, 0) / rates.length);
  }
  clearHistory() { this.history = []; }
}
