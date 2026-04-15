import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  Star, 
  Trash2, 
  Archive, 
  Send, 
  Inbox, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Paperclip,
  ArrowLeft,
  User,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
}

const MOCK_EMAILS: Email[] = [
  {
    id: '1',
    from: 'Google Cloud',
    fromEmail: 'noreply-cloud@google.com',
    subject: 'Alerte de facturation : Seuil de 50€ atteint',
    snippet: 'Votre projet KONTROL-PROD a atteint 80% de son budget mensuel...',
    body: 'Bonjour,\n\nNous vous informons que votre projet KONTROL-PROD a atteint 80% de son budget mensuel de 50,00 €. \n\nVous pouvez consulter les détails dans votre console Google Cloud.\n\nCordialement,\nL\'équipe Google Cloud',
    date: '10:45',
    isRead: false,
    isStarred: true,
    labels: ['Système', 'Finance']
  },
  {
    id: '2',
    from: 'Stripe Support',
    fromEmail: 'support@stripe.com',
    subject: 'Vérification de compte requise',
    snippet: 'Pour continuer à recevoir des virements, veuillez mettre à jour vos informations...',
    body: 'Cher partenaire,\n\nConformément aux réglementations bancaires, nous devons vérifier l\'identité des bénéficiaires de votre compte KONTROL.\n\nVeuillez vous connecter à votre tableau de bord Stripe pour soumettre les documents requis.\n\nMerci,\nL\'équipe Stripe',
    date: 'Hier',
    isRead: true,
    isStarred: false,
    labels: ['Important']
  },
  {
    id: '3',
    from: 'Jean Dupont (Client)',
    fromEmail: 'j.dupont@gmail.com',
    subject: 'Question sur l\'abonnement Enterprise',
    snippet: 'Bonjour, je souhaiterais avoir plus d\'informations sur les tarifs dégressifs...',
    body: 'Bonjour l\'équipe KONTROL,\n\nJe suis intéressé par votre offre Enterprise pour ma société de 50 employés. Proposez-vous des tarifs dégressifs au-delà de 20 utilisateurs ?\n\nDans l\'attente de votre retour.\n\nCordialement,\nJean Dupont',
    date: '12 Avr',
    isRead: false,
    isStarred: false,
    labels: ['Ventes']
  }
];

interface ControlGmailViewProps {
  tickets?: any[];
}

export function ControlGmailView({ tickets = [] }: ControlGmailViewProps) {
  const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject) return;
    setIsSending(true);
    try {
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsComposing(false);
      setComposeData({ to: '', subject: '', body: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // Map tickets to emails
    const ticketEmails: Email[] = tickets.map(t => ({
      id: `ticket-${t.id}`,
      from: t.userName || t.email?.split('@')[0] || 'Client',
      fromEmail: t.email || 'Innov.korp@gmail.com',
      subject: `[TICKET #${t.id.slice(-4)}] ${t.subject}`,
      snippet: t.message?.slice(0, 100) + '...',
      body: t.message || '',
      date: new Date(t.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      isRead: t.status === 'RESOLVED',
      isStarred: t.priority === 'HIGH',
      labels: ['Support', t.category || 'Général']
    }));

    setEmails([...MOCK_EMAILS, ...ticketEmails]);
  }, [tickets]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const filteredEmails = emails.filter(e => 
    e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.from.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-kontrol-border rounded-[2rem] shadow-sm overflow-hidden flex h-[calc(100vh-250px)]"
    >
      {/* Sidebar */}
      <div className="w-64 border-r border-kontrol-border bg-kontrol-bg/30 flex flex-col">
        <div className="p-6">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full bg-white border border-kontrol-border hover:border-kontrol-blue hover:shadow-lg hover:shadow-kontrol-blue/10 transition-all py-3 px-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-extrabold text-kontrol-dark uppercase tracking-widest"
          >
            <Send size={16} className="text-kontrol-blue" />
            Nouveau Message
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <FolderItem icon={Inbox} label="Boîte de réception" count={2} active={activeFolder === 'inbox'} onClick={() => setActiveFolder('inbox')} />
          <FolderItem icon={Star} label="Messages suivis" active={activeFolder === 'starred'} onClick={() => setActiveFolder('starred')} />
          <FolderItem icon={Clock} label="En attente" active={activeFolder === 'snoozed'} onClick={() => setActiveFolder('snoozed')} />
          <FolderItem icon={Send} label="Envoyés" active={activeFolder === 'sent'} onClick={() => setActiveFolder('sent')} />
          <FolderItem icon={AlertCircle} label="Spam" active={activeFolder === 'spam'} onClick={() => setActiveFolder('spam')} />
          <FolderItem icon={Trash2} label="Corbeille" active={activeFolder === 'trash'} onClick={() => setActiveFolder('trash')} />
        </nav>

        <div className="p-6 border-t border-kontrol-border">
          <div className="flex items-center gap-3 p-3 bg-white border border-kontrol-border rounded-xl">
            <div className="w-8 h-8 rounded-full bg-kontrol-blue flex items-center justify-center text-[10px] font-bold text-white">IK</div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-kontrol-dark truncate">Innov'Korp Support</p>
              <p className="text-[9px] text-kontrol-ink-muted truncate">Innov.korp@gmail.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedEmail ? (
          <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} />
        ) : (
          <>
            {/* Toolbar */}
            <div className="h-16 border-b border-kontrol-border flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={handleRefresh} className={cn("p-2 hover:bg-kontrol-bg rounded-lg transition-all", isRefreshing && "animate-spin")}>
                  <RefreshCw size={18} className="text-kontrol-ink-muted" />
                </button>
                <div className="h-4 w-[1px] bg-kontrol-border mx-2" />
                <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><Archive size={18} className="text-kontrol-ink-muted" /></button>
                <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><AlertCircle size={18} className="text-kontrol-ink-muted" /></button>
                <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><Trash2 size={18} className="text-kontrol-ink-muted" /></button>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  <input 
                    type="text" 
                    placeholder="Rechercher dans les messages..." 
                    className="w-full pl-10 pr-4 py-2 bg-kontrol-bg border border-kontrol-border rounded-xl text-xs outline-none focus:border-kontrol-blue transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><ChevronLeft size={18} className="text-kontrol-ink-muted" /></button>
                  <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><ChevronRight size={18} className="text-kontrol-ink-muted" /></button>
                </div>
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.map((email) => (
                <div 
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={cn(
                    "flex items-center gap-4 px-6 py-3 border-b border-kontrol-border cursor-pointer transition-all group",
                    email.isRead ? "bg-white" : "bg-kontrol-blue/5 font-bold"
                  )}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <button className="text-kontrol-ink-muted hover:text-amber-400 transition-colors">
                      <Star size={18} fill={email.isStarred ? "currentColor" : "none"} className={email.isStarred ? "text-amber-400" : ""} />
                    </button>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase",
                      email.isRead ? "bg-kontrol-bg text-kontrol-ink-muted" : "bg-kontrol-blue text-white"
                    )}>
                      {email.from[0]}
                    </div>
                  </div>
                  <div className="min-w-[150px] w-48 truncate text-[13px] text-kontrol-dark">
                    {email.from}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-kontrol-dark truncate">{email.subject}</span>
                      <span className="text-kontrol-ink-muted font-normal text-[13px]"> - </span>
                      <span className="text-kontrol-ink-muted font-normal text-[13px] truncate">{email.snippet}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {email.labels.map(label => (
                      <span key={label} className="px-2 py-0.5 bg-kontrol-bg border border-kontrol-border rounded text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-widest">
                        {label}
                      </span>
                    ))}
                    <span className="text-[11px] text-kontrol-ink-muted w-12 text-right">{email.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Compose Modal */}
      <AnimatePresence>
        {isComposing && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-lg font-extrabold text-kontrol-dark tracking-tight">Nouveau Message</h3>
                <button onClick={() => setIsComposing(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSendEmail} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Destinataire</label>
                  <input 
                    type="email" 
                    required
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue transition-all"
                    placeholder="email@exemple.com"
                    value={composeData.to}
                    onChange={e => setComposeData({...composeData, to: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Objet</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue transition-all"
                    placeholder="Sujet du message"
                    value={composeData.subject}
                    onChange={e => setComposeData({...composeData, subject: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Message</label>
                  <textarea 
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue transition-all resize-none"
                    placeholder="Écrivez votre message ici..."
                    value={composeData.body}
                    onChange={e => setComposeData({...composeData, body: e.target.value})}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSending}
                  className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20 mt-4"
                >
                  {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Envoyer le message
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FolderItem({ icon: Icon, label, count, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all",
        active ? "bg-kontrol-blue text-white shadow-lg shadow-kontrol-blue/20" : "text-kontrol-ink-muted hover:bg-white hover:text-kontrol-dark"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="text-[13px] font-bold">{label}</span>
      </div>
      {count && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-bold",
          active ? "bg-white text-kontrol-blue" : "bg-kontrol-blue/10 text-kontrol-blue"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmailDetail({ email, onBack }: { email: Email, onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-16 border-b border-kontrol-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-kontrol-bg rounded-lg transition-all">
            <ArrowLeft size={18} className="text-kontrol-ink-muted" />
          </button>
          <div className="h-4 w-[1px] bg-kontrol-border mx-2" />
          <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><Archive size={18} className="text-kontrol-ink-muted" /></button>
          <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><AlertCircle size={18} className="text-kontrol-ink-muted" /></button>
          <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><Trash2 size={18} className="text-kontrol-ink-muted" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><ChevronLeft size={18} className="text-kontrol-ink-muted" /></button>
          <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><ChevronRight size={18} className="text-kontrol-ink-muted" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-extrabold text-kontrol-dark tracking-tight mb-8">{email.subject}</h1>
          
          <div className="flex items-start justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-kontrol-blue flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-kontrol-blue/20">
                {email.from[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-kontrol-dark">{email.from}</span>
                  <span className="text-xs text-kontrol-ink-muted">&lt;{email.fromEmail}&gt;</span>
                </div>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5">À : moi (Innov.korp@gmail.com)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-kontrol-ink-muted font-bold uppercase tracking-widest">{email.date}</span>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><Star size={18} className="text-kontrol-ink-muted" /></button>
                <button className="p-2 hover:bg-kontrol-bg rounded-lg transition-all"><MoreVertical size={18} className="text-kontrol-ink-muted" /></button>
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-kontrol-ink-soft leading-relaxed whitespace-pre-wrap">
            {email.body}
          </div>

          <div className="mt-12 pt-8 border-t border-kontrol-border flex items-center gap-4">
            <button className="px-6 py-3 bg-kontrol-bg hover:bg-kontrol-border rounded-xl text-[12px] font-extrabold text-kontrol-dark transition-all flex items-center gap-2">
              <Send size={16} className="rotate-180" />
              Répondre
            </button>
            <button className="px-6 py-3 bg-kontrol-bg hover:bg-kontrol-border rounded-xl text-[12px] font-extrabold text-kontrol-dark transition-all flex items-center gap-2">
              <ExternalLink size={16} />
              Transférer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
