const LOGO_CACHE_KEY = 'kontrol_company_logo_cache_v2';
const DB_NAME = 'kontrol_assets_db';
const STORE_NAME = 'company_logos';

export interface CachedLogoData {
  logoUrl: string;
  updatedAt: number;
  mimeType: string;
}

function openLogoDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e: any) => resolve(e.target.result as IDBDatabase);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function detectImageMimeType(urlOrData: string): { mimeType: string; isSvg: boolean } {
  if (!urlOrData || typeof urlOrData !== 'string') {
    return { mimeType: 'image/svg+xml', isSvg: true };
  }
  const str = urlOrData.trim();
  if (str.startsWith('data:image/svg+xml') || str.endsWith('.svg') || str.includes('<svg')) {
    return { mimeType: 'image/svg+xml', isSvg: true };
  }
  if (str.startsWith('data:image/png') || str.endsWith('.png')) {
    return { mimeType: 'image/png', isSvg: false };
  }
  if (str.startsWith('data:image/jpeg') || str.startsWith('data:image/jpg') || str.endsWith('.jpg') || str.endsWith('.jpeg')) {
    return { mimeType: 'image/jpeg', isSvg: false };
  }
  if (str.startsWith('data:image/webp') || str.endsWith('.webp')) {
    return { mimeType: 'image/webp', isSvg: false };
  }
  if (str.startsWith('data:image/x-icon') || str.endsWith('.ico')) {
    return { mimeType: 'image/x-icon', isSvg: false };
  }
  return { mimeType: 'image/png', isSvg: false };
}

export async function cacheCompanyLogo(logoUrl: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const { mimeType } = detectImageMimeType(logoUrl);
  const data: CachedLogoData = {
    logoUrl,
    updatedAt: Date.now(),
    mimeType
  };

  try {
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage logo save error:", e);
  }

  try {
    const db = await openLogoDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, 'current_company_logo');
    }
  } catch (e) {
    console.warn("IndexedDB logo save error:", e);
  }

  updateFavicon(logoUrl);
}

export async function getCachedCompanyLogo(): Promise<string> {
  if (typeof window === 'undefined') return '';

  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    if (raw) {
      const parsed: CachedLogoData = JSON.parse(raw);
      if (parsed?.logoUrl) return parsed.logoUrl;
    }
  } catch (e) {
    // ignore
  }

  try {
    const db = await openLogoDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get('current_company_logo');
        req.onsuccess = () => {
          const res = req.result as CachedLogoData;
          resolve(res?.logoUrl || '');
        };
        req.onerror = () => resolve('');
      });
    }
  } catch (e) {
    // ignore
  }

  return '';
}

export function updateFavicon(logoUrl?: string) {
  if (typeof document === 'undefined') return;

  const targetLogo = logoUrl && logoUrl.trim() ? logoUrl.trim() : '/favicon.svg';
  const { mimeType } = detectImageMimeType(targetLogo);

  let iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    document.head.appendChild(iconLink);
  }
  iconLink.type = mimeType;
  iconLink.href = targetLogo;

  let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
  if (!shortcutLink) {
    shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    document.head.appendChild(shortcutLink);
  }
  shortcutLink.type = mimeType;
  shortcutLink.href = targetLogo;

  let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = targetLogo;
}
