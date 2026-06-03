import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TrendingUp, Search, Filter, Loader2, Plus, FileText, X, CheckCircle2, Trash2, Calendar, DollarSign, Banknote, CreditCard, Smartphone, Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, ArrowDownLeft, ArrowUpRight, Upload, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ExcelImportPreviewModal } from '../../components/common/ExcelImportPreviewModal';
import { downloadModuleTemplate, cleanImportedRows, parseExcelDate, isValidExcelDate } from '../../lib/templates';
import { Wallet, Payment, UserProfile, Tiers, Transaction } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { hasPermission } from '../../lib/permissions';
import { apiClient } from '../../../api/lib/api-client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
  logAction,
  User as FirebaseUser,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { ModuleActivityLog } from '../../components/common/ModuleActivityLog';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface FinanceModuleProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function FinanceModule({ user, currentUserProfile }: FinanceModuleProps) {
  const { t } = useTranslation();
  const companyId = currentUserProfile?.companyId || user.uid;
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [tiers, setTiers] = React.useState<Tiers[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddingPayment, setIsAddingPayment] = React.useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = React.useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'ALL' | 'ENCAISSEMENT' | 'DECAISSEMENT'>('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  
  // Period Filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startDate, setStartDate] = React.useState(today.toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split('T')[0]);

  const [newPayment, setNewPayment] = React.useState({
    date: new Date().toISOString().split('T')[0],
    montant: 0,
    type: 'ENCAISSEMENT' as Payment['type'],
    modePaiement: 'Espèces',
    tiersId: '',
    tiersNom: '',
    description: ''
  });

  React.useEffect(() => {
    if (!companyId) return;
    const unsubscribes: (() => void)[] = [];

    // Payments (All for total balance, but we'll filter for display)
    const qPayments = query(
      collection(db, 'payments'), 
      where('ownerId', '==', companyId),
      orderBy('date', 'desc')
    );
    unsubscribes.push(onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments', user, false)));

    // Tiers
    const qTiers = query(collection(db, 'tiers'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qTiers, (snapshot) => {
      setTiers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tiers[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tiers', user, false)));

    // Transactions
    const qTrans = query(
      collection(db, 'transactions'),
      where('ownerId', '==', companyId)
    );
    unsubscribes.push(onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Transaction[]);
    }, (err) => console.warn("Failed to subscribe to transactions in Finance:", err)));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [companyId]);

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
        const data = cleanImportedRows('finance', rawJsonData);

        const parsedRows: any[] = [];
        for (const item of data) {
          const headers = Object.keys(item);
          const descKey = headers.find(h => h.toLowerCase().includes('desc') || h.toLowerCase().includes('libel') || h.toLowerCase().includes('motif') || h.toLowerCase().includes('sujet'));
          const mtKey = headers.find(h => h.toLowerCase().includes('mont') || h.toLowerCase().includes('amou') || h.toLowerCase().includes('valeur') || h.toLowerCase().includes('prix'));
          const typeKey = headers.find(h => h.toLowerCase().includes('type'));
          const modeKey = headers.find(h => h.toLowerCase().includes('mode') || h.toLowerCase().includes('pai') || h.toLowerCase().includes('pay'));
          const dateKey = headers.find(h => h.toLowerCase().includes('date'));
          const tiersKey = headers.find(h => h.toLowerCase().includes('tiers') || h.toLowerCase().includes('party') || h.toLowerCase().includes('nom') || h.toLowerCase().includes('client') || h.toLowerCase().includes('fourn'));

          const descValue = descKey ? String(item[descKey] || '').trim() : '';
          const rawMontant = mtKey ? item[mtKey] : '';

          let typeValue: 'ENCAISSEMENT' | 'DECAISSEMENT' = 'ENCAISSEMENT';
          if (typeKey) {
            const rawType = String(item[typeKey] || '').toUpperCase();
            if (rawType.includes('DEC') || rawType.includes('OUT') || rawType.includes('DEP') || rawType.includes('ACHAT')) {
              typeValue = 'DECAISSEMENT';
            }
          }

          let modeValue = modeKey ? String(item[modeKey] || '').trim() : 'Espèces';
          if (!modeValue) modeValue = 'Espèces';

          let rawDateVal = dateKey ? String(item[dateKey] || '') : '';
          let dateValue = parseExcelDate(rawDateVal);

          let rawTiersNom = tiersKey ? String(item[tiersKey] || '') : '';
          let tiersIdVal = '';
          if (rawTiersNom) {
            const foundTiers = tiers.find(t => t.nom.toLowerCase() === rawTiersNom.toLowerCase());
            if (foundTiers) {
              tiersIdVal = foundTiers.id!;
              rawTiersNom = foundTiers.nom;
            }
          }

          parsedRows.push({
            description: descValue,
            montant: isNaN(Number(rawMontant)) ? rawMontant : Number(rawMontant || 0),
            type: typeValue,
            modePaiement: modeValue,
            date: dateValue,
            rawDateText: rawDateVal,
            tiersId: tiersIdVal,
            tiersNom: rawTiersNom
          });
        }

        if (parsedRows.length > 0) {
          setExcelPreviewData(parsedRows);
          setIsPreviewOpen(true);
        } else {
          toast.info("Aucun mouvement de trésorerie valide n'a été détecté.");
        }
      } catch (err) {
        console.error("Finance Excel import error:", err);
        toast.error("Échec lors de l'import : Vérifiez votre fichier excel.");
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
        await addDoc(collection(db, 'payments'), {
          description: item.description,
          montant: item.montant,
          type: item.type,
          modePaiement: item.modePaiement,
          date: item.date,
          tiersId: item.tiersId,
          tiersNom: item.tiersNom,
          ownerId: companyId,
          createdAt: Date.now()
        });
        count++;
      }

      await logAction(
        companyId,
        user.uid,
        currentUserProfile.displayName,
        "Mouvements trésorerie importés",
        `${count} mouvements enregistrés via assistant de prévisualisation (Excel)`
      );

      toast.success(`${count} mouvements de trésorerie importés avec succès !`);
    } catch (err) {
      console.error("Failed to commit final treasury import:", err);
      toast.error("Échec lors de la validation finale de l'importation de trésorerie.");
      throw err;
    }
  };

  const [isWaveLoading, setIsWaveLoading] = React.useState(false);

  const handleWavePayment = async () => {
    if (newPayment.montant <= 0) {
      alert(t('finance.form.amount_invalid')); // Should probably add this
      return;
    }
    
    setIsWaveLoading(true);
    try {
      const clientReference = `PAY-WAVE-${Date.now()}`;
      const res = await apiClient.post('/api/wave/checkout', {
        amount: newPayment.montant,
        currency: 'XOF',
        description: newPayment.description || 'Paiement via KONTROL',
        clientReference
      });
      
      if (res.checkout_url) {
        // Rediriger le client vers Wave
        window.location.href = res.checkout_url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (error: any) {
      console.error("[WAVE UI ERROR]", error);
      alert(`Erreur lors de l'initiation Wave: ${error.message}`);
    } finally {
      setIsWaveLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission(currentUserProfile?.role, 'FINANCE_CREATE')) {
      alert(t('common.no_permission'));
      return;
    }
    if (newPayment.montant <= 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'payments'), {
        ...newPayment,
        date: new Date(newPayment.date).getTime(),
        ownerId: companyId,
        createdAt: Date.now()
      });

      if (currentUserProfile) {
        await logAction(
          companyId, 
          user.uid, 
          currentUserProfile.displayName, 
          newPayment.type === 'ENCAISSEMENT' ? "Mouvement: Encaissement" : "Mouvement: Décaissement",
          `Montant: ${formatCurrency(newPayment.montant)}`
        );
      }

      setIsAddingPayment(false);
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        montant: 0,
        type: 'ENCAISSEMENT',
        modePaiement: 'Espèces',
        tiersId: '',
        tiersNom: '',
        description: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments', user, false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!isDeletingPayment) return;
    if (!hasPermission(currentUserProfile?.role, 'FINANCE_DELETE')) {
      alert(t('common.no_permission'));
      return;
    }
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'payments', isDeletingPayment.id));
      
      if (currentUserProfile) {
        await logAction(
          companyId,
          user.uid,
          currentUserProfile.displayName,
          "Mouvement: Supprimé",
          `Montant: ${formatCurrency(isDeletingPayment.montant)} (${isDeletingPayment.type})`
        );
      }
      setIsDeletingPayment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'payments', user, false);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = payments.reduce((acc, p) => {
    return acc + (p.type === 'ENCAISSEMENT' ? p.montant : -p.montant);
  }, 0);

  const spendingTrendData = React.useMemo(() => {
    const monthsData: { name: string; Dépenses: number; monthVal: number; yearVal: number }[] = [];
    const now = new Date();
    
    // Generate last 6 months in chronological order (oldest first)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      monthsData.push({
        name: label,
        Dépenses: 0,
        monthVal: d.getMonth(),
        yearVal: d.getFullYear()
      });
    }

    // Accumulate cash outflows (payments with type 'DECAISSEMENT')
    payments.forEach(p => {
      if (p.type === 'DECAISSEMENT') {
        const pDate = new Date(p.date);
        const pMonth = pDate.getMonth();
        const pYear = pDate.getFullYear();
        
        const match = monthsData.find(m => m.monthVal === pMonth && m.yearVal === pYear);
        if (match) {
          match.Dépenses += p.montant;
        }
      }
    });

    return monthsData.map(({ name, Dépenses }) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), Dépenses }));
  }, [payments]);

  const startTs = new Date(startDate).setHours(0, 0, 0, 0);
  const endTs = new Date(endDate).setHours(23, 59, 59, 999);

  const periodPayments = payments.filter(p => p.date >= startTs && p.date <= endTs);

  const filteredPayments = periodPayments.filter(p => {
    const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.tiersNom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = [t('finance.table.date'), t('common.description'), t('finance.table.party'), t('finance.table.method'), t('common.type'), t('finance.table.amount')];
    const data = filteredPayments.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.description,
      p.tiersNom || '—',
      p.modePaiement,
      p.type,
      formatCurrency(p.montant)
    ]);
    exportToPDF(`${t('finance.history_title')} - KONTROL`, headers, data, 'Tresorerie_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredPayments.map(p => ({
      [t('finance.table.date')]: new Date(p.date).toLocaleDateString(),
      [t('common.description')]: p.description,
      [t('finance.table.party')]: p.tiersNom || '—',
      [t('finance.table.method')]: p.modePaiement,
      [t('common.type')]: p.type,
      [t('finance.table.amount')]: p.montant
    }));
    exportToExcel(data, 'Tresorerie_KONTROL');
  };

  const handleCashFlowReport = async () => {
    try {
      const { generateCashFlowPDF } = await import('../../lib/cashflow');
      generateCashFlowPDF(transactions, { start: startDate, end: endDate }, currentUserProfile);
    } catch (error) {
      console.error("PDF Error:", error);
      alert(t('common.error_occurred'));
    }
  };

  const handleGenerateCertificate = async () => {
    if (!bridgeResult) return;
    try {
      const module = await import('jspdf');
      const jsPDF = module.default;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Draw elegant border & background
        doc.setFillColor(248, 250, 252); // light background slate-50
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Main outer frame
        doc.setDrawColor(15, 23, 42); // slate-900
        doc.setLineWidth(1.5);
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

        // Nested fancy frame
        doc.setDrawColor(37, 99, 235); // blue-600
        doc.setLineWidth(0.4);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

        // Header Background block
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(15, 15, pageWidth - 30, 45, 'F');

        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text('KONTROL', pageWidth / 2, 32, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(156, 163, 175); // light gray
        doc.text('SERVICES DE CERTIFICATION DE TRÉSORERIE & FINANCEMENT', pageWidth / 2, 38, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68); // Red accent for "CERTIFICATE"
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICAT ÉVOLUTIF D\'ÉLIGIBILITÉ AU FINANCEMENT', pageWidth / 2, 48, { align: 'center' });

        // Certificate Body
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        let y = 80;
        doc.text('Le présent certificat atteste officiellement que l\'entreprise désignée ci-dessous :', 30, y);
        
        y += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(currentUserProfile?.companyName || 'KONTROL CLIENT', pageWidth / 2, y, { align: 'center' });

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Identifiant d'entité : ${currentUserProfile?.companyId || 'N/A'}`, pageWidth / 2, y, { align: 'center' });

        y += 15;
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const text1 = 'A fait l\'objet d\'un audit prévisionnel automatisé en date de ce jour, basé sur l\'analyse';
        const text2 = 'systématique de ses flux réels de trésorerie, de ses actifs circulants et des encaissements';
        const text3 = 'enregistrés en continu sur sa plateforme de gestion KONTROL.';
        doc.text(text1, 22, y);
        y += 6;
        doc.text(text2, 22, y);
        y += 6;
        doc.text(text3, 22, y);

        y += 18;
        // Eligibility Card Background
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(20, y, pageWidth - 40, 50, 'F');
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.rect(20, y, pageWidth - 40, 50);

        // Inside Card Info
        y += 12;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('MONTANT ACTUEL EFFORTABLE GARANTI (BRIDGE OFFER) :', pageWidth / 2, y, { align: 'center' });

        y += 12;
        doc.setTextColor(37, 99, 235); // blue-600
        doc.setFontSize(28);
        doc.text(formatCurrency(bridgeResult.amount_eligible), pageWidth / 2, y, { align: 'center' });

        y += 12;
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Taux de Garantie Préférentiel KONTROL : 3.5% ANNUEL', pageWidth / 2, y, { align: 'center' });

        y += 20;
        doc.setTextColor(100);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Ce titre constitue une attestation d\'éligibilité certifiée émise par KONTROL.', 30, y);
        y += 5;
        doc.text('Elle permet d\'accélérer les démarches d\'octroi de découverts interbancaires ou de cautionnements.', 30, y);

        // Signatures block
        y += 22;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('Direction des Risques', 35, y);
        doc.text('Contrôle de Gestion KONTROL', pageWidth - 85, y);

        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120);
        doc.text('Dépôt et Validation Directe', 35, y);
        doc.text('Comité de Crédit & Algorithmes Blue AI', pageWidth - 85, y);

        // Watermark / Seal shape
        y += 15;
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1);
        doc.circle(pageWidth - 45, y + 10, 15);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('KONTROL', pageWidth - 45, y + 8, { align: 'center' });
        doc.text('SCELLÉ OFFICIEL', pageWidth - 45, y + 13, { align: 'center' });

        // Footer Metadata
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const randHash = Math.random().toString(36).substring(2, 10).toUpperCase();
        doc.text(`Identifiant Certificat: KT-${Date.now().toString().slice(-6)}-${randHash} • Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 15, pageHeight - 15);
        doc.text('Propulsé par BLUE AI & KONTROL Core Server • Document Certifié ISO-9001', 15, pageHeight - 11);

        doc.save(`Certificat_Eligibilite_${currentUserProfile?.companyName || 'Client'}.pdf`);
        setBridgeResult(null);
    } catch (e) {
      console.error("Certificate Generation Error:", e);
      alert("Erreur lors de la génération du certificat.");
    }
  };

  const [bridgeResult, setBridgeResult] = React.useState<any>(null);
  const [isCalculatingBridge, setIsCalculatingBridge] = React.useState(false);

  const checkBridgeEligibility = async () => {
    if (!hasPermission(currentUserProfile?.role, 'FINANCE_READ')) return;
    setIsCalculatingBridge(true);
    try {
      const totalInvoices = payments.filter(p => p.type === 'ENCAISSEMENT').reduce((acc, p) => acc + p.montant, 0) * 0.4;
      const res = await apiClient.post('/api/enterprise/treasury/bridge-calc', {
        cash: totalBalance, 
        invoices: totalInvoices 
      });
      setBridgeResult(res);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'bridge_calc', user, false);
    } finally {
      setIsCalculatingBridge(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('finance.title')}</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('finance.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={checkBridgeEligibility}
            disabled={isCalculatingBridge}
            className="btn-outline border-kontrol-blue text-kontrol-blue text-xs py-1.5 px-4 flex items-center gap-2 hover:bg-kontrol-blue hover:text-white transition-all"
          >
            {isCalculatingBridge ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} 
            {t('finance.calculate_bridge')}
          </button>
          {hasPermission(currentUserProfile?.role, 'FINANCE_EXPORT') && (
            <button 
              onClick={handleCashFlowReport}
              className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold"
            >
              <FileText size={14} /> {t('transactions.cash_flow_report')}
            </button>
          )}
          {hasPermission(currentUserProfile?.role, 'FINANCE_CREATE') && (
            <button 
              onClick={() => setIsAddingPayment(true)}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
            >
              <Plus size={14} /> {t('finance.new_movement')}
            </button>
          )}
        </div>
      </div>

      {/* Bridge Result Banner */}
      {bridgeResult && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
          <div className="bg-kontrol-blue/5 border border-kontrol-blue/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <CreditCard className="text-kontrol-blue" size={24} />
              </div>
              <div>
                <h4 className="text-[13px] font-black text-kontrol-dark uppercase tracking-tight">{t('finance.bridge_offer')}</h4>
                <p className="text-[11px] text-kontrol-ink-muted font-bold">{t('finance.bridge_calc_info', { amount: formatCurrency(bridgeResult.amount_eligible) })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-emerald-600 uppercase">{t('finance.preferential_rate')}</p>
                <p className="text-lg font-black text-kontrol-dark">3.5% <span className="text-[10px] text-kontrol-ink-muted">{t('finance.annual')}</span></p>
              </div>
              <button className="btn-primary text-[10px] px-4 py-2 uppercase font-black" onClick={handleGenerateCertificate}>{t('finance.unlock_funds')}</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 bg-kontrol-dark text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <WalletIcon size={80} />
          </div>
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">{t('finance.total_cash')}</p>
          <h3 className="text-3xl font-extrabold text-kontrol-blue">{formatCurrency(totalBalance)}</h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/60">
            <TrendingUp size={14} className="text-emerald-400" />
            <span>{t('finance.cash_status')}</span>
          </div>
        </div>

        <div className="card p-6 bg-white border border-kontrol-border">
          <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('finance.inflow_period')}</p>
          <h3 className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(periodPayments.filter(p => p.type === 'ENCAISSEMENT').reduce((acc, p) => acc + p.montant, 0))}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-600/70">
            <ArrowUpCircle size={14} />
            <span>{t('finance.inflow_total')}</span>
          </div>
        </div>

        <div className="card p-6 bg-white border border-kontrol-border">
          <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">{t('finance.outflow_period')}</p>
          <h3 className="text-2xl font-extrabold text-rose-600">
            {formatCurrency(periodPayments.filter(p => p.type === 'DECAISSEMENT').reduce((acc, p) => acc + p.montant, 0))}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-rose-600/70">
            <ArrowDownCircle size={14} />
            <span>{t('finance.outflow_total')}</span>
          </div>
        </div>
      </div>

      {/* Real-time Spending Trend Chart */}
      <div className="card p-5 bg-white border border-kontrol-border space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-[12px] font-extrabold text-kontrol-dark uppercase tracking-widest">{t('finance.spending_trend_title') || "Évolution des Décaissements / Dépenses (6 derniers mois)"}</h3>
            <p className="text-[11px] text-kontrol-ink-muted mt-0.5">{t('finance.spending_trend_subtitle') || "Flux de sortie de trésorerie consolidés par mois"}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100/50 rounded-full px-2.5 py-0.5 shadow-2xs">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{t('finance.realtime') || "Temps Réel"}</span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDecaissement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                tickFormatter={(val) => `${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip 
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Décaissements']}
              />
              <Area 
                type="monotone" 
                dataKey="Dépenses" 
                stroke="#ef4444" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorDecaissement)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-xl p-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-kontrol-ink-muted" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="px-2 py-1 bg-kontrol-bg border border-kontrol-border rounded text-[12px] font-bold"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-kontrol-ink-muted text-[10px] font-bold uppercase">{t('common.to')}</span>
            <input 
              type="date" 
              className="px-2 py-1 bg-kontrol-bg border border-kontrol-border rounded text-[12px] font-bold"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="h-6 w-px bg-kontrol-border hidden sm:block" />

        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder={t('finance.search_placeholder')}
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select 
          className="px-3 py-1.5 bg-white border border-kontrol-border rounded-lg text-[12px] font-bold focus:outline-none focus:border-kontrol-blue"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as any);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">{t('finance.filter_all')}</option>
          <option value="ENCAISSEMENT">{t('finance.filter_in')}</option>
          <option value="DECAISSEMENT">{t('finance.filter_out')}</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-kontrol-border flex flex-wrap items-center justify-between gap-4 bg-kontrol-bg/30">
          <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('finance.history_title')}</h4>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            {hasPermission(currentUserProfile?.role, 'FINANCE_CREATE') && (
              <>
                <button 
                  onClick={() => downloadModuleTemplate('finance')} 
                  className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium text-kontrol-blue border-kontrol-blue/20 hover:bg-kontrol-blue/5"
                  title="Télécharger le modèle Excel de Trésorerie"
                >
                  <Download size={13} /> Modèle
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium"
                  title="Importer des mouvements de trésorerie depuis un fichier Excel/CSV"
                >
                  <Upload size={13} /> {t('common.import', 'Importer')}
                </button>
              </>
            )}
            <button 
              onClick={handleExportPDF} 
              className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium"
            >
              <FileText size={13} /> PDF
            </button>
            <button 
              onClick={handleExportExcel} 
              className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium"
            >
              <Table size={13} /> Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('finance.table.date')}</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('finance.table.description_party')}</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('finance.table.method')}</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">{t('finance.table.amount')}</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-kontrol-ink-muted">
                    {t('finance.no_movements')}
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment, idx) => (
                  <tr key={payment.id} className={cn("hover:bg-kontrol-bg/50 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10")}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          payment.type === 'ENCAISSEMENT' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {payment.type === 'ENCAISSEMENT' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                        </div>
                        <span className="text-kontrol-ink-muted font-medium">{new Date(payment.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-kontrol-dark">{payment.description}</p>
                      {payment.tiersNom && <p className="text-[11px] text-kontrol-ink-muted uppercase tracking-tighter">{payment.tiersNom}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-kontrol-bg border border-kontrol-border rounded text-[11px] font-bold text-kontrol-ink-soft">
                        {payment.modePaiement}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-4 text-right font-extrabold text-[14px]",
                      payment.type === 'ENCAISSEMENT' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {payment.type === 'ENCAISSEMENT' ? '+' : '-'} {formatCurrency(payment.montant)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => setIsDeletingPayment(payment)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {t('finance.total_count', { count: filteredPayments.length })}
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
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {isAddingPayment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-kontrol-dark">{t('finance.new_movement')}</h3>
              <button onClick={() => setIsAddingPayment(false)} className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-5">
              <div className="flex bg-kontrol-bg p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewPayment({...newPayment, type: 'ENCAISSEMENT'})}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest transition-all",
                    newPayment.type === 'ENCAISSEMENT' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-kontrol-ink-muted"
                  )}
                >
                  {t('finance.form.type_in')}
                </button>
                <button
                  type="button"
                  onClick={() => setNewPayment({...newPayment, type: 'DECAISSEMENT'})}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest transition-all",
                    newPayment.type === 'DECAISSEMENT' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-kontrol-ink-muted"
                  )}
                >
                  {t('finance.form.type_out')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('finance.form.date')}</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                    <input 
                      type="date"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px]"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('finance.form.amount')}</label>
                  <input 
                    type="number"
                    required
                    className="w-full px-4 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue font-extrabold text-lg"
                    value={newPayment.montant}
                    onChange={(e) => setNewPayment({...newPayment, montant: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('finance.form.method')}</label>
                <select 
                  required
                  className="w-full px-3 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px] font-medium"
                  value={newPayment.modePaiement}
                  onChange={(e) => setNewPayment({...newPayment, modePaiement: e.target.value})}
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Wave">Wave</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MTN Money">MTN Money</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('finance.form.party')}</label>
                <select 
                  className="w-full px-3 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px] font-medium"
                  value={newPayment.tiersId}
                  onChange={(e) => {
                    const t = tiers.find(x => x.id === e.target.value);
                    setNewPayment({...newPayment, tiersId: e.target.value, tiersNom: t?.nom || ''});
                  }}
                >
                  <option value="">{t('finance.form.no_party')}</option>
                  {tiers.map(t => (
                    <option key={t.id} value={t.id}>{t.nom} ({t.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{t('finance.form.description')}</label>
                <textarea 
                  required
                  rows={2}
                  placeholder={t('finance.form.description_placeholder')}
                  className="w-full px-4 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px]"
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                />
              </div>

              {newPayment.modePaiement === 'Wave' && newPayment.type === 'ENCAISSEMENT' ? (
                <button 
                  type="button" 
                  onClick={handleWavePayment}
                  disabled={isWaveLoading || loading}
                  className="w-full bg-[#1dbf73] hover:bg-[#19a563] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-lg shadow-[#1dbf73]/20 transition-all"
                >
                  {isWaveLoading ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
                  {t('finance.form.pay_wave')}
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {t('finance.form.save_movement')}
                </button>
              )}
            </form>
          </motion.div>
        </div>
      )}
      <div className="mt-6">
        <ModuleActivityLog 
          companyId={companyId!} 
          moduleName="mouvement" 
          title={t('finance.history_title')} 
        />
      </div>

      <ConfirmModal
        isOpen={!!isDeletingPayment}
        onClose={() => setIsDeletingPayment(null)}
        onConfirm={handleDeletePayment}
        title={t('finance.delete_movement')}
        message={t('finance.delete_movement_confirm', { amount: isDeletingPayment?.montant ? formatCurrency(isDeletingPayment.montant) : '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      {excelPreviewData && (
        <ExcelImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setExcelPreviewData(null);
          }}
          onConfirm={handleConfirmImport}
          rawData={excelPreviewData}
          existingData={payments}
          moduleKey="finance"
          isDuplicate={(row, existing) => 
            String(row.description).toLowerCase().trim() === String(existing.description).toLowerCase().trim() &&
            Number(row.montant) === Number(existing.montant) &&
            String(row.type) === String(existing.type)
          }
          validateRow={(row) => {
            if (!row.description || !String(row.description).trim()) {
              return "Motif/Description requis";
            }
            if (row.montant === undefined || row.montant === '' || isNaN(Number(row.montant)) || Number(row.montant) <= 0) {
              return "Montant invalide (doit être > 0)";
            }
            if (!row.type || (row.type !== 'ENCAISSEMENT' && row.type !== 'DECAISSEMENT')) {
              return "Type requis (ENCAISSEMENT / DECAISSEMENT)";
            }
            if (row.rawDateText && !isValidExcelDate(row.rawDateText)) {
              return "Format de date invalide (attendu: JJ/MM/AAAA ou AAAA-MM-JJ)";
            }
            return null;
          }}
          title="Mouvements de Trésorerie"
          columns={[
            { key: 'description', label: 'Description/Motif' },
            { key: 'tiersNom', label: 'Tiers' },
            { key: 'type', label: 'Type' },
            { key: 'montant', label: 'Montant', render: (val) => formatCurrency(val.montant) },
            { key: 'modePaiement', label: 'Mode' },
            { key: 'date', label: 'Date d\'exécution', render: (val) => new Date(val.date).toLocaleDateString() }
          ]}
        />
      )}
    </div>
  );
}
