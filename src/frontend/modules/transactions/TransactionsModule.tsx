import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Plus, 
  History, 
  Loader2, 
  X, 
  Calendar, 
  User, 
  CreditCard, 
  FileText,
  Trash2,
  CheckCircle2,
  Package,
  Printer,
  Receipt,
  Download,
  Edit2,
  Table,
  QrCode,
  Upload
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ExcelImportPreviewModal, ColumnConfig } from '../../components/common/ExcelImportPreviewModal';
import { downloadModuleTemplate, cleanImportedRows } from '../../lib/templates';
import { QRCodeSVG } from 'qrcode.react';
import { Transaction, Tiers, Produit, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { hasPermission } from '../../lib/permissions';
import { logAction, handleFirestoreError, OperationType, serverTimestamp } from '../../../api/firebase';
import { generateInvoicePDF, generateReceiptPDF } from '../../lib/invoice';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CompanySelector } from '../../components/common/CompanySelector';
import { motion, AnimatePresence } from 'motion/react';
import { transactionService } from '../../../api/services/transactionService';
import { tiersService } from '../../../api/services/tiersService';
import { productService } from '../../../api/services/productService';
import { sendNotification } from '../../../api/services/notificationService';
import { User as FirebaseUser } from 'firebase/auth';
import { where, orderBy } from 'firebase/firestore';

import { ModuleActivityLog } from '../../components/common/ModuleActivityLog';

interface TransactionsModuleProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function TransactionsModule({ user, currentUserProfile }: TransactionsModuleProps) {
  const { t } = useTranslation();
  const isERPAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP';
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(currentUserProfile?.companyId || null);
  
  const companyId = isERPAdmin 
    ? (selectedCompanyId || currentUserProfile?.companyId || user.uid) 
    : (currentUserProfile?.companyId || user.uid);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [tiers, setTiers] = React.useState<Tiers[]>([]);
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'ALL' | 'VENTE' | 'ACHAT'>('ALL');
  const [filterStatut, setFilterStatut] = React.useState<'ALL' | 'PAYE' | 'ATTENTE' | 'ANNULE'>('ALL');
  const [dateRange, setDateRange] = React.useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const handleDeleteTransaction = async () => {
    if (!selectedTrans || !selectedId) return;
    if (!hasPermission(currentUserProfile?.role, 'TRANSACTION_DELETE')) {
      alert(t('common.no_permission'));
      return;
    }
    setLoading(true);
    try {
      await transactionService.deleteTransaction(selectedId, user, currentUserProfile);
      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${selectedId}`, user, false);
    } finally {
      setLoading(false);
    }
  };

  const [excelPreviewData, setExcelPreviewData] = React.useState<any[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId || !currentUserProfile) return;

    if (!hasPermission(currentUserProfile.role, 'TRANSACTION_CREATE')) {
      toast.error(t('common.no_permission'));
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJsonData = XLSX.utils.sheet_to_json(ws) as any[];

        // Filtrer automatiquement les explications et exemples
        const data = cleanImportedRows('transactions', rawJsonData);

        const parsedRows: any[] = [];

        for (const item of data) {
          const headers = Object.keys(item);
          
          const refKey = headers.find(h => h.toLowerCase().includes('ref') || h.toLowerCase().includes('facture') || h.toLowerCase().includes('num'));
          const dateKey = headers.find(h => h.toLowerCase().includes('date'));
          const tiersKey = headers.find(h => h.toLowerCase().includes('tiers') || h.toLowerCase().includes('client') || h.toLowerCase().includes('fourn') || h.toLowerCase().includes('nom') || h.toLowerCase().includes('contact') || h.toLowerCase().includes('party'));
          const typeKey = headers.find(h => h.toLowerCase().includes('type'));
          const mtKey = headers.find(h => h.toLowerCase().includes('mont') || h.toLowerCase().includes('amou') || h.toLowerCase().includes('total') || h.toLowerCase().includes('valeur'));
          const statusKey = headers.find(h => h.toLowerCase().includes('statut') || h.toLowerCase().includes('status') || h.toLowerCase().includes('état') || h.toLowerCase().includes('etat'));
          const modeKey = headers.find(h => h.toLowerCase().includes('mode') || h.toLowerCase().includes('pai') || h.toLowerCase().includes('pay'));

          const amountValRaw = mtKey ? item[mtKey] : '';
          
          const rawRef = refKey ? String(item[refKey] || '') : `TX-${Date.now().toString().slice(-6)}`;
          
          let typeVal: 'VENTE' | 'ACHAT' = 'VENTE';
          if (typeKey) {
            const rawType = String(item[typeKey]).toUpperCase();
            if (rawType.includes('ACHAT') || rawType.includes('PURCHASE') || rawType.includes('DEP')) {
              typeVal = 'ACHAT';
            }
          }

          let statusVal: 'PAYE' | 'ATTENTE' | 'ANNULE' = 'PAYE';
          if (statusKey) {
            const rawStat = String(item[statusKey]).toUpperCase();
            if (rawStat.includes('ATTENTE') || rawStat.includes('PENDING') || rawStat.includes('WAIT')) {
              statusVal = 'ATTENTE';
            } else if (rawStat.includes('ANNULE') || rawStat.includes('CANCEL')) {
              statusVal = 'ANNULE';
            }
          }

          let modeVal = modeKey ? String(item[modeKey] || '') : 'Espèces';
          if (!modeVal) modeVal = 'Espèces';

          let dateVal = Date.now();
          let rawDateVal = dateKey ? String(item[dateKey] || '') : '';
          if (rawDateVal) {
            const parsedDate = Date.parse(rawDateVal);
            if (!isNaN(parsedDate)) {
              dateVal = parsedDate;
            } else {
              // Try Microsoft serial date check
              if (!isNaN(Number(rawDateVal))) {
                const serial = Number(rawDateVal);
                const utc_days = Math.floor(serial - 25569);
                dateVal = utc_days * 86400 * 1000;
              }
            }
          }

          const rawTiersNom = tiersKey ? String(item[tiersKey] || '') : 'Client Général';
          let tiersIdVal = '';
          const foundTiers = tiers.find(t => t.nom.toLowerCase() === rawTiersNom.toLowerCase());
          if (foundTiers) {
            tiersIdVal = foundTiers.id!;
          }

          parsedRows.push({
            reference: rawRef,
            date: dateVal,
            rawDateText: rawDateVal,
            tiersId: tiersIdVal,
            tiersNom: rawTiersNom,
            montant: isNaN(Number(amountValRaw)) ? amountValRaw : Number(amountValRaw || 0),
            montantTotal: isNaN(Number(amountValRaw)) ? amountValRaw : Number(amountValRaw || 0),
            statut: statusVal,
            modePaiement: modeVal,
            type: typeVal
          });
        }

        if (parsedRows.length > 0) {
          setExcelPreviewData(parsedRows);
          setIsPreviewOpen(true);
        } else {
          toast.info("Aucune transaction valide n'a été détectée dans l'Excel.");
        }
      } catch (err) {
        console.error("Transactions Excel import error:", err);
        toast.error("Échec lors de l'import des transactions.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async (finalData: any[]) => {
    try {
      let count = 0;
      for (const item of finalData) {
        await transactionService.createTransaction({
          id: '',
          reference: item.reference,
          date: item.date,
          type: item.type,
          tiersId: item.tiersId,
          tiersNom: item.tiersNom,
          montant: item.montant,
          montantTotal: item.montantTotal,
          statut: item.statut,
          status: item.statut === 'PAYE' ? 'COMPLETED' : item.statut === 'ATTENTE' ? 'PENDING' : 'CANCELLED',
          modePaiement: item.modePaiement,
          paymentMethod: item.modePaiement,
          description: 'Importation depuis Excel',
          devise: 'XOF',
          tauxChange: 1,
          montantDevise: item.montant,
          invoiceFileUrl: '',
          ownerId: companyId,
          articles: [{
            produitId: 'GENERIC',
            designation: 'Mouvement importé',
            quantite: 1,
            prixUnitaire: item.montant,
            total: item.montant
          }],
          createdAt: Date.now()
        }, user, currentUserProfile);
        count++;
      }

      await logAction(
        companyId,
        user.uid,
        currentUserProfile.displayName,
        "Transactions importées via Excel",
        `${count} transactions enregistrées via assistant de prévisualisation`
      );

      toast.success(`${count} transactions importées avec succès !`);
    } catch (err) {
      console.error("Failed to confirm transactions import:", err);
      toast.error("Échec technique lors de la validation finale de l'import.");
      throw err;
    }
  };

  // New Transaction State
  const [newTrans, setNewTrans] = React.useState({
    type: 'VENTE' as 'VENTE' | 'ACHAT',
    tiersId: '',
    tiersNom: '',
    modePaiement: 'Espèces',
    devise: 'XOF',
    tauxChange: 1,
    montantDevise: 0,
    invoiceFileUrl: '',
    articles: [] as { produitId: string; designation: string; quantite: number; prixUnitaire: number; total: number }[]
  });

  React.useEffect(() => {
    if (!currentUserProfile) return;
    const unsubscribes: (() => void)[] = [];

    // Transactions
    const transConstraints: any[] = [orderBy('createdAt', 'desc')];
    if (!(isERPAdmin && !selectedCompanyId)) {
      transConstraints.unshift(where('ownerId', '==', companyId));
    }
    unsubscribes.push(transactionService.subscribeToAll(setTransactions, user, transConstraints));

    // Tiers
    const tiersConstraints = [];
    if (!(isERPAdmin && !selectedCompanyId)) {
      tiersConstraints.push(where('ownerId', '==', companyId));
    }
    unsubscribes.push(tiersService.subscribeToAll(setTiers, user, tiersConstraints));

    // Produits
    const prodConstraints = [];
    if (!(isERPAdmin && !selectedCompanyId)) {
      prodConstraints.push(where('ownerId', '==', companyId));
    }
    unsubscribes.push(productService.subscribeToAll(setProduits, user, prodConstraints));

    setLoading(false);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, companyId, currentUserProfile, selectedCompanyId]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission(currentUserProfile?.role, 'TRANSACTION_CREATE')) {
      setMessage({ type: 'error', text: t('common.no_permission') });
      return;
    }
    if (!newTrans.tiersId) {
      setMessage({ type: 'error', text: t('transactions.form.select_party') });
      return;
    }
    if (newTrans.articles.length === 0) {
      setMessage({ type: 'error', text: t('common.required_fields') });
      return;
    }
    if (!companyId) {
      setMessage({ type: 'error', text: t('common.error_company_id') });
      return;
    }

    setLoading(true);
    try {
      // Stock Control Check for Sales
      if (newTrans.type === 'VENTE') {
        for (const art of newTrans.articles) {
          const prod = produits.find(p => p.id === art.produitId);
          if (prod && prod.stock < art.quantite) {
            setMessage({ 
              type: 'error', 
              text: `Stock insuffisant : ${art.designation} (${prod.stock} disponibles)` 
            });
            setLoading(false);
            return;
          }
        }
      }

      const montantTotal = newTrans.articles.reduce((acc, art) => acc + art.total, 0);
      const transData: Transaction = {
        ...newTrans,
        reference: `TR-${Date.now().toString().slice(-6)}`,
        date: Date.now(),
        montantTotal,
        statut: 'PAYE',
        tauxChange: newTrans.devise === 'XOF' ? 1 : newTrans.tauxChange,
        montantDevise: newTrans.devise === 'XOF' ? montantTotal : (montantTotal / newTrans.tauxChange),
        ownerId: companyId,
        createdAt: serverTimestamp()
      } as any;

      await transactionService.createTransaction(transData, user, currentUserProfile);

      // Notification
      await sendNotification({
        companyId: companyId,
        title: newTrans.type === 'VENTE' ? "🎯 Vente Réalisée" : "🛍️ Achat Effectué",
        message: `${newTrans.type === 'VENTE' ? 'Bravo ! Une nouvelle vente' : 'Un nouvel achat'} de ${formatCurrency(montantTotal)} vient d'être enregistré (Réf: ${transData.reference}).`,
        type: 'info'
      });
      
      setMessage({ type: 'success', text: t('produits.save_success') });
      setTimeout(() => {
        setIsAdding(false);
        setMessage(null);
        setNewTrans({ 
          type: 'VENTE', 
          tiersId: '', 
          tiersNom: '', 
          modePaiement: 'Espèces', 
          devise: 'XOF', 
          tauxChange: 1,
          montantDevise: 0,
          invoiceFileUrl: '', 
          articles: [] 
        });
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions', user, false);
      setMessage({ type: 'error', text: t('common.error_occurred') });
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTrans(prev => ({ ...prev, invoiceFileUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addArticle = (produitId: string) => {
    const prod = produits.find(p => p.id === produitId);
    if (!prod) return;

    const existing = newTrans.articles.find(a => a.produitId === produitId);
    if (existing) {
      setNewTrans({
        ...newTrans,
        articles: newTrans.articles.map(a => 
          a.produitId === produitId 
            ? { ...a, quantite: a.quantite + 1, total: (a.quantite + 1) * a.prixUnitaire } 
            : a
        )
      });
    } else {
      setNewTrans({
        ...newTrans,
        articles: [...newTrans.articles, {
          produitId: prod.id,
          designation: prod.designation,
          quantite: 1,
          prixUnitaire: newTrans.type === 'VENTE' ? prod.prixVente : prod.prixAchat,
          total: newTrans.type === 'VENTE' ? prod.prixVente : prod.prixAchat
        }]
      });
    }
  };

  const removeArticle = (idx: number) => {
    setNewTrans({
      ...newTrans,
      articles: newTrans.articles.filter((_, i) => i !== idx)
    });
  };

  const selectedTrans = transactions.find(t => t.id === selectedId);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.tiersNom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesStatut = filterStatut === 'ALL' || t.statut === filterStatut;
    
    const tDate = new Date(t.date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const matchesDate = t.date >= startDate.getTime() && t.date <= endDate.getTime();
    
    return matchesSearch && matchesType && matchesStatut && matchesDate;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = [t('common.ref'), t('common.date'), t('finance.table.party'), t('common.type'), t('finance.table.amount'), t('common.status_label')];
    const data = filteredTransactions.map(tx => [
      tx.reference,
      new Date(tx.date).toLocaleDateString(),
      tx.tiersNom,
      tx.type,
      formatCurrency(tx.montantTotal),
      tx.statut
    ]);
    exportToPDF(`${t('transactions.title')} - KONTROL`, headers, data, 'Transactions_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredTransactions.map(tx => ({
      [t('common.ref')]: tx.reference,
      [t('common.date')]: new Date(tx.date).toLocaleDateString(),
      [t('finance.table.party')]: tx.tiersNom,
      [t('common.type')]: tx.type,
      [t('finance.table.amount')]: tx.montantTotal,
      [t('common.status_label')]: tx.statut
    }));
    exportToExcel(data, 'Transactions_KONTROL');
  };

  const handleUpdateTransaction = async (updates: Partial<Transaction>) => {
    if (!selectedId || !user) return;
    if (!hasPermission(currentUserProfile?.role, 'TRANSACTION_UPDATE')) {
      alert(t('common.no_permission'));
      return;
    }
    try {
      setLoading(true);
      await transactionService.updateTransaction(selectedId, updates, user, currentUserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${selectedId}`, user, false);
    } finally {
      setLoading(false);
    }
  };

  const [showQR, setShowQR] = React.useState(false);
  const [qrData, setQrData] = React.useState({ type: '', amount: 0, phone: '' });

  const generatePaymentQR = (type: string, amount: number) => {
    // These numbers would be provided by the user later, using placeholders for now
    const numbers: Record<string, string> = {
      'WAVE': '770000000',
      'OM': '771111111',
      'MTN': '772222222'
    };
    setQrData({ type, amount, phone: numbers[type] || '' });
    setShowQR(true);
  };

  const handleCashFlowReport = async () => {
    try {
      const { generateCashFlowPDF } = await import('../../lib/cashflow');
      generateCashFlowPDF(filteredTransactions, dateRange, currentUserProfile);
    } catch (error) {
      console.error("PDF Error:", error);
      alert(t('common.error_occurred'));
    }
  };

  return (
    <div className="space-y-4">
      {isAdding && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between shrink-0">
              <h3 className="text-lg font-extrabold text-kontrol-dark">{t('transactions.new_transaction')}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {message && (
                <div className={cn(
                  "p-3 rounded-lg text-[13px] font-bold text-center animate-in fade-in slide-in-from-top-2",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                )}>
                  {message.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('common.type')}</label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={newTrans.type}
                    onChange={(e) => setNewTrans({...newTrans, type: e.target.value as any, articles: []})}
                  >
                    <option value="VENTE">{t('transactions.form.type_sale')}</option>
                    <option value="ACHAT">{t('transactions.form.type_purchase')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('transactions.form.party')}</label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={newTrans.tiersId}
                    onChange={(e) => {
                      const t = tiers.find(x => x.id === e.target.value);
                      setNewTrans({...newTrans, tiersId: e.target.value, tiersNom: t?.nom || ''});
                    }}
                  >
                    <option value="">{t('transactions.form.select_party')}</option>
                    {tiers.filter(t => newTrans.type === 'VENTE' ? t.type === 'CLIENT' : t.type === 'FOURNISSEUR').length === 0 ? (
                      <option value="" disabled>{t('transactions.form.no_party_found', { type: newTrans.type === 'VENTE' ? t('tiers.form.type_client') : t('tiers.form.type_vendor') })}</option>
                    ) : (
                      tiers.filter(t => newTrans.type === 'VENTE' ? t.type === 'CLIENT' : t.type === 'FOURNISSEUR').map(t => (
                        <option key={t.id} value={t.id}>{t.nom}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('transactions.form.devise')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                      value={newTrans.devise}
                      onChange={(e) => setNewTrans({...newTrans, devise: e.target.value})}
                    >
                      <option value="XOF">XOF</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                    {newTrans.devise !== 'XOF' && (
                      <input 
                        type="number"
                        placeholder={t('transactions.form.rate')}
                        className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                        value={newTrans.tauxChange}
                        onChange={(e) => setNewTrans({...newTrans, tauxChange: Number(e.target.value)})}
                      />
                    )}
                  </div>
                </div>
              </div>

              {newTrans.type === 'ACHAT' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('transactions.form.invoice_file')}</label>
                  <div className="flex items-center gap-4 p-4 bg-kontrol-bg/50 rounded-xl border border-dashed border-kontrol-border group hover:border-kontrol-blue transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-white border border-kontrol-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:shadow-md transition-all">
                      {newTrans.invoiceFileUrl ? (
                        <FileText size={24} className="text-kontrol-blue" />
                      ) : (
                        <Upload size={24} className="text-kontrol-ink-muted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <span className="inline-block px-4 py-2 bg-white border border-kontrol-border rounded-lg text-[12px] font-bold text-kontrol-dark hover:bg-kontrol-bg transition-colors shadow-sm">
                          {newTrans.invoiceFileUrl ? t('transactions.form.change_file') : t('transactions.form.import_invoice')}
                        </span>
                        <input 
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={handleInvoiceUpload}
                        />
                      </label>
                      <p className="text-[10px] text-kontrol-ink-muted mt-1">{t('transactions.form.file_hint')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">{t('transactions.articles')}</h4>
                  <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                    <select 
                      className="w-full pl-9 pr-3 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-lg text-[12px] focus:outline-none focus:border-kontrol-blue"
                      onChange={(e) => {
                        if (e.target.value) {
                          addArticle(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">{t('transactions.form.add_product')}</option>
                      {produits.length === 0 ? (
                        <option value="" disabled>{t('transactions.form.no_products_found')}</option>
                      ) : (
                        produits.map(p => (
                          <option key={p.id} value={p.id}>{p.designation} ({p.stock} {t('common.in_stock')})</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="border border-kontrol-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-kontrol-bg border-b border-kontrol-border">
                      <tr>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted">{t('produits.table.designation')}</th>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted text-center">{t('common.quantity')}</th>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted text-right">{t('common.unit_price')}</th>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted text-right">Total</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kontrol-border">
                      {newTrans.articles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-kontrol-ink-muted">
                            {t('common.no_movements')}
                          </td>
                        </tr>
                      ) : (
                        newTrans.articles.map((art, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 font-bold text-kontrol-dark">{art.designation}</td>
                            <td className="px-4 py-2 text-center">
                              <input 
                                type="number"
                                className="w-16 px-2 py-1 border border-kontrol-border rounded text-center focus:border-kontrol-blue outline-none"
                                value={art.quantite || ''}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const q = val === '' ? 0 : Number(val);
                                  setNewTrans({
                                    ...newTrans,
                                    articles: newTrans.articles.map((a, i) => 
                                      i === idx ? { ...a, quantite: q, total: q * a.prixUnitaire } : a
                                    )
                                  });
                                }}
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input 
                                type="number"
                                readOnly
                                className="w-24 px-2 py-1 bg-kontrol-bg border border-kontrol-border rounded text-right text-kontrol-ink-muted cursor-not-allowed"
                                value={art.prixUnitaire || ''}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-bold">{formatCurrency(art.total)}</td>
                            <td className="px-4 py-2 text-center">
                              <button onClick={() => removeArticle(idx)} className="text-rose-500 hover:text-rose-700">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {newTrans.articles.length > 0 && (
                      <tfoot className="bg-kontrol-bg/50 font-extrabold">
                        {newTrans.devise !== 'XOF' && (
                          <tr>
                            <td colSpan={3} className="px-4 py-1 text-right uppercase tracking-wider text-[9px] text-kontrol-ink-muted">{t('transactions.total_in', { devise: newTrans.devise })}</td>
                            <td className="px-4 py-1 text-right text-kontrol-blue text-[12px]">
                              {((newTrans.articles.reduce((acc, a) => acc + a.total, 0)) / (newTrans.tauxChange || 1)).toFixed(2)} {newTrans.devise}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-[10px] text-kontrol-ink-muted">{t('transactions.total_xof')}</td>
                          <td className="px-4 py-3 text-right text-kontrol-dark text-[14px]">
                            {formatCurrency(newTrans.articles.reduce((acc, a) => acc + a.total, 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-kontrol-border bg-kontrol-bg/30 shrink-0">
              <button 
                onClick={handleAddTransaction}
                disabled={loading || !newTrans.tiersId || newTrans.articles.length === 0}
                className="w-full btn-primary py-3 font-bold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteTransaction}
        title={t('transactions.delete_transaction')}
        message={t('transactions.delete_transaction_confirm', { ref: selectedTrans?.reference })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('transactions.title')}</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('transactions.subtitle')}</p>
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
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          {hasPermission(currentUserProfile?.role, 'TRANSACTION_CREATE') && (
            <>
              <button 
                onClick={() => downloadModuleTemplate('transactions')} 
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 text-kontrol-blue border-kontrol-blue/20 hover:bg-kontrol-blue/5"
                title="Télécharger le modèle Excel de Transactions"
              >
                <Download size={14} /> Modèle
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
                title="Importer des transactions depuis un fichier Excel/CSV"
              >
                <Upload size={14} /> {t('common.import', 'Importer')}
              </button>
            </>
          )}
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
          {hasPermission(currentUserProfile?.role, 'TRANSACTION_CREATE') && (
            <button onClick={() => setIsAdding(true)} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2">
              <Plus size={14} /> {t('transactions.new_transaction')}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder={t('transactions.search_placeholder', 'Rechercher par référence, client, produit...')}
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
          <option value="VENTE">{t('finance.filter_in')}</option>
          <option value="ACHAT">{t('finance.filter_out')}</option>
        </select>
        <select 
          className="bg-white border border-kontrol-border rounded-lg px-3 py-1.5 text-[13px] font-medium text-kontrol-ink-soft outline-none focus:border-kontrol-blue transition-colors"
          value={filterStatut}
          onChange={(e) => {
            setFilterStatut(e.target.value as any);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">{t('common.all_status') || 'All Status'}</option>
          <option value="PAYE">{t('transactions.status.paid')}</option>
          <option value="ATTENTE">{t('transactions.status.pending')}</option>
          <option value="ANNULE">{t('transactions.status.cancelled')}</option>
        </select>
        <div className="flex items-center gap-2 bg-white border border-kontrol-border rounded-lg px-3 py-1.5">
          <Calendar size={14} className="text-kontrol-ink-muted" />
          <input 
            type="date"
            className="bg-transparent border-none outline-none text-[13px] font-medium text-kontrol-ink-soft"
            value={dateRange.start}
            onChange={(e) => {
              setDateRange({...dateRange, start: e.target.value});
              setCurrentPage(1);
            }}
          />
          <span className="text-kontrol-ink-muted text-xs">{t('common.to', 'au')}</span>
          <input 
            type="date"
            className="bg-transparent border-none outline-none text-[13px] font-medium text-kontrol-ink-soft"
            value={dateRange.end}
            onChange={(e) => {
              setDateRange({...dateRange, end: e.target.value});
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
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('common.ref')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('common.date')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('finance.table.party')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">{t('finance.table.amount')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('common.status_label')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading && transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      {t('transactions.no_transactions')}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => (
                    <tr 
                      key={t.id} 
                      className={cn(
                        "hover:bg-kontrol-blue/5 cursor-pointer transition-colors even:bg-kontrol-bg/30",
                        selectedId === t.id && "bg-kontrol-blue/10"
                      )}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {t.type === 'VENTE' ? (
                            <ArrowUpRight size={14} className="text-emerald-500" />
                          ) : (
                            <ArrowDownLeft size={14} className="text-rose-500" />
                          )}
                          <span className="text-[11px] font-bold bg-kontrol-bg px-2 py-0.5 rounded text-kontrol-ink-muted">
                            {t.reference}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-kontrol-ink-muted">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold text-kontrol-dark">{t.tiersNom}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-extrabold text-kontrol-ink-soft">{formatCurrency(t.montantTotal)}</span>
                          {t.devise && t.devise !== 'XOF' && t.montantDevise && (
                            <span className="text-[10px] text-kontrol-blue font-bold">
                              {t.montantDevise.toFixed(2)} {t.devise}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider",
                          t.statut === 'PAYE' ? "bg-emerald-50 text-emerald-600" : 
                          t.statut === 'ATTENTE' ? "bg-orange-50 text-orange-600" : 
                          "bg-rose-50 text-rose-600"
                        )}>
                          {t.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {t('transactions.total_count', { count: filteredTransactions.length })}
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
          {selectedTrans ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">{t('transactions.details_title')}</h4>
                <button 
                  className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  selectedTrans.type === 'VENTE' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {selectedTrans.type === 'VENTE' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                </div>
                <h3 className="text-[15px] font-extrabold text-kontrol-dark leading-tight">{selectedTrans.tiersNom}</h3>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 uppercase tracking-wider">{selectedTrans.reference} · {selectedTrans.id.slice(0,8)}</p>
                
                <div className="bg-kontrol-dark rounded-lg p-4 mt-6 mb-6">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{t('transactions.form.amount_total_tax')}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-extrabold text-kontrol-blue">{formatCurrency(selectedTrans.montantTotal)}</p>
                    {selectedTrans.devise && selectedTrans.devise !== 'XOF' && selectedTrans.montantDevise && (
                      <p className="text-sm font-bold text-white/60">
                        {selectedTrans.montantDevise.toFixed(2)} {selectedTrans.devise}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex gap-3 text-[12.5px]">
                    <Calendar size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('transactions.issue_date')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{new Date(selectedTrans.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <User size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('transactions.party_type')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedTrans.type === 'VENTE' ? t('tiers.form.type_client') : t('tiers.form.type_vendor')}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <CreditCard size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('finance.form.method')}</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedTrans.modePaiement}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <CheckCircle2 size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">{t('transactions.payment_status')}</p>
                      <select 
                        className={cn(
                          "font-bold text-[12.5px] bg-transparent border-none outline-none focus:ring-0 p-0 cursor-pointer",
                          selectedTrans.statut === 'PAYE' ? "text-emerald-600" : 
                          selectedTrans.statut === 'ATTENTE' ? "text-amber-600" : "text-rose-600"
                        )}
                        value={selectedTrans.statut}
                        onChange={(e) => handleUpdateTransaction({ statut: e.target.value as any })}
                      >
                        <option value="PAYE" className="text-emerald-600 font-bold italic">{t('transactions.status.paid')}</option>
                        <option value="ATTENTE" className="text-amber-600 font-bold italic">{t('transactions.status.pending')}</option>
                        <option value="ANNULE" className="text-rose-600 font-bold italic">{t('transactions.status.cancelled')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {selectedTrans.modePaiement === 'Mobile Money' && (
                  <div className="mt-8 pt-4 border-t border-kontrol-border animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => generatePaymentQR('WAVE', selectedTrans.montantTotal)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all border border-blue-100"
                      >
                        WAVE
                      </button>
                      <button 
                        onClick={() => generatePaymentQR('OM', selectedTrans.montantTotal)}
                        className="p-2 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-all border border-orange-100"
                      >
                        ORANGE
                      </button>
                      <button 
                        onClick={() => generatePaymentQR('MTN', selectedTrans.montantTotal)}
                        className="p-2 bg-yellow-50 text-yellow-600 rounded-lg text-[10px] font-bold hover:bg-yellow-100 transition-all border border-yellow-100"
                      >
                        MTN
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-kontrol-border">
                  <h5 className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-3">{t('transactions.articles')} ({selectedTrans.articles.length})</h5>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedTrans.articles.map((art, idx) => (
                      <div key={idx} className={cn(
                        "flex justify-between items-center text-[12px] p-2 rounded",
                        idx % 2 === 0 ? "bg-kontrol-bg/50" : "bg-kontrol-bg/20"
                      )}>
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-bold text-kontrol-dark truncate">{art.designation}</p>
                          <p className="text-[10px] text-kontrol-ink-muted">{art.quantite} x {formatCurrency(art.prixUnitaire)}</p>
                        </div>
                        <p className="font-extrabold text-kontrol-ink-soft shrink-0">{formatCurrency(art.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-8">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => generateInvoicePDF(selectedTrans, currentUserProfile)}
                      className="flex-1 btn-outline text-[10px] py-2.5 font-bold flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                      <Printer size={14} /> {t('transactions.invoice')}
                    </button>
                    <button 
                      onClick={() => generateReceiptPDF(selectedTrans, currentUserProfile)}
                      className="flex-1 btn-outline text-[10px] py-2.5 font-bold flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                      <Receipt size={14} /> {t('transactions.receipt')}
                    </button>
                    {selectedTrans.invoiceFileUrl && (
                      <a 
                        href={selectedTrans.invoiceFileUrl}
                        download={`Facture_${selectedTrans.reference}`}
                        className="flex-1 btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                      >
                        <Download size={14} /> {t('transactions.real_invoice')}
                      </a>
                    )}
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <FileText size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                {t('transactions.select_prompt')}
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <ModuleActivityLog 
              companyId={companyId!} 
              moduleName="transaction" 
              title={t('transactions.activity_log') || "Journal des transactions"} 
            />
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-kontrol-dark">{t('transactions.pay_mobile', { type: qrData.type })}</h3>
                <button onClick={() => setShowQR(false)} className="p-1 hover:bg-kontrol-bg rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-white p-4 rounded-2xl border-2 border-kontrol-bg inline-block mb-6 shadow-sm">
                <QRCodeSVG value={`PAY:${qrData.type}:${qrData.phone}:${qrData.amount}`} size={200} />
              </div>
              <p className="text-[14px] font-bold text-kontrol-dark mb-1">{t('finance.form.amount')} : {formatCurrency(qrData.amount)}</p>
              <p className="text-[12px] text-kontrol-ink-muted">{t('transactions.scan_qr_instruction', { phone: qrData.phone })}</p>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full btn-primary mt-8 py-3"
              >
                {t('common.confirm_payment') || "I've made the payment"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {excelPreviewData && (
        <ExcelImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setExcelPreviewData(null);
          }}
          onConfirm={handleConfirmImport}
          rawData={excelPreviewData}
          existingData={transactions}
          moduleKey="transactions"
          isDuplicate={(row, existing) => 
            String(row.reference).toLowerCase().trim() === String(existing.reference).toLowerCase().trim()
          }
          validateRow={(row) => {
            if (!row.reference || !String(row.reference).trim()) {
              return "Référence requise (ex: FAC-2026-0001)";
            }
            if (row.montantTotal === undefined || row.montantTotal === '' || isNaN(Number(row.montantTotal)) || Number(row.montantTotal) <= 0) {
              return "Montant total doit être supérieur à 0";
            }
            if (row.rawDateText && isNaN(Date.parse(row.rawDateText)) && isNaN(Number(row.rawDateText))) {
              return "Format de date invalide (attendu: AAAA-MM-JJ)";
            }
            return null;
          }}
          title="Factures & Transactions Vente/Achat"
          columns={[
            { key: 'reference', label: 'Référence' },
            { key: 'tiersNom', label: 'Tiers / Contact' },
            { key: 'type', label: 'Type' },
            { key: 'montantTotal', label: 'Montant Total', render: (val) => formatCurrency(val.montantTotal) },
            { key: 'statut', label: 'Statut' },
            { key: 'modePaiement', label: 'Mode Paiement' },
            { key: 'date', label: 'Date', render: (val) => new Date(val.date).toLocaleDateString() }
          ]}
        />
      )}
    </div>
  );
}
