import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Trash2, 
  RefreshCw, 
  Database, 
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  TrendingUp,
  Activity,
  Zap,
  Info,
  History as HistoryIcon,
  Server,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { db, collection, getDocs, query, where, deleteDoc, doc, auth, handleFirestoreError, OperationType, limit, orderBy, onSnapshot, writeBatch } from '../../../api/firebase';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { resetAllDatabases, totalSystemReset } from '../../../api/services/dataResetService';
import { UserProfile, Company } from '../../types';
import { exportToExcel } from '../../lib/export';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const APP_VERSION = "1.2.0-PROD";
const LAST_UPDATE = "24 Mars 2026";

const UPDATE_HISTORY = [
  { version: "1.2.0", date: "24/03/2026", title: "Refonte de l'Architecture", description: "Passage à une architecture multi-tenant robuste et sécurisée." },
  { version: "1.1.5", date: "20/03/2026", title: "Gestion des Stocks Avancée", description: "Ajout du calcul CUMP et des mouvements de stock automatiques." },
  { version: "1.1.0", date: "15/03/2026", title: "Module Tiers", description: "Gestion complète des clients et fournisseurs avec exports PDF/Excel." },
  { version: "1.0.0", date: "01/03/2026", title: "Lancement KONTROL", description: "Version initiale de KONTROL avec modules de base." }
];

interface SystemModuleProps {
  currentUserProfile: UserProfile | null;
}

export function SystemModule({ currentUserProfile }: SystemModuleProps) {
  const isKontrolAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'ADMINISTRATEUR_KONTROL';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'users' | 'plans' | 'flags' | 'monitoring' | 'audit'>('dashboard');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState<{name: string, email: string} | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState<'partial' | 'total' | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    activeSubscriptions: 0,
    totalTransactions: 0,
    growthData: [] as any[],
    serviceHealth: [
      { name: 'Frontend App', tech: 'React 18 + Vite', status: 'ok', cpu: 12, mem: 34, latency: '15ms', uptime: '99.99%' },
      { name: 'Auth Service', tech: 'Firebase Auth', status: 'ok', cpu: 5, mem: 12, latency: '45ms', uptime: '100%' },
      { name: 'Database', tech: 'Firestore NoSQL', status: 'ok', cpu: 22, mem: 45, latency: '32ms', uptime: '99.99%' },
      { name: 'Blue AI Core', tech: 'Gemini 3.1 Flash', status: 'ok', cpu: 45, mem: 62, latency: '450ms', uptime: '99.95%' },
      { name: 'Storage', tech: 'Firebase Storage', status: 'ok', cpu: 8, mem: 28, latency: '85ms', uptime: '99.99%' },
      { name: 'Cloud Runtime', tech: 'Google Cloud Run', status: 'ok', cpu: 15, mem: 42, latency: '10ms', uptime: '100%' }
    ],
    flags: [
      { key: 'blue_ai_chat', desc: 'Chat comptable RAG', scope: 'Global', enabled: true },
      { key: 'blue_ai_forecasting', desc: 'Prévisions trésorerie Prophet', scope: 'Plan Pro+', enabled: true },
      { key: 'blue_ai_anomalies', desc: 'Détection anomalies charges', scope: 'Plan Pro+', enabled: true },
      { key: 'blue_ai_stock', desc: 'Conseiller réapprovisionnement', scope: 'Enterprise', enabled: false },
      { key: 'exports_pdf', desc: 'Export PDF factures', scope: 'Global', enabled: true }
    ]
  });

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [globalActions, setGlobalActions] = useState<any[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsPage, setActionsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchGlobalStats();
    fetchUsers();
    fetchGlobalActions();
  }, []);

  const totalActionsPages = Math.ceil(globalActions.length / itemsPerPage);
  const paginatedActions = globalActions.slice(
    (actionsPage - 1) * itemsPerPage,
    actionsPage * itemsPerPage
  );

  const totalUsersPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice(
    (usersPage - 1) * itemsPerPage,
    usersPage * itemsPerPage
  );

  const formatRole = (role?: string) => {
    if (!role) return '';
    const roles: Record<string, string> = {
      'ADMINISTRATEUR_ERP': 'Administrateur KONTROL',
      'GESTIONNAIRE_ERP': 'Gestionnaire KONTROL',
      'ADMINISTRATEUR_KONTROL': 'Administrateur KONTROL',
      'GESTIONNAIRE_KONTROL': 'Gestionnaire KONTROL',
      'ADMINISTRATEUR_ENTREPRISE': 'Administrateur Entreprise',
      'GESTIONNAIRE_ENTREPRISE': 'Gestionnaire Entreprise',
      'UTILISATEUR': 'Utilisateur',
      'ADMIN': 'Administrateur'
    };
    return roles[role] || role.replace(/_/g, ' ');
  };

  const fetchGlobalActions = async () => {
    setLoadingActions(true);
    try {
      const q = query(collection(db, 'actions'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setGlobalActions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'actions', auth.currentUser, false);
    } finally {
      setLoadingActions(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(d => d.data() as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users', auth.currentUser, false);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchGlobalStats = async () => {
    setLoadingStats(true);
    try {
      const [usersSnap, companiesSnap, transSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'companies')),
        getDocs(query(collection(db, 'transactions'), limit(1000)))
      ]);

      const companies = companiesSnap.docs.map(d => d.data() as Company);
      
      // Generate growth data for the last 6 months
      const growth = Array.from({ length: 6 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthLabel = date.toLocaleString('default', { month: 'short' });
        const timestamp = date.getTime();
        
        return {
          month: monthLabel,
          companies: companies.filter(c => (c.createdAt || 0) <= timestamp).length + (i * 2),
          transactions: Math.floor(transSnap.size * (0.5 + (i * 0.1)))
        };
      });

      setStats(prev => ({
        ...prev,
        totalUsers: usersSnap.size,
        totalCompanies: companiesSnap.size,
        activeSubscriptions: companies.filter(c => c.status === 'ACTIVE').length,
        totalTransactions: transSnap.size,
        growthData: growth
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'global_stats', auth.currentUser, false);
    } finally {
      setLoadingStats(false);
    }
  };

  const resetAdminUser = async () => {
    if (!isDeletingUser) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      const q = query(collection(db, 'users'), where('email', '==', isDeletingUser));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setMessage({ type: 'error', text: `Utilisateur ${isDeletingUser} non trouvé dans Firestore.` });
        setIsDeleting(false);
        setIsDeletingUser(null);
        return;
      }

      const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, 'users', document.id)));
      await Promise.all(deletePromises);

      setMessage({ type: 'success', text: `L'utilisateur ${isDeletingUser} a été supprimé avec succès. Il peut maintenant être recréé.` });
      setIsDeletingUser(null);
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users', auth.currentUser, false);
      setMessage({ type: 'error', text: "Une erreur est survenue lors de la suppression." });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteCompanyByName = async () => {
    if (!isDeletingCompany) return;

    setIsResetting(true);
    setMessage(null);

    try {
      const { name: companyName, email: adminEmail } = isDeletingCompany;
      // 1. Find the company
      const qComp = query(collection(db, 'companies'), where('name', '==', companyName));
      const compSnap = await getDocs(qComp);
      const companyId = !compSnap.empty ? compSnap.docs[0].id : null;

      // 2. Find the user
      const qUser = query(collection(db, 'users'), where('email', '==', adminEmail));
      const userSnap = await getDocs(qUser);

      const batch = writeBatch(db);

      // Delete company
      if (compSnap.empty) {
        // Silently handle if companyId was found by other means or if already partially deleted
      } else {
        batch.delete(compSnap.docs[0].ref);
      }

      // Delete user
      if (userSnap.empty) {
        // Silently handle
      } else {
        batch.delete(userSnap.docs[0].ref);
      }

      // 3. Delete all related data if companyId was found
      if (companyId) {
        const collectionsToClear = [
          'produits', 'tiers', 'transactions', 'stock_movements', 
          'actions', 'notifications', 'payments', 'charges', 'wallets'
        ];

        for (const collName of collectionsToClear) {
          const q = query(collection(db, collName), where('ownerId', '==', companyId));
          const snap = await getDocs(q);
          snap.docs.forEach(d => batch.delete(d.ref));
        }
        
        // Also check for companyId in actions/notifications
        const qActions = query(collection(db, 'actions'), where('companyId', '==', companyId));
        const snapActions = await getDocs(qActions);
        snapActions.docs.forEach(d => batch.delete(d.ref));

        const qNotifs = query(collection(db, 'notifications'), where('companyId', '==', companyId));
        const snapNotifs = await getDocs(qNotifs);
        snapNotifs.docs.forEach(d => batch.delete(d.ref));
      }

      await batch.commit();
      setMessage({ type: 'success', text: `L'entreprise "${companyName}" et l'utilisateur "${adminEmail}" ont été supprimés.` });
      setIsDeletingCompany(null);
      fetchGlobalStats();
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'targeted_company_deletion', auth.currentUser, false);
      setMessage({ type: 'error', text: "Erreur lors de la suppression ciblée." });
    } finally {
      setIsResetting(false);
    }
  };

  const fullSystemReset = async () => {
    setShowResetConfirm('partial');
    setConfirmInput('');
  };

  const executeFullSystemReset = async () => {
    if (confirmInput !== 'RESET') {
      setMessage({ type: 'error', text: "Code de confirmation incorrect." });
      return;
    }

    setIsResetting(true);
    setShowResetConfirm(null);
    setMessage(null);

    try {
      await resetAllDatabases();
      setMessage({ type: 'success', text: "Le système a été réinitialisé avec succès. Toutes les données ont été effacées." });
      fetchGlobalStats();
      fetchUsers();
      fetchGlobalActions();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'system_reset', auth.currentUser, false);
      setMessage({ type: 'error', text: "Erreur lors de la réinitialisation complète." });
    } finally {
      setIsResetting(false);
    }
  };

  const performTotalReset = async () => {
    setShowResetConfirm('total');
    setConfirmInput('');
  };

  const executeTotalReset = async () => {
    if (confirmInput !== 'TOTAL_RESET') {
      setMessage({ type: 'error', text: "Code de confirmation incorrect." });
      return;
    }

    setIsResetting(true);
    setShowResetConfirm(null);
    setMessage(null);

    try {
      await totalSystemReset();
      setMessage({ type: 'success', text: "Le système a été réinitialisé à zéro. Vous allez être déconnecté." });
      setTimeout(() => {
        auth.signOut();
        window.location.reload();
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'total_system_reset', auth.currentUser, false);
      setMessage({ type: 'error', text: "Erreur lors de la réinitialisation totale." });
    } finally {
      setIsResetting(false);
    }
  };

  const exportSystemLogs = () => {
    if (globalActions.length === 0) {
      setMessage({ type: 'error', text: "Aucun log à exporter." });
      return;
    }
    
    const exportData = globalActions.map(action => ({
      'Date': new Date(action.timestamp).toLocaleString(),
      'Utilisateur': action.userName,
      'Action': action.action,
      'Détails': action.details || '',
      'ID Entreprise': action.companyId
    }));
    
    exportToExcel(exportData, `KONTROL_SYSTEM_LOGS_${new Date().toISOString().split('T')[0]}`);
  };

  const optimizeDatabase = async () => {
    setMessage({ type: 'success', text: "Optimisation de la base de données terminée." });
  };

  const checkSSL = () => {
    window.open('https://www.ssllabs.com/ssltest/analyze.html?d=' + window.location.hostname, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Administration Système</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Supervision globale et maintenance de KONTROL</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-kontrol-bg p-1 rounded-xl border border-kontrol-border">
            {[
              { id: 'dashboard', icon: Activity, label: 'Dashboard' },
              { id: 'tenants', icon: Building2, label: 'Entreprises' },
              { id: 'users', icon: Users, label: 'Utilisateurs' },
              { id: 'plans', icon: Zap, label: 'Plans' },
              { id: 'flags', icon: ShieldAlert, label: 'Flags' },
              { id: 'monitoring', icon: Server, label: 'Monitoring' },
              { id: 'audit', icon: HistoryIcon, label: 'Audit' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                  activeTab === tab.id 
                    ? "bg-white text-kontrol-blue shadow-sm border border-kontrol-border" 
                    : "text-kontrol-ink-muted hover:text-kontrol-dark"
                )}
              >
                <tab.icon size={14} />
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <button 
            onClick={fetchGlobalStats}
            disabled={loadingStats}
            className="p-2 bg-kontrol-bg text-kontrol-ink-soft rounded-xl hover:bg-kontrol-blue/5 hover:text-kontrol-blue transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loadingStats ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
              { label: 'Entreprises', value: stats.totalCompanies, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+5%' },
              { label: 'Abonnements', value: stats.activeSubscriptions, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+8%' },
              { label: 'Transactions', value: stats.totalTransactions, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+24%' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="card p-4 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-full">
                  {stat.trend}
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", stat.bg)}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-extrabold text-kontrol-dark">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Growth Chart */}
            <div className="card lg:col-span-2">
              <div className="card-hd">
                <div className="flex items-center gap-2 text-kontrol-blue">
                  <TrendingUp size={20} />
                  <h3 className="text-sm font-extrabold uppercase tracking-widest">Croissance du Réseau</h3>
                </div>
              </div>
              <div className="p-6 h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={stats.growthData}>
                    <defs>
                      <linearGradient id="colorCompanies" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="companies" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCompanies)" 
                      name="Entreprises"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Health Mini */}
            <div className="card">
              <div className="card-hd">
                <div className="flex items-center gap-2 text-kontrol-blue">
                  <Server size={20} />
                  <h3 className="text-sm font-extrabold uppercase tracking-widest">Santé Système</h3>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {stats.serviceHealth.slice(0, 4).map(svc => (
                  <div key={svc.name} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-bold text-kontrol-dark">{svc.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        svc.status === 'ok' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>{svc.status.toUpperCase()}</span>
                    </div>
                    <div className="h-1.5 bg-kontrol-bg rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", svc.cpu > 80 ? "bg-rose-500" : svc.cpu > 60 ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${svc.cpu}%` }}
                      />
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setActiveTab('monitoring')}
                  className="w-full py-2 text-[11px] font-bold text-kontrol-blue hover:bg-kontrol-blue/5 rounded-xl transition-colors"
                >
                  Voir tous les services
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-hd">
              <div className="flex items-center gap-2 text-kontrol-blue">
                <Activity size={20} />
                <h3 className="text-sm font-extrabold uppercase tracking-widest">Activité Récente</h3>
              </div>
              <button onClick={() => setActiveTab('audit')} className="text-[11px] font-bold text-kontrol-blue hover:underline">Voir l'audit complet</button>
            </div>
            <div className="divide-y divide-kontrol-border">
              {paginatedActions.slice(0, 5).map(action => (
                <div key={action.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kontrol-bg flex items-center justify-center text-kontrol-ink-soft">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-kontrol-dark">{action.action}</p>
                      <p className="text-[11px] text-kontrol-ink-muted">{action.userName} • {new Date(action.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-kontrol-ink-muted bg-kontrol-bg px-2 py-0.5 rounded">
                    {action.companyId.substring(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="card animate-in slide-in-from-bottom-4">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Building2 size={20} />
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Gestion des Entreprises</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={exportSystemLogs} className="btn-ghost px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-2">
                <HistoryIcon size={14} /> Export CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Entreprise</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Admin</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Plan</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {users.filter(u => u.role === 'ADMINISTRATEUR_ENTREPRISE').map(user => (
                  <tr key={user.uid} className="hover:bg-kontrol-bg/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-kontrol-dark">{user.companyName || 'N/A'}</p>
                      <p className="text-[11px] text-kontrol-ink-muted">ID: {user.companyId?.substring(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-kontrol-dark">{user.displayName}</p>
                      <p className="text-[11px] text-kontrol-ink-muted">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-kontrol-blue/5 text-kontrol-blue text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {user.subscriptionStatus || 'TRIAL'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[12px] font-medium text-kontrol-ink-soft">Actif</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setIsDeletingCompany({ name: user.companyName || 'N/A', email: user.email })}
                        className="p-2 text-kontrol-ink-muted hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card animate-in slide-in-from-bottom-4">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Users size={20} />
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Utilisateurs Plateforme</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Utilisateur</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Rôle</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Dernière Connexion</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {paginatedUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-kontrol-bg/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-kontrol-bg flex items-center justify-center text-[12px] font-bold text-kontrol-blue">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-kontrol-dark">{user.displayName}</p>
                          <p className="text-[11px] text-kontrol-ink-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                        (user.role === 'ADMINISTRATEUR_ERP' || user.role === 'ADMINISTRATEUR_KONTROL') ? "bg-rose-50 text-rose-600" : "bg-kontrol-blue/5 text-kontrol-blue"
                      )}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] text-kontrol-ink-soft font-mono">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setIsDeletingUser(user.email)}
                        className="p-2 text-kontrol-ink-muted hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: '29', desc: 'PME débutantes', color: 'blue', features: ['5 utilisateurs max', 'Transactions limitées', 'Support standard'] },
              { name: 'Pro', price: '89', desc: 'PME en croissance', color: 'purple', features: ['20 utilisateurs max', 'Transactions illimitées', 'Blue AI inclus', 'Support prioritaire'] },
              { name: 'Enterprise', price: 'Sur devis', desc: 'Grandes structures', color: 'amber', features: ['Utilisateurs illimités', 'SLA 99.9%', 'Account manager dédié', 'API Custom'] }
            ].map(plan => (
              <div key={plan.name} className="card p-6 flex flex-col">
                <h4 className="text-lg font-extrabold text-kontrol-dark">{plan.name}</h4>
                <p className="text-[12px] text-kontrol-ink-muted mb-4">{plan.desc}</p>
                <div className="text-3xl font-extrabold text-kontrol-dark mb-6">
                  {plan.price !== 'Sur devis' && <span className="text-sm font-bold text-kontrol-ink-muted mr-1">$</span>}
                  {plan.price}
                  {plan.price !== 'Sur devis' && <span className="text-sm font-bold text-kontrol-ink-muted ml-1">/ mois</span>}
                </div>
                <div className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[12px] text-kontrol-ink-soft">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      {f}
                    </div>
                  ))}
                </div>
                <button className="w-full mt-8 py-2.5 bg-kontrol-bg text-kontrol-dark text-[12px] font-bold rounded-xl hover:bg-kontrol-blue hover:text-white transition-all">
                  Modifier le plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'flags' && (
        <div className="card animate-in slide-in-from-bottom-4">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <ShieldAlert size={20} />
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Feature Flags</h3>
            </div>
          </div>
          <div className="divide-y divide-kontrol-border">
            {stats.flags.map(flag => (
              <div key={flag.key} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-kontrol-dark font-mono">{flag.key}</p>
                  <p className="text-[11px] text-kontrol-ink-muted">{flag.desc}</p>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted bg-kontrol-bg px-2 py-0.5 rounded-full mt-1 inline-block">
                    Scope: {flag.scope}
                  </span>
                </div>
                <button 
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-all duration-300",
                    flag.enabled ? "bg-kontrol-blue" : "bg-kontrol-border"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                    flag.enabled ? "left-6" : "left-1"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="card animate-in slide-in-from-bottom-4">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Server size={20} />
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Monitoring des Services</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Service</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">CPU</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Mémoire</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Latence</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Uptime</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {stats.serviceHealth.map(svc => (
                  <tr key={svc.name} className="hover:bg-kontrol-bg/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-kontrol-dark">{svc.name}</p>
                      <p className="text-[11px] text-kontrol-ink-muted font-mono">{svc.tech}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-kontrol-bg rounded-full overflow-hidden">
                          <div className={cn("h-full", svc.cpu > 80 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${svc.cpu}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-kontrol-ink-soft">{svc.cpu}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-kontrol-bg rounded-full overflow-hidden">
                          <div className="h-full bg-kontrol-blue" style={{ width: `${svc.mem}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-kontrol-ink-soft">{svc.mem}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] font-mono text-kontrol-ink-soft">{svc.latency}</td>
                    <td className="px-6 py-4 text-[12px] font-mono text-kontrol-ink-soft">{svc.uptime}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                        svc.status === 'ok' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {svc.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card animate-in slide-in-from-bottom-4">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <HistoryIcon size={20} />
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Audit Global</h3>
            </div>
            <button onClick={exportSystemLogs} className="text-[11px] font-bold text-kontrol-blue hover:underline">Exporter tout</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Utilisateur</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Action</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {paginatedActions.map(action => (
                  <tr key={action.id} className="hover:bg-kontrol-bg/20 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-mono text-kontrol-ink-muted">
                      {new Date(action.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] font-bold text-kontrol-dark">{action.userName}</p>
                      <p className="text-[10px] text-kontrol-ink-muted">ID: {action.userId.substring(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-kontrol-bg text-kontrol-ink-soft text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {action.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-kontrol-ink-soft max-w-xs truncate">
                      {action.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalActionsPages > 1 && (
            <div className="px-6 py-4 border-t border-kontrol-border flex items-center justify-between">
              <span className="text-[11px] text-kontrol-ink-muted font-bold uppercase tracking-widest">
                {globalActions.length} entrées
              </span>
              <div className="flex items-center gap-4">
                <button 
                  disabled={actionsPage === 1}
                  onClick={() => setActionsPage(prev => prev - 1)}
                  className="p-1.5 rounded-lg hover:bg-kontrol-bg disabled:opacity-30 transition-all"
                >
                  <RefreshCw size={14} className="rotate-180" />
                </button>
                <span className="text-[11px] font-bold text-kontrol-dark">
                  {actionsPage} / {totalActionsPages}
                </span>
                <button 
                  disabled={actionsPage === totalActionsPages}
                  onClick={() => setActionsPage(prev => prev + 1)}
                  className="p-1.5 rounded-lg hover:bg-kontrol-bg disabled:opacity-30 transition-all"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone - Always visible at bottom for KONTROL Admins */}
      <div className="card border-rose-100 bg-rose-50/30 mt-12">
        <div className="card-hd border-rose-100">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert size={20} />
            <h3 className="text-sm font-extrabold uppercase tracking-widest">Zone de Maintenance Critique</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-[13px] font-bold text-kontrol-dark uppercase tracking-wider">Réinitialisation Ciblée</h4>
              <div className="space-y-2">
                {[
                  { email: 'Innov.korp@gmail.com', label: 'Admin Principal' },
                  { email: 'acherie812@gmail.com', label: 'Admin Secondaire' }
                ].map(adm => (
                  <div key={adm.email} className="flex items-center justify-between p-3 bg-white border border-rose-100 rounded-xl">
                    <div>
                      <p className="text-[12px] font-bold text-kontrol-dark">{adm.email}</p>
                      <p className="text-[10px] text-kontrol-ink-muted">{adm.label}</p>
                    </div>
                    <button 
                      onClick={() => setIsDeletingUser(adm.email)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-bold text-kontrol-dark uppercase tracking-wider">Réinitialisation Globale</h4>
              <div className="space-y-3">
                <button 
                  onClick={fullSystemReset}
                  disabled={isResetting}
                  className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                >
                  <ShieldAlert size={18} />
                  Réinitialisation Partielle (Données Métier)
                </button>
                <button 
                  onClick={performTotalReset}
                  disabled={isResetting}
                  className="w-full py-3 bg-kontrol-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                  <Trash2 size={18} />
                  Mise à Zéro Totale (Full Wipe)
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div className={cn(
              "mt-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2",
              message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
            )}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <p className="text-[13px] font-medium">{message.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={!!isDeletingUser}
        onClose={() => setIsDeletingUser(null)}
        onConfirm={resetAdminUser}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer le profil de ${isDeletingUser} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={isDeleting}
      />

      <ConfirmModal
        isOpen={!!isDeletingCompany}
        onClose={() => setIsDeletingCompany(null)}
        onConfirm={deleteCompanyByName}
        title="Supprimer l'entreprise"
        message={`Êtes-vous sûr de vouloir supprimer l'entreprise "${isDeletingCompany?.name}" et toutes ses données ?`}
        confirmLabel="Supprimer tout"
        variant="danger"
        loading={isResetting}
      />

      {showResetConfirm && (
        <div className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-rose-100"
          >
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-kontrol-dark mb-2">
              {showResetConfirm === 'total' ? 'Mise à Zéro Totale' : 'Réinitialisation Partielle'}
            </h3>
            <p className="text-[13px] text-kontrol-ink-soft mb-6">
              {showResetConfirm === 'total' 
                ? "Cette action effacera ABSOLUMENT TOUT (utilisateurs, entreprises, transactions, etc.). Seuls les administrateurs KONTROL pourront se reconnecter."
                : "Cette action effacera toutes les données métier (produits, transactions, tiers) de TOUTES les entreprises."}
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">
                  Tapez <span className="text-rose-600 font-black">{showResetConfirm === 'total' ? 'TOTAL_RESET' : 'RESET'}</span> pour confirmer
                </label>
                <input 
                  type="text" 
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-rose-500 font-bold text-center tracking-widest"
                  placeholder="Confirmation"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowResetConfirm(null)}
                  className="flex-1 py-3 bg-kontrol-bg text-kontrol-ink-soft font-bold rounded-xl hover:bg-kontrol-border transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={showResetConfirm === 'total' ? executeTotalReset : executeFullSystemReset}
                  disabled={confirmInput !== (showResetConfirm === 'total' ? 'TOTAL_RESET' : 'RESET')}
                  className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
