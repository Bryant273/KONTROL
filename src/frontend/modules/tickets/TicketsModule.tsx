import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Mail,
  User,
  Calendar,
  Trash2,
  ExternalLink,
  FileText,
  Table,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Sparkles,
  Brain,
  Loader2,
  Wrench,
  Construction
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  where,
  addDoc 
} from 'firebase/firestore';
import { 
  db,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { Ticket, UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { sendNotification } from '../../../api/services/notificationService';
import { blueAIService } from '../../../api/services/blueAIService';

interface TicketsModuleProps {
  user: any;
  currentUserProfile: UserProfile | null;
}

export function TicketsModule({ user, currentUserProfile }: TicketsModuleProps) {
  const { t } = useTranslation();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [newTicket, setNewTicket] = React.useState({ subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const itemsPerPage = 10;

  const [replyText, setReplyText] = React.useState('');
  const [isAiDrafting, setIsAiDrafting] = React.useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const performCognitiveAnalysis = async (ticket: Ticket) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const prompt = `[ANALYSE_COGNITIVE_TICKET] Analyse le sentiment, l'urgence et suggère la meilleure action pour ce ticket de support juridique ou d'exploitation. 
Sujet: "${ticket.subject}"
Message original de l'expéditeur: "${ticket.message}"

Réponds uniquement sous forme d'un objet JSON brut conforme à ce schéma exact :
{
  "sentiment": "Frustré" | "Neutre" | "Satisfait" | "Incertain",
  "score": 0.1,
  "gravite": "Faible" | "Moyenne" | "Critique",
  "resume": "Bref résumé du problème en 1 phrase",
  "recommandation": "Directives de résolution professionnelle"
}
Ne retourne aucune autre phrase, ni balises markdown \`\`\`json \`\`\``;

      const res = await fetch('/api/ai/blue-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          user_id: user.uid,
          companyId: currentUserProfile?.companyId || 'public'
        })
      });
      const data = await res.json();
      if (data && data.response) {
        const cleanJson = data.response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        setAiAnalysis(parsed);
      }
    } catch (error) {
      console.error("Failed to perform cognitive analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAiDraft = async () => {
    if (!selectedTicket) return;
    setIsAiDrafting(true);
    try {
      const prompt = `[PROPOSITION_REPONSE_EXPERT_SUPPORT] En tant que conseiller fiducière de l'écosystème KONTROL, formule une proposition de réponse de support client complète, polie, professionnelle et extrêmement utile pour ce ticket :
      Expéditeur: ${selectedTicket.name} (${selectedTicket.email})
      Sujet du ticket: "${selectedTicket.subject}"
      Message de départ: "${selectedTicket.message}"
      
      Analyse cognitive préliminaire: ${aiAnalysis ? JSON.stringify(aiAnalysis) : 'N/A'}
      
      Formule une réponse rédigée en français directement utilisable. Écris-la directement, sans fioritures d'introduction ("Voici votre brouillon..."). Structure le message proprement avec formules de politesse cordiales.`;

      const res = await fetch('/api/ai/blue-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          user_id: user.uid,
          companyId: currentUserProfile?.companyId || 'public'
        })
      });
      const data = await res.json();
      if (data && data.response) {
        setReplyText(data.response);
      }
    } catch (err) {
      console.error("Failed to draft response with AI:", err);
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const currentReplies = selectedTicket.replies || [];
      const newReply = {
        id: Date.now().toString(),
        senderName: currentUserProfile?.displayName || user.displayName || t('common.roles.user'),
        senderId: user.uid,
        email: user.email,
        message: replyText.trim(),
        createdAt: new Date().toISOString(),
        role: currentUserProfile?.role || 'UTILISATEUR',
        isAiGenerated: false
      };
      const updatedReplies = [...currentReplies, newReply];

      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        replies: updatedReplies,
        status: 'PENDING',
        updatedAt: new Date().toISOString()
      });

      setSelectedTicket(prev => {
        if (!prev) return null;
        return {
          ...prev,
          replies: updatedReplies,
          status: 'PENDING'
        };
      });

      await sendNotification({
        companyId: 'SYSTEM',
        title: "Nouveau commentaire client",
        message: `${currentUserProfile?.displayName || user.email} a répondu au ticket: "${selectedTicket.subject}"`,
        type: 'info',
        link: '/tickets'
      });

      setReplyText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tickets/${selectedTicket.id}/replies`, user, false);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  React.useEffect(() => {
    if (selectedTicket) {
      performCognitiveAnalysis(selectedTicket);
    } else {
      setAiAnalysis(null);
    }
  }, [selectedTicket?.id]);

  React.useEffect(() => {
    if (selectedTicket) {
      const latest = tickets.find(t => t.id === selectedTicket.id);
      if (latest) {
        setSelectedTicket(latest);
      }
    }
  }, [tickets]);

  const getStatusLabel = (status: Ticket['status']) => {
    switch (status) {
      case 'NEW': return t('tickets.stats.new');
      case 'OPEN': return t('tickets.stats.open');
      case 'CLOSED': return t('tickets.stats.closed');
      default: return status;
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) return;

    setIsSubmitting(true);
    try {
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        name: currentUserProfile?.displayName || user.displayName || t('common.roles.user'),
        email: user.email,
        subject: newTicket.subject,
        message: newTicket.message,
        status: 'NEW',
        createdAt: new Date().toISOString(),
        userId: user.uid,
        companyId: currentUserProfile?.companyId || user.uid
      });

      // Notification User
      await sendNotification({
        companyId: currentUserProfile?.companyId || user.uid,
        userId: user.uid,
        title: t('tickets.notif.created_title'),
        message: t('tickets.notif.created_msg', { name: currentUserProfile?.displayName || t('common.roles.user'), subject: newTicket.subject }),
        type: 'info'
      });

      // Notification Admin
      await sendNotification({
        companyId: 'SYSTEM',
        title: t('tickets.notif.admin_new_title'),
        message: t('tickets.notif.admin_new_msg', { name: currentUserProfile?.displayName || user.email, subject: newTicket.subject }),
        type: 'info',
        link: '/admin?tab=tickets'
      });

      setNewTicket({ subject: '', message: '' });
      setIsCreating(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tickets', user, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    const headers = [t('tickets.labels.date'), t('produits.form.designation') || 'Sujet', t('tickets.labels.message') || 'Message', 'Réponses', t('common.status.active')];

    const data = filteredTickets.map(t => [
      new Date(t.createdAt).toLocaleDateString(),
      t.subject,
      t.message,
      t.replies ? t.replies.length.toString() : '0',
      getStatusLabel(t.status)
    ]);

    exportToPDF(t('tickets.export.title'), headers, data, t('tickets.export.filename'), currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredTickets.map(t => ({
      Date: new Date(t.createdAt).toLocaleDateString(),
      Sujet: t.subject,
      Message: t.message,
      ['Réponses']: t.replies ? t.replies.length : 0,
      Statut: getStatusLabel(t.status)
    }));
    exportToExcel(data, 'Tickets_KONTROL');
  };

  React.useEffect(() => {
    if (!user?.email) return;

    const q = query(collection(db, 'tickets'), where('email', '==', user.email), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tickets', user, false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentUserProfile]);

  React.useEffect(() => {
    const checkTargetId = () => {
      const tid = localStorage.getItem('selected_target_id_tickets');
      if (tid && tickets.length > 0) {
        const match = tickets.find(t => t.id === tid);
        if (match) {
          setSelectedTicket(match);
          localStorage.removeItem('selected_target_id_tickets');
        }
      }
    };
    
    checkTargetId();
    
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id && tickets.length > 0) {
        const match = tickets.find(t => t.id === detail.id);
        if (match) {
          setSelectedTicket(match);
          localStorage.removeItem('selected_target_id_tickets');
        }
      }
    };
    
    window.addEventListener('select-entity-tickets', listener);
    return () => window.removeEventListener('select-entity-tickets', listener);
  }, [tickets]);

  const handleUpdateStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      const ticketObj = tickets.find(t => t.id === ticketId);
      if (ticketObj?.userId) {
        await sendNotification({
          companyId: ticketObj.companyId || '',
          userId: ticketObj.userId,
          title: t('tickets.notif.update_title'),
          message: t('tickets.notif.update_msg', { subject: ticketObj.subject, status: getStatusLabel(newStatus) }),
          type: newStatus === 'CLOSED' ? 'success' : 'info'
        });
      }

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tickets/${ticketId}`, user, false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    try {
      await deleteDoc(doc(db, 'tickets', selectedTicket.id));
      setSelectedTicket(null);
      setIsDeleting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tickets/${selectedTicket.id}`, user, false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'NEW': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'OPEN': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'CLOSED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kontrol-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page En Construction Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-2 border-dashed border-amber-500/40 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Construction size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                En Construction
              </span>
              <h3 className="text-sm font-extrabold text-amber-900">Support Technique KONTROL</h3>
            </div>
            <p className="text-xs text-amber-800/80 mt-0.5 font-medium">
              Ce module de support et d'assistance est actuellement en cours d'optimisation par l'équipe technique INNOV'KORP. Vous pouvez néanmoins soumettre vos tickets ci-dessous.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">{t('tickets.title')}</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('tickets.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCreating(true)}
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2 shadow-lg shadow-kontrol-blue/20"
          >
            <Plus size={14} /> {t('tickets.new_ticket')}
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <FileText size={14} /> PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <Table size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-kontrol-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">{t('tickets.stats.new')}</p>
              <p className="text-2xl font-extrabold text-kontrol-dark">{tickets.filter(t => t.status === 'NEW').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-kontrol-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">{t('tickets.stats.open')}</p>
              <p className="text-2xl font-extrabold text-kontrol-dark">{tickets.filter(t => t.status === 'OPEN').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-kontrol-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">{t('tickets.stats.closed')}</p>
              <p className="text-2xl font-extrabold text-kontrol-dark">{tickets.filter(t => t.status === 'CLOSED').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-kontrol-border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={18} />
          <input
            type="text"
            placeholder={t('tickets.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-kontrol-bg border-none rounded-2xl text-[13px] focus:ring-2 focus:ring-kontrol-blue/20 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['ALL', 'NEW', 'OPEN', 'CLOSED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-[12px] font-extrabold transition-all whitespace-nowrap",
                statusFilter === status
                  ? "bg-kontrol-dark text-white shadow-lg shadow-kontrol-dark/20"
                  : "bg-kontrol-bg text-kontrol-ink-muted hover:bg-kontrol-border"
              )}
            >
              {status === 'ALL' ? t('finance.filter_all') : getStatusLabel(status as Ticket['status'])}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {paginatedTickets.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-kontrol-border text-center">
                <MessageSquare className="mx-auto text-kontrol-ink-muted mb-3" size={32} />
                <p className="text-[13px] text-kontrol-ink-muted font-medium">{t('tickets.no_tickets')}</p>
              </div>
            ) : (
              paginatedTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={cn(
                    "w-full text-left p-5 rounded-3xl border transition-all group relative overflow-hidden",
                    selectedTicket?.id === ticket.id
                      ? "bg-white border-kontrol-blue shadow-xl shadow-kontrol-blue/10 ring-1 ring-kontrol-blue"
                      : "bg-white border-kontrol-border hover:border-kontrol-blue/50 shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                      getStatusColor(ticket.status)
                    )}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className="text-[10px] text-kontrol-ink-muted font-medium">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-extrabold text-kontrol-dark line-clamp-1 mb-1">{ticket.subject}</h3>
                  <p className="text-[12px] text-kontrol-ink-muted line-clamp-2 mb-3">{ticket.message}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-kontrol-bg flex items-center justify-center text-[10px] font-bold text-kontrol-blue">
                      {ticket.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-kontrol-dark">{ticket.name}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-kontrol-border bg-white text-kontrol-ink-muted hover:text-kontrol-dark disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">
                {t('common.pagination', { current: currentPage, total: totalPages })}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-kontrol-border bg-white text-kontrol-ink-muted hover:text-kontrol-dark disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div
                key={selectedTicket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl border border-kontrol-border shadow-sm overflow-hidden sticky top-6"
              >
                <div className="p-8 border-b border-kontrol-border bg-kontrol-bg/30">
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                          getStatusColor(selectedTicket.status)
                        )}>
                          {getStatusLabel(selectedTicket.status)}
                        </span>
                        <span className="text-[12px] text-kontrol-ink-muted font-medium">
                          Ticket #{selectedTicket.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">{selectedTicket.subject}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsDeleting(true)}
                        className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-kontrol-border flex items-center justify-center text-kontrol-blue shadow-sm">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">{t('tickets.labels.client')}</p>
                        <p className="text-[14px] font-bold text-kontrol-dark">{selectedTicket.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-kontrol-border flex items-center justify-center text-kontrol-blue shadow-sm">
                        <Mail size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">{t('tickets.labels.email')}</p>
                        <p className="text-[14px] font-bold text-kontrol-dark">{selectedTicket.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-kontrol-border flex items-center justify-center text-kontrol-blue shadow-sm">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">{t('tickets.labels.date')}</p>
                        <p className="text-[14px] font-bold text-kontrol-dark">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="mb-8">
                    <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-4">{t('tickets.labels.message')}</h4>
                    <div className="bg-kontrol-bg/50 p-6 rounded-3xl border border-kontrol-border">
                      <p className="text-[15px] text-kontrol-dark leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.message}
                      </p>
                    </div>
                  </div>

                  {/* Real-time Cognitive Sentiment Analyzer Section */}
                  {isAnalyzing ? (
                    <div className="mb-8 p-5 bg-blue-50/30 rounded-3xl border border-blue-100 flex items-center gap-3 animate-pulse">
                      <Loader2 size={18} className="animate-spin text-kontrol-blue" />
                      <span className="text-[12px] font-extrabold text-kontrol-blue uppercase tracking-widest font-mono">
                        BLUE AI — Analyse du ton cérébral en cours...
                      </span>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="mb-8 p-6 bg-gradient-to-br from-[#0e1f32]/5 to-[#1a2535]/10 rounded-3xl border border-[#1d3a5a]/20">
                      <div className="flex items-center gap-2.5 mb-3">
                        <Brain size={18} className="text-kontrol-blue animate-pulse" />
                        <h4 className="text-[11px] font-extrabold text-[#185FA5] uppercase tracking-widest font-mono">
                          BLUE AI — Analyse cognitive du ticket
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-white/60 rounded-2xl border border-kontrol-border/50">
                          <p className="text-[9px] text-kontrol-ink-muted uppercase font-bold tracking-wider">Humeur Client</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-base">
                              {aiAnalysis.sentiment === 'Frustré' ? '😠' : aiAnalysis.sentiment === 'Satisfait' ? '😊' : aiAnalysis.sentiment === 'Neutre' ? '😐' : '🤔'}
                            </span>
                            <p className="text-[13px] font-extrabold text-kontrol-dark">{aiAnalysis.sentiment || 'Détecté'} <span className="text-[10px] text-kontrol-ink-muted">({Math.round((aiAnalysis.score || 0.9) * 100)}%)</span></p>
                          </div>
                        </div>
                        <div className="p-3 bg-white/60 rounded-2xl border border-kontrol-border/50">
                          <p className="text-[9px] text-kontrol-ink-muted uppercase font-bold tracking-wider">Niveau de Gravité</p>
                          <span className={cn(
                            "inline-block px-2 mt-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest",
                            aiAnalysis.gravite === 'Critique' ? 'bg-red-50 text-red-600 border border-red-100' :
                            aiAnalysis.gravite === 'Moyenne' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          )}>
                            {aiAnalysis.gravite || 'Moyenne'}
                          </span>
                        </div>
                        <div className="p-3 bg-white/60 rounded-2xl border border-kontrol-border/50">
                          <p className="text-[9px] text-kontrol-ink-muted uppercase font-bold tracking-wider">Diagnostic court</p>
                          <p className="text-[11px] font-bold text-kontrol-dark mt-1 truncate">{aiAnalysis.resume || 'En attente...'}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-[#185FA5]/5 rounded-2xl border border-[#185FA5]/10">
                        <p className="text-[10px] text-[#185FA5] font-extrabold uppercase tracking-widest mb-1.5">Recommandation Expert</p>
                        <p className="text-[12px] text-kontrol-dark leading-relaxed font-medium">
                          {aiAnalysis.recommandation || 'S/O'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Timeline section: Existing comments & Discussion thread */}
                  <div className="mb-8 pt-6 border-t border-kontrol-border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">
                        Fil de Discussion ({selectedTicket.replies?.length || 0} commentaires)
                      </h4>
                    </div>

                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                        <p className="text-[12px] text-kontrol-ink-muted italic py-2">
                          Aucun commentaire publié pour le moment. Rédigez le premier commentaire ou générez une réponse intelligente ci-dessous.
                        </p>
                      ) : (
                        selectedTicket.replies.map((rep: any) => {
                          const isRepAdmin = rep.role === 'ADMINISTRATEUR_ENTREPRISE' || rep.role === 'GESTIONNAIRE_ENTREPRISE';
                          return (
                            <div 
                              key={rep.id} 
                              className={cn(
                                "p-4 rounded-2xl border text-[13px] relative shadow-sm max-w-[85%] transition-all",
                                isRepAdmin 
                                  ? "bg-[#0e1f32]/5 border-[#1d3a5a]/10 ml-auto rounded-tr-none" 
                                  : "bg-white border-kontrol-border rounded-tl-none"
                              )}
                            >
                              <div className="flex items-center justify-between gap-4 mb-2">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className={cn(
                                    "text-[11px]",
                                    isRepAdmin ? "text-kontrol-blue" : "text-kontrol-dark"
                                  )}>
                                    {rep.senderName}
                                  </span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest font-extrabold border",
                                    isRepAdmin 
                                      ? "bg-[#0e1f32] text-white border-[#1d3a5a]" 
                                      : "bg-kontrol-bg text-kontrol-ink-muted border-kontrol-border"
                                  )}>
                                    {isRepAdmin ? 'SUPPORT' : 'CLIENT'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-kontrol-ink-muted">
                                  {new Date(rep.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[13px] text-kontrol-dark leading-relaxed whitespace-pre-wrap">
                                {rep.message}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Smart Reply Text Editor Block */}
                  <form onSubmit={handlePostReply} className="pt-6 border-t border-kontrol-border space-y-4 font-sans">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">
                        Rédiger une réponse fiducière
                      </h4>
                      
                      <button
                        type="button"
                        disabled={isAiDrafting}
                        onClick={generateAiDraft}
                        className="py-1.5 px-4 bg-[#0e1f32] border border-[#1d3a5a] text-xs font-extrabold text-[#7eadda] rounded-xl hover:bg-[#1a2535] transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                      >
                        {isAiDrafting ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-[#7eadda]" />
                            Rédaction BLUE active...
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} className="text-[#378ADD]" />
                            Brouillon intelligent BLUE AI💡
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={4}
                        required
                        placeholder="Rédigez votre réponse ici ou cliquez sur BROUILLON INTELLIGENT pour formuler instantanément une réponse cognitive..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-4 bg-kontrol-bg rounded-2xl text-[13.5px] border-none focus:ring-2 focus:ring-kontrol-blue/20 outline-none transition-all resize-none font-medium text-kontrol-dark"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 justify-between items-center">
                      <div className="flex gap-2">
                        {selectedTicket.status !== 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'OPEN')}
                            className="px-4 py-2.5 bg-amber-50 text-amber-600 text-[11px] font-extrabold rounded-xl hover:bg-amber-100 transition-all flex items-center gap-1.5"
                          >
                            <Clock size={14} /> Marquer ouvert
                          </button>
                        )}
                        {selectedTicket.status !== 'CLOSED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'CLOSED')}
                            className="px-4 py-2.5 bg-emerald-50 text-emerald-600 text-[11px] font-extrabold rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14} /> Clôturer
                          </button>
                        )}
                        {selectedTicket.status === 'CLOSED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'NEW')}
                            className="px-4 py-2.5 bg-blue-50 text-blue-600 text-[11px] font-extrabold rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5"
                          >
                            <AlertCircle size={14} /> Réouvrir
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.subject}`}
                          className="px-4 py-2.5 border border-kontrol-border text-kontrol-ink-muted text-[11px] font-extrabold rounded-xl hover:bg-kontrol-bg transition-all flex items-center gap-1.5"
                        >
                          <Mail size={14} /> Répondre par Email externe
                        </a>
                        
                        <button
                          type="submit"
                          disabled={isSubmittingReply || !replyText.trim()}
                          className="btn-primary px-6 py-2.5 flex items-center gap-2 text-[12px] shadow-lg shadow-kontrol-blue/20"
                        >
                          {isSubmittingReply ? (
                            <Loader2 size={14} className="animate-spin text-white" />
                          ) : (
                            <>
                              Publier <Send size={12} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white h-[600px] rounded-3xl border border-dashed border-kontrol-border flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 rounded-full bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted mb-6">
                  <MessageSquare size={40} />
                </div>
                <h3 className="text-xl font-extrabold text-kontrol-dark mb-2">{t('tickets.select_prompt')}</h3>
                <p className="text-[14px] text-kontrol-ink-muted max-w-xs mx-auto">
                  {t('tickets.select_desc')}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteTicket}
        title={t('tickets.delete_title')}
        message={t('tickets.delete_confirm')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-kontrol-dark/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-kontrol-border bg-kontrol-bg/30">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('tickets.new_ticket_title')}</h3>
                    <p className="text-[13px] text-kontrol-ink-muted">{t('tickets.new_ticket_desc')}</p>
                  </div>
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="p-2 hover:bg-white rounded-xl text-kontrol-ink-muted transition-all"
                  >
                    <Trash2 size={20} className="rotate-45" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest pl-1">{t('tickets.placeholder_subject')}</label>
                  <input 
                    type="text" 
                    required
                    placeholder={t('tickets.placeholder_subject')}
                    className="w-full p-4 bg-kontrol-bg border-none rounded-2xl text-[14px] focus:ring-2 focus:ring-kontrol-blue/20 outline-none transition-all"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest pl-1">{t('tickets.labels.message')}</label>
                  <textarea 
                    required
                    rows={5}
                    placeholder={t('tickets.placeholder_message')}
                    className="w-full p-4 bg-kontrol-bg border-none rounded-2xl text-[14px] focus:ring-2 focus:ring-kontrol-blue/20 outline-none transition-all resize-none"
                    value={newTicket.message}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-6 py-4 border border-kontrol-border rounded-2xl text-[13px] font-extrabold text-kontrol-ink-muted hover:bg-kontrol-bg transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-4 bg-kontrol-blue text-white rounded-2xl text-[13px] font-extrabold hover:bg-blue-600 shadow-xl shadow-kontrol-blue/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>{t('tickets.send')}</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

