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
  const companyId = currentUserProfile?.companyId || user.uid;
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [tiers, setTiers] = React.useState<Tiers[]>([]);
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
    }, (error) => {
      console.error("Payments fetch error:", error);
      setLoading(false);
    }));

    // Tiers
    const qTiers = query(collection(db, 'tiers'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qTiers, (snapshot) => {
      setTiers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tiers[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tiers', user)));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [companyId]);

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
      handleFirestoreError(error, OperationType.WRITE, 'payments', user);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!isDeletingPayment) return;
    
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
      handleFirestoreError(error, OperationType.DELETE, 'payments', user);
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
    exportToPDF('Journal de Trésorerie - KONTROL', headers, data, 'Tresorerie_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
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
    exportToExcel(data, 'Tresorerie_KONTROL');
  };

  const [bridgeResult, setBridgeResult] = React.useState<any>(null);
  const [isCalculatingBridge, setIsCalculatingBridge] = React.useState(false);

  const checkBridgeEligibility = async () => {
    setIsCalculatingBridge(true);
    try {
      const totalInvoices = payments.filter(p => p.type === 'ENCAISSEMENT').reduce((acc, p) => acc + p.montant, 0) * 0.4;
      const res = await fetch('/api/enterprise/treasury/bridge-calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cash: totalBalance, invoices: totalInvoices })
      });
      const data = await res.json();
      setBridgeResult(data);
    } catch (e) {
      console.error("Bridge calc error");
    } finally {
      setIsCalculatingBridge(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Trésorerie & Finance</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Géré par KONTROL Polyglot Core (Java/Go/Rust)</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={checkBridgeEligibility}
            disabled={isCalculatingBridge}
            className="btn-outline border-kontrol-blue text-kontrol-blue text-xs py-1.5 px-4 flex items-center gap-2 hover:bg-kontrol-blue hover:text-white transition-all"
          >
            {isCalculatingBridge ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} 
            Calculer éligibilité Bridge
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <FileText size={14} /> PDF
          </button>
          <button 
            onClick={() => setIsAddingPayment(true)}
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
          >
            <Plus size={14} /> Nouveau Mouvement
          </button>
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
                <h4 className="text-[13px] font-black text-kontrol-dark uppercase tracking-tight">Offre de Financement KONTROL</h4>
                <p className="text-[11px] text-kontrol-ink-muted font-bold">Bridge calculé via Java Spring Core : <span className="text-kontrol-blue">{formatCurrency(bridgeResult.amount_eligible)}</span> éligibles</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-emerald-600 uppercase">Taux Préférentiel</p>
                <p className="text-lg font-black text-kontrol-dark">3.5% <span className="text-[10px] text-kontrol-ink-muted">ANNUEL</span></p>
              </div>
              <button className="btn-primary text-[10px] px-4 py-2 uppercase font-black" onClick={() => setBridgeResult(null)}>Débloquer les fonds</button>
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
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Trésorerie Totale</p>
          <h3 className="text-3xl font-extrabold text-kontrol-blue">{formatCurrency(totalBalance)}</h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/60">
            <TrendingUp size={14} className="text-emerald-400" />
            <span>Solde actuel de votre trésorerie</span>
          </div>
        </div>

        <div className="card p-6 bg-white border border-kontrol-border">
          <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Encaissements (Période)</p>
          <h3 className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(periodPayments.filter(p => p.type === 'ENCAISSEMENT').reduce((acc, p) => acc + p.montant, 0))}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-600/70">
            <ArrowUpCircle size={14} />
            <span>Total des entrées sur la période</span>
          </div>
        </div>

        <div className="card p-6 bg-white border border-kontrol-border">
          <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Décaissements (Période)</p>
          <h3 className="text-2xl font-extrabold text-rose-600">
            {formatCurrency(periodPayments.filter(p => p.type === 'DECAISSEMENT').reduce((acc, p) => acc + p.montant, 0))}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-rose-600/70">
            <ArrowDownCircle size={14} />
            <span>Total des sorties sur la période</span>
          </div>
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
            <span className="text-kontrol-ink-muted text-[10px] font-bold uppercase">au</span>
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
            placeholder="Rechercher description, tiers..."
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
          <option value="ALL">Tous les flux</option>
          <option value="ENCAISSEMENT">Entrées uniquement</option>
          <option value="DECAISSEMENT">Sorties uniquement</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-kontrol-border flex flex-wrap items-center justify-between gap-4 bg-kontrol-bg/30">
          <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Historique des Flux</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Date</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Description / Tiers</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Mode</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Montant</th>
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
                    Aucun mouvement enregistré sur cette période.
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
              {filteredPayments.length} flux au total
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
              <h3 className="text-lg font-extrabold text-kontrol-dark">Nouveau Mouvement</h3>
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
                  Encaissement (+)
                </button>
                <button
                  type="button"
                  onClick={() => setNewPayment({...newPayment, type: 'DECAISSEMENT'})}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest transition-all",
                    newPayment.type === 'DECAISSEMENT' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-kontrol-ink-muted"
                  )}
                >
                  Décaissement (-)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Date</label>
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
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Montant</label>
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
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Mode de paiement</label>
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
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Tiers (Optionnel)</label>
                <select 
                  className="w-full px-3 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px] font-medium"
                  value={newPayment.tiersId}
                  onChange={(e) => {
                    const t = tiers.find(x => x.id === e.target.value);
                    setNewPayment({...newPayment, tiersId: e.target.value, tiersNom: t?.nom || ''});
                  }}
                >
                  <option value="">Aucun tiers</option>
                  {tiers.map(t => (
                    <option key={t.id} value={t.id}>{t.nom} ({t.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Description</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Ex: Règlement facture #123, Vente comptoir..."
                  className="w-full px-4 py-2.5 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px]"
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Enregistrer le mouvement
              </button>
            </form>
          </motion.div>
        </div>
      )}
      <div className="mt-6">
        <ModuleActivityLog 
          companyId={companyId!} 
          moduleName="mouvement" 
          title="Journal financier" 
        />
      </div>

      <ConfirmModal
        isOpen={!!isDeletingPayment}
        onClose={() => setIsDeletingPayment(null)}
        onConfirm={handleDeletePayment}
        title="Supprimer le mouvement"
        message={`Êtes-vous sûr de vouloir supprimer ce mouvement de ${isDeletingPayment?.montant ? formatCurrency(isDeletingPayment.montant) : ''} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}
