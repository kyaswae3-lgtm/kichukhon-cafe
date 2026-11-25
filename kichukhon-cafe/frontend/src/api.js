
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const token = () => localStorage.getItem('kc_token');

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({
    message: 'Unexpected server response'
  }));

  if (!res.ok) throw new Error(data.message || 'Request failed');

  return data;
}
