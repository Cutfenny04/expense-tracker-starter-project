/**
 * ========================================================
 * Expense Tracker App — main.js
 * ========================================================
 */

// Storage key & Custom Event name
const STORAGE_KEY = 'EXPENSE_TRACKER_DATA';
const EVENT_UPDATED = 'transaction:updated';

// Application state
let transactions = [];
let editingTransactionId = null;

// DOM Elements
const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');

const transactionForm = document.getElementById('transactionForm');
const titleInput = document.getElementById('transactionFormTitleInput');
const amountInput = document.getElementById('transactionFormAmountInput');
const dateInput = document.getElementById('transactionFormDateInput');
const typeSelect = document.getElementById('transactionFormTypeSelect');
const submitButton =  document.getElementById('transactionFormSubmitButton');
const formHeading = document.getElementById('transactionFormHeading');
const formCard = document.querySelector('.tracker-form-card');

const searchForm = document.getElementById('searchTransactionForm');
const searchInput = document.getElementById('searchTransactionFormTitleInput');

const balanceAmountEls = document.querySelectorAll('.tracker-summary__balance-amount');
const incomeAmountEl = document.querySelector('.tracker-summary__stat-amount--income');
const expenseAmountEl = document.querySelector('.tracker-summary__stat-amount--expense');

/**
 * Generate unique ID
 */
function generateId() {
  return +new Date();
}

/**
 * Format currency to Indonesian Rupiah display
 */
function formatRupiah(number) {
  const isNegative = number < 0;
  const absFormatted = Math.abs(number).toLocaleString('id-ID');
  return isNegative ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

/**
 * Load transactions from localStorage
 */
function loadTransactionsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        transactions = parsed;
      }
    } catch (e) {
      console.error('Gagal membaca data dari localStorage:', e);
      transactions = [];
    }
  } else {
    transactions = [];
  }
}

/**
 * Save transactions to localStorage
 */
function saveTransactionsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/**
 * Dispatch custom event whenever transaction data changes
 */
function notifyDataChanged() {
  document.dispatchEvent(new Event(EVENT_UPDATED));
}

/**
 * Update financial summary on Dashboard (Hero & Overview)
 */
function updateDashboard() {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalBalance = totalIncome - totalExpense;

  // Update all balance indicators (hero balance card & overview card)
  balanceAmountEls.forEach((el) => {
    el.textContent = formatRupiah(totalBalance);
  });

  if (incomeAmountEl) {
    incomeAmountEl.textContent = formatRupiah(totalIncome);
  }

  if (expenseAmountEl) {
    expenseAmountEl.textContent = formatRupiah(totalExpense);
  }
}

/**
 * Create a transaction card DOM element (Kriteria 1 & 2)
 */
function createTransactionElement(transaction) {
  const { id, title, amount, date, type } = transaction;

  // Card wrapper
  const itemEl = document.createElement('div');
  itemEl.setAttribute('data-testid', 'transactionItem');
  itemEl.setAttribute('data-id', String(id));
  itemEl.setAttribute('data-type', type);
  itemEl.className = 'tracker-transaction-item';

  // Title
  const titleEl = document.createElement('h3');
  titleEl.setAttribute('data-testid', 'transactionItemTitle');
  titleEl.className = 'tracker-transaction-item__title';
  titleEl.textContent = title;

  // Amount
  const amountEl = document.createElement('p');
  amountEl.setAttribute('data-testid', 'transactionItemAmount');
  amountEl.className = 'tracker-transaction-item__amount';
  amountEl.textContent = `Nominal: ${formatRupiah(amount)}`;

  // Date
  const dateEl = document.createElement('p');
  dateEl.setAttribute('data-testid', 'transactionItemDate');
  dateEl.className = 'tracker-transaction-item__date';
  dateEl.textContent = `Tanggal: ${date}`;

  // Type
  const typeEl = document.createElement('p');
  typeEl.setAttribute('data-testid', 'transactionItemType');
  typeEl.setAttribute('data-type', type);
  typeEl.className = 'tracker-transaction-item__type';
  typeEl.textContent = `Tipe: ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'}`;

  // Actions Container
  const actionsEl = document.createElement('div');
  actionsEl.className = 'tracker-transaction-item__actions';

  // Button Ubah Tipe
  const toggleBtn = document.createElement('button');
  toggleBtn.setAttribute('data-testid', 'transactionItemEditTypeButton');
  toggleBtn.className = 'tracker-transaction-item__btn';
  toggleBtn.textContent = 'Ubah Tipe';
  toggleBtn.addEventListener('click', () => {
    toggleTransactionType(id);
  });

  // Button Edit
  const editBtn = document.createElement('button');
  editBtn.setAttribute('data-testid', 'transactionItemEditButton');
  editBtn.className = 'tracker-transaction-item__btn';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => {
    startEditingTransaction(id);
  });

  // Button Hapus
  const deleteBtn = document.createElement('button');
  deleteBtn.setAttribute('data-testid', 'transactionItemDeleteButton');
  deleteBtn.className = 'tracker-transaction-item__btn';
  deleteBtn.textContent = 'Hapus';
  deleteBtn.addEventListener('click', () => {
    deleteTransaction(id);
  });

  actionsEl.appendChild(toggleBtn);
  actionsEl.appendChild(editBtn);
  actionsEl.appendChild(deleteBtn);

  itemEl.appendChild(titleEl);
  itemEl.appendChild(amountEl);
  itemEl.appendChild(dateEl);
  itemEl.appendChild(typeEl);
  itemEl.appendChild(actionsEl);

  return itemEl;
}

/**
 * Render transactions to the DOM
 * Cleanly empties containers first to avoid duplication
 */
function renderTransactions(listToRender = transactions) {
  if (!incomeList || !expenseList) return;

  incomeList.innerHTML = '';
  expenseList.innerHTML = '';

  listToRender.forEach((transaction) => {
    const cardEl = createTransactionElement(transaction);
    if (transaction.type === 'income') {
      incomeList.appendChild(cardEl);
    } else {
      expenseList.appendChild(cardEl);
    }
  });
}


function toggleTransactionType(id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  transaction.type = transaction.type === 'income' ? 'expense' : 'income';
  notifyDataChanged();
}


function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);

  // If we are currently editing this item, cancel edit
  if (editingTransactionId === id) {
    cancelEditing();
  }

  notifyDataChanged();
}


function startEditingTransaction(id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  editingTransactionId = id;

  if (titleInput) titleInput.value = transaction.title;
  if (amountInput) amountInput.value = transaction.amount;
  if (dateInput) dateInput.value = transaction.date;
  if (typeSelect) typeSelect.value = transaction.type;

  if (formHeading) {
    formHeading.textContent = 'Edit Transaction';
  }

  if (submitButton) {
    submitButton.innerHTML = '<span>Simpan Perubahan</span><span>✓</span>';
  }

  if (formCard) {
    formCard.classList.add('is-editing');

    // Add cancel button if not already present
    if (!document.getElementById('cancelEditButton')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelEditButton';
      cancelBtn.type = 'button';
      cancelBtn.className = 'tracker-form-card__cancel-btn';
      cancelBtn.textContent = 'Batal Edit';
      cancelBtn.addEventListener('click', cancelEditing);
      transactionForm.appendChild(cancelBtn);
    }
  }

  // Smooth scroll to form
  const formSection = document.getElementById('transaction-form');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
}


function cancelEditing() {
  editingTransactionId = null;

  if (transactionForm) {
    transactionForm.reset();
  }

  if (formHeading) {
    formHeading.textContent = 'Add Transaction';
  }

  if (submitButton) {
    submitButton.innerHTML = '<span>Add Transaction</span><span>↗</span>';
  }

  if (formCard) {
    formCard.classList.remove('is-editing');
  }

  const cancelBtn = document.getElementById('cancelEditButton');
  if (cancelBtn) {
    cancelBtn.remove();
  }
}


function handleFormSubmit(e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  let date = dateInput.value;
  const type = typeSelect.value;

  // Validation according to Rubrik Kriteria 1 Skilled
  if (!title) {
    alert('Judul transaksi tidak boleh kosong!');
    titleInput.focus();
    return;
  }

  if (isNaN(amount) || amount < 1) {
    alert('Nominal uang harus diisi dengan angka minimal 1 Rupiah!');
    amountInput.focus();
    return;
  }

  // Default to today if date is omitted
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  if (editingTransactionId !== null) {
    // Update existing transaction
    const index = transactions.findIndex((t) => t.id === editingTransactionId);
    if (index !== -1) {
      transactions[index] = {
        ...transactions[index],
        title,
        amount,
        date,
        type,
      };
    }
    cancelEditing();
  } else {
    // Add new transaction
    const newTransaction = {
      id: generateId(),
      title,
      amount,
      date,
      type,
    };
    transactions.unshift(newTransaction);
    transactionForm.reset();
  }

  notifyDataChanged();
}


function handleSearch() {
  if (!searchInput) return;
  const keyword = searchInput.value.trim().toLowerCase();

  if (!keyword) {
    renderTransactions(transactions);
    return;
  }

  const filtered = transactions.filter((t) =>
    t.title.toLowerCase().includes(keyword)
  );
  renderTransactions(filtered);
}


function initHeroParallax() {
  const heroStage = document.getElementById('heroStage');
  if (!heroStage || window.innerWidth < 900) return;

  const money = heroStage.querySelector('.hero-money-wrapper');
  const coin = heroStage.querySelector('.hero-coin-wrapper');
  const chartCard = heroStage.querySelector('.hero-chart-wrapper');
  const balanceCard = document.getElementById('heroBalanceCard');

  heroStage.addEventListener('mousemove', (e) => {
    const rect = heroStage.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const normX = x / (rect.width / 2);
    const normY = y / (rect.height / 2);

    if (balanceCard) {
      balanceCard.style.transform = `rotate(${2 + normX * 3}deg) rotateX(${-normY * 6}deg) rotateY(${normX * 6}deg) translateZ(20px)`;
    }
    if (money) {
      money.style.transform = `translate3d(${-normX * 16}px, ${-normY * 16}px, 40px) rotate(${-10 + normX * 4}deg)`;
    }
    if (coin) {
      coin.style.transform = `translate3d(${normX * 18}px, ${normY * 18}px, 50px) rotate(${-8 - normX * 6}deg)`;
    }
    if (chartCard) {
      chartCard.style.transform = `translate3d(${normX * 10}px, ${normY * 10}px, 30px)`;
    }
  });

  heroStage.addEventListener('mouseleave', () => {
    if (balanceCard) balanceCard.style.transform = '';
    if (money) money.style.transform = '';
    if (coin) coin.style.transform = '';
    if (chartCard) chartCard.style.transform = '';
  });
}

/**
 * Initialize application
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Load initial data
  loadTransactionsFromStorage();

  // 2. Setup Centralized Custom Event Listener (Kriteria 2 Advanced)
  document.addEventListener(EVENT_UPDATED, () => {
    saveTransactionsToStorage();
    // Maintain active search filter if input is not empty
    if (searchInput && searchInput.value.trim()) {
      handleSearch();
    } else {
      renderTransactions(transactions);
    }
    updateDashboard();
  });

  // 3. Form Submit Listener
  if (transactionForm) {
    transactionForm.addEventListener('submit', handleFormSubmit);
  }

  // 4. Search Form & Live Input Listeners (Kriteria 3)
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // 5. Initial Render & Dashboard Update
  renderTransactions(transactions);
  updateDashboard();

  // 6. Interactive Parallax
  initHeroParallax();
});