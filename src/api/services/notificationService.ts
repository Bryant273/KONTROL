import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType, auth } from '../firebase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface SendNotificationParams {
  companyId: string;
  userId?: string; // Optional: specific user, if omitted, all users in company see it? 
  // (Note: current NotificationCenter filters by companyId)
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: any;
}

export async function sendNotification({
  companyId,
  userId,
  title,
  message,
  type,
  link,
  metadata
}: SendNotificationParams) {
  try {
    await addDoc(collection(db, 'notifications'), {
      companyId,
      userId: userId || null,
      title,
      message,
      type,
      link: link || null,
      read: false,
      timestamp: Date.now(),
      serverTimestamp: serverTimestamp(),
      ...metadata
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications', auth.currentUser, false);
  }
}

export async function notifyPaymentError(companyId: string, userId: string, amount: number, errorDetail: string) {
  await sendNotification({
    companyId,
    userId,
    title: "❌ Échec de Paiement",
    message: `Une erreur est survenue lors d'une tentative de paiement de ${amount} FCFA. Détail: ${errorDetail}`,
    type: 'error',
    link: 'transactions:error',
    metadata: {
      amount,
      errorDetail,
      isPaymentError: true
    }
  });
}

export async function notifySecurityEvent(companyId: string | 'system', userId: string | null, eventType: string, details: string) {
  await sendNotification({
    companyId,
    userId: userId || undefined,
    title: "🛡️ Alerte Sécurité",
    message: `Événement de sécurité détecté: ${eventType}. ${details}`,
    type: 'warning',
    link: 'journal:security',
    metadata: {
      eventType,
      details,
      isSecurityAlert: true
    }
  });
}

export async function checkAndNotifyLowStock(productId: string, productName: string, newStock: number, alertStock: number | undefined, companyId: string, userId: string) {
  const threshold = alertStock !== undefined ? alertStock : 5;
  if (newStock <= threshold) {
    await sendNotification({
      companyId,
      userId,
      title: "⚠️ Alerte Stock Faible",
      message: `Le produit "${productName}" est en rupture ou presque (Stock actuel: ${newStock}, Seuil: ${threshold}).`,
      type: 'warning',
      link: `stocks:${productId}`,
      metadata: {
        productId,
        stockLevel: newStock,
        threshold,
        isStockAlert: true
      }
    });
  }
}
