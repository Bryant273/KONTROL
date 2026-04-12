import { GoogleGenAI, Type } from "@google/genai";
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
import { Transaction, Produit, Charge, UserProfile, Wallet } from '../types';

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
  private ai: GoogleGenAI;
  private model = "gemini-3-flash-preview";

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

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
      console.error("Error fetching company data for Blue AI:", error);
      return {
        transactions: [],
        products: [],
        charges: [],
        wallets: []
      };
    }
  }

  private getSystemInstruction(func: BlueFunction, context?: any) {
    const base = `Tu es BLUE AI, le cerveau intelligent de KONTROL. 
    KONTROL est une solution moderne pour les entreprises, propulsé par INNOV'KORP. 
    Ton rôle est d'être l'assistant ultime, l'oeil scribe et le guide pour l'utilisateur.

    CONNAISSANCES FONCTIONNELLES DE KONTROL:
    - DASHBOARD: Vue d'ensemble avec KPIs (Trésorerie, CA, Dépenses, Profit, Rendement).
    - VENTES: Gestion des factures clients, devis et paiements.
    - ACHATS: Gestion des commandes fournisseurs et charges d'exploitation.
    - STOCKS: Inventaire en temps réel, alertes de stock bas, mouvements de stock.
    - TRÉSORERIE: Gestion des comptes (Caisse, Banque, Mobile Money), transferts et suivi des flux.
    - TIERS: Annuaire des clients et fournisseurs.
    - RAPPORTS: Analyses détaillées et export PDF.
    - ADMIN: Interface de supervision globale pour les administrateurs système.

    RÈGLES DE RÉPONSE:
    1. Ne réponds qu'aux questions concernant KONTROL ou la gestion d'entreprise.
    2. Si l'utilisateur n'est pas connecté, demande-lui de s'enregistrer ou de se connecter pour accéder aux fonctionnalités avancées.
    3. Tes réponses doivent être factuelles et basées sur le fonctionnement réel de l'application.
    4. Utilise un ton professionnel, encourageant et précis.
    5. Pour les suggestions, propose toujours des actions réalisables dans KONTROL.
    
    CONTEXTE ACTUEL:
    ${JSON.stringify(context || {})}
    `;

    switch (func) {
      case BlueFunction.REPORT:
        return `${base}\nFONCTION REPORT: Analyse les données fournies et génère un rapport détaillé avec des commentaires pertinents sur la santé financière, les ventes et les stocks.`;
      case BlueFunction.CONSEIL:
        return `${base}\nFONCTION CONSEILS: Fournis des conseils stratégiques basés sur l'analyse des données. Sois proactif et suggère des améliorations.`;
      case BlueFunction.TUTO:
        return `${base}\nFONCTION TUTO-PROF: Guide l'utilisateur dans l'utilisation de KONTROL. Explique comment utiliser chaque section (Ventes, Achats, Stocks, Trésorerie, etc.).`;
      case BlueFunction.ALERT:
        return `${base}\nFONCTION ALERT: Analyse les données pour détecter des anomalies ou des points d'attention (stock bas, retard de paiement, baisse de marge) et propose des notifications.`;
      case BlueFunction.CODE_ANALYSER:
        return `${base}\nFONCTION CODE ANALYSER: Tu es en mode Admin KONTROL. Analyse les structures de données et propose des optimisations techniques pour l'application KONTROL.`;
      default:
        return `${base}\nFONCTION CHAT: Discute normalement, reformule les besoins de l'utilisateur pour qu'ils collent aux protocoles KONTROL.`;
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
      handleFirestoreError(error, OperationType.DELETE, `conversations/${conversationId}`, auth.currentUser);
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
          companyId,
          title: message.substring(0, 50) + '...',
          lastMessage: message,
          updatedAt: Date.now(),
          createdAt: Date.now()
        });
        currentConvId = convDoc.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations', auth.currentUser);
    }

    // 2. Save User Message
    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: currentConvId,
        role: 'user',
        content: message,
        function: func,
        timestamp: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages', auth.currentUser);
    }

    // 3. Get Context Data
    const companyData = await this.getCompanyData(companyId);

    // 4. Generate AI Response
    const systemInstruction = this.getSystemInstruction(func, { 
      companyData,
      timestamp: Date.now()
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const assistantContent = response.text || "Désolé, je n'ai pas pu traiter votre demande.";
      console.log("Blue AI Response generated:", assistantContent.substring(0, 50) + "...");

      // 5. Save Assistant Message
      try {
        await addDoc(collection(db, 'messages'), {
          conversationId: currentConvId,
          role: 'assistant',
          content: assistantContent,
          function: func,
          timestamp: Date.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'messages', auth.currentUser);
      }

      // 6. Update Conversation
      try {
        await updateDoc(doc(db, 'conversations', currentConvId), {
          lastMessage: assistantContent,
          updatedAt: Date.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `conversations/${currentConvId}`, auth.currentUser);
      }

      return {
        content: assistantContent,
        conversationId: currentConvId
      };
    } catch (error) {
      console.error("Blue AI Error:", error);
      throw error;
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
      handleFirestoreError(error, OperationType.LIST, 'conversations', auth.currentUser);
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
      handleFirestoreError(error, OperationType.LIST, 'messages', auth.currentUser);
      return [];
    }
  }

  async analyzeCode(code: string) {
    const systemInstruction = this.getSystemInstruction(BlueFunction.CODE_ANALYSER);
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: `Analyse ce code et propose des améliorations:\n\n${code}` }] }],
      config: { systemInstruction }
    });
    return response.text;
  }
}

export const blueAIService = new BlueAIService();
