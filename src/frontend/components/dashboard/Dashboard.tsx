import React from 'react';
import {  AlertTriangle, BrainCircuit, TrendingUp, TrendingDown, Users, Package, Loader2, PieChart, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, X, FileText, ShieldCheck, MessageCircle, Activity, Zap, Settings, Building2, ArrowRight, ChevronRight, Trophy, User, Clock } from 'lucide-react';
import { exportToPDF } from '../../lib/export';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { FirstTimeSetupChecklist } from '../common/FirstTimeSetupChecklist';
import { sendNotification } from '../../../api/services/notificationService';
import { apiClient } from '../../../api/lib/api-client';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, cn } from '../../lib/utils';
import { UserProfile } from '../../types';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit,
  addDoc,
  User as FirebaseUser,
  handleFirestoreError,
  OperationType,
  serverTimestamp,
  writeBatch,
  doc,
  getDocs
} from '../../../api/firebase';

interface DashboardProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
  onNavigate?: (tab: string, section: string, label: string) => void;
  onStartGuide?: () => void;
}

const formatActionLabel = (actionKey: string) => {
  if (!actionKey) return 'Opération';
  const key = actionKey.toUpperCase();
  if (key.includes('CONVERSION_DEVIS')) return 'Conversion Devis';
  if (key.includes('CREATION_DEVIS')) return 'Création Devis';
  if (key.includes('SUPPRESSION_DEVIS')) return 'Suppr. Devis';
  if (key.includes('VENTE') || key.includes('TRANSACTION')) return 'Nouvelle Vente';
  if (key.includes('ACHAT')) return 'Nouvel Achat';
  if (key.includes('PAIEMENT')) return 'Paiement Enregistré';
  if (key.includes('TIERS')) return 'Tiers / Client';
  if (key.includes('PRODUIT')) return 'Produit / Stock';
  if (key.includes('CHARGE')) return 'Nouvelle Charge';
  if (key.includes('LOGIN') || key.includes('CONNEXION')) return 'Connexion';
  if (key.includes('PROFILE')) return 'Modif. Profil';
  if (key.includes('COMPANY')) return 'Modif. Entreprise';
  return actionKey.replace(/_/g, ' ');
};

const getActionBadgeStyle = (actionKey: string) => {
  if (!actionKey) return 'bg-slate-100 text-slate-700 border-slate-200';
  const key = actionKey.toUpperCase();
  if (key.includes('CONVERSION') || key.includes('PAIEMENT')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (key.includes('CREATION') || key.includes('VENTE')) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (key.includes('SUPPRESSION') || key.includes('DELETE')) {
    return 'bg-rose-50 text-rose-800 border-rose-200';
  }
  if (key.includes('UPDATE') || key.includes('MODIF')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

const formatActionTimestamp = (timestamp: any) => {
  if (!timestamp) return '-';
  const d = timestamp?.toDate ? timestamp.toDate() : (typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp));
  if (isNaN(d.getTime())) return '-';

  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dateStr} à ${timeStr}`;
};

export function Dashboard({ user, currentUserProfile, onNavigate, onStartGuide }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const companyId = currentUserProfile?.companyId || user.uid;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
  
  const [stats, setStats] = React.useState({
    ca: 0,
    caMois: 0,
    caMoisPrecedent: 0,
    depenses: 0,
    depensesMois: 0,
    depensesMoisPrecedent: 0,
    achats: 0,
    achatsMois: 0,
    achatsMoisPrecedent: 0,
    clients: 0,
    stockValue: 0,
    fournisseurs: 0,
    produits: 0,
    tresorerie: 0,
    totalUsers: 0,
    totalCompanies: 0,
    totalTickets: 0
  });
  const [recentActions, setRecentActions] = React.useState<any[]>([]);
  const [recentTickets, setRecentTickets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState('');
  const [codeAnalysis, setCodeAnalysis] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isAnalyzingCode, setIsAnalyzingCode] = React.useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = React.useState(false);
  // Real-time tick for live precision calculation
  const [nowTime, setNowTime] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 10000); // Live tick every 10s
    return () => clearInterval(timer);
  }, []);

  // Reactive subscription alert and trial tracker computed directly from the live profile in real-time
  const subscriptionAlertMemo = React.useMemo(() => {
    if (!currentUserProfile) return null;
    
    const isSubscribed = currentUserProfile.subscriptionStatus === 'ACTIVE' && !currentUserProfile.isDemo;
    const endDate = currentUserProfile.subscriptionEndDate || 0;
    if (!endDate) return null;

    const diffMs = endDate - nowTime;
    const daysLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const formattedDate = new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Calculate real dynamic elapsed percentage based on creation/contract date vs end date
    const startDate = currentUserProfile.contractSignedAt || currentUserProfile.createdAt || (endDate - 30 * 24 * 60 * 60 * 1000);
    const totalDurationMs = Math.max(24 * 60 * 60 * 1000, endDate - startDate);
    const elapsedMs = Math.max(0, nowTime - startDate);
    const elapsedPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    if (isSubscribed) {
      if (daysLeft <= 5) {
        return {
          isDemo: false,
          statusLabel: 'Abonnement en cours',
          daysLeft,
          hoursLeft,
          expiryDate: formattedDate,
          endDate,
          elapsedPercent
        };
      }
      return null; // Non-expiring subscription hides alert
    }

    if (currentUserProfile.isDemo || currentUserProfile.subscriptionStatus === 'TRIAL') {
      return {
        isDemo: true,
        statusLabel: 'Abonnement en cours',
        daysLeft,
        hoursLeft,
        expiryDate: formattedDate,
        endDate,
        elapsedPercent
      };
    }
    
    return null;
  }, [currentUserProfile, nowTime]);
  
  const [monthlyData, setMonthlyData] = React.useState<any[]>([]);
  
  // Pagination states
  const [ticketsPage, setTicketsPage] = React.useState(1);
  const [actionsPage, setActionsPage] = React.useState(1);
  const itemsPerPage = 10;
  const [globalStats, setGlobalStats] = React.useState({
    totalRevenue: 0,
    totalUsers: 0,
    activeCompanies: 0,
    pendingTickets: 0,
    totalTreasury: 0,
    revenueData: [] as any[],
    recentActions: [] as any[]
  });

  const calculateMonthlyTrends = (transactions: any[], payments: any[], charges: any[]) => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime(),
        ca: 0,
        charges: 0,
        achats: 0,
        net: 0,
        tresorerie: 0
      };
    });

    months.forEach(m => {
      m.ca = transactions
        .filter(t => t.type === 'VENTE' && (t.statut === 'PAYE' || t.status === 'COMPLETED') && t.date >= m.start && t.date <= m.end)
        .reduce((acc, t) => acc + (t.montantTotal || t.montant || 0), 0);
      
      m.achats = transactions
        .filter(t => t.type === 'ACHAT' && (t.statut === 'PAYE' || t.status === 'COMPLETED') && t.date >= m.start && t.date <= m.end)
        .reduce((acc, t) => acc + (t.montantTotal || t.montant || 0), 0);
      
      m.charges = charges
        .filter(c => (c.date || c.createdAt) >= m.start && (c.date || c.createdAt) <= m.end)
        .reduce((acc, c) => acc + (c.montant || 0), 0);
      
      m.net = m.ca - (m.achats + m.charges);
      
      // Treasury at end of month (simplified: current balance minus flows after that month)
      const flowsAfter = payments
        .filter(p => p.date > m.end)
        .reduce((acc, p) => acc + (p.type === 'ENCAISSEMENT' ? (p.montant || 0) : -(p.montant || 0)), 0);
      
      // This is an approximation based on current total treasury and retroactive flows
      // In a real app we would have historically stored balances
    });

    setMonthlyData(months);
  };



  const handleAIAnalysis = async () => {
    setIsAIModalOpen(true);
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      const res = await apiClient.post('/api/ai/analyze', {
        type: 'business',
        data: {
          ca: stats.ca,
          expenses: totalExpenses,
          benefice,
          tresorerie: stats.tresorerie,
          rendement,
          clients: stats.clients,
          fournisseurs: stats.fournisseurs,
          stockValue: stats.stockValue,
          produits: stats.produits
        }
      });
      setAiAnalysis(res.text || t('dashboard.ai_analysis.fallback'));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'ai_analysis', user, false);
      setAiAnalysis(t('dashboard.ai_analysis.error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCodeAnalysis = async () => {
    setIsCodeModalOpen(true);
    setIsAnalyzingCode(true);
    setCodeAnalysis('');

    try {
      const res = await apiClient.post('/api/ai/analyze', {
        type: 'code',
        data: {
          users: globalStats.totalUsers,
          companies: globalStats.activeCompanies,
          revenue: globalStats.totalRevenue,
          tickets: globalStats.pendingTickets
        }
      });
      setCodeAnalysis(res.text || "Désolé, je n'ai pas pu générer d'analyse de code pour le moment.");
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'code_analysis', user, false);
      setCodeAnalysis("Une erreur est survenue lors de l'analyse du code. Veuillez réessayer plus tard.");
    } finally {
      setIsAnalyzingCode(false);
    }
  };

  const exportAIAnalysisPDF = () => {
    if (!aiAnalysis) return;
    const headers = ['Analyse IA - KONTROL'];
    const data = [[aiAnalysis]];
    exportToPDF('Rapport d\'Analyse Stratégique IA', headers, data, 'Analyse_IA_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  React.useEffect(() => {
    if (!currentUserProfile) return;
    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Company Stats
    let loadedCount = 0;
    const totalSnapshots = 6;
    const checkLoading = () => {
      loadedCount++;
      if (loadedCount >= totalSnapshots) setLoading(false);
    };

    const qPayments = query(collection(db, 'payments'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qPayments, (snapshot) => {
      const totalTresorerie = snapshot.docs.reduce((acc, doc) => {
        const p = doc.data();
        return acc + (p.type === 'ENCAISSEMENT' ? (p.montant || 0) : -(p.montant || 0));
      }, 0);
      setStats(prev => ({ ...prev, tresorerie: totalTresorerie }));
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments', user, false)));

    const qTransactions = query(collection(db, 'transactions'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      const totalCA = docs
        .filter(doc => doc.type === 'VENTE' && (doc.statut === 'PAYE' || doc.status === 'COMPLETED'))
        .reduce((acc, doc) => acc + (doc.montantTotal || doc.montant || 0), 0);
      const caMois = docs
        .filter(doc => doc.type === 'VENTE' && (doc.statut === 'PAYE' || doc.status === 'COMPLETED') && doc.date >= startOfThisMonth)
        .reduce((acc, doc) => acc + (doc.montantTotal || doc.montant || 0), 0);
      const caMoisPrecedent = docs
        .filter(doc => doc.type === 'VENTE' && (doc.statut === 'PAYE' || doc.status === 'COMPLETED') && doc.date >= startOfLastMonth && doc.date <= endOfLastMonth)
        .reduce((acc, doc) => acc + (doc.montantTotal || doc.montant || 0), 0);

      const totalAchats = docs
        .filter(doc => doc.type === 'ACHAT' && (doc.statut === 'PAYE' || doc.status === 'COMPLETED'))
        .reduce((acc, doc) => acc + (doc.montantTotal || doc.montant || 0), 0);
      const achatsMois = docs
        .filter(doc => doc.type === 'ACHAT' && (doc.statut === 'PAYE' || doc.status === 'COMPLETED') && doc.date >= startOfThisMonth)
        .reduce((acc, doc) => acc + (doc.montantTotal || doc.montant || 0), 0);
      const achatsMoisPrecedent = docs
        .filter(doc => doc.type === 'ACHAT' && (doc.statut === 'PAYE' || doc.status === 'COMPLETED') && doc.date >= startOfLastMonth && doc.date <= endOfLastMonth)
        .reduce((acc, doc) => acc + (doc.montantTotal || doc.montant || 0), 0);

      setStats(prev => ({ 
        ...prev, 
        ca: totalCA, 
        caMois, 
        caMoisPrecedent,
        achats: totalAchats,
        achatsMois,
        achatsMoisPrecedent
      }));

      syncTrendsData().catch(e => console.error("Snapshot syncTrendsData error:", e));
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions', user, false)));

    const qCharges = query(collection(db, 'charges'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qCharges, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      const totalDepenses = docs.reduce((acc, doc) => acc + (doc.montant || 0), 0);
      const depensesMois = docs
        .filter(doc => (doc.date || doc.createdAt) >= startOfThisMonth)
        .reduce((acc, doc) => acc + (doc.montant || 0), 0);
      const depensesMoisPrecedent = docs
        .filter(doc => (doc.date || doc.createdAt) >= startOfLastMonth && (doc.date || doc.createdAt) <= endOfLastMonth)
        .reduce((acc, doc) => acc + (doc.montant || 0), 0);

      setStats(prev => ({ 
        ...prev, 
        depenses: totalDepenses,
        depensesMois,
        depensesMoisPrecedent
      }));
      syncTrendsData().catch(e => console.error("Snapshot syncTrendsData error:", e));
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'charges', user, false)));

    const syncTrendsData = async () => {
      try {
        const [tSnap, pSnap, cSnap] = await Promise.all([
          getDocs(query(collection(db, 'transactions'), where('ownerId', '==', companyId))),
          getDocs(query(collection(db, 'payments'), where('ownerId', '==', companyId))),
          getDocs(query(collection(db, 'charges'), where('ownerId', '==', companyId)))
        ]);
        calculateMonthlyTrends(
          tSnap.docs.map(d => d.data()),
          pSnap.docs.map(d => d.data()),
          cSnap.docs.map(d => d.data())
        );
      } catch (e) {
        console.error("Error syncing dashboard trends:", e);
      }
    };

    const qTiers = query(collection(db, 'tiers'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qTiers, (snapshot) => {
      const clients = snapshot.docs.filter(d => d.data().type === 'CLIENT').length;
      const fournisseurs = snapshot.docs.filter(d => d.data().type === 'FOURNISSEUR').length;
      setStats(prev => ({ ...prev, clients, fournisseurs }));
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tiers', user, false)));

    const qProduits = query(collection(db, 'produits'), where('ownerId', '==', companyId));
    unsubscribes.push(onSnapshot(qProduits, (snapshot) => {
      const totalStock = snapshot.docs.reduce((acc, doc) => acc + ((doc.data().stock || 0) * (doc.data().prixVente || 0)), 0);
      setStats(prev => ({ ...prev, stockValue: totalStock, produits: snapshot.size }));
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'produits', user, false)));

    const qActions = query(
      collection(db, 'actions'), 
      where('companyId', '==', companyId), 
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    unsubscribes.push(onSnapshot(qActions, (snapshot) => {
      setRecentActions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'actions', user, false)));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, companyId, currentUserProfile]);

  const { totalExpenses, totalExpensesMois, totalExpensesMoisPrecedent, benefice, beneficeMois, beneficeMoisPrecedent, rendement, performanceData } = React.useMemo(() => {
    const totalExpenses = stats.depenses + stats.achats;
    const totalExpensesMois = stats.depensesMois + stats.achatsMois;
    const totalExpensesMoisPrecedent = stats.depensesMoisPrecedent + stats.achatsMoisPrecedent;

    const benefice = stats.ca - totalExpenses;
    const beneficeMois = stats.caMois - totalExpensesMois;
    const beneficeMoisPrecedent = stats.caMoisPrecedent - totalExpensesMoisPrecedent;

    const rendement = stats.ca > 0 ? (benefice / stats.ca) * 100 : 0;

    const performanceData = [
      {
        name: 'Performance',
        'CA': stats.ca,
        'Dépenses': totalExpenses,
        'Profit': Math.max(0, stats.ca - totalExpenses),
      }
    ];

    return { 
      totalExpenses, 
      totalExpensesMois, 
      totalExpensesMoisPrecedent, 
      benefice, 
      beneficeMois, 
      beneficeMoisPrecedent, 
      rendement, 
      performanceData 
    };
  }, [stats]);

  const setupPercent = React.useMemo(() => {
    const steps = [
      Boolean(currentUserProfile?.companyName && currentUserProfile?.companyLogo),
      stats.produits > 0,
      stats.clients > 0 || stats.fournisseurs > 0,
      stats.ca > 0 || (stats.depenses + stats.achats) > 0,
      localStorage.getItem('kontrol_guide_dashboard_seen') === 'true'
    ];
    const completedCount = steps.filter(Boolean).length;
    return Math.round((completedCount / steps.length) * 100);
  }, [currentUserProfile, stats]);

  const getKPICommentary = (current: number, previous: number, type: 'positive' | 'negative' | 'neutral' = 'positive') => {
    if (previous === 0) {
      if (current === 0) return { text: "Aucune activité", color: "text-kontrol-ink-muted", Icon: Activity };
      return { text: "Nouveau flux détecté", color: "text-kontrol-blue", Icon: Zap };
    }
    
    const change = ((current - previous) / previous) * 100;
    const isIncrease = change > 0;
    const absChange = Math.abs(change).toFixed(1);
    
    let color = "text-kontrol-ink-muted";
    let Icon = Activity;
    let text = "";

    if (type === 'positive') {
      // Pour CA, Profit, Trésorerie
      if (isIncrease) {
        color = "text-emerald-500";
        Icon = ArrowUpRight;
        if (change > 50) text = `Performance exceptionnelle (+${absChange}%)`;
        else if (change > 20) text = `Forte croissance (+${absChange}%)`;
        else text = `Progression constante (+${absChange}%)`;
      } else {
        color = "text-rose-500";
        Icon = ArrowDownRight;
        if (change < -50) text = `Alerte : Chute critique (-${absChange}%)`;
        else if (change < -20) text = `Baisse significative (-${absChange}%)`;
        else text = `Légère contraction (-${absChange}%)`;
      }
    } else if (type === 'negative') {
      // Pour Dépenses
      if (isIncrease) {
        color = "text-rose-500";
        Icon = ArrowUpRight;
        if (change > 50) text = `Explosion des coûts (+${absChange}%)`;
        else if (change > 20) text = `Hausse des charges (+${absChange}%)`;
        else text = `Augmentation modérée (+${absChange}%)`;
      } else {
        color = "text-emerald-500";
        Icon = ArrowDownRight;
        if (change < -50) text = `Réduction massive des coûts (-${absChange}%)`;
        else if (change < -20) text = `Optimisation efficace (-${absChange}%)`;
        else text = `Baisse des dépenses (-${absChange}%)`;
      }
    } else {
      color = isIncrease ? "text-kontrol-blue" : "text-amber-500";
      Icon = isIncrease ? ArrowUpRight : ArrowDownRight;
      text = `${isIncrease ? '+' : '-'}${absChange}% vs mois dernier`;
    }

    return { text, color, Icon, change };
  };

  const caComment = getKPICommentary(stats.caMois, stats.caMoisPrecedent, 'positive');
  const expensesComment = getKPICommentary(totalExpensesMois, totalExpensesMoisPrecedent, 'negative');
  const profitComment = getKPICommentary(beneficeMois, beneficeMoisPrecedent, 'positive');
  const tresorerieComment = stats.tresorerie > totalExpensesMois * 2 ? 
    { text: "Trésorerie très solide", color: "text-emerald-500", Icon: ShieldCheck } : 
    stats.tresorerie > totalExpensesMois ?
    { text: "Trésorerie équilibrée", color: "text-emerald-400", Icon: ShieldCheck } :
    { text: "Trésorerie sous tension", color: "text-rose-500", Icon: AlertTriangle };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-kontrol-blue" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscriptionAlertMemo && (
        <div className="bg-gradient-to-r from-amber-50/90 via-amber-50 to-amber-100/50 border border-amber-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs transition-all flex flex-col gap-2 animate-in slide-in-from-top duration-300">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-700 shrink-0">
                <Sparkles size={15} />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px]">
                  {subscriptionAlertMemo.statusLabel}
                </span>
                <span className="bg-amber-200/70 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1 border border-amber-300/60 shadow-2xs">
                  <Clock size={12} className="text-amber-700 animate-pulse" />
                  {subscriptionAlertMemo.daysLeft > 0 ? (
                    `${subscriptionAlertMemo.daysLeft}j ${subscriptionAlertMemo.hoursLeft}h restants`
                  ) : (
                    "Expire aujourd'hui"
                  )}
                </span>
                <span className="text-[11px] text-amber-800/80 hidden md:inline font-medium">
                  • Fin : <strong className="font-bold">{subscriptionAlertMemo.expiryDate}</strong>
                </span>
                <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                  {subscriptionAlertMemo.elapsedPercent}% écoulé
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => onNavigate?.('abonnements', t('sections.system'), t('common.subscriptions'))}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <span>Gérer l'offre</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Real functional progress bar calculating real consumed subscription time */}
          <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-700 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(1, subscriptionAlertMemo.elapsedPercent))}%` }}
              title={`Progression réelle : ${subscriptionAlertMemo.elapsedPercent}% de la période d'abonnement écoulée`}
            />
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUserProfile?.companyLogo && (
            <div className="w-12 h-12 rounded-xl bg-white border border-kontrol-border p-1 shadow-sm overflow-hidden shrink-0">
              <img src={currentUserProfile.companyLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">{t('dashboard.title')}</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">
              {t('dashboard.welcome', { name: currentUserProfile?.displayName || user.displayName || 'Utilisateur' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="btn-primary py-1.5 px-4 text-xs flex items-center gap-2 bg-gradient-to-r from-kontrol-blue to-kontrol-orange border-none shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
            {t('dashboard.ai_analysis.button')}
          </button>
          <select className="bg-white border border-kontrol-border rounded-lg px-3 py-1.5 text-[13px] font-medium text-kontrol-ink-soft outline-none focus:border-kontrol-blue transition-colors">
            <option>{t('dashboard.periods.month')}</option>
            <option>{t('dashboard.periods.year')}</option>
            <option>{t('dashboard.periods.all')}</option>
          </select>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="kpi bg-emerald-600 border-emerald-600">
          <p className="kpi-lbl text-white/70">{t('dashboard.stats.treasury')}</p>
          <h3 className="kpi-val text-white">{formatCurrency(stats.tresorerie)}</h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", 
            tresorerieComment.color.includes('emerald') ? 'text-emerald-200' : 'text-rose-200'
          )}>
            <tresorerieComment.Icon size={10} /> {tresorerieComment.text}
          </p>
        </div>
        <div className="kpi bg-kontrol-dark border-kontrol-dark">
          <p className="kpi-lbl text-white/50">{t('dashboard.stats.revenue')}</p>
          <h3 className="kpi-val text-kontrol-blue">{formatCurrency(stats.ca)}</h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", 
            caComment.color.includes('emerald') ? 'text-emerald-400' : 'text-rose-400'
          )}>
            <caComment.Icon size={10} /> {caComment.text}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.expenses')}</p>
          <h3 className="kpi-val">{formatCurrency(totalExpenses)}</h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", expensesComment.color)}>
            <expensesComment.Icon size={10} /> {expensesComment.text}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.profit')}</p>
          <h3 className={cn("kpi-val", benefice >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(benefice)}
          </h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", profitComment.color)}>
            <profitComment.Icon size={10} /> {profitComment.text}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.yield')}</p>
          <h3 className="kpi-val text-kontrol-orange">{rendement.toFixed(1)}%</h3>
          <p className="text-[11px] text-kontrol-ink-muted mt-1.5">{t('dashboard.stats.performance')}</p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.customers')}</p>
          <h3 className="kpi-val">{stats.clients}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.vendors')}</p>
          <h3 className="kpi-val">{stats.fournisseurs}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.products')}</p>
          <h3 className="kpi-val">{stats.produits}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('dashboard.stats.stock_value')}</p>
          <h3 className="kpi-val">{formatCurrency(stats.stockValue)}</h3>
        </div>

          <div className="kpi bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-dashed border-kontrol-dark/15 flex flex-col justify-between gap-3 p-3.5 shadow-xs transition-colors hover:border-kontrol-blue/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-kontrol-blue font-sans">
                Aide & Parcours
              </span>
              <Sparkles size={13} className="text-kontrol-orange animate-pulse" />
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {/* Button 1: Start interactive page Tour */}
              <button
                type="button"
                onClick={onStartGuide}
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all select-none cursor-pointer border shadow-sm",
                  "bg-gradient-to-r from-kontrol-blue to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-kontrol-blue/5 border-transparent active:scale-95"
                )}
                title="Lancer le guide interactif complet de ce module"
              >
                <span>Visite Guidée</span>
                <ChevronRight size={10} className="stroke-[3]" />
              </button>

              {/* Button 2: Onboarding Setup Checklist */}
              <button
                type="button"
                onClick={() => setIsChecklistOpen(true)}
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all select-none cursor-pointer border shadow-sm",
                  "bg-white border-kontrol-border text-kontrol-dark hover:bg-slate-100 hover:text-kontrol-blue active:scale-95"
                )}
                title="Consulter le parcours de configuration d'entreprise"
              >
                <span>Configuration ({setupPercent}%)</span>
                <Trophy size={10.5} className="text-kontrol-orange shrink-0 ml-1.5" />
              </button>
            </div>
          </div>
      </div>


      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-kontrol-blue/10 text-kontrol-blue flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-kontrol-dark uppercase tracking-widest">{t('dashboard.trends.title')}</h3>
                <p className="text-[11px] text-kontrol-ink-muted">{t('dashboard.trends.subtitle')}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-kontrol-blue" />
                <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest text-nowrap">{t('dashboard.trends.revenue')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-kontrol-orange" />
                <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest text-nowrap">{t('dashboard.trends.charges')}</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCharges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                  tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                  formatter={(val: number) => [formatCurrency(val), '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="ca" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCa)" 
                  name={t('dashboard.trends.revenue')}
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="charges" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCharges)" 
                  name={t('dashboard.trends.charges')}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 bg-kontrol-dark text-white overflow-hidden relative min-h-[320px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-kontrol-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Activity size={20} className="text-kontrol-blue" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/50">{t('dashboard.performance.title')}</h3>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeDasharray="364.4"
                    strokeDashoffset={364.4 * (1 - Math.min(100, rendement) / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold tracking-tighter">{rendement.toFixed(1)}%</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('dashboard.performance.label')}</span>
                </div>
              </div>
              <p className="mt-6 text-xs text-center text-white/60 px-4">
                {t('dashboard.performance.subtitle', { percent: rendement.toFixed(1) })}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Recent Activity */}
      <div className="card">
        <div className="card-hd flex items-center justify-between">
          <h4 className="card-title flex items-center gap-2">
            <Activity size={18} className="text-kontrol-blue" />
            {t('dashboard.activity.title')}
          </h4>
          <span className="text-[11px] font-bold text-kontrol-ink-muted bg-kontrol-bg px-2.5 py-1 rounded-full border border-kontrol-border">
            {recentActions.length} activités récentes
          </span>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Action & Utilisateur</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Détails de l'Activité</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Date & Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {recentActions.slice((actionsPage - 1) * itemsPerPage, actionsPage * itemsPerPage).map((action, idx) => (
                  <tr key={action.id} className={cn(
                    "hover:bg-kontrol-bg/30 transition-colors",
                    idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/40"
                  )}>
                    <td className="px-4 py-3 text-[12px] font-medium text-kontrol-dark whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border w-fit", getActionBadgeStyle(action.action))}>
                          {formatActionLabel(action.action)}
                        </span>
                        <span className="text-[11px] text-kontrol-ink-muted font-medium flex items-center gap-1">
                          <User size={11} className="text-kontrol-ink-soft" />
                          {action.userName || 'Utilisateur'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-kontrol-dark font-medium leading-relaxed">
                      {action.details || 'Aucune précision disponible'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-kontrol-ink-muted whitespace-nowrap font-mono">
                      {formatActionTimestamp(action.timestamp)}
                    </td>
                  </tr>
                ))}
                {recentActions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[13px] text-kontrol-ink-muted">
                      {t('dashboard.activity.no_activity')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {recentActions.length > itemsPerPage && (
            <div className="p-4 border-t border-kontrol-border flex items-center justify-between bg-kontrol-bg/20">
              <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">
                Page {actionsPage} sur {Math.ceil(recentActions.length / itemsPerPage)}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActionsPage(p => Math.max(1, p - 1))}
                  disabled={actionsPage === 1}
                  className="p-1.5 border border-kontrol-border hover:bg-white disabled:opacity-30 transition-colors"
                >
                  <ArrowDownRight size={14} className="rotate-180" />
                </button>
                <button 
                  onClick={() => setActionsPage(p => Math.min(Math.ceil(recentActions.length / itemsPerPage), p + 1))}
                  disabled={actionsPage === Math.ceil(recentActions.length / itemsPerPage)}
                  className="p-1.5 border border-kontrol-border hover:bg-white disabled:opacity-30 transition-colors"
                >
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* AI Analysis Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between bg-gradient-to-r from-kontrol-blue/5 to-kontrol-orange/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-kontrol-blue to-kontrol-orange rounded-xl text-white shadow-md">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-kontrol-dark">{t('dashboard.ai_analysis.modal_title')}</h3>
                  <p className="text-[11px] text-kontrol-ink-muted font-medium uppercase tracking-wider">{t('dashboard.ai_analysis.modal_subtitle')}</p>
                </div>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-kontrol-blue/20 border-t-kontrol-blue rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-kontrol-orange animate-pulse" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-kontrol-dark">{t('dashboard.ai_analysis.analyzing')}</p>
                    <p className="text-sm text-kontrol-ink-muted">{t('dashboard.ai_analysis.analyzing_subtitle')}</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-kontrol-ink-soft leading-relaxed">
                  <div className="markdown-body">
                    <Markdown>{aiAnalysis}</Markdown>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-kontrol-border bg-kontrol-bg/30 flex gap-3">
              <button 
                onClick={exportAIAnalysisPDF}
                disabled={isAnalyzing || !aiAnalysis}
                className="flex-1 btn-outline py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText size={18} /> {t('dashboard.ai_analysis.export_pdf')}
              </button>
              <button 
                onClick={() => setIsAIModalOpen(false)}
                className="flex-1 bg-kontrol-dark text-white py-3 rounded-xl font-bold hover:bg-kontrol-dark/90 transition-all"
              >
                {t('dashboard.ai_analysis.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Analysis Modal */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between bg-kontrol-dark">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md">
                   <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Blue AI Code Analyzer</h3>
                  <p className="text-[11px] text-white/60 font-medium uppercase tracking-wider">Audit de sécurité & architecture</p>
                </div>
              </div>
              <button onClick={() => setIsCodeModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-kontrol-bg/10">
              {isAnalyzingCode ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-kontrol-dark">Audit en cours...</p>
                    <p className="text-sm text-kontrol-ink-muted">Analyse des vulnérabilités et de la structure du code</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-kontrol-ink-soft leading-relaxed">
                  <div className="markdown-body">
                    <Markdown>{codeAnalysis}</Markdown>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-kontrol-border bg-white flex gap-3">
              <button 
                onClick={() => setIsCodeModalOpen(false)}
                className="flex-1 bg-kontrol-dark text-white py-3 rounded-xl font-bold hover:bg-kontrol-dark/90 transition-all"
              >
                Fermer l'audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Time Setup Onboarding Checklist Modal */}
      <FirstTimeSetupChecklist 
        currentUserProfile={currentUserProfile} 
        stats={stats} 
        onNavigate={onNavigate} 
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
