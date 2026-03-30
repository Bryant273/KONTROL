import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  DocumentData,
  WithFieldValue
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { User } from 'firebase/auth';

export class BaseFirestoreService<T extends DocumentData> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected getCollection() {
    return collection(db, this.collectionName);
  }

  protected getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  async create(data: WithFieldValue<T>, user: User): Promise<string> {
    try {
      const docRef = await addDoc(this.getCollection(), {
        ...data,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, this.collectionName, user);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>, user: User): Promise<void> {
    try {
      await updateDoc(this.getDocRef(id), data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.collectionName, user);
      throw error;
    }
  }

  async delete(id: string, user: User): Promise<void> {
    try {
      await deleteDoc(this.getDocRef(id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, this.collectionName, user);
      throw error;
    }
  }

  subscribeToAll(callback: (data: (T & { id: string })[]) => void, user: User, constraints: QueryConstraint[] = []) {
    const q = query(this.getCollection(), ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionName, user);
    });
  }

  subscribeByOwner(ownerId: string, callback: (data: (T & { id: string })[]) => void, user: User, extraConstraints: QueryConstraint[] = []) {
    return this.subscribeToAll(callback, user, [
      where('ownerId', '==', ownerId),
      ...extraConstraints
    ]);
  }

  subscribeByCompany(companyId: string, callback: (data: (T & { id: string })[]) => void, user: User, extraConstraints: QueryConstraint[] = []) {
    return this.subscribeToAll(callback, user, [
      where('companyId', '==', companyId),
      ...extraConstraints
    ]);
  }
}
