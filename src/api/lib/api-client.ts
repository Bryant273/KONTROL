
/**
 * KONTROL Polyglot API Client
 * Wraps fetch with the required Go Gateway & Rust Shield signatures.
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
    
    // Inject Shield Token (Dynamic from Go Gateway)
    if (!headers.has('x-kontrol-shield') && !url.includes('/shield/identify')) {
      const token = await fetchShieldToken();
      headers.set('x-kontrol-shield', token);
    }

    // Node.js/Java/Go Identification
    headers.set('x-polyglot-origin', 'react-frontend');
    headers.set('x-kontrol-timestamp', Date.now().toString());

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response;
  },

  async get<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, { ...options, method: 'GET' });
    return response.json();
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
    return response.json();
  }
};
