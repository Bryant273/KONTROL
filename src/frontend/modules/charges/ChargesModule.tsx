import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Receipt, Loader2, X, History, Calendar, Tag, CreditCard, ArrowDownLeft, ArrowUpRight, ArrowDownRight, Edit2, Trash2, FileText, Table, Sparkles, Zap, Upload, Download } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ExcelImportPreviewModal, ColumnConfig } from '../../components/common/ExcelImportPreviewModal';
import { downloadModuleTemplate, cleanImportedRows, parseExcelDate, isValidExcelDate } from '../../lib/templates';
import { Charge, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
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
import { chargeService } from '../../../api/services/chargeService';

interface ChargesModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function ChargesModule({ user, currentUserProfile }: ChargesModuleProps) {
  const { t } = useTranslation();
  const companyId = currentUserProfile?.companyId || user.uid;
  const userName = currentUserProfile?.displayName || user.displayName || user.email || t('common.roles.user');
  const [charges, setCharges] = React.useState<Charge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterDate, setFilterDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [currentCharge, setCurrentCharge] = React.useState({
    description: '',
    categorie: 'Loyer',
    montant: 0,
    modePaiement: 'Espèces',
    date: new Date().toISOString().split('T')[0],
    justificatifUrl: ''
  });

  const [isViewingJustificatif, setIsViewingJustificatif] = React.useState(false);
  const [excelPreviewData, setExcelPreviewData] = React.useState<any[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId || !currentUserProfile) return;

    if (!hasPermission(currentUserProfile.role, 'FINANCE_CREATE')) {
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
        const data = cleanImportedRows('charges', rawJsonData);

        const parsedRows: any[] = [];

        for (const item of data) {
          const headers = Object.keys(item);
          const descKey = headers.find(h => h.toLowerCase().includes('desc') || h.toLowerCase().includes('libel') || h.toLowerCase().includes('sujet') || h.toLowerCase().includes('motif') || h.toLowerCase().includes('nom'));
          const catKey = headers.find(h => h.toLowerCase().includes('caté') || h.toLowerCase().includes('cate') || h.toLowerCase().includes('type'));
          const mtKey = headers.find(h => h.toLowerCase().includes('mont') || h.toLowerCase().includes('amou') || h.toLowerCase().includes('prix') || h.toLowerCase().includes('valeur') || h.toLowerCase().includes('cout') || h.toLowerCase().includes('coût'));
          const modeKey = headers.find(h => h.toLowerCase().includes('mode') || h.toLowerCase().includes('pai') || h.toLowerCase().includes('pay'));
          const dateKey = headers.find(h => h.toLowerCase().includes('date'));

          const descValue = descKey ? String(item[descKey] || '').trim() : '';
          const rawMontant = mtKey ? item[mtKey] : '';

          let catValue = catKey ? String(item[catKey] || '').trim() : 'Autres';
          const knownCategories = ["Loyer", "Électricité", "Eau", "Internet", "Salaires", "Transport", "Marketing", "Autres"];
          const matchedCat = knownCategories.find(c => c.toLowerCase() === catValue.toLowerCase());
          if (matchedCat) {
            catValue = matchedCat;
          } else {
            catValue = "Autres";
          }

          let modeValue = modeKey ? String(item[modeKey] || '').trim() : 'Espèces';
          if (modeValue.toLowerCase().includes('mob') || modeValue.toLowerCase().includes('wave') || modeValue.toLowerCase().includes('om') || modeValue.toLowerCase().includes('momo') || modeValue.toLowerCase().includes('cel')) {
            modeValue = 'Paiement Mobile';
          } else if (modeValue.toLowerCase().includes('banq') || modeValue.toLowerCase().includes('vire') || modeValue.toLowerCase().includes('card') || modeValue.toLowerCase().includes('carte')) {
            modeValue = 'Banque / Carte';
          } else {
            modeValue = 'Espèces';
          }

          let rawDateVal = dateKey ? String(item[dateKey] || '') : '';
          let dateValue = parseExcelDate(rawDateVal);

          parsedRows.push({
            description: descValue,
            categorie: catValue,
            montant: isNaN(Number(rawMontant)) ? rawMontant : Number(rawMontant || 0),
            modePaiement: modeValue,
            date: dateValue,
            rawDateText: rawDateVal
          });
        }

        if (parsedRows.length > 0) {
          setExcelPreviewData(parsedRows);
          setIsPreviewOpen(true);
        } else {
          toast.info("Aucune ligne de charge valide n'a été détectée dans l'Excel.");
        }
      } catch (err) {
        console.error("Export/Import Excel error charges:", err);
        toast.error("Erreur durant l'import de charges. Vérifiez votre fichier excel.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async (finalData: any[]) => {
    try {
      let count = 0;
      for (const item of finalData) {
        await chargeService.createCharge({
          description: item.description,
          categorie: item.categorie,
          montant: item.montant,
          modePaiement: item.modePaiement,
          date: item.date,
          justificatifUrl: '',
          ownerId: companyId,
          createdAt: Date.now()
        }, user);
        count++;
      }

      await logAction(
        companyId,
        user.uid,
        userName,
        'Mouvement: Importation',
        `${count} charges importées via assistant de prévisualisation (Excel)`
      );

      toast.success(`${count} charges importées avec succès !`);
    } catch (err) {
      console.error("Failed to confirm charges import:", err);
      toast.error("Erreur technique lors de la validation de l'import.");
      throw err;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 1MB for Firestore base64 storage)
      if (file.size > 1024 * 1024) {
        alert(t('charges.form.file_too_large'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentCharge(prev => ({ ...prev, justificatifUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing && selectedId) {
        await chargeService.updateCharge(selectedId, {
          ...currentCharge,
          date: new Date(currentCharge.date).getTime(),
          montant: Number(currentCharge.montant)
        }, user);

        await logAction(
          companyId,
          user.uid,
          userName,
          'Mouvement: Modifié',
          `Modification de la charge: ${currentCharge.description} (${formatCurrency(currentCharge.montant)})`
        );

        setIsEditing(false);
      } else {
        await chargeService.createCharge({
          ...currentCharge,
          date: new Date(currentCharge.date).getTime(),
          montant: Number(currentCharge.montant),
          devise: 'FCFA',
          ownerId: companyId,
          createdAt: Date.now()
        }, user);

        await logAction(
          companyId,
          user.uid,
          userName,
          'Mouvement: Décaissement',
          `Nouvelle charge: ${currentCharge.description} (${formatCurrency(currentCharge.montant)})`
        );

        setIsAdding(false);
      }
      setCurrentCharge({ description: '', categorie: 'Loyer', montant: 0, modePaiement: 'Espèces', date: new Date().toISOString().split('T')[0], justificatifUrl: '' });
    } catch (error) {
      // Error handled in service
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharge = async () => {
    if (!selectedId || !selectedCharge) return;
    setLoading(true);
    try {
      const chargeDesc = selectedCharge.description;
      const chargeAmount = selectedCharge.montant;

      await chargeService.deleteCharge(selectedId, user);

      await logAction(
        companyId,
        user.uid,
        userName,
        'Mouvement: Supprimé', // Using standardized prefix
        `Suppression de la charge: ${chargeDesc} (${formatCurrency(chargeAmount)})`
      );

      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      // Error handled in service
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    if (!selectedCharge) return;
    setCurrentCharge({
      description: selectedCharge.description,
      categorie: selectedCharge.categorie,
      montant: selectedCharge.montant,
      modePaiement: selectedCharge.modePaiement || 'Espèces',
      date: new Date(selectedCharge.date).toISOString().split('T')[0],
      justificatifUrl: selectedCharge.justificatifUrl || ''
    });
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (!currentUserProfile || !companyId) return;
    const path = 'charges';
    const q = query(
      collection(db, path),
      where('ownerId', '==', companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chargesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Charge[];
      chargesData.sort((a, b) => ((b as any).date || (b as any).createdAt || 0) - ((a as any).date || (a as any).createdAt || 0));
      setCharges(chargesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path, user, false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, companyId, currentUserProfile]);

  React.useEffect(() => {
    const checkTargetId = () => {
      const tid = localStorage.getItem('selected_target_id_charges');
      if (tid) {
        setSelectedId(tid);
        localStorage.removeItem('selected_target_id_charges');
      }
    };
    
    checkTargetId();
    
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id) {
        setSelectedId(detail.id);
        localStorage.removeItem('selected_target_id_charges');
      }
    };
    
    window.addEventListener('select-entity-charges', listener);
    return () => window.removeEventListener('select-entity-charges', listener);
  }, []);

  const selectedCharge = charges.find(c => c.id === selectedId);

  const filteredCharges = charges.filter(c => {
    const matchesSearch = c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.categorie.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || new Date(c.date).toISOString().split('T')[0] === filterDate;
    return matchesSearch && matchesDate;
  });

  React.useEffect(() => {
    if (selectedId && charges.length > 0) {
      const match = charges.find(c => c.id === selectedId);
      if (match) {
        // Clear date filter (making it match all) and search
        setFilterDate('');
        setSearchTerm('');
      }
    }
  }, [selectedId, charges]);

  React.useEffect(() => {
    if (selectedId && filteredCharges.length > 0) {
      const index = filteredCharges.findIndex(c => c.id === selectedId);
      if (index !== -1) {
        const targetPage = Math.floor(index / itemsPerPage) + 1;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [selectedId, filteredCharges]);

  const totalPages = Math.ceil(filteredCharges.length / itemsPerPage);
  const paginatedCharges = filteredCharges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalCharges = filteredCharges.reduce((acc, c) => acc + c.montant, 0);

  const handleExportPDF = () => {
    const headers = [t('common.date'), t('charges.form.description'), t('charges.form.category'), t('finance.table.amount'), t('finance.table.method')];
    const data = filteredCharges.map(c => [
      new Date(c.date).toLocaleDateString(),
      c.description,
      c.categorie,
      formatCurrency(c.montant),
      c.modePaiement
    ]);
    exportToPDF(`${t('charges.title')} - KONTROL`, headers, data, 'Charges_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredCharges.map(c => ({
      [t('common.date')]: new Date(c.date).toLocaleDateString(),
      [t('charges.form.description')]: c.description,
      [t('charges.form.category')]: c.categorie,
      [t('finance.table.amount')]: c.montant,
      [t('finance.table.method')]: c.modePaiement
    }));
    exportToExcel(data, 'Charges_KONTROL');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('charges.title')}</h2>
        <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('charges.subtitle')}</p>
      </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => downloadModuleTemplate('charges')} 
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 text-kontrol-blue border-kontrol-blue/20 hover:bg-kontrol-blue/5"
            title="Télécharger le modèle Excel de charges"
          >
            <Download size={14} /> Modèle
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
            title="Importer des charges depuis un fichier Excel/CSV"
          >
            <Upload size={14} /> {t('common.import', 'Importer')}
          </button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <Table size={14} /> Excel
          </button>
          <button 
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={14} /> {t('charges.new_charge')}
          </button>
        </div>
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="card-hd">
              <h3 className="card-title">{isEditing ? t('charges.edit_charge') : t('charges.new_charge')}</h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCharge} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('charges.form.description')}</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                  value={currentCharge.description}
                  onChange={(e) => setCurrentCharge({ ...currentCharge, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('charges.form.category')}</label>
                  <select 
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.categorie}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, categorie: e.target.value })}
                  >
                    <option value="Loyer">{t('charges.categories.rent')}</option>
                    <option value="Électricité">{t('charges.categories.electricity')}</option>
                    <option value="Eau">{t('charges.categories.water')}</option>
                    <option value="Internet">{t('charges.categories.internet')}</option>
                    <option value="Salaires">{t('charges.categories.salaries')}</option>
                    <option value="Transport">{t('charges.categories.transport')}</option>
                    <option value="Marketing">{t('charges.categories.marketing')}</option>
                    <option value="Autres">{t('charges.categories.others')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('charges.form.amount')}</label>
                  <input 
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.montant || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentCharge({ ...currentCharge, montant: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('charges.form.payment_method')}</label>
                  <select 
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.modePaiement}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, modePaiement: e.target.value })}
                  >
                    <option value="Espèces">{t('finance.table.method')} (Cash)</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Carte">Carte</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('charges.form.date')}</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.date}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('charges.form.proof')}</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="justificatif-upload"
                    />
                    <label 
                      htmlFor="justificatif-upload"
                      className="flex-1 px-3 py-2 bg-kontrol-bg border border-dashed border-kontrol-border rounded-lg cursor-pointer hover:border-kontrol-blue transition-all text-[13px] text-center text-kontrol-ink-muted"
                    >
                      {currentCharge.justificatifUrl ? t('charges.form.change_file') : t('charges.form.choose_file')}
                    </label>
                    {currentCharge.justificatifUrl && (
                      <button 
                        type="button"
                        onClick={() => setCurrentCharge(prev => ({ ...prev, justificatifUrl: '' }))}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {currentCharge.justificatifUrl && currentCharge.justificatifUrl.startsWith('data:image/') && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-kontrol-border bg-kontrol-bg">
                      <img 
                        src={currentCharge.justificatifUrl} 
                        alt="Aperçu" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  {currentCharge.justificatifUrl && currentCharge.justificatifUrl.startsWith('data:application/pdf') && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                      <FileText size={18} />
                      <span className="text-[12px] font-medium">Document PDF joint</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="flex-1 py-2.5 border border-kontrol-border text-kontrol-ink-soft font-bold rounded-xl hover:bg-kontrol-bg transition-all text-[13px]"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-kontrol-blue text-white font-bold rounded-xl hover:bg-kontrol-blue/90 transition-all text-[13px] shadow-lg shadow-kontrol-blue/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? t('common.update') : t('common.save'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteCharge}
        title={t('charges.delete_charge')}
        message={t('charges.delete_charge_confirm', { description: selectedCharge?.description })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi">
          <p className="kpi-lbl">{t('charges.total_period')}</p>
          <h3 className="kpi-val text-rose-600">{formatCurrency(totalCharges)}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('charges.pieces_count')}</p>
          <h3 className="kpi-val">{t('charges.stats.pieces', { count: filteredCharges.length })}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('charges.average_charge')}</p>
          <h3 className="kpi-val">
            {filteredCharges.length > 0 ? formatCurrency(totalCharges / filteredCharges.length) : '0 FCFA'}
          </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder={t('charges.search_placeholder', 'Rechercher description, tiers... ou catégorie')}
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5">
          <Calendar size={14} className="text-kontrol-ink-muted" />
          <input 
            type="date"
            className="bg-transparent border-none outline-none text-[13px] font-medium text-kontrol-ink-soft"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-4 items-start">
        {/* Table Card */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('common.date')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('charges.form.category')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('charges.form.description')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">{t('finance.table.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : paginatedCharges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      {t('charges.no_charges')}
                    </td>
                  </tr>
                ) : (
                  paginatedCharges.map((c) => (
                    <tr 
                      key={c.id} 
                      className={cn(
                        "hover:bg-kontrol-blue/5 cursor-pointer transition-colors even:bg-kontrol-bg/30",
                        selectedId === c.id && "bg-kontrol-blue/10"
                      )}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="px-4 py-3 text-kontrol-ink-muted">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-kontrol-bg text-kontrol-ink-muted">
                          {c.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-kontrol-dark truncate max-w-[200px]">
                        <div className="flex flex-col">
                          <span>{c.description}</span>
                          {c.isSystemGenerated && (
                            <span className="flex items-center gap-1 text-[9px] text-kontrol-blue font-extrabold uppercase tracking-widest mt-0.5">
                              <Sparkles size={8} /> Auto-KONTROL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-rose-600">{formatCurrency(c.montant)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {t('charges.total_count', { count: filteredCharges.length })}
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
          {selectedCharge ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">{t('charges.details_title')}</h4>
                <button 
                  className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <ArrowDownRight size={24} />
                </div>
                <h3 className="text-[15px] font-extrabold text-kontrol-dark leading-tight">{selectedCharge.description}</h3>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 uppercase tracking-wider">{selectedCharge.categorie} · {selectedCharge.id.slice(0,8)}</p>
                
                <div className="bg-kontrol-dark rounded-lg p-4 mt-6 mb-6">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{t('finance.table.amount')}</p>
                  <p className="text-xl font-extrabold text-kontrol-blue">{formatCurrency(selectedCharge.montant)}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex gap-3 text-[12.5px]">
                    <Calendar size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('charges.form.date')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{new Date(selectedCharge.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <Tag size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('charges.form.category')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedCharge.categorie}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <CreditCard size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('charges.form.payment_method')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedCharge.modePaiement || 'Espèces'}</p>
                    </div>
                  </div>
                </div>
                
                {selectedCharge.isSystemGenerated && (
                  <div className="mt-4 p-3 bg-kontrol-blue/5 border border-kontrol-blue/10 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue">
                      <Zap size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-kontrol-blue uppercase tracking-wider">{t('charges.auto_kontrol.title')}</p>
                      <p className="text-[10px] text-kontrol-ink-soft opacity-70">{t('charges.auto_kontrol.desc')}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-8">
                  <button 
                    onClick={() => {
                      if (selectedCharge.justificatifUrl) {
                        setIsViewingJustificatif(true);
                      } else {
                        alert(t('common.no_data'));
                      }
                    }}
                    className={cn(
                      "flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2",
                      !selectedCharge.justificatifUrl && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Receipt size={14} /> {t('charges.form.proof')}
                  </button>
                  <button 
                    onClick={openEdit}
                    className="p-2.5 border border-kontrol-border text-kontrol-ink-soft hover:bg-kontrol-bg rounded-xl transition-all"
                    title={t('common.edit')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setIsDeleting(true)}
                    className="p-2.5 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title={t('common.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <Receipt size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                {t('charges.select_prompt')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Justificatif Viewer Modal */}
      {isViewingJustificatif && selectedCharge?.justificatifUrl && (
        <div className="fixed inset-0 bg-kontrol-dark/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-extrabold text-kontrol-dark">{t('charges.form.proof')}</h3>
                  <p className="text-[11px] text-kontrol-ink-muted uppercase tracking-wider">{selectedCharge.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={selectedCharge.justificatifUrl} 
                  download={`justificatif_${selectedCharge.id.slice(0,8)}`}
                  className="p-2 text-kontrol-ink-muted hover:text-kontrol-blue hover:bg-kontrol-bg rounded-xl transition-all"
                  title="Télécharger"
                >
                  <ArrowDownRight size={20} className="rotate-90" />
                </a>
                <button 
                  onClick={() => setIsViewingJustificatif(false)}
                  className="p-2 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-kontrol-bg overflow-auto p-4 flex items-center justify-center">
              {selectedCharge.justificatifUrl.startsWith('data:image/') ? (
                <img 
                  src={selectedCharge.justificatifUrl} 
                  alt="Justificatif" 
                  className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <iframe 
                  src={selectedCharge.justificatifUrl} 
                  className="w-full h-full rounded-lg border border-kontrol-border shadow-lg"
                  title="PDF Viewer"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {excelPreviewData && (
        <ExcelImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setExcelPreviewData(null);
          }}
          onConfirm={handleConfirmImport}
          rawData={excelPreviewData}
          existingData={charges}
          moduleKey="charges"
          isDuplicate={(row, existing) => 
            String(row.description).toLowerCase().trim() === String(existing.description).toLowerCase().trim() &&
            Number(row.montant) === Number(existing.montant)
          }
          validateRow={(row) => {
            if (!row.description || !String(row.description).trim()) {
              return "Description ou libellé requis";
            }
            if (row.montant === undefined || row.montant === '' || isNaN(Number(row.montant)) || Number(row.montant) <= 0) {
              return "Montant d'achat doit être un nombre positif supérieur à 0";
            }
            if (row.rawDateText && !isValidExcelDate(row.rawDateText)) {
              return "Format de date invalide (attendu: JJ/MM/AAAA ou AAAA-MM-JJ)";
            }
            return null;
          }}
          title="Dépenses & Charges"
          columns={[
            { key: 'description', label: 'Description' },
            { key: 'categorie', label: 'Catégorie' },
            { key: 'montant', label: 'Montant', render: (val) => formatCurrency(val.montant) },
            { key: 'modePaiement', label: 'Mode Paiement' },
            { key: 'date', label: 'Date', render: (val) => new Date(val.date).toLocaleDateString() }
          ]}
        />
      )}
    </div>
  );
}
