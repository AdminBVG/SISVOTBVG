import { getItem } from './storage';

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const base = import.meta.env.VITE_API_URL || '/api';
  const token = getItem('token');
  const headers: HeadersInit = {
    ...(init.headers || {}),
  };
  let body = init.body as any;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(base + path, { ...init, headers, body });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = await res.json();
      message = err.detail || err.message || JSON.stringify(err);
    } catch {}
    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) {
    return undefined as T;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as T;
  }
}
