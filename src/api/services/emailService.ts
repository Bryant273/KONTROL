import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from '../firebase';

export const emailService = {
  subscribeToTickets(callback: (tickets: any[]) => void) {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async sendReply(ticketId: string, message: string, adminName?: string) {
    const reply = {
      message,
      adminName: adminName || 'Admin KONTROL',
      createdAt: Date.now(),
      type: 'REPLY'
    };
    
    // In a real app, this would trigger a Cloud Function to send a real email
    console.log(`Sending email reply to ticket ${ticketId}: ${message}`);
    
    // Update ticket in Firestore
    const ticketRef = collection(db, 'tickets');
    // This is a simplification, usually you'd update the specific ticket document
    return addDoc(collection(db, `tickets/${ticketId}/replies`), reply);
  },

  async sendNoReplyEmail(to: string, subject: string, body: string) {
    console.log(`Sending no-reply email to ${to}: ${subject}`);
    return Promise.resolve();
  }
};
