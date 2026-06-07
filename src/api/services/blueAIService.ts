import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
  auth,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { Transaction, Produit, Charge, UserProfile, Wallet } from '../../frontend/types';
import { apiClient } from '../lib/api-client';

export enum BlueFunction {
  CHAT = 'CHAT',
  REPORT = 'REPORT',
  CONSEIL = 'CONSEIL',
  TUTO = 'TUTO',
  ALERT = 'ALERT',
  CODE_ANALYSER = 'CODE_ANALYSER'
}

export interface BlueMessage {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  function: BlueFunction;
  timestamp: number;
}

export interface BlueConversation {
  id?: string;
  userId: string;
  companyId: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
  createdAt: number;
}

class BlueAIService {
  private async getCompanyData(companyId: string) {
    if (!companyId || companyId === 'public') {
      return {
        transactions: [],
        products: [],
        charges: [],
        wallets: []
      };
    }

    try {
      const [transactions, products, charges, wallets] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'produits'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'charges'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'wallets'), where('ownerId', '==', companyId)))
      ]);

      return {
        transactions: transactions.docs.map(d => d.data() as Transaction),
        products: products.docs.map(d => d.data() as Produit),
        charges: charges.docs.map(d => d.data() as Charge),
        wallets: wallets.docs.map(d => d.data() as Wallet)
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'company_data', auth.currentUser, false);
      return {
        transactions: [],
        products: [],
        charges: [],
        wallets: []
      };
    }
  }

  async deleteConversation(conversationId: string) {
    try {
      // Delete all messages in the conversation
      const msgsQuery = query(collection(db, 'messages'), where('conversationId', '==', conversationId));
      const msgsSnapshot = await getDocs(msgsQuery);
      const batch = writeBatch(db);
      msgsSnapshot.docs.forEach(d => batch.delete(d.ref));
      
      // Delete the conversation document
      batch.delete(doc(db, 'conversations', conversationId));
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `conversations/${conversationId}`, auth.currentUser, false);
    }
  }

  async processRequest(
    userId: string, 
    companyId: string, 
    message: string, 
    func: BlueFunction = BlueFunction.CHAT,
    conversationId?: string
  ) {
    // 1. Get or Create Conversation
    let currentConvId = conversationId;
    try {
      if (!currentConvId) {
        const convDoc = await addDoc(collection(db, 'conversations'), {
          userId,
          participants: [userId],
          companyId,
          title: message.substring(0, 50) + '...',
          lastMessage: message,
          updatedAt: Date.now(),
          createdAt: Date.now()
        });
        currentConvId = convDoc.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations', auth.currentUser, false);
    }

    // 2. Save User Message
    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: currentConvId,
        role: 'user',
        senderId: userId,
        content: message,
        function: func,
        timestamp: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages', auth.currentUser, false);
    }

    // 3. Get Context Data
    // const companyData = await this.getCompanyData(companyId); // Context could be used by engine

    // 4. Generate AI Response via Blue Neural Engine
    try {
      const neuralData = await apiClient.post('/api/ai/blue-brain', {
        prompt: message,
        user_id: userId,
        companyId: companyId
      });
      
      const assistantContent = neuralData.response || "Désolé, le cerveau neuronal de KONTROL rencontre une latence temporaire.";
      
      console.log("Blue AI (Neural Hive) Response received:", assistantContent.substring(0, 50) + "...");

      // 5. Save Assistant Message
      try {
        await addDoc(collection(db, 'messages'), {
          conversationId: currentConvId,
          role: 'assistant',
          senderId: 'blue-ai',
          content: assistantContent,
          function: func,
          timestamp: Date.now(),
          neural_consensus: neuralData.consensus // Store consensus meta
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'messages/assistant', auth.currentUser, false);
      }

      // 6. Update Conversation
      try {
        await updateDoc(doc(db, 'conversations', currentConvId!), {
          lastMessage: assistantContent,
          updatedAt: Date.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `conversations/${currentConvId}`, auth.currentUser, false);
      }

      return {
        content: assistantContent,
        conversationId: currentConvId
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ai/blue-brain', auth.currentUser, true);
    }
  }

  async getHistory(userId: string) {
    try {
      const q = query(
        collection(db, 'conversations'), 
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlueConversation));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'conversations', auth.currentUser, false);
      return [];
    }
  }

  async getMessages(conversationId: string) {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlueMessage));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'messages', auth.currentUser, false);
      return [];
    }
  }

  async analyzeCode(code: string) {
    try {
      const data = await apiClient.post('/api/ai/blue-brain', {
        prompt: `ANALYSE_CODE: ${code}`,
        user_id: auth.currentUser?.uid || 'system'
      });
      return data.response;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ai/blue-brain/analyze', auth.currentUser, false);
      return "Erreur lors de l'analyse du code.";
    }
  }

  async getIndexes() {
    try {
      const data = await apiClient.get('/api/ai/indexes');
      return data;
    } catch (error) {
      console.warn("Could not load cognitive indexes:", error);
      return [];
    }
  }
}

export const blueAIService = new BlueAIService();
