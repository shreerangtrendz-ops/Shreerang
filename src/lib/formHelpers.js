export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

export const formatPercentage = (value) => {
  return `${Number(value || 0).toFixed(2)}%`;
};

export const calculateSellingPrice = (costPrice, marginPct, discountPct, commissionPct) => {
  const cp = Number(costPrice) || 0;
  const m = Number(marginPct) / 100;
  const d = Number(discountPct) / 100;
  const c = Number(commissionPct) / 100;

  // Formula derivation:
  // SP = CP + (CP * M) - (SP * D) - (SP * C)
  // SP + (SP * D) + (SP * C) = CP * (1 + M)
  // SP * (1 + D + C) = CP * (1 + M)
  // SP = (CP * (1 + M)) / (1 + D + C)

  const numerator = cp * (1 + m);
  const denominator = 1 + d + c;

  if (denominator === 0) return 0;
  return (numerator / denominator).toFixed(2);
};

export const calculateOutputQuantity = (inputQty, shortagePct) => {
  const qty = Number(inputQty) || 0;
  const shortage = Number(shortagePct) || 0;
  return (qty * (1 - shortage / 100)).toFixed(2);
};

export const calculateCost = (outputQty, rate) => {
  const qty = Number(outputQty) || 0;
  const r = Number(rate) || 0;
  return (qty * r).toFixed(2);
};