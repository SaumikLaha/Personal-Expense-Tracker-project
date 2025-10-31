/**
 * app.js
 * Personal Expense Tracker - professional, modular code
 * Uses: jQuery, localStorage, Bootstrap 5
 *
 * Storage key: "expenses_v1"
 */

'use strict';

(() => {
  // Storage key and default categories
  const STORAGE_KEY = 'expenses_v1';

  // Cached DOM selectors
  const $form = $('#expense-form');
  const $date = $('#expense-date');
  const $category = $('#expense-category');
  const $desc = $('#expense-desc');
  const $amount = $('#expense-amount');
  const $expensesBody = $('#expenses-body');
  const $totalExpenses = $('#total-expenses');
  const $countExpenses = $('#count-expenses');
  const $categorySummary = $('#category-summary');
  const $filterFrom = $('#filter-from');
  const $filterTo = $('#filter-to');
  const $filterCategory = $('#filter-category');
  const $filterMin = $('#filter-min');
  const $filterMax = $('#filter-max');
  const $filterSearch = $('#filter-search');

  let expenses = []; // in-memory

  // -----------------------------
  // Utility helpers
  // -----------------------------
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const toCurrency = (n) => {
    if (!isFinite(n)) return '₹0.00';
    return '₹' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseDate = (d) => {
    // returns ISO date string yyyy-mm-dd
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    // get local iso date (no time)
    const tzOffset = dt.getTimezoneOffset() * 60000;
    const localISO = new Date(dt.getTime() - tzOffset).toISOString().slice(0, 10);
    return localISO;
  };

  // -----------------------------
  // Storage
  // -----------------------------
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (err) {
      console.error('Failed to load expenses', err);
      return [];
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (err) {
      console.error('Failed to save expenses', err);
    }
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function renderExpenses(list = expenses) {
    $expensesBody.empty();

    if (list.length === 0) {
      $expensesBody.append(`<tr><td colspan="5" class="text-center text-muted py-4">No expenses yet.</td></tr>`);
      renderSummary([]);
      return;
    }

    // sort newest first
    const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(item => {
      const $tr = $(`
        <tr data-id="${item.id}">
          <td class="align-middle" style="min-width:110px">${item.date}</td>
          <td class="align-middle">${escapeHtml(item.category)}</td>
          <td class="align-middle">${escapeHtml(item.description)}</td>
          <td class="align-middle text-end">${toCurrency(item.amount)}</td>
          <td class="align-middle text-center" style="min-width:120px">
            <button class="btn btn-sm btn-outline-danger delete-expense" title="Delete" aria-label="Delete expense">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `);
      $expensesBody.append($tr);
    });

    renderSummary(list);
  }

  function renderSummary(list = expenses) {
    // total and count
    const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
    $totalExpenses.text(toCurrency(total));
    $countExpenses.text(list.length);

    // category totals
    const catTotals = list.reduce((acc, e) => {
      const c = e.category || 'Other';
      acc[c] = (acc[c] || 0) + Number(e.amount || 0);
      return acc;
    }, {});

    $categorySummary.empty();
    const cats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
    if (cats.length === 0) {
      $categorySummary.append(`<div class="col-12 text-muted">No category data</div>`);
      return;
    }

    cats.forEach(c => {
      const amt = catTotals[c];
      const $card = $(`
        <div class="col-6 col-md-4 col-lg-3">
          <div class="category-card p-2">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="small text-muted">${escapeHtml(c)}</div>
                <div class="h6 mb-0">${toCurrency(amt)}</div>
              </div>
              <div class="text-end small text-muted">${Math.round((amt / (Object.values(catTotals).reduce((a,b)=>a+b,0) || 1)) * 100)}%</div>
            </div>
          </div>
        </div>
      `);
      $categorySummary.append($card);
    });
  }

  // -----------------------------
  // Actions
  // -----------------------------
  function addExpense(obj) {
    const expense = {
      id: id(),
      date: parseDate(obj.date),
      category: obj.category.trim(),
      description: obj.description.trim(),
      amount: Number(obj.amount),
      createdAt: new Date().toISOString()
    };
    expenses.push(expense);
    saveToStorage();
    renderExpenses();
  }

  function deleteExpenseById(expId) {
    expenses = expenses.filter(e => e.id !== expId);
    saveToStorage();
    renderExpenses();
  }

  // -----------------------------
  // Filters
  // -----------------------------
  function applyFilters() {
    const from = $filterFrom.val();
    const to = $filterTo.val();
    const category = $filterCategory.val();
    const min = parseFloat($filterMin.val());
    const max = parseFloat($filterMax.val());
    const search = ($filterSearch.val() || '').trim().toLowerCase();

    let filtered = expenses.slice();

    if (from) filtered = filtered.filter(e => e.date >= parseDate(from));
    if (to) filtered = filtered.filter(e => e.date <= parseDate(to));
    if (category) filtered = filtered.filter(e => e.category === category);
    if (!Number.isNaN(min)) filtered = filtered.filter(e => Number(e.amount) >= min);
    if (!Number.isNaN(max)) filtered = filtered.filter(e => Number(e.amount) <= max);
    if (search) {
      filtered = filtered.filter(e =>
        (e.description || '').toLowerCase().includes(search) ||
        (e.category || '').toLowerCase().includes(search) ||
        (String(e.amount) || '').includes(search)
      );
    }

    renderExpenses(filtered);
  }

  function resetFilters() {
    $filterFrom.val('');
    $filterTo.val('');
    $filterCategory.val('');
    $filterMin.val('');
    $filterMax.val('');
    $filterSearch.val('');
    renderExpenses();
  }

  // -----------------------------
  // Helpers: safe text
  // -----------------------------
  function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // -----------------------------
  // CSV Export
  // -----------------------------
  function exportCSV(items = expenses) {
    if (!items || items.length === 0) {
      alert('No expenses to export.');
      return;
    }
    const header = ['Date','Category','Description','Amount'];
    const rows = items.map(i => [i.date, i.category, i.description.replaceAll('"','""'), Number(i.amount).toFixed(2)]);
    const csvContent = [header, ...rows].map(r => r.map(cell => `"${String(cell)}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // -----------------------------
  // Events binding
  // -----------------------------
  function bindEvents() {
    // add expense
    $form.on('submit', (ev) => {
      ev.preventDefault();

      // basic validation
      const dateVal = $date.val();
      const categoryVal = $category.val() || '';
      const descVal = $desc.val() || '';
      const amountVal = $amount.val();

      if (!dateVal || !categoryVal || !descVal || !amountVal) {
        alert('Please fill all fields.');
        return;
      }
      const amountNum = Number(amountVal);
      if (!isFinite(amountNum) || amountNum <= 0) {
        alert('Please enter a valid amount (> 0).');
        return;
      }

      addExpense({
        date: dateVal,
        category: categoryVal,
        description: descVal,
        amount: amountNum
      });

      // reset form
      $form[0].reset();
      $date.focus();
    });

    // clear form
    $('#clear-form').on('click', () => $form[0].reset());

    // delete using event delegation
    $expensesBody.on('click', '.delete-expense', function () {
      const id = $(this).closest('tr').data('id');
      if (!id) return;
      if (!confirm('Delete this expense permanently?')) return;
      deleteExpenseById(id);
    });

    // filters
    $('#apply-filters').on('click', applyFilters);
    $('#clear-filters').on('click', resetFilters);

    // export CSV
    $('#export-csv').on('click', () => exportCSV());

    // reset all (clear localStorage)
    $('#reset-all').on('click', function () {
      if (!confirm('This will delete all expenses permanently from this browser. Continue?')) return;
      expenses = [];
      saveToStorage();
      renderExpenses();
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    // load stored
    expenses = loadFromStorage();

    // render UI
    renderExpenses();

    // set footer year
    $('#year').text(new Date().getFullYear());

    // bind events
    bindEvents();
  }

  // Execute init on DOM ready
  $(document).ready(init);
})();
