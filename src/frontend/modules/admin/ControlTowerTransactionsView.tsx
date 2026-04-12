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
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
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
  auth 
} from '../../../api/firebase';
import { CompanySelector } from '../../components/common/CompanySelector';

export function ControlTowerTransactionsView() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'ALL' | 'VENTE' | 'ACHAT'>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  React.useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight uppercase">Flux Global des Transactions</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Observabilité en temps réel de toutes les transactions de l'écosystème</p>
        </div>
        <div className="flex gap-2">
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
            placeholder="Rechercher par référence ou tiers..." 
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
          <option value="ALL">Tous types</option>
          <option value="VENTE">Ventes</option>
          <option value="ACHAT">Achats</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Référence</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Date</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Tiers</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Montant</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} /></td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-kontrol-ink-muted italic">Aucune transaction trouvée</td></tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-kontrol-bg/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {t.type === 'VENTE' ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownLeft size={14} className="text-rose-500" />}
                        <span className="text-[11px] font-bold bg-kontrol-bg px-2 py-0.5 rounded text-kontrol-ink-muted">{t.reference}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-kontrol-ink-muted">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-extrabold text-kontrol-dark text-[13px]">{t.tiersNom}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-[14px] text-kontrol-ink-soft">{formatCurrency(t.montantTotal)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest",
                        t.statut === 'PAYE' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
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
    </motion.div>
  );
}
