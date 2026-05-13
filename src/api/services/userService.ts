import { BaseFirestoreService } from './baseFirestoreService';
import { UserProfile, Company } from '../../frontend/types';
import { User } from 'firebase/auth';
import { where, orderBy, limit, query, collection, getDocs, doc, updateDoc, increment, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export class UserService extends BaseFirestoreService<UserProfile> {
  constructor() {
    super('users');
  }

  async updateProfile(uid: string, data: Partial<UserProfile>, user: User) {
    try {
      await setDoc(this.getDocRef(uid), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', user, false);
      throw error;
    }
  }

  subscribeByCompany(companyId: string, callback: (data: any[]) => void, user: User) {
    return this.subscribeToAll(callback, user, [
      where('companyId', '==', companyId)
    ]);
  }
}

export class CompanyService extends BaseFirestoreService<Company> {
  constructor() {
    super('companies');
  }

  async updateCompany(id: string, data: Partial<Company>, user: User) {
    try {
      await updateDoc(this.getDocRef(id), data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies', user, false);
      throw error;
    }
  }
}

export const userService = new UserService();
export const companyService = new CompanyService();
