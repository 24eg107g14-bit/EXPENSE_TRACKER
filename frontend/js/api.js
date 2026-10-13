// Small fetch wrapper: adds the login token and turns errors into ApiError.
class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

const Api = (() => {
  const KEY = 'pocketbook.session';

  const session = () => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  };
  const setSession = (s) => localStorage.setItem(KEY, JSON.stringify(s));
  const clear = () => localStorage.removeItem(KEY);

  async function request(method, path, body) {
    const s = session();
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (s) headers['Authorization'] = 'Bearer ' + s.token;

    let res;
    try {
      res = await fetch(CONFIG.API_URL + path, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.');
    }
    if (res.status === 204) return null;

    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }

    if (!res.ok) {
      if (res.status === 401 && s && !path.startsWith('/api/auth')) {
        clear();
        location.hash = '#/login';
      }
      throw new ApiError(res.status, (data && data.message) || 'Something went wrong. Try again.', data && data.errors);
    }
    return data;
  }

  return {
    session, setSession, clear,
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    put: (p, b) => request('PUT', p, b),
    del: (p) => request('DELETE', p)
  };
})();
