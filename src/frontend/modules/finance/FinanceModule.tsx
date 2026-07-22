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
  const [waveReference, setWaveReference] = React.useState('');
  const [isWavePolling, setIsWavePolling] = React.useState(false);

  // Polling automatique pour valider le paiement Wave
  React.useEffect(() => {
    if (!isWavePolling || !waveReference) return;

    let toastId = toast.loading("En attente de votre paiement Wave... Veuillez valider la transaction sur votre téléphone.", {
      description: "La plateforme détectera automatiquement la validation.",
      duration: Infinity
    });

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/wave/verify/${waveReference}`);
        const data = await response.json();
        if (response.ok && data.status === 'SUCCESS') {
          clearInterval(intervalId);
          setIsWavePolling(false);
          toast.dismiss(toastId);
          
          // Ajouter le paiement dans Firestore
          try {
            await addDoc(collection(db, 'payments'), {
              description: newPayment.description || `Paiement Wave ${waveReference}`,
              montant: Number(newPayment.montant),
              type: 'ENCAISSEMENT',
              modePaiement: 'Wave',
              date: Date.now(),
              tiersId: newPayment.tiersId || 'system',
              tiersNom: newPayment.tiersNom || 'Client Wave',
              ownerId: companyId,
              createdAt: Date.now()
            });

            // Enregistrer l'action
            await logAction(
              companyId,
              user.uid,
              currentUserProfile?.displayName,
              "Paiement Wave Réussi",
              `Paiement de ${formatCurrency(newPayment.montant)} reçu via Wave (Réf: ${waveReference})`
            );

            toast.success(`Paiement de ${formatCurrency(newPayment.montant)} reçu avec succès via Wave !`);
            
            // Fermer le formulaire et réinitialiser
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
            setWaveReference('');
          } catch (dbErr) {
            console.error("Erreur d'insertion du paiement Wave dans Firestore :", dbErr);
            toast.error("Paiement validé mais erreur lors de la mise à jour de la base de données.");
          }
        }
      } catch (err) {
        console.error("Erreur de polling Wave:", err);
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
      toast.dismiss(toastId);
    };
  }, [isWavePolling, waveReference, newPayment, companyId, user, currentUserProfile]);

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
        setWaveReference(clientReference);
        setIsWavePolling(true);
        toast.info("Redirection vers Wave en cours... Veuillez finaliser le règlement.");
        window.open(res.checkout_url, '_blank');
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

      const cleanTextLocal = (str: string): string => {
        if (!str) return '';
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/œ/g, 'oe')
          .replace(/Œ/g, 'OE')
          .replace(/æ/g, 'ae')
          .replace(/Æ/g, 'AE')
          .replace(/’/g, "'")
          .replace(/[^\x00-\x7F]/g, " ");
      };

      const formatSimpleNumberLocal = (num: number, currency: string = "XOF") => {
        const rounded = Math.round(num || 0);
        const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return `${formatted} ${cleanTextLocal(currency)}`;
      };

      // Background canvas fill
      doc.setFillColor(252, 253, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Outer border
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1.2);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Inner border frame
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      // Header Banner Box
      doc.setFillColor(15, 23, 42);
      doc.rect(15, 15, pageWidth - 30, 32, 'F');

      // KONTROL Logo Header
      const ctrX = 28;
      const ctrY = 31;
      
      doc.setDrawColor(125, 211, 252);
      doc.setLineWidth(1.0);
      doc.circle(ctrX, ctrY, 6, 'S');
      
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(0.8);
      doc.circle(ctrX, ctrY, 4.2, 'S');
      
      doc.setFillColor(37, 99, 235);
      doc.triangle(ctrX, ctrY - 2.5, ctrX - 3, ctrY + 1.2, ctrX + 3, ctrY + 1.2, 'F');
      doc.rect(ctrX - 1.0, ctrY + 1.2, 2.0, 2.5, 'F');

      // Header Branding
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('KONTROL ERP', 38, 28);
      
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(cleanTextLocal("SERVICE DE FINANCEMENT PARTENAIRE & GARANTIE BRIDGE"), 38, 34);

      // Top Right Header Badge
      const randHash = Math.random().toString(36).substring(2, 10).toUpperCase();
      const certId = `CERT-BRIDGE-${Date.now().toString().slice(-6)}-${randHash}`;
      
      doc.setTextColor(239, 68, 68);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(cleanTextLocal("ATTESTATION OFFICIELLE"), pageWidth - 20, 26, { align: 'right' });
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(certId, pageWidth - 20, 32, { align: 'right' });

      // Title Banner under header
      let y = 54;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(cleanTextLocal("ATTESTATION D'ÉLIGIBILITÉ ET DE GARANTIE AU CRÉDIT BRIDGE"), pageWidth / 2, y, { align: 'center' });

      y += 6;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(40, y, pageWidth - 40, y);

      // Section 1: Identification entreprise
      y += 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(20, y, pageWidth - 40, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.rect(20, y, pageWidth - 40, 22, 'S');

      const companyName = cleanTextLocal(currentUserProfile?.companyName || 'ENTREPRISE PARTENAIRE');
      const companyId = cleanTextLocal(currentUserProfile?.companyId || 'ENT-KONTROL-01');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(cleanTextLocal("ENTREPRISE BÉNÉFICIAIRE :"), 25, y + 6);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(companyName, 25, y + 13);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(cleanTextLocal(`Identifiant Réseau : ${companyId}`), pageWidth - 25, y + 13, { align: 'right' });

      // Section 2: Statement text
      y += 28;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      const introText = "Le présent certificat atteste que l'entreprise ci-dessus a fait l'objet d'une évaluation financière automatisée. Cette analyse s'appuie sur la régularité des flux de trésorerie, la solvabilité de la clientèle et l'historique des opérations enregistrées sur la plateforme de gestion KONTROL.";
      const introLines = doc.splitTextToSize(cleanTextLocal(introText), pageWidth - 50);
      doc.text(introLines, 25, y);

      y += (introLines.length * 4.5) + 6;

      // Section 3: High-impact Guarantee Box
      const boxHeight = 44;
      doc.setFillColor(239, 246, 255);
      doc.rect(20, y, pageWidth - 40, boxHeight, 'F');
      doc.setDrawColor(191, 219, 254);
      doc.setLineWidth(0.6);
      doc.rect(20, y, pageWidth - 40, boxHeight, 'S');

      const insideBoxY = y + 8;
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(cleanTextLocal("MONTANT MAXIMUM D'AVANCE DE TRÉSORERIE GARANTI (OFFRE BRIDGE) :"), pageWidth / 2, insideBoxY, { align: 'center' });

      doc.setTextColor(37, 99, 235);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      const amountEligible = bridgeResult.amount_eligible || 500000;
      doc.text(formatSimpleNumberLocal(amountEligible, "XOF"), pageWidth / 2, insideBoxY + 12, { align: 'center' });

      doc.setTextColor(16, 185, 129);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanTextLocal("Conditions privilège : Taux d'intérêt annuel préférentiel de 3.5% sans frais cachés"), pageWidth / 2, insideBoxY + 22, { align: 'center' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(cleanTextLocal("Déblocage possible sous 24h ouvrées après validation auprès de l'établissement financier partenaire."), pageWidth / 2, insideBoxY + 29, { align: 'center' });

      y += boxHeight + 10;

      // Section 4: Key Financial Indicators Table Summary
      const dateInscription = currentUserProfile?.createdAt 
        ? new Date(currentUserProfile.createdAt).toLocaleDateString('fr-FR') 
        : '12/04/2026';
      const dateImpression = new Date().toLocaleDateString('fr-FR');
      
      const totalEntrees = payments.filter(p => p.type === 'ENCAISSEMENT').reduce((acc, p) => acc + p.montant, 0);
      const totalSorties = payments.filter(p => p.type === 'DECAISSEMENT').reduce((acc, p) => acc + p.montant, 0);
      const soldeProvisoire = totalEntrees - totalSorties;

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(cleanTextLocal("SYNTHÈSE DE L'AUDIT COMPTABLE ET DES FLUX TRAITÉS"), 25, y);

      y += 4;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(cleanTextLocal(`Période d'activité analysée : du ${dateInscription} au ${dateImpression}`), 25, y + 2);

      y += 8;
      // Table box
      const tableBoxY = y;
      doc.setFillColor(248, 250, 252);
      doc.rect(20, tableBoxY, pageWidth - 40, 28, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, tableBoxY, pageWidth - 40, 28, 'S');

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      doc.text(cleanTextLocal("• Total des encaissements enregistrés (Entrées) :"), 25, tableBoxY + 7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(formatSimpleNumberLocal(totalEntrees, "XOF"), pageWidth - 25, tableBoxY + 7, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(cleanTextLocal("• Total des décaissements et charges (Sorties) :"), 25, tableBoxY + 14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text(formatSimpleNumberLocal(totalSorties, "XOF"), pageWidth - 25, tableBoxY + 14, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(cleanTextLocal("• Solde provisoire de trésorerie disponible :"), 25, tableBoxY + 21);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(formatSimpleNumberLocal(soldeProvisoire, "XOF"), pageWidth - 25, tableBoxY + 21, { align: 'right' });

      y += 38;

      // Section 5: Signature & Official Seal Block
      const sigY = y;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(cleanTextLocal("Pour KONTROL Financial Services"), 25, sigY);
      doc.text(cleanTextLocal("Sceau Officiel et Signature"), pageWidth - 80, sigY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(cleanTextLocal("Direction Générale de l'Audit"), 25, sigY + 5);

      // Signature Stamp Box Frame
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(pageWidth - 80, sigY + 3, 55, 22);

      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("KONTROL GUARANTEE", pageWidth - 78, sigY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(cleanTextLocal("Certifié conforme par INNOV'KORP"), pageWidth - 78, sigY + 15);
      doc.text(cleanTextLocal(`Réf: ${certId.substring(0, 16)}`), pageWidth - 78, sigY + 19);

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        cleanTextLocal(`Attestation générée automatiquement le ${dateImpression} par KONTROL ERP. Document certifié sans signature manuscrite.`),
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      );

      doc.save(`Certificat_Eligibilite_Bridge_${cleanTextLocal(companyName).replace(/\s+/g, '_')}.pdf`);
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
            <h3 className="text-[12px] font-extrabold text-kontrol-dark uppercase tracking-widest">{t('finance.outflow_evolution_title') || "Évolution des Décaissements (6 derniers mois)"}</h3>
            <p className="text-[11px] text-kontrol-ink-muted mt-0.5">{t('finance.outflow_evolution_subtitle') || "Flux de sortie de fonds mensuels consolidés"}</p>
          </div>
          <div 
            title={t('finance.realtime') || "Mise à jour en Temps Réel"}
            className="flex items-center gap-1.5 bg-rose-50 border border-rose-100/50 rounded-full px-2.5 py-0.5 shadow-2xs cursor-help"
          >
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{t('finance.realtime') || "Temps Réel"}</span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={0}>
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
