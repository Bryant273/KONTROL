import { 
  db, 
  doc, 
  runTransaction, 
  collection, 
  addDoc, 
  getDoc 
} from '../firebase';
import { StockMovement, Produit } from '../../frontend/types';
import { checkAndNotifyLowStock } from './notificationService';

export async function recordStockMovementWithTransaction(
  transaction: any, // Firestore transaction object
  movement: Omit<StockMovement, 'id'>,
  userId: string
) {
  const productRef = doc(db, 'produits', movement.produitId);
  const productSnap = await transaction.get(productRef);
  
  if (!productSnap.exists()) {
    throw new Error(`Produit ${movement.produitId} non trouvé`);
  }
  
  const productData = productSnap.data() as Produit;
  const oldStock = productData.stock;
  const newStock = movement.type === 'ENTREE' 
    ? oldStock + movement.quantite 
    : oldStock - movement.quantite;
    
  // Update CUMP if it's an entry
  let newCump = productData.cump || productData.prixAchat;
  if (movement.type === 'ENTREE' && movement.prixUnitaire > 0) {
    const totalValue = (oldStock * newCump) + (movement.quantite * movement.prixUnitaire);
    const totalQty = oldStock + movement.quantite;
    if (totalQty > 0) {
      newCump = totalValue / totalQty;
    }
  }
  
  // Update product
  transaction.update(productRef, { 
    stock: newStock,
    cump: newCump,
    updatedAt: Date.now()
  });
  
  // Record movement
  const movementRef = doc(collection(db, 'stock_movements'));
  transaction.set(movementRef, {
    ...movement,
    id: movementRef.id,
    createdAt: Date.now()
  });

  // Check for low stock alert
  if (movement.type === 'SORTIE' || movement.type === 'OUT') {
    checkAndNotifyLowStock(
      movement.produitId,
      productData.designation || productData.name || "Inconnu",
      newStock,
      productData.alertStock,
      movement.companyId || productData.companyId || productData.ownerId || "",
      userId
    ).catch(e => console.error("Stock alert notification failed:", e));
  }
}

export async function revertStockMovementWithTransaction(
  transaction: any,
  movement: StockMovement
) {
  const productRef = doc(db, 'produits', movement.produitId);
  const productSnap = await transaction.get(productRef);
  
  if (!productSnap.exists()) return; // Product might have been deleted
  
  const productData = productSnap.data() as Produit;
  const oldStock = productData.stock;
  
  // Revert stock (opposite of original movement)
  const newStock = movement.type === 'ENTREE' 
    ? oldStock - movement.quantite 
    : oldStock + movement.quantite;
    
  // Note: Reverting CUMP is complex and usually not done unless strictly necessary
  // for simplicity, we just revert the stock quantity here.
  
  transaction.update(productRef, { 
    stock: newStock,
    updatedAt: Date.now()
  });
}
