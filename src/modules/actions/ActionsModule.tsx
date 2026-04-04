import React from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  Shield, 
  Building2, 
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  User as FirebaseUser 
} from '../../firebase';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { CompanySelector } from '../../components/common/CompanySelector';

interface ActionLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: any;
}

interface ActionsModuleProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function ActionsModule({ user, currentUserProfile }: ActionsModuleProps) {
  const isERPAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP';
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(currentUserProfile?.companyId || null);
  
  const companyId = isERPAdmin 
    ? (selectedCompanyId || currentUserProfile?.companyId || user.uid) 
    : (currentUserProfile?.companyId || user.uid);
  const [actions, setActions] = React.useState<ActionLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    if (!currentUserProfile) return;
    
    setLoading(true);
    const constraints: any[] = [orderBy('timestamp', 'desc'), limit(100)];
    
    // If not ERP Admin, or if ERP Admin has selected a company
    if (!(isERPAdmin && !selectedCompanyId)) {
      constraints.unshift(where('companyId', '==', companyId));
    }

    const q = query(collection(db, 'actions'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActionLog[]);
      setLoading(false);
    }, (error) => {
      console.error("Actions fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, currentUserProfile, selectedCompanyId, isERPAdmin]);

  const filteredActions = actions.filter(a => {
    const matchesSearch = 
      a.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.details || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || a.action.includes(filterType);
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);
  const paginatedActions = filteredActions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionIcon = (action: string) => {
    if (action.includes('CONNEXION')) return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (action.includes('DÉCONNEXION')) return <LogOutIcon size={14} className="text-rose-500" />;
    if (action.includes('supprimé')) return <AlertCircle size={14} className="text-rose-500" />;
    if (action.includes('créé')) return <PlusIcon size={14} className="text-emerald-500" />;
    if (action.includes('modifié')) return <EditIcon size={14} className="text-blue-500" />;
    return <Activity size={14} className="text-kontrol-ink-muted" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CONNEXION')) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action.includes('DÉCONNEXION')) return "bg-rose-50 text-rose-700 border-rose-100";
    if (action.includes('supprimé')) return "bg-rose-50 text-rose-700 border-rose-100";
    if (action.includes('créé')) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action.includes('modifié')) return "bg-blue-50 text-blue-700 border-blue-100";
    return "bg-kontrol-bg text-kontrol-ink-soft border-kontrol-border";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-kontrol-dark flex items-center justify-center text-kontrol-blue shadow-lg shadow-kontrol-blue/10">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Journal des Actions</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">Traçabilité complète des opérations système</p>
          </div>
        </div>
        
        {isERPAdmin && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Filtrer par entité :</span>
            <CompanySelector 
              selectedId={selectedCompanyId} 
              onSelect={setSelectedCompanyId} 
            />
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-2xl p-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex-1 min-w-[250px] flex items-center gap-3 bg-kontrol-bg border border-kontrol-border rounded-xl px-4 py-2 focus-within:border-kontrol-blue transition-all">
          <Search size={16} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder="Rechercher un utilisateur, une action ou un détail..."
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-kontrol-ink-muted" />
          <select 
            className="bg-white border border-kontrol-border rounded-xl px-4 py-2 text-[13px] font-bold text-kontrol-ink-soft outline-none focus:border-kontrol-blue transition-colors"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Toutes les actions</option>
            <option value="CONNEXION">Connexions</option>
            <option value="DÉCONNEXION">Déconnexions</option>
            <option value="créé">Créations</option>
            <option value="modifié">Modifications</option>
            <option value="supprimé">Suppressions</option>
            <option value="validée">Validations</option>
          </select>
        </div>
      </div>

      {/* Actions List */}
      <div className="card overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-kontrol-dark text-white/40 border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest">Horodatage</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest">Utilisateur</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest">Détails de l'opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-kontrol-blue" size={32} />
                      <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest animate-pulse">Chargement du journal...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <History size={48} strokeWidth={1} />
                      <p className="text-[13px] font-medium">Aucune action enregistrée pour le moment.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedActions.map((action, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={action.id} 
                    className={cn(
                      "hover:bg-kontrol-bg/50 transition-colors group",
                      idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/20"
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted group-hover:bg-white transition-colors">
                          <Clock size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-kontrol-dark font-bold">
                            {action.timestamp?.toDate ? action.timestamp.toDate().toLocaleDateString() : new Date(action.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-kontrol-ink-muted">
                            {action.timestamp?.toDate ? action.timestamp.toDate().toLocaleTimeString() : new Date(action.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-kontrol-blue/10 flex items-center justify-center text-[10px] font-extrabold text-kontrol-blue">
                          {action.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-kontrol-dark">{action.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border",
                        getActionColor(action.action)
                      )}>
                        {getActionIcon(action.action)}
                        {action.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={12} className="text-kontrol-ink-muted opacity-30" />
                        <span className="text-kontrol-ink-soft font-medium">
                          {action.details || 'Aucun détail supplémentaire'}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">
            <Activity size={12} />
            {filteredActions.length} opérations tracées
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-kontrol-border bg-white text-kontrol-ink-muted hover:text-kontrol-dark disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-[11px] font-extrabold transition-all",
                      currentPage === page
                        ? "bg-kontrol-dark text-white shadow-md"
                        : "bg-white border border-kontrol-border text-kontrol-ink-muted hover:border-kontrol-blue hover:text-kontrol-blue"
                    )}
                  >
                    {page}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-kontrol-border bg-white text-kontrol-ink-muted hover:text-kontrol-dark disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className="text-[10px] text-kontrol-ink-muted">
            Les données sont synchronisées en temps réel avec le serveur
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper icons for the module
const LogOutIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const PlusIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
