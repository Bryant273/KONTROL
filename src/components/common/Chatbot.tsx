import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant KONTROL. Comment puis-je vous aider aujourd'hui ?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: input }]
          }
        ],
        config: {
          systemInstruction: "Tu es l'assistant intelligent de KONTROL, une plateforme de gestion d'entreprise. Tu es expert en comptabilité, gestion de stocks, et analyse financière. Réponds de manière concise, professionnelle et aidante. Si on te demande des informations spécifiques sur l'entreprise de l'utilisateur, explique que tu es en cours d'intégration avec ses données réelles."
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "Désolé, je n'ai pas pu générer de réponse.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Une erreur est survenue. Veuillez réessayer plus tard.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[3000]">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-kontrol-blue text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-kontrol-blue/90 transition-all group"
          >
            <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
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
              height: isMinimized ? '60px' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "w-[350px] bg-white rounded-2xl shadow-2xl border border-kontrol-border flex flex-col overflow-hidden transition-all duration-300",
              isMinimized ? "h-[60px]" : "h-[500px]"
            )}
          >
            {/* Header */}
            <div className="bg-kontrol-dark text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-kontrol-blue rounded-lg flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-[13px] font-extrabold tracking-tight">Assistant KONTROL</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">En ligne</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-kontrol-bg/30">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                        msg.role === 'assistant' ? "bg-white text-kontrol-blue border border-kontrol-border" : "bg-kontrol-blue text-white"
                      )}>
                        {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                        msg.role === 'assistant' 
                          ? "bg-white text-kontrol-dark border border-kontrol-border rounded-tl-none" 
                          : "bg-kontrol-blue text-white rounded-tr-none"
                      )}>
                        {msg.content}
                        <p className={cn(
                          "text-[9px] mt-1.5 font-medium opacity-50",
                          msg.role === 'user' ? "text-right" : ""
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-lg bg-white text-kontrol-blue border border-kontrol-border flex items-center justify-center shrink-0 shadow-sm">
                        <Bot size={16} />
                      </div>
                      <div className="bg-white border border-kontrol-border p-3 rounded-2xl rounded-tl-none shadow-sm">
                        <Loader2 size={16} className="animate-spin text-kontrol-blue" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-kontrol-border shrink-0">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Posez votre question..."
                      className="w-full pl-4 pr-12 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
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
                  <p className="text-[10px] text-center text-kontrol-ink-muted mt-2 font-medium">
                    Propulsé par <span className="text-kontrol-blue font-bold">BLUE AI</span>
                  </p>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
