import { db, collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc } from '../firebase';

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  email: string;
  name: string;
  status: 'NEW' | 'PENDING' | 'RESOLVED';
  createdAt: number;
  replies?: TicketReply[];
}

export interface TicketReply {
  message: string;
  sender: 'ADMIN' | 'USER';
  createdAt: number;
}

export const emailService = {
  // Mock fetching emails from Innov.korp@gmail.com
  // In a real app, this would call a backend API that uses IMAP/Gmail API
  subscribeToTickets: (callback: (tickets: Ticket[]) => void) => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
      callback(tickets);
    });
  },

  // Send a reply (Mocking sending an email)
  sendReply: async (ticketId: string, message: string) => {
    const ticketRef = doc(db, 'tickets', ticketId);
    const reply: TicketReply = {
      message,
      sender: 'ADMIN',
      createdAt: Date.now()
    };
    
    // In a real app, we would also trigger a cloud function to send the actual email
    // via SendGrid/Mailgun/etc.
    await updateDoc(ticketRef, {
      status: 'PENDING',
      replies: [...(await (await getDoc(ticketRef)).data()?.replies || []), reply]
    });
  },

  // Send a "No-Reply" email
  sendNoReplyEmail: async (to: string, subject: string, body: string) => {
    // This would call an API endpoint that sends from no-reply@kontrol.com
    console.log(`Sending no-reply email to ${to}: ${subject}`);
    await addDoc(collection(db, 'system_emails'), {
      to,
      subject,
      body,
      type: 'NO_REPLY',
      sentAt: Date.now()
    });
  }
};

import { getDoc } from 'firebase/firestore';
