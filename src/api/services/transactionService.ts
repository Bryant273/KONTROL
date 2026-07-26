import { BaseFirestoreService } from './baseFirestoreService';
import { Transaction, UserProfile, Produit } from '../../frontend/types';
import { User } from 'firebase/auth';
import { where, orderBy, limit, query, collection, getDocs, doc, increment, writeBatch, getDoc, deleteDoc } from 'firebase/firestore';
import { db, logAction } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { checkAndNotifyLowStock } from './notificationService';

export class TransactionService extends BaseFirestoreService<Transaction> {
  constructor() {
    super('transactions');
  }

  async createTransaction(transaction: Transaction, user: User, profile?: UserProfile | null) {
    try {
      const batch = writeBatch(db);
      
      // 1. Create the transaction document
      const transactionRef = doc(collection(db, 'transactions'));
      const transactionId = transactionRef.id;
      
      batch.set(transactionRef, {
        ...transaction,
        id: transactionId,
        createdAt: Date.now()
      });

      // 2. Update product stock and create stock movements (only if active transaction)
      if (transaction.statut !== 'ANNULE') {
        for (const article of transaction.articles || []) {
          if (!article.produitId) continue;
          const productRef = doc(db, 'produits', article.produitId);
          
          // Update stock
          const stockChange = transaction.type === 'VENTE' ? -article.quantite : article.quantite;
          batch.update(productRef, {
            stock: increment(stockChange)
          });

          // Create stock movement
          const movementRef = doc(collection(db, 'stock_movements'));
          batch.set(movementRef, {
            produitId: article.produitId,
            designation: article.designation,
            type: transaction.type === 'VENTE' ? 'SORTIE' : 'ENTREE',
            quantite: article.quantite,
            prixUnitaire: article.prixUnitaire,
            source: 'TRANSACTION',
            referenceId: transactionId,
            date: Date.now(),
            ownerId: transaction.ownerId,
            createdAt: Date.now()
          });
        }
      }

      // 3. Create payment if status is PAYE
      if (transaction.statut === 'PAYE') {
        const paymentRef = doc(collection(db, 'payments'));
        batch.set(paymentRef, {
          date: Date.now(),
          montant: transaction.montantTotal,
          type: transaction.type === 'VENTE' ? 'ENCAISSEMENT' : 'DECAISSEMENT',
          modePaiement: transaction.modePaiement,
          transactionId: transactionId,
          tiersId: transaction.tiersId,
          tiersNom: transaction.tiersNom,
          description: `${transaction.type} - ${transaction.reference}`,
          ownerId: transaction.ownerId,
          createdAt: Date.now()
        });
      }

      await batch.commit();

      // 4. Trigger stock alerts if needed (after commit for accuracy)
      if (transaction.type === 'VENTE') {
        for (const article of transaction.articles) {
          try {
            const productSnap = await getDoc(doc(db, 'produits', article.produitId));
            if (productSnap.exists()) {
              const productData = productSnap.data() as Produit;
              await checkAndNotifyLowStock(
                article.produitId,
                productData.designation || productData.name || "Inconnu",
                productData.stock,
                productData.alertStock,
                transaction.ownerId || productData.companyId || "",
                user.uid
              );
            }
          } catch (e) {
            console.error("Low stock alert trigger failed:", e);
          }
        }
      }

      // Journalisation
      if (profile) {
        await logAction(
          profile.companyId,
          profile.uid,
          profile.displayName,
          transaction.type === 'VENTE' ? "VENTE" : "ACHAT",
          `${transaction.type} #${transaction.reference} - Montant: ${transaction.montantTotal} ${transaction.devise}`
        );
      }

      return transactionId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions', user, false);
      throw error;
    }
  }

  async updateTransaction(id: string, updates: Partial<Transaction>, user: User, profile?: UserProfile | null) {
    try {
      const batch = writeBatch(db);
      const transRef = doc(db, 'transactions', id);
      const transDoc = await getDoc(transRef);
      
      if (!transDoc.exists()) throw new Error('Transaction not found');
      const oldData = transDoc.data() as Transaction;
      const newData = { ...oldData, ...updates };

      const isCancelling = (oldData.statut !== 'ANNULE') && (newData.statut === 'ANNULE');
      const isReactivating = (oldData.statut === 'ANNULE') && (newData.statut !== 'ANNULE');

      // 1. Handle Stock Adjustments on Status Change
      if (isCancelling) {
        // Revert stock changes made when the transaction was active
        for (const article of oldData.articles || []) {
          if (!article.produitId) continue;
          const productRef = doc(db, 'produits', article.produitId);
          // For VENTE, stock was deducted -> add it back (+quantite)
          // For ACHAT, stock was added -> deduct it (-quantite)
          const stockChange = oldData.type === 'VENTE' ? article.quantite : -article.quantite;
          batch.update(productRef, {
            stock: increment(stockChange)
          });
        }

        // Delete associated stock movements
        const movementsQuery = query(collection(db, 'stock_movements'), where('referenceId', '==', id));
        const movementsSnapshot = await getDocs(movementsQuery);
        movementsSnapshot.forEach((mDoc) => batch.delete(mDoc.ref));
      } else if (isReactivating) {
        // Re-apply stock changes
        for (const article of newData.articles || []) {
          if (!article.produitId) continue;
          const productRef = doc(db, 'produits', article.produitId);
          const stockChange = newData.type === 'VENTE' ? -article.quantite : article.quantite;
          batch.update(productRef, {
            stock: increment(stockChange)
          });

          // Create fresh stock movement
          const movementRef = doc(collection(db, 'stock_movements'));
          batch.set(movementRef, {
            produitId: article.produitId,
            designation: article.designation,
            type: newData.type === 'VENTE' ? 'SORTIE' : 'ENTREE',
            quantite: article.quantite,
            prixUnitaire: article.prixUnitaire,
            source: 'TRANSACTION',
            referenceId: id,
            date: Date.now(),
            ownerId: newData.ownerId,
            createdAt: Date.now()
          });
        }
      }

      // 2. Update the transaction document
      batch.update(transRef, {
        ...updates,
        updatedAt: Date.now()
      });

      // 3. Handle Payment Synchronization
      const paymentsQuery = query(collection(db, 'payments'), where('transactionId', '==', id));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const existingPayment = !paymentsSnapshot.empty ? paymentsSnapshot.docs[0] : null;

      if (newData.statut === 'PAYE') {
        if (existingPayment) {
          // Update existing payment
          batch.update(existingPayment.ref, {
            montant: newData.montantTotal,
            modePaiement: newData.modePaiement,
            type: newData.type === 'VENTE' ? 'ENCAISSEMENT' : 'DECAISSEMENT',
            date: newData.date,
            updatedAt: Date.now()
          });
        } else {
          // Create new payment
          const paymentRef = doc(collection(db, 'payments'));
          batch.set(paymentRef, {
            date: newData.date,
            montant: newData.montantTotal,
            type: newData.type === 'VENTE' ? 'ENCAISSEMENT' : 'DECAISSEMENT',
            modePaiement: newData.modePaiement,
            transactionId: id,
            tiersId: newData.tiersId,
            tiersNom: newData.tiersNom,
            description: `${newData.type} - ${newData.reference}`,
            ownerId: newData.ownerId,
            createdAt: Date.now()
          });
        }
      } else if ((newData.statut === 'ATTENTE' || newData.statut === 'ANNULE') && existingPayment) {
        // Delete payment if status changed to ATTENTE or ANNULE
        batch.delete(existingPayment.ref);
      }

      await batch.commit();

      // Journalisation
      if (profile) {
        await logAction(
          profile.companyId,
          profile.uid,
          profile.displayName,
          "MODIFICATION_TRANSACTION",
          `Modification/Annulation de la ${oldData.type} #${oldData.reference} (Statut: ${newData.statut})`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions', user, false);
      throw error;
    }
  }

  async deleteTransaction(id: string, user: User, profile?: UserProfile | null) {
    try {
      const batch = writeBatch(db);
      
      // 1. Get transaction data
      const transDoc = await getDoc(doc(db, 'transactions', id));
      if (!transDoc.exists()) return;
      const transaction = transDoc.data() as Transaction;

      // 2. Reverse stock changes only if transaction was NOT already cancelled
      if (transaction.statut !== 'ANNULE') {
        for (const article of transaction.articles || []) {
          if (!article.produitId) continue;
          const productRef = doc(db, 'produits', article.produitId);
          const stockChange = transaction.type === 'VENTE' ? article.quantite : -article.quantite;
          batch.update(productRef, {
            stock: increment(stockChange)
          });
        }
      }

      // 3. Delete associated stock movements
      const movementsQuery = query(collection(db, 'stock_movements'), where('referenceId', '==', id));
      const movementsSnapshot = await getDocs(movementsQuery);
      movementsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Delete associated payments
      const paymentsQuery = query(collection(db, 'payments'), where('transactionId', '==', id));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 5. Delete the transaction itself
      batch.delete(doc(db, 'transactions', id));

      await batch.commit();

      // Journalisation
      if (profile) {
        await logAction(
          profile.companyId,
          profile.uid,
          profile.displayName,
          "SUPPRESSION_TRANSACTION",
          `Suppression de la ${transaction.type} #${transaction.reference}`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions', user, false);
      throw error;
    }
  }

  subscribeRecent(ownerId: string, callback: (data: any[]) => void, user: User) {
    return this.subscribeByOwner(ownerId, callback, user, [
      orderBy('date', 'desc'),
      limit(5)
    ]);
  }
}

export const transactionService = new TransactionService();
