import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileCheck, 
  Search, 
  Plus, 
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
  Download,
  Edit2,
  ArrowRight,
  Send,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { toast } from 'sonner';
import { Tiers, Produit, UserProfile, Transaction } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType, db, logAction } from '../../../api/firebase';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CompanySelector } from '../../components/common/CompanySelector';
import { motion, AnimatePresence } from 'motion/react';
import { tiersService } from '../../../api/services/tiersService';
import { productService } from '../../../api/services/productService';
import { transactionService } from '../../../api/services/transactionService';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuoteItem {
  produitId: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
}

export interface Quote {
  id: string;
  reference: string;
  type: 'VENTE' | 'ACHAT';
  tiersId: string;
  tiersNom: string;
  date: number;
  dateValidite: number;
  articles: QuoteItem[];
  montantHT: number;
  montantTVA: number;
  montantTotal: number;
  statut: 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'CONVERTI';
  notes?: string;
  companyId: string;
  createdAt: number;
  createdByName?: string;
}

interface QuotesModuleProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function QuotesModule({ user, currentUserProfile }: QuotesModuleProps) {
  const { t } = useTranslation();
  const isERPAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP';
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(currentUserProfile?.companyId || null);
  
  const companyId = isERPAdmin 
    ? (selectedCompanyId || currentUserProfile?.companyId || user.uid) 
    : (currentUserProfile?.companyId || user.uid);

  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [tiers, setTiers] = React.useState<Tiers[]>([]);
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatut, setFilterStatut] = React.useState<'ALL' | 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'CONVERTI'>('ALL');
  
  const [selectedQuote, setSelectedQuote] = React.useState<Quote | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isConverting, setIsConverting] = React.useState(false);
  
  // Form State
  const [formData, setFormData] = React.useState<{
    type: 'VENTE' | 'ACHAT';
    tiersId: string;
    tiersNom: string;
    dateValiditeDays: number;
    notes: string;
    articles: QuoteItem[];
  }>({
    type: 'VENTE',
    tiersId: '',
    tiersNom: '',
    dateValiditeDays: 30,
    notes: 'Offre valable 30 jours à compter de la date d\'émission.',
    articles: []
  });

  const [currentArticle, setCurrentArticle] = React.useState<{
    produitId: string;
    quantite: number;
    prixUnitaire: number;
    tva: number;
  }>({
    produitId: '',
    quantite: 1,
    prixUnitaire: 0,
    tva: 18
  });

  // Load Data
  const loadData = React.useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch Tiers, Products and Quotes
      const [tiersData, productsData] = await Promise.all([
        tiersService.getAll(),
        productService.getAll()
      ]);
      setTiers(tiersData.filter(t => !t.companyId || t.companyId === companyId));
      setProduits(productsData.filter(p => !p.companyId || p.companyId === companyId || p.ownerId === companyId));

      const q = query(
        collection(db, 'quotes'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const loadedQuotes: Quote[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Quote));

      setQuotes(loadedQuotes);
    } catch (error) {
      console.error("Error loading quotes data:", error);
      toast.error("Erreur de chargement des devis");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const totals = React.useMemo(() => {
    const totalCount = quotes.length;
    const totalAmount = quotes.reduce((acc, q) => acc + q.montantTotal, 0);
    const pendingCount = quotes.filter(q => q.statut === 'ENVOYE' || q.statut === 'BROUILLON').length;
    const acceptedCount = quotes.filter(q => q.statut === 'ACCEPTE' || q.statut === 'CONVERTI').length;
    const conversionRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

    return { totalCount, totalAmount, pendingCount, acceptedCount, conversionRate };
  }, [quotes]);

  // Filtered list
  const filteredQuotes = React.useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = q.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.tiersNom.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatut = filterStatut === 'ALL' || q.statut === filterStatut;
      return matchSearch && matchStatut;
    });
  }, [quotes, searchTerm, filterStatut]);

  // Add Item to Form
  const handleAddArticle = () => {
    if (!currentArticle.produitId) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }
    const product = produits.find(p => p.id === currentArticle.produitId) as any;
    if (!product) return;

    const prodName = product.nom || product.name || product.designation || 'Produit';
    const prodPrice = product.prix || product.price || product.prixVente || 0;

    const newItem: QuoteItem = {
      produitId: product.id,
      designation: prodName,
      quantite: currentArticle.quantite,
      prixUnitaire: currentArticle.prixUnitaire || prodPrice,
      tva: currentArticle.tva
    };

    setFormData(prev => ({
      ...prev,
      articles: [...prev.articles, newItem]
    }));

    setCurrentArticle({
      produitId: '',
      quantite: 1,
      prixUnitaire: 0,
      tva: 18
    });
  };

  const handleRemoveArticle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.filter((_, i) => i !== index)
    }));
  };

  // Create Quote Handler
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tiersId) {
      toast.error("Veuillez sélectionner un tiers");
      return;
    }
    if (formData.articles.length === 0) {
      toast.error("Veuillez ajouter au moins un produit au devis");
      return;
    }

    const selectedTiers = tiers.find(t => t.id === formData.tiersId);
    const tiersNom = selectedTiers ? (selectedTiers.nom || selectedTiers.name || 'Tiers Client') : formData.tiersNom;

    const montantHT = formData.articles.reduce((acc, item) => acc + (item.quantite * item.prixUnitaire), 0);
    const montantTVA = formData.articles.reduce((acc, item) => acc + (item.quantite * item.prixUnitaire * (item.tva / 100)), 0);
    const montantTotal = montantHT + montantTVA;

    const now = Date.now();
    const refYear = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const reference = `DEV-${refYear}-${randomNum}`;

    const newQuote: Quote = {
      id: doc(collection(db, 'quotes')).id,
      reference,
      type: formData.type,
      tiersId: formData.tiersId,
      tiersNom,
      date: now,
      dateValidite: now + (formData.dateValiditeDays * 86400000),
      articles: formData.articles,
      montantHT,
      montantTVA,
      montantTotal,
      statut: 'ENVOYE',
      notes: formData.notes,
      companyId,
      createdAt: now,
      createdByName: currentUserProfile?.displayName || user.email || 'Utilisateur'
    };

    try {
      await setDoc(doc(db, 'quotes', newQuote.id), newQuote);
      await logAction(companyId, user.uid, currentUserProfile?.displayName || user.email || 'Utilisateur', 'CREATION_DEVIS', `Création du devis ${reference} pour ${tiersNom}`);
      toast.success(`Devis ${reference} enregistré avec succès !`);
      setIsAdding(false);
      setFormData({
        type: 'VENTE',
        tiersId: '',
        tiersNom: '',
        dateValiditeDays: 30,
        notes: 'Offre valable 30 jours à compter de la date d\'émission.',
        articles: []
      });
      loadData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quotes', user);
    }
  };

  // Convert Quote to Invoice
  const handleConvertQuoteToInvoice = async (quote: Quote) => {
    setIsConverting(true);
    try {
      const refYear = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const invoiceRef = `FAC-${refYear}-${randomNum}`;
      
      const newTransaction: Transaction = {
        id: '',
        reference: invoiceRef,
        type: quote.type === 'ACHAT' ? 'ACHAT' : 'VENTE',
        tiersId: quote.tiersId,
        tiersNom: quote.tiersNom,
        date: Date.now(),
        articles: quote.articles.map(a => ({
          produitId: a.produitId,
          designation: a.designation,
          quantite: a.quantite,
          prixUnitaire: a.prixUnitaire,
          tva: a.tva,
          montantHT: a.quantite * a.prixUnitaire,
          montantTotal: a.quantite * a.prixUnitaire * (1 + (a.tva / 100))
        })),
        montant: quote.montantTotal,
        montantTotal: quote.montantTotal,
        statut: 'ATTENTE',
        status: 'PENDING',
        modePaiement: 'VIREMENT',
        paymentMethod: 'VIREMENT',
        description: `Facture issue de la conversion du Devis ${quote.reference}`,
        ownerId: companyId,
        companyId: companyId,
        createdAt: Date.now()
      };

      // 1. Create Transaction in Firestore
      await transactionService.createTransaction(newTransaction, user, currentUserProfile);

      // 2. Update quote status to CONVERTI
      await updateDoc(doc(db, 'quotes', quote.id), {
        statut: 'CONVERTI'
      });

      await logAction(companyId, user.uid, currentUserProfile?.displayName || user.email || 'Utilisateur', 'CONVERSION_DEVIS', `Devis ${quote.reference} converti en Facture ${invoiceRef}`);
      toast.success(`Devis converti avec succès en Facture ${invoiceRef} !`);
      setSelectedQuote(null);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la conversion du devis en facture");
      console.error("Conversion error:", error);
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Quote
  const handleDeleteQuote = async () => {
    if (!selectedQuote) return;
    try {
      await deleteDoc(doc(db, 'quotes', selectedQuote.id));
      await logAction(companyId, user.uid, currentUserProfile?.displayName || user.email || 'Utilisateur', 'SUPPRESSION_DEVIS', `Suppression du devis ${selectedQuote.reference}`);
      toast.success(`Devis ${selectedQuote.reference} supprimé.`);
      setIsDeleting(false);
      setSelectedQuote(null);
      loadData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quotes/${selectedQuote.id}`, user);
    }
  };

  // Export PDF Devis
  const handlePrintQuotePDF = (quote: Quote) => {
    try {
      const pdf = new jsPDF();
      const currency = currentUserProfile?.currency || 'XOF';

      // Header
      pdf.setFillColor(15, 23, 42); // Dark
      pdf.rect(0, 0, 210, 35, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(quote.type === 'VENTE' ? "DEVIS DE VENTE / PROFORMA" : "DEMANDE DE PRIX / DEVIS ACHAT", 14, 20);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Réf : ${quote.reference}`, 14, 27);
      pdf.text(`Date : ${new Date(quote.date).toLocaleDateString('fr-FR')}`, 150, 20);
      pdf.text(`Validité : ${new Date(quote.dateValidite).toLocaleDateString('fr-FR')}`, 150, 27);

      // Client Info
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text("ÉMETTEUR :", 14, 45);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.text(`${currentUserProfile?.companyName || 'KONTROL ERP'}`, 14, 51);
      pdf.text(`Email : ${currentUserProfile?.email || '-'}`, 14, 56);

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text("CLIENT / DESTINATAIRE :", 120, 45);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.text(`${quote.tiersNom}`, 120, 51);

      // Table of Products
      const tableData = quote.articles.map((item, idx) => [
        (idx + 1).toString(),
        item.designation,
        item.quantite.toString(),
        formatCurrency(item.prixUnitaire, currency),
        `${item.tva}%`,
        formatCurrency(item.quantite * item.prixUnitaire * (1 + item.tva / 100), currency)
      ]);

      (autoTable as any)(pdf, {
        startY: 68,
        head: [['#', 'Désignation', 'Qté', 'Prix Unitaire', 'TVA', 'Total TTC']],
        body: tableData,
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });

      const finalY = (pdf as any).lastAutoTable.previous.finalY + 10;

      // Totals Box
      pdf.setFillColor(248, 250, 252);
      pdf.rect(120, finalY, 76, 28, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(120, finalY, 76, 28, 'S');

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total HT :`, 124, finalY + 7);
      pdf.text(formatCurrency(quote.montantHT, currency), 192, finalY + 7, { align: 'right' });

      pdf.text(`TVA :`, 124, finalY + 14);
      pdf.text(formatCurrency(quote.montantTVA, currency), 192, finalY + 14, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.text(`TOTAL TTC :`, 124, finalY + 22);
      pdf.text(formatCurrency(quote.montantTotal, currency), 192, finalY + 22, { align: 'right' });

      // Conditions
      if (quote.notes) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Notes & Conditions : ${quote.notes}`, 14, finalY + 15);
      }

      pdf.save(`Devis_${quote.reference}.pdf`);
      toast.success(`PDF du devis ${quote.reference} généré avec succès !`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erreur de génération PDF");
    }
  };

  const getStatusBadge = (statut: Quote['statut']) => {
    switch (statut) {
      case 'ACCEPTE':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Accepté</span>;
      case 'CONVERTI':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-[11px] font-bold flex items-center gap-1"><ArrowRight size={12} /> Converti en Facture</span>;
      case 'ENVOYE':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-bold flex items-center gap-1"><Send size={12} /> Envoyé / En Attente</span>;
      case 'REFUSE':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[11px] font-bold flex items-center gap-1"><XCircle size={12} /> Refusé</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-full text-[11px] font-bold flex items-center gap-1"><Clock size={12} /> Brouillon</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-kontrol-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-kontrol-dark uppercase tracking-tight flex items-center gap-2">
              <FileCheck className="text-kontrol-blue" size={24} />
              Devis & Factures Proforma
            </h1>
            <CompanySelector
              selectedId={selectedCompanyId}
              onSelect={setSelectedCompanyId}
            />
          </div>
          <p className="text-xs text-kontrol-ink-soft mt-1">
            Établissez des devis commerciaux, suivez leur acceptation et convertissez-les en factures de vente officielles en 1 clic.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-kontrol-blue to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all w-full sm:w-auto"
          >
            <Plus size={16} /> Nouveau Devis
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-kontrol-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-kontrol-ink-soft uppercase tracking-wider">Total Devis Émis</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-kontrol-blue flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-kontrol-dark mt-2">{totals.totalCount}</p>
          <span className="text-[11px] text-slate-500">Volume total enregistré</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-kontrol-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-kontrol-ink-soft uppercase tracking-wider">Valeur Totale Devis</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-2">
            {formatCurrency(totals.totalAmount, currentUserProfile?.currency || 'XOF')}
          </p>
          <span className="text-[11px] text-slate-500">Montant Cumulé TTC</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-kontrol-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-kontrol-ink-soft uppercase tracking-wider">En Attente de Validation</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{totals.pendingCount}</p>
          <span className="text-[11px] text-slate-500">Propositions en cours</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-kontrol-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-kontrol-ink-soft uppercase tracking-wider">Taux de Conversion</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">{totals.conversionRate}%</p>
          <span className="text-[11px] text-slate-500">Devis convertis en factures</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-kontrol-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par référence, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-kontrol-blue outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {(['ALL', 'ENVOYE', 'ACCEPTE', 'CONVERTI', 'REFUSE'] as const).map((statut) => (
            <button
              key={statut}
              onClick={() => setFilterStatut(statut)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                filterStatut === statut 
                  ? "bg-kontrol-dark text-white shadow-xs" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {statut === 'ALL' ? 'Tous' : statut}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Data Table */}
      <div className="bg-white rounded-2xl border border-kontrol-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-kontrol-blue" size={32} />
            <p className="text-xs font-medium">Chargement des devis...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileCheck size={48} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Aucun devis trouvé</p>
            <p className="text-xs text-slate-500">Créez votre premier devis pour démarrer vos propositions commerciales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Référence</th>
                  <th className="p-4">Client / Tiers</th>
                  <th className="p-4">Date Émission</th>
                  <th className="p-4">Validité</th>
                  <th className="p-4 text-right">Montant Total TTC</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-kontrol-blue">{quote.reference}</td>
                    <td className="p-4 font-extrabold text-kontrol-dark">{quote.tiersNom}</td>
                    <td className="p-4 text-slate-600">{new Date(quote.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-slate-600">{new Date(quote.dateValidite).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-right font-black text-slate-900">
                      {formatCurrency(quote.montantTotal, currentUserProfile?.currency || 'XOF')}
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(quote.statut)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePrintQuotePDF(quote)}
                          title="Télécharger / Imprimer PDF"
                          className="p-1.5 text-slate-600 hover:text-kontrol-blue hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Printer size={16} />
                        </button>

                        {quote.statut !== 'CONVERTI' && (
                          <button
                            onClick={() => handleConvertQuoteToInvoice(quote)}
                            title="Convertir en Facture de Vente"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-[11px] flex items-center gap-1 transition-all"
                          >
                            <ArrowRight size={13} /> Facture
                          </button>
                        )}

                        <button
                          onClick={() => { setSelectedQuote(quote); setIsDeleting(true); }}
                          title="Supprimer le devis"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal New Quote */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-kontrol-border overflow-hidden my-8"
            >
              <div className="p-5 bg-kontrol-dark text-white flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <FileCheck size={20} className="text-kontrol-blue" />
                    Créer un nouveau Devis / Proforma
                  </h3>
                  <p className="text-xs text-slate-300">Renseignez le client et sélectionnez les produits</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveQuote} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Client Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sélectionner un Client / Tiers *</label>
                    <select
                      value={formData.tiersId}
                      onChange={(e) => setFormData({ ...formData, tiersId: e.target.value })}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-kontrol-blue outline-none"
                    >
                      <option value="">-- Sélectionner un Tiers --</option>
                      {tiers.map(t => (
                        <option key={t.id} value={t.id}>{t.nom || t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Durée de Validité (Jours)</label>
                    <input
                      type="number"
                      value={formData.dateValiditeDays}
                      onChange={(e) => setFormData({ ...formData, dateValiditeDays: parseInt(e.target.value) || 30 })}
                      min="1"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-kontrol-blue outline-none"
                    />
                  </div>
                </div>

                {/* Add Product Items Section */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Package size={16} className="text-kontrol-blue" /> Ajouter des Produits / Services
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <select
                        value={currentArticle.produitId}
                        onChange={(e) => {
                          const p = produits.find(prod => prod.id === e.target.value) as any;
                          const prodPrice = p ? (p.prix || p.price || p.prixVente || 0) : 0;
                          setCurrentArticle({
                            ...currentArticle,
                            produitId: e.target.value,
                            prixUnitaire: prodPrice
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                      >
                        <option value="">-- Choisir Produit --</option>
                        {produits.map(p => {
                          const prod = p as any;
                          const name = prod.nom || prod.name || prod.designation || 'Produit';
                          const price = prod.prix || prod.price || prod.prixVente || 0;
                          return (
                            <option key={p.id} value={p.id}>{name} - {formatCurrency(price, currentUserProfile?.currency || 'XOF')}</option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        placeholder="Qté"
                        value={currentArticle.quantite}
                        onChange={(e) => setCurrentArticle({ ...currentArticle, quantite: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddArticle}
                      className="px-3 py-2 bg-kontrol-blue hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                </div>

                {/* Articles Added Table */}
                {formData.articles.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 font-bold text-slate-600">
                        <tr>
                          <th className="p-3">Désignation</th>
                          <th className="p-3 text-center">Qté</th>
                          <th className="p-3 text-right">P.U.</th>
                          <th className="p-3 text-right">Total HT</th>
                          <th className="p-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.articles.map((art, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-semibold text-slate-800">{art.designation}</td>
                            <td className="p-3 text-center">{art.quantite}</td>
                            <td className="p-3 text-right">{formatCurrency(art.prixUnitaire, currentUserProfile?.currency || 'XOF')}</td>
                            <td className="p-3 text-right font-bold">{formatCurrency(art.quantite * art.prixUnitaire, currentUserProfile?.currency || 'XOF')}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveArticle(idx)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes & Conditions du Devis</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-kontrol-blue outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-kontrol-blue hover:bg-blue-600 text-white font-extrabold rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
                  >
                    <CheckCircle2 size={16} /> Enregistrer & Émettre le Devis
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      {isDeleting && selectedQuote && (
        <ConfirmModal
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          onConfirm={handleDeleteQuote}
          title="Supprimer le devis ?"
          message={`Êtes-vous sûr de vouloir supprimer définitivement le devis ${selectedQuote.reference} ? Cette action est irréversible.`}
          confirmLabel="Oui, supprimer"
          cancelLabel="Annuler"
          variant="danger"
        />
      )}
    </div>
  );
}
