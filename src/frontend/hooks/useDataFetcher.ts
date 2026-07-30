import React from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../api/firebase';

interface UseDataFetcherOptions<T> {
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  customFilterField?: string;
  ownerIdKey?: 'ownerId' | 'companyId';
}

interface UseDataFetcherResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

const memoryCache = new Map<string, any>();

export function useDataFetcher<T extends { id?: string; createdAt?: any }>(
  collectionName: string,
  companyId: string | undefined,
  user: any,
  options: UseDataFetcherOptions<T> = {}
): UseDataFetcherResult<T> {
  const {
    sortField = 'createdAt',
    sortDirection = 'desc',
    ownerIdKey = 'ownerId'
  } = options;

  const cacheKey = `kontrol_swr_${collectionName}_${companyId || 'global'}`;

  const [data, setData] = React.useState<T[]>(() => {
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = React.useState<boolean>(() => data.length === 0);
  const [error, setError] = React.useState<Error | null>(null);

  const processAndSort = React.useCallback((items: T[]): T[] => {
    return [...items].sort((a: any, b: any) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (sortDirection === 'desc') {
        return valA > valB ? -1 : valA < valB ? 1 : 0;
      }
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    });
  }, [sortField, sortDirection]);

  React.useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let unsubscribePrimary: (() => void) | null = null;
    let unsubscribeFallback: (() => void) | null = null;

    const collectionRef = collection(db, collectionName);

    // Primary query with owner filter and orderBy
    const primaryQuery = query(
      collectionRef,
      where(ownerIdKey, '==', companyId),
      orderBy(sortField, sortDirection)
    );

    const updateCacheAndState = (newItems: T[]) => {
      if (!isMounted) return;
      memoryCache.set(cacheKey, newItems);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newItems));
      } catch (e) {
        // storage quota fallback
      }
      setData(newItems);
      setLoading(false);
      setError(null);
    };

    const setupFallbackQuery = () => {
      try {
        const fallbackQuery = query(
          collectionRef,
          where(ownerIdKey, '==', companyId)
        );
        unsubscribeFallback = onSnapshot(
          fallbackQuery,
          (snapshot) => {
            const rawItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            const sortedItems = processAndSort(rawItems);
            updateCacheAndState(sortedItems);
          },
          (err) => {
            console.warn(`[useDataFetcher] Fallback query error for ${collectionName}:`, err);
            if (isMounted) {
              setError(err);
              setLoading(false);
            }
          }
        );
      } catch (fErr: any) {
        if (isMounted) {
          setError(fErr);
          setLoading(false);
        }
      }
    };

    try {
      unsubscribePrimary = onSnapshot(
        primaryQuery,
        (snapshot) => {
          const rawItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
          updateCacheAndState(rawItems);
        },
        (err) => {
          console.warn(`[useDataFetcher] Primary query failed for ${collectionName}, switching to fallback:`, err.message);
          handleFirestoreError(err, OperationType.LIST, collectionName, user, false);
          // Fallback to single-clause where query
          setupFallbackQuery();
        }
      );
    } catch (pErr) {
      setupFallbackQuery();
    }

    return () => {
      isMounted = false;
      if (unsubscribePrimary) unsubscribePrimary();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, [collectionName, companyId, user, sortField, sortDirection, ownerIdKey, cacheKey, processAndSort]);

  const refresh = React.useCallback(() => {
    setLoading(true);
  }, []);

  return { data, loading, error, refresh };
}
