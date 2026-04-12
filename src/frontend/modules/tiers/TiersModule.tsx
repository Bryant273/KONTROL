import React from 'react';
import { Plus, Search, MoreVertical, Mail, Phone, MapPin, Loader2, X, UserCircle, History, Trash2, Edit2, FileText, Table, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import { Tiers, TiersType, UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  User,
  doc,
  updateDoc,
  deleteDoc,
  logAction,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CompanySelector } from '../../components/common/CompanySelector';

interface TiersModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function TiersModule({ user, currentUserProfile }: TiersModuleProps) {
  const isERPAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP';
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(currentUserProfile?.companyId || null);
  
  const companyId = isERPAdmin 
    ? (selectedCompanyId || currentUserProfile?.companyId || user.uid) 
    : (currentUserProfile?.companyId || user.uid);
  const [tiers, setTiers] = React.useState<Tiers[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<TiersType | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [currentTiers, setCurrentTiers] = React.useState({
    nom: '',
    email: '',
    telephone: '',
    type: 'CLIENT' as TiersType,
    adresse: '',
    statut: 'ACTIF' as 'ACTIF' | 'INACTIF'
  });

  const handleAddTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const path = 'tiers';
      await addDoc(collection(db, path), {
        ...currentTiers,
        ownerId: companyId,
        createdAt: Date.now()
      });

      if (currentUserProfile) {
        await logAction(
          companyId!,
          user.uid,
          currentUserProfile.displayName,
          "Tiers créé",
          `${currentTiers.nom} (${currentTiers.type})`
        );
      }

      setIsAdding(false);
      setCurrentTiers({ nom: '', email: '', telephone: '', type: 'CLIENT', adresse: '', statut: 'ACTIF' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tiers', user);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    try {
      const path = 'tiers';
      const docRef = doc(db, path, selectedId);
      await updateDoc(docRef, {
        ...currentTiers,
        updatedAt: Date.now()
      });

      if (currentUserProfile) {
        await logAction(
          companyId!,
          user.uid,
          currentUserProfile.displayName,
          "Tiers modifié",
          `${currentTiers.nom} (${currentTiers.type})`
        );
      }

      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tiers', user);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTiers = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const path = 'tiers';
      const docRef = doc(db, path, selectedId);
      const tiersToDelete = tiers.find(t => t.id === selectedId);
      await deleteDoc(docRef);

      if (currentUserProfile && tiersToDelete) {
        await logAction(
          companyId!,
          user.uid,
          currentUserProfile.displayName,
          "Tiers supprimé",
          `${tiersToDelete.nom}`
        );
      }

      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tiers', user);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (tiers: Tiers) => {
    setCurrentTiers({
      nom: tiers.nom,
      email: tiers.email || '',
      telephone: tiers.telephone || '',
      type: tiers.type,
      adresse: tiers.adresse || '',
      statut: tiers.statut
    });
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (!currentUserProfile) return;
    const path = 'tiers';
    
    let q;
    if (isERPAdmin && !selectedCompanyId) {
      q = query(
        collection(db, path),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, path),
        where('ownerId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tiersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tiers[];
      setTiers(tiersData);
      setLoading(false);
    }, (error) => {
      console.error("Tiers list error:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, path, user);
      } catch (e) {}
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, companyId, currentUserProfile]);

  const selectedTiers = tiers.find(t => t.id === selectedId);

  const filteredTiers = tiers.filter(t => {
    const matchesSearch = t.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (t.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredTiers.length / itemsPerPage);
  const paginatedTiers = filteredTiers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = ['Nom', 'Type', 'Email', 'Téléphone', 'Statut'];
    const data = filteredTiers.map(t => [
      t.nom,
      t.type,
      t.email || '',
      t.telephone || '',
      t.statut
    ]);
    exportToPDF('Annuaire des Tiers - KONTROL', headers, data, 'Tiers_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredTiers.map(t => ({
      Nom: t.nom,
      Type: t.type,
      Email: t.email || '',
      Téléphone: t.telephone || '',
      Statut: t.statut
    }));
    exportToExcel(data, 'Tiers_KONTROL');
  };

  return (
    <div className="space-y-4">
      <ConfirmModal 
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteTiers}
        loading={loading}
        title="Supprimer le tiers"
        message={`Êtes-vous sûr de vouloir supprimer "${selectedTiers?.nom}" ? Cette action est irréversible.`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Tiers</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">Clients et fournisseurs — Feuille TIERS</p>
          </div>
          {isERPAdmin && (
            <div className="hidden md:block">
              <CompanySelector 
                selectedId={selectedCompanyId} 
                onSelect={setSelectedCompanyId} 
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <Table size={14} /> Excel
          </button>
          <button 
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
            onClick={() => {
              setCurrentTiers({ nom: '', email: '', telephone: '', type: 'CLIENT', adresse: '', statut: 'ACTIF' });
              setIsAdding(true);
            }}
          >
            <Plus size={14} /> Nouveau tiers
          </button>
        </div>
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="card-hd">
              <h3 className="card-title">{isEditing ? 'Modifier Tiers' : 'Nouveau Tiers'}</h3>
              <button 
                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={isEditing ? handleEditTiers : handleAddTiers} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nom complet</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.nom}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Type</label>
                  <select 
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.type}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, type: e.target.value as TiersType })}
                  >
                    <option value="CLIENT">Client</option>
                    <option value="FOURNISSEUR">Fournisseur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Email</label>
                  <input 
                    type="email"
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.email}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Téléphone</label>
                  <input 
                    type="tel"
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.telephone}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, telephone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Adresse</label>
                <textarea 
                  className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] min-h-[80px]"
                  value={currentTiers.adresse}
                  onChange={(e) => setCurrentTiers({ ...currentTiers, adresse: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="flex-1 py-2.5 border border-kontrol-border text-kontrol-ink-soft font-bold rounded-xl hover:bg-kontrol-bg transition-all text-[13px]"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-kontrol-blue text-white font-bold rounded-xl hover:bg-kontrol-blue/90 transition-all text-[13px] shadow-lg shadow-kontrol-blue/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder="Rechercher nom, email, adresse…"
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select 
          className="bg-white border border-kontrol-border rounded-lg px-3 py-1.5 text-[13px] font-medium text-kontrol-ink-soft outline-none focus:border-kontrol-blue transition-colors"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as any);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">Tous types</option>
          <option value="CLIENT">Clients</option>
          <option value="FOURNISSEUR">Fournisseurs</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-4 items-start">
        {/* Table Card */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">ID</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Nom</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Type</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Statut</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : paginatedTiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      Aucun tiers trouvé.
                    </td>
                  </tr>
                ) : (
                  paginatedTiers.map((t, idx) => (
                    <tr 
                      key={t.id} 
                      className={cn(
                        "hover:bg-kontrol-blue/5 cursor-pointer transition-colors",
                        idx % 2 !== 0 ? "bg-kontrol-bg/10" : "bg-white",
                        selectedId === t.id && "bg-kontrol-blue/10"
                      )}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <td className="px-4 py-3 font-bold text-kontrol-ink-muted text-[11.5px]">{t.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-bold text-kontrol-dark">{t.nom}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                          t.type === 'CLIENT' ? "bg-kontrol-blue/10 text-kontrol-blue" : "bg-kontrol-dark/10 text-kontrol-dark"
                        )}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                          t.statut === 'ACTIF' ? "bg-emerald-50 text-emerald-600" : "bg-kontrol-bg text-kontrol-ink-muted"
                        )}>
                          {t.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1.5 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all">
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {filteredTiers.length} tiers affichés
            </span>
            {totalPages > 1 && (
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
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="card sticky top-4 overflow-hidden min-h-[400px]">
          {selectedTiers ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">Fiche tiers</h4>
                <button 
                  className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-extrabold mb-4",
                  selectedTiers.type === 'CLIENT' ? "bg-kontrol-blue/10 text-kontrol-blue" : "bg-kontrol-dark/10 text-kontrol-dark"
                )}>
                  {selectedTiers.nom.charAt(0)}
                </div>
                <h3 className="text-[15px] font-extrabold text-kontrol-dark leading-tight">{selectedTiers.nom}</h3>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 uppercase tracking-wider">{selectedTiers.id}</p>
                
                <div className="flex gap-1.5 mt-4 mb-6">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                    selectedTiers.type === 'CLIENT' ? "bg-kontrol-blue/10 text-kontrol-blue" : "bg-kontrol-dark/10 text-kontrol-dark"
                  )}>
                    {selectedTiers.type}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                    selectedTiers.statut === 'ACTIF' ? "bg-emerald-50 text-emerald-600" : "bg-kontrol-bg text-kontrol-ink-muted"
                  )}>
                    {selectedTiers.statut}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Transactions</p>
                    <p className="text-lg font-extrabold text-kontrol-dark">0</p>
                  </div>
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Solde</p>
                    <p className="text-lg font-extrabold text-kontrol-dark">0 FCFA</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex gap-3 text-[12.5px]">
                    <Mail size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Email</p>
                      <p className="text-kontrol-ink-soft truncate font-medium">{selectedTiers.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <Phone size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Téléphone</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedTiers.telephone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <MapPin size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Adresse</p>
                      <p className="text-kontrol-ink-soft font-medium leading-snug">{selectedTiers.adresse || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  <button 
                    className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                    onClick={() => openEdit(selectedTiers)}
                  >
                    <Edit2 size={14} /> Modifier
                  </button>
                  <button 
                    className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    onClick={() => setIsDeleting(true)}
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <UserCircle size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                Sélectionnez un tiers<br />pour voir ses détails.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
