// Thin fetch wrapper around the read-only JSON API. Requests go to the deployed
// mock API at https://mockapi.ishaanzaveri.com/api; override the host with
// VITE_API_BASE_URL (e.g. an empty string to use the local dev proxy — see
// vite.config.ts).

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://mockapi.ishaanzaveri.com';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type Params = Record<string, string | number | string[] | undefined | null>;

function buildQuery(params?: Params): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, v);
    } else {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}${buildQuery(params)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    let code = 'error';
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code, message);
  }
  return res.json() as Promise<T>;
}
