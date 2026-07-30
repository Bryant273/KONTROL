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

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected get collectionRef() {
    return collection(db, this.collectionName);
  }

  async getAll(): Promise<T[]> {
    try {
      const snapshot = await getDocs(this.collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName, auth.currentUser, false);
      return [];
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as T;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`, auth.currentUser, false);
      return null;
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
    const q = query(this.collectionRef, ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionName, user || auth.currentUser, false);
    });
  }

  subscribeByOwner(ownerId: string, callback: (data: T[]) => void, user?: any, extraConstraints: any[] = []) {
    const q = query(this.collectionRef, where('companyId', '==', ownerId), orderBy('createdAt', 'desc'), ...extraConstraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionName, user || auth.currentUser, false);
    });
  }

  getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }
}
