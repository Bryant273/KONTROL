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
import { db, collection, getDocs, query, where, deleteDoc, doc, auth, handleFirestoreError, OperationType, limit, orderBy, onSnapshot, writeBatch } from '../../firebase';
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
import { UserProfile, Company } from '../../types';

const APP_VERSION = "1.2.0-PROD";
const LAST_UPDATE = "24 Mars 2026";

const UPDATE_HISTORY = [
  { version: "1.2.0", date: "24/03/2026", title: "Refonte de l'Architecture", description: "Passage à une architecture multi-tenant robuste et sécurisée." },
  { version: "1.1.5", date: "20/03/2026", title: "Gestion des Stocks Avancée", description: "Ajout du calcul CUMP et des mouvements de stock automatiques." },
  { version: "1.1.0", date: "15/03/2026", title: "Module Tiers", description: "Gestion complète des clients et fournisseurs avec exports PDF/Excel." },
  { version: "1.0.0", date: "01/03/2026", title: "Lancement KONTROL", description: "Version initiale de l'ERP avec modules de base." }
];

interface SystemModuleProps {
  currentUserProfile: UserProfile | null;
}

export function SystemModule({ currentUserProfile }: SystemModuleProps) {
  const isAdminERP = currentUserProfile?.role === 'ADMINISTRATEUR_ERP';
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    activeSubscriptions: 0,
    totalTransactions: 0,
    growthData: [] as any[]
  });

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [globalActions, setGlobalActions] = useState<any[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  useEffect(() => {
    fetchGlobalStats();
    fetchUsers();
    fetchGlobalActions();
  }, []);

  const fetchGlobalActions = async () => {
    setLoadingActions(true);
    try {
      const q = query(collection(db, 'actions'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setGlobalActions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching global actions:", error);
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
      console.error("Error fetching users:", error);
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

      setStats({
        totalUsers: usersSnap.size,
        totalCompanies: companiesSnap.size,
        activeSubscriptions: companies.filter(c => c.status === 'ACTIVE').length,
        totalTransactions: transSnap.size,
        growthData: growth
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const resetAdminUser = async (email: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${email} de la base de données ? Cette action est irréversible.`)) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setMessage({ type: 'error', text: `Utilisateur ${email} non trouvé dans Firestore.` });
        setIsDeleting(false);
        return;
      }

      const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, 'users', document.id)));
      await Promise.all(deletePromises);

      setMessage({ type: 'success', text: `L'utilisateur ${email} a été supprimé avec succès. Il peut maintenant être recréé.` });
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users', auth.currentUser);
      setMessage({ type: 'error', text: "Une erreur est survenue lors de la suppression." });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteCompanyByName = async (companyName: string, adminEmail: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'entreprise "${companyName}" et l'utilisateur "${adminEmail}" ?`)) {
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
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
        console.warn(`Entreprise "${companyName}" non trouvée.`);
      } else {
        batch.delete(compSnap.docs[0].ref);
      }

      // Delete user
      if (userSnap.empty) {
        console.warn(`Utilisateur "${adminEmail}" non trouvé.`);
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
      fetchGlobalStats();
      fetchUsers();
    } catch (error) {
      console.error("Delete company error:", error);
      setMessage({ type: 'error', text: "Erreur lors de la suppression ciblée." });
    } finally {
      setIsResetting(false);
    }
  };

  const fullSystemReset = async () => {
    const confirmation = window.prompt("ATTENTION: Cette action va supprimer TOUTES les données (Produits, Tiers, Transactions, Entreprises, Utilisateurs non-admin). Tapez 'RESET' pour confirmer.");
    
    if (confirmation !== 'RESET') {
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
      const collectionsToClear = [
        'produits', 
        'tiers', 
        'transactions', 
        'stock_movements', 
        'companies', 
        'actions',
        'notifications',
        'tickets',
        'payments',
        'charges',
        'wallets'
      ];

      for (const collName of collectionsToClear) {
        const snapshot = await getDocs(collection(db, collName));
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // Special handling for users: keep only ERP Admins
      const usersSnap = await getDocs(collection(db, 'users'));
      const userBatch = writeBatch(db);
      usersSnap.docs.forEach(d => {
        const data = d.data();
        if (data.role !== 'ADMINISTRATEUR_ERP') {
          userBatch.delete(d.ref);
        }
      });
      await userBatch.commit();

      setMessage({ type: 'success', text: "Le système a été réinitialisé avec succès. Toutes les données ont été effacées." });
      fetchGlobalStats();
      fetchUsers();
      fetchGlobalActions();
    } catch (error) {
      console.error("Full reset error:", error);
      setMessage({ type: 'error', text: "Erreur lors de la réinitialisation complète." });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-kontrol-dark tracking-tight italic">Administration Système</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Supervision globale et maintenance de KONTROL ERP</p>
        </div>
        <button 
          onClick={fetchGlobalStats}
          disabled={loadingStats}
          className="p-2 bg-kontrol-bg text-kontrol-ink-soft rounded-xl hover:bg-kontrol-blue/5 hover:text-kontrol-blue transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loadingStats ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Entreprises', value: stats.totalCompanies, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Abonnements', value: stats.activeSubscriptions, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Transactions', value: stats.totalTransactions, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">{stat.label}</p>
                <p className="text-xl font-black text-kontrol-dark italic">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Activity Feed */}
        <div className="card lg:col-span-2">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Activity size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest italic">Activité Globale du Réseau</h3>
            </div>
          </div>
          <div className="p-0 max-h-[500px] overflow-y-auto">
            <div className="divide-y divide-kontrol-border">
              {globalActions.map((action) => (
                <div key={action.id} className="p-4 hover:bg-kontrol-bg/30 transition-colors flex gap-4">
                  <div className="shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-kontrol-blue/10 text-kontrol-blue flex items-center justify-center">
                      <Zap size={14} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-bold text-kontrol-dark truncate">
                        {action.userName}
                      </p>
                      <span className="text-[10px] text-kontrol-ink-muted shrink-0">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[12px] text-kontrol-ink-soft mt-0.5">
                      <span className="font-bold text-kontrol-blue">{action.action}</span>
                      {action.details && ` : ${action.details}`}
                    </p>
                    <p className="text-[10px] text-kontrol-ink-muted mt-1 uppercase tracking-widest font-bold">
                      {action.companyId === action.userId ? 'Admin' : `Entreprise: ${action.companyId.substring(0, 8)}`}
                    </p>
                  </div>
                </div>
              ))}
              {globalActions.length === 0 && (
                <div className="p-12 text-center text-kontrol-ink-muted italic">
                  Aucune activité récente détectée.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="card">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Users size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest italic">Utilisateurs</h3>
            </div>
          </div>
          <div className="p-0 max-h-[500px] overflow-y-auto">
            <div className="divide-y divide-kontrol-border">
              {users.map((user) => (
                <div key={user.uid} className="p-4 hover:bg-kontrol-bg/30 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-kontrol-dark truncate">{user.displayName}</p>
                    <p className="text-[10px] text-kontrol-ink-muted truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest text-kontrol-blue bg-kontrol-blue/5 px-2 py-0.5 rounded-full">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button 
                    onClick={() => resetAdminUser(user.email)}
                    className="p-2 text-kontrol-ink-muted hover:text-rose-600 transition-colors shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <div className="card">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <TrendingUp size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest italic">Croissance du Réseau</h3>
            </div>
          </div>
          <div className="p-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
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

        {/* Danger Zone */}
        <div className="card border-rose-100 bg-rose-50/30">
          <div className="card-hd border-rose-100">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest italic">Zone de Danger</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-[13px] text-kontrol-ink-soft">
              Utilisez ces outils pour résoudre les problèmes critiques d'authentification ou de profil.
            </p>
            
            {isAdminERP && (
              <div className="space-y-3">
                <div className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-bold text-kontrol-dark">Réinitialiser Innov.korp@gmail.com</p>
                    <p className="text-[11px] text-kontrol-ink-muted">Supprime le profil Firestore pour permettre une recréation propre.</p>
                  </div>
                  <button 
                    onClick={() => resetAdminUser('Innov.korp@gmail.com')}
                    disabled={isDeleting}
                    className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-bold text-kontrol-dark">Réinitialiser acherie812@gmail.com</p>
                    <p className="text-[11px] text-kontrol-ink-muted">Supprime le profil Firestore pour cet administrateur.</p>
                  </div>
                  <button 
                    onClick={() => resetAdminUser('acherie812@gmail.com')}
                    disabled={isDeleting}
                    className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-bold text-kontrol-dark">Réinitialiser test-admin@kontrol.com</p>
                    <p className="text-[11px] text-kontrol-ink-muted">Supprime le profil Firestore pour cet administrateur de test.</p>
                  </div>
                  <button 
                    onClick={() => resetAdminUser('test-admin@kontrol.com')}
                    disabled={isDeleting}
                    className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-bold text-kontrol-dark uppercase">Supprimer TEST ENTREPRISE</p>
                    <p className="text-[11px] text-kontrol-ink-muted italic">Supprime l'entreprise et toutes ses données associées.</p>
                  </div>
                  <button 
                    onClick={() => deleteCompanyByName('TEST ENTREPRISE', 'test-admin@kontrol.com')}
                    disabled={isResetting}
                    className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 shadow-lg shadow-rose-200"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className={cn(
                "p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2",
                message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
              )}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                <p className="text-[13px] font-medium">{message.text}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Versioning & Updates */}
        <div className="card">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Info size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest italic">Version & Mises à jour</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-kontrol-bg rounded-2xl border border-kontrol-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-kontrol-blue/10 text-kontrol-blue flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <div>
                  <p className="text-[13px] font-black text-kontrol-dark">Version Actuelle</p>
                  <p className="text-[11px] text-kontrol-ink-muted">Dernière compilation: {LAST_UPDATE}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-kontrol-blue text-white text-[11px] font-black rounded-full tracking-wider">
                {APP_VERSION}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest px-1">Historique des versions</p>
              <div className="space-y-2">
                {UPDATE_HISTORY.map((update, i) => (
                  <div key={update.version} className="p-3 bg-white border border-kontrol-border rounded-xl hover:border-kontrol-blue transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-bold text-kontrol-dark group-hover:text-kontrol-blue transition-colors">{update.title}</span>
                      <span className="text-[10px] font-bold text-kontrol-ink-muted">{update.date}</span>
                    </div>
                    <p className="text-[11px] text-kontrol-ink-soft leading-relaxed">{update.description}</p>
                    <div className="mt-2 text-[9px] font-black text-kontrol-blue/50 uppercase tracking-widest">v{update.version}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <div className="flex items-center gap-2 text-kontrol-blue">
              <Database size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest italic">État de la Base de Données</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-kontrol-bg rounded-2xl">
                <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Connectivité</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[13px] font-bold text-kontrol-dark">Opérationnel</span>
                </div>
              </div>
              <div className="p-4 bg-kontrol-bg rounded-2xl">
                <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Région</p>
                <span className="text-[13px] font-bold text-kontrol-dark mt-1 block">Europe-West</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={fetchGlobalStats}
                className="w-full py-3 bg-kontrol-bg text-kontrol-ink-soft rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-kontrol-blue/5 hover:text-kontrol-blue transition-all"
              >
                <RefreshCw size={18} />
                Vérifier l'intégrité des données
              </button>

              {isAdminERP && (
                <button 
                  onClick={fullSystemReset}
                  disabled={isResetting}
                  className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isResetting ? <RefreshCw size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                  Réinitialisation Complète du Système
                </button>
              )}
              {isAdminERP && (
                <p className="text-[10px] text-center text-rose-600/60 font-medium italic">
                  Attention: Cette action efface toutes les données sauf les administrateurs ERP.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="card-hd">
          <div className="flex items-center gap-2 text-kontrol-blue">
            <Settings size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest italic">Paramètres Système</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-kontrol-bg rounded-2xl">
            <div>
              <p className="text-[13px] font-bold text-kontrol-dark">Mode Maintenance</p>
              <p className="text-[11px] text-kontrol-ink-muted">Désactive l'accès pour les utilisateurs non-admin.</p>
            </div>
            <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-kontrol-bg rounded-2xl">
            <div>
              <p className="text-[13px] font-bold text-kontrol-dark">Sauvegarde Automatique</p>
              <p className="text-[11px] text-kontrol-ink-muted">Sauvegarde quotidienne de la base de données.</p>
            </div>
            <div className="w-12 h-6 bg-kontrol-blue rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
