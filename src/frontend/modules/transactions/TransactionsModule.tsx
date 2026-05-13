import React from 'react';
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
      alert("Vous n'avez pas la permission de supprimer une transaction.");
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
      setMessage({ type: 'error', text: "Vous n'avez pas la permission de créer une transaction." });
      return;
    }
    if (!newTrans.tiersId) {
      setMessage({ type: 'error', text: "Veuillez sélectionner un tiers (client ou fournisseur)." });
      return;
    }
    if (newTrans.articles.length === 0) {
      setMessage({ type: 'error', text: "Veuillez ajouter au moins un article à la transaction." });
      return;
    }
    if (!companyId) {
      setMessage({ type: 'error', text: "Erreur: ID de l'entreprise non trouvé." });
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
      
      setMessage({ type: 'success', text: "Transaction enregistrée avec succès !" });
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
      setMessage({ type: 'error', text: "Erreur lors de l'enregistrement de la transaction." });
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
    const headers = ['Réf', 'Date', 'Tiers', 'Type', 'Montant', 'Statut'];
    const data = filteredTransactions.map(t => [
      t.reference,
      new Date(t.date).toLocaleDateString(),
      t.tiersNom,
      t.type,
      formatCurrency(t.montantTotal),
      t.statut
    ]);
    exportToPDF('Journal des Transactions - KONTROL', headers, data, 'Transactions_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredTransactions.map(t => ({
      Référence: t.reference,
      Date: new Date(t.date).toLocaleDateString(),
      Tiers: t.tiersNom,
      Type: t.type,
      Montant: t.montantTotal,
      Statut: t.statut
    }));
    exportToExcel(data, 'Transactions_KONTROL');
  };

  const handleUpdateTransaction = async (updates: Partial<Transaction>) => {
    if (!selectedId || !user) return;
    if (!hasPermission(currentUserProfile?.role, 'TRANSACTION_UPDATE')) {
      alert("Vous n'avez pas la permission de modifier une transaction.");
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
      alert("Erreur lors de la génération du rapport PDF.");
    }
  };

  return (
    <div className="space-y-4">
      {isAdding && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between shrink-0">
              <h3 className="text-lg font-extrabold text-kontrol-dark">Nouvelle Transaction</h3>
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
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Type</label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={newTrans.type}
                    onChange={(e) => setNewTrans({...newTrans, type: e.target.value as any, articles: []})}
                  >
                    <option value="VENTE">Vente (Sortie de stock)</option>
                    <option value="ACHAT">Achat (Entrée en stock)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Tiers (Client/Fournisseur)</label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={newTrans.tiersId}
                    onChange={(e) => {
                      const t = tiers.find(x => x.id === e.target.value);
                      setNewTrans({...newTrans, tiersId: e.target.value, tiersNom: t?.nom || ''});
                    }}
                  >
                    <option value="">Sélectionner un tiers</option>
                    {tiers.filter(t => newTrans.type === 'VENTE' ? t.type === 'CLIENT' : t.type === 'FOURNISSEUR').length === 0 ? (
                      <option value="" disabled>Aucun {newTrans.type === 'VENTE' ? 'client' : 'fournisseur'} trouvé</option>
                    ) : (
                      tiers.filter(t => newTrans.type === 'VENTE' ? t.type === 'CLIENT' : t.type === 'FOURNISSEUR').map(t => (
                        <option key={t.id} value={t.id}>{t.nom}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Devise</label>
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
                        placeholder="Taux"
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
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Facture Fournisseur (Optionnel)</label>
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
                          {newTrans.invoiceFileUrl ? 'Changer le fichier' : 'Importer la facture'}
                        </span>
                        <input 
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={handleInvoiceUpload}
                        />
                      </label>
                      <p className="text-[10px] text-kontrol-ink-muted mt-1">PDF ou Image (Max 2MB)</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Articles</h4>
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
                      <option value="">Ajouter un produit...</option>
                      {produits.length === 0 ? (
                        <option value="" disabled>Aucun produit trouvé</option>
                      ) : (
                        produits.map(p => (
                          <option key={p.id} value={p.id}>{p.designation} ({p.stock} en stock)</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="border border-kontrol-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-kontrol-bg border-b border-kontrol-border">
                      <tr>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted">Désignation</th>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted text-center">Quantité</th>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted text-right">P.U.</th>
                        <th className="px-4 py-2 font-bold text-kontrol-ink-muted text-right">Total</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kontrol-border">
                      {newTrans.articles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-kontrol-ink-muted">
                            Aucun article ajouté.
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
                            <td colSpan={3} className="px-4 py-1 text-right uppercase tracking-wider text-[9px] text-kontrol-ink-muted">Total en {newTrans.devise}</td>
                            <td className="px-4 py-1 text-right text-kontrol-blue text-[12px]">
                              {((newTrans.articles.reduce((acc, a) => acc + a.total, 0)) / (newTrans.tauxChange || 1)).toFixed(2)} {newTrans.devise}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-[10px] text-kontrol-ink-muted">Total Transaction (XOF)</td>
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
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteTransaction}
        title="Supprimer la transaction"
        message={`Êtes-vous sûr de vouloir supprimer la transaction ${selectedTrans?.reference} ? Le stock des produits concernés sera automatiquement ajusté.`}
        confirmLabel="Supprimer"
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Transactions</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">Ventes et Achats — Feuille TRANSACTIONS</p>
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
          <button 
            onClick={handleCashFlowReport}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
          >
            <FileText size={14} /> Flux de Trésorerie
          </button>
          {hasPermission(currentUserProfile?.role, 'TRANSACTION_CREATE') && (
            <button onClick={() => setIsAdding(true)} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2">
              <Plus size={14} /> Nouvelle transaction
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
            placeholder="Rechercher référence, tiers…"
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
          <option value="VENTE">Ventes</option>
          <option value="ACHAT">Achats</option>
        </select>
        <select 
          className="bg-white border border-kontrol-border rounded-lg px-3 py-1.5 text-[13px] font-medium text-kontrol-ink-soft outline-none focus:border-kontrol-blue transition-colors"
          value={filterStatut}
          onChange={(e) => {
            setFilterStatut(e.target.value as any);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">Tous statuts</option>
          <option value="PAYE">Payé</option>
          <option value="ATTENTE">En attente</option>
          <option value="ANNULE">Annulé</option>
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
          <span className="text-kontrol-ink-muted text-xs">à</span>
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
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Réf</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Date</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Tiers</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">Montant</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Statut</th>
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
                      Aucune transaction trouvée.
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
              {filteredTransactions.length} transactions au total
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
          {selectedTrans ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">Détails transaction</h4>
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
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Montant Total TTC</p>
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
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Date d'émission</p>
                      <p className="text-kontrol-ink-soft font-medium">{new Date(selectedTrans.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <User size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Type de tiers</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedTrans.type === 'VENTE' ? 'Client' : 'Fournisseur'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <CreditCard size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Mode de paiement</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedTrans.modePaiement}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <CheckCircle2 size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Statut du règlement</p>
                      <select 
                        className={cn(
                          "font-bold text-[12.5px] bg-transparent border-none outline-none focus:ring-0 p-0 cursor-pointer",
                          selectedTrans.statut === 'PAYE' ? "text-emerald-600" : 
                          selectedTrans.statut === 'ATTENTE' ? "text-amber-600" : "text-rose-600"
                        )}
                        value={selectedTrans.statut}
                        onChange={(e) => handleUpdateTransaction({ statut: e.target.value as any })}
                      >
                        <option value="PAYE" className="text-emerald-600 font-bold italic">Payé</option>
                        <option value="ATTENTE" className="text-amber-600 font-bold italic">En attente</option>
                        <option value="ANNULE" className="text-rose-600 font-bold italic">Annulé</option>
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
                  <h5 className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-3">Articles ({selectedTrans.articles.length})</h5>
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
                      <Printer size={14} /> Facture
                    </button>
                    <button 
                      onClick={() => generateReceiptPDF(selectedTrans, currentUserProfile)}
                      className="flex-1 btn-outline text-[10px] py-2.5 font-bold flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                      <Receipt size={14} /> Reçu
                    </button>
                    {selectedTrans.invoiceFileUrl && (
                      <a 
                        href={selectedTrans.invoiceFileUrl}
                        download={`Facture_${selectedTrans.reference}`}
                        className="flex-1 btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                      >
                        <Download size={14} /> Facture Réelle
                      </a>
                    )}
                    <button 
                      onClick={() => setIsDeleting(true)}
                      className="p-2.5 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Supprimer"
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
                Sélectionnez une transaction<br />pour voir ses détails.
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <ModuleActivityLog 
              companyId={companyId!} 
              moduleName="transaction" 
              title="Journal des transactions" 
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
                <h3 className="text-lg font-bold text-kontrol-dark">Payer via {qrData.type}</h3>
                <button onClick={() => setShowQR(false)} className="p-1 hover:bg-kontrol-bg rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-white p-4 rounded-2xl border-2 border-kontrol-bg inline-block mb-6 shadow-sm">
                <QRCodeSVG value={`PAY:${qrData.type}:${qrData.phone}:${qrData.amount}`} size={200} />
              </div>
              <p className="text-[14px] font-bold text-kontrol-dark mb-1">Montant : {formatCurrency(qrData.amount)}</p>
              <p className="text-[12px] text-kontrol-ink-muted">Scanner ce code pour initier le paiement vers le numéro : <span className="font-bold text-kontrol-blue">{qrData.phone}</span></p>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full btn-primary mt-8 py-3"
              >
                J'ai effectué le paiement
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
