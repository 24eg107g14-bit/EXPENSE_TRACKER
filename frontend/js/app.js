/**
 * app.js — Pocketbook SPA router + all views
 *
 * Pages: login, register, dashboard, transactions (list), transaction form
 *        (add / edit), budgets, goals
 */

/* ── Currency formatter ─────────────────────────────────── */
const fmt = (n) =>
  (window.CONFIG.CURRENCY || '$') +
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── XSS-safe string ────────────────────────────────────── */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ── Toast system ───────────────────────────────────────── */
const Toast = (() => {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  function show(type, title, msg) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || '•'}</span>
      <div class="toast-body">
        <div class="toast-title">${esc(title)}</div>
        ${msg ? `<div class="toast-msg">${esc(msg)}</div>` : ''}
      </div>`;
    c.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove());
    }, 3800);
  }
  return {
    success: (t, m) => show('success', t, m),
    error:   (t, m) => show('error',   t, m),
    info:    (t, m) => show('info',    t, m),
    warning: (t, m) => show('warning', t, m),
  };
})();

/* ── Loading helper ─────────────────────────────────────── */
function loadingHTML() {
  return `<div class="loading-area"><div class="spinner"></div><span>Loading…</span></div>`;
}

/* ── Button loading state ───────────────────────────────── */
function setLoading(btn, on) {
  if (!btn) return;
  if (on) { btn.disabled = true;  btn.classList.add('btn-loading'); }
  else    { btn.disabled = false; btn.classList.remove('btn-loading'); }
}

/* ── Month name helper ──────────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Category emoji map ─────────────────────────────────── */
const CAT_ICON = {
  Salary:'💼', Freelance:'💻', Food:'🍔', Rent:'🏠', Transport:'🚌',
  Utilities:'⚡', Shopping:'🛍️', Health:'🏥', Entertainment:'🎬',
  Education:'📚', Savings:'🏦', Other:'📦',
};

/* ── Chart instances (kept to destroy on re-render) ─────── */
let _charts = {};
function destroyChart(key) { if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; } }

/* ── Chart.js global defaults ───────────────────────────── */
if (window.Chart) {
  Chart.defaults.color = '#8b8fa8';
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
}

/* ══════════════════════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════════════════════ */
const routes = {};
function route(path, fn) { routes[path] = fn; }

function navigate() {
  const raw  = location.hash.replace('#', '') || '/';
  const session = Api.Session.get();

  // Active nav link
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.route === raw.replace(/\/\d+.*/, ''))
  );

  // Auth guard
  const authPaths = ['/login', '/register'];
  if (!session && !authPaths.includes(raw)) { location.hash = '#/login'; return; }
  if (session  && authPaths.includes(raw))  { location.hash = '#/'; return; }

  const appShell  = document.getElementById('app');
  const authShell = document.getElementById('auth-shell');

  if (session) {
    // Update nav user info
    const s = session;
    const av = document.getElementById('nav-avatar');
    if (av) av.textContent = s.name ? s.name[0].toUpperCase() : '?';
    const nn = document.getElementById('nav-name');
    if (nn) nn.textContent = s.name || '—';
    const ne = document.getElementById('nav-email');
    if (ne) ne.textContent = s.email || '—';

    appShell.classList.remove('hidden');
    authShell.classList.add('hidden');
    const view = document.getElementById('view');
    view.innerHTML = loadingHTML();
  } else {
    appShell.classList.add('hidden');
    authShell.classList.remove('hidden');
  }

  // Close mobile sidebar on navigation
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');

  // Match route (support /transactions/123/edit)
  let matchedFn = null;
  let params = {};
  for (const [pattern, fn] of Object.entries(routes)) {
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    const m  = raw.match(re);
    if (m) { matchedFn = fn; params = m.groups || {}; break; }
  }

  if (matchedFn) {
    matchedFn(params);
  } else {
    const target = session ? document.getElementById('view') : document.getElementById('auth-view');
    if (target) target.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Page not found</div><div class="empty-desc"><a href="#/">Go home</a></div></div>`;
  }
}

function render(html) {
  const v = document.getElementById('view');
  if (v) v.innerHTML = html;
}

function renderAuth(html) {
  const v = document.getElementById('auth-view');
  if (v) v.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════ */
route('/login', () => {
  renderAuth(`
    <div class="auth-card">
      <div class="auth-logo">💰</div>
      <h1 class="auth-title">Welcome back</h1>
      <p class="auth-subtitle">Sign in to your Pocketbook account</p>
      <div id="auth-banner"></div>
      <form class="auth-form" id="login-form" novalidate>
        <div class="form-group" id="fg-email">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="inp-email" placeholder="you@example.com" autocomplete="email" />
          <span class="form-error" id="err-email"></span>
        </div>
        <div class="form-group" id="fg-password">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" id="inp-password" placeholder="••••••••" autocomplete="current-password" />
          <span class="form-error" id="err-password"></span>
        </div>
        <button class="btn btn-primary" type="submit" id="btn-login" style="width:100%;justify-content:center;">Sign in</button>
      </form>
      <p class="auth-switch">Don't have an account? <a href="#/register">Create one</a></p>
    </div>
  `);

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('inp-email').value.trim();
    const pass  = document.getElementById('inp-password').value;
    const btn   = document.getElementById('btn-login');

    // Clear errors
    ['email','password'].forEach(f => {
      document.getElementById(`fg-${f}`)?.classList.remove('field-error');
      document.getElementById(`err-${f}`).textContent = '';
    });
    document.getElementById('auth-banner').innerHTML = '';

    if (!email) { setFieldError('email', 'Enter your email'); return; }
    if (!pass)  { setFieldError('password', 'Enter your password'); return; }

    setLoading(btn, true);
    try {
      const session = await Api.login(email, pass);
      Api.Session.set(session);
      location.hash = '#/';
    } catch (err) {
      showBanner('error', err.message || 'Login failed');
    } finally {
      setLoading(btn, false);
    }
  });
});

/* ══════════════════════════════════════════════════════════
   REGISTER PAGE
   ══════════════════════════════════════════════════════════ */
route('/register', () => {
  renderAuth(`
    <div class="auth-card">
      <div class="auth-logo">💰</div>
      <h1 class="auth-title">Create account</h1>
      <p class="auth-subtitle">Start tracking your finances today</p>
      <div id="auth-banner"></div>
      <form class="auth-form" id="reg-form" novalidate>
        <div class="form-group" id="fg-name">
          <label class="form-label">Full name</label>
          <input class="form-input" type="text" id="inp-name" placeholder="Jane Smith" autocomplete="name" />
          <span class="form-error" id="err-name"></span>
        </div>
        <div class="form-group" id="fg-email">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="inp-email" placeholder="you@example.com" autocomplete="email" />
          <span class="form-error" id="err-email"></span>
        </div>
        <div class="form-group" id="fg-password">
          <label class="form-label">Password <span class="text-muted" style="font-weight:400">(8–72 characters)</span></label>
          <input class="form-input" type="password" id="inp-password" placeholder="Choose a strong password" autocomplete="new-password" />
          <span class="form-error" id="err-password"></span>
        </div>
        <button class="btn btn-primary" type="submit" id="btn-register" style="width:100%;justify-content:center;">Create account</button>
      </form>
      <p class="auth-switch">Already have an account? <a href="#/login">Sign in</a></p>
    </div>
  `);

  document.getElementById('reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('inp-name').value.trim();
    const email = document.getElementById('inp-email').value.trim();
    const pass  = document.getElementById('inp-password').value;
    const btn   = document.getElementById('btn-register');

    ['name','email','password'].forEach(f => {
      document.getElementById(`fg-${f}`)?.classList.remove('field-error');
      document.getElementById(`err-${f}`).textContent = '';
    });
    document.getElementById('auth-banner').innerHTML = '';

    let ok = true;
    if (!name)          { setFieldError('name', 'Enter your name'); ok = false; }
    if (!email)         { setFieldError('email', 'Enter your email'); ok = false; }
    if (pass.length < 8){ setFieldError('password', 'Password must be at least 8 characters'); ok = false; }
    if (!ok) return;

    setLoading(btn, true);
    try {
      const session = await Api.register(name, email, pass);
      Api.Session.set(session);
      Toast.success('Account created!', `Welcome, ${session.name}!`);
      location.hash = '#/';
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([f, m]) => setFieldError(f, m));
      } else {
        showBanner('error', err.message || 'Registration failed');
      }
    } finally {
      setLoading(btn, false);
    }
  });
});

/* ══════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════ */
route('/', async () => {
  render(loadingHTML());
  try {
    const [dash, categories] = await Promise.all([Api.dashboard(), Api.categories()]);

    const balNeg = dash.balance < 0;
    render(`
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-subtitle">Your financial overview</div>
        </div>
        <a href="#/transactions/new" class="btn btn-primary">+ Add transaction</a>
      </div>

      <!-- Stat cards -->
      <div class="stats-grid">
        <div class="stat-card income">
          <div class="stat-label">Total Income</div>
          <div class="stat-value">${fmt(dash.income)}</div>
          <div class="stat-icon">📈</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Total Expenses</div>
          <div class="stat-value">${fmt(dash.expenses)}</div>
          <div class="stat-icon">📉</div>
        </div>
        <div class="stat-card balance">
          <div class="stat-label">Balance</div>
          <div class="stat-value ${balNeg ? 'negative' : ''}">${fmt(dash.balance)}</div>
          <div class="stat-icon">💰</div>
        </div>
      </div>

      <!-- Charts + spending -->
      <div class="dashboard-grid">

        <!-- Monthly trends chart -->
        <div class="card card-wide">
          <div class="card-title">
            Monthly Overview
            <div class="year-select-wrap">
              <button class="year-btn" id="yr-prev">◀</button>
              <span class="year-label" id="yr-label">${new Date().getFullYear()}</span>
              <button class="year-btn" id="yr-next">▶</button>
            </div>
          </div>
          <div class="chart-wrap" style="height:240px;"><canvas id="chart-monthly"></canvas></div>
        </div>

        <!-- Category spending -->
        <div class="card">
          <div class="card-title">Spending by Category</div>
          ${dash.spending.length ? `
            <div class="spend-list">
              ${dash.spending.map(s => `
                <div class="spend-item">
                  <div class="spend-row">
                    <span class="spend-cat">${esc(CAT_ICON[s.category] || '📦')} ${esc(s.category)}</span>
                    <span class="spend-amt">${fmt(s.total)}</span>
                  </div>
                  <div class="bar-track"><div class="bar-fill" style="width:${s.percent}%"></div></div>
                </div>`).join('')}
            </div>` :
            `<div class="empty-state" style="padding:1.5rem">
              <div class="empty-icon">📊</div>
              <div class="empty-desc">No expenses yet</div>
            </div>`}
        </div>

        <!-- Category doughnut chart -->
        <div class="card">
          <div class="card-title">Category Breakdown</div>
          ${dash.spending.length
            ? `<div class="chart-wrap" style="height:220px;"><canvas id="chart-donut"></canvas></div>`
            : `<div class="empty-state" style="padding:1.5rem"><div class="empty-icon">🍩</div><div class="empty-desc">No data yet</div></div>`}
        </div>

        <!-- Recent transactions -->
        <div class="card card-wide">
          <div class="card-title">
            Recent Transactions
            <a href="#/transactions" class="btn btn-ghost btn-sm">View all →</a>
          </div>
          ${dash.recent.length ? `
            <div class="recent-list">
              ${dash.recent.map(t => `
                <div class="recent-item">
                  <div class="recent-icon ${t.type.toLowerCase()}">${CAT_ICON[t.category] || '📦'}</div>
                  <div class="recent-main">
                    <div class="recent-cat">${esc(t.category)}</div>
                    <div class="recent-date">${t.date}${t.description ? ` · ` : ''}<span class="recent-desc">${esc(t.description || '')}</span></div>
                  </div>
                  <div class="recent-amt ${t.type === 'INCOME' ? 'amount-income' : 'amount-expense'}">
                    ${t.type === 'INCOME' ? '+' : '-'}${fmt(t.amount)}
                  </div>
                </div>`).join('')}
            </div>` :
            `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-desc">No transactions yet</div></div>`}
        </div>
      </div>
    `);

    // ── Monthly chart ─────────────────────────────────────
    let currentYear = new Date().getFullYear();
    async function loadMonthly(year) {
      destroyChart('monthly');
      document.getElementById('yr-label').textContent = year;
      const rows = await Api.monthlySummary(year).catch(() => []);
      const incArr = new Array(12).fill(0);
      const expArr = new Array(12).fill(0);
      rows.forEach(r => { incArr[r.month - 1] = Number(r.income); expArr[r.month - 1] = Number(r.expenses); });
      const ctx = document.getElementById('chart-monthly');
      if (!ctx) return;
      _charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            { label: 'Income',   data: incArr, backgroundColor: 'rgba(34,197,94,.75)',  borderRadius: 4, borderSkipped: false },
            { label: 'Expenses', data: expArr, backgroundColor: 'rgba(239,68,68,.75)',  borderRadius: 4, borderSkipped: false },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: c => ` ${window.CONFIG.CURRENCY}${c.raw.toLocaleString('en-IN',{minimumFractionDigits:2})}` } } },
          scales: {
            x: { grid: { color: '#2e3149' } },
            y: { grid: { color: '#2e3149' }, ticks: { callback: v => (window.CONFIG.CURRENCY || '$') + v.toLocaleString('en-IN') } }
          }
        }
      });
    }
    await loadMonthly(currentYear);
    document.getElementById('yr-prev').onclick = () => { currentYear--; loadMonthly(currentYear); };
    document.getElementById('yr-next').onclick = () => { currentYear++; loadMonthly(currentYear); };

    // ── Donut chart ───────────────────────────────────────
    if (dash.spending.length) {
      destroyChart('donut');
      const palette = ['#6c63ff','#22c55e','#ef4444','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4','#84cc16','#a78bfa'];
      const donutCtx = document.getElementById('chart-donut');
      if (donutCtx) {
        _charts.donut = new Chart(donutCtx, {
          type: 'doughnut',
          data: {
            labels: dash.spending.map(s => s.category),
            datasets: [{ data: dash.spending.map(s => Number(s.total)), backgroundColor: palette, borderWidth: 2, borderColor: '#1a1d27' }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 12, padding: 14 } },
              tooltip: { callbacks: { label: c => ` ${fmt(c.raw)}` } }
            }
          }
        });
      }
    }

  } catch (err) {
    render(`<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load dashboard</div><div class="empty-desc">${esc(err.message)}</div></div>`);
  }
});

/* ══════════════════════════════════════════════════════════
   TRANSACTIONS LIST
   ══════════════════════════════════════════════════════════ */
let _txPage = 0;
let _txFilters = { category: '', from: '', to: '', type: '' };
let _txSort  = { col: null, dir: 1 };

route('/transactions', async () => {
  _txPage = 0;
  _txFilters = { category: '', from: '', to: '', type: '' };

  render(loadingHTML());

  let cats = [];
  try { cats = await Api.categories(); } catch (_) {}

  const catOptions = ['', ...cats].map(c => `<option value="${esc(c)}">${c || 'All categories'}</option>`).join('');

  render(`
    <div class="page-header">
      <div>
        <div class="page-title">Transactions</div>
        <div class="page-subtitle">All your income and expenses</div>
      </div>
      <a href="#/transactions/new" class="btn btn-primary">+ Add transaction</a>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label">Category</label>
        <select class="form-input form-select" id="f-category">${catOptions}</select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Type</label>
        <select class="form-input form-select" id="f-type">
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">From</label>
        <input class="form-input" type="date" id="f-from" />
      </div>
      <div class="filter-group">
        <label class="filter-label">To</label>
        <input class="form-input" type="date" id="f-to" />
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" id="btn-filter">Filter</button>
        <button class="btn btn-secondary" id="btn-reset">Reset</button>
        <button class="btn btn-secondary" id="btn-export" title="Download CSV">⬇ CSV</button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap" id="tx-table-area">${loadingHTML()}</div>
  `);

  async function loadTable() {
    const area = document.getElementById('tx-table-area');
    if (!area) return;
    area.innerHTML = loadingHTML();

    try {
      let data;
      const hasFilter = _txFilters.category || _txFilters.from || _txFilters.to || _txFilters.type || _txPage > 0;
      if (hasFilter) {
        data = await Api.transactionsFiltered({ ..._txFilters, page: _txPage, size: 20 });
      } else {
        const arr = await Api.transactions();
        data = { content: arr, page: 0, size: arr.length, totalElements: arr.length, totalPages: 1 };
      }

      if (!data.content.length) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No transactions found</div><div class="empty-desc">Try adjusting the filters or <a href="#/transactions/new">add one</a>.</div></div>`;
        return;
      }

      const rows = data.content.map(t => `
        <tr>
          <td>${esc(t.date)}</td>
          <td><span class="badge badge-${t.type.toLowerCase()}">${esc(t.type)}</span></td>
          <td>${CAT_ICON[t.category] || '📦'} ${esc(t.category)}</td>
          <td class="${t.type === 'INCOME' ? 'amount-income' : 'amount-expense'}">
            ${t.type === 'INCOME' ? '+' : '-'}${fmt(t.amount)}
          </td>
          <td class="text-muted" style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.description || '—')}</td>
          <td class="actions">
            <a href="#/transactions/${t.id}/edit" class="btn btn-ghost btn-sm btn-icon" title="Edit">✏️</a>
            <button class="btn btn-ghost btn-sm btn-icon btn-del" data-id="${t.id}" title="Delete">🗑️</button>
          </td>
        </tr>`).join('');

      const totalPages = data.totalPages || 1;
      const currentPage = data.page || 0;

      let pagination = '';
      if (totalPages > 1) {
        const btns = [];
        for (let i = 0; i < totalPages; i++) {
          btns.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}" data-pg="${i}">${i + 1}</button>`);
        }
        pagination = `
          <div class="pagination">
            <button class="page-btn" id="pg-prev" ${currentPage === 0 ? 'disabled' : ''}>‹ Prev</button>
            ${btns.join('')}
            <button class="page-btn" id="pg-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next ›</button>
            <span class="page-info">${data.totalElements} total</span>
          </div>`;
      }

      area.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${pagination}`;

      // Delete buttons
      area.querySelectorAll('.btn-del').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Delete this transaction? This cannot be undone.')) return;
          setLoading(btn, true);
          try {
            await Api.deleteTransaction(btn.dataset.id);
            Toast.success('Deleted', 'Transaction removed.');
            loadTable();
          } catch (err) {
            Toast.error('Error', err.message);
            setLoading(btn, false);
          }
        };
      });

      // Pagination
      area.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { _txPage = +b.dataset.pg; loadTable(); });
      const prev = area.querySelector('#pg-prev');
      const next = area.querySelector('#pg-next');
      if (prev) prev.onclick = () => { _txPage = Math.max(0, _txPage - 1); loadTable(); };
      if (next) next.onclick = () => { _txPage++; loadTable(); };

    } catch (err) {
      area.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading transactions</div><div class="empty-desc">${esc(err.message)}</div></div>`;
    }
  }

  await loadTable();

  // Filter buttons
  document.getElementById('btn-filter').onclick = () => {
    _txPage = 0;
    _txFilters = {
      category: document.getElementById('f-category').value,
      type:     document.getElementById('f-type').value,
      from:     document.getElementById('f-from').value,
      to:       document.getElementById('f-to').value,
    };
    loadTable();
  };

  document.getElementById('btn-reset').onclick = () => {
    ['f-category','f-type','f-from','f-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    _txPage = 0;
    _txFilters = { category: '', from: '', to: '', type: '' };
    loadTable();
  };

  document.getElementById('btn-export').onclick = async () => {
    const btn = document.getElementById('btn-export');
    setLoading(btn, true);
    try {
      const blob = await Api.exportCsv(_txFilters);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'transactions.csv'; a.click();
      URL.revokeObjectURL(url);
      Toast.success('Export complete', 'transactions.csv downloaded.');
    } catch (err) {
      Toast.error('Export failed', err.message);
    } finally {
      setLoading(btn, false);
    }
  };
});

/* ══════════════════════════════════════════════════════════
   TRANSACTION FORM  (add + edit)
   ══════════════════════════════════════════════════════════ */
async function transactionForm(id) {
  render(loadingHTML());
  const isEdit = !!id;

  let cats = [], existing = null;
  try {
    cats = await Api.categories();
    if (isEdit) existing = await Api.transaction(id);
  } catch (err) {
    render(`<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${esc(err.message)}</div></div>`);
    return;
  }

  const v = (f) => existing ? esc(existing[f] ?? '') : '';
  const catOpts = cats.map(c => `<option value="${esc(c)}" ${existing?.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('');

  render(`
    <div class="page-header">
      <div>
        <div class="page-title">${isEdit ? 'Edit' : 'Add'} Transaction</div>
        <div class="page-subtitle">${isEdit ? 'Update the details below' : 'Record a new income or expense'}</div>
      </div>
      <a href="#/transactions" class="btn btn-secondary">← Back</a>
    </div>

    <div class="form-card">
      <div id="form-banner"></div>
      <form id="tx-form" novalidate>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-group" id="fg-type">
              <label class="form-label">Type</label>
              <select class="form-select" id="inp-type">
                <option value="EXPENSE" ${existing?.type === 'EXPENSE' || !isEdit ? 'selected' : ''}>Expense</option>
                <option value="INCOME"  ${existing?.type === 'INCOME' ? 'selected' : ''}>Income</option>
              </select>
              <span class="form-error" id="err-type"></span>
            </div>
            <div class="form-group" id="fg-amount">
              <label class="form-label">Amount</label>
              <input class="form-input" type="number" id="inp-amount" step="0.01" min="0.01" placeholder="0.00" value="${v('amount')}" />
              <span class="form-error" id="err-amount"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" id="fg-category">
              <label class="form-label">Category</label>
              <select class="form-select" id="inp-category">
                <option value="">Choose category</option>
                ${catOpts}
              </select>
              <span class="form-error" id="err-category"></span>
            </div>
            <div class="form-group" id="fg-date">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" id="inp-date" value="${v('date') || new Date().toISOString().slice(0,10)}" />
              <span class="form-error" id="err-date"></span>
            </div>
          </div>
          <div class="form-group" id="fg-description">
            <label class="form-label">Description <span class="text-muted" style="font-weight:400">(optional)</span></label>
            <input class="form-input" type="text" id="inp-description" maxlength="255" placeholder="e.g. Grocery shopping" value="${v('description')}" />
            <span class="form-error" id="err-description"></span>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" id="btn-save">${isEdit ? 'Save changes' : 'Add transaction'}</button>
          <a href="#/transactions" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `);

  document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type        = document.getElementById('inp-type').value;
    const amount      = document.getElementById('inp-amount').value;
    const category    = document.getElementById('inp-category').value;
    const date        = document.getElementById('inp-date').value;
    const description = document.getElementById('inp-description').value.trim();
    const btn         = document.getElementById('btn-save');

    // Clear errors
    ['type','amount','category','date','description'].forEach(f => {
      document.getElementById(`fg-${f}`)?.classList.remove('field-error');
      document.getElementById(`err-${f}`).textContent = '';
    });
    document.getElementById('form-banner').innerHTML = '';

    let ok = true;
    if (!category) { setFieldError('category', 'Choose a category'); ok = false; }
    if (!amount || +amount <= 0) { setFieldError('amount', 'Enter a valid amount greater than zero'); ok = false; }
    if (!date) { setFieldError('date', 'Pick a date'); ok = false; }
    if (!ok) return;

    setLoading(btn, true);
    const payload = { type, amount: +amount, category, date, description: description || null };
    try {
      if (isEdit) { await Api.updateTransaction(id, payload); Toast.success('Saved!', 'Transaction updated.'); }
      else        { await Api.createTransaction(payload);     Toast.success('Added!', 'Transaction recorded.'); }
      location.hash = '#/transactions';
    } catch (err) {
      if (err.errors) Object.entries(err.errors).forEach(([f, m]) => setFieldError(f, m));
      else document.getElementById('form-banner').innerHTML = `<div class="form-banner error">${esc(err.message)}</div>`;
      setLoading(btn, false);
    }
  });
}

route('/transactions/new',      () => transactionForm(null));
route('/transactions/:id/edit', ({ id }) => transactionForm(id));

/* ══════════════════════════════════════════════════════════
   BUDGETS
   ══════════════════════════════════════════════════════════ */
route('/budgets', async () => {
  render(loadingHTML());
  let cats = [];
  try { cats = await Api.categories(); } catch (_) {}

  const catOpts = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  render(`
    <div class="page-header">
      <div>
        <div class="page-title">Budgets</div>
        <div class="page-subtitle">Set spending limits by category</div>
      </div>
    </div>

    <!-- Add budget form -->
    <div class="form-card" style="max-width:100%;margin-bottom:1.75rem">
      <div class="card-title" style="margin-bottom:1rem">Create Budget</div>
      <div id="budget-banner"></div>
      <form id="budget-form" novalidate>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-group" id="fg-category">
              <label class="form-label">Category</label>
              <select class="form-select" id="b-category"><option value="">Choose category</option>${catOpts}</select>
              <span class="form-error" id="err-category"></span>
            </div>
            <div class="form-group" id="fg-limit">
              <label class="form-label">Monthly Limit</label>
              <input class="form-input" type="number" id="b-limit" step="0.01" min="0.01" placeholder="e.g. 5000.00" />
              <span class="form-error" id="err-limit"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" id="fg-start">
              <label class="form-label">Start date</label>
              <input class="form-input" type="date" id="b-start" />
              <span class="form-error" id="err-start"></span>
            </div>
            <div class="form-group" id="fg-end">
              <label class="form-label">End date</label>
              <input class="form-input" type="date" id="b-end" />
              <span class="form-error" id="err-end"></span>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" id="btn-add-budget">Create budget</button>
        </div>
      </form>
    </div>

    <!-- Budget list -->
    <div id="budget-list">${loadingHTML()}</div>
  `);

  // Set sane default dates (1st of current month → last day)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);
  document.getElementById('b-start').value = firstDay;
  document.getElementById('b-end').value   = lastDay;

  async function loadBudgets() {
    const area = document.getElementById('budget-list');
    if (!area) return;
    area.innerHTML = loadingHTML();
    try {
      const budgets = await Api.budgets();
      if (!budgets.length) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No budgets yet</div><div class="empty-desc">Create your first budget above.</div></div>`;
        return;
      }
      area.innerHTML = `<div class="budget-grid">${budgets.map(b => {
        const cls = b.exceeded ? 'danger' : b.percent >= 75 ? 'warn' : '';
        return `
          <div class="budget-card">
            <div class="budget-header">
              <div>
                <div class="budget-cat">${esc(CAT_ICON[b.category] || '📦')} ${esc(b.category)}</div>
                <div class="budget-dates">${b.startDate} → ${b.endDate}</div>
              </div>
              <button class="btn btn-ghost btn-sm btn-icon del-budget" data-id="${b.id}" title="Delete budget">🗑️</button>
            </div>
            <div class="budget-amounts">
              <span class="text-muted">Spent: <strong>${fmt(b.spent)}</strong></span>
              <span class="text-muted">Limit: <strong>${fmt(b.limitAmount)}</strong></span>
            </div>
            <div class="budget-track">
              <div class="budget-fill ${cls}" style="width:${b.percent}%"></div>
            </div>
            <div class="budget-footer">
              <span class="budget-remaining ${b.exceeded ? 'over' : ''}">
                ${b.exceeded ? '⚠️ Over by ' + fmt(Math.abs(b.remaining)) : 'Remaining: ' + fmt(b.remaining)}
              </span>
              ${b.exceeded ? '<span class="exceeded-badge">Exceeded</span>' : `<span class="text-muted">${b.percent}%</span>`}
            </div>
          </div>`;
      }).join('')}</div>`;

      area.querySelectorAll('.del-budget').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Delete this budget?')) return;
          setLoading(btn, true);
          try { await Api.deleteBudget(btn.dataset.id); Toast.success('Deleted', 'Budget removed.'); loadBudgets(); }
          catch (err) { Toast.error('Error', err.message); setLoading(btn, false); }
        };
      });
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading budgets</div><div class="empty-desc">${esc(err.message)}</div></div>`;
    }
  }

  await loadBudgets();

  document.getElementById('budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const category    = document.getElementById('b-category').value;
    const limitAmount = document.getElementById('b-limit').value;
    const startDate   = document.getElementById('b-start').value;
    const endDate     = document.getElementById('b-end').value;
    const btn         = document.getElementById('btn-add-budget');

    ['category','limit','start','end'].forEach(f => {
      document.getElementById(`fg-${f}`)?.classList.remove('field-error');
      const err = document.getElementById(`err-${f}`); if (err) err.textContent = '';
    });
    document.getElementById('budget-banner').innerHTML = '';

    let ok = true;
    if (!category)    { setFieldError('category', 'Choose a category'); ok = false; }
    if (!limitAmount || +limitAmount <= 0) { setFieldError('limit', 'Enter a valid limit'); ok = false; }
    if (!startDate)   { setFieldError('start', 'Pick a start date'); ok = false; }
    if (!endDate)     { setFieldError('end', 'Pick an end date'); ok = false; }
    if (ok && endDate < startDate) { setFieldError('end', 'End date must be on or after start date'); ok = false; }
    if (!ok) return;

    setLoading(btn, true);
    try {
      await Api.createBudget({ category, limitAmount: +limitAmount, startDate, endDate });
      Toast.success('Budget created!', `${category} budget set.`);
      document.getElementById('b-category').value = '';
      document.getElementById('b-limit').value = '';
      loadBudgets();
    } catch (err) {
      if (err.errors) Object.entries(err.errors).forEach(([f, m]) => setFieldError(f, m));
      else document.getElementById('budget-banner').innerHTML = `<div class="form-banner error">${esc(err.message)}</div>`;
    } finally {
      setLoading(btn, false);
    }
  });
});

/* ══════════════════════════════════════════════════════════
   SAVINGS GOALS
   ══════════════════════════════════════════════════════════ */
route('/goals', async () => {
  render(loadingHTML());

  render(`
    <div class="page-header">
      <div>
        <div class="page-title">Savings Goals</div>
        <div class="page-subtitle">Track progress toward your financial targets</div>
      </div>
    </div>

    <!-- Add goal form -->
    <div class="form-card" style="max-width:100%;margin-bottom:1.75rem">
      <div class="card-title" style="margin-bottom:1rem">New Goal</div>
      <div id="goal-banner"></div>
      <form id="goal-form" novalidate>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-group" id="fg-name">
              <label class="form-label">Goal name</label>
              <input class="form-input" type="text" id="g-name" maxlength="100" placeholder="e.g. Emergency fund" />
              <span class="form-error" id="err-name"></span>
            </div>
            <div class="form-group" id="fg-target">
              <label class="form-label">Target amount</label>
              <input class="form-input" type="number" id="g-target" step="0.01" min="0.01" placeholder="e.g. 50000.00" />
              <span class="form-error" id="err-target"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Target date <span class="text-muted">(optional)</span></label>
              <input class="form-input" type="date" id="g-date" />
            </div>
            <div class="form-group">
              <label class="form-label">Notes <span class="text-muted">(optional)</span></label>
              <input class="form-input" type="text" id="g-notes" maxlength="500" placeholder="Any notes…" />
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" id="btn-add-goal">Create goal</button>
        </div>
      </form>
    </div>

    <!-- Goal list -->
    <div id="goals-list">${loadingHTML()}</div>

    <!-- Deposit modal -->
    <div id="deposit-modal" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-title">Add Savings</div>
        <div class="form-group" id="fg-dep-amount">
          <label class="form-label">Amount to add</label>
          <input class="form-input" type="number" id="dep-amount" step="0.01" min="0.01" placeholder="0.00" />
          <span class="form-error" id="err-dep-amount"></span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="btn-deposit-confirm">Add</button>
          <button class="btn btn-secondary" id="btn-deposit-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `);

  let _depositGoalId = null;

  async function loadGoals() {
    const area = document.getElementById('goals-list');
    if (!area) return;
    area.innerHTML = loadingHTML();
    try {
      const goals = await Api.goals();
      if (!goals.length) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No goals yet</div><div class="empty-desc">Create your first savings goal above.</div></div>`;
        return;
      }
      area.innerHTML = `<div class="goals-grid">${goals.map(g => `
        <div class="goal-card ${g.achieved ? 'achieved' : ''}">
          <div class="goal-header">
            <div>
              <div class="goal-name">${esc(g.name)}</div>
              <div class="goal-meta">${g.targetDate ? `Target: ${g.targetDate}` : 'No target date'}${g.notes ? ` · ${esc(g.notes)}` : ''}</div>
            </div>
            ${g.achieved ? '<span class="achieved-badge">✅ Achieved</span>' : ''}
          </div>
          <div class="goal-track">
            <div class="goal-fill ${g.achieved ? 'done' : ''}" style="width:${g.percent}%"></div>
          </div>
          <div class="goal-amounts">
            <span class="text-muted">Saved: <strong class="text-green">${fmt(g.savedAmount)}</strong></span>
            <span class="text-muted">Target: <strong>${fmt(g.targetAmount)}</strong> <span class="text-muted">(${g.percent}%)</span></span>
          </div>
          <div class="goal-footer">
            <button class="btn btn-success btn-sm deposit-btn" data-id="${g.id}">+ Add savings</button>
            <button class="btn btn-danger btn-sm del-goal" data-id="${g.id}">Delete</button>
          </div>
        </div>`).join('')}</div>`;

      area.querySelectorAll('.deposit-btn').forEach(btn => {
        btn.onclick = () => {
          _depositGoalId = btn.dataset.id;
          document.getElementById('dep-amount').value = '';
          document.getElementById('err-dep-amount').textContent = '';
          document.getElementById('deposit-modal').classList.remove('hidden');
          document.getElementById('dep-amount').focus();
        };
      });

      area.querySelectorAll('.del-goal').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Delete this goal?')) return;
          setLoading(btn, true);
          try { await Api.deleteGoal(btn.dataset.id); Toast.success('Deleted', 'Goal removed.'); loadGoals(); }
          catch (err) { Toast.error('Error', err.message); setLoading(btn, false); }
        };
      });
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading goals</div><div class="empty-desc">${esc(err.message)}</div></div>`;
    }
  }

  await loadGoals();

  // Add goal form
  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name       = document.getElementById('g-name').value.trim();
    const targetAmt  = document.getElementById('g-target').value;
    const targetDate = document.getElementById('g-date').value || null;
    const notes      = document.getElementById('g-notes').value.trim() || null;
    const btn        = document.getElementById('btn-add-goal');

    ['name','target'].forEach(f => {
      document.getElementById(`fg-${f}`)?.classList.remove('field-error');
      const err = document.getElementById(`err-${f}`); if (err) err.textContent = '';
    });
    document.getElementById('goal-banner').innerHTML = '';

    let ok = true;
    if (!name)                       { setFieldError('name', 'Enter a goal name'); ok = false; }
    if (!targetAmt || +targetAmt <= 0){ setFieldError('target', 'Enter a valid target amount'); ok = false; }
    if (!ok) return;

    setLoading(btn, true);
    try {
      await Api.createGoal({ name, targetAmount: +targetAmt, targetDate, notes });
      Toast.success('Goal created!', name);
      document.getElementById('g-name').value = '';
      document.getElementById('g-target').value = '';
      document.getElementById('g-date').value = '';
      document.getElementById('g-notes').value = '';
      loadGoals();
    } catch (err) {
      if (err.errors) Object.entries(err.errors).forEach(([f, m]) => setFieldError(f, m));
      else document.getElementById('goal-banner').innerHTML = `<div class="form-banner error">${esc(err.message)}</div>`;
    } finally {
      setLoading(btn, false);
    }
  });

  // Deposit modal
  document.getElementById('btn-deposit-confirm').onclick = async () => {
    const amt = document.getElementById('dep-amount').value;
    const btn = document.getElementById('btn-deposit-confirm');
    document.getElementById('err-dep-amount').textContent = '';
    if (!amt || +amt <= 0) { document.getElementById('err-dep-amount').textContent = 'Enter a valid amount'; return; }
    setLoading(btn, true);
    try {
      await Api.depositGoal(_depositGoalId, +amt);
      Toast.success('Saved!', `${fmt(amt)} added to goal.`);
      document.getElementById('deposit-modal').classList.add('hidden');
      loadGoals();
    } catch (err) {
      document.getElementById('err-dep-amount').textContent = err.message;
    } finally {
      setLoading(btn, false);
    }
  };

  document.getElementById('btn-deposit-cancel').onclick = () => {
    document.getElementById('deposit-modal').classList.add('hidden');
  };

  document.getElementById('deposit-modal').onclick = (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  };
});

/* ══════════════════════════════════════════════════════════
   HELPERS — field errors, banners
   ══════════════════════════════════════════════════════════ */
function setFieldError(field, msg) {
  const fg  = document.getElementById(`fg-${field}`);
  const err = document.getElementById(`err-${field}`);
  if (fg)  fg.classList.add('field-error');
  if (err) err.textContent = msg;
}

function showBanner(type, msg) {
  const el = document.getElementById('auth-banner');
  if (el) el.innerHTML = `<div class="form-banner ${type}">${esc(msg)}</div>`;
}

/* ══════════════════════════════════════════════════════════
   BOOTSTRAP
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (!confirm('Sign out?')) return;
    Api.Session.clear();
    Object.keys(_charts).forEach(k => destroyChart(k));
    location.hash = '#/login';
  });

  // Mobile hamburger
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Router
  window.addEventListener('hashchange', navigate);
  navigate();
});
