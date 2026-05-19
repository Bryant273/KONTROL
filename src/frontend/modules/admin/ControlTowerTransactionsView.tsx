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
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import { Transaction, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  auth,
  addDoc,
  logAction,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { CompanySelector } from '../../components/common/CompanySelector';
import { transactionService } from '../../../api/services/transactionService';
import { tiersService } from '../../../api/services/tiersService';
import { productService } from '../../../api/services/productService';
import { Tiers, Produit } from '../../types';

export function ControlTowerTransactionsView() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'ALL' | 'VENTE' | 'ACHAT'>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  const [isAdding, setIsAdding] = React.useState(false);
  const [tiers, setTiers] = React.useState<Tiers[]>([]);
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [message, setMessage] = React.useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [newTrans, setNewTrans] = React.useState({
    type: 'VENTE' as 'VENTE' | 'ACHAT',
    tiersId: '',
    tiersNom: '',
    modePaiement: 'Espèces',
    devise: 'XOF',
    articles: [] as any[]
  });

  React.useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'transactions', auth.currentUser, false);
      }
      setLoading(false);
    });

    // Fetch Tiers and Products for the modal
    const unsubTiers = tiersService.subscribeToAll(setTiers, auth.currentUser!);
    const unsubProds = productService.subscribeToAll(setProduits, auth.currentUser!);

    return () => {
      unsubscribe();
      unsubTiers();
      unsubProds();
    };
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.tiersId || newTrans.articles.length === 0 || !selectedCompanyId) {
      setMessage({ type: 'error', text: t('common.error_mandatory_fields') });
      return;
    }

    try {
      setLoading(true);
      const montantTotal = newTrans.articles.reduce((acc, art) => acc + art.total, 0);
      const transData: any = {
        ...newTrans,
        reference: `TR-${Date.now().toString().slice(-6)}`,
        date: Date.now(),
        montantTotal,
        statut: 'PAYE',
        ownerId: selectedCompanyId,
        createdAt: Date.now()
      };

      await transactionService.createTransaction(transData, auth.currentUser!);
      
      await logAction(
        selectedCompanyId,
        auth.currentUser?.uid || 'SYSTEM',
        auth.currentUser?.displayName || t('common.roles.admin_kontrol'),
        "Transaction: Créée par Admin",
        `Réf: ${transData.reference}`
      );

      setMessage({ type: 'success', text: t('common.success_saved') });
      setTimeout(() => {
        setIsAdding(false);
        setMessage(null);
        setNewTrans({ type: 'VENTE', tiersId: '', tiersNom: '', modePaiement: 'Espèces', devise: 'XOF', articles: [] });
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions/create', auth.currentUser, false);
      setMessage({ type: 'error', text: t('common.error_generic') });
    } finally {
      setLoading(false);
    }
  };

  const addArticle = (produitId: string) => {
    const prod = produits.find(p => p.id === produitId);
    if (!prod) return;
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
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (t.tiersNom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCompany = !selectedCompanyId || t.ownerId === selectedCompanyId;
    return matchesSearch && matchesType && matchesCompany;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = ['Réf', 'Date', 'Type', 'Montant', 'Statut'];
    const data = filteredTransactions.map(t => [
      t.reference,
      new Date(t.date).toLocaleDateString(),
      t.type,
      formatCurrency(t.montantTotal),
      t.statut
    ]);
    exportToPDF('Flux Global des Transactions - KONTROL', headers, data, 'Transactions_Globales_KONTROL');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight uppercase">{t('admin.transactions.title_global')}</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('admin.transactions.subtitle_global')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAdding(true)} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2">
            <Plus size={14} /> {t('admin.transactions.add_button')}
          </button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
          <button onClick={() => exportToExcel(filteredTransactions, 'Transactions_Globales')} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <Table size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="bg-white border border-kontrol-border rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
          <input 
            type="text" 
            placeholder={t('admin.transactions.search_placeholder')}
            className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <CompanySelector selectedId={selectedCompanyId} onSelect={setSelectedCompanyId} />
        <select 
          className="px-4 py-3 bg-white border border-kontrol-border rounded-xl text-[12px] font-bold outline-none focus:border-kontrol-blue transition-all"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
        >
          <option value="ALL">{t('common.all_short')}</option>
          <option value="VENTE">{t('common.sales')}</option>
          <option value="ACHAT">{t('common.purchases')}</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.transactions.table.reference')}</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.transactions.table.date')}</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.transactions.table.tiers')}</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">{t('admin.transactions.table.amount')}</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.transactions.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} /></td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-kontrol-ink-muted italic">{t('admin.intelligence.insights.none')}</td></tr>
              ) : (
                paginatedTransactions.map((t_item) => (
                  <tr key={t_item.id} className="hover:bg-kontrol-bg/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {t_item.type === 'VENTE' ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownLeft size={14} className="text-rose-500" />}
                        <span className="text-[11px] font-bold bg-kontrol-bg px-2 py-0.5 rounded text-kontrol-ink-muted">{t_item.reference}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-kontrol-ink-muted">{new Date(t_item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-extrabold text-kontrol-dark text-[13px]">{t_item.tiersNom}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-[14px] text-kontrol-ink-soft">{formatCurrency(t_item.montantTotal)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest",
                        t_item.statut === 'PAYE' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t_item.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11px] text-kontrol-ink-muted font-bold uppercase">Total: {filteredTransactions.length} transactions</span>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 rounded-xl hover:bg-white disabled:opacity-30 transition-all border border-transparent hover:border-kontrol-border"><ArrowDownLeft size={16} className="rotate-45" /></button>
              <span className="text-[12px] font-extrabold text-kontrol-dark">Page {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 rounded-xl hover:bg-white disabled:opacity-30 transition-all border border-transparent hover:border-kontrol-border"><ArrowUpRight size={16} className="rotate-45" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('admin.transactions.add_button')}</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-6">
                {message && (
                  <div className={cn("p-4 rounded-xl text-sm font-bold text-center", message.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('common.roles.company')}</label>
                    <CompanySelector selectedId={selectedCompanyId} onSelect={setSelectedCompanyId} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Type</label>
                    <select className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px]" value={newTrans.type} onChange={(e) => setNewTrans({...newTrans, type: e.target.value as any})}>
                      <option value="VENTE">{t('common.sale')}</option>
                      <option value="ACHAT">{t('common.purchase')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.transactions.table.tiers')}</label>
                    <select className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px]" value={newTrans.tiersId} onChange={(e) => {
                      const tr = tiers.find(x => x.id === e.target.value);
                      setNewTrans({...newTrans, tiersId: e.target.value, tiersNom: tr?.nom || ''});
                    }}>
                      <option value="">{t('common.select')}...</option>
                      {tiers.filter(tr => newTrans.type === 'VENTE' ? tr.type === 'CLIENT' : tr.type === 'FOURNISSEUR').map(tr => (
                        <option key={tr.id} value={tr.id}>{tr.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('charges.form.mode_paiement')}</label>
                    <select className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px]" value={newTrans.modePaiement} onChange={(e) => setNewTrans({...newTrans, modePaiement: e.target.value})}>
                      <option value="Espèces">{t('common.cash')}</option>
                      <option value="Virement">{t('common.transfer')}</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('common.articles')}</h4>
                    <select className="px-4 py-2 bg-kontrol-bg border border-kontrol-border rounded-xl text-[12px]" onChange={(e) => { if(e.target.value) { addArticle(e.target.value); e.target.value = ''; } }}>
                      <option value="">{t('common.select')}...</option>
                      {produits.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}
                    </select>
                  </div>
                  <div className="border border-kontrol-border rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-kontrol-bg">
                        <tr>
                          <th className="px-4 py-2">{t('produits.form.designation')}</th>
                          <th className="px-4 py-2 text-center">{t('common.qty')}</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kontrol-border">
                        {newTrans.articles.map((art, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 font-bold">{art.designation}</td>
                            <td className="px-4 py-2 text-center">{art.quantite}</td>
                            <td className="px-4 py-2 text-right font-bold">{formatCurrency(art.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-kontrol-bg/30 border-t border-kontrol-border">
                <button onClick={handleAddTransaction} disabled={loading} className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {t('admin.transactions.add_button')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
