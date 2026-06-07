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
  Trash2
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
import { blueAIService, BlueFunction, BlueMessage, BlueConversation } from '../../../api/services/blueAIService';
import { motion, AnimatePresence } from 'motion/react';

interface BlueAIModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function BlueAIModule({ user, currentUserProfile }: BlueAIModuleProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BlueMessage[]>([]);
  const [history, setHistory] = useState<BlueConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [currentConvId, setCurrentConvId] = useState<string | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [cognitiveIndexes, setCognitiveIndexes] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadHistory();
  }, [user.uid]);

  const loadCognitiveIndexes = async () => {
    try {
      const idxs = await blueAIService.getIndexes();
      if (Array.isArray(idxs)) {
        setCognitiveIndexes(idxs);
      }
    } catch (e) {
      console.warn("Could not query dynamic brain indexes:", e);
    }
  };

  useEffect(() => {
    loadCognitiveIndexes();
  }, [currentConvId, messages.length]);

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

    // Optimistic update
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
      const companyId = currentUserProfile?.companyId || user.uid;
      const response = await blueAIService.processRequest(
        user.uid,
        companyId,
        textToSend,
        BlueFunction.CHAT, // The backend service will decide if it needs to trigger a specific function
        currentConvId
      );

      if (response.conversationId && !currentConvId) {
        setCurrentConvId(response.conversationId);
        loadHistory();
      }

      const assistantMessage: BlueMessage = {
        role: 'assistant',
        content: response.content,
        function: BlueFunction.CHAT,
        timestamp: Date.now(),
        conversationId: response.conversationId
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages', auth.currentUser, false);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0f0f0f] rounded-3xl border border-[#222] overflow-hidden shadow-2xl text-[#e8e6df]">
      {/* Sidebar: History */}
      <div className="w-72 border-r border-[#222] bg-[#161616] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#222]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-[#185FA5] flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#f0ede6] tracking-tight">BLUE</h2>
              <p className="text-[10px] text-[#555] font-bold uppercase tracking-widest">Moteur IA — KONTROL</p>
            </div>
          </div>
          <button 
            onClick={startNewChat}
            className="w-full py-2.5 px-4 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl text-[13px] font-medium text-[#aaa] hover:bg-[#252525] hover:text-[#e8e6df] transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={14} />
            Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={20} className="animate-spin text-[#378ADD]/40" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History size={24} className="mx-auto text-[#222] mb-3" />
              <p className="text-[11px] font-bold text-[#444] uppercase tracking-widest">Aucun historique</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-[#444] font-bold uppercase tracking-[0.1em] px-3 mb-2">Récents</p>
                <div className="space-y-1">
                  {history.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id!)}
                      className={cn(
                        "w-full p-3 rounded-xl text-left transition-all group flex items-center gap-3 cursor-pointer",
                        currentConvId === conv.id 
                          ? "bg-[#1a2535] text-[#7eadda]" 
                          : "text-[#666] hover:bg-[#1e1e1e] hover:text-[#bbb]"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        currentConvId === conv.id ? "bg-[#378ADD]" : "bg-[#333]"
                      )} />
                      <span className="text-[12.5px] truncate font-medium flex-1">{conv.title || 'Sans titre'}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(conv.id!);
                        }}
                        className="p-1.5 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#222] bg-[#161616]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center text-[11px] font-bold text-[#7eadda]">
              {currentUserProfile?.displayName?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#bbb] truncate">{currentUserProfile?.displayName || 'Utilisateur'}</p>
              <p className="text-[10px] text-[#444] font-bold uppercase tracking-tight">{currentUserProfile?.role?.replace('_', ' ') || 'Membre'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Chat */}
      <div className="flex-1 flex flex-col bg-[#0f0f0f]">
        {/* Topbar */}
        <div className="h-14 border-b border-[#1c1c1c] flex items-center justify-between px-6 shrink-0">
          <div className="text-[14px] text-[#888] font-medium">
            {currentConvId ? history.find(h => h.id === currentConvId)?.title : 'Nouvelle discussion'}
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#0e1f32] border border-[#1d3a5a] flex items-center justify-center mb-8 shadow-2xl">
                <Sparkles size={32} className="text-[#7eadda]" />
              </div>
              <h2 className="text-2xl font-semibold text-[#f0ede6] mb-4 tracking-tight">Comment puis-je vous aider ?</h2>
              <p className="text-[#555] text-[14px] leading-relaxed mb-10 max-w-md">
                Je suis BLUE, votre assistant intelligent. Je peux analyser vos ventes, gérer vos stocks ou vous guider dans KONTROL.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  "Analyse mes ventes du mois",
                  "Quels produits sont en rupture ?",
                  "Comment créer une facture ?",
                  "Donne-moi des conseils de croissance",
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(undefined, s)}
                    className="p-4 bg-[#111] border border-[#1e1e1e] rounded-2xl hover:border-[#2a4a6a] hover:bg-[#0e1f32]/30 transition-all text-left group"
                  >
                    <p className="text-[12.5px] text-[#666] group-hover:text-[#7eadda] transition-colors">{s}</p>
                  </button>
                ))}
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
                  <div className="flex flex-col max-w-[80%]">
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
                      "text-[10px] text-[#333] mt-1.5 px-1 font-medium",
                      msg.role === 'user' ? "text-right" : ""
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
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {[
                { label: "Analyse financière", func: BlueFunction.REPORT, text: "Génère un rapport d'analyse financière de mon entreprise." },
                { label: "Conseils stratégiques", func: BlueFunction.CONSEIL, text: "Donne-moi des conseils pour améliorer ma rentabilité." },
                { label: "Aide Tutoriel", func: BlueFunction.TUTO, text: "Comment utiliser la section Trésorerie ?" },
                { label: "Alertes Stocks", func: BlueFunction.ALERT, text: "Y a-t-il des alertes sur mes stocks ?" }
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, q.text)}
                  className="px-3 py-1.5 rounded-full border border-[#222] text-[12px] text-[#555] hover:border-[#2a4a6a] hover:text-[#7eadda] hover:bg-[#0e1f32]/30 transition-all"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSend} className="relative group">
              <div className="flex items-end gap-3 bg-[#141414] border border-[#222] rounded-2xl p-3 focus-within:border-[#2a4a6a] transition-all shadow-xl">
                <textarea 
                  placeholder="Posez votre question..."
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
                  className="w-9 h-9 bg-[#185FA5] text-white rounded-xl flex items-center justify-center hover:bg-[#1a6db5] transition-all disabled:bg-[#1e1e1e] disabled:text-[#444] shadow-lg"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
            <p className="text-center text-[10px] text-[#222] font-bold uppercase tracking-[0.2em] mt-4">
              Intelligence Artificielle de KONTROL
            </p>
          </div>
        </div>
      </div>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-[320px] text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-extrabold text-kontrol-dark uppercase mb-2">Supprimer ?</h4>
              <p className="text-[11px] text-kontrol-ink-muted mb-6">Cette conversation sera définitivement supprimée de votre historique.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-kontrol-bg text-kontrol-dark rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-kontrol-border transition-colors"
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
