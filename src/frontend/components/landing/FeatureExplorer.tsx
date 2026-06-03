import React, { useState } from 'react';
import { 
  X, 
  Box, 
  ArrowLeftRight, 
  Users, 
  BarChart3, 
  Shield, 
  Sparkles, 
  Plus, 
  Minus, 
  Trash2, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  ShieldCheck, 
  Terminal, 
  CornerDownRight, 
  MessageSquare, 
  CheckCircle, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Logo } from '../common/Logo';

interface FeatureExplorerProps {
  featureId: 'stock' | 'transactions' | 'crm' | 'analytics' | 'security' | 'blue_ai';
  onClose: () => void;
}

export function FeatureExplorer({ featureId, onClose }: FeatureExplorerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'explanation' | 'demo'>('explanation');

  // --- DEMOUR STATE 1: STOCK ---
  const [stockItems, setStockItems] = useState([
    { id: 1, name: 'iPhone 15 Pro Max 256GB', qty: 24, ref: 'IPH-15PM-256', price: 950000, location: 'Rayon A-3' },
    { id: 2, name: 'MacBook Pro M3 16"', qty: 8, ref: 'MAC-M3PRO-16', price: 1750000, location: 'Rayon B-1' },
    { id: 3, name: 'AirPods Pro Gen 2', qty: 45, ref: 'AUD-APP2-GEN', price: 180000, location: 'Tiroir C-12' },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [stockLogs, setStockLogs] = useState<string[]>([
    "Initialisation du stock central de démo KONTROL",
    "Réception de +10 AirPods Pro Gen 2 par l'utilisateur",
  ]);

  const handleAdjustQty = (id: number, delta: number) => {
    setStockItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        if (newQty !== item.qty) {
          const sign = delta > 0 ? '+' : '';
          setStockLogs(l => [
            `[Stock] ${item.name} (${item.ref}) : Ajustement de quantité ${sign}${delta} (Nouveau : ${newQty} unités)`,
            ...l
          ]);
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleAddStockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const ref = `DEMO-${newItemName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newItem = {
      id: Date.now(),
      name: newItemName,
      qty: 10,
      ref,
      price: 150000,
      location: 'Section Principale'
    };
    setStockItems(prev => [...prev, newItem]);
    setStockLogs(l => [`[Création] Nouveau produit "${newItem.name}" enregistré sous la référence ${ref}`, ...l]);
    setNewItemName('');
  };

  // --- DEMO STATE 2: TRANSACTIONS ---
  const [transactions, setTransactions] = useState([
    { id: 1, label: 'Vente Client - SARL Fakhry', type: 'INCOME', amount: 3750000, date: 'Aujourd\'hui', category: 'Produits' },
    { id: 2, label: 'Approvisionnement Fournisseur', type: 'OUTCOME', amount: 1200000, date: 'Hier', category: 'Marchandises' },
    { id: 3, label: 'Licences Logiciels Cloud (Vite/Node)', type: 'OUTCOME', amount: 85000, date: '29 Mai 2026', category: 'Abonnements' },
    { id: 4, label: 'Prestation Conseil - Groupe K', type: 'INCOME', amount: 800000, date: '25 Mai 2026', category: 'Services' },
  ]);
  const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'OUTCOME'>('ALL');
  
  const handleSimulateTx = (type: 'INCOME' | 'OUTCOME') => {
    const isIncome = type === 'INCOME';
    const amount = Math.floor(50000 + Math.random() * 950000);
    const label = isIncome 
      ? `Encaissement Client Simulé #${Math.floor(100 + Math.random() * 900)}`
      : `Paiement Charge Simplifié #${Math.floor(100 + Math.random() * 900)}`;
    
    const newTx = {
      id: Date.now(),
      label,
      type,
      amount,
      date: 'Instant T',
      category: isIncome ? 'Vente KONTROL' : 'Frais de Démo'
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const getBalance = () => {
    return transactions.reduce((acc, t) => {
      return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
    }, 5000000); // 5M initial
  };

  // --- DEMO STATE 3: CRM ---
  const [contacts, setContacts] = useState([
    { id: 1, name: 'SOCIÉTÉ COULIBALY & FILS', role: 'CLIENT', deals: 4, totalVolume: 12500000, status: 'Actif', email: 'contact@coulibaly.ci' },
    { id: 2, name: 'ETS DIALLO DISTRIBUTION', role: 'FOURNISSEUR', deals: 11, totalVolume: 8900000, status: 'Actif', email: 'info@diallodistrib.com' },
    { id: 3, name: 'AGENCE CREATIVE SUD', role: 'CLIENT', deals: 2, totalVolume: 1400000, status: 'Inactif', email: 'sud@creative.ci' },
  ]);
  const [selectedContact, setSelectedContact] = useState<typeof contacts[0] | null>(contacts[0]);

  // --- DEMO STATE 4: ANALYTICS ---
  const [analyticsMonths, setAnalyticsMonths] = useState([
    { name: 'Mars', revenue: 4200000, charges: 1800000, clientCount: 18 },
    { name: 'Avril', revenue: 5800000, charges: 2400000, clientCount: 22 },
    { name: 'Mai', revenue: 7900000, charges: 3100000, clientCount: 31 },
  ]);
  const [activeMonthIdx, setActiveMonthIdx] = useState(2);
  const selectedMonthData = analyticsMonths[activeMonthIdx];
  const netProfit = selectedMonthData.revenue - selectedMonthData.charges;
  const profitMargin = ((netProfit / selectedMonthData.revenue) * 100).toFixed(1);

  // --- DEMO STATE 5: SECURITY ---
  const [secLogs, setSecLogs] = useState([
    { time: '21:34:25', type: 'SECURE_CHANNEL', msg: 'Protocole TLS 1.3 activé de bout en bout', status: 'OK' },
    { time: '21:32:11', type: 'FIREWALL', msg: 'Filtrage IP de session validé : Europe-West (Cloud Run)', status: 'OK' },
    { time: '21:28:40', type: 'ENCRYPTION', msg: 'Empreintes de documents comptables hachées en AES-256', status: 'OK' },
  ]);
  const [isAuditing, setIsAuditing] = useState(false);

  const triggerAuditCheck = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const newSecLog = {
        time: timeStr,
        type: 'SECURITY_AUDIT',
        msg: `Audit de sécurité manuel déclenché : 0 anomalie physique détectée • Firestore isolé`,
        status: 'SUCCESS'
      };
      setSecLogs(prev => [newSecLog, ...prev]);
      setIsAuditing(false);
    }, 1200);
  };

  // --- DEMO STATE 6: BLUE AI ---
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; data?: any }>>([
    { 
      sender: 'ai', 
      text: "Bonjour ! Je suis l'intelligence cognitive **Blue AI Brain Engine**. Choisissez une question ou posez-moi vos questions de trésorerie en direct !" 
    }
  ]);
  const [isAiAnswering, setIsAiAnswering] = useState(false);

  const sampleQuestions = [
    { q: "Analyse ma rentabilité de trésorerie", r: "Votre rentabilité est au vert ! Le mois dernier, vous avez dégagé un bénéfice de **4 800 000 F CFA** avec une marge nette de **60.8%**. Votre taux d'encaissement est 3x supérieur à vos frais de fonctionnement, ce qui limite tout risque de défaut de paiement.", focus: 'comptabilite' },
    { q: "Alerte-moi sur les anomalies de stocks", r: "Aucun produit n'est en rupture de stock critique. Cependant, votre référence **MAC-M3PRO-16** n'a plus que **8 unités**, et votre rythme de vente actuel suggère de planifier un réapprovisionnement de 5 unités sous 15 jours.", focus: 'stocks' },
    { q: "Fais-moi un rapport exécutif rapide", r: "📊 **RAPPORT KONTROL EXÉCUTIF** :\n- Solde Disponibilités : **7 565 000 F CFA**\n- Portefeuille Tiers : Clivage sain (75% Clients de confiance)\n- Score de conformité règlementaire : **100%** (Actes de gestion historisés).", focus: 'comptabilite' }
  ];

  const handleAskAi = (question: string) => {
    if (isAiAnswering) return;
    
    // add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: question }]);
    setIsAiAnswering(true);

    setTimeout(() => {
      const answers = sampleQuestions.find(s => s.q === question);
      const reply = answers 
        ? answers.r 
        : `Analyse cognitive finalisée sur votre base de production. Blue AI confirme un solde disponible de ${getBalance().toLocaleString()} F CFA, avec une activité commerciale stable. Votre écosystème KONTROL s'auto-optimise continuellement !`;
      
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setIsAiAnswering(false);
    }, 1000);
    setChatInput('');
  };

  // Content configurations
  const featureConfig = {
    stock: {
      title: "Gestion des Stocks & Logistique",
      badge: "Inclus dans l'offre unique",
      icon: Box,
      color: "from-blue-500 to-indigo-600 border-indigo-200 text-indigo-600",
      bgLight: "bg-indigo-50/50",
      howItWorks: `Le module de Stock de KONTROL unifie en un point unique vos fiches produits, vos mouvements d'inventaire et l'état de votre logistique globale. 

Chaque produit créé est rattaché à une référence unique, une désignation claire, un prix d'évaluation de stock de base et un emplacement d'entrepôt physique défini. 
Toutes les actions financières d'achat de marchandises ou de vente de produits réalisées sur KONTROL peuvent automatiser ou enregistrer un mouvement de stock de sortie ou d'entrée, écartant instantanément les risques d'erreur de saisie manuelle.`,
      whyUseful: `• Évitez les ruptures critiques de stocks en visualisant vos seuils d'alerte en direct.
• Valorisez votre inventaire comptable en temps réel pour équilibrer vos bilans fiscaux.
• Minimisez les pertes et détériorations grâce au suivi rigoureux des emplacements (Rayons, Tiroirs).
• Conservez un historique d'audit irréprochable (traçabilité de chaque entrée/sortie par collaborateur).`,
    },
    transactions: {
      title: "Flux Financiers & Trésorerie Pluri-Canale",
      badge: "Souveraineté Comptable",
      icon: ArrowLeftRight,
      color: "from-emerald-500 to-teal-600 border-teal-200 text-teal-600",
      bgLight: "bg-teal-50/50",
      howItWorks: `KONTROL enregistre la totalité de vos opérations financières en cours ou planifiées de manière chronologique : encaissements clients, dépenses courantes, charges fixes, et salaires de l'équipe.

Chaque saisie intègre le montant brut, le taux de TVA fiscale, le fournisseur ou client associé, et la catégorie comptable harmonisée de l'entreprise. En un clin d'œil, ces flux transforment vos encours en soldes réels cumulés, visibles sur tous les tableaux financiers de synthèse.`,
      whyUseful: `• Maîtrisez au centime près l'argent disponible en banque par rapport à votre caisse.
• Centralisez vos pièces comptables (reçus, factures) en les liant à chaque ligne de transaction.
• Calculez vos marges réelles brutes et nettes sans avoir à ouvrir de tableurs fastidieux.
• Exportez au format PDF sécurisé en 1 clic pour votre expert-comptable ou les banques.`,
    },
    crm: {
      title: "Gestion Intégrée des Tiers (CRM & SRM)",
      badge: "Portefeuille Relationnel",
      icon: Users,
      color: "from-amber-500 to-orange-600 border-orange-200 text-orange-600",
      bgLight: "bg-orange-50/50",
      howItWorks: `Ce module connecte vos fichiers clients (CRM) et fournisseurs (SRM) à votre moteur transactionnel de facturation.

Pour chaque partenaire commercial enregistré, KONTROL compile sa fiche sociale complète : immatriculations fiscales régionales, coordonnées, adresses d'expédition, ainsi que le volume d'affaires total brut généré par le tiers depuis le début de la relation comptable.`,
      whyUseful: `• Identifiez immédiatement vos clients les plus rentables à forte valeur ajoutée.
• Suivez les factures arrivées à échéance pour initier des relances de paiement optimisées sans froisser les relations.
• Gardez un carnet d'adresses d'affaires structuré et partagé au sein de l'organisation.
• Tracez les conditions d'achats auprès de vos fournisseurs réguliers.`,
    },
    analytics: {
      title: "Analytiques de Performance & Graphiques",
      badge: "Visualisation décisionnelle",
      icon: BarChart3,
      color: "from-violet-500 to-purple-600 border-purple-200 text-purple-600",
      bgLight: "bg-purple-50/50",
      howItWorks: `KONTROL convertit automatiquement les données brutes de votre facturation et de vos charges en analyses visuelles de haut niveau.

Grâce à notre moteur graphique épuré et ergonomique, l'écosystème extrait vos revenus récurrents, votre évolution des charges d'exploitation, et votre marge bénéficiaire nette mensuelle par rapport aux objectifs stratégiques.`,
      whyUseful: `• Remplacez l'intuition par des décisions rationnelles et fiables basées sur la donnée financière.
• Surveillez l'évolution de votre marge nette d'exploitation pour évaluer la rentabilité de votre entreprise.
• Simplifiez vos réunions stratégiques grâce à des rapports prêts à être projetés ou exportés.
• Suivez en un clin d'œil les augmentations de coûts opérationnels avant qu'ils n'impactent vos profits.`,
    },
    security: {
      title: "Sécurité Maximale & Traçabilité Complète",
      badge: "Garantie KONTROL Aegis",
      icon: Shield,
      color: "from-rose-500 to-red-600 border-red-200 text-red-600",
      bgLight: "bg-rose-50/50",
      howItWorks: `La sécurité n'est pas un accessoire dans KONTROL : elle constitue les fondations du noyau système. La totalité de vos données fait l'objet d'un cloisonnement cryptographique strict.

Toutes les données métier (factures, montants, volumes, clients) sont stockées dans des compartiments hautement sécurisés de Google Cloud Firestore, avec une validation multi-tenant en temps réel empêchant toute fuite d'un compte vers un autre. Un journal d'audit trace invariablement chaque opération.`,
      whyUseful: `• Soyez assuré de la confidentialité absolue de vos données commerciales stratégiques.
• Visualisez l'historique complet pour savoir exactement qui a posé quel acte de gestion et à quelle heure.
• Verrouillez instantanément les accès grâce aux règles de sécurité Firestore renforcées intégrées d'office.
• Profitez de sauvegardes quotidiennes automatiques redondées géographiquement en Europe.`,
    },
    blue_ai: {
      title: "Intelligence Blue AI & Moteur Cognitif AI",
      badge: "Copilote Stratégique",
      icon: Sparkles,
      color: "from-teal-500 to-cyan-500 border-teal-200 text-cyan-600",
      bgLight: "bg-teal-50/50",
      howItWorks: `Le Cerveau Blue AI (Blue Neural Brain Engine) est une boucle d'intelligence artificielle locale sécurisée qui se connecte au tableau de données de votre entreprise.

Il n'envoie pas vos secrets commerciaux à des modèles extérieurs pour l'entraînement de tiers. Il ingère, trie et structure localement vos chiffres d'exploitation pour identifier les fluctuations anormales, analyser votre balance financière, anticiper vos risques et répondre de façon hautement pertinente à toutes vos questions comptables en langage de tous les jours.`,
      whyUseful: `• Gagnez des heures d'analyse en obtenant des synthèses graphiques financières exploitables rédigées en langage naturel.
• Repérez les incohérences ou les doublons de charges suspectes de manière proactive.
• Obtenez instantanément des recommandations claires et adaptées à votre trésorerie pour optimiser vos marges fiscales.
• Stimulez vos performances financières grâce à des projections d'activité fiables basées sur vos tendances historiques.`,
    }
  };

  const activeFe = featureConfig[featureId];
  const Icon = activeFe.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-left flex flex-col relative pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-kontrol-border py-4 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 hover:bg-kontrol-bg rounded-xl text-xs font-black text-kontrol-ink-soft hover:text-kontrol-dark transition-all border border-kontrol-border cursor-pointer select-none active:scale-95"
          >
            ← Retour à l'accueil
          </button>
          <span className="h-4 w-px bg-kontrol-border" />
          <div className="flex items-center gap-2.5">
            <Logo size="sm" className="border-none shadow-none" />
            <span className="text-sm font-black text-kontrol-dark uppercase tracking-tight">KONTROL</span>
          </div>
        </div>
        
        <div className="text-right hidden sm:block">
          <span className="text-[10px] font-extrabold text-kontrol-blue uppercase tracking-widest bg-kontrol-blue/5 border border-kontrol-blue/15 px-3 py-1 rounded-full">{activeFe.badge}</span>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col animate-in fade-in zoom-in-95 duration-500">
        {/* Main Bento Layout Card */}
        <div className="bg-white rounded-[32px] border border-kontrol-border shadow-2xl overflow-hidden flex flex-col md:flex-row flex-1 min-h-[550px]">
          {/* Side Info Rail */}
          <div className="w-full md:w-[320px] border-r border-kontrol-border p-8 bg-kontrol-bg/20 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${activeFe.color} text-white shadow-lg shrink-0`}>
                  <Icon size={24} />
                </div>
                <div>
                  <span className="text-emerald-600 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={11} /> Actif & sécurisé
                  </span>
                  <h2 className="text-lg font-black text-kontrol-dark tracking-tight leading-snug mt-0.5">{activeFe.title}</h2>
                </div>
              </div>

              {/* In-Page View Switcher */}
              <div className="flex flex-col gap-2 pt-6 border-t border-kontrol-border/60">
                <button 
                  onClick={() => setActiveTab('explanation')}
                  className={`w-full text-left py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider border transition-all ${
                    activeTab === 'explanation' 
                      ? 'border-kontrol-blue bg-white text-kontrol-blue shadow-sm shadow-blue-500/5' 
                      : 'border-transparent text-kontrol-ink-soft hover:bg-white/50 hover:text-kontrol-dark'
                  }`}
                >
                  Description & Utilité
                </button>
                <button 
                  onClick={() => setActiveTab('demo')}
                  className={`w-full text-left py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider border transition-all flex items-center justify-between ${
                    activeTab === 'demo' 
                      ? 'border-kontrol-blue bg-white text-kontrol-blue shadow-sm shadow-blue-500/5' 
                      : 'border-transparent text-kontrol-ink-soft hover:bg-white/50 hover:text-kontrol-dark'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} />
                    Démo Interactive
                  </span>
                  <span className="bg-kontrol-blue/10 text-kontrol-blue text-[9px] px-2 py-0.5 rounded-md font-extrabold">LIVE</span>
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-kontrol-border mt-8">
              <div className="flex items-center gap-2">
                <Logo size="sm" className="opacity-30 border-none shadow-none" />
                <p className="text-[9px] text-kontrol-ink-muted font-bold uppercase tracking-widest leading-none">PROPULSÉ PAR INNOV'KORP</p>
              </div>
            </div>
          </div>

          {/* Master View Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Content Container */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white">
              {activeTab === 'explanation' ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
              
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-kontrol-dark uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-kontrol-blue rounded-full" />
                  Comment fonctionne ce module ?
                </h3>
                <p className="text-sm font-medium text-kontrol-ink-soft leading-relaxed whitespace-pre-line bg-white border border-kontrol-border p-6 rounded-2xl shadow-sm">
                  {activeFe.howItWorks}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-kontrol-dark uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-kontrol-orange rounded-full" />
                  Pourquoi ce module est-il indispensable ?
                </h3>
                <div className="bg-white border border-kontrol-border rounded-2xl shadow-sm p-6">
                  <p className="text-sm font-medium text-kontrol-ink-soft leading-relaxed whitespace-pre-line">
                    {activeFe.whyUseful}
                  </p>
                </div>
              </div>

              {/* Notice */}
              <div className="p-4 rounded-xl bg-kontrol-bg border border-kontrol-border text-[11px] text-kontrol-ink-muted leading-relaxed font-medium flex gap-3 items-center">
                <HelpCircle size={16} className="text-kontrol-blue shrink-0 animate-bounce" />
                <span>Rappel : Cet écosystème est conçu par INNOV'KORP pour garantir une fluidité absolue. Vous pouvez simuler ces fonctionnalités en direct dans l'onglet <strong>Démo Interactive</strong> ci-dessus !</span>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto h-full animate-in fade-in duration-300">
              
              {/* INTERACTIVE DEMO 1: STOCKS */}
              {featureId === 'stock' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm">
                    <div>
                      <h4 className="text-sm font-black text-kontrol-dark uppercase">Simulateur de mouvements de Stocks</h4>
                      <p className="text-[12px] text-kontrol-ink-soft font-medium">Ajustez les stocks en temps réel pour voir la traçabilité des flux.</p>
                    </div>
                    <form onSubmit={handleAddStockItem} className="flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        placeholder="Nouveau produit..."
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        className="bg-kontrol-bg px-3 py-1.5 rounded-xl border border-kontrol-border text-xs font-bold outline-none focus:border-kontrol-blue transition-colors"
                      />
                      <button 
                        type="submit"
                        className="px-3 py-1.5 bg-kontrol-dark text-white rounded-xl text-xs font-bold hover:bg-kontrol-blue transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} /> Créer
                      </button>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-kontrol-border shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-kontrol-bg text-kontrol-ink-muted uppercase font-black text-[10px] tracking-wider border-b border-kontrol-border">
                          <th className="p-3">Référence</th>
                          <th className="p-3">Désignation</th>
                          <th className="p-3 text-center">Quantité</th>
                          <th className="p-3 text-center">Ajuster</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockItems.map(item => (
                          <tr key={item.id} className="border-b border-kontrol-border hover:bg-kontrol-bg/30">
                            <td className="p-3 font-mono font-bold text-kontrol-blue">{item.ref}</td>
                            <td className="p-3">
                              <div className="font-bold text-kontrol-dark">{item.name}</div>
                              <div className="text-[10px] text-kontrol-ink-muted font-medium">{item.location} • {item.price.toLocaleString()} F CFA</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1.5 rounded-lg font-black text-xs ${
                                item.qty === 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {item.qty} u
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => handleAdjustQty(item.id, -1)}
                                  className="w-7 h-7 bg-kontrol-bg hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center justify-center text-kontrol-ink-soft transition-colors"
                                  title="Retirer 1"
                                >
                                  <Minus size={12} />
                                </button>
                                <button 
                                  onClick={() => handleAdjustQty(item.id, 1)}
                                  className="w-7 h-7 bg-kontrol-bg hover:bg-emerald-50 hover:text-emerald-600 rounded-lg flex items-center justify-center text-kontrol-ink-soft transition-colors"
                                  title="Ajouter 1"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Logs physical track */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black uppercase text-kontrol-ink-muted tracking-widest flex items-center gap-1">
                      <Terminal size={12} /> Journal physique en temps réel (KONTROL Logs)
                    </h5>
                    <div className="bg-kontrol-dark text-emerald-400 font-mono text-[10px] p-4 rounded-xl space-y-1.5 max-h-36 overflow-y-auto border border-white/10 select-none">
                      {stockLogs.map((log, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="text-white/30">&gt;</span>
                          <span className="flex-1 leading-normal">{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE DEMO 2: TRANSACTIONS */}
              {featureId === 'transactions' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Solde Trésorerie Estimé</p>
                        <h4 className="text-xl md:text-2xl font-black text-indigo-950 mt-1">{getBalance().toLocaleString()} F CFA</h4>
                      </div>
                      <div className="mt-4 flex gap-1.5">
                        <button 
                          onClick={() => handleSimulateTx('INCOME')}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-[10px] uppercase text-white tracking-wider flex items-center justify-center gap-1"
                        >
                          <ArrowDownRight size={12} /> + Encaissement
                        </button>
                        <button 
                          onClick={() => handleSimulateTx('OUTCOME')}
                          className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 font-bold rounded-xl text-[10px] uppercase text-white tracking-wider flex items-center justify-center gap-1"
                        >
                          <ArrowUpRight size={12} /> - Décaissement
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm">
                      <h4 className="text-xs font-black text-kontrol-dark uppercase mb-2">Filtrer par Flux</h4>
                      <div className="space-y-1">
                        {(['ALL', 'INCOME', 'OUTCOME'] as const).map(f => (
                          <button 
                            key={f}
                            onClick={() => setTxFilter(f)}
                            className={`w-full text-left font-bold text-xs p-2 rounded-xl flex items-center justify-between transition-colors ${
                              txFilter === f ? 'bg-kontrol-blue/5 text-kontrol-blue' : 'hover:bg-kontrol-bg text-kontrol-ink-soft'
                            }`}
                          >
                            <span>{f === 'ALL' ? 'Toutes les écritures' : f === 'INCOME' ? 'Seulement Recettes' : 'Seulement Charges'}</span>
                            {f === 'ALL' && <span className="text-[10px] bg-kontrol-bg px-2 py-0.5 rounded-full border text-kontrol-ink-soft">{transactions.length}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-kontrol-border shadow-sm overflow-hidden">
                    <div className="p-3 border-b bg-kontrol-bg flex items-center justify-between text-[10px] font-black uppercase text-kontrol-ink-muted tracking-wider">
                      <span>Récents Libellés Comptables</span>
                      <span>Montant</span>
                    </div>
                    <div className="divide-y divide-kontrol-border max-h-[220px] overflow-y-auto">
                      {transactions
                        .filter(t => txFilter === 'ALL' || t.type === txFilter)
                        .map(t => (
                          <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-kontrol-bg/20">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {t.type === 'INCOME' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                              </div>
                              <div>
                                <p className="font-bold text-xs text-kontrol-dark">{t.label}</p>
                                <p className="text-[10px] text-kontrol-ink-muted font-medium">{t.date} • {t.category}</p>
                              </div>
                            </div>
                            <span className={`font-mono text-xs font-black ${
                              t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()} F CFA
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE DEMO 3: CRM */}
              {featureId === 'crm' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
                    {/* Contacts list */}
                    <div className="md:col-span-5 bg-white rounded-2xl border border-kontrol-border p-3 space-y-2 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-kontrol-ink-muted p-1">Répertoire de démo</p>
                      <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                        {contacts.map(c => (
                          <button 
                            key={c.id}
                            onClick={() => setSelectedContact(c)}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              selectedContact?.id === c.id 
                                ? 'bg-kontrol-blue/5 border-kontrol-blue/40 shadow-sm' 
                                : 'border-transparent hover:bg-kontrol-bg hover:border-kontrol-border'
                            }`}
                          >
                            <div className="truncate">
                              <p className="font-extrabold text-xs text-kontrol-dark truncate">{c.name}</p>
                              <p className="text-[10px] text-kontrol-ink-muted font-semibold">{c.role} • {c.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contact Detail Card */}
                    <div className="md:col-span-7 bg-white rounded-2xl border border-kontrol-border p-6 shadow-sm flex flex-col justify-between">
                      {selectedContact ? (
                        <div className="space-y-6">
                          <div>
                            <span className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase ${
                              selectedContact.role === 'CLIENT' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              Partenaire : {selectedContact.role}
                            </span>
                            <h4 className="text-base font-black text-kontrol-dark mt-3">{selectedContact.name}</h4>
                            <p className="text-xs text-kontrol-ink-soft mt-0.5">{selectedContact.email}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-y border-kontrol-border py-4">
                            <div>
                              <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase">Opérations associées</p>
                              <p className="text-base font-black text-kontrol-dark mt-0.5">{selectedContact.deals} transactions</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase">Volume d'affaires</p>
                              <p className="text-base font-black text-kontrol-blue mt-0.5">{selectedContact.totalVolume.toLocaleString()} F</p>
                            </div>
                          </div>

                          <div className="bg-kontrol-bg p-4 rounded-xl border flex items-center gap-3">
                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                            <p className="text-[11px] text-kontrol-ink-soft leading-relaxed font-semibold">
                              Ce profil est entièrement sécurisé et certifié comme actif. Aucune dette impayée ou litige n'est en suspens.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-kontrol-ink-soft font-bold text-xs">
                          Sélectionnez un tiers dans la liste à gauche pour voir sa fiche d'affaires KONTROL.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE DEMO 4: ANALYTICS */}
              {featureId === 'analytics' && (
                <div className="space-y-6">
                  {/* Revenue metrics and toggles */}
                  <div className="flex gap-2 justify-center bg-white p-2 rounded-2xl border border-kontrol-border max-w-sm mx-auto shadow-sm">
                    {analyticsMonths.map((m, idx) => (
                      <button 
                        key={m.name}
                        onClick={() => setActiveMonthIdx(idx)}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs transition-colors ${
                          activeMonthIdx === idx ? 'bg-kontrol-dark text-white shadow-md' : 'text-kontrol-ink-soft hover:bg-kontrol-bg'
                        }`}
                      >
                        {m.name} 2026
                      </button>
                    ))}
                  </div>

                  {/* Indicators list */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm">
                      <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase">Volume d'affaires (Chiffre)</p>
                      <p className="text-base font-black text-kontrol-dark mt-1">{(selectedMonthData.revenue).toLocaleString()} F</p>
                      <span className="text-[10px] text-emerald-600 font-extrabold flex items-center mt-1"><TrendingUp size={12} className="inline mr-0.5" /> +25%</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm">
                      <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase">Total des Charges</p>
                      <p className="text-base font-black text-kontrol-dark mt-1">{(selectedMonthData.charges).toLocaleString()} F</p>
                      <span className="text-[10px] text-rose-500 font-extrabold flex items-center mt-1">Stables</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm">
                      <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase">Résultat Net Réel</p>
                      <p className="text-base font-black text-kontrol-blue mt-1">{(netProfit).toLocaleString()} F</p>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100 font-extrabold mt-1 inline-block">MArge {profitMargin}%</span>
                    </div>
                  </div>

                  {/* Simulated graph visual */}
                  <div className="bg-white p-6 rounded-2xl border border-kontrol-border shadow-sm space-y-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-kontrol-ink-muted">
                      <span>Proportion CA Net vs Charges ({selectedMonthData.name})</span>
                      <span className="text-kontrol-dark">{netProfit.toLocaleString()} F CFA net</span>
                    </div>
                    <div className="h-4 bg-kontrol-bg rounded-lg overflow-hidden flex shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${(netProfit / selectedMonthData.revenue) * 100}%` }}
                        title="CA Net"
                      />
                      <div 
                        className="bg-rose-500 h-full transition-all duration-500" 
                        style={{ width: `${(selectedMonthData.charges / selectedMonthData.revenue) * 100}%` }}
                        title="Charges d'exploitation"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-kontrol-ink-soft font-semibold">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span>Marge Trésorerie Saine</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Coûts de Structure</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE DEMO 5: SECURITY */}
              {featureId === 'security' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-kontrol-border shadow-sm">
                    <div>
                      <h4 className="text-sm font-black text-kontrol-dark uppercase">KONTROL Sentinel & Audit Sandbox</h4>
                      <p className="text-[12px] text-kontrol-ink-soft font-semibold">Vérifiez la signature numérique de votre environnement.</p>
                    </div>
                    <button 
                      onClick={triggerAuditCheck}
                      disabled={isAuditing}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider shrink-0"
                    >
                      {isAuditing ? 'Audit en cours...' : 'Déclencher l\'Audit'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-kontrol-ink-muted tracking-wide px-1">
                      <span>Événement Systèmes (Logs)</span>
                      <span>Disponibilité</span>
                    </div>

                    <div className="bg-neutral-900 border border-white/15 text-[11px] text-neutral-300 font-mono rounded-2xl p-4 divide-y divide-white/5 space-y-2 max-h-[220px] overflow-y-auto select-none shadow-xl">
                      {secLogs.map((log, i) => (
                        <div key={i} className="pt-2 flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-white/40">[{log.time}]</span>{' '}
                            <span className="text-amber-400 uppercase font-bold text-[10px] tracking-wider">[{log.type}]</span>{' '}
                            <span className="text-white/80 leading-relaxed font-sans">{log.msg}</span>
                          </div>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[9px]">
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE DEMO 6: BLUE AI */}
              {featureId === 'blue_ai' && (
                <div className="space-y-4">
                  {/* Mini-Chat body */}
                  <div className="bg-white border border-kontrol-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[280px]">
                    <div className="bg-kontrol-bg px-4 py-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center">
                          <Sparkles size={12} />
                        </div>
                        <span className="text-xs font-black text-kontrol-dark uppercase tracking-wider">Blue AI cognitive sandbox</span>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 border border-emerald-100 rounded-full font-bold uppercase">En ligne</span>
                    </div>

                    {/* Messages layer */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-none text-xs">
                      {chatMessages.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
                        >
                          <div className={`max-w-[75%] p-3 rounded-2xl font-semibold leading-relaxed ${
                            msg.sender === 'user' 
                              ? 'bg-kontrol-dark text-white rounded-br-none' 
                              : 'bg-kontrol-bg text-kontrol-dark border rounded-bl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isAiAnswering && (
                        <div className="flex justify-start">
                          <div className="bg-kontrol-bg text-kontrol-ink-soft p-3 rounded-2xl rounded-bl-none border flex items-center gap-2 font-bold">
                            <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart click-prompt shortcuts */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-kontrol-ink-muted tracking-wider px-1">Questions rapides KONTROL</p>
                    <div className="flex flex-wrap gap-2">
                      {sampleQuestions.map((s, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleAskAi(s.q)}
                          disabled={isAiAnswering}
                          className="px-3 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200/50 text-teal-800 text-[11px] font-extrabold rounded-xl transition-colors text-left flex items-center gap-1.5"
                        >
                          <CornerDownRight size={12} className="shrink-0" />
                          <span>{s.q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
            </div>

            {/* Footer Row */}
            <div className="p-4 bg-slate-50 border-t border-kontrol-border flex justify-between items-center shrink-0 text-[10px] text-kontrol-ink-muted font-bold uppercase tracking-wider px-8">
              <span>Plateforme KONTROL • v1.0.0</span>
              <span>Développé par Innov'Korp &copy; 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
