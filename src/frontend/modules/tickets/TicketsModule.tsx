import React from 'react';
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
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  where 
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

interface TicketsModuleProps {
  user: any;
  currentUserProfile: UserProfile | null;
}

export function TicketsModule({ user, currentUserProfile }: TicketsModuleProps) {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const handleExportPDF = () => {
    const headers = ['Date', 'Client', 'E-mail', 'Sujet', 'Statut'];
    const data = filteredTickets.map(t => [
      new Date(t.createdAt).toLocaleDateString(),
      t.name,
      t.email,
      t.subject,
      t.status
    ]);
    exportToPDF('Journal des Tickets - KONTROL', headers, data, 'Tickets_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredTickets.map(t => ({
      Date: new Date(t.createdAt).toLocaleDateString(),
      Client: t.name,
      Email: t.email,
      Sujet: t.subject,
      Statut: t.status
    }));
    exportToExcel(data, 'Tickets_KONTROL');
  };

  React.useEffect(() => {
    if (!user?.email) return;

    const isKontrolAdmin = ['ADMINISTRATEUR_ERP', 'GESTIONNAIRE_ERP', 'ADMINISTRATEUR_KONTROL', 'GESTIONNAIRE_KONTROL', 'ADMIN'].includes(currentUserProfile?.role || '');
    
    const q = isKontrolAdmin 
      ? query(collection(db, 'tickets'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'tickets'), where('email', '==', user.email), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tickets', user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentUserProfile]);

  const handleUpdateStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus });
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    try {
      await deleteDoc(doc(db, 'tickets', selectedTicket.id));
      setSelectedTicket(null);
      setIsDeleting(false);
    } catch (error) {
      console.error("Error deleting ticket:", error);
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

  const getStatusLabel = (status: Ticket['status']) => {
    switch (status) {
      case 'NEW': return 'Nouveau';
      case 'OPEN': return 'En cours';
      case 'CLOSED': return 'Fermé';
      default: return status;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Support & Tickets</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Gérez les demandes d'assistance reçues via le site web</p>
        </div>
        <div className="flex gap-2">
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
              <p className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Nouveaux</p>
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
              <p className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">En cours</p>
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
              <p className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Résolus</p>
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
            placeholder="Rechercher un ticket..."
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
              {status === 'ALL' ? 'Tous' : getStatusLabel(status as Ticket['status'])}
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
                <p className="text-[13px] text-kontrol-ink-muted font-medium">Aucun ticket trouvé</p>
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
                Page {currentPage} / {totalPages}
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
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Client</p>
                        <p className="text-[14px] font-bold text-kontrol-dark">{selectedTicket.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-kontrol-border flex items-center justify-center text-kontrol-blue shadow-sm">
                        <Mail size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">E-mail</p>
                        <p className="text-[14px] font-bold text-kontrol-dark">{selectedTicket.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-kontrol-border flex items-center justify-center text-kontrol-blue shadow-sm">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Date</p>
                        <p className="text-[14px] font-bold text-kontrol-dark">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="mb-8">
                    <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-4">Message</h4>
                    <div className="bg-kontrol-bg/50 p-6 rounded-3xl border border-kontrol-border">
                      <p className="text-[15px] text-kontrol-dark leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-8 border-t border-kontrol-border">
                    <div className="flex-1 min-w-[200px]">
                      <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-3">Actions rapides</h4>
                      <div className="flex gap-3">
                        {selectedTicket.status !== 'OPEN' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'OPEN')}
                            className="px-6 py-3 bg-amber-50 text-amber-600 text-[13px] font-extrabold rounded-2xl hover:bg-amber-100 transition-all flex items-center gap-2"
                          >
                            <Clock size={16} /> Marquer en cours
                          </button>
                        )}
                        {selectedTicket.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'CLOSED')}
                            className="px-6 py-3 bg-emerald-50 text-emerald-600 text-[13px] font-extrabold rounded-2xl hover:bg-emerald-100 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 size={16} /> Fermer le ticket
                          </button>
                        )}
                        {selectedTicket.status === 'CLOSED' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'NEW')}
                            className="px-6 py-3 bg-blue-50 text-blue-600 text-[13px] font-extrabold rounded-2xl hover:bg-blue-100 transition-all flex items-center gap-2"
                          >
                            <AlertCircle size={16} /> Réouvrir
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <a
                        href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.subject}`}
                        className="btn-primary px-8 py-3 flex items-center gap-2 shadow-lg shadow-kontrol-blue/20"
                      >
                        <Mail size={18} /> Répondre par email
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white h-[600px] rounded-3xl border border-dashed border-kontrol-border flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 rounded-full bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted mb-6">
                  <MessageSquare size={40} />
                </div>
                <h3 className="text-xl font-extrabold text-kontrol-dark mb-2">Sélectionnez un ticket</h3>
                <p className="text-[14px] text-kontrol-ink-muted max-w-xs mx-auto">
                  Choisissez une demande dans la liste pour consulter les détails et y répondre.
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
        title="Supprimer le ticket"
        message="Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}
