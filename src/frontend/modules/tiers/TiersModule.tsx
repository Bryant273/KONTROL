import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, MoreVertical, Mail, Phone, MapPin, Loader2, X, UserCircle, History, Trash2, Edit2, FileText, Table, ArrowDownLeft, ArrowUpRight, Upload, Download } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '../../lib/export';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ExcelImportPreviewModal, ColumnConfig } from '../../components/common/ExcelImportPreviewModal';
import { downloadModuleTemplate, cleanImportedRows } from '../../lib/templates';
import { Tiers, TiersType, UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { hasPermission } from '../../lib/permissions';
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

interface TiersModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function TiersModule({ user, currentUserProfile }: TiersModuleProps) {
  const { t } = useTranslation();
  const companyId = currentUserProfile?.companyId || user.uid;
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

  const [excelPreviewData, setExcelPreviewData] = React.useState<any[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    if (!hasPermission(currentUserProfile?.role, 'TIERS_CREATE')) {
      toast.error(t('common.no_permission'));
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJsonData = XLSX.utils.sheet_to_json(ws) as any[];

        // Filtrer automatiquement les explications et exemples
        const data = cleanImportedRows('tiers', rawJsonData);

        const parsedRows: any[] = [];

        for (const item of data) {
          const headers = Object.keys(item);
          const nomKey = headers.find(h => h.toLowerCase().includes('nom') || h.toLowerCase().includes('name') || h.toLowerCase().includes('complet'));
          const emailKey = headers.find(h => h.toLowerCase().includes('mail'));
          const telKey = headers.find(h => h.toLowerCase().includes('tél') || h.toLowerCase().includes('tel') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile'));
          const typeKey = headers.find(h => h.toLowerCase().includes('type') || h.toLowerCase().includes('caté') || h.toLowerCase().includes('role'));
          const adresseKey = headers.find(h => h.toLowerCase().includes('adresse') || h.toLowerCase().includes('add') || h.toLowerCase().includes('local'));
          const statutKey = headers.find(h => h.toLowerCase().includes('statut') || h.toLowerCase().includes('status') || h.toLowerCase().includes('état') || h.toLowerCase().includes('etat'));

          const nomValue = nomKey ? String(item[nomKey] || '').trim() : '';
          
          let typeValue: TiersType = 'CLIENT';
          if (typeKey) {
            const rawType = String(item[typeKey] || '').toUpperCase();
            if (rawType.includes('FOURNISSEUR') || rawType.includes('SUPPLIER') || rawType.includes('VENDOR') || rawType.includes('FOURN')) {
              typeValue = 'FOURNISSEUR';
            }
          }

          let statutValue: 'ACTIF' | 'INACTIF' = 'ACTIF';
          if (statutKey) {
            const rawStat = String(item[statutKey] || '').toUpperCase();
            if (rawStat.includes('INACTIF') || rawStat.includes('INACTIVE')) {
              statutValue = 'INACTIF';
            }
          }

          parsedRows.push({
            nom: nomValue,
            email: emailKey ? String(item[emailKey] || '').trim() : '',
            telephone: telKey ? String(item[telKey] || '').trim() : '',
            type: typeValue,
            adresse: adresseKey ? String(item[adresseKey] || '').trim() : '',
            statut: statutValue
          });
        }

        if (parsedRows.length > 0) {
          setExcelPreviewData(parsedRows);
          setIsPreviewOpen(true);
        } else {
          toast.info("Aucune ligne de contact n'a été trouvée dans votre Excel.");
        }
      } catch (error) {
        console.error("Failed to read tiers excel:", error);
        toast.error("Erreur de lecture du fichier Excel.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async (finalData: any[]) => {
    try {
      const path = 'tiers';
      let count = 0;
      for (const item of finalData) {
        await addDoc(collection(db, path), {
          nom: item.nom,
          email: item.email,
          telephone: item.telephone,
          type: item.type,
          adresse: item.adresse,
          statut: item.statut,
          ownerId: companyId,
          createdAt: Date.now()
        });
        count++;
      }

      if (currentUserProfile) {
        await logAction(
          companyId,
          user.uid,
          currentUserProfile.displayName,
          "Tiers importés via Excel",
          `${count} contacts importés via assistant de prévisualisation`
        );
      }

      toast.success(`${count} contacts importés avec succès !`);
    } catch (err) {
      console.error("Tiers final import error:", err);
      toast.error("Échec de l'enregistrement des contacts.");
      throw err;
    }
  };

  const handleAddTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission(currentUserProfile?.role, 'TIERS_CREATE')) {
      alert(t('common.no_permission')); // I should probably add this to common
      return;
    }
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
      handleFirestoreError(error, OperationType.WRITE, 'tiers', user, false);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!hasPermission(currentUserProfile?.role, 'TIERS_UPDATE')) {
      alert(t('common.no_permission'));
      return;
    }
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
          t('tiers.log_modified'),
          `${currentTiers.nom} (${currentTiers.type})`
        );
      }

      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tiers', user, false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTiers = async () => {
    if (!selectedId) return;
    if (!hasPermission(currentUserProfile?.role, 'TIERS_DELETE')) {
      alert(t('common.no_permission'));
      return;
    }
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
          t('tiers.log_deleted'),
          `${tiersToDelete.nom}`
        );
      }

      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tiers', user, false);
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
    
    const q = query(
      collection(db, path),
      where('ownerId', '==', companyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tiersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tiers[];
      setTiers(tiersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path, user, false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, companyId, currentUserProfile]);

  React.useEffect(() => {
    const checkTargetId = () => {
      const tid = localStorage.getItem('selected_target_id_tiers');
      if (tid) {
        setSelectedId(tid);
        localStorage.removeItem('selected_target_id_tiers');
      }
    };
    
    checkTargetId();
    
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id) {
        setSelectedId(detail.id);
        localStorage.removeItem('selected_target_id_tiers');
      }
    };
    
    window.addEventListener('select-entity-tiers', listener);
    return () => window.removeEventListener('select-entity-tiers', listener);
  }, []);

  const selectedTiers = tiers.find(t => t.id === selectedId);

  const filteredTiers = tiers.filter(t => {
    const matchesSearch = t.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (t.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  React.useEffect(() => {
    if (selectedId && tiers.length > 0) {
      const match = tiers.find(t => t.id === selectedId);
      if (match) {
        // Clear conflicting filters and reset search
        setFilterType('ALL');
        setSearchTerm('');
      }
    }
  }, [selectedId, tiers]);

  React.useEffect(() => {
    if (selectedId && filteredTiers.length > 0) {
      const index = filteredTiers.findIndex(t => t.id === selectedId);
      if (index !== -1) {
        const targetPage = Math.floor(index / itemsPerPage) + 1;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [selectedId, filteredTiers]);

  const totalPages = Math.ceil(filteredTiers.length / itemsPerPage);
  const paginatedTiers = filteredTiers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = [t('tiers.table.name'), t('tiers.table.type'), t('tiers.form.email'), t('tiers.form.phone'), t('tiers.table.status')];
    const data = filteredTiers.map(tier => [
      tier.nom,
      tier.type,
      tier.email || '',
      tier.telephone || '',
      tier.statut
    ]);
    exportToPDF(`${t('tiers.title')} - KONTROL`, headers, data, 'Tiers_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportCSV = () => {
    // Secure download trigger guard: Verify user session
    if (!currentUserProfile) {
      toast.error(t('common.error', 'Session invalide pour l\'export'));
      return;
    }
    const data = filteredTiers.map(tier => ({
      [t('tiers.table.name')]: tier.nom,
      [t('tiers.table.type')]: tier.type,
      [t('tiers.form.email')]: tier.email || '',
      [t('tiers.form.phone')]: tier.telephone || '',
      [t('tiers.table.status')]: tier.statut
    }));
    exportToCSV(data, 'Tiers_KONTROL', { authorized: true });
  };

  const handleExportExcel = () => {
    const data = filteredTiers.map(tier => ({
      [t('tiers.table.name')]: tier.nom,
      [t('tiers.table.type')]: tier.type,
      [t('tiers.form.email')]: tier.email || '',
      [t('tiers.form.phone')]: tier.telephone || '',
      [t('tiers.table.status')]: tier.statut
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
        title={t('tiers.delete_tier')}
        message={t('tiers.delete_tier_confirm', { name: selectedTiers?.nom })}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('tiers.title')}</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('tiers.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          {hasPermission(currentUserProfile?.role, 'TIERS_CREATE') && (
            <>
              <button 
                onClick={() => downloadModuleTemplate('tiers')} 
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 text-kontrol-blue border-kontrol-blue/20 hover:bg-kontrol-blue/5"
                title="Télécharger le modèle Excel de Tiers"
              >
                <Download size={14} /> Modèle
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
                title="Importer des contacts depuis un fichier Excel/CSV"
              >
                <Upload size={14} /> {t('common.import', 'Importer')}
              </button>
            </>
          )}
          <button onClick={handleExportPDF} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleExportCSV} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2" title="Exporter au format CSV sécurisé">
            <FileText size={14} className="text-emerald-600" /> CSV
          </button>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <Table size={14} /> Excel
          </button>
          {hasPermission(currentUserProfile?.role, 'TIERS_CREATE') && (
            <button 
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
              onClick={() => {
                setCurrentTiers({ nom: '', email: '', telephone: '', type: 'CLIENT', adresse: '', statut: 'ACTIF' });
                setIsAdding(true);
              }}
            >
              <Plus size={14} /> {t('tiers.new_tier')}
            </button>
          )}
        </div>
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="card-hd">
              <h3 className="card-title">{isEditing ? t('tiers.edit_tier') : t('tiers.new_tier')}</h3>
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
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('tiers.form.name')}</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.nom}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('tiers.form.type')}</label>
                  <select 
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.type}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, type: e.target.value as TiersType })}
                  >
                    <option value="CLIENT">{t('tiers.form.type_client')}</option>
                    <option value="FOURNISSEUR">{t('tiers.form.type_vendor')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('tiers.form.email')}</label>
                  <input 
                    type="email"
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.email}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('tiers.form.phone')}</label>
                  <input 
                    type="tel"
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentTiers.telephone}
                    onChange={(e) => setCurrentTiers({ ...currentTiers, telephone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('tiers.form.address')}</label>
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
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-kontrol-blue text-white font-bold rounded-xl hover:bg-kontrol-blue/90 transition-all text-[13px] shadow-lg shadow-kontrol-blue/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : t('common.save')}
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
            placeholder={t('tiers.search_placeholder')}
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
          <option value="ALL">{t('tiers.filter_all')}</option>
          <option value="CLIENT">{t('tiers.filter_clients')}</option>
          <option value="FOURNISSEUR">{t('tiers.filter_vendors')}</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-4 items-start">
        {/* Table Card */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('tiers.table.id')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('tiers.table.name')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('tiers.table.type')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('tiers.table.status')}</th>
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
                      {t('tiers.no_tiers')}
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
              {t('tiers.total_count', { count: filteredTiers.length })}
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
                  {t('common.pagination', { current: currentPage, total: totalPages })}
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
                <h4 className="card-title">{t('tiers.details.title')}</h4>
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
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('tiers.details.transactions')}</p>
                    <p className="text-lg font-extrabold text-kontrol-dark">0</p>
                  </div>
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('tiers.details.balance')}</p>
                    <p className="text-lg font-extrabold text-kontrol-dark">0 FCFA</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex gap-3 text-[12.5px]">
                    <Mail size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('tiers.form.email')}</p>
                      <p className="text-kontrol-ink-soft truncate font-medium">{selectedTiers.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <Phone size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('tiers.form.phone')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedTiers.telephone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <MapPin size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('tiers.form.address')}</p>
                      <p className="text-kontrol-ink-soft font-medium leading-snug">{selectedTiers.adresse || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  {hasPermission(currentUserProfile?.role, 'TIERS_UPDATE') && (
                    <button 
                      className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                      onClick={() => openEdit(selectedTiers)}
                    >
                      <Edit2 size={14} /> {t('common.edit')}
                    </button>
                  )}
                  {hasPermission(currentUserProfile?.role, 'TIERS_DELETE') && (
                    <button 
                      className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      onClick={() => setIsDeleting(true)}
                    >
                      <Trash2 size={14} /> {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <UserCircle size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                {t('tiers.details.select_prompt')}
              </p>
            </div>
          )}
        </div>
      </div>

      {excelPreviewData && (
        <ExcelImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setExcelPreviewData(null);
          }}
          onConfirm={handleConfirmImport}
          rawData={excelPreviewData}
          existingData={tiers}
          moduleKey="tiers"
          isDuplicate={(row, existing) => 
            String(row.nom).toLowerCase().trim() === String(existing.nom).toLowerCase().trim() ||
            (row.email && String(row.email).toLowerCase().trim() === String(existing.email).toLowerCase().trim())
          }
          validateRow={(row) => {
            if (!row.nom || !String(row.nom).trim()) {
              return "Nom complet requis (ex: SOCIETE IVOIRIENNE DISTRIBUTION)";
            }
            if (!row.type || (row.type !== 'CLIENT' && row.type !== 'FOURNISSEUR')) {
              return "Type requis (CLIENT / FOURNISSEUR)";
            }
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
              return "Format d'adresse email invalide (ex: contact@tiers.ci)";
            }
            return null;
          }}
          title="Tiers / Clients & Fournisseurs"
          columns={[
            { key: 'nom', label: 'Nom Complet' },
            { key: 'email', label: 'Email' },
            { key: 'telephone', label: 'Téléphone' },
            { key: 'type', label: 'Type' },
            { key: 'statut', label: 'Statut' }
          ]}
        />
      )}
    </div>
  );
}
