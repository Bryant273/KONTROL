import { BaseFirestoreService } from './baseFirestoreService';
import { Produit, UserProfile } from '../../frontend/types';
import { User } from 'firebase/auth';
import { where, orderBy, limit, query, collection, getDocs, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db, logAction } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export class ProductService extends BaseFirestoreService<Produit> {
  constructor() {
    super('produits');
  }

  async createProduct(product: Produit, user: User, profile?: UserProfile | null) {
    try {
      const productId = await this.create(product, user);

      // Create initial stock movement
      if (product.stock > 0) {
        await addDoc(collection(db, 'stock_movements'), {
          produitId: productId,
          designation: product.designation,
          type: 'ENTREE',
          quantite: product.stock,
          prixUnitaire: product.prixAchat || 0,
          source: 'INITIAL',
          referenceId: productId,
          date: Date.now(),
          ownerId: product.ownerId
        });
      }

      // Journalisation
      if (profile) {
        await logAction(
          profile.companyId,
          profile.uid,
          profile.displayName,
          "NOUVEAU_PRODUIT",
          `Création du produit: ${product.designation} (Réf: ${product.reference})`
        );
      }

      return productId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'produits', user);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<Produit>, user: User, profile?: UserProfile | null) {
    try {
      await this.update(id, product, user);

      // Journalisation
      if (profile) {
        await logAction(
          profile.companyId,
          profile.uid,
          profile.displayName,
          "MODIFICATION_PRODUIT",
          `Modification du produit (ID: ${id})`
        );
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'produits', user);
       throw error;
    }
  }

  async deleteProduct(id: string, user: User, profile?: UserProfile | null) {
    try {
      await this.delete(id, user);

      // Journalisation
      if (profile) {
        await logAction(
          profile.companyId,
          profile.uid,
          profile.displayName,
          "SUPPRESSION_PRODUIT",
          `Suppression du produit (ID: ${id})`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'produits', user);
      throw error;
    }
  }

  subscribeLowStock(ownerId: string, callback: (data: any[]) => void, user: User) {
    return this.subscribeByOwner(ownerId, callback, user, [
      where('stock', '<=', 10), // Example threshold, should be dynamic if possible
      orderBy('stock', 'asc')
    ]);
  }
}

export const productService = new ProductService();
