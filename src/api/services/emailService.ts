import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../firebase';

export const emailService = {
  subscribeToTickets(callback: (tickets: any[]) => void) {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tickets', null, false);
    });
  },

  async sendReply(ticketId: string, message: string, adminName?: string) {
    try {
      const reply = {
        message,
        adminName: adminName || 'Admin KONTROL',
        createdAt: Date.now(),
        type: 'REPLY'
      };
      
      // In a real app, this would trigger a Cloud Function to send a real email
      console.log(`Sending email reply to ticket ${ticketId}: ${message}`);
      
      // Update ticket in Firestore
      return await addDoc(collection(db, `tickets/${ticketId}/replies`), reply);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tickets/${ticketId}/replies`, null);
    }
  },

  async sendNoReplyEmail(to: string, subject: string, body: string) {
    console.log(`Sending no-reply email to ${to}: ${subject}`);
    return Promise.resolve();
  }
};
