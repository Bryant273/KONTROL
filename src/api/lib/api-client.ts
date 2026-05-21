
/**
 * KONTROL Internal API Client
 * Wraps fetch with the required Gateway & Shield signatures.
 */

export interface FetchOptions extends RequestInit {
  transparent?: boolean;
}

let cachedShieldToken: string | null = null;

async function fetchShieldToken(): Promise<string> {
  if (cachedShieldToken) return cachedShieldToken;
  try {
    const response = await fetch('/api/gateway/shield/identify');
    if (response.ok) {
      const data = await response.json();
      cachedShieldToken = data.shield_uid;
      return cachedShieldToken!;
    }
  } catch (e) {
    console.warn("Shield acquisition failure:", e);
  }
  return 'HARDENED';
}

export const apiClient = {
  async fetch(url: string, options: FetchOptions = {}) {
    const headers = new Headers(options.headers || {});
    
    // Inject Shield Token (Dynamic from API Gateway)
    if (!headers.has('x-kontrol-shield') && !url.includes('/shield/identify')) {
      const token = await fetchShieldToken();
      headers.set('x-kontrol-shield', token);
    }

    // System Identification
    headers.set('x-kontrol-origin', 'react-frontend');
    headers.set('x-kontrol-timestamp', Date.now().toString());

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const serverMessage = errorData.error || errorData.message || errorData.details || `Server Error ${response.status}`;
      const finalMessage = `[API ERROR ${response.status}] ${serverMessage}`;
      throw new Error(finalMessage);
    }

    return response;
  },

  async get<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, { ...options, method: 'GET' });
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : ({} as T);
    } catch (e: any) {
      console.error(`[API-CLIENT] JSON Parse Error for GET ${url}:`, e);
      const snippet = text ? (text.length > 100 ? text.substring(0, 100) + '...' : text) : 'empty body';
      throw new Error(`[API-JSON-PARSE-ERROR] Invalid response from ${url}: ${e?.message || 'Parse failed'}. Response snippet: ${snippet}`);
    }
  },

  async post<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: JSON.stringify(data)
    });
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : ({} as T);
    } catch (e: any) {
      console.error(`[API-CLIENT] JSON Parse Error for POST ${url}:`, e);
      const snippet = text ? (text.length > 100 ? text.substring(0, 100) + '...' : text) : 'empty body';
      throw new Error(`[API-JSON-PARSE-ERROR] Invalid response from ${url}: ${e?.message || 'Parse failed'}. Response snippet: ${snippet}`);
    }
  }
};
