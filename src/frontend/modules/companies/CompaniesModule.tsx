import React from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  Shield, 
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Mail,
  Phone,
  Globe
} from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType, 
  auth,
  where,
  getDocs,
  updateDoc,
  doc,
  logAction,
  deleteDoc
} from '../../../api/firebase';
import { deleteCompanyAccount } from '../../../api/services/dataResetService';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { Trash2, AlertTriangle } from 'lucide-react';

export function CompaniesModule() {
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const handleDeleteCompany = async (companyId: string) => {
    try {
      setLoading(true);
      await deleteCompanyAccount(companyId);
      setConfirmDelete(null);
      // The onSnapshot will update the list automatically
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users', auth.currentUser);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // In this multi-tenant setup, companies are derived from users who are managers
    // or we can just list all unique companyIds from the users collection
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      
      // Group by companyId
      const companyMap = new Map();
      users.forEach(user => {
        if (!user.companyId) return;
        
        if (!companyMap.has(user.companyId)) {
          companyMap.set(user.companyId, {
            id: user.companyId,
            name: user.companyName || 'Inconnu',
            logo: user.companyLogo,
            manager: user.displayName,
            email: user.email,
            role: user.role,
            status: user.subscriptionStatus || 'INACTIVE',
            expiry: user.subscriptionEndDate,
            userCount: 0,
            createdAt: user.createdAt
          });
        }
        
        const company = companyMap.get(user.companyId);
        company.userCount += 1;
        
        // If this user is a manager, update company info
        if (user.role === 'GESTIONNAIRE_ENTREPRISE') {
          company.manager = user.displayName;
          company.email = user.email;
        }
      });
      
      setCompanies(Array.from(companyMap.values()));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users', auth.currentUser, false));

    return () => unsubscribe();
  }, []);

  const toggleCompanyStatus = async (companyId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const q = query(collection(db, 'users'), where('companyId', '==', companyId), where('role', '==', 'GESTIONNAIRE_ENTREPRISE'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        await updateDoc(doc(db, 'users', userDoc.id), {
          subscriptionStatus: newStatus
        });

        await logAction(
          'SYSTEM',
          auth.currentUser?.uid || 'SYSTEM',
          auth.currentUser?.displayName || 'Administrateur KONTROL',
          'Statut entreprise modifié',
          `L'entreprise ${userData.companyName} est désormais ${newStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth.currentUser);
    }
  };

  const extendSubscription = async (companyId: string) => {
    try {
      const q = query(collection(db, 'users'), where('companyId', '==', companyId), where('role', '==', 'GESTIONNAIRE_ENTREPRISE'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const currentData = userDoc.data();
        const currentEnd = currentData.subscriptionEndDate || Date.now();
        const newEnd = currentEnd + (30 * 24 * 60 * 60 * 1000); // Add 30 days
        
        await updateDoc(doc(db, 'users', userDoc.id), {
          subscriptionEndDate: newEnd,
          subscriptionStatus: 'ACTIVE'
        });

        await logAction(
          'SYSTEM',
          auth.currentUser?.uid || 'SYSTEM',
          auth.currentUser?.displayName || 'Administrateur KONTROL',
          'Abonnement prolongé',
          `Abonnement de ${currentData.companyName} prolongé jusqu'au ${new Date(newEnd).toLocaleDateString()}`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth.currentUser);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-4 border-kontrol-blue/20 border-t-kontrol-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Gestion des Entreprises</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Supervision de toutes les instances KONTROL</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
            <input 
              type="text"
              placeholder="Rechercher une entreprise..."
              className="pl-10 pr-4 py-2 bg-white border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue w-64 transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button className="p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-ink-muted hover:text-kontrol-blue transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 bg-kontrol-blue/5 border-kontrol-blue/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-kontrol-blue text-white flex items-center justify-center shadow-lg shadow-kontrol-blue/20">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Total Entreprises</p>
              <h3 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">{companies.length}</h3>
            </div>
          </div>
        </div>
        <div className="card p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Abonnements Actifs</p>
              <h3 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">
                {companies.filter(c => c.status === 'ACTIVE').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="card p-6 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">En attente / Expirés</p>
              <h3 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">
                {companies.filter(c => c.status !== 'ACTIVE').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-none shadow-xl shadow-kontrol-dark/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Entreprise</th>
                <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Gestionnaire</th>
                <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Utilisateurs</th>
                <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Statut</th>
                <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Échéance</th>
                <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {paginatedCompanies.map((company, idx) => (
                <tr key={company.id} className={cn("hover:bg-kontrol-bg/30 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-kontrol-border p-1 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                        {company.logo ? (
                          <img src={company.logo} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 size={20} className="text-kontrol-ink-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-kontrol-dark">{company.name}</p>
                        <p className="text-[11px] text-kontrol-ink-muted">ID: {company.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-medium text-kontrol-dark">{company.manager}</p>
                      <p className="text-[11px] text-kontrol-ink-muted flex items-center gap-1">
                        <Mail size={10} /> {company.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-kontrol-ink-muted" />
                      <span className="text-[13px] font-bold text-kontrol-dark">{company.userCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border",
                      company.status === 'ACTIVE' 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", company.status === 'ACTIVE' ? "bg-emerald-500" : "bg-amber-500")} />
                      {company.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[12px] text-kontrol-ink-soft">
                      <Calendar size={14} className="text-kontrol-ink-muted" />
                      {company.expiry ? new Date(company.expiry).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => extendSubscription(company.id)}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-kontrol-ink-muted hover:text-emerald-600 transition-all"
                        title="Prolonger l'abonnement (+30j)"
                      >
                        <Clock size={18} />
                      </button>
                      <button 
                        onClick={() => toggleCompanyStatus(company.id, company.status)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          company.status === 'ACTIVE' 
                            ? "hover:bg-rose-50 text-kontrol-ink-muted hover:text-rose-600" 
                            : "hover:bg-emerald-50 text-kontrol-ink-muted hover:text-emerald-600"
                        )}
                        title={company.status === 'ACTIVE' ? "Désactiver" : "Activer"}
                      >
                        {company.status === 'ACTIVE' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                      </button>
                      <button 
                        onClick={() => setConfirmDelete(company.id)}
                        className="p-2 hover:bg-rose-50 rounded-lg text-kontrol-ink-muted hover:text-rose-600 transition-all"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg text-kontrol-ink-muted hover:text-kontrol-blue transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {filteredCompanies.length} entreprises au total
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
              >
                <ArrowDownLeft size={16} className="rotate-45" />
              </button>
              <span className="text-[11.5px] font-bold text-kontrol-dark">
                Page {currentPage} sur {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
              >
                <ArrowUpRight size={16} className="rotate-45" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-extrabold text-kontrol-dark tracking-tight text-center mb-2">Suppression Définitive</h3>
            <p className="text-kontrol-ink-soft text-center mb-8 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action va désactiver tous les comptes et supprimer toutes les données associées (transactions, produits, clients...). 
              <br /><br />
              <span className="font-bold text-rose-600 uppercase tracking-widest text-[10px]">Action irréversible</span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 bg-kontrol-bg text-kontrol-ink-muted font-bold rounded-2xl hover:bg-kontrol-border transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleDeleteCompany(confirmDelete)}
                className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
