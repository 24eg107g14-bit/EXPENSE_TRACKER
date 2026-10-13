(function () {
  'use strict';
  const app = document.getElementById('app');

  // ---------- helpers ----------
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => (n < 0 ? '-' : '') + CONFIG.CURRENCY +
    Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

  function shell(active, inner) {
    const s = Api.session();
    const links = [['#/', 'dashboard', 'Dashboard'], ['#/transactions', 'transactions', 'Transactions'], ['#/budgets', 'budgets', 'Budgets']];
    app.innerHTML =
      '<div class="shell"><aside class="side"><div class="brand">Pocketbook</div><nav>' +
      links.map((l) => '<a href="' + l[0] + '" class="' + (active === l[1] ? 'on' : '') + '">' + l[2] + '</a>').join('') +
      '</nav><span class="who">' + esc(s.name) + '</span><button class="link" id="logout">Log out</button></aside>' +
      '<main>' + inner + '</main></div>';
    document.getElementById('logout').onclick = () => { Api.clear(); location.hash = '#/login'; };
  }

  function bindForm(form, submit) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const msg = form.querySelector('[data-msg]');
      form.querySelectorAll('.err').forEach((e) => { e.textContent = ''; });
      msg.hidden = true;
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        await submit(Object.fromEntries(new FormData(form)));
      } catch (e) {
        msg.textContent = e.message;
        msg.hidden = false;
        Object.keys(e.fields || {}).forEach((k) => {
          const el = form.querySelector('[data-for="' + k + '"]');
          if (el) el.textContent = e.fields[k];
        });
      } finally {
        btn.disabled = false;
      }
    });
  }

  const field = (label, name, attrs) =>
    '<label>' + label + '<input name="' + name + '" ' + (attrs || '') + '><span class="err" data-for="' + name + '"></span></label>';
  const categorySelect = (cats, selected) =>
    '<label>Category<select name="category" required><option value="">Choose a category</option>' +
    cats.map((c) => '<option' + (c === selected ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
    '</select><span class="err" data-for="category"></span></label>';

  // ---------- shared fragments ----------
  const budgetRow = (b) =>
    '<li><span>' + esc(b.category) + '</span><b class="' + (b.exceeded ? 'neg' : '') + '">' + money(b.spent) + ' of ' + money(b.limitAmount) +
    '</b><div class="bar ' + (b.exceeded ? 'over' : '') + '"><i style="width:' + b.percent + '%"></i></div></li>';

  function txTable(list, withActions) {
    return '<table>' + (withActions ? '<thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="amt">Amount</th><th></th></tr></thead>' : '') + '<tbody>' +
      list.map((t) => {
        const income = t.type === 'INCOME';
        return '<tr><td>' + esc(t.date) + '</td><td>' + esc(t.category) + '</td><td class="' + (withActions ? '' : 'sub') + '">' + esc(t.description) + '</td>' +
          '<td class="amt ' + (income ? 'pos' : 'neg') + '">' + (income ? '+' : '-') + money(t.amount) + '</td>' +
          (withActions ? '<td class="act"><a class="btn ghost small" href="#/transactions/' + t.id + '/edit">Edit</a> ' +
            '<button class="btn danger small" data-del="' + t.id + '">Delete</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  // ---------- views ----------
  function login() {
    app.innerHTML = '<main class="auth"><h1>Log in to Pocketbook</h1><form class="stack" id="f">' +
      '<p class="notice bad" data-msg hidden></p>' +
      field('Email', 'email', 'type="email" autocomplete="email" required autofocus') +
      field('Password', 'password', 'type="password" autocomplete="current-password" required') +
      '<button class="btn" type="submit">Log in</button></form>' +
      '<p class="sub">New here? <a href="#/register">Create an account</a></p></main>';
    bindForm(document.getElementById('f'), async (d) => {
      Api.setSession(await Api.post('/api/auth/login', d));
      location.hash = '#/';
    });
  }

  function register() {
    app.innerHTML = '<main class="auth"><h1>Create your account</h1><form class="stack" id="f">' +
      '<p class="notice bad" data-msg hidden></p>' +
      field('Name', 'name', 'type="text" autocomplete="name" required autofocus') +
      field('Email', 'email', 'type="email" autocomplete="email" required') +
      field('Password (8 or more characters)', 'password', 'type="password" autocomplete="new-password" minlength="8" required') +
      '<button class="btn" type="submit">Create account</button></form>' +
      '<p class="sub">Already registered? <a href="#/login">Log in</a></p></main>';
    bindForm(document.getElementById('f'), async (d) => {
      Api.setSession(await Api.post('/api/auth/register', d));
      location.hash = '#/';
    });
  }

  async function dashboard() {
    const res = await Promise.all([Api.get('/api/dashboard'), Api.get('/api/budgets')]);
    const d = res[0], budgets = res[1];
    shell('dashboard',
      '<div class="top"><h1>Dashboard</h1><a class="btn" href="#/transactions/new">Add transaction</a></div>' +
      '<section class="balance"><p class="label">Available balance</p><p class="big ' + (d.balance < 0 ? 'neg' : '') + '">' + money(d.balance) + '</p>' +
      '<p class="split"><span class="inc">Income <b>' + money(d.income) + '</b></span><span class="exp">Spent <b>' + money(d.expenses) + '</b></span></p></section>' +
      '<div class="cols"><section class="panel"><h2>Spending by category</h2>' +
      (d.spending.length
        ? '<ul class="bars">' + d.spending.map((s) => '<li><span>' + esc(s.category) + '</span><b>' + money(s.total) + '</b><div class="bar"><i style="width:' + s.percent + '%"></i></div></li>').join('') + '</ul>'
        : '<p class="empty">No expenses yet. Add one to see where your money goes.</p>') +
      '</section><section class="panel"><h2>Budgets</h2>' +
      (budgets.length ? '<ul class="bars">' + budgets.map(budgetRow).join('') + '</ul>'
        : '<p class="empty">No budgets yet. <a href="#/budgets">Set a spending limit</a>.</p>') +
      '</section></div><section class="panel"><h2>Recent transactions</h2>' +
      (d.recent.length ? txTable(d.recent, false) : '<p class="empty">Nothing recorded yet.</p>') + '</section>');
  }

  async function transactions() {
    const list = await Api.get('/api/transactions');
    shell('transactions',
      '<div class="top"><h1>Transactions</h1><a class="btn" href="#/transactions/new">Add transaction</a></div>' +
      (list.length ? txTable(list, true) : '<p class="empty">No transactions yet. Add your first income or expense.</p>'));
    app.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Delete this transaction?')) return;
        try { await Api.del('/api/transactions/' + b.dataset.del); transactions(); } catch (e) { alert(e.message); }
      };
    });
  }

  async function txForm(id) {
    const blank = { type: 'EXPENSE', amount: '', category: '', date: iso(new Date()), description: '' };
    const res = await Promise.all([Api.get('/api/categories'), id ? Api.get('/api/transactions/' + id) : Promise.resolve(blank)]);
    const cats = res[0], t = res[1];
    shell('transactions',
      '<div class="top"><h1>' + (id ? 'Edit transaction' : 'Add transaction') + '</h1></div>' +
      '<form class="stack" id="f"><p class="notice bad" data-msg hidden></p>' +
      '<div class="radios"><label><input type="radio" name="type" value="EXPENSE"' + (t.type === 'EXPENSE' ? ' checked' : '') + '> Expense</label>' +
      '<label><input type="radio" name="type" value="INCOME"' + (t.type === 'INCOME' ? ' checked' : '') + '> Income</label></div>' +
      field('Amount', 'amount', 'type="number" step="0.01" min="0.01" required value="' + esc(t.amount) + '"') +
      categorySelect(cats, t.category) +
      field('Date', 'date', 'type="date" required value="' + esc(t.date) + '"') +
      field('Description', 'description', 'type="text" maxlength="255" value="' + esc(t.description) + '"') +
      '<div><button class="btn" type="submit">Save transaction</button> <a class="btn ghost" href="#/transactions">Cancel</a></div></form>');
    bindForm(document.getElementById('f'), async (d) => {
      const body = { type: d.type, amount: Number(d.amount), category: d.category, date: d.date, description: d.description || null };
      if (id) await Api.put('/api/transactions/' + id, body); else await Api.post('/api/transactions', body);
      location.hash = '#/transactions';
    });
  }

  async function budgets() {
    const res = await Promise.all([Api.get('/api/categories'), Api.get('/api/budgets')]);
    const cats = res[0], list = res[1];
    const today = new Date();
    const start = iso(new Date(today.getFullYear(), today.getMonth(), 1));
    const end = iso(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    shell('budgets',
      '<div class="top"><h1>Budgets</h1></div><div class="cols"><section class="panel"><h2>Set a spending limit</h2>' +
      '<form class="stack" id="f"><p class="notice bad" data-msg hidden></p>' + categorySelect(cats, '') +
      field('Limit', 'limitAmount', 'type="number" step="0.01" min="0.01" required') +
      field('Start date', 'startDate', 'type="date" required value="' + start + '"') +
      field('End date', 'endDate', 'type="date" required value="' + end + '"') +
      '<button class="btn" type="submit">Save budget</button></form></section>' +
      '<section class="panel"><h2>Your budgets</h2>' +
      (list.length ? '<ul class="bars">' + list.map((b) =>
        '<li><span><b>' + esc(b.category) + '</b> <span class="sub">' + esc(b.startDate) + ' to ' + esc(b.endDate) + '</span></span>' +
        '<b class="' + (b.exceeded ? 'neg' : '') + '">' + money(b.spent) + ' of ' + money(b.limitAmount) + '</b>' +
        '<div class="bar ' + (b.exceeded ? 'over' : '') + '"><i style="width:' + b.percent + '%"></i></div>' +
        '<span class="sub">' + (b.exceeded ? 'Over by ' + money(-b.remaining) : money(b.remaining) + ' left') + '</span>' +
        '<button class="btn danger small" data-del="' + b.id + '">Delete</button></li>').join('') + '</ul>'
        : '<p class="empty">No budgets yet. Set a limit to start tracking.</p>') + '</section></div>');
    bindForm(document.getElementById('f'), async (d) => {
      await Api.post('/api/budgets', { category: d.category, limitAmount: Number(d.limitAmount), startDate: d.startDate, endDate: d.endDate });
      budgets();
    });
    app.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Delete this budget?')) return;
        try { await Api.del('/api/budgets/' + b.dataset.del); budgets(); } catch (e) { alert(e.message); }
      };
    });
  }

  // ---------- router ----------
  const routes = [
    [/^#\/login$/, login], [/^#\/register$/, register], [/^#\/?$/, dashboard],
    [/^#\/transactions$/, transactions], [/^#\/transactions\/new$/, () => txForm()],
    [/^#\/transactions\/(\d+)\/edit$/, (m) => txForm(m[1])], [/^#\/budgets$/, budgets]
  ];

  async function route() {
    const h = location.hash || '#/';
    const isAuthPage = h === '#/login' || h === '#/register';
    if (!Api.session() && !isAuthPage) { location.hash = '#/login'; return; }
    if (Api.session() && isAuthPage) { location.hash = '#/'; return; }
    for (const r of routes) {
      const m = h.match(r[0]);
      if (m) {
        try { await r[1](m); } catch (e) {
          app.innerHTML = '<main class="auth"><p class="notice bad">' + esc(e.message) + '</p><p><a href="#/login">Back to login</a></p></main>';
        }
        return;
      }
    }
    location.hash = '#/';
  }

  window.addEventListener('hashchange', route);
  route();
})();
