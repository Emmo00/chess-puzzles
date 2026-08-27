const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type ApiFetchOptions = RequestInit & {
  params?: Record<string, string | number | undefined>;
};

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, API_BASE || window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { params, ...init } = options;
  const url = buildUrl(path, params);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Patches the global fetch to automatically prefix /api/* routes
 * with the backend API base URL. Call this once at app startup.
 */
export function initApi() {
  if (!API_BASE) return;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith("/api/")) {
      const fullUrl = `${API_BASE}${url}`;
      return originalFetch(fullUrl, init);
    }

    return originalFetch(input, init);
  } as typeof globalThis.fetch;
}

export { API_BASE };
