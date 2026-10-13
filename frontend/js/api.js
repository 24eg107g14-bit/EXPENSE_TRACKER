/**
 * api.js — HTTP client for Pocketbook backend.
 * Wraps fetch with auth headers, error handling, and auto-logout on 401.
 */

const SESSION_KEY = 'pocketbook.session';

/* ── Session helpers ─────────────────────────────────────── */
const Session = {
  get()   { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } },
  set(s)  { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); },
  clear() { localStorage.removeItem(SESSION_KEY); },
};

/* ── Error type ──────────────────────────────────────────── */
class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

/* ── Core fetch wrapper ──────────────────────────────────── */
async function request(method, path, body, { binary = false } = {}) {
  const session = Session.get();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

  const res = await fetch(`${window.CONFIG.API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-logout on 401 (but not on auth endpoints themselves)
  if (res.status === 401 && !path.startsWith('/api/auth')) {
    Session.clear();
    location.hash = '#/login';
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (res.status === 204) return null; // No Content

  // Handle CSV binary download
  if (binary) {
    if (!res.ok) {
      const json = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new ApiError(res.status, json.message || 'Export failed', json.errors);
    }
    return res.blob();
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, json?.message || `HTTP ${res.status}`, json?.errors);
  }

  return json;
}

/* ── Convenience methods ──────────────────────────────────── */
const get    = (path, opts)       => request('GET',    path, undefined, opts);
const post   = (path, body)       => request('POST',   path, body);
const put    = (path, body)       => request('PUT',    path, body);
const del    = (path)             => request('DELETE', path);

/* ── Public API module ────────────────────────────────────── */
const Api = {

  /* Auth */
  register(name, email, password) { return post('/api/auth/register', { name, email, password }); },
  login(email, password)          { return post('/api/auth/login',    { email, password }); },

  /* Dashboard */
  dashboard()   { return get('/api/dashboard'); },
  categories()  { return get('/api/categories'); },

  /* Transactions — plain list (no filter) */
  transactions() { return get('/api/transactions'); },

  /* Transactions — filtered + paginated */
  transactionsFiltered({ category, from, to, type, page = 0, size = 20 } = {}) {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (from)     p.set('from', from);
    if (to)       p.set('to', to);
    if (type)     p.set('type', type);
    p.set('page', page);
    p.set('size', size);
    return get(`/api/transactions?${p}`);
  },

  /* Transactions — monthly summary */
  monthlySummary(year) { return get(`/api/transactions/summary?year=${year}`); },

  /* Transactions — CSV export (returns Blob) */
  exportCsv({ category, from, to } = {}) {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (from)     p.set('from', from);
    if (to)       p.set('to', to);
    const qs = p.toString() ? `?${p}` : '';
    return get(`/api/transactions/export${qs}`, { binary: true });
  },

  /* Single transaction */
  transaction(id)           { return get(`/api/transactions/${id}`); },
  createTransaction(data)   { return post('/api/transactions', data); },
  updateTransaction(id, d)  { return put(`/api/transactions/${id}`, d); },
  deleteTransaction(id)     { return del(`/api/transactions/${id}`); },

  /* Budgets */
  budgets()         { return get('/api/budgets'); },
  createBudget(d)   { return post('/api/budgets', d); },
  deleteBudget(id)  { return del(`/api/budgets/${id}`); },

  /* Savings Goals */
  goals()               { return get('/api/goals'); },
  createGoal(d)         { return post('/api/goals', d); },
  depositGoal(id, amt)  { return post(`/api/goals/${id}/deposit`, { amount: amt }); },
  deleteGoal(id)        { return del(`/api/goals/${id}`); },

  /* Session helpers (exported so app.js can use them) */
  Session,
  ApiError,
};

window.Api = Api;
