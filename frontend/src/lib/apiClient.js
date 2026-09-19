/**
 * Thin fetch() wrapper around the DairyGuard AI backend.
 *
 * - Reads the API base URL from VITE_API_URL (see .env.example).
 * - Automatically attaches the stored JWT as a Bearer token.
 * - Falls back across common local backend ports when the server auto-retries
 *   from 5000 to the next free port after a port conflict.
 * - Throws an Error with a readable message on non-2xx responses so
 *   callers can just `.catch(err => setError(err.message))`.
 */
const DEFAULT_API_URLS = [
  import.meta.env.VITE_API_URL,
  'http://localhost:5000/api',
  'http://localhost:5001/api',
  'http://localhost:5002/api',
  'http://localhost:5003/api',
  'http://localhost:3000/api',
].filter(Boolean).map((value) => value.replace(/\/+$/, ''));

const API_URL = DEFAULT_API_URLS[0] || 'http://localhost:5000/api';
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

  let lastNetworkError = null;

  for (const baseUrl of DEFAULT_API_URLS) {
    let response;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const payload = isJson ? await response.json().catch(() => ({})) : null;

      if (!response.ok) {
        if (response.status === 401 && auth) {
          window.dispatchEvent(new CustomEvent('dairyguard:unauthorized'));
        }
        throw new Error(payload?.error || `Request failed with status ${response.status}`);
      }

      return payload;
    } catch (networkErr) {
      if (networkErr.name === 'AbortError') {
        lastNetworkError = new Error(`The DairyGuard backend did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
      } else if (networkErr.message?.includes('Failed to fetch') || networkErr.name === 'TypeError') {
        lastNetworkError = new Error(
          `Could not reach the DairyGuard backend at ${baseUrl}. Is the server running? (${networkErr.message})`
        );
      } else {
        throw networkErr;
      }
      continue;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw lastNetworkError || new Error(`Could not reach the DairyGuard backend. Is the server running?`);
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { API_URL };
