import React from 'react';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ArrowDownLeft,
  ArrowUpRight,
  Search, 
  Filter,
  CreditCard,
  Smartphone,
  Banknote,
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  X,
  CheckCircle2,
  Trash2,
  Calendar,
  FileText,
  Table
} from 'lucide-react';
import { motion } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import { Wallet, Payment, UserProfile, Tiers } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
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
  logAction,
  auth,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export function ControlTowerTreasuryView() {
  const companyId = 'SYSTEM'; // Platform global treasury
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddingPayment, setIsAddingPayment] = React.useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = React.useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'ALL' | 'ENCAISSEMENT' | 'DECAISSEMENT'>('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startDate, setStartDate] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split('T')[0]);

  const [newPayment, setNewPayment] = React.useState({
    date: new Date().toISOString().split('T')[0],
    montant: 0,
    type: 'ENCAISSEMENT' as Payment['type'],
    modePaiement: 'Virement',
    tiersNom: '',
    description: ''
  });

  React.useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qPayments = query(
      collection(db, 'payments'), 
      where('ownerId', '==', companyId),
      orderBy('date', 'desc')
    );
    unsubscribes.push(onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[]);
      setLoading(false);
    }, (error) => {
      console.error("Payments fetch error:", error);
      setLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.montant <= 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'payments'), {
        ...newPayment,
        date: new Date(newPayment.date).getTime(),
        ownerId: companyId,
        createdAt: Date.now()
      });

      await logAction(
        companyId, 
        auth.currentUser?.uid || 'SYSTEM', 
        auth.currentUser?.displayName || 'Admin KONTROL', 
        newPayment.type === 'ENCAISSEMENT' ? "Trésorerie: Encaissement" : "Trésorerie: Décaissement",
        `Montant: ${formatCurrency(newPayment.montant)} - ${newPayment.description}`
      );

      setIsAddingPayment(false);
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        montant: 0,
        type: 'ENCAISSEMENT',
        modePaiement: 'Virement',
        tiersNom: '',
        description: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments', auth.currentUser);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!isDeletingPayment) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'payments', isDeletingPayment.id));
      
      await logAction(
        companyId,
        auth.currentUser?.uid || 'SYSTEM',
        auth.currentUser?.displayName || 'Admin KONTROL',
        "Trésorerie: Mouvement Supprimé",
        `Montant: ${formatCurrency(isDeletingPayment.montant)} (${isDeletingPayment.type})`
      );
      setIsDeletingPayment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'payments', auth.currentUser);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = payments.reduce((acc, p) => {
    return acc + (p.type === 'ENCAISSEMENT' ? p.montant : -p.montant);
  }, 0);

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
    const headers = ['Date', 'Description', 'Tiers', 'Mode', 'Type', 'Montant'];
    const data = filteredPayments.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.description,
      p.tiersNom || '—',
      p.modePaiement,
      p.type,
      formatCurrency(p.montant)
    ]);
    exportToPDF('Trésorerie Plateforme - KONTROL', headers, data, 'Tresorerie_Admin_KONTROL');
  };

  const handleExportExcel = () => {
    const data = filteredPayments.map(p => ({
      Date: new Date(p.date).toLocaleDateString(),
      Description: p.description,
      Tiers: p.tiersNom || '—',
      Mode: p.modePaiement,
      Type: p.type,
      Montant: p.montant
    }));
    exportToExcel(data, 'Tresorerie_Admin_KONTROL');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight uppercase">Trésorerie Plateforme</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Gestion des flux financiers globaux de KONTROL</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <Table size={14} /> Excel
          </button>
          <button onClick={() => setIsAddingPayment(true)} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2">
            <Plus size={14} /> Nouveau Mouvement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-8 bg-kontrol-dark text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <WalletIcon size={80} />
          </div>
          <p className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest mb-1">Solde Trésorerie Global</p>
          <h3 className="text-4xl font-extrabold text-kontrol-blue tracking-tighter">{formatCurrency(totalBalance)}</h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/60">
            <TrendingUp size={14} className="text-emerald-400" />
            <span>Flux net cumulé de la plateforme</span>
          </div>
        </div>

        <div className="card p-8">
          <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-1">Encaissements (Période)</p>
          <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tighter">
            {formatCurrency(periodPayments.filter(p => p.type === 'ENCAISSEMENT').reduce((acc, p) => acc + p.montant, 0))}
          </h3>
          <p className="text-[11px] text-kontrol-ink-muted mt-2 uppercase font-bold tracking-tighter">Entrées financières</p>
        </div>

        <div className="card p-8">
          <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-1">Décaissements (Période)</p>
          <h3 className="text-3xl font-extrabold text-rose-600 tracking-tighter">
            {formatCurrency(periodPayments.filter(p => p.type === 'DECAISSEMENT').reduce((acc, p) => acc + p.montant, 0))}
          </h3>
          <p className="text-[11px] text-kontrol-ink-muted mt-2 uppercase font-bold tracking-tighter">Sorties financières</p>
        </div>
      </div>

      <div className="bg-white border border-kontrol-border rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-kontrol-ink-muted" />
          <div className="flex items-center gap-2">
            <input type="date" className="px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-xl text-[12px] font-bold outline-none focus:border-kontrol-blue transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase">au</span>
            <input type="date" className="px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-xl text-[12px] font-bold outline-none focus:border-kontrol-blue transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 min-w-[250px] relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
          <input type="text" placeholder="Rechercher un mouvement..." className="w-full pl-12 pr-4 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2.5 bg-white border border-kontrol-border rounded-xl text-[12px] font-bold outline-none focus:border-kontrol-blue transition-all" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
          <option value="ALL">Tous les flux</option>
          <option value="ENCAISSEMENT">Encaissements</option>
          <option value="DECAISSEMENT">Décaissements</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Date</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Description</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Mode</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Montant</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} /></td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-kontrol-ink-muted italic">Aucun mouvement trouvé</td></tr>
              ) : (
                paginatedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-kontrol-bg/30 transition-colors group">
                    <td className="px-6 py-4 text-[12px] font-bold text-kontrol-ink-muted">{new Date(payment.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-extrabold text-kontrol-dark">{payment.description}</p>
                      {payment.tiersNom && <p className="text-[10px] text-kontrol-ink-muted uppercase tracking-tighter">{payment.tiersNom}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-kontrol-bg border border-kontrol-border rounded text-[10px] font-bold text-kontrol-ink-soft uppercase">{payment.modePaiement}</span>
                    </td>
                    <td className={cn("px-6 py-4 text-right font-extrabold text-[14px]", payment.type === 'ENCAISSEMENT' ? "text-emerald-600" : "text-rose-600")}>
                      {payment.type === 'ENCAISSEMENT' ? '+' : '-'} {formatCurrency(payment.montant)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setIsDeletingPayment(payment)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingPayment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
              <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Nouveau Mouvement</h3>
              <button onClick={() => setIsAddingPayment(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPayment} className="p-8 space-y-6">
              <div className="flex bg-kontrol-bg p-1 rounded-2xl">
                <button type="button" onClick={() => setNewPayment({...newPayment, type: 'ENCAISSEMENT'})} className={cn("flex-1 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all", newPayment.type === 'ENCAISSEMENT' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-kontrol-ink-muted")}>Encaissement (+)</button>
                <button type="button" onClick={() => setNewPayment({...newPayment, type: 'DECAISSEMENT'})} className={cn("flex-1 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all", newPayment.type === 'DECAISSEMENT' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-kontrol-ink-muted")}>Décaissement (-)</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Date</label>
                  <input type="date" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" value={newPayment.date} onChange={(e) => setNewPayment({...newPayment, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Montant (XOF)</label>
                  <input type="number" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-lg font-extrabold outline-none focus:border-kontrol-blue" value={newPayment.montant} onChange={(e) => setNewPayment({...newPayment, montant: Number(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Description</label>
                <input type="text" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" placeholder="Ex: Paiement fournisseur cloud" value={newPayment.description} onChange={(e) => setNewPayment({...newPayment, description: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Enregistrer
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!isDeletingPayment}
        onClose={() => setIsDeletingPayment(null)}
        onConfirm={handleDeletePayment}
        title="Supprimer le mouvement"
        message="Êtes-vous sûr de vouloir supprimer ce mouvement de trésorerie ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </motion.div>
  );
}
