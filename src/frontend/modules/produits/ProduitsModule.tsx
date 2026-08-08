import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Package, AlertCircle, Loader2, X, Boxes, History, Trash2, Edit2, FileText, Table, Upload, Download, ArrowDownLeft, ArrowUpRight, Calendar, CalendarDays } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '../../lib/export';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ExcelImportPreviewModal, ColumnConfig } from '../../components/common/ExcelImportPreviewModal';
import { downloadModuleTemplate, cleanImportedRows } from '../../lib/templates';
import { Produit, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { logAction, handleFirestoreError, OperationType, auth } from '../../../api/firebase';
import { hasPermission } from '../../lib/permissions';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { productService } from '../../../api/services/productService';
import { motion } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { where, orderBy } from 'firebase/firestore';

import { ModuleActivityLog } from '../../components/common/ModuleActivityLog';

interface ProduitsModuleProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function ProduitsModule({ user, currentUserProfile }: ProduitsModuleProps) {
  const { t } = useTranslation();
  const companyId = currentUserProfile?.companyId || user.uid;
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [selectedCategory, setSelectedCategory] = React.useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [filterDate, setFilterDate] = React.useState<string>('');
  const [isTodayOnly, setIsTodayOnly] = React.useState<boolean>(false);

  const [currentProduit, setCurrentProduit] = React.useState({
    reference: '',
    designation: '',
    prixAchat: 0,
    prixVente: 0,
    stockInitial: 0,
    alertStock: 5,
    tva: 18
  });

  const [excelPreviewData, setExcelPreviewData] = React.useState<any[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId || !currentUserProfile) return;

    if (!hasPermission(currentUserProfile.role, 'PRODUCT_CREATE')) {
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

        // Filtrer automatiquement la ligne d'explications et d'exemples du modèle Excel
        const data = cleanImportedRows('produits', rawJsonData);

        const parsedRows: any[] = [];

        for (const item of data) {
          const headers = Object.keys(item);
          const refKey = headers.find(h => h.toLowerCase().includes('ref') || h.toLowerCase().includes('code') || h.toLowerCase().includes('num'));
          const descKey = headers.find(h => h.toLowerCase().includes('desc') || h.toLowerCase().includes('design') || h.toLowerCase().includes('nom') || h.toLowerCase().includes('libel'));
          
          // Disambiguate buying and selling price keys
          const buyingKey = headers.find(h => {
            const l = h.toLowerCase();
            return (l.includes('achat') || l.includes('buy') || l.includes('coût') || l.includes('cout')) && !l.includes('vent');
          }) || headers.find(h => h.toLowerCase().includes('achat') || h.toLowerCase().includes('buy'));

          const sellingKey = headers.find(h => {
            const l = h.toLowerCase();
            return (l.includes('vente') || l.includes('vent') || l.includes('sell')) && !l.includes('achat');
          }) || headers.find(h => {
            const l = h.toLowerCase();
            return l.includes('prix') && !l.includes('achat');
          }) || headers.find(h => h.toLowerCase().includes('prix') || h.toLowerCase().includes('vente'));

          const stockKey = headers.find(h => h.toLowerCase().includes('stock') || h.toLowerCase().includes('quant') || h.toLowerCase().includes('qte') || h.toLowerCase().includes('qty'));
          const alertKey = headers.find(h => h.toLowerCase().includes('alert') || h.toLowerCase().includes('min'));
          const tvaKey = headers.find(h => h.toLowerCase().includes('tva') || h.toLowerCase().includes('tax'));

          const reference = refKey ? String(item[refKey] || '').trim() : '';
          const designation = descKey ? String(item[descKey] || '').trim() : '';

          const rawPrixAchat = buyingKey ? item[buyingKey] : undefined;
          const rawPrixVente = sellingKey ? item[sellingKey] : undefined;
          const rawStock = stockKey ? item[stockKey] : undefined;

          parsedRows.push({
            reference,
            designation,
            prixAchat: rawPrixAchat !== undefined ? rawPrixAchat : 0,
            prixVente: rawPrixVente !== undefined ? rawPrixVente : 0,
            stock: rawStock !== undefined ? rawStock : 0,
            alertStock: alertKey ? Number(item[alertKey] || 5) : 5,
            tva: tvaKey ? Number(item[tvaKey] || 18) : 18
          });
        }

        if (parsedRows.length > 0) {
          setExcelPreviewData(parsedRows);
          setIsPreviewOpen(true);
        } else {
          toast.info("Aucun article valide trouvé dans votre fichier Excel.");
        }
      } catch (error) {
        console.error("Products Excel import error:", error);
        toast.error("Erreur durant l'import de catalogue.");
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
        const prodData: Produit = {
          reference: item.reference,
          designation: item.designation,
          prixAchat: item.prixAchat,
          prixVente: item.prixVente,
          stock: item.stock,
          alertStock: item.alertStock,
          cump: item.prixAchat,
          tva: item.tva,
          ownerId: companyId,
          createdAt: Date.now()
        } as Produit;
        await productService.createProduct(prodData, user, currentUserProfile);
        count++;
      }

      await logAction(
        companyId,
        user.uid,
        currentUserProfile.displayName,
        "Produits: Importés",
        `${count} produits importés via assistant de prévisualisation (Excel)`
      );

      toast.success(`${count} produits importés avec succès !`);
    } catch (err) {
      console.error("Failed to commit final products import:", err);
      toast.error("Échec technique lors de la validation finale de l'import.");
      throw err;
    }
  };

  const handleDownloadFiche = (p: Produit) => {
    const headers = [t('produits.details.characteristic'), t('produits.details.value')];
    const data = [
      [t('produits.form.reference'), p.reference],
      [t('produits.form.designation'), p.designation],
      [t('produits.form.buy_price'), formatCurrency(p.prixAchat)],
      [t('produits.form.sell_price'), formatCurrency(p.prixVente)],
      [t('produits.form.tva'), `${p.tva}%`],
      [t('produits.details.current_stock'), `${p.stock} u.`],
      [t('produits.form.alert_stock'), `${p.alertStock || 5} u.`],
      [t('produits.details.stock_value'), formatCurrency(p.stock * p.prixVente)],
      [t('produits.details.gross_margin'), formatCurrency(p.prixVente - p.prixAchat)],
      [t('produits.details.created_at'), new Date(p.createdAt).toLocaleDateString()]
    ];
    exportToPDF(`${t('produits.details.title')} - ${p.designation}`, headers, data, `Fiche_${p.reference}`, currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleAddProduit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission(currentUserProfile?.role, 'PRODUCT_CREATE')) {
      setMessage({ type: 'error', text: t('common.no_permission') });
      return;
    }
    if (!currentProduit.reference || !currentProduit.designation) {
      setMessage({ type: 'error', text: t('produits.form.required_fields') });
      return;
    }
    if (!companyId) {
      setMessage({ type: 'error', text: t('common.error_company_id') });
      return;
    }

    setLoading(true);
    try {
      const initialStock = Number(currentProduit.stockInitial);
      const prixAchat = Number(currentProduit.prixAchat);

      const prodData: Produit = {
        reference: currentProduit.reference,
        designation: currentProduit.designation,
        prixAchat: prixAchat,
        prixVente: Number(currentProduit.prixVente),
        stock: initialStock,
        alertStock: Number(currentProduit.alertStock),
        cump: prixAchat,
        tva: Number(currentProduit.tva),
        ownerId: companyId!,
        createdAt: Date.now()
      } as Produit;

      await productService.createProduct(prodData, user, currentUserProfile);

      setMessage({ type: 'success', text: t('produits.save_success') });
      setTimeout(() => {
        setIsAdding(false);
        setMessage(null);
        setCurrentProduit({ reference: '', designation: '', prixAchat: 0, prixVente: 0, stockInitial: 0, alertStock: 5, tva: 18 });
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'produits', user, false);
      setMessage({ type: 'error', text: "Erreur lors de l'enregistrement du produit." });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!hasPermission(currentUserProfile?.role, 'PRODUCT_UPDATE')) {
      setMessage({ type: 'error', text: t('common.no_permission') });
      return;
    }
    setLoading(true);
    try {
      await productService.updateProduct(selectedId, {
        reference: currentProduit.reference,
        designation: currentProduit.designation,
        prixAchat: Number(currentProduit.prixAchat),
        prixVente: Number(currentProduit.prixVente),
        alertStock: Number(currentProduit.alertStock),
        tva: Number(currentProduit.tva)
      }, user, currentUserProfile);

      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `produits/${selectedId}`, user, false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduit = async () => {
    if (!selectedId) return;
    if (!hasPermission(currentUserProfile?.role, 'PRODUCT_DELETE')) {
      setMessage({ type: 'error', text: t('common.no_permission') });
      return;
    }
    setLoading(true);
    try {
      await productService.deleteProduct(selectedId, user, currentUserProfile);
      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `produits/${selectedId}`, user, false);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p: Produit) => {
    setCurrentProduit({
      reference: p.reference,
      designation: p.designation,
      prixAchat: p.prixAchat,
      prixVente: p.prixVente,
      stockInitial: p.stock,
      alertStock: p.alertStock || 5,
      tva: p.tva
    });
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (!currentUserProfile) return;
    
    const constraints: any[] = [where('ownerId', '==', companyId)];

    const unsubscribe = productService.subscribeToAll((data) => {
      const sorted = [...data].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setProduits(sorted);
    }, user, constraints);
    setLoading(false);

    return () => unsubscribe();
  }, [user, companyId, currentUserProfile]);

  React.useEffect(() => {
    const checkTargetId = () => {
      const tid = localStorage.getItem('selected_target_id_produits');
      if (tid) {
        setSelectedId(tid);
        localStorage.removeItem('selected_target_id_produits');
      }
    };
    
    checkTargetId();
    
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id) {
        setSelectedId(detail.id);
        localStorage.removeItem('selected_target_id_produits');
      }
    };
    
    window.addEventListener('select-entity-produits', listener);
    return () => window.removeEventListener('select-entity-produits', listener);
  }, []);

  const toLocalDateStr = (val: number | string | Date) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedProduit = produits.find(p => p.id === selectedId);
  const todayStr = toLocalDateStr(Date.now());
  const activeDate = isTodayOnly ? todayStr : filterDate;
  
  const filteredProduits = produits.filter(p => {
    const matchesSearch = p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory === 'IN_STOCK') {
      matchesCategory = p.stock > (p.alertStock || 5);
    } else if (selectedCategory === 'LOW_STOCK') {
      matchesCategory = p.stock > 0 && p.stock <= (p.alertStock || 5);
    } else if (selectedCategory === 'OUT_OF_STOCK') {
      matchesCategory = p.stock <= 0;
    }

    const pDateStr = p.createdAt ? toLocalDateStr(p.createdAt) : '';
    const matchesDate = !activeDate || pDateStr === activeDate;
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  React.useEffect(() => {
    if (selectedId && produits.length > 0) {
      const match = produits.find(p => p.id === selectedId);
      if (match) {
        // Clear category filter
        setSelectedCategory('ALL');
        // Clear search
        setSearchTerm('');
      }
    }
  }, [selectedId, produits]);

  React.useEffect(() => {
    if (selectedId && filteredProduits.length > 0) {
      const index = filteredProduits.findIndex(p => p.id === selectedId);
      if (index !== -1) {
        // itemsPerPage is 10
        const targetPage = Math.floor(index / 10) + 1;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [selectedId, filteredProduits]);

  const totalPages = Math.ceil(filteredProduits.length / itemsPerPage);
  const paginatedProduits = filteredProduits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = [t('produits.table.reference'), t('produits.table.designation'), t('produits.form.buy_price'), t('produits.form.sell_price'), t('produits.table.stock'), t('produits.details.stock_value')];
    const data = filteredProduits.map(p => [
      p.reference,
      p.designation,
      formatCurrency(p.prixAchat),
      formatCurrency(p.prixVente),
      `${p.stock} u.`,
      formatCurrency(p.stock * p.prixVente)
    ]);
    exportToPDF(`${t('produits.title')} - KONTROL`, headers, data, 'Produits_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportCSV = () => {
    // Secure download trigger guard: Verify user session
    if (!currentUserProfile) {
      toast.error(t('common.error', 'Session invalide pour l\'export'));
      return;
    }
    const data = filteredProduits.map(p => ({
      [t('produits.table.reference')]: p.reference,
      [t('produits.table.designation')]: p.designation,
      [t('produits.form.buy_price')]: p.prixAchat,
      [t('produits.form.sell_price')]: p.prixVente,
      [t('produits.table.stock')]: p.stock,
      [t('produits.details.stock_value')]: p.stock * p.prixVente
    }));
    exportToCSV(data, 'Produits_KONTROL', { authorized: true });
  };

  const handleExportExcel = () => {
    const data = filteredProduits.map(p => ({
      [t('produits.table.reference')]: p.reference,
      [t('produits.table.designation')]: p.designation,
      [t('produits.form.buy_price')]: p.prixAchat,
      [t('produits.form.sell_price')]: p.prixVente,
      [t('produits.table.stock')]: p.stock,
      [t('produits.details.stock_value')]: p.stock * p.prixVente
    }));
    exportToExcel(data, 'Produits_KONTROL');
  };

  return (
    <div className="space-y-4">
      <ConfirmModal 
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteProduit}
        loading={loading}
        title={t('produits.delete_product')}
        message={t('produits.delete_product_confirm', { name: selectedProduit?.designation })}
      />

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-kontrol-dark">{isEditing ? t('produits.edit_product') : t('produits.new_product')}</h3>
              <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={isEditing ? handleEditProduit : handleAddProduit} className="p-6 space-y-4">
              {message && (
                <div className={cn(
                  "p-3 rounded-lg text-[13px] font-bold text-center animate-in fade-in slide-in-from-top-2",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                )}>
                  {message.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.reference')} *</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.reference}
                    onChange={(e) => setCurrentProduit({...currentProduit, reference: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.designation')} *</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.designation}
                    onChange={(e) => setCurrentProduit({...currentProduit, designation: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.buy_price')} *</label>
                  <input 
                    type="number" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.prixAchat || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, prixAchat: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.sell_price')} *</label>
                  <input 
                    type="number" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.prixVente || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, prixVente: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.initial_stock')} *</label>
                  <input 
                    type="number" required
                    disabled={isEditing}
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue disabled:opacity-50"
                    value={currentProduit.stockInitial || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, stockInitial: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.alert_stock')} *</label>
                  <input 
                    type="number" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.alertStock || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, alertStock: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('produits.form.tva')} (%)</label>
                  <input 
                    type="number"
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.tva || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, tva: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-bold flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : isEditing ? t('common.update') : t('produits.save_product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('produits.title')}</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('produits.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission(currentUserProfile?.role, 'PRODUCT_CREATE') && (
            <>
              <button 
                onClick={() => downloadModuleTemplate('produits')} 
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 text-kontrol-blue border-kontrol-blue/20 hover:bg-kontrol-blue/5"
                title="Télécharger le modèle Excel de Produits"
              >
                <Download size={14} /> Modèle
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
              >
                <Upload size={14} /> {t('produits.import')}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleImportExcel} 
              />
            </>
          )}
          <button 
            onClick={handleExportPDF}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <FileText size={14} /> PDF
          </button>
          <button 
            onClick={handleExportCSV}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
            title="Exporter au format CSV sécurisé"
          >
            <FileText size={14} className="text-emerald-600" /> CSV
          </button>
          <button 
            onClick={handleExportExcel}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <Table size={14} /> Excel
          </button>
          {hasPermission(currentUserProfile?.role, 'PRODUCT_CREATE') && (
            <button 
              onClick={() => {
                setCurrentProduit({ reference: '', designation: '', prixAchat: 0, prixVente: 0, stockInitial: 0, alertStock: 5, tva: 18 });
                setIsAdding(true);
              }} 
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
            >
              <Plus size={14} /> {t('produits.new_product')}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder={t('produits.search_placeholder')}
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Categories & Date Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-kontrol-bg p-1 rounded-xl border border-kontrol-border">
            <button
              type="button"
              onClick={() => { setSelectedCategory('ALL'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-[12px] font-bold rounded-lg transition-all",
                selectedCategory === 'ALL' 
                  ? "bg-white text-kontrol-dark shadow-xs border border-kontrol-border" 
                  : "text-kontrol-ink-muted hover:text-kontrol-dark"
              )}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => { setSelectedCategory('IN_STOCK'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5",
                selectedCategory === 'IN_STOCK' 
                  ? "bg-white text-emerald-600 shadow-xs border border-emerald-100" 
                  : "text-kontrol-ink-muted hover:text-emerald-600"
              )}
            >
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {t('produits.status_in') || "En Stock"}
            </button>
            <button
              type="button"
              onClick={() => { setSelectedCategory('LOW_STOCK'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5",
                selectedCategory === 'LOW_STOCK' 
                  ? "bg-white text-orange-600 shadow-xs border border-orange-100" 
                  : "text-kontrol-ink-muted hover:text-orange-505"
              )}
            >
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              {t('produits.status_low') || "Stock Faible"}
            </button>
            <button
              type="button"
              onClick={() => { setSelectedCategory('OUT_OF_STOCK'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5",
                selectedCategory === 'OUT_OF_STOCK' 
                  ? "bg-white text-rose-600 shadow-xs border border-rose-100" 
                  : "text-kontrol-ink-muted hover:text-rose-505"
              )}
            >
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              {t('produits.status_out') || "Rupture"}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nextState = !isTodayOnly;
                setIsTodayOnly(nextState);
                if (nextState) {
                  setFilterDate(todayStr);
                } else {
                  setFilterDate('');
                }
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 text-[12px] font-bold rounded-xl transition-all flex items-center gap-1.5 border shadow-xs",
                isTodayOnly
                  ? "bg-kontrol-blue text-white border-kontrol-blue"
                  : "bg-white text-kontrol-ink-soft border-kontrol-border hover:border-kontrol-blue/40"
              )}
            >
              <CalendarDays size={13} />
              {isTodayOnly ? "Données du jour (Actif)" : "Données du jour"}
            </button>

            <div className="flex items-center gap-1 bg-kontrol-bg border border-kontrol-border rounded-xl px-2.5 py-1">
              <Calendar size={13} className="text-kontrol-ink-muted" />
              <input 
                type="date"
                className="bg-transparent border-none outline-none text-[12px] font-medium text-kontrol-ink-soft"
                value={filterDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterDate(val);
                  setIsTodayOnly(val === todayStr);
                  setCurrentPage(1);
                }}
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterDate('');
                    setIsTodayOnly(false);
                    setCurrentPage(1);
                  }}
                  className="text-xs text-kontrol-ink-muted hover:text-rose-500 font-bold px-1"
                  title="Réinitialiser la date"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-4 items-start">
        {/* Table Card */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('produits.table.reference')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('produits.table.designation')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">{t('produits.form.sell_price')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-center">{t('produits.table.stock')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('common.status_label')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading && !produits.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : paginatedProduits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      {t('produits.no_products')}
                    </td>
                  </tr>
                ) : (
                  paginatedProduits.map((p, index) => {
                    const [scls, slbl] = p.stock <= 0 ? ["bg-rose-50 text-rose-600", t('produits.status_out')] : 
                                       p.stock <= (p.alertStock || 5) ? ["bg-orange-50 text-orange-600", t('produits.status_low')] : 
                                       ["bg-emerald-50 text-emerald-600", t('produits.status_in')];
                    return (
                      <motion.tr 
                        key={p.id} 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                        className={cn(
                          "hover:bg-kontrol-blue/5 cursor-pointer transition-colors even:bg-kontrol-bg/30",
                          selectedId === p.id && "bg-kontrol-blue/10"
                        )}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold bg-kontrol-bg px-2 py-0.5 rounded text-kontrol-ink-muted">
                            {p.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-kontrol-dark">{p.designation}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-kontrol-ink-soft">{formatCurrency(p.prixVente)}</td>
                        <td className="px-4 py-3 text-center font-bold">{p.stock} u.</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider",
                            scls
                          )}>
                            {slbl}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {t('produits.total_count', { count: filteredProduits.length })}
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
          {selectedProduit ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">{t('produits.details.title')}</h4>
                <button 
                  className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="w-12 h-12 rounded-xl bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted mb-4">
                  <Package size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-extrabold text-kontrol-dark leading-tight">{selectedProduit.designation}</h3>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 uppercase tracking-wider">{selectedProduit.reference} · {selectedProduit.id.slice(0,8)}</p>
                
                <div className="grid grid-cols-2 gap-2 mt-6 mb-6">
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('produits.form.buy_price')}</p>
                    <p className="text-sm font-extrabold text-kontrol-ink-soft">{formatCurrency(selectedProduit.prixAchat)}</p>
                  </div>
                  <div className="bg-kontrol-dark rounded-lg p-3">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{t('produits.form.sell_price')}</p>
                    <p className="text-sm font-extrabold text-kontrol-blue">{formatCurrency(selectedProduit.prixVente)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('produits.details.current_stock')}</p>
                    <p className={cn(
                      "text-lg font-extrabold",
                      selectedProduit.stock <= (selectedProduit.alertStock || 5) ? "text-rose-600" : "text-kontrol-dark"
                    )}>{selectedProduit.stock} u.</p>
                  </div>
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('produits.details.stock_value')}</p>
                    <p className="text-lg font-extrabold text-kontrol-dark">{formatCurrency(selectedProduit.stock * selectedProduit.prixVente)}</p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2 border-t border-kontrol-border">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-kontrol-ink-muted font-bold uppercase tracking-tighter text-[11px]">{t('produits.form.tva_label')}</span>
                    <span className="text-kontrol-ink-soft font-bold">{selectedProduit.tva}%</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-kontrol-ink-muted font-bold uppercase tracking-tighter text-[11px]">{t('produits.details.gross_margin')}</span>
                    <span className="text-emerald-600 font-bold">{formatCurrency(selectedProduit.prixVente - selectedProduit.prixAchat)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  <button 
                    className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                    onClick={() => handleDownloadFiche(selectedProduit)}
                  >
                    <Download size={14} /> {t('produits.details.sheet')}
                  </button>
                  {hasPermission(currentUserProfile?.role, 'PRODUCT_UPDATE') && (
                    <button 
                      className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                      onClick={() => openEdit(selectedProduit)}
                    >
                      <Edit2 size={14} /> {t('common.edit')}
                    </button>
                  )}
                </div>
                {hasPermission(currentUserProfile?.role, 'PRODUCT_DELETE') && (
                  <div className="mt-2">
                    <button 
                      className="w-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      onClick={() => setIsDeleting(true)}
                    >
                      <Trash2 size={14} /> {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <Package size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                {t('produits.details.select_prompt')}
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <ModuleActivityLog 
              companyId={companyId!} 
              moduleName="produit" 
              title={t('produits.activity_log') || "Journal des produits"} 
            />
          </div>
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
          existingData={produits}
          moduleKey="produits"
          isDuplicate={(row, existing) => 
            String(row.reference).toLowerCase().trim() === String(existing.reference).toLowerCase().trim()
          }
          validateRow={(row) => {
            if (!row.reference || !String(row.reference).trim()) {
              return "Référence requise (ex: PRO-001)";
            }
            if (!row.designation || !String(row.designation).trim()) {
              return "Désignation requise";
            }
            if (row.prixAchat !== undefined && row.prixAchat !== '' && (isNaN(Number(row.prixAchat)) || Number(row.prixAchat) < 0)) {
              return "Prix d'achat doit être un nombre positif";
            }
            if (row.prixVente !== undefined && row.prixVente !== '' && (isNaN(Number(row.prixVente)) || Number(row.prixVente) < 0)) {
              return "Prix de vente doit être un nombre positif";
            }
            if (row.stock !== undefined && row.stock !== '' && (isNaN(Number(row.stock)) || Number(row.stock) < 0)) {
              return "Le stock de départ doit être un nombre positif";
            }
            return null;
          }}
          title="Produits & Services"
          columns={[
            { key: 'reference', label: 'Référence' },
            { key: 'designation', label: 'Désignation' },
            { key: 'prixAchat', label: 'Prix Achat', render: (val) => formatCurrency(val.prixAchat) },
            { key: 'prixVente', label: 'Prix Vente', render: (val) => formatCurrency(val.prixVente) },
            { key: 'stock', label: 'Stock Initial' },
            { key: 'alertStock', label: 'Seuil Alerte' },
            { key: 'tva', label: 'TVA %', render: (val) => `${val.tva}%` }
          ]}
        />
      )}
    </div>
  );
}
