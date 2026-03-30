import React from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { askBlueAI } from '../../services/geminiService';
import { cn } from '../../lib/utils';
import { User as FirebaseUser } from '../../firebase';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface BlueAIModuleProps {
  user: FirebaseUser;
}

export function BlueAIModule({ user }: BlueAIModuleProps) {
  const [messages, setMessages] = React.useState<Message[]>([
    { role: 'ai', content: `Bonjour ${user.displayName || ''} ! Je suis Blue AI, votre assistant KONTROL. Comment puis-je vous aider aujourd'hui ? Je peux analyser vos ventes, vos stocks ou vous donner des conseils de gestion.` }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const context = `Utilisateur: ${user.displayName} (${user.email}). Entreprise: KONTROL.`;
    const response = await askBlueAI(userMessage, context);
    setMessages(prev => [...prev, { role: 'ai', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center">
          Blue AI
          <Sparkles className="ml-2 text-blue-500" size={24} />
        </h2>
        <p className="text-muted-foreground">Intelligence artificielle prédictive pour votre gestion.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-black/5 shadow-sm flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={cn(
                "flex items-start gap-4 max-w-[85%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                m.role === 'ai' ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
              )}>
                {m.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                m.role === 'ai' ? "bg-blue-50/50 text-gray-800" : "bg-black text-white"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Bot size={20} />
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/50 text-gray-400 flex items-center">
                <Loader2 size={16} className="animate-spin mr-2" />
                Blue AI réfléchit...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/30">
          <div className="relative">
            <input 
              type="text"
              placeholder="Posez une question sur votre gestion..."
              className="w-full pl-4 pr-12 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#141414] text-white rounded-lg hover:bg-black/80 disabled:opacity-50 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2">
            Blue AI peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
