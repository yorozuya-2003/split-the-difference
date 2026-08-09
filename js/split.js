const CURRENCY_SYMBOL = '₹';
const DECIMALS = 2;
const PAISE_PER_RUPEE = 100;

function toPaise(amount) {
  return Math.round(amount * PAISE_PER_RUPEE);
}

/** total × (weight / sum of weights), round to paise; leftover paise → last people. */
function splitProportionalPaise(totalPaise, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);

  const shares = weights.map((w) => Math.floor((totalPaise * w) / sum));
  let remaining = totalPaise - shares.reduce((a, b) => a + b, 0);

  let idx = shares.length - 1;
  while (remaining > 0) {
    shares[idx] += 1;
    remaining -= 1;
    idx -= 1;
    if (idx < 0) idx = shares.length - 1;
  }

  while (remaining < 0) {
    shares[idx] -= 1;
    remaining += 1;
    idx -= 1;
    if (idx < 0) idx = shares.length - 1;
  }

  return shares;
}

/** Each person's share = sum of (item price ÷ number of eaters). No rounding per item. */
function computeShares(people, items) {
  const shares = new Map(people.map((p) => [p.id, 0]));

  for (const item of items) {
    const consumers = item.consumerIds.filter((id) => shares.has(id));
    if (consumers.length === 0) continue;

    const portionPaise = toPaise(item.price) / consumers.length;
    for (const id of consumers) {
      shares.set(id, shares.get(id) + portionPaise);
    }
  }

  return people.map((p) => ({
    id: p.id,
    name: p.name,
    sharePaise: shares.get(p.id),
  }));
}

function splitBill(people, items, totalPaid) {
  const personShares = computeShares(people, items);
  const totalPaise = toPaise(totalPaid);
  const weights = personShares.map((p) => p.sharePaise);
  const sumWeights = weights.reduce((a, b) => a + b, 0);

  if (sumWeights === 0 || totalPaise <= 0) {
    return personShares.map((p) => ({
      id: p.id,
      name: p.name,
      amount: 0,
    }));
  }

  const amountsPaise = splitProportionalPaise(totalPaise, weights);

  return personShares.map((p, i) => ({
    id: p.id,
    name: p.name,
    amount: amountsPaise[i] / PAISE_PER_RUPEE,
  }));
}

function formatAmount(amount) {
  return `${CURRENCY_SYMBOL}${amount.toFixed(DECIMALS)}`;
}

function itemsTotalPaise(items) {
  return items.reduce((s, item) => s + toPaise(item.price), 0);
}

function formatPaise(paise) {
  return formatAmount(paise / PAISE_PER_RUPEE);
}

export {
  CURRENCY_SYMBOL,
  DECIMALS,
  PAISE_PER_RUPEE,
  computeShares,
  splitBill,
  formatAmount,
  formatPaise,
  itemsTotalPaise,
};
