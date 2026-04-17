// js/app.js — Expense & Budget Visualizer

// ── State ──────────────────────────────────────────────
let transactions     = []
let customCategories = []
let currentSort      = 'none'
let chartInstance    = null

// ── Storage keys ───────────────────────────────────────
const KEYS = {
  transactions:     'ebv_transactions',
  customCategories: 'ebv_custom_categories',
  theme:            'ebv_theme',
}

// ── Storage warning banner ─────────────────────────────
function showStorageWarning() {
  if (document.getElementById('storage-warning')) return
  const banner = document.createElement('div')
  banner.id = 'storage-warning'
  banner.textContent = 'Storage unavailable — data will not persist between sessions.'
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;padding:8px 16px;background:#f59e0b;' +
    'color:#1c1917;text-align:center;z-index:9999;font-size:0.875rem;'
  document.body.insertBefore(banner, document.body.firstChild)
}

// ── Storage helpers ────────────────────────────────────
function saveTransactions() {
  try { localStorage.setItem(KEYS.transactions, JSON.stringify(transactions)) }
  catch { showStorageWarning() }
}

function saveCustomCategories() {
  try { localStorage.setItem(KEYS.customCategories, JSON.stringify(customCategories)) }
  catch { showStorageWarning() }
}

function saveTheme(theme) {
  try { localStorage.setItem(KEYS.theme, theme) }
  catch { showStorageWarning() }
}

// ── Utilities ──────────────────────────────────────────
function generateId() {
  return String(Date.now())
}

function formatCurrency(n) {
  return '$' + Number(n).toFixed(2)
}

// ── Load / Init ────────────────────────────────────────
function loadTheme() {
  let theme = 'light'
  try { theme = localStorage.getItem(KEYS.theme) ?? 'light' }
  catch { showStorageWarning() }
  document.body.classList.remove('theme-light', 'theme-dark')
  document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light')
}

function loadCategories() {
  try {
    customCategories = JSON.parse(localStorage.getItem(KEYS.customCategories) ?? '[]')
  } catch {
    console.warn('ebv: failed to parse custom categories from storage')
    customCategories = []
  }
  populateCategoryDropdown()
}

function loadTransactions() {
  try {
    transactions = JSON.parse(localStorage.getItem(KEYS.transactions) ?? '[]')
  } catch {
    console.warn('ebv: failed to parse transactions from storage')
    transactions = []
  }
}

function init() {
  loadTheme()
  loadCategories()
  loadTransactions()
  renderBalance()
  renderTransactionList()
  renderChart()
  bindEvents()
}

// ── Sorting ────────────────────────────────────────────
function getSortedTransactions() {
  const copy = [...transactions]
  if (currentSort === 'amount-desc') {
    copy.sort((a, b) => b.amount - a.amount)
  } else if (currentSort === 'amount-asc') {
    copy.sort((a, b) => a.amount - b.amount)
  } else if (currentSort === 'category') {
    copy.sort((a, b) => a.category.localeCompare(b.category))
  }
  return copy
}

// ── Rendering ──────────────────────────────────────────
function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0)
  document.getElementById('balance-display').textContent = formatCurrency(total)
}

function renderTransactionList() {
  const list     = document.getElementById('transaction-list')
  const emptyMsg = document.getElementById('list-empty-msg')
  const sorted   = getSortedTransactions()

  list.innerHTML = ''

  if (sorted.length === 0) {
    emptyMsg.removeAttribute('hidden')
    return
  }

  emptyMsg.setAttribute('hidden', '')

  sorted.forEach(t => {
    const li = document.createElement('li')

    const nameSpan = document.createElement('span')
    nameSpan.className   = 'tx-name'
    nameSpan.textContent = t.name

    const amountSpan = document.createElement('span')
    amountSpan.className   = 'tx-amount'
    amountSpan.textContent = formatCurrency(t.amount)

    const categorySpan = document.createElement('span')
    categorySpan.className   = 'tx-category'
    categorySpan.textContent = t.category

    const deleteBtn = document.createElement('button')
    deleteBtn.className   = 'delete-btn'
    deleteBtn.textContent = 'Delete'
    deleteBtn.dataset.id  = t.id

    li.appendChild(nameSpan)
    li.appendChild(amountSpan)
    li.appendChild(categorySpan)
    li.appendChild(deleteBtn)
    list.appendChild(li)
  })
}

function getCategoryTotals() {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount
    return acc
  }, {})
}

function renderChart() {
  const canvas    = document.getElementById('spending-chart')
  const container = document.getElementById('chart-container')
  const emptyMsg  = document.getElementById('chart-empty-msg')

  if (typeof Chart === 'undefined') {
    document.getElementById('chart-section').hidden = true
    return
  }

  if (transactions.length === 0) {
    container.hidden = true
    emptyMsg.removeAttribute('hidden')
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    return
  }

  container.removeAttribute('hidden')
  emptyMsg.setAttribute('hidden', '')

  const totals = getCategoryTotals()
  const labels = Object.keys(totals)
  const data   = Object.values(totals)
  const palette = [
    '#4a6cf7','#f59e0b','#10b981','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
  ]
  const colors = labels.map((_, i) => palette[i % palette.length])

  if (!chartInstance) {
    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    })
  } else {
    chartInstance.data.labels                       = labels
    chartInstance.data.datasets[0].data            = data
    chartInstance.data.datasets[0].backgroundColor = colors
    chartInstance.update()
  }
}

function populateCategoryDropdown() {
  const select = document.getElementById('item-category')
  select.innerHTML = ''

  ;[
    { value: '',          label: '-- Select Category --' },
    { value: 'Food',      label: 'Food' },
    { value: 'Transport', label: 'Transport' },
    { value: 'Fun',       label: 'Fun' },
  ].forEach(item => {
    const opt = document.createElement('option')
    opt.value       = item.value
    opt.textContent = item.label
    select.appendChild(opt)
  })

  customCategories.forEach(cat => {
    const opt = document.createElement('option')
    opt.value = opt.textContent = cat
    select.appendChild(opt)
  })
}

// ── Validation ─────────────────────────────────────────
function validateTransactionForm() {
  const name     = document.getElementById('item-name').value.trim()
  const amount   = parseFloat(document.getElementById('item-amount').value)
  const category = document.getElementById('item-category').value

  let valid = true

  const errName = document.getElementById('err-name')
  if (!name) {
    errName.textContent = 'Item name is required.'
    valid = false
  } else {
    errName.textContent = ''
  }

  const errAmount = document.getElementById('err-amount')
  if (isNaN(amount) || amount <= 0) {
    errAmount.textContent = 'Amount must be a positive number.'
    valid = false
  } else {
    errAmount.textContent = ''
  }

  const errCategory = document.getElementById('err-category')
  if (!category) {
    errCategory.textContent = 'Please select a category.'
    valid = false
  } else {
    errCategory.textContent = ''
  }

  return valid
}

function validateCategoryForm() {
  const name = document.getElementById('new-category-name').value.trim()
  const errEl = document.getElementById('err-custom-cat')

  if (!name) {
    errEl.textContent = 'Category name cannot be empty.'
    return false
  }

  const allCategories = ['food', 'transport', 'fun', ...customCategories.map(c => c.toLowerCase())]
  if (allCategories.includes(name.toLowerCase())) {
    errEl.textContent = 'Category already exists.'
    return false
  }

  errEl.textContent = ''
  return true
}

// ── Event Handlers ─────────────────────────────────────
function handleTransactionSubmit(e) {
  e.preventDefault()
  if (!validateTransactionForm()) return

  const transaction = {
    id:       generateId(),
    name:     document.getElementById('item-name').value.trim(),
    amount:   parseFloat(document.getElementById('item-amount').value),
    category: document.getElementById('item-category').value,
  }

  transactions.push(transaction)
  saveTransactions()
  renderBalance()
  renderTransactionList()
  renderChart()

  document.getElementById('item-name').value     = ''
  document.getElementById('item-amount').value   = ''
  document.getElementById('item-category').value = ''
}

function handleDeleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id)
  saveTransactions()
  renderBalance()
  renderTransactionList()
  renderChart()
}

function handleAddCategory() {
  if (!validateCategoryForm()) return

  const name = document.getElementById('new-category-name').value.trim()
  customCategories.push(name)
  saveCustomCategories()
  populateCategoryDropdown()
  document.getElementById('new-category-name').value = ''
}

function handleSortChange() {
  currentSort = document.getElementById('sort-select').value
  renderTransactionList()
}

function handleThemeToggle() {
  const isDark = document.body.classList.contains('theme-dark')
  const next   = isDark ? 'light' : 'dark'
  document.body.classList.remove('theme-light', 'theme-dark')
  document.body.classList.add('theme-' + next)
  saveTheme(next)
  document.getElementById('theme-toggle').textContent =
    next === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'
}

// ── Event Binding ──────────────────────────────────────
function bindEvents() {
  document.getElementById('transaction-form')
    .addEventListener('submit', handleTransactionSubmit)

  document.getElementById('add-category-btn')
    .addEventListener('click', handleAddCategory)

  document.getElementById('theme-toggle')
    .addEventListener('click', handleThemeToggle)

  document.getElementById('sort-select')
    .addEventListener('change', handleSortChange)

  document.getElementById('transaction-list')
    .addEventListener('click', e => {
      const btn = e.target.closest('.delete-btn')
      if (btn) handleDeleteTransaction(btn.dataset.id)
    })
}

// ── Bootstrap ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init)
