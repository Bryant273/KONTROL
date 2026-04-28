import { db, collection, addDoc, serverTimestamp } from '../firebase';

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
    console.error("Error sending notification:", error);
  }
}
