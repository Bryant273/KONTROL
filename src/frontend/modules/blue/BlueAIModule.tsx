import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Calendar,
  Zap,
  Brain,
  BarChart3,
  Send,
  History,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  ShieldAlert,
  Code2,
  ArrowRight,
  User as UserIcon,
  Plus,
  Bell,
  MoreVertical,
  ChevronRight,
  Trash2,
  Database,
  Search,
  Bookmark,
  Layers,
  Check,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  User,
  handleFirestoreError,
  OperationType,
  auth
} from '../../../api/firebase';
import { UserProfile } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import Markdown from 'react-markdown';
import { blueAIService, BlueFunction, BlueMessage, BlueConversation, AIMemory } from '../../../api/services/blueAIService';
import { ragService, RAGChunk } from '../../../api/services/ragService';
import { motion, AnimatePresence } from 'motion/react';

export interface BlueAIModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
  activeModule?: string;
}

export function getModuleSuggestionChips(moduleName?: string) {
  const mod = (moduleName || 'dashboard').toLowerCase();

  if (mod.includes('stock') || mod.includes('produit')) {
    return [
      { label: "📦 Ruptures de stock", text: "Quels produits sont actuellement en rupture de stock ou sous le seuil d'alerte ?" },
      { label: "📊 Rotation des stocks", text: "Fais une analyse de la vitesse de rotation de mes stocks et identifie les surstocks." },
      { label: "🏷️ Articles plus rentables", text: "Quels sont nos articles ayant les meilleures marges brutes de vente ?" },
      { label: "💡 Conseil réappro", text: "Propose un plan de réapprovisionnement prioritaire pour la semaine." }
    ];
  }

  if (mod.includes('transaction') || mod.includes('tresorerie')) {
    return [
      { label: "💳 Top encaissements", text: "Affiche le top 5 de nos plus gros encaissements récents." },
      { label: "📉 Dépenses anormales", text: "Y a-t-il eu des dépenses anormales ou élevées enregistrées ce mois-ci ?" },
      { label: "📈 Prévision à 30 jours", text: "Donne une projection de la trésorerie nette sur les 30 prochains jours." },
      { label: "🧾 Ventilation des flux", text: "Analyse la répartition de nos revenus et dépenses par catégorie." }
    ];
  }

  if (mod.includes('charge')) {
    return [
      { label: "⚡ Charges urgentes", text: "Quelles sont les charges à régler en priorité dans les 7 prochains jours ?" },
      { label: "📊 Structure de coûts", text: "Analyse la structure de nos charges d'exploitation actuelles." },
      { label: "🔄 Charges récurrentes", text: "Identifie nos charges fixes récurrentes et les opportunités de réduction." },
      { label: "📅 Échéancier de paiement", text: "Génère un résumé de l'échéancier global de paiement des charges." }
    ];
  }

  if (mod.includes('tier') || mod.includes('partenaire')) {
    return [
      { label: "👥 Clients débiteurs", text: "Quels clients ont actuellement un solde débiteur en attente de règlement ?" },
      { label: "🏆 Top fournisseurs", text: "Affiche nos principaux fournisseurs classés par volume de commande." },
      { label: "💬 Taux de recouvrement", text: "Analyse le taux de recouvrement de nos créances clients." },
      { label: "📌 Risque partenaires", text: "Fais une évaluation du risque financier sur nos tiers." }
    ];
  }

  if (mod.includes('finance')) {
    return [
      { label: "💰 Calcul du BFR", text: "Calcule notre Besoin en Fonds de Roulement (BFR) actuel et détaille-le." },
      { label: "🚀 Simulation Bridge", text: "Simule un échéancier et un coût d'avance de trésorerie Bridge pour notre entreprise." },
      { label: "📊 Solde net & liquidités", text: "Quelle est notre capacité d'endettement et notre solde de liquidités disponible ?" },
      { label: "📈 Point mort rentabilité", text: "Estime notre point mort et le seuil de rentabilité mensuel." }
    ];
  }

  return [
    { label: "⚡ Rapport financier", text: "Génère un rapport d'analyse financière global pour mon entreprise." },
    { label: "💡 Conseils stratégiques", text: "Donne-moi des conseils stratégiques pour améliorer notre rentabilité." },
    { label: "📖 Tutoriel KONTROL", text: "Comment utiliser efficacement les fonctionnalités de la plateforme ?" },
    { label: "📦 Synthèse des alertes", text: "Fais une synthèse de toutes les alertes (stocks, charges, créances)." }
  ];
}

export function BlueAIModule({ user, currentUserProfile, activeModule = 'dashboard' }: BlueAIModuleProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BlueMessage[]>([]);
  const [history, setHistory] = useState<BlueConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [currentConvId, setCurrentConvId] = useState<string | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'CHAT' | 'MEMORY' | 'RAG'>('CHAT');
  
  // Memory Layer State
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);
  const [newMemoryCategory, setNewMemoryCategory] = useState<'FACT' | 'PREFERENCE' | 'DECISION' | 'GOAL'>('GOAL');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);

  // RAG Pipeline State
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<{ chunks: RAGChunk[]; totalIndexed: number; summary: string } | null>(null);
  const [isRagSearching, setIsRagSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const companyId = currentUserProfile?.companyId || user.uid;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadHistory();
    loadMemories();
  }, [user.uid, companyId]);

  const loadHistory = async () => {
    try {
      const data = await blueAIService.getHistory(user.uid);
      setHistory(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'conversations', auth.currentUser, false);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadMemories = async () => {
    setIsMemoriesLoading(true);
    try {
      const mems = await blueAIService.getMemories(companyId, user.uid);
      setMemories(mems);
    } catch (error) {
      console.warn("Could not load memories:", error);
    } finally {
      setIsMemoriesLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;
    try {
      const created = await blueAIService.addMemory(companyId, user.uid, newMemoryCategory, newMemoryContent.trim());
      setMemories(prev => [created, ...prev]);
      setNewMemoryContent('');
      setShowAddMemoryModal(false);
    } catch (err) {
      console.error("Could not add memory node:", err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await blueAIService.deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (err) {
      console.error("Could not delete memory node:", err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await blueAIService.deleteConversation(id);
      if (currentConvId === id) {
        setMessages([]);
        setCurrentConvId(undefined);
      }
      setHistory(prev => prev.filter(c => c.id !== id));
      setShowDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'conversations', auth.currentUser, false);
    }
  };

  const handleSend = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const textToSend = customInput || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: BlueMessage = {
      role: 'user',
      content: textToSend,
      function: BlueFunction.CHAT,
      timestamp: Date.now(),
      conversationId: currentConvId || 'temp'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await blueAIService.processRequest(
        user.uid,
        companyId,
        textToSend,
        BlueFunction.CHAT,
        currentConvId
      );

      if (response && response.conversationId && !currentConvId) {
        setCurrentConvId(response.conversationId);
        loadHistory();
      }

      if (response && response.content) {
        const assistantMessage: BlueMessage = {
          role: 'assistant',
          content: response.content,
          function: BlueFunction.CHAT,
          timestamp: Date.now(),
          conversationId: response.conversationId
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

      // Refresh memories in background if new ones were auto-extracted
      setTimeout(() => loadMemories(), 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages', auth.currentUser, false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRAGSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setIsRagSearching(true);
    try {
      // Simulate/Trigger live RAG retrieval test
      const res = await blueAIService.processRequest(user.uid, companyId, `[TEST_RAG] ${ragQuery}`, BlueFunction.CHAT);
      if (res && res.ragRetrieval) {
        setRagResults(res.ragRetrieval);
      }
    } catch (err) {
      console.warn("RAG search test warning:", err);
    } finally {
      setIsRagSearching(false);
    }
  };

  const loadConversation = async (convId: string) => {
    setIsLoading(true);
    setCurrentConvId(convId);
    try {
      const msgs = await blueAIService.getMessages(convId);
      setMessages(msgs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'messages', auth.currentUser, false);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentConvId(undefined);
    setMessages([]);
  };

  const suggestionChips = getModuleSuggestionChips(activeModule);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0f0f0f] rounded-3xl border border-[#222] overflow-hidden shadow-2xl text-[#e8e6df]">
      {/* Sidebar */}
      <div className="w-80 border-r border-[#222] bg-[#161616] flex flex-col shrink-0">
        {/* Header Branding */}
        <div className="p-5 border-b border-[#222]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-2xl bg-[#185FA5] flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#f0ede6] tracking-tight">BLUE AI</h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#185FA5]/20 text-[#7eadda] border border-[#185FA5]/30">v4.5 RAG</span>
              </div>
              <p className="text-[10px] text-[#666] font-bold uppercase tracking-widest">Cognitive Neural Engine</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#0f0f0f] p-1 rounded-xl border border-[#222] text-[11px] font-medium">
            <button
              onClick={() => setSidebarTab('CHAT')}
              className={cn(
                "py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all",
                sidebarTab === 'CHAT' ? "bg-[#1e1e1e] text-[#f0ede6] shadow-sm font-semibold" : "text-[#666] hover:text-[#aaa]"
              )}
            >
              <History size={13} />
              Chats
            </button>
            <button
              onClick={() => setSidebarTab('MEMORY')}
              className={cn(
                "py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all relative",
                sidebarTab === 'MEMORY' ? "bg-[#1e1e1e] text-[#7eadda] shadow-sm font-semibold" : "text-[#666] hover:text-[#aaa]"
              )}
            >
              <Brain size={13} />
              Mémoire
              {memories.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD]" />
              )}
            </button>
            <button
              onClick={() => setSidebarTab('RAG')}
              className={cn(
                "py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all",
                sidebarTab === 'RAG' ? "bg-[#1e1e1e] text-[#34d399] shadow-sm font-semibold" : "text-[#666] hover:text-[#aaa]"
              )}
            >
              <Database size={13} />
              RAG
            </button>
          </div>
        </div>

        {/* Sidebar Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {sidebarTab === 'CHAT' && (
            <div className="space-y-4">
              <button 
                onClick={startNewChat}
                className="w-full py-2.5 px-4 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl text-[12.5px] font-medium text-[#aaa] hover:bg-[#252525] hover:text-[#e8e6df] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus size={14} />
                Nouvelle conversation
              </button>

              <div>
                <p className="text-[10px] text-[#555] font-bold uppercase tracking-[0.1em] px-2 mb-2">Historique des discussions</p>
                {isHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 size={18} className="animate-spin text-[#378ADD]/40" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8">
                    <History size={20} className="mx-auto text-[#2a2a2a] mb-2" />
                    <p className="text-[11px] font-bold text-[#555] uppercase tracking-widest">Aucun historique</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {history.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv.id!)}
                        className={cn(
                          "w-full p-2.5 rounded-xl text-left transition-all group flex items-center gap-2.5 cursor-pointer border",
                          currentConvId === conv.id 
                            ? "bg-[#1a2535] border-[#2a4a6a] text-[#7eadda]" 
                            : "bg-transparent border-transparent text-[#777] hover:bg-[#1e1e1e] hover:text-[#bbb]"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          currentConvId === conv.id ? "bg-[#378ADD]" : "bg-[#333]"
                        )} />
                        <span className="text-[12px] truncate font-medium flex-1">{conv.title || 'Sans titre'}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(conv.id!);
                          }}
                          className="p-1 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {sidebarTab === 'MEMORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-bold text-[#e8e6df] uppercase tracking-wider">Couche Mémoire</h3>
                  <p className="text-[10px] text-[#555]">Contextes & faits mémorisés</p>
                </div>
                <button
                  onClick={() => setShowAddMemoryModal(true)}
                  className="p-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[#7eadda] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Fait
                </button>
              </div>

              {isMemoriesLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={18} className="animate-spin text-[#378ADD]" />
                </div>
              ) : memories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#121212] border border-[#222] text-center">
                  <Brain size={24} className="mx-auto text-[#333] mb-2" />
                  <p className="text-[11px] font-semibold text-[#888]">Aucun fait mémorisé</p>
                  <p className="text-[10px] text-[#555] mt-1">L'IA mémorise automatiquement les objectifs et décisions lors des conversations.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((mem) => (
                    <div key={mem.id} className="p-3 bg-[#141414] border border-[#222] rounded-xl group relative hover:border-[#333] transition-all">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                          mem.category === 'GOAL' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          mem.category === 'DECISION' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          mem.category === 'PREFERENCE' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                          {mem.category}
                        </span>
                        <button
                          onClick={() => handleDeleteMemory(mem.id!)}
                          className="text-[#444] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-[11.5px] text-[#ccc] leading-relaxed">{mem.content}</p>
                      <p className="text-[9px] text-[#555] mt-1.5 italic">{mem.source || 'Auto-mémorisé'} • {new Date(mem.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sidebarTab === 'RAG' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[12px] font-bold text-[#e8e6df] uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={14} className="text-[#34d399]" />
                  Index Vectoriel RAG
                </h3>
                <p className="text-[10px] text-[#555]">Retrieval-Augmented Generation</p>
              </div>

              <div className="p-3 bg-[#121212] border border-[#222] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#888]">Moteur Vectoriel</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold">SYNCHRONISÉ</span>
                </div>
                <div className="text-[10px] text-[#666] leading-relaxed">
                  BlueAI indexe automatiquement les Transactions, Produits, Charges, Tiers et Portefeuilles de votre entreprise pour répondre aux requêtes analytiques avec précision.
                </div>
              </div>

              {/* RAG Tester Form */}
              <form onSubmit={handleTestRAGSearch} className="space-y-2">
                <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider">Tester la recherche vectorielle</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Ex: Stock Ciment, Facture Client..."
                    className="flex-1 bg-[#141414] border border-[#222] rounded-xl px-2.5 py-1.5 text-[11px] text-[#d8d5ce] outline-none focus:border-[#34d399]/50"
                  />
                  <button
                    type="submit"
                    disabled={isRagSearching || !ragQuery.trim()}
                    className="px-3 py-1.5 bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30 rounded-xl text-[11px] font-semibold hover:bg-[#34d399]/30 transition-colors disabled:opacity-50"
                  >
                    {isRagSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  </button>
                </div>
              </form>

              {ragResults && (
                <div className="space-y-2 pt-2 border-t border-[#222]">
                  <p className="text-[10px] text-[#888] font-medium">{ragResults.summary}</p>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                    {ragResults.chunks.map((chunk, i) => (
                      <div key={i} className="p-2 bg-[#141414] border border-[#222] rounded-lg text-[10.5px]">
                        <div className="flex items-center justify-between text-[#34d399] font-bold mb-0.5">
                          <span>{chunk.title}</span>
                          <span className="text-[8.5px] opacity-70">Score: {(chunk.score || 0).toFixed(1)}</span>
                        </div>
                        <p className="text-[#aaa] leading-tight">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info Bar */}
        <div className="p-4 border-t border-[#222] bg-[#161616]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center text-[11px] font-bold text-[#7eadda]">
              {currentUserProfile?.displayName?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-[#bbb] truncate">{currentUserProfile?.displayName || 'Utilisateur'}</p>
              <p className="text-[9.5px] text-[#555] font-bold uppercase tracking-tight">{currentUserProfile?.role?.replace('_', ' ') || 'Membre'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#0f0f0f]">
        {/* Topbar */}
        <div className="h-14 border-b border-[#1c1c1c] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 text-[13.5px] text-[#aaa] font-medium">
            <span>{currentConvId ? history.find(h => h.id === currentConvId)?.title : 'Nouvelle discussion'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141414] border border-[#222] text-[#666] font-mono">
              Module: {activeModule.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg border border-[#222] flex items-center justify-center text-[#555] hover:bg-[#1e1e1e] hover:text-[#aaa] transition-all">
              <Download size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg border border-[#222] flex items-center justify-center text-[#555] hover:bg-[#1e1e1e] hover:text-[#aaa] transition-all relative">
              <Bell size={14} />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E24B4A] rounded-full border border-[#0f0f0f]" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#0e1f32] border border-[#1d3a5a] flex items-center justify-center mb-6 shadow-2xl">
                <Sparkles size={32} className="text-[#7eadda]" />
              </div>
              <h2 className="text-2xl font-semibold text-[#f0ede6] mb-3 tracking-tight">Comment puis-je vous aider ?</h2>
              <p className="text-[#666] text-[13.5px] leading-relaxed mb-8 max-w-md">
                Je suis BLUE AI, votre partenaire d'analyse pour KONTROL. Je dispose d'un moteur d'indexation RAG vectoriel et d'une mémoire persistance à long terme.
              </p>

              {/* Context-Aware Suggestion Cards */}
              <div className="w-full max-w-xl text-left mb-4">
                <p className="text-[10px] text-[#555] font-bold uppercase tracking-widest text-center mb-3">
                  Suggestions contextuelles — Module {activeModule.toUpperCase()}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {suggestionChips.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(undefined, s.text)}
                      className="p-3.5 bg-[#121212] border border-[#1e1e1e] rounded-2xl hover:border-[#2a4a6a] hover:bg-[#0e1f32]/40 transition-all text-left group shadow-sm"
                    >
                      <span className="text-[11px] font-bold text-[#7eadda] block mb-1">{s.label}</span>
                      <p className="text-[11.5px] text-[#666] group-hover:text-[#ccc] transition-colors line-clamp-2">{s.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-8">
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={cn(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold",
                    msg.role === 'assistant' 
                      ? "bg-[#0e1f32] border border-[#1d3a5a] text-[#7eadda]" 
                      : "bg-[#1e1e1e] border border-[#2a2a2a] text-[#888]"
                  )}>
                    {msg.role === 'assistant' ? <Brain size={16} /> : currentUserProfile?.displayName?.substring(0, 1).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col max-w-[82%]">
                    <div className={cn(
                      "p-4 rounded-2xl text-[13.5px] leading-relaxed shadow-sm border",
                      msg.role === 'assistant' 
                        ? "bg-[#161616] border-[#1e1e1e] text-[#d8d5ce] rounded-tl-none" 
                        : "bg-[#1a2535] border-[#1d3050] text-[#c8daf0] rounded-tr-none"
                    )}>
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-[#f0ede6] prose-strong:text-[#7eadda]">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] text-[#444] mt-1.5 px-1 font-medium flex items-center gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#0e1f32] border border-[#1d3a5a] flex items-center justify-center shrink-0 text-[11px] font-bold text-[#7eadda]">
                    <Brain size={16} />
                  </div>
                  <div className="bg-[#161616] border border-[#1e1e1e] p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce" />
                      <span className="text-[11px] text-[#666] font-mono ml-2">Recherche vectorielle RAG & Inférence neuronale...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar & Suggestion Chips */}
        <div className="p-6 shrink-0 border-t border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="max-w-3xl mx-auto">
            {/* Dynamic Context Suggestion Chips */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto custom-scrollbar pb-1">
              <span className="text-[10px] text-[#555] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Zap size={11} className="text-[#378ADD]" />
                Suggestions:
              </span>
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, chip.text)}
                  className="px-3 py-1 rounded-full border border-[#222] bg-[#141414] text-[11.5px] text-[#777] hover:border-[#2a4a6a] hover:text-[#7eadda] hover:bg-[#0e1f32]/40 transition-all shrink-0 whitespace-nowrap"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="relative group">
              <div className="flex items-end gap-3 bg-[#141414] border border-[#222] rounded-2xl p-3 focus-within:border-[#2a4a6a] transition-all shadow-xl">
                <textarea 
                  placeholder={`Posez votre question à BLUE AI (contexte : ${activeModule})...`}
                  className="flex-1 bg-transparent border-none outline-none text-[#d8d5ce] text-[13.5px] font-medium resize-none max-h-32 py-1 px-2 custom-scrollbar"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 bg-[#185FA5] text-white rounded-xl flex items-center justify-center hover:bg-[#1a6db5] transition-all disabled:bg-[#1e1e1e] disabled:text-[#444] shadow-lg shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
            <p className="text-center text-[9.5px] text-[#333] font-bold uppercase tracking-[0.2em] mt-3">
              KONTROL Neural Architecture • RAG Vector Search & Firestore Memory Enabled
            </p>
          </div>
        </div>
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddMemoryModal && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md text-left shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#1e2d3d] flex items-center justify-center text-[#7eadda]">
                  <Brain size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#f0ede6] uppercase tracking-wider">Ajouter une mémoire persistance</h4>
                  <p className="text-[11px] text-[#666]">L'IA tiendra compte de ce fait dans toutes ses analyses.</p>
                </div>
              </div>

              <form onSubmit={handleAddMemory} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#888] uppercase mb-1">Catégorie</label>
                  <select
                    value={newMemoryCategory}
                    onChange={(e: any) => setNewMemoryCategory(e.target.value)}
                    className="w-full bg-[#121212] border border-[#222] rounded-xl p-2.5 text-[12px] text-[#d8d5ce] outline-none"
                  >
                    <option value="GOAL">🎯 GOAL (Objectif d'affaires)</option>
                    <option value="FACT">📌 FACT (Fait important)</option>
                    <option value="DECISION">⚡ DECISION (Règle validée)</option>
                    <option value="PREFERENCE">⭐ PREFERENCE (Préférence stratégique)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#888] uppercase mb-1">Contenu / Fait à mémoriser</label>
                  <textarea
                    rows={3}
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    placeholder="Ex: L'objectif de chiffre d'affaires du trimestre est de 50 millions F CFA."
                    className="w-full bg-[#121212] border border-[#222] rounded-xl p-2.5 text-[12px] text-[#d8d5ce] outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemoryModal(false)}
                    className="flex-1 py-2.5 bg-[#222] text-[#aaa] rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#2a2a2a] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newMemoryContent.trim()}
                    className="flex-1 py-2.5 bg-[#185FA5] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#1a6db5] transition-colors shadow-lg disabled:opacity-50"
                  >
                    Mémoriser
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-[320px] text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-extrabold text-[#f0ede6] uppercase mb-2">Supprimer ?</h4>
              <p className="text-[11px] text-[#777] mb-6">Cette conversation sera définitivement supprimée de votre historique.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-[#222] text-[#aaa] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#2a2a2a] transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleDeleteConversation(showDeleteConfirm)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
