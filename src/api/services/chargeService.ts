import { BaseFirestoreService } from './baseFirestoreService';
import { Charge } from '../../frontend/types';
import { User } from 'firebase/auth';
import { collection, doc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export class ChargeService extends BaseFirestoreService<Charge> {
  constructor() {
    super('charges');
  }

  async createCharge(charge: Omit<Charge, 'id'>, user: User) {
    try {
      const batch = writeBatch(db);
      
      // 1. Create the charge document
      const chargeRef = doc(collection(db, 'charges'));
      const chargeId = chargeRef.id;
      
      batch.set(chargeRef, {
        ...charge,
        id: chargeId,
        createdAt: Date.now()
      });

      // 2. Create the associated payment
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        date: charge.date,
        montant: charge.montant,
        type: 'DECAISSEMENT',
        modePaiement: charge.modePaiement,
        chargeId: chargeId,
        description: `Charge: ${charge.description} (${charge.categorie})`,
        ownerId: charge.ownerId,
        createdAt: Date.now()
      });

      await batch.commit();
      return chargeId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'charges', user, false);
      throw error;
    }
  }

  async updateCharge(id: string, charge: Partial<Charge>, user: User) {
    try {
      const batch = writeBatch(db);
      
      // 1. Update the charge document
      const chargeRef = doc(db, 'charges', id);
      batch.update(chargeRef, {
        ...charge,
        updatedAt: Date.now()
      });

      // 2. Update the associated payment
      const paymentsQuery = query(collection(db, 'payments'), where('chargeId', '==', id));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      paymentsSnapshot.forEach((pDoc) => {
        batch.update(pDoc.ref, {
          date: charge.date ?? pDoc.data().date,
          montant: charge.montant ?? pDoc.data().montant,
          modePaiement: charge.modePaiement ?? pDoc.data().modePaiement,
          description: charge.description ? `Charge: ${charge.description} (${charge.categorie ?? pDoc.data().categorie})` : pDoc.data().description
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'charges', user, false);
      throw error;
    }
  }

  async deleteCharge(id: string, user: User) {
    try {
      const batch = writeBatch(db);
      
      // 1. Delete the charge document
      batch.delete(doc(db, 'charges', id));

      // 2. Delete associated payments
      const paymentsQuery = query(collection(db, 'payments'), where('chargeId', '==', id));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach((pDoc) => {
        batch.delete(pDoc.ref);
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'charges', user, true);
    }
  }
}

export const chargeService = new ChargeService();
