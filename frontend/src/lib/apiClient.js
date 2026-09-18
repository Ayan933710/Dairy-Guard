/**
 * Thin fetch() wrapper around the DairyGuard AI backend.
 *
 * - Reads the API base URL from VITE_API_URL (see .env.example).
 * - Automatically attaches the stored JWT as a Bearer token.
 * - Throws an Error with a readable message on non-2xx responses so
 *   callers can just `.catch(err => setError(err.message))`.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'dairyguard_token';
const REQUEST_TIMEOUT_MS = 10000;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, etc.) - token just won't persist across reloads
  }
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };
  const token = auth ? getToken() : null;
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      throw new Error(`The DairyGuard backend did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw new Error(
      `Could not reach the DairyGuard backend at ${API_URL}. Is the server running? (${networkErr.message})`
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new CustomEvent('dairyguard:unauthorized'));
    }
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { API_URL };
