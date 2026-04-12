import { BaseFirestoreService } from './baseFirestoreService';
import { Produit } from '../../frontend/types';
import { User } from 'firebase/auth';
import { where, orderBy, limit, query, collection, getDocs, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export class ProductService extends BaseFirestoreService<Produit> {
  constructor() {
    super('produits');
  }

  async createProduct(product: Produit, user: User) {
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

      return productId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'produits', user);
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
