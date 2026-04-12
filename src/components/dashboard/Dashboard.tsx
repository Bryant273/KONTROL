import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package,
  Loader2,
  PieChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  X,
  FileText,
  ShieldCheck,
  MessageCircle,
  Activity,
  Zap,
  Settings,
  Building2,
  AlertTriangle,
  BrainCircuit
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { exportToPDF } from '../../lib/export';
import Markdown from 'react-markdown';
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
  User as FirebaseUser 
} from '../../firebase';
import { serverTimestamp, writeBatch, doc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

interface DashboardProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function Dashboard({ user, currentUserProfile }: DashboardProps) {
  const isERPAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP';
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
  const [isSeeding, setIsSeeding] = React.useState(false);
  
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

  React.useEffect(() => {
    if (!isERPAdmin) return;

    // Fetch Global Stats for ERP Admin
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map(d => d.data());
      const companies = new Set(users.map(u => u.companyId).filter(Boolean));
      setGlobalStats(prev => ({ 
        ...prev, 
        totalUsers: snap.size,
        activeCompanies: companies.size
      }));
    });

    const unsubTickets = onSnapshot(query(collection(db, 'tickets'), where('status', '==', 'NEW')), (snap) => {
      setGlobalStats(prev => ({ ...prev, pendingTickets: snap.size }));
    });

    const unsubTrans = onSnapshot(collection(db, 'transactions'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (doc.data().montantTotal || 0), 0);
      
      // Group by month for chart
      const months: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const date = new Date(doc.data().date || Date.now());
        const month = date.toLocaleString('default', { month: 'short' });
        months[month] = (months[month] || 0) + (doc.data().montantTotal || 0);
      });

      const chartData = Object.entries(months).map(([month, total]) => ({ month, total }));
      setGlobalStats(prev => ({ ...prev, totalRevenue: total, revenueData: chartData }));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => {
        const p = doc.data();
        return acc + (p.type === 'ENCAISSEMENT' ? (p.montant || 0) : -(p.montant || 0));
      }, 0);
      setGlobalStats(prev => ({ ...prev, totalTreasury: total }));
    });

    const unsubActions = onSnapshot(query(
      collection(db, 'actions'), 
      where('timestamp', '>=', startOfToday),
      orderBy('timestamp', 'desc'), 
      limit(5)
    ), (snap) => {
      setGlobalStats(prev => ({ ...prev, recentActions: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    });

    return () => {
      unsubUsers();
      unsubTickets();
      unsubTrans();
      unsubPayments();
      unsubActions();
    };
  }, [isERPAdmin]);

  const handleSeedData = async () => {
    if (!isERPAdmin) return;
    setIsSeeding(true);
    try {
      // Seed Users
      await addDoc(collection(db, 'users'), {
        uid: 'seed-user-1',
        email: 'seed@kontrol.com',
        displayName: 'Utilisateur Test',
        role: 'GESTIONNAIRE_ENTREPRISE',
        companyId: 'seed-company-1',
        companyName: 'Entreprise Test',
        isProfileComplete: true,
        createdAt: Date.now()
      });

      // Seed Companies
      await addDoc(collection(db, 'companies'), {
        name: 'Entreprise Test',
        email: 'contact@seed.com',
        status: 'ACTIVE',
        createdAt: Date.now()
      });

      // Seed Tiers
      await addDoc(collection(db, 'tiers'), {
        nom: 'Client Test',
        type: 'CLIENT',
        statut: 'ACTIF',
        ownerId: 'seed-company-1',
        createdAt: Date.now()
      });

      // Seed Produits
      await addDoc(collection(db, 'produits'), {
        reference: 'PROD-001',
        designation: 'Produit Test',
        prixVente: 1000,
        stock: 50,
        ownerId: 'seed-company-1',
        createdAt: Date.now()
      });

      // Seed Transactions
      await addDoc(collection(db, 'transactions'), {
        reference: 'V-001',
        date: Date.now(),
        type: 'VENTE',
        tiersId: 'seed-client-1',
        tiersNom: 'Client Test',
        montantTotal: 5000,
        devise: 'FCFA',
        modePaiement: 'CASH',
        statut: 'PAYE',
        ownerId: 'seed-company-1',
        createdAt: Date.now(),
        articles: []
      });

      // Seed Wallets
      await addDoc(collection(db, 'wallets'), {
        nom: 'Caisse Centrale',
        type: 'CASH',
        solde: 100000,
        devise: 'FCFA',
        ownerId: 'seed-company-1',
        createdAt: Date.now()
      });

      // Seed Tickets
      await addDoc(collection(db, 'tickets'), {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Besoin d\'aide',
        message: 'Ceci est un ticket de test.',
        status: 'NEW',
        priority: 'MEDIUM',
        createdAt: Date.now()
      });

      console.log("Base de données initialisée avec succès !");
    } catch (error) {
      console.error("Erreur lors du seeding:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAIAnalysis = async () => {
    setIsAIModalOpen(true);
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `
        En tant qu'expert en gestion d'entreprise pour l'application KONTROL, analyse les données suivantes et fournis des conseils stratégiques concrets :
        - Chiffre d'Affaires (CA) : ${formatCurrency(stats.ca)}
        - Dépenses Totales : ${formatCurrency(totalExpenses)}
        - Bénéfice Net : ${formatCurrency(benefice)}
        - Trésorerie Actuelle : ${formatCurrency(stats.tresorerie)}
        - Taux de Rendement : ${rendement.toFixed(1)}%
        - Nombre de Clients : ${stats.clients}
        - Nombre de Fournisseurs : ${stats.fournisseurs}
        - Valeur du Stock : ${formatCurrency(stats.stockValue)}
        - Nombre de Produits : ${stats.produits}

        Structure ton analyse en :
        1. Résumé de la situation financière.
        2. Points forts identifiés.
        3. Points d'attention ou risques.
        4. Recommandations stratégiques pour améliorer la rentabilité et la croissance.
        
        Réponds en français, avec un ton professionnel et encourageant.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      console.log("AI Analysis Response received:", response.text?.substring(0, 50) + "...");
      setAiAnalysis(response.text || "Désolé, je n'ai pas pu générer d'analyse pour le moment.");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiAnalysis("Une erreur est survenue lors de l'analyse IA. Veuillez réessayer plus tard.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCodeAnalysis = async () => {
    setIsCodeModalOpen(true);
    setIsAnalyzingCode(true);
    setCodeAnalysis('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `
        En tant qu'expert en sécurité et architecture logicielle pour l'application KONTROL (Full-stack React/Firebase/Express), 
        analyse l'état actuel du système et fournis des recommandations techniques :
        - Nombre d'utilisateurs : ${globalStats.totalUsers}
        - Nombre d'entreprises : ${globalStats.activeCompanies}
        - Volume de transactions : ${globalStats.totalRevenue}
        - Tickets en attente : ${globalStats.pendingTickets}

        Analyse les aspects suivants :
        1. Sécurité des données et règles Firestore.
        2. Performance et scalabilité de l'architecture.
        3. Optimisation du code et des requêtes.
        4. Suggestions de nouvelles fonctionnalités techniques.

        Réponds en français, avec un ton technique et précis.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setCodeAnalysis(response.text || "Désolé, je n'ai pas pu générer d'analyse de code pour le moment.");
    } catch (error) {
      console.error("Code Analysis Error:", error);
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

    if (isERPAdmin) {
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
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users', user)));

      const qTickets = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      unsubscribes.push(onSnapshot(qTickets, (snapshot) => {
        setRecentTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStats(prev => ({ ...prev, totalTickets: snapshot.size }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'tickets', user)));

      const qActions = query(
        collection(db, 'actions'), 
        where('timestamp', '>=', startOfToday),
        orderBy('timestamp', 'desc')
      );
      unsubscribes.push(onSnapshot(qActions, (snapshot) => {
        setRecentActions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'actions', user)));
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
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments', user)));

      const qTransactions = query(collection(db, 'transactions'), where('ownerId', '==', companyId));
      unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
        const docs = snapshot.docs.map(d => d.data());
        const totalCA = docs
          .filter(doc => doc.type === 'VENTE' && doc.statut === 'PAYE')
          .reduce((acc, doc) => acc + (doc.montantTotal || 0), 0);
        const caMois = docs
          .filter(doc => doc.type === 'VENTE' && doc.statut === 'PAYE' && doc.date >= startOfThisMonth)
          .reduce((acc, doc) => acc + (doc.montantTotal || 0), 0);
        const caMoisPrecedent = docs
          .filter(doc => doc.type === 'VENTE' && doc.statut === 'PAYE' && doc.date >= startOfLastMonth && doc.date <= endOfLastMonth)
          .reduce((acc, doc) => acc + (doc.montantTotal || 0), 0);

        const totalAchats = docs
          .filter(doc => doc.type === 'ACHAT' && doc.statut === 'PAYE')
          .reduce((acc, doc) => acc + (doc.montantTotal || 0), 0);
        const achatsMois = docs
          .filter(doc => doc.type === 'ACHAT' && doc.statut === 'PAYE' && doc.date >= startOfThisMonth)
          .reduce((acc, doc) => acc + (doc.montantTotal || 0), 0);
        const achatsMoisPrecedent = docs
          .filter(doc => doc.type === 'ACHAT' && doc.statut === 'PAYE' && doc.date >= startOfLastMonth && doc.date <= endOfLastMonth)
          .reduce((acc, doc) => acc + (doc.montantTotal || 0), 0);

        setStats(prev => ({ 
          ...prev, 
          ca: totalCA, 
          caMois, 
          caMoisPrecedent,
          achats: totalAchats,
          achatsMois,
          achatsMoisPrecedent
        }));
        checkLoading();
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions', user)));

      const qCharges = query(collection(db, 'charges'), where('ownerId', '==', companyId));
      unsubscribes.push(onSnapshot(qCharges, (snapshot) => {
        const docs = snapshot.docs.map(d => d.data());
        const totalDepenses = docs.reduce((acc, doc) => acc + (doc.montant || 0), 0);
        const depensesMois = docs
          .filter(doc => doc.date >= startOfThisMonth)
          .reduce((acc, doc) => acc + (doc.montant || 0), 0);
        const depensesMoisPrecedent = docs
          .filter(doc => doc.date >= startOfLastMonth && doc.date <= endOfLastMonth)
          .reduce((acc, doc) => acc + (doc.montant || 0), 0);

        setStats(prev => ({ 
          ...prev, 
          depenses: totalDepenses,
          depensesMois,
          depensesMoisPrecedent
        }));
        checkLoading();
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'charges', user)));

      const qTiers = query(collection(db, 'tiers'), where('ownerId', '==', companyId));
      unsubscribes.push(onSnapshot(qTiers, (snapshot) => {
        const clients = snapshot.docs.filter(d => d.data().type === 'CLIENT').length;
        const fournisseurs = snapshot.docs.filter(d => d.data().type === 'FOURNISSEUR').length;
        setStats(prev => ({ ...prev, clients, fournisseurs }));
        checkLoading();
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'tiers', user)));

      const qProduits = query(collection(db, 'produits'), where('ownerId', '==', companyId));
      unsubscribes.push(onSnapshot(qProduits, (snapshot) => {
        const totalStock = snapshot.docs.reduce((acc, doc) => acc + ((doc.data().stock || 0) * (doc.data().prixVente || 0)), 0);
        setStats(prev => ({ ...prev, stockValue: totalStock, produits: snapshot.size }));
        checkLoading();
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'produits', user)));

      const qActions = query(
        collection(db, 'actions'), 
        where('companyId', '==', companyId), 
        where('timestamp', '>=', startOfToday),
        orderBy('timestamp', 'desc')
      );
      unsubscribes.push(onSnapshot(qActions, (snapshot) => {
        setRecentActions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        checkLoading();
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'actions', user)));
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, companyId, currentUserProfile, isERPAdmin]);

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

  if (isERPAdmin) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-kontrol-dark/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-kontrol-blue mb-1">
              <Activity size={18} className="animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.3em]">System Status: Operational</span>
            </div>
            <h2 className="text-4xl font-extrabold text-kontrol-dark tracking-tighter uppercase">Mission Control KONTROL</h2>
            <p className="text-[12px] text-kontrol-ink-muted">Supervision de l'écosystème global • v2.4.0-stable</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Server Load</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-3 h-1 rounded-full", i <= 2 ? "bg-emerald-500" : "bg-kontrol-border")} />
                ))}
              </div>
            </div>
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="px-4 py-2 bg-kontrol-dark text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2 hover:bg-kontrol-blue transition-all disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
              System Init
            </button>
          </div>
        </header>

        {/* Global KPIs - Technical Grid Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-kontrol-dark/10 divide-x divide-y md:divide-y-0 divide-kontrol-dark/10">
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
              <ResponsiveContainer width="100%" height="100%">
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
              Access Full Audit Trail
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
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {currentUserProfile?.companyLogo && (
            <div className="w-12 h-12 rounded-xl bg-white border border-kontrol-border p-1 shadow-sm overflow-hidden shrink-0">
              <img src={currentUserProfile.companyLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">
              {currentUserProfile?.companyName || 'Tableau de bord'}
            </h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">Vue d'ensemble de votre activité</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="btn-primary py-1.5 px-4 text-xs flex items-center gap-2 bg-gradient-to-r from-kontrol-blue to-kontrol-orange border-none shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
            Analyse IA
          </button>
          <select className="bg-white border border-kontrol-border rounded-lg px-3 py-1.5 text-[13px] font-medium text-kontrol-ink-soft outline-none focus:border-kontrol-blue transition-colors">
            <option>Ce mois</option>
            <option>Cette année</option>
            <option>Tout</option>
          </select>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="kpi bg-emerald-600 border-emerald-600">
          <p className="kpi-lbl text-white/70">Trésorerie (Solde)</p>
          <h3 className="kpi-val text-white">{formatCurrency(stats.tresorerie)}</h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", 
            tresorerieComment.color.includes('emerald') ? 'text-emerald-200' : 'text-rose-200'
          )}>
            <tresorerieComment.Icon size={10} /> {tresorerieComment.text}
          </p>
        </div>
        <div className="kpi bg-kontrol-dark border-kontrol-dark">
          <p className="kpi-lbl text-white/50">CA (Ventes TTC)</p>
          <h3 className="kpi-val text-kontrol-blue">{formatCurrency(stats.ca)}</h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", 
            caComment.color.includes('emerald') ? 'text-emerald-400' : 'text-rose-400'
          )}>
            <caComment.Icon size={10} /> {caComment.text}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Charges totales</p>
          <h3 className="kpi-val">{formatCurrency(totalExpenses)}</h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", expensesComment.color)}>
            <expensesComment.Icon size={10} /> {expensesComment.text}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Bénéfice net</p>
          <h3 className={cn("kpi-val", benefice >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(benefice)}
          </h3>
          <p className={cn("text-[11px] mt-1.5 flex items-center gap-1 font-bold", profitComment.color)}>
            <profitComment.Icon size={10} /> {profitComment.text}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Taux rendement</p>
          <h3 className="kpi-val text-kontrol-orange">{rendement.toFixed(1)}%</h3>
          <p className="text-[11px] text-kontrol-ink-muted mt-1.5">Performance globale</p>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Nb clients</p>
          <h3 className="kpi-val">{stats.clients}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Nb fournisseurs</p>
          <h3 className="kpi-val">{stats.fournisseurs}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Nb produits</p>
          <h3 className="kpi-val">{stats.produits}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Valeur stock</p>
          <h3 className="kpi-val">{formatCurrency(stats.stockValue)}</h3>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-hd">
            <div>
              <h4 className="card-title">Performance Financière</h4>
              <p className="text-[11.5px] text-kontrol-ink-muted mt-0.5">CA vs Dépenses vs Profit (FCFA)</p>
            </div>
          </div>
          <div className="p-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,48,80,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#7a9ab0'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#7a9ab0'}} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  shared={false}
                  contentStyle={{ borderRadius: '8px', border: '1px solid rgba(0,48,80,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                <Bar dataKey="CA" fill="#50B0E0" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Dépenses" fill="#E06020" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Profit" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <div>
              <h4 className="card-title">Répartition des Dépenses</h4>
              <p className="text-[11.5px] text-kontrol-ink-muted mt-0.5">Achats vs Charges d'exploitation</p>
            </div>
          </div>
          <div className="p-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Achats', value: stats.achats, fill: '#003050' },
                { name: 'Charges', value: stats.depenses, fill: '#E06020' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,48,80,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#7a9ab0'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#7a9ab0'}} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  shared={false}
                  contentStyle={{ borderRadius: '8px', border: '1px solid rgba(0,48,80,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-hd">
          <h4 className="card-title">Activité récente</h4>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Action</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Module</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Date</th>
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
                      Aucune action enregistrée aujourd'hui.
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
                  <h3 className="text-lg font-extrabold text-kontrol-dark">Analyse Stratégique Blue AI</h3>
                  <p className="text-[11px] text-kontrol-ink-muted font-medium uppercase tracking-wider">Intelligence Artificielle de KONTROL</p>
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
                    <p className="text-lg font-bold text-kontrol-dark">Analyse en cours...</p>
                    <p className="text-sm text-kontrol-ink-muted">Blue AI examine vos performances financières</p>
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
                <FileText size={18} /> Exporter en PDF
              </button>
              <button 
                onClick={() => setIsAIModalOpen(false)}
                className="flex-1 bg-kontrol-dark text-white py-3 rounded-xl font-bold hover:bg-kontrol-dark/90 transition-all"
              >
                Fermer
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
    </div>
  );
}
