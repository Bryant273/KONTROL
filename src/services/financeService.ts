import { BaseFirestoreService } from './baseFirestoreService';
import { Wallet, Payment, Charge } from '../types';
import { User } from 'firebase/auth';
import { where, orderBy, limit, query, collection, getDocs, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export class WalletService extends BaseFirestoreService<Wallet> {
  constructor() {
    super('wallets');
  }

  async updateBalance(id: string, amount: number, user: User) {
    try {
      await updateDoc(this.getDocRef(id), {
        solde: increment(amount)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'wallets', user);
      throw error;
    }
  }
}

export class PaymentService extends BaseFirestoreService<Payment> {
  constructor() {
    super('payments');
  }

  async createPayment(payment: Payment, user: User) {
    try {
      const paymentId = await this.create(payment, user);

      // Update wallet balance
      if (payment.walletId) {
        const walletService = new WalletService();
        const balanceChange = payment.type === 'ENCAISSEMENT' ? payment.montant : -payment.montant;
        await walletService.updateBalance(payment.walletId, balanceChange, user);
      }

      return paymentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments', user);
      throw error;
    }
  }
}

export class ChargeService extends BaseFirestoreService<Charge> {
  constructor() {
    super('charges');
  }

  async createCharge(charge: Charge, user: User) {
    try {
      const chargeId = await this.create(charge, user);

      // Create payment for the charge
      await addDoc(collection(db, 'payments'), {
        date: charge.date,
        montant: charge.montant,
        type: 'DECAISSEMENT',
        modePaiement: charge.modePaiement,
        description: `Charge - ${charge.description}`,
        ownerId: charge.ownerId,
        createdAt: Date.now()
      });

      return chargeId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'charges', user);
      throw error;
    }
  }
}

export const walletService = new WalletService();
export const paymentService = new PaymentService();
export const chargeService = new ChargeService();
