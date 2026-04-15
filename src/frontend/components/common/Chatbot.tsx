import React, { useState, useRef, useEffect } from 'react';
import { Brain, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Sparkles, FileText, Lightbulb, HelpCircle, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { blueAIService, BlueFunction, BlueMessage } from '../../../api/services/blueAIService';
import { auth, signInAnonymously } from '../../../api/firebase';
import Markdown from 'react-markdown';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BlueMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [activeFunction, setActiveFunction] = useState<BlueFunction>(BlueFunction.CHAT);
  const [leadInfo, setLeadInfo] = useState<{ name: string; email: string } | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const savedLead = localStorage.getItem('blue_lead_info');
    if (savedLead) {
      setLeadInfo(JSON.parse(savedLead));
    }
  }, []);

  const handleSend = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customInput || input).trim();
    if (!textToSend || isLoading) return;

    let user = auth.currentUser;
    
    // If no user yet, try to wait a bit or sign in anonymously
    if (!user) {
      try {
        const result = await signInAnonymously(auth);
        user = result.user;
      } catch (err: any) {
        if (err.code === 'auth/admin-restricted-operation') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Désolé, l'accès invité n'est pas encore configuré (Authentification Anonyme désactivée dans Firebase). Veuillez vous connecter pour utiliser le chatbot.",
            function: BlueFunction.CHAT,
            timestamp: Date.now(),
            conversationId: 'auth-error'
          }]);
        } else {
          console.error("Failed to sign in anonymously for chatbot:", err);
        }
        setIsLoading(false);
        return;
      }
    }
    
    // If no lead info and not a "real" user, force form
    if (!user.email && !leadInfo) {
      setShowLeadForm(true);
      return;
    }

    // Restrict guest features
    if (!user.email && (activeFunction === BlueFunction.REPORT || activeFunction === BlueFunction.CONSEIL)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Désolé, la génération de rapports et les conseils personnalisés sont réservés aux utilisateurs connectés. Veuillez vous connecter pour accéder à ces fonctionnalités.",
        function: BlueFunction.CHAT,
        timestamp: Date.now(),
        conversationId: conversationId || 'guest-restricted'
      }]);
      setActiveFunction(BlueFunction.CHAT);
      return;
    }

    const uid = user.uid;
    const companyId = localStorage.getItem('currentCompanyId') || (user.email ? user.uid : 'public');

    // Optimistic update
    const userMessage: BlueMessage = {
      role: 'user',
      content: textToSend,
      function: activeFunction,
      timestamp: Date.now(),
      conversationId: conversationId || 'temp'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // For guests, ensure the prompt is about KONTROL
      let finalMessage = textToSend;
      if (!user.email) {
        finalMessage = `[GUEST_MODE: Only answer about KONTROL platform functioning] ${textToSend}`;
      }

      // Include lead info in the message if it's the first one
      const messageWithLead = leadInfo && messages.length === 0 
        ? `[LEAD: ${leadInfo.name} (${leadInfo.email})] ${finalMessage}`
        : finalMessage;

      const response = await blueAIService.processRequest(
        uid,
        companyId,
        messageWithLead,
        activeFunction,
        conversationId
      );

      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMessage: BlueMessage = {
        role: 'assistant',
        content: response.content,
        function: activeFunction,
        timestamp: Date.now(),
        conversationId: response.conversationId
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Une erreur est survenue. Veuillez réessayer plus tard.",
        function: activeFunction,
        timestamp: Date.now(),
        conversationId: conversationId || 'error'
      }]);
    } finally {
      setIsLoading(false);
      setActiveFunction(BlueFunction.CHAT);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationId) return;
    try {
      await blueAIService.deleteConversation(conversationId);
      setMessages([]);
      setConversationId(undefined);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const info = {
      name: formData.get('name') as string,
      email: formData.get('email') as string
    };
    setLeadInfo(info);
    localStorage.setItem('blue_lead_info', JSON.stringify(info));
    setShowLeadForm(false);
    if (input.trim()) {
      handleSend();
    }
  };

  const quickPrompts = [
    { label: 'Rapport', icon: FileText, func: BlueFunction.REPORT, text: "Génère un rapport d'analyse de mon entreprise." },
    { label: 'Conseils', icon: Lightbulb, func: BlueFunction.CONSEIL, text: "Donne-moi des conseils pour améliorer ma rentabilité." },
    { label: 'Aide', icon: HelpCircle, func: BlueFunction.TUTO, text: "Comment utiliser la section Trésorerie ?" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[3000]">
      <AnimatePresence>
        {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-kontrol-blue text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-kontrol-blue/90 transition-all group relative"
            >
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-kontrol-orange rounded-full border-2 border-white animate-bounce" />
              <Brain size={24} className="group-hover:scale-110 transition-transform" />
            </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '550px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "w-[380px] bg-white rounded-2xl shadow-2xl border border-kontrol-border flex flex-col overflow-hidden transition-all duration-300",
              isMinimized ? "h-[60px]" : "h-[550px]"
            )}
          >
            {/* Header */}
            <div className="bg-kontrol-dark text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-kontrol-blue to-kontrol-orange rounded-lg flex items-center justify-center shadow-lg">
                  <Brain size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[13px] font-extrabold tracking-tight uppercase">Blue AI Intelligence</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Cerveau Actif</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {conversationId && !isMinimized && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Supprimer la conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-kontrol-bg/30 relative">
                  {showDeleteConfirm && (
                    <div className="absolute inset-0 z-50 bg-kontrol-dark/80 backdrop-blur-sm flex items-center justify-center p-6">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl p-6 w-full max-w-[300px] text-center shadow-2xl"
                      >
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle size={24} />
                        </div>
                        <h4 className="text-sm font-extrabold text-kontrol-dark uppercase mb-2">Supprimer ?</h4>
                        <p className="text-[11px] text-kontrol-ink-muted mb-6">Cette action est irréversible. Toutes les données de cet échange seront perdues.</p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2.5 bg-kontrol-bg text-kontrol-dark rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-kontrol-border transition-colors"
                          >
                            Annuler
                          </button>
                          <button 
                            onClick={handleDeleteConversation}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                          >
                            Supprimer
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {showLeadForm ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 bg-kontrol-blue/10 text-kontrol-blue rounded-full flex items-center justify-center mb-4">
                        <User size={24} />
                      </div>
                      <h4 className="text-sm font-extrabold text-kontrol-dark uppercase tracking-tight mb-2">Bienvenue chez KONTROL</h4>
                      <p className="text-[11px] text-kontrol-ink-muted mb-6 font-medium">Une solution <strong>INNOV'KORP</strong>. Laissez-nous vos coordonnées pour que Blue puisse mieux vous assister.</p>
                      
                      <form onSubmit={handleLeadSubmit} className="w-full space-y-3">
                        <input 
                          name="name"
                          type="text"
                          placeholder="Votre nom"
                          required
                          className="w-full px-4 py-2.5 bg-white border border-kontrol-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-kontrol-blue/20 outline-none"
                        />
                        <input 
                          name="email"
                          type="email"
                          placeholder="Votre email"
                          required
                          className="w-full px-4 py-2.5 bg-white border border-kontrol-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-kontrol-blue/20 outline-none"
                        />
                        <button 
                          type="submit"
                          className="w-full py-3 bg-kontrol-blue text-white rounded-xl text-[11px] font-extrabold uppercase tracking-widest shadow-lg shadow-kontrol-blue/20 hover:bg-kontrol-blue/90 transition-all"
                        >
                          Commencer la discussion
                        </button>
                      </form>
                    </div>
                  ) : (
                    <>
                      {messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-kontrol-blue/10 text-kontrol-blue rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot size={24} />
                      </div>
                      <p className="text-sm font-bold text-kontrol-dark uppercase tracking-tight">Bonjour ! Je suis Blue.</p>
                      <p className="text-xs text-kontrol-ink-muted mt-1 font-medium">Posez-moi une question sur vos données ou demandez un rapport.</p>
                      
                      <div className="grid grid-cols-1 gap-2 mt-6">
                        {quickPrompts.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveFunction(p.func);
                              handleSend(undefined, p.text);
                            }}
                            className="flex items-center gap-3 p-3 bg-white border border-kontrol-border rounded-xl hover:border-kontrol-blue hover:bg-kontrol-blue/5 transition-all text-left group"
                          >
                            <div className="w-8 h-8 bg-kontrol-bg rounded-lg flex items-center justify-center text-kontrol-blue group-hover:bg-kontrol-blue group-hover:text-white transition-colors">
                              <p.icon size={16} />
                            </div>
                            <span className="text-xs font-bold text-kontrol-dark">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex gap-3 max-w-[90%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                        msg.role === 'assistant' ? "bg-white text-kontrol-blue border border-kontrol-border" : "bg-kontrol-blue text-white"
                      )}>
                        {msg.role === 'assistant' ? <Brain size={16} /> : <User size={16} />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                        msg.role === 'assistant' 
                          ? "bg-white text-kontrol-dark border border-kontrol-border rounded-tl-none" 
                          : "bg-kontrol-blue text-white rounded-tr-none"
                      )}>
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                        <p className={cn(
                          "text-[9px] mt-1.5 font-medium opacity-50",
                          msg.role === 'user' ? "text-right" : ""
                        )}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.function !== BlueFunction.CHAT && ` • ${msg.function}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-lg bg-white text-kontrol-blue border border-kontrol-border flex items-center justify-center shrink-0 shadow-sm">
                        <Sparkles size={16} className="animate-spin-slow" />
                      </div>
                      <div className="bg-white border border-kontrol-border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-kontrol-blue" />
                        <span className="text-[11px] font-bold text-kontrol-blue uppercase tracking-widest">Blue réfléchit...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
                )}
              </div>

              {/* Input */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-kontrol-border shrink-0">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Posez votre question à Blue..."
                      className="w-full pl-4 pr-12 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-kontrol-blue text-white rounded-lg flex items-center justify-center hover:bg-kontrol-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-kontrol-blue/20"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <p className="text-[10px] text-kontrol-ink-muted font-bold uppercase tracking-widest">
                      Propulsé par <span className="text-kontrol-blue">BLUE AI & INNOV'KORP</span>
                    </p>
                    <div className="h-3 w-px bg-kontrol-border" />
                    <button 
                      type="button"
                      onClick={() => setActiveFunction(BlueFunction.REPORT)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors",
                        activeFunction === BlueFunction.REPORT ? "text-kontrol-orange" : "text-kontrol-ink-muted hover:text-kontrol-blue"
                      )}
                    >
                      Rapport
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
