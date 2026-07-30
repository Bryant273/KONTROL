import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  handleFirestoreError,
  OperationType,
  auth
} from '../firebase';

export class BaseFirestoreService<T extends { id?: string }> {
  protected collectionName: string;
  private static memoryCache: Map<string, any> = new Map();

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected get collectionRef() {
    return collection(db, this.collectionName);
  }

  private getCacheKey(suffix: string): string {
    return `${this.collectionName}_${suffix}`;
  }

  private getCache(key: string): any {
    if (BaseFirestoreService.memoryCache.has(key)) {
      return BaseFirestoreService.memoryCache.get(key);
    }
    try {
      const stored = localStorage.getItem(`kontrol_swr_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        BaseFirestoreService.memoryCache.set(key, parsed);
        return parsed;
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  }

  private setCache(key: string, data: any): void {
    BaseFirestoreService.memoryCache.set(key, data);
    try {
      localStorage.setItem(`kontrol_swr_${key}`, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }

  async getAll(): Promise<T[]> {
    const cacheKey = this.getCacheKey('getAll');
    try {
      const snapshot = await getDocs(this.collectionRef);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName, auth.currentUser, false);
      return this.getCache(cacheKey) || [];
    }
  }

  async getById(id: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(`getById_${id}`);
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const item = { id: snapshot.id, ...snapshot.data() } as T;
        this.setCache(cacheKey, item);
        return item;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`, auth.currentUser, false);
      return this.getCache(cacheKey) || null;
    }
  }

  async create(data: Omit<T, 'id'>, user?: any): Promise<string> {
    try {
      const docRef = await addDoc(this.collectionRef, {
        ...data,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.collectionName, user || auth.currentUser, true);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>, user?: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.collectionName}/${id}`, user || auth.currentUser, true);
      throw error;
    }
  }

  async delete(id: string, user?: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.collectionName}/${id}`, user || auth.currentUser, true);
      throw error;
    }
  }

  subscribeToAll(callback: (data: T[]) => void, user?: any, constraints: any[] = []) {
    const cacheKey = this.getCacheKey(`subscribeToAll_${user?.uid || 'anon'}`);
    
    // Serve cached data immediately to prevent empty states or timeouts
    const cached = this.getCache(cacheKey);
    if (cached) {
      callback(cached);
    }

    try {
      const q = query(this.collectionRef, ...constraints);
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        this.setCache(cacheKey, data);
        callback(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, this.collectionName, user || auth.currentUser, false);
        // Fallback: if multi-clause query fails (e.g. index issue), attempt single-where query
        try {
          const fallbackWhere = constraints.filter((c: any) => c && c.type === 'where');
          if (fallbackWhere.length > 0) {
            const fallbackQ = query(this.collectionRef, ...fallbackWhere);
            onSnapshot(fallbackQ, (snap) => {
              const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
              this.setCache(cacheKey, data);
              callback(data);
            }, (err) => {
              console.warn(`Fallback query also failed for ${this.collectionName}:`, err);
              if (!cached) callback([]);
            });
          } else {
            if (!cached) callback([]);
          }
        } catch (e) {
          if (!cached) callback([]);
        }
      });
    } catch (err) {
      console.warn(`subscribeToAll failed setup for ${this.collectionName}:`, err);
      if (!cached) callback([]);
      return () => {};
    }
  }

  subscribeByOwner(ownerId: string, callback: (data: T[]) => void, user?: any, extraConstraints: any[] = []) {
    const cacheKey = this.getCacheKey(`subscribeByOwner_${ownerId}`);
    
    // Serve cached data immediately
    const cached = this.getCache(cacheKey);
    if (cached) {
      callback(cached);
    }

    try {
      const q = query(this.collectionRef, where('companyId', '==', ownerId), orderBy('createdAt', 'desc'), ...extraConstraints);
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        this.setCache(cacheKey, data);
        callback(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, this.collectionName, user || auth.currentUser, false);
        // Fallback without orderBy if index is missing
        try {
          const fallbackQ = query(this.collectionRef, where('companyId', '==', ownerId));
          onSnapshot(fallbackQ, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            this.setCache(cacheKey, data);
            callback(data);
          }, () => {
            if (!cached) callback([]);
          });
        } catch (e) {
          if (!cached) callback([]);
        }
      });
    } catch (err) {
      console.warn(`subscribeByOwner failed setup for ${this.collectionName}:`, err);
      if (!cached) callback([]);
      return () => {};
    }
  }

  getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }
}
