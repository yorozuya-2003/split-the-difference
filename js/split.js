const CURRENCY_SYMBOL = '₹';
const DECIMALS = 2;
const PAISE_PER_RUPEE = 100;

/** Split paise equally; +1 paise rotates by offset so no one is always short. */
function splitEquallyPaise(totalPaise, count, offset = 0) {
  const base = Math.floor(totalPaise / count);
  const shares = Array(count).fill(base);
  let remaining = totalPaise - base * count;

  let idx = (count - 1 - (offset % count)) % count;
  while (remaining > 0) {
    shares[idx] += 1;
    remaining -= 1;
    idx = (idx - 1 + count) % count;
  }

  return shares;
}

/** Split paise by weight using floor; leftover paise go to last people in list. */
function splitProportionalPaise(totalPaise, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
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

function computeShares(people, items) {
  const shares = new Map(people.map((p) => [p.id, 0]));

  items.forEach((item, itemIndex) => {
    const consumers = item.consumerIds
      .filter((id) => shares.has(id))
      .sort();

    if (consumers.length === 0) return;

    const pricePaise = Math.round(item.price * PAISE_PER_RUPEE);
    const portions = splitEquallyPaise(
      pricePaise,
      consumers.length,
      itemIndex
    );

    consumers.forEach((id, i) => {
      shares.set(id, shares.get(id) + portions[i]);
    });
  });

  return people.map((p) => ({
    id: p.id,
    name: p.name,
    sharePaise: shares.get(p.id),
  }));
}

function splitBill(people, items, totalPaid) {
  const personShares = computeShares(people, items);
  const totalPaise = Math.round(totalPaid * PAISE_PER_RUPEE);
  const weights = personShares.map((p) => p.sharePaise);
  const sumSharePaise = weights.reduce((a, b) => a + b, 0);

  if (sumSharePaise === 0 || totalPaise <= 0) {
    return personShares.map((p) => ({
      id: p.id,
      name: p.name,
      amount: 0,
      sharePaise: p.sharePaise,
    }));
  }

  const amountsPaise = splitProportionalPaise(totalPaise, weights);

  return personShares.map((p, i) => ({
    id: p.id,
    name: p.name,
    amount: amountsPaise[i] / PAISE_PER_RUPEE,
    sharePaise: p.sharePaise,
  }));
}

function formatAmount(amount) {
  return `${CURRENCY_SYMBOL}${amount.toFixed(DECIMALS)}`;
}

function itemsTotalPaise(items) {
  return items.reduce(
    (s, item) => s + Math.round(item.price * PAISE_PER_RUPEE),
    0
  );
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
