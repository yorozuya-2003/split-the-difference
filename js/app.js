import {
  splitBill,
  formatAmount,
  formatPaise,
  itemsTotalPaise,
} from './split.js';

let nextId = 1;
function uid() {
  return String(nextId++);
}

const state = {
  people: [],
  items: [],
  totalPaid: '',
};

const els = {
  peopleList: document.getElementById('people-list'),
  addPersonBtn: document.getElementById('add-person-btn'),
  itemsList: document.getElementById('items-list'),
  addItemBtn: document.getElementById('add-item-btn'),
  totalInput: document.getElementById('total-input'),
  itemsTotalHint: document.getElementById('items-total-hint'),
  resultsList: document.getElementById('results-list'),
  resultsTotal: document.getElementById('results-total'),
  resultsEmpty: document.getElementById('results-empty'),
};

function init() {
  bindEvents();
  render();
}

function bindEvents() {
  els.addPersonBtn.addEventListener('click', () => {
    addPerson('');
    render();
  });

  els.addItemBtn.addEventListener('click', () => {
    addItem();
    render();
  });

  els.totalInput.addEventListener('input', (e) => {
    state.totalPaid = e.target.value;
    renderResults();
  });
}

function addPerson(name) {
  state.people.push({ id: uid(), name });
}

function removePerson(id) {
  state.people = state.people.filter((p) => p.id !== id);
  for (const item of state.items) {
    item.consumerIds = item.consumerIds.filter((cid) => cid !== id);
  }
}

function addItem() {
  state.items.push({
    id: uid(),
    name: '',
    price: '',
    consumerIds: [],
  });
}

function removeItem(id) {
  state.items = state.items.filter((i) => i.id !== id);
}

function parsePrice(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function getValidItems() {
  return state.items
    .map((item) => ({
      ...item,
      price: parsePrice(item.price),
      consumerIds: item.consumerIds.filter((id) =>
        state.people.some((p) => p.id === id)
      ),
    }))
    .filter((item) => item.price > 0);
}

function getTotalPaid() {
  return parsePrice(state.totalPaid);
}

function canCalculate() {
  const validItems = getValidItems();
  const total = getTotalPaid();
  if (state.people.length === 0 || validItems.length === 0 || total <= 0) {
    return false;
  }

  return validItems.every((item) => item.consumerIds.length > 0);
}

function render() {
  renderPeople();
  renderItems();
  renderTotalHint();
  renderResults();
}

function renderPeople() {
  if (state.people.length === 0) {
    els.peopleList.innerHTML =
      '<p class="empty-hint">Add people to split the bill</p>';
    return;
  }

  els.peopleList.innerHTML = state.people
    .map(
      (p) => `
    <div class="person-chip" data-id="${p.id}">
      <input type="text" value="${escapeHtml(p.name)}" placeholder="Name"
        aria-label="Person name" maxlength="20" />
      <button type="button" class="remove-btn" aria-label="Remove person">×</button>
    </div>
  `
    )
    .join('');

  els.peopleList.querySelectorAll('.person-chip').forEach((chip) => {
    const id = chip.dataset.id;
    const input = chip.querySelector('input');
    const removeBtn = chip.querySelector('.remove-btn');

    input.addEventListener('input', (e) => {
      const person = state.people.find((p) => p.id === id);
      if (person) person.name = e.target.value;
      renderItems();
      renderResults();
    });

    removeBtn.addEventListener('click', () => {
      removePerson(id);
      render();
    });
  });
}

function renderItems() {
  if (state.items.length === 0) {
    els.itemsList.innerHTML =
      '<p class="empty-hint">Add items from the bill</p>';
    return;
  }

  els.itemsList.innerHTML = state.items
    .map((item) => {
      const toggles = state.people
        .map((p) => {
          const active = item.consumerIds.includes(p.id);
          const label = p.name.trim() || '…';
          return `
          <button type="button"
            class="consumer-toggle${active ? ' active' : ''}"
            data-person-id="${p.id}"
            ${state.people.length === 0 ? 'disabled' : ''}
            aria-pressed="${active}">
            ${escapeHtml(label)}
          </button>`;
        })
        .join('');

      return `
      <div class="item-card" data-id="${item.id}">
        <div class="item-row">
          <input type="text" class="item-name-input" value="${escapeHtml(item.name)}"
            placeholder="Item" aria-label="Item" maxlength="40" />
          <input type="number" class="item-price-input" value="${escapeHtml(item.price)}"
            placeholder="0" min="0" step="0.01" inputmode="decimal"
            aria-label="Item price" />
          <button type="button" class="item-remove-btn" aria-label="Remove item">×</button>
        </div>
        <div class="item-consumers">${toggles}</div>
      </div>`;
    })
    .join('');

  els.itemsList.querySelectorAll('.item-card').forEach((card) => {
    const id = card.dataset.id;
    const item = state.items.find((i) => i.id === id);

    card.querySelector('.item-name-input').addEventListener('input', (e) => {
      item.name = e.target.value;
    });

    card.querySelector('.item-price-input').addEventListener('input', (e) => {
      item.price = e.target.value;
      renderTotalHint();
      renderResults();
    });

    card.querySelector('.item-remove-btn').addEventListener('click', () => {
      removeItem(id);
      render();
    });

    card.querySelectorAll('.consumer-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const personId = btn.dataset.personId;
        const idx = item.consumerIds.indexOf(personId);
        if (idx >= 0) {
          item.consumerIds.splice(idx, 1);
        } else {
          item.consumerIds.push(personId);
        }
        renderItems();
        renderResults();
      });
    });
  });
}

function renderTotalHint() {
  const totalPaise = itemsTotalPaise(getValidItems());
  if (totalPaise > 0) {
    els.itemsTotalHint.textContent = `Items add up to ${formatPaise(totalPaise)}`;
    els.itemsTotalHint.hidden = false;
  } else {
    els.itemsTotalHint.hidden = true;
  }
}

function renderResults() {
  if (!canCalculate()) {
    els.resultsList.innerHTML = '';
    els.resultsEmpty.hidden = false;
    els.resultsTotal.hidden = true;
    return;
  }

  els.resultsEmpty.hidden = true;
  els.resultsTotal.hidden = false;

  const people = state.people.map((p) => ({
    id: p.id,
    name: p.name.trim() || 'Person',
  }));

  const results = splitBill(people, getValidItems(), getTotalPaid());

  els.resultsList.innerHTML = results
    .map(
      (r) => `
    <div class="result-row">
      <span class="result-name">${escapeHtml(r.name)}</span>
      <span class="result-amount">${formatAmount(r.amount)}</span>
    </div>
  `
    )
    .join('');

  const total = getTotalPaid();
  els.resultsTotal.innerHTML = `
    <span>Total</span>
    <span>${formatAmount(total)}</span>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
