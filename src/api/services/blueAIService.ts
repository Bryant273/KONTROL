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
  deleteDoc,
  getDoc,
  writeBatch,
  auth,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { Transaction, Produit, Charge, UserProfile, Wallet } from '../../frontend/types';
import { apiClient } from '../lib/api-client';
import { ragService } from './ragService';

export enum BlueFunction {
  CHAT = 'CHAT',
  REPORT = 'REPORT',
  CONSEIL = 'CONSEIL',
  TUTO = 'TUTO',
  ALERT = 'ALERT',
  CODE_ANALYSER = 'CODE_ANALYSER'
}

export interface AIMemory {
  id?: string;
  companyId: string;
  userId: string;
  category: 'FACT' | 'PREFERENCE' | 'DECISION' | 'GOAL' | 'SUMMARY';
  content: string;
  source?: string;
  confidence?: number;
  createdAt: number;
  updatedAt: number;
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
        wallets: [],
        tiers: [],
        companyInfo: null
      };
    }

    try {
      const [transactions, products, charges, wallets, tiers, companyDoc] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), where('ownerId', '==', companyId), limit(50))),
        getDocs(query(collection(db, 'produits'), where('ownerId', '==', companyId), limit(50))),
        getDocs(query(collection(db, 'charges'), where('ownerId', '==', companyId), limit(50))),
        getDocs(query(collection(db, 'wallets'), where('ownerId', '==', companyId), limit(10))),
        getDocs(query(collection(db, 'tiers'), where('ownerId', '==', companyId), limit(50))),
        getDoc(doc(db, 'companies', companyId)).catch(() => null)
      ]);

      return {
        companyInfo: companyDoc && companyDoc.exists() ? companyDoc.data() : null,
        transactions: transactions.docs.map(d => ({ id: d.id, ...d.data() })),
        products: products.docs.map(d => ({ id: d.id, ...d.data() })),
        charges: charges.docs.map(d => ({ id: d.id, ...d.data() })),
        wallets: wallets.docs.map(d => ({ id: d.id, ...d.data() })),
        tiers: tiers.docs.map(d => ({ id: d.id, ...d.data() }))
      };
    } catch (error) {
      console.warn("[BlueAI] Could not load company data context from Firestore:", error);
      return {
        transactions: [],
        products: [],
        charges: [],
        wallets: [],
        tiers: [],
        companyInfo: null
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

  async getMemories(companyId: string, userId: string): Promise<AIMemory[]> {
    try {
      if (!companyId || companyId === 'public') return [];
      const q = query(
        collection(db, 'ai_memories'),
        where('companyId', '==', companyId),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AIMemory));
    } catch (error) {
      console.warn("[BlueAI] Memory fetch warning:", error);
      return [];
    }
  }

  async addMemory(
    companyId: string, 
    userId: string, 
    category: 'FACT' | 'PREFERENCE' | 'DECISION' | 'GOAL' | 'SUMMARY', 
    content: string,
    source: string = 'User Direct Input'
  ): Promise<AIMemory> {
    const memoryData: Omit<AIMemory, 'id'> = {
      companyId,
      userId,
      category,
      content,
      source,
      confidence: 0.98,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    try {
      const docRef = await addDoc(collection(db, 'ai_memories'), memoryData);
      return { id: docRef.id, ...memoryData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ai_memories', auth.currentUser, false);
      return { id: 'temp_' + Date.now(), ...memoryData };
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'ai_memories', memoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ai_memories/${memoryId}`, auth.currentUser, false);
    }
  }

  async autoExtractAndSaveMemories(prompt: string, response: string, companyId: string, userId: string): Promise<void> {
    if (!companyId || companyId === 'public') return;

    try {
      const lowerPrompt = prompt.toLowerCase();
      let extractedFact: { category: 'FACT' | 'PREFERENCE' | 'DECISION' | 'GOAL' | 'SUMMARY'; content: string } | null = null;

      if (lowerPrompt.includes("objectif") || lowerPrompt.includes("notre but") || lowerPrompt.includes("cible")) {
        extractedFact = { category: 'GOAL', content: `Objectif exprimé: "${prompt.substring(0, 120)}"` };
      } else if (lowerPrompt.includes("préférence") || lowerPrompt.includes("toujours") || lowerPrompt.includes("préfère")) {
        extractedFact = { category: 'PREFERENCE', content: `Préférence utilisateur: "${prompt.substring(0, 120)}"` };
      } else if (lowerPrompt.includes("décision") || lowerPrompt.includes("validé") || lowerPrompt.includes("décidé")) {
        extractedFact = { category: 'DECISION', content: `Décision d'affaires: "${prompt.substring(0, 120)}"` };
      }

      if (extractedFact) {
        const existing = await this.getMemories(companyId, userId);
        const duplicate = existing.some(m => m.content === extractedFact!.content);
        if (!duplicate) {
          await this.addMemory(companyId, userId, extractedFact.category, extractedFact.content, 'Blue AI Auto-Extraction');
        }
      }
    } catch (e) {
      console.warn("Auto memory extraction skipped:", e);
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

    // 2. Fetch recent conversation history if existing
    let conversationHistory: any[] = [];
    if (currentConvId) {
      try {
        const existingMsgs = await this.getMessages(currentConvId);
        conversationHistory = existingMsgs.map(m => ({
          role: m.role,
          content: m.content,
          senderId: (m as any).senderId
        }));
      } catch (hErr) {
        console.warn("[BlueAI] History fetch warning:", hErr);
      }
    }

    // 3. Save User Message in Firestore
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

    // 4. Fetch Live Company Data Context from Firestore & RAG vector search & Memory Layer
    const companyContextData = await this.getCompanyData(companyId);
    const ragRetrieval = ragService.retrieveRelevantChunks(message, companyContextData, 5);
    const memoryNodes = await this.getMemories(companyId, userId);

    // 5. Generate AI Response via Blue Neural Engine with RAG & Memory Layer
    try {
      const neuralData = await apiClient.post('/api/ai/blue-brain', {
        prompt: message,
        user_id: userId,
        companyId: companyId,
        companyContextData: companyContextData,
        conversationHistory: conversationHistory,
        ragChunks: ragRetrieval.chunks,
        memoryNodes: memoryNodes
      });
      
      const assistantContent = neuralData.response || "Désolé, le cerveau neuronal de KONTROL rencontre une latence temporaire.";
      
      console.log("Blue AI (Neural Hive) Response received:", assistantContent.substring(0, 50) + "...");

      // 6. Save Assistant Message
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

      // 7. Update Conversation
      try {
        await updateDoc(doc(db, 'conversations', currentConvId!), {
          lastMessage: assistantContent,
          updatedAt: Date.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `conversations/${currentConvId}`, auth.currentUser, false);
      }

      // 8. Auto extract memory node asynchronously
      this.autoExtractAndSaveMemories(message, assistantContent, companyId, userId).catch(() => {});

      return {
        content: assistantContent,
        conversationId: currentConvId,
        ragRetrieval,
        memoryNodes
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
