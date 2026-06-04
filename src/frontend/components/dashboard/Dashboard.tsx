import React from 'react';
import {  AlertTriangle, BrainCircuit, TrendingUp, TrendingDown, Users, Package, Loader2, PieChart, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, X, FileText, ShieldCheck, MessageCircle, Activity, Zap, Settings, Building2, ArrowRight, ChevronRight, Trophy } from 'lucide-react';
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

export function Dashboard({ user, currentUserProfile, onNavigate, onStartGuide }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const isKontrolAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP' || currentUserProfile?.role === 'ADMINISTRATEUR_KONTROL' || currentUserProfile?.role === 'GESTIONNAIRE_KONTROL' || currentUserProfile?.role === 'ADMIN';
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
  // Reactive subscription alert and trial tracker computed directly from the live profile
  const subscriptionAlertMemo = React.useMemo(() => {
    if (!currentUserProfile || isKontrolAdmin) return null;
    
    // Check if the account is officially subscribed (status is ACTIVE and isDemo/trial is inactive)
    const isSubscribed = currentUserProfile.subscriptionStatus === 'ACTIVE' && !currentUserProfile.isDemo;

    if (isSubscribed) {
      if (currentUserProfile.subscriptionEndDate) {
        const endDate = currentUserProfile.subscriptionEndDate;
        const now = Date.now();
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        // Dynamically displays ONLY if subscription is close to expiry (e.g. 10 days or fewer)
        if (daysLeft <= 10) {
          return {
            isDemo: false,
            daysLeft: Math.max(0, daysLeft),
            expiryDate: new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            endDate
          };
        }
      }
      return null; // Trial banner and subscription warning disappear completely for non-expiring subscriptions
    }

    // Default to Trial / Demo logic if they are still on a Trial
    if (currentUserProfile.isDemo || currentUserProfile.subscriptionStatus === 'TRIAL') {
      const endDate = currentUserProfile.subscriptionEndDate || 0;
      const now = Date.now();
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      return {
        isDemo: true,
        daysLeft: Math.max(0, daysLeft),
        expiryDate: endDate ? new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A',
        endDate
      };
    }
    
    return null;
  }, [currentUserProfile, isKontrolAdmin]);
  
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

  React.useEffect(() => {
    if (!isKontrolAdmin) return;

    // Fetch Global Stats for ERP Admin
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map(d => d.data());
      const companies = new Set(users.map(u => u.companyId).filter(Boolean));
      setGlobalStats(prev => ({ 
        ...prev, 
        totalUsers: snap.size,
        activeCompanies: companies.size
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users', user, false));

    const unsubTickets = onSnapshot(query(collection(db, 'tickets'), where('status', '==', 'NEW')), (snap) => {
      setGlobalStats(prev => ({ ...prev, pendingTickets: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tickets', user, false));

    const unsubTrans = onSnapshot(collection(db, 'transactions'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (doc.data().montantTotal || 0), 0);
      
      // Group by month for chart
      const months: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const date = new Date(doc.data().date || Date.now());
        const month = date.toLocaleString('default', { month: 'short' });
        months[month] = (months[month] || 0) + (doc.data().montantTotal || 0);
      });

      const sortedMonths = Object.entries(months).sort((a, b) => {
        const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsOrderFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        const getIdx = (m: string) => {
          const idx = monthsOrder.indexOf(m);
          return idx !== -1 ? idx : monthsOrderFr.indexOf(m.toLowerCase());
        };
        return getIdx(a[0]) - getIdx(b[0]);
      });

      const chartData = sortedMonths.map(([month, total]) => ({ month, total }));
      setGlobalStats(prev => ({ ...prev, totalRevenue: total, revenueData: chartData }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions', user, false));

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => {
        const p = doc.data();
        return acc + (p.type === 'ENCAISSEMENT' ? (p.montant || 0) : -(p.montant || 0));
      }, 0);
      setGlobalStats(prev => ({ ...prev, totalTreasury: total }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments', user, false));

    const unsubActions = onSnapshot(query(
      collection(db, 'actions'), 
      where('timestamp', '>=', startOfToday),
      orderBy('timestamp', 'desc'), 
      limit(5)
    ), (snap) => {
      setGlobalStats(prev => ({ ...prev, recentActions: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'actions', user, false));

    return () => {
      unsubUsers();
      unsubTickets();
      unsubTrans();
      unsubPayments();
      unsubActions();
    };
  }, [isKontrolAdmin]);

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

    if (isKontrolAdmin) {
      // ERP Admin Stats
      const qUsers = query(collection(db, 'users'));
      unsubscribes.push(onSnapshot(qUsers, (snapshot) => {
        const users = snapshot.docs.map(doc => doc.data());
        const companies = new Set(users.map(u => u.companyId).filter(Boolean));
        setStats(prev => ({ 
          ...prev, 
          totalUsers: snapshot.size,
          totalCompanies: companies.size
        }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users', user, false)));

      const qTickets = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      unsubscribes.push(onSnapshot(qTickets, (snapshot) => {
        setRecentTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStats(prev => ({ ...prev, totalTickets: snapshot.size }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'tickets', user, false)));

      const qActions = query(
        collection(db, 'actions'), 
        where('timestamp', '>=', startOfToday),
        orderBy('timestamp', 'desc')
      );
      unsubscribes.push(onSnapshot(qActions, (snapshot) => {
        setRecentActions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'actions', user, false)));
    } else {
      // Regular Company Stats
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
        // ...Existing CA/Achat calculations...
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

        // Lazy compute trends when we have all data
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
        where('timestamp', '>=', startOfToday),
        orderBy('timestamp', 'desc')
      );
      unsubscribes.push(onSnapshot(qActions, (snapshot) => {
        setRecentActions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        checkLoading();
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'actions', user, false)));

      // Real-time subscription and trial info is computed reactively from currentUserProfile
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, companyId, currentUserProfile, isKontrolAdmin]);

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
    if (isKontrolAdmin) return 0;
    const steps = [
      Boolean(currentUserProfile?.companyName && currentUserProfile?.companyLogo),
      stats.produits > 0,
      stats.clients > 0 || stats.fournisseurs > 0,
      stats.ca > 0 || (stats.depenses + stats.achats) > 0,
      localStorage.getItem('kontrol_guide_dashboard_seen') === 'true'
    ];
    const completedCount = steps.filter(Boolean).length;
    return Math.round((completedCount / steps.length) * 100);
  }, [currentUserProfile, stats, isKontrolAdmin]);

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

  if (isKontrolAdmin) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-kontrol-dark/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-kontrol-blue mb-1">
              <Activity size={18} className="animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.3em]">System Status: Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Server Load</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-3 h-1 rounded-full", i <= 2 ? "bg-emerald-500" : "bg-kontrol-border")} />
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Global KPIs - Technical Grid Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-kontrol-dark/10 divide-x divide-y md:divide-y-0 divide-kontrol-dark/10 cursor-pointer">
          <div className="p-8 bg-white hover:bg-kontrol-bg transition-colors group">
            <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] mb-4">Global Treasury Balance</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{formatCurrency(globalStats.totalTreasury)}</h3>
              <span className="text-[10px] font-bold text-emerald-500">Net</span>
            </div>
            <div className="mt-4 h-1 w-full bg-kontrol-border rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[85%]" />
            </div>
          </div>

          <div className="p-8 bg-white hover:bg-kontrol-bg transition-colors group">
            <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] mb-4">Total Revenue Flow</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{formatCurrency(globalStats.totalRevenue)}</h3>
              <span className="text-[10px] font-bold text-kontrol-blue">Gross</span>
            </div>
            <div className="mt-4 h-1 w-full bg-kontrol-border rounded-full overflow-hidden">
              <div className="h-full bg-kontrol-blue w-[75%]" />
            </div>
          </div>

          <div className="p-8 bg-white hover:bg-kontrol-bg transition-colors group">
            <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] mb-4">Active Nodes (Users)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{globalStats.totalUsers}</h3>
              <span className="text-[10px] font-bold text-kontrol-blue">Live</span>
            </div>
            <div className="mt-4 flex gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={cn("flex-1 h-4 rounded-sm", Math.random() > 0.3 ? "bg-kontrol-blue/20" : "bg-kontrol-blue")} />
              ))}
            </div>
          </div>

          <div className="p-8 bg-white hover:bg-kontrol-bg transition-colors group">
            <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] mb-4">Company Instances</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{globalStats.activeCompanies}</h3>
              <span className="text-[10px] font-bold text-purple-500">Scale</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              <span className="text-[9px] font-bold text-purple-500 uppercase">Provisioning Active</span>
            </div>
          </div>

          <div className="p-8 bg-white hover:bg-kontrol-bg transition-colors group">
            <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] mb-4">System Alerts</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{globalStats.pendingTickets}</h3>
              <span className="text-[10px] font-bold text-rose-500">Critical</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <AlertTriangle size={12} className="text-rose-500" />
              <span className="text-[9px] font-bold text-rose-500 uppercase">Action Required</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart - Technical Style */}
          <div className="lg:col-span-2 border border-kontrol-dark/10 bg-white">
            <div className="p-6 border-b border-kontrol-dark/10 flex items-center justify-between bg-kontrol-bg/30">
              <div className="flex items-center gap-3">
                <TrendingUp size={16} className="text-kontrol-blue" />
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Ecosystem Revenue Analytics</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-kontrol-blue" />
                  <span className="text-[9px] font-bold uppercase">Revenue</span>
                </div>
              </div>
            </div>
            <div className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={globalStats.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                  <Tooltip 
                    shared={false}
                    contentStyle={{ backgroundColor: '#141414', borderRadius: '0px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={0.1} 
                    fill="#3b82f6" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Logs - Technical Style */}
          <div className="border border-kontrol-dark/10 bg-white flex flex-col">
            <div className="p-6 border-b border-kontrol-dark/10 flex items-center gap-3 bg-kontrol-bg/30">
              <Activity size={16} className="text-amber-600" />
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Real-time Event Log</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[320px]">
              {globalStats.recentActions.map((action) => (
                <div key={action.id} className="text-[10px] border-l-2 border-kontrol-blue pl-3 py-1 hover:bg-kontrol-bg transition-colors">
                  <div className="flex justify-between text-kontrol-ink-muted mb-1">
                    <span>[{new Date(action.timestamp).toLocaleTimeString()}]</span>
                    <span className="uppercase font-extrabold">{action.userName}</span>
                  </div>
                  <p className="text-kontrol-dark font-bold">{action.action.toUpperCase()}</p>
                  <p className="text-kontrol-ink-soft opacity-70">{action.details}</p>
                </div>
              ))}
              {globalStats.recentActions.length === 0 && (
                <div className="p-12 text-center text-kontrol-ink-muted text-[10px] uppercase font-bold tracking-widest">
                  AUCUNE ACTION ENREGISTRÉE AUJOURD'HUI
                </div>
              )}
            </div>
            <button className="w-full py-4 text-[10px] font-extrabold uppercase tracking-widest text-kontrol-blue hover:bg-kontrol-dark hover:text-white transition-all border-t border-kontrol-dark/10">
              {t('common.actions')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Support Queue - Technical Style */}
          <div className="border border-kontrol-dark/10 bg-white">
            <div className="p-6 border-b border-kontrol-dark/10 flex items-center justify-between bg-kontrol-bg/30">
              <div className="flex items-center gap-3">
                <MessageCircle size={16} className="text-rose-600" />
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Support Incident Queue</h3>
              </div>
              <span className="text-[9px] font-extrabold bg-rose-100 text-rose-600 px-2 py-0.5 rounded uppercase">Priority: High</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-kontrol-bg/50 border-b border-kontrol-dark/10">
                    <th className="px-6 py-3 text-[9px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Origin</th>
                    <th className="px-6 py-3 text-[9px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Incident</th>
                    <th className="px-6 py-3 text-[9px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kontrol-dark/10">
                  {recentTickets.slice((ticketsPage - 1) * itemsPerPage, ticketsPage * itemsPerPage).map((ticket, idx) => (
                    <tr key={ticket.id} className={cn(
                      "hover:bg-kontrol-bg/30 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10"
                    )}>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-bold text-kontrol-dark uppercase">{ticket.name}</p>
                        <p className="text-[9px] text-kontrol-ink-muted">{ticket.email}</p>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-kontrol-ink-soft">{ticket.subject}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest border",
                          ticket.status === 'NEW' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          ticket.status === 'OPEN' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                        )}>
                          {ticket.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentTickets.length > itemsPerPage && (
              <div className="p-4 border-t border-kontrol-dark/10 flex items-center justify-between bg-kontrol-bg/20">
                <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">
                  Page {ticketsPage} sur {Math.ceil(recentTickets.length / itemsPerPage)}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTicketsPage(p => Math.max(1, p - 1))}
                    disabled={ticketsPage === 1}
                    className="p-1.5 border border-kontrol-dark/10 hover:bg-white disabled:opacity-30 transition-colors"
                  >
                    <ArrowDownRight size={14} className="rotate-180" />
                  </button>
                  <button 
                    onClick={() => setTicketsPage(p => Math.min(Math.ceil(recentTickets.length / itemsPerPage), p + 1))}
                    disabled={ticketsPage === Math.ceil(recentTickets.length / itemsPerPage)}
                    className="p-1.5 border border-kontrol-dark/10 hover:bg-white disabled:opacity-30 transition-colors"
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Control Panel - Technical Style */}
          <div className="grid grid-cols-2 gap-4">
            <button className="border border-kontrol-dark/10 p-8 flex flex-col items-center justify-center gap-4 bg-white hover:bg-kontrol-dark hover:text-white transition-all group">
              <Building2 size={24} className="text-kontrol-blue group-hover:text-white" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Provision Instance</span>
            </button>
            <button 
              onClick={handleCodeAnalysis}
              disabled={isAnalyzingCode}
              className="border border-kontrol-dark/10 p-8 flex flex-col items-center justify-center gap-4 bg-white hover:bg-kontrol-dark hover:text-white transition-all group disabled:opacity-50"
            >
              {isAnalyzingCode ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} className="text-emerald-600 group-hover:text-white" />}
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Code Analyzer</span>
            </button>
            <button className="border border-kontrol-dark/10 p-8 flex flex-col items-center justify-center gap-4 bg-white hover:bg-amber-500 hover:text-white transition-all group">
              <Zap size={24} className="text-amber-600 group-hover:text-white" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Maintenance Mode</span>
            </button>
            <button className="border border-kontrol-dark/10 p-8 flex flex-col items-center justify-center gap-4 bg-white hover:bg-purple-600 hover:text-white transition-all group">
              <FileText size={24} className="text-purple-600 group-hover:text-white" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Generate Global Report</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscriptionAlertMemo && (
        subscriptionAlertMemo.isDemo ? (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200/80 p-5 rounded-2xl shadow-sm animate-in slide-in-from-top duration-500 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
                  <Sparkles size={20} className="fill-amber-500/20" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wide flex items-center gap-2">
                    Période d'essai prolongée active
                    <span className="bg-amber-500/20 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                      VIP
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800 font-medium mt-0.5 animate-in fade-in duration-550">
                    Votre accès d'essai a été prolongé jusqu'au <span className="font-extrabold">{subscriptionAlertMemo.expiryDate}</span> ({subscriptionAlertMemo.daysLeft} jours restants). Profitez-en pleinement !
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate?.('abonnements', t('sections.system'), t('common.subscriptions'))}
                className="self-start sm:self-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>S'abonner maintenant</span> <ArrowRight size={12} />
              </button>
            </div>
            
            {/* Real-time trial evolution status bar */}
            <div className="space-y-1.5 pt-1.5 border-t border-amber-200/40">
              <div className="flex justify-between items-center text-[10px] text-amber-800 font-bold">
                <span>Progression : {Math.max(0, 100 - Math.min(100, Math.round((subscriptionAlertMemo.daysLeft / 30) * 100)))}% écoulé</span>
                <span className="font-extrabold text-amber-900">{subscriptionAlertMemo.daysLeft} jours restants</span>
              </div>
              <div className="w-full h-2 bg-amber-500/10 rounded-full overflow-hidden p-[1px] border border-amber-500/10">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, (subscriptionAlertMemo.daysLeft / 30) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  {t('dashboard.alerts.subscription_expiring')}
                </p>
                <p className="text-xs text-amber-700">
                  {t('dashboard.alerts.subscription_expiry_date', { date: subscriptionAlertMemo.expiryDate, days: subscriptionAlertMemo.daysLeft })}
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate?.('abonnements', t('sections.system'), t('common.subscriptions'))}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t('dashboard.alerts.renew_now')}
            </button>
          </div>
        )
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

        {!isKontrolAdmin && (
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
        )}
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
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
        <div className="card-hd">
          <h4 className="card-title">{t('dashboard.activity.title')}</h4>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('dashboard.activity.columns.action')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('dashboard.activity.columns.module')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('dashboard.activity.columns.date')}</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-kontrol-border">
                  {recentActions.slice((actionsPage - 1) * itemsPerPage, actionsPage * itemsPerPage).map((action, idx) => (
                    <tr key={action.id} className={cn(
                      "hover:bg-kontrol-bg/30 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/40"
                    )}>
                      <td className="px-4 py-3 text-[13px] font-medium text-kontrol-dark">
                        <div className="flex flex-col">
                          <span>{action.action}</span>
                          <span className="text-[10px] text-kontrol-ink-muted">{action.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-kontrol-ink-soft">
                        {action.details || '-'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-kontrol-ink-muted">
                        {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
