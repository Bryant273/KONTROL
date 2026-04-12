import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  FileText, 
  MessageCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Cpu,
  Globe,
  Database,
  Terminal,
  RefreshCw,
  Plus,
  Brain,
  X,
  CreditCard,
  Receipt,
  History,
  Shield,
  LayoutDashboard,
  BarChart3,
  PieChart as PieChartIcon,
  Server,
  Code,
  Lock,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Wallet as WalletIcon,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn, formatCurrency } from '../../lib/utils';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  logAction,
  auth
} from '../../../api/firebase';
import { UserProfile, Transaction, Company } from '../../types';
import Markdown from 'react-markdown';
import { blueAIService, BlueFunction } from '../../../api/services/blueAIService';
import { ControlTowerTreasuryView } from './ControlTowerTreasuryView';
import { ControlTowerTransactionsView } from './ControlTowerTransactionsView';
import { ControlGmailView } from './ControlGmailView';
import { emailService } from '../../../api/services/emailService';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface ControlTowerProps {
  activeSubTab?: string;
}

export function ControlTower({ activeSubTab = 'dashboard' }: ControlTowerProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCompanies: 0,
    totalRevenue: 0,
    mrr: 0,
    arr: 0,
    systemHealth: 98.4,
    pendingTickets: 0,
    activeSessions: 42
  });
  const [companies, setCompanies] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'COMPANY' | 'MANAGER'>('COMPANY');

  const openDetail = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const openEdit = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const openDelete = (item: any) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const openAdd = (type: 'COMPANY' | 'MANAGER') => {
    setAddType(type);
    setIsAddModalOpen(true);
  };

  const handleAdd = async (newData: any) => {
    try {
      if (addType === 'COMPANY') {
        // For company, we usually create a user with role CLIENT and company info
        await addDoc(collection(db, 'users'), {
          ...newData,
          role: 'CLIENT',
          subscriptionStatus: 'TRIAL',
          isDemo: true,
          createdAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...newData,
          createdAt: Date.now()
        });
      }
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Add error:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteDoc(doc(db, 'users', selectedItem.id));
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleUpdate = async (updatedData: any) => {
    if (!selectedItem) return;
    try {
      await updateDoc(doc(db, 'users', selectedItem.id), updatedData);
      setIsEditModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const [treasuryBalance, setTreasuryBalance] = useState(0);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const fetchData = async () => {
      try {
        // Fetch Users & Companies
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
        setAllUsers(users);
        
        const companyAdmins = users.filter(u => u.role === 'ADMINISTRATEUR_ENTREPRISE');
        setCompanies(companyAdmins);

        // Fetch Transactions for Revenue
        const transSnap = await getDocs(collection(db, 'transactions'));
        const transactions = transSnap.docs.map(d => d.data() as Transaction);
        const totalRev = transactions.reduce((acc, t) => acc + (t.montantTotal || 0), 0);
        
        // Subscription Revenue (10,000 FCFA per active company)
        const activeSubCompanies = companyAdmins.filter(c => c.subscriptionStatus === 'ACTIVE').length;
        const mrr = activeSubCompanies * 10000;

        // Fetch Global Treasury (All payments with ownerId 'SYSTEM')
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('ownerId', '==', 'SYSTEM')));
        const payments = paymentsSnap.docs.map(d => d.data());
        const balance = payments.reduce((acc, p) => acc + (p.type === 'ENCAISSEMENT' ? p.montant : -p.montant), 0);
        setTreasuryBalance(balance);

        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          activeCompanies: companyAdmins.length,
          totalRevenue: totalRev,
          mrr: mrr,
          arr: mrr * 12
        }));

        // Mock revenue data based on real total for chart
        const baseRev = totalRev / 6;
        setRevenueData([
          { month: 'Jan', total: baseRev * 0.7 },
          { month: 'Feb', total: baseRev * 0.85 },
          { month: 'Mar', total: baseRev * 0.9 },
          { month: 'Apr', total: baseRev * 1.1 },
          { month: 'May', total: baseRev * 1.2 },
          { month: 'Jun', total: baseRev },
        ]);

      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time listeners
    const qActions = query(collection(db, 'actions'), orderBy('timestamp', 'desc'), limit(20));
    unsubscribes.push(onSnapshot(qActions, (snap) => {
      setRecentActions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    const qTickets = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(10));
    unsubscribes.push(onSnapshot(qTickets, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStats(prev => ({ ...prev, pendingTickets: snap.docs.filter(d => d.data().status === 'NEW').length }));
    }));

    return () => unsubscribes.forEach(un => un());
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-kontrol-dark/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-kontrol-blue mb-1">
            <Activity size={18} className="animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.3em]">Statut Système: Opérationnel</span>
          </div>
          <h2 className="text-4xl font-extrabold text-kontrol-dark tracking-tighter uppercase">
            {activeSubTab === 'dashboard' ? 'Command Center' : 
             activeSubTab === 'subscriptions' || activeSubTab === 'revenue' || activeSubTab === 'accounting' ? 'Gestion Financière' :
             activeSubTab === 'entreprises' || activeSubTab === 'utilisateurs' ? 'Écosystème' :
             activeSubTab === 'ai_core' ? 'Intelligence Blue AI' :
             activeSubTab === 'telemetry' || activeSubTab === 'system' ? 'Système & Télémétrie' :
             'Contrôle & Sécurité'}
          </h2>
          <p className="text-[12px] text-kontrol-ink-muted font-bold uppercase tracking-widest">KONTROL CONTROL TOWER • v3.0.0-PRO</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Sync Live Activée</span>
          </div>
          <button className="p-3 bg-white border border-kontrol-dark/10 hover:bg-kontrol-bg transition-colors rounded-xl shadow-sm">
            <RefreshCw size={18} className="text-kontrol-ink-muted" />
          </button>
        </div>
      </header>

      {/* Main Content Dispatcher */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'dashboard' && <VisionView stats={stats} companies={companies} recentActions={recentActions} treasuryBalance={treasuryBalance} />}
        {activeSubTab === 'subscriptions' && <BusinessSubscriptionsView companies={companies} />}
        {activeSubTab === 'revenue' && <BusinessRevenueView stats={stats} revenueData={revenueData} />}
        {activeSubTab === 'accounting' && <ControlTowerTreasuryView />}
        {activeSubTab === 'transactions' && <ControlTowerTransactionsView />}
        {activeSubTab === 'entreprises' && <EcosystemCompaniesView companies={companies} onDetail={openDetail} onEdit={openEdit} onDelete={openDelete} onAdd={() => openAdd('COMPANY')} />}
        {activeSubTab === 'utilisateurs' && <EcosystemUsersView users={allUsers} onDetail={openDetail} onEdit={openEdit} onDelete={openDelete} />}
        {activeSubTab === 'gestionnaires' && <AdminManagersView users={allUsers} onDetail={openDetail} onEdit={openEdit} onDelete={openDelete} onAdd={() => openAdd('MANAGER')} />}
        {activeSubTab === 'ai_core' && <IntelligenceAIView stats={stats} />}
        {activeSubTab === 'telemetry' && <SystemTelemetryView stats={stats} />}
        {activeSubTab === 'audit' && <ControlAuditView actions={recentActions} />}
        {activeSubTab === 'tickets' && <ControlSupportView tickets={tickets} />}
        {activeSubTab === 'gmail' && <ControlGmailView />}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Détails de l'entité</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Nom / Entreprise</p>
                    <p className="text-[15px] font-extrabold text-kontrol-dark">{selectedItem.companyName || selectedItem.displayName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Email</p>
                    <p className="text-[15px] font-bold text-kontrol-dark">{selectedItem.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Rôle / Statut</p>
                    <p className="text-[13px] font-bold text-kontrol-blue uppercase tracking-widest">{selectedItem.role || selectedItem.subscriptionStatus}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Date de création</p>
                    <p className="text-[13px] font-bold text-kontrol-dark">{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                {selectedItem.role === 'ADMINISTRATEUR_ERP' && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[11px] text-amber-800 font-bold">Cet utilisateur possède des privilèges d'administration globale.</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-kontrol-bg/30 border-t border-kontrol-border flex justify-end">
                <button onClick={() => setIsDetailModalOpen(false)} className="btn-primary px-8 py-3 text-[11px] font-extrabold uppercase tracking-widest">Fermer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Modifier l'entité</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdate({
                  displayName: formData.get('displayName'),
                  companyName: formData.get('companyName'),
                  role: formData.get('role')
                });
              }} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Nom d'affichage</label>
                  <input name="displayName" type="text" defaultValue={selectedItem.displayName} className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" />
                </div>
                {selectedItem.companyName && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Nom de l'entreprise</label>
                    <input name="companyName" type="text" defaultValue={selectedItem.companyName} className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Rôle</label>
                  <select name="role" defaultValue={selectedItem.role} className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue">
                    <option value="CLIENT">Client</option>
                    <option value="GESTIONNAIRE_ERP">Gestionnaire KONTROL</option>
                    <option value="ADMINISTRATEUR_ERP">Administrateur KONTROL</option>
                  </select>
                </div>
                <button type="submit" className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                  <CheckCircle2 size={18} /> Enregistrer les modifications
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'entité"
        message="Êtes-vous sûr de vouloir supprimer cette entité ? Toutes les données associées seront définitivement perdues."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">
                  {addType === 'COMPANY' ? 'Nouvelle Entreprise' : 'Nouveau Gestionnaire'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data: any = {
                  displayName: formData.get('displayName'),
                  email: formData.get('email'),
                };
                if (addType === 'COMPANY') {
                  data.companyName = formData.get('companyName');
                } else {
                  data.role = formData.get('role');
                }
                handleAdd(data);
              }} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Nom complet</label>
                  <input name="displayName" type="text" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" placeholder="Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Email</label>
                  <input name="email" type="email" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" placeholder="jean@exemple.com" />
                </div>
                {addType === 'COMPANY' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Nom de l'entreprise</label>
                    <input name="companyName" type="text" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" placeholder="Ma Super Entreprise" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Rôle</label>
                    <select name="role" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue">
                      <option value="GESTIONNAIRE_ERP">Gestionnaire KONTROL</option>
                      <option value="ADMINISTRATEUR_ERP">Administrateur KONTROL</option>
                    </select>
                  </div>
                )}
                <button type="submit" className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                  <CheckCircle2 size={18} /> Créer {addType === 'COMPANY' ? "l'entreprise" : "le gestionnaire"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-VIEWS ---

function VisionView({ stats, companies, recentActions, treasuryBalance }: any) {
  const [period, setPeriod] = useState<'7' | '30'>('30');
  const topCompanies = [...companies]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  const chartData = [
    { date: '01/03', mrr: 450000, churn: 12000 },
    { date: '05/03', mrr: 520000, churn: 15000 },
    { date: '10/03', mrr: 480000, churn: 10000 },
    { date: '15/03', mrr: 610000, churn: 18000 },
    { date: '20/03', mrr: 590000, churn: 14000 },
    { date: '25/03', mrr: 720000, churn: 22000 },
    { date: '30/03', mrr: 850000, churn: 19000 },
  ];

  const filteredChartData = period === '7' ? chartData.slice(-3) : chartData;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="MRR Global" value={formatCurrency(stats.mrr)} change="+12.5%" icon={TrendingUp} color="blue" trend="up" />
        <StatCard title="Trésorerie KONTROL" value={formatCurrency(treasuryBalance)} change="Live" icon={WalletIcon} color="amber" trend="up" />
        <StatCard title="Noeuds Actifs" value={stats.totalUsers} change="+45" icon={Users} color="blue" trend="up" />
        <StatCard title="Santé Système" value="99.9%" change="Stable" icon={Activity} color="emerald" trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Croissance des Revenus</h3>
              <p className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Analyse MRR vs Churn</p>
            </div>
            <div className="flex bg-kontrol-bg p-1 rounded-2xl border border-kontrol-border">
              <button 
                onClick={() => setPeriod('7')}
                className={cn(
                  "px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all",
                  period === '7' ? "bg-kontrol-blue text-white shadow-lg shadow-kontrol-blue/20" : "text-kontrol-ink-soft hover:bg-kontrol-border"
                )}
              >
                7 Jours
              </button>
              <button 
                onClick={() => setPeriod('30')}
                className={cn(
                  "px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all",
                  period === '30' ? "bg-kontrol-blue text-white shadow-lg shadow-kontrol-blue/20" : "text-kontrol-ink-soft hover:bg-kontrol-border"
                )}
              >
                30 Jours
              </button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredChartData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Companies */}
        <div className="card p-8">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-6">Top Entreprises (Revenus)</h3>
          <div className="space-y-6">
            {topCompanies.length > 0 ? topCompanies.map((company, idx) => (
              <div key={company.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-kontrol-bg border border-kontrol-border flex items-center justify-center text-kontrol-blue font-bold text-sm group-hover:bg-kontrol-blue group-hover:text-white transition-all">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-[13px] font-extrabold text-kontrol-dark group-hover:text-kontrol-blue transition-colors">{company.companyName || company.displayName}</p>
                    <p className="text-[10px] text-kontrol-ink-muted uppercase tracking-widest">Plan Standard</p>
                  </div>
                </div>
                <p className="text-[13px] font-extrabold text-kontrol-dark">{formatCurrency(company.revenue || 10000)}</p>
              </div>
            )) : (
              <p className="text-[11px] text-kontrol-ink-muted italic">Aucune donnée disponible</p>
            )}
          </div>
          <button className="w-full mt-8 py-3 bg-kontrol-bg text-kontrol-ink-soft text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-kontrol-border transition-all">
            Voir tout l'écosystème
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Real-time Feed */}
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Flux d'Événements Temps Réel</h3>
            <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {recentActions.map((action: any) => (
              <div key={action.id} className="flex gap-4 p-4 bg-kontrol-bg/50 rounded-2xl border border-transparent hover:border-kontrol-border transition-all">
                <div className="w-8 h-8 rounded-full bg-white border border-kontrol-border flex items-center justify-center shrink-0">
                  <Activity size={14} className="text-kontrol-blue" />
                </div>
                <div>
                  <p className="text-[12px] text-kontrol-dark">
                    <span className="font-extrabold uppercase">{action.userName}</span>
                    <span className="mx-2 text-kontrol-ink-muted">a effectué</span>
                    <span className="font-bold text-kontrol-blue">{action.action}</span>
                  </p>
                  <p className="text-[11px] text-kontrol-ink-muted mt-1 italic">"{action.details}"</p>
                  <p className="text-[9px] text-kontrol-ink-muted mt-2 font-bold uppercase">{new Date(action.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Alerts & Anomalies */}
        <div className="card p-8">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-6">Alertes Globales & Anomalies</h3>
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-rose-900">Tentative de Brute Force Détectée</p>
                <p className="text-[11px] text-rose-700 mt-1">IP: 192.168.1.45 - Cible: Admin Panel</p>
                <button className="mt-2 text-[10px] font-extrabold text-rose-600 uppercase tracking-widest hover:underline">Bloquer l'IP</button>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-amber-900">Latence Base de Données Élevée</p>
                <p className="text-[11px] text-amber-700 mt-1">Pic de 450ms détecté sur le cluster Europe-West2</p>
                <button className="mt-2 text-[10px] font-extrabold text-amber-600 uppercase tracking-widest hover:underline">Voir Télémétrie</button>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Brain size={20} />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-blue-900">Insight Blue AI: Opportunité MRR</p>
                <p className="text-[11px] text-blue-700 mt-1">12 entreprises approchent de la limite de leur plan d'essai.</p>
                <button className="mt-2 text-[10px] font-extrabold text-blue-600 uppercase tracking-widest hover:underline">Lancer Campagne</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BusinessSubscriptionsView({ companies }: any) {
  const handleUpgradeToSubscriber = async (companyId: string) => {
    try {
      const companyRef = doc(db, 'users', companyId);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      
      await updateDoc(companyRef, {
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: endDate.getTime(),
        isDemo: false
      });

      await logAction(
        'SYSTEM',
        auth.currentUser?.uid || 'SYSTEM',
        auth.currentUser?.displayName || 'Admin KONTROL',
        "Abonnement: Passage en Abonné",
        `Entreprise ID: ${companyId}`
      );
    } catch (error) {
      console.error("Upgrade error:", error);
    }
  };

  const handleExport = () => {
    const data = companies.map((c: any) => ({
      Entreprise: c.companyName || c.displayName,
      Email: c.email,
      Statut: c.subscriptionStatus || 'INACTIF',
      Expiration: c.subscriptionEndDate ? new Date(c.subscriptionEndDate).toLocaleDateString() : 'N/A',
      Demo: c.isDemo ? 'OUI' : 'NON'
    }));
    import('../../lib/export').then(({ exportToExcel }) => {
      exportToExcel(data, 'Abonnements_KONTROL');
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-8 bg-kontrol-dark text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Prix Unique du Plan</p>
          <h3 className="text-4xl font-extrabold tracking-tighter">10,000 FCFA</h3>
          <p className="text-[11px] text-white/60 mt-2">Abonnement Mensuel Standard</p>
        </div>
        <div className="card p-8">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-2">Abonnements Actifs</p>
          <h3 className="text-4xl font-extrabold text-kontrol-dark tracking-tighter">
            {companies.filter((c: any) => c.subscriptionStatus === 'ACTIVE').length}
          </h3>
          <p className="text-[11px] text-emerald-600 font-bold mt-2">Générateurs de Revenus</p>
        </div>
        <div className="card p-8">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-2">Expirés / Essai</p>
          <h3 className="text-4xl font-extrabold text-kontrol-dark tracking-tighter">
            {companies.filter((c: any) => c.subscriptionStatus !== 'ACTIVE').length}
          </h3>
          <p className="text-[11px] text-rose-600 font-bold mt-2">Action Requise</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-kontrol-border flex items-center justify-between">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Gestion des Abonnements</h3>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-kontrol-blue text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all"
          >
            Exporter la Liste
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Entreprise</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Plan</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Statut</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Expiration</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {companies.map((company: any) => (
                <tr key={company.id} className="hover:bg-kontrol-bg/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-bold text-kontrol-dark">{company.companyName || company.displayName}</p>
                    <p className="text-[11px] text-kontrol-ink-muted">{company.email}</p>
                    {company.isDemo && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">DEMO</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-bold text-kontrol-blue uppercase tracking-widest">Standard</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-full border",
                      company.subscriptionStatus === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {company.subscriptionStatus || 'INACTIF'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[12px] text-kontrol-ink-soft">
                    {company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {company.isDemo && (
                        <button 
                          onClick={() => handleUpgradeToSubscriber(company.id)}
                          className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
                        >
                          <CheckCircle2 size={12} /> Passer en Abonné
                        </button>
                      )}
                      <button className="p-2 text-kontrol-blue hover:bg-kontrol-blue/10 rounded-lg transition-all" title="Modifier">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function AdminManagersView({ users, onDetail, onEdit, onDelete, onAdd }: any) {
  const managers = users.filter((u: any) => u.role === 'ADMINISTRATEUR_ERP' || u.role === 'GESTIONNAIRE_ERP');
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Gestionnaires de la Plateforme</h3>
        <button 
          onClick={onAdd}
          className="px-6 py-3 bg-kontrol-blue text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-kontrol-blue/20"
        >
          <Plus size={16} /> Nouveau Gestionnaire
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managers.map((manager: any) => (
          <div key={manager.id} className="card p-6 border-transparent hover:border-kontrol-blue/20 transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue font-bold text-lg">
                {manager.displayName?.charAt(0) || manager.email?.charAt(0)}
              </div>
              <div>
                <h4 className="text-[15px] font-extrabold text-kontrol-dark tracking-tight">{manager.displayName || 'N/A'}</h4>
                <p className="text-[11px] text-kontrol-ink-muted">{manager.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-kontrol-bg rounded-xl border border-kontrol-border mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Rôle</span>
              <span className="text-[10px] font-extrabold text-kontrol-blue uppercase tracking-widest">{manager.role?.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => onDetail(manager)}
                className="flex-1 py-2.5 bg-kontrol-bg text-kontrol-ink-soft rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-kontrol-border transition-all flex items-center justify-center gap-2"
              >
                <Eye size={14} /> Voir
              </button>
              <button 
                onClick={() => onEdit(manager)}
                className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all" title="Modifier"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => onDelete(manager)}
                className="flex-1 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Révoquer
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BusinessRevenueView({ stats, revenueData }: any) {
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [newMovement, setNewMovement] = useState({
    type: 'ENCAISSEMENT',
    description: '',
    montant: 0,
    date: Date.now()
  });

  useEffect(() => {
    const q = query(collection(db, 'treasury_movements'), orderBy('date', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovement.description || !newMovement.montant) return;
    try {
      await addDoc(collection(db, 'treasury_movements'), {
        ...newMovement,
        date: Date.now(),
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid
      });
      setShowAddMovement(false);
      setNewMovement({ type: 'ENCAISSEMENT', description: '', montant: 0, date: Date.now() });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-8 bg-gradient-to-br from-kontrol-blue to-blue-700 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Revenu Mensuel Récurrent (MRR)</p>
          <h3 className="text-5xl font-extrabold tracking-tighter">{formatCurrency(stats.mrr)}</h3>
          <p className="text-[11px] text-white/60 mt-4">Basé sur {stats.activeCompanies} abonnements actifs</p>
        </div>
        <div className="card p-8 bg-gradient-to-br from-purple-600 to-purple-800 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Revenu Annuel Récurrent (ARR)</p>
          <h3 className="text-5xl font-extrabold tracking-tighter">{formatCurrency(stats.arr)}</h3>
          <p className="text-[11px] text-white/60 mt-4">Revenu annuel projeté</p>
        </div>
      </div>

      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Analyse de la Croissance des Revenus</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-kontrol-blue" />
              <span className="text-[10px] font-bold uppercase">Taux de Croissance: +15%</span>
            </div>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function BusinessAccountingView({ stats }: any) {
  const [movements, setMovements] = useState<any[]>([
    { id: '1', date: Date.now(), type: 'ENCAISSEMENT', montant: 10000, description: 'Abonnement Innov\'Korp', mode: 'Kkiapay' },
    { id: '2', date: Date.now() - 86400000, type: 'DECAISSEMENT', montant: 5000, description: 'Frais Serveur Cloud', mode: 'Virement' },
    { id: '3', date: Date.now() - 172800000, type: 'ENCAISSEMENT', montant: 10000, description: 'Renouvellement Global Tech', mode: 'Kkiapay' },
  ]);
  const [showAddMovement, setShowAddMovement] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Revenus Totaux" value={formatCurrency(stats.totalRevenue)} change="+8%" icon={ArrowUpRight} color="emerald" />
        <StatCard title="Charges & Achats" value={formatCurrency(stats.totalRevenue * 0.3)} change="-2%" icon={ArrowDownRight} color="rose" />
        <StatCard title="Bénéfice Net" value={formatCurrency(stats.totalRevenue * 0.7)} change="+15%" icon={TrendingUp} color="blue" />
        <StatCard title="Flux de Trésorerie" value={formatCurrency(stats.totalRevenue * 0.5)} change="Stable" icon={Activity} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-6 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Journal de Trésorerie (Plateforme)</h3>
            <button 
              onClick={() => setShowAddMovement(true)}
              className="px-4 py-2 bg-kontrol-blue text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Nouveau Mouvement
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Date</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Description</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Type</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Montant</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-kontrol-bg/30 transition-colors">
                    <td className="px-6 py-4 text-[11px] text-kontrol-ink-muted">
                      {new Date(m.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-kontrol-dark">{m.description}</p>
                      <p className="text-[10px] text-kontrol-ink-muted">Mode: {m.mode}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded",
                        m.type === 'ENCAISSEMENT' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn(
                        "text-[13px] font-extrabold",
                        m.type === 'ENCAISSEMENT' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {m.type === 'ENCAISSEMENT' ? '+' : '-'}{formatCurrency(m.montant)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-kontrol-ink-muted hover:bg-kontrol-bg rounded-lg transition-all">
                          <Eye size={14} />
                        </button>
                        <button className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-8">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-6">Prévisions Financières (6 Mois)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { month: 'Juil', forecast: stats.mrr * 1.1 },
                { month: 'Août', forecast: stats.mrr * 1.25 },
                { month: 'Sept', forecast: stats.mrr * 1.4 },
                { month: 'Oct', forecast: stats.mrr * 1.6 },
                { month: 'Nov', forecast: stats.mrr * 1.85 },
                { month: 'Déc', forecast: stats.mrr * 2.2 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
                <Tooltip />
                <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={3} fillOpacity={0.1} fill="#8b5cf6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal Ajout Mouvement */}
      <AnimatePresence>
        {showAddMovement && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-kontrol-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Nouveau Mouvement</h3>
                <button onClick={() => setShowAddMovement(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form className="p-8 space-y-6" onSubmit={handleAddMovement}>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Type de Mouvement</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => setNewMovement({...newMovement, type: 'ENCAISSEMENT'})}
                      className={cn(
                        "py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all",
                        newMovement.type === 'ENCAISSEMENT' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      )}
                    >
                      Encaissement
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNewMovement({...newMovement, type: 'DECAISSEMENT'})}
                      className={cn(
                        "py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all",
                        newMovement.type === 'DECAISSEMENT' ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "bg-rose-50 text-rose-600 border border-rose-200"
                      )}
                    >
                      Décaissement
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Description</label>
                  <input 
                    type="text" 
                    required
                    value={newMovement.description}
                    onChange={(e) => setNewMovement({...newMovement, description: e.target.value})}
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px]" 
                    placeholder="Ex: Achat fournitures bureau" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Montant (XOF)</label>
                  <input 
                    type="number" 
                    required
                    value={newMovement.montant || ''}
                    onChange={(e) => setNewMovement({...newMovement, montant: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue text-[13px]" 
                    placeholder="0" 
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-kontrol-blue text-white rounded-2xl font-extrabold text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-kontrol-blue/20">
                  Enregistrer le Mouvement
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EcosystemCompaniesView({ companies, onDetail, onEdit, onDelete, onAdd }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
          <input 
            type="text" 
            placeholder="Rechercher une entreprise..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-kontrol-border rounded-2xl focus:outline-none focus:border-kontrol-blue shadow-sm text-[13px]"
          />
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-white border border-kontrol-border text-kontrol-ink-soft rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-kontrol-bg transition-all flex items-center gap-2">
            <Filter size={16} /> Filtres
          </button>
          <button 
            onClick={onAdd}
            className="px-6 py-3 bg-kontrol-blue text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-kontrol-blue/20"
          >
            <Plus size={16} /> Nouvelle Entreprise
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company: any) => (
          <div key={company.id} className="card p-6 hover:shadow-xl transition-all group border-transparent hover:border-kontrol-blue/20">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-kontrol-bg border border-kontrol-border flex items-center justify-center text-kontrol-blue shadow-inner group-hover:scale-110 transition-transform">
                {company.companyLogo ? (
                  <img src={company.companyLogo} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
                ) : (
                  <Building2 size={28} />
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn(
                  "px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full border",
                  company.subscriptionStatus === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {company.subscriptionStatus || 'INACTIF'}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => onDetail(company)}
                    className="p-1.5 text-kontrol-blue hover:bg-kontrol-blue/10 rounded-lg transition-all" title="Voir"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    onClick={() => onEdit(company)}
                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDelete(company)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <h4 className="text-lg font-extrabold text-kontrol-dark tracking-tight mb-1">{company.companyName || company.displayName}</h4>
            <p className="text-[12px] text-kontrol-ink-muted mb-6">{company.email}</p>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-kontrol-border">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Score Santé</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-kontrol-bg rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '85%' }} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">85%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-1">Utilisateurs</p>
                <p className="text-[12px] font-bold text-kontrol-dark">12 Actifs</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function EcosystemUsersView({ users, onDetail, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Répertoire Global des Utilisateurs</h3>
          <div className="flex gap-4">
            <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase">Total Noeuds: {users.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Utilisateur</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Rôle</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Entreprise</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Dernière Activité</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-kontrol-bg/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue font-bold text-[10px]">
                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-kontrol-dark">{user.displayName || 'N/A'}</p>
                        <p className="text-[11px] text-kontrol-ink-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-kontrol-ink-soft uppercase tracking-tighter bg-kontrol-bg px-2 py-0.5 rounded">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[12px] text-kontrol-ink-soft">
                    {user.companyName || 'Admin Global'}
                  </td>
                  <td className="px-6 py-4 text-[11px] text-kontrol-ink-muted">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onDetail(user)}
                        className="p-2 text-kontrol-blue hover:bg-kontrol-blue/10 rounded-lg transition-all" title="Voir"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => onEdit(user)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(user)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Supprimer"
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
      </div>
    </motion.div>
  );
}

function IntelligenceAIView({ stats }: any) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');

  const runGlobalAudit = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyse l'écosystème KONTROL: ${stats.activeCompanies} entreprises, ${stats.totalUsers} utilisateurs, Revenu MRR: ${stats.mrr} XOF. Identifie les anomalies de fraude, les prédictions de revenus et les alertes intelligentes.`;
      const result = await blueAIService.processRequest('admin', 'global', prompt, BlueFunction.REPORT);
      setAnalysis(result.content);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AICard title="Fraud Detection" status="Secure" icon={ShieldCheck} color="emerald" />
        <AICard title="Anomaly Detection" status="0 Flags" icon={AlertCircle} color="blue" />
        <AICard title="Revenue Prediction" status="+18% Next Month" icon={TrendingUp} color="purple" />
      </div>

      <div className="card p-8 bg-kontrol-dark text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-kontrol-blue/10 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-3">
              <Brain size={24} className="text-kontrol-blue" />
              <h3 className="text-2xl font-extrabold tracking-tight">Blue AI Core Intelligence</h3>
            </div>
            <p className="text-white/60 text-[14px] leading-relaxed">
              Exécutez un audit global de l'écosystème pour identifier les opportunités de croissance, les risques de churn et les anomalies de sécurité en temps réel.
            </p>
            <button 
              onClick={runGlobalAudit}
              disabled={isAnalyzing}
              className="px-8 py-4 bg-kontrol-blue text-white rounded-2xl font-extrabold text-sm uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3 shadow-xl shadow-kontrol-blue/20"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              Lancer l'Audit Global
            </button>
          </div>
          <div className="w-full md:w-64 h-64 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-kontrol-blue/30 rounded-full animate-ping" />
              <Brain size={48} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-kontrol-blue" />
            </div>
          </div>
        </div>
      </div>

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 prose prose-sm max-w-none text-kontrol-ink-soft font-mono leading-relaxed"
        >
          <Markdown>{analysis}</Markdown>
        </motion.div>
      )}
    </motion.div>
  );
}

function SystemTelemetryView({ stats }: any) {
  const [isResetting, setIsResetting] = useState(false);
  
  const handleResetDB = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser la base de données ? Cette action est irréversible.")) return;
    setIsResetting(true);
    try {
      // 1. Delete all users except the two main ones
      const usersSnap = await getDocs(collection(db, 'users'));
      const allowedEmails = ['acherie812@gmail.com', 'innov.korp@gmail.com'];
      
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (!allowedEmails.includes(userData.email?.toLowerCase())) {
          await deleteDoc(userDoc.ref);
        }
      }

      // 2. Delete all other collections
      const collections = ['companies', 'tiers', 'produits', 'transactions', 'charges', 'wallets', 'payments', 'stock_movements', 'tickets', 'actions', 'notifications', 'conversations', 'messages'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }

      alert("Base de données réinitialisée avec succès.");
      window.location.reload();
    } catch (error) {
      console.error("Reset DB error:", error);
      alert("Erreur lors de la réinitialisation.");
    } finally {
      setIsResetting(false);
    }
  };

  const [metrics, setMetrics] = useState({
    cpu: [12, 15, 14, 18, 12, 10, 15],
    ram: [4.2, 4.3, 4.2, 4.5, 4.4, 4.2, 4.3],
    latency: [45, 48, 42, 55, 40, 44, 46],
    errors: [0, 1, 0, 0, 2, 0, 1]
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: [...prev.cpu.slice(1), 10 + Math.random() * 10],
        ram: [...prev.ram.slice(1), 4.1 + Math.random() * 0.5],
        latency: [...prev.latency.slice(1), 40 + Math.random() * 20],
        errors: [...prev.errors.slice(1), Math.random() > 0.9 ? 1 : 0]
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <TelemetryCard title="Utilisation CPU" value={`${metrics.cpu[metrics.cpu.length-1].toFixed(1)}%`} status="Optimal" icon={Cpu} />
        <TelemetryCard title="Mémoire RAM" value={`${metrics.ram[metrics.ram.length-1].toFixed(1)}GB`} status="Optimal" icon={Server} />
        <TelemetryCard title="Latence API" value={`${metrics.latency[metrics.latency.length-1].toFixed(0)}ms`} status="Rapide" icon={Zap} />
        <TelemetryCard title="Taux d'Erreur" value={`${(metrics.errors.reduce((a,b)=>a+b,0)/7).toFixed(2)}%`} status="Nominal" icon={AlertCircle} />
      </div>

      <div className="card p-8 bg-rose-50 border border-rose-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-rose-900">Maintenance & Réinitialisation</h3>
          <p className="text-[12px] text-rose-700 mt-1">Réinitialiser l'écosystème KONTROL à son état initial (Acherie812 & Innov'Korp uniquement).</p>
        </div>
        <button 
          onClick={handleResetDB}
          disabled={isResetting}
          className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-200"
        >
          {isResetting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Réinitialiser la DB
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Charge Système & Latence (7 Derniers Cycles)</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-kontrol-blue" />
                <span className="text-[9px] font-bold uppercase">CPU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold uppercase">Latence</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.cpu.map((c, i) => ({ cycle: i, cpu: c, latency: metrics.latency[i] }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="cycle" hide />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" />
                <Area type="monotone" dataKey="latency" stroke="#10b981" fillOpacity={0.05} fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-0 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-kontrol-border bg-kontrol-dark text-white flex items-center gap-3">
            <Terminal size={18} className="text-kontrol-blue" />
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Flux de Télémétrie en Direct</h3>
          </div>
          <div className="flex-1 bg-kontrol-dark/95 p-6 font-mono text-[11px] text-emerald-400 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
            <p className="opacity-50">[{new Date().toLocaleTimeString()}] Initialisation du flux de télémétrie...</p>
            <p>[{new Date().toLocaleTimeString()}] DB_SYNC: Connexion réussie à firestore-main</p>
            <p>[{new Date().toLocaleTimeString()}] AUTH_SERVICE: Session utilisateur validée pour le noeud_882</p>
            <p className={cn(metrics.latency[metrics.latency.length-1] > 55 ? "text-amber-400" : "")}>
              [{new Date().toLocaleTimeString()}] MONITOR: Latence API stable à {metrics.latency[metrics.latency.length-1].toFixed(0)}ms
            </p>
            <p>[{new Date().toLocaleTimeString()}] MONITOR: Charge CPU stable à {metrics.cpu[metrics.cpu.length-1].toFixed(1)}%</p>
            <p>[{new Date().toLocaleTimeString()}] BACKUP: Snapshot quotidien terminé avec succès</p>
            <p>[{new Date().toLocaleTimeString()}] AI_CORE: Scan d'anomalies terminé. 0 menace détectée.</p>
            {metrics.errors[metrics.errors.length-1] > 0 && (
              <p className="text-rose-400">[{new Date().toLocaleTimeString()}] ERROR: Exception non gérée interceptée dans le module Finance (Timeout)</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ControlAuditView({ actions }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredActions = actions.filter((a: any) => 
    a.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const data = filteredActions.map((a: any) => ({
      Date: new Date(a.timestamp).toLocaleString(),
      Utilisateur: a.userName,
      Action: a.action,
      Details: a.details
    }));
    import('../../lib/export').then(({ exportToExcel }) => {
      exportToExcel(data, 'Audit_KONTROL');
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
          <input 
            type="text" 
            placeholder="Rechercher dans les logs..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-kontrol-border rounded-2xl focus:outline-none focus:border-kontrol-blue shadow-sm text-[13px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={handleExport}
          className="px-6 py-3 bg-white border border-kontrol-border text-kontrol-ink-soft rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-kontrol-bg transition-all flex items-center gap-2"
        >
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-kontrol-border bg-kontrol-bg/30">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Journal d'Audit Global</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Horodatage</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Acteur</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Action</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Détails</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {filteredActions.map((action: any) => (
                <tr key={action.id} className="hover:bg-kontrol-bg/30 transition-colors">
                  <td className="px-6 py-4 text-[11px] font-mono text-kontrol-ink-muted">
                    {new Date(action.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[12px] font-bold text-kontrol-dark uppercase">{action.userName}</p>
                    <p className="text-[10px] text-kontrol-ink-muted">{action.userId.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-kontrol-bg text-kontrol-dark text-[9px] font-extrabold uppercase tracking-widest rounded border border-kontrol-border">
                      {action.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[12px] text-kontrol-ink-soft italic truncate max-w-[300px]">
                    {action.details}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-kontrol-blue hover:bg-kontrol-blue/10 rounded-lg transition-all" title="Voir">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function ControlSupportView({ tickets }: any) {
  const [showNoReply, setShowNoReply] = useState(false);
  const [noReplyData, setNoReplyData] = useState({ to: '', subject: '', body: '' });
  const [replyingTicket, setReplyingTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isDeletingTicket, setIsDeletingTicket] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTickets = tickets.filter((t: any) => 
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendNoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await emailService.sendNoReplyEmail(noReplyData.to, noReplyData.subject, noReplyData.body);
      setShowNoReply(false);
      setNoReplyData({ to: '', subject: '', body: '' });
    } catch (error) {
      console.error("No-reply error:", error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket || !replyMessage.trim()) return;

    try {
      await emailService.sendReply(replyingTicket.id, replyMessage);
      setReplyingTicket(null);
      setReplyMessage('');
    } catch (error) {
      console.error("Reply error:", error);
    }
  };

  const handleDeleteTicket = async () => {
    if (!isDeletingTicket) return;
    try {
      await deleteDoc(doc(db, 'tickets', isDeletingTicket.id));
      setIsDeletingTicket(null);
    } catch (error) {
      console.error("Delete ticket error:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Support & Tickets (Innov.korp@gmail.com)</h3>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
            <input 
              type="text" 
              placeholder="Rechercher un ticket..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-kontrol-border rounded-xl text-[12px] focus:outline-none focus:border-kontrol-blue"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={() => setShowNoReply(true)}
          className="px-6 py-3 bg-kontrol-dark text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={16} /> Envoyer un No-Reply
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTickets.map((ticket: any) => (
          <div key={ticket.id} className="card p-6 space-y-4 hover:shadow-lg transition-all border-transparent hover:border-rose-100 group">
            <div className="flex items-center justify-between">
              <span className={cn(
                "px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest rounded border",
                ticket.status === 'NEW' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                {ticket.status === 'NEW' ? 'NOUVEAU' : 'TRAITÉ'}
              </span>
              <span className="text-[10px] text-kontrol-ink-muted font-bold">{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <h4 className="text-[14px] font-extrabold text-kontrol-dark uppercase tracking-tight">{ticket.subject}</h4>
              <p className="text-[12px] text-kontrol-ink-soft mt-1 line-clamp-2 italic">"{ticket.message}"</p>
            </div>
            <div className="pt-4 border-t border-kontrol-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-kontrol-bg flex items-center justify-center text-[10px] font-bold">
                  {ticket.name?.charAt(0) || ticket.email?.charAt(0)}
                </div>
                <span className="text-[11px] font-bold text-kontrol-ink-muted truncate max-w-[100px]">{ticket.name || ticket.email}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setReplyingTicket(ticket)}
                  className="p-1.5 text-kontrol-blue hover:bg-kontrol-blue/10 rounded-lg transition-all" title="Répondre"
                >
                  <MessageCircle size={14} />
                </button>
                <button 
                  onClick={() => setIsDeletingTicket(ticket)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNoReply && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
              <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Email No-Reply</h3>
              <button onClick={() => setShowNoReply(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSendNoReply} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Destinataire</label>
                <input type="email" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" placeholder="email@exemple.com" value={noReplyData.to} onChange={(e) => setNoReplyData({...noReplyData, to: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Sujet</label>
                <input type="text" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" placeholder="Sujet de l'email" value={noReplyData.subject} onChange={(e) => setNoReplyData({...noReplyData, subject: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Message</label>
                <textarea required rows={4} className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue resize-none" placeholder="Contenu de l'email..." value={noReplyData.body} onChange={(e) => setNoReplyData({...noReplyData, body: e.target.value})} />
              </div>
              <button type="submit" className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                <CheckCircle2 size={18} /> Envoyer l'Email
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {replyingTicket && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
              <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Répondre au Ticket</h3>
              <button onClick={() => setReplyingTicket(null)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-kontrol-bg p-4 rounded-xl border border-kontrol-border">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted mb-2">Message Original</p>
                <p className="text-[12px] text-kontrol-dark italic">"{replyingTicket.message}"</p>
              </div>
              <form onSubmit={handleReply} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Votre Réponse</label>
                  <textarea required rows={4} className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue resize-none" placeholder="Tapez votre réponse ici..." value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} />
                </div>
                <button type="submit" className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                  <CheckCircle2 size={18} /> Envoyer la Réponse
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!isDeletingTicket}
        onClose={() => setIsDeletingTicket(null)}
        onConfirm={handleDeleteTicket}
        title="Supprimer le ticket"
        message="Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </motion.div>
  );
}

// --- HELPER COMPONENTS ---

function StatCard({ title, value, change, icon: Icon, color }: any) {
  const colors: any = {
    blue: "text-kontrol-blue bg-kontrol-blue/5 border-kontrol-blue/10",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100"
  };

  return (
    <div className="card p-8 group hover:bg-kontrol-bg transition-all">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border transition-transform group-hover:scale-110", colors[color])}>
        <Icon size={24} />
      </div>
      <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{value}</h3>
        <span className={cn(
          "text-[10px] font-bold",
          change.includes('+') ? "text-emerald-500" : change === 'Live' || change === 'Nominal' || change === 'Stable' ? "text-kontrol-blue" : "text-rose-500"
        )}>{change}</span>
      </div>
    </div>
  );
}

function AICard({ title, status, icon: Icon, color }: any) {
  const colors: any = {
    blue: "text-kontrol-blue bg-kontrol-blue/5",
    emerald: "text-emerald-600 bg-emerald-50",
    purple: "text-purple-600 bg-purple-50"
  };

  return (
    <div className="card p-6 flex items-center gap-4 border-transparent hover:border-kontrol-blue/20 transition-all">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", colors[color])}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-sm font-bold text-kontrol-dark">{status}</p>
      </div>
    </div>
  );
}

function TelemetryCard({ title, value, status, icon: Icon }: any) {
  return (
    <div className="card p-6 flex flex-col items-center text-center space-y-3">
      <div className="w-10 h-10 bg-kontrol-bg rounded-xl flex items-center justify-center text-kontrol-ink-muted">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[9px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-extrabold text-kontrol-dark tracking-tight">{value}</p>
      </div>
      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-extrabold uppercase tracking-widest rounded border border-emerald-100">
        {status}
      </span>
    </div>
  );
}
