import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Info,
  Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

// Define structure for each step in a tour
interface TourStep {
  title: string;
  elementDesc: string;
  tip: string;
  badge: string;
  selector: string;
}

// Define the guide mapping for each activeTab
interface TourGuide {
  tabName: string;
  intro: string;
  steps: TourStep[];
}

interface AppGuideAssistantProps {
  activeTab: string;
  forceOpen?: boolean;
  onCloseForce?: () => void;
  suppressAutoOpen?: boolean;
}

// Helper to normalize activeTab aliases
const normalizeTabKey = (tab: string): string => {
  if (!tab) return 'dashboard';
  const t = tab.toLowerCase().trim();
  if (t === 'blue_ai' || t === 'blue' || t === 'ia') return 'ai';
  if (t === 'kchat' || t === 'k-chat') return 'chat';
  if (t === 'company_profile' || t === 'company' || t === 'entreprise') return 'company_hub';
  if (t === 'quotes') return 'devis';
  if (t === 'support') return 'tickets';
  if (t === 'alerts') return 'notifications';
  if (t === 'profile') return 'profil';
  return t;
};

// Complete, tailored tour database defined OUTSIDE component to guarantee stable object reference
const TOURS_DATA: Record<string, TourGuide> = {
  dashboard: {
    tabName: "Tableau de Bord",
    intro: "Bienvenue sur votre centre de pilotage KONTROL. C'est ici que vous suivez la santé financière, les indicateurs clés et l'activité globale de votre entreprise en temps réel.",
    steps: [
      {
        title: "Indicateurs Financiers Précis (KPIs)",
        badge: "Ratios Clés",
        elementDesc: "Ces cartes synthétisent vos performances financières instantanées : Trésorerie disponible, Chiffre d'Affaires consolidé, Charges mensuelles et Créances clients.",
        tip: "Cliquez sur l'indicateur de trésorerie pour accéder immédiatement à l'analyse comptable détaillée.",
        selector: '.grid.grid-cols-2.md\\:grid-cols-4, [class*="grid-cols-4"], .grid'
      },
      {
        title: "Graphique de Tendance des Flux",
        badge: "Visualisation",
        elementDesc: "Visualisez la courbe d'évolution comparée de vos encaissements consolidés face à vos décaissements sur les derniers mois.",
        tip: "Survolez les barres ou les points pour consulter le détail exact des montants mensuels.",
        selector: '.recharts-responsive-container, svg.recharts-surface, [class*="Recharts"]'
      },
      {
        title: "Dernières Activités & Journal d'Opérations",
        badge: "Traçabilité",
        elementDesc: "Suivez le fil chronologique des actions exécutées récemment dans votre organisation (factures, mouvements, signatures, accès).",
        tip: "Ce fil est mis à jour instantanément à chaque opération effectuée par vos équipes.",
        selector: 'table, [class*="space-y"], section'
      }
    ]
  },
  tiers: {
    tabName: "Gestion des Tiers / CRM",
    intro: "Centralisez la gestion de vos partenaires commerciaux : prospects, clients réguliers, fournisseurs stratégiques et sous-traitants.",
    steps: [
      {
        title: "Annuaire des Clients & Fournisseurs",
        badge: "Fichier CRM",
        elementDesc: "Le tableau principal répertorie l'ensemble de vos contacts enregistrés avec leurs coordonnées, numéros SIRET et statuts de compte.",
        tip: "Utilisez les onglets supérieurs pour filtrer uniquement vos Clients ou vos Fournisseurs.",
        selector: 'table, tbody, [class*="table"]'
      },
      {
        title: "Barre de Recherche & Filtres Rapides",
        badge: "Filtres",
        elementDesc: "Trouvez un partenaire instantanément en saisissant son nom, sa ville ou son numéro de téléphone.",
        tip: "La recherche est dynamique et s'actualise dès la première lettre saisie.",
        selector: 'input[type="text"], input[placeholder*="rechercher"], input[placeholder*="Rechercher"]'
      },
      {
        title: "Ajout d'un Nouveau Tiers",
        badge: "Création",
        elementDesc: "Déclarez un nouveau client ou un fournisseur en quelques secondes avec contrôle automatique de conformité des emails.",
        tip: "Renseignez l'adresse légale complète pour qu'elle s'affiche automatiquement sur vos factures et devis.",
        selector: 'button[class*="bg-kontrol-blue"], button[class*="btn-primary"], button:has(svg)'
      }
    ]
  },
  produits: {
    tabName: "Catalogue Produits & Services",
    intro: "Gérez votre inventaire de marchandises et votre catalogue de prestations de services avec exactitude tarifaire.",
    steps: [
      {
        title: "Catalogue d'Articles & Tarifs",
        badge: "Catalogue",
        elementDesc: "Consultez l'ensemble de vos références avec leur prix unitaire HT, le taux de TVA associé et leur catégorie d'exploitation.",
        tip: "Remplissez des descriptions détaillées pour enrichir automatiquement vos lignes de factures.",
        selector: 'table, .grid, tbody'
      },
      {
        title: "Recherche & Filtres par Catégorie",
        badge: "Tri",
        elementDesc: "Isolez vos articles par famille ou effectuez une recherche ciblée par désignation.",
        tip: "Passez de l'affichage sous forme de tableau à une vue en grille visuelle selon vos préférences.",
        selector: 'input, select, [placeholder*="Chercher"]'
      },
      {
        title: "Créer une Nouvelle Référence",
        badge: "Ajout Article",
        elementDesc: "Intégrez un nouveau produit physique ou un forfait de service en définissant son coût d'achat et son prix de vente.",
        tip: "Spécifiez un niveau de stock d'alerte pour recevoir une notification en cas de besoin de réapprovisionnement.",
        selector: 'button[class*="bg-kontrol-blue"], button:has(svg)'
      }
    ]
  },
  transactions: {
    tabName: "Transactions & Facturation",
    intro: "C'est votre livre comptable opérationnel : créez vos factures de vente, enregistrez vos achats et suivez les règlements.",
    steps: [
      {
        title: "Journal Chronologique des Flux",
        badge: "Livre Journal",
        elementDesc: "Toutes vos pièces comptables (ventes et achats) sont consignées par ordre de date avec indication de leur état de règlement.",
        tip: "Les créances en attente de paiement affichent un statut d'alerte pour simplifier les relances.",
        selector: 'table, tbody, [class*="space-y"]'
      },
      {
        title: "Émettre une Nouvelle Facture",
        badge: "Facturation",
        elementDesc: "Générez une nouvelle facture certifiée conforme en quelques clics avec calcul automatique des montants HT, TVA et TTC.",
        tip: "Un document PDF certifié est immédiatement édité et téléchargeable.",
        selector: 'button[class*="bg-kontrol-blue"], button[class*="btn-primary"]'
      },
      {
        title: "Exports & Reçus de Paiement",
        badge: "Conformité PDF",
        elementDesc: "Éditez des reçus de règlement ou exportez des duplicatas officiels estampillés du cachet de l'entreprise.",
        tip: "Ces pièces respectent scrupuleusement les normes légales de facturation.",
        selector: 'button[class*="emerald"], button[class*="border"]'
      }
    ]
  },
  charges: {
    tabName: "Gestion des Charges & Frais",
    intro: "Gardez la maîtrise de vos coûts d'exploitation et identifiez les opportunités d'optimisation budgétaire.",
    steps: [
      {
        title: "Registre des Dépenses D'Exploitation",
        badge: "Coûts Réels",
        elementDesc: "Retrouvez l'ensemble de vos charges courantes (loyers, abonnements SaaS, fournitures, missions professionnelles).",
        tip: "Ventilez vos dépenses par catégorie pour analyser précisément la structure de vos coûts.",
        selector: 'table, tbody'
      },
      {
        title: "Répartition Graphique des Charges",
        badge: "Camembert Coûts",
        elementDesc: "Consultez la répartition en pourcentage de vos charges selon les pôles fonctionnels de l'entreprise.",
        tip: "Isolez les variations anormales de dépenses d'un mois sur l'autre.",
        selector: '.recharts-responsive-container, svg'
      },
      {
        title: "Enregistrer une Nouvelle Charge",
        badge: "Nouvelle Dépense",
        elementDesc: "Saisissez une facture fournisseur ou une note de frais avec date d'échéance et mode de paiement.",
        tip: "Joignez le justificatif scanné pour conserver une traçabilité comptable parfaite.",
        selector: 'button[class*="bg-kontrol-blue"], button'
      }
    ]
  },
  devis: {
    tabName: "Devis & Propositions Commerciales",
    intro: "Rédigez des propositions commerciales personnalisées, suivez leur validation et convertissez-les en factures.",
    steps: [
      {
        title: "Registre des Devis & Propositions",
        badge: "Offres",
        elementDesc: "Consultez l'état de vos offres en cours : Brouillon, Transmis au client, Validé ou Décliné.",
        tip: "Filtrez par statut pour identifier rapidement les propositions à relancer.",
        selector: 'table, tbody, [class*="space-y"]'
      },
      {
        title: "Rédiger une Proposition Commerciale",
        badge: "Création Devis",
        elementDesc: "Composez un devis sur mesure en sélectionnant le client et les lignes d'articles de votre catalogue.",
        tip: "Les conditions de paiement et la durée de validité sont calculées automatiquement.",
        selector: 'button[class*="bg-kontrol-blue"], button'
      },
      {
        title: "Conversion Instantanée en Facture",
        badge: "Productivité",
        elementDesc: "Transformez d'un simple clic un devis accepté par le client en facture définitive sans aucune re-saisie.",
        tip: "Évite les erreurs de retranscription et accélère votre cycle d'encaissement.",
        selector: 'button[class*="emerald"], button'
      }
    ]
  },
  stocks: {
    tabName: "Inventaire & Mouvements de Stock",
    intro: "Suivez l'état de votre stock physique, prévenez les ruptures et valorisez votre patrimoine marchandise.",
    steps: [
      {
        title: "Journal des Mouvements de Stock",
        badge: "Logistique",
        elementDesc: "Retrouvez l'historique complet de vos entrées de marchandises, livraisons et ajustements d'inventaire.",
        tip: "Chaque mouvement indique l'auteur, la date et la justification de la modification.",
        selector: 'table, tbody, .grid'
      },
      {
        title: "Saisie d'un Mouvement Physique",
        badge: "Ajustement",
        elementDesc: "Déclarez une entrée en stock suite à un réapprovisionnement ou une sortie pour perte ou casse.",
        tip: "Maintenez à jour vos quantités pour garantir la fiabilité de votre catalogue en ligne.",
        selector: 'button[class*="bg-kontrol-blue"], button'
      }
    ]
  },
  finance: {
    tabName: "Intelligence Financière",
    intro: "Prenez de la hauteur avec vos indicateurs financiers avancés : prévisions à 30/60j, marges et attestation de solvabilité.",
    steps: [
      {
        title: "Trésorerie & Marges d'Exploitation",
        badge: "Ratios Avancés",
        elementDesc: "Consultez vos soldes nets, vos marges brutes et la trajectoire estimée de vos comptes sur les prochains mois.",
        tip: "Les prévisions sont ajustées automatiquement en fonction de vos échéances clients et fournisseurs.",
        selector: '.grid, [class*="grid-cols"]'
      },
      {
        title: "Courbe Prévisionnelle de Solvabilité",
        badge: "Projection",
        elementDesc: "Évaluez la courbe théorique de vos liquidités disponibles à 30 et 60 jours.",
        tip: "Inestimable pour planifier une embauche stratégique ou un investissement matériel.",
        selector: '.recharts-responsive-container, svg'
      },
      {
        title: "Attestation Officielle de Solvabilité PDF",
        badge: "Certificat PDF",
        elementDesc: "Émettez un certificat officiel résumant vos performances et vos capitaux propres pour prouver votre solidité commerciale.",
        tip: "Document PDF haute qualité prêt à transmettre à vos banquiers, assureurs ou bailleurs.",
        selector: 'button[class*="gradient"], button[class*="blue"], button'
      }
    ]
  },
  ai: {
    tabName: "Assistant Intelligent Blue AI",
    intro: "Blue AI est votre conseiller financier et stratégique. Posez des questions en langage naturel pour obtenir des analyses instantanées.",
    steps: [
      {
        title: "Console de Dialogue Intelligent",
        badge: "Requêtes IA",
        elementDesc: "Saisissez vos questions d'analyse financière ('Rédige une synthèse des créances', 'Compare mes charges du trimestre').",
        tip: "Blue AI croise les données réelles de votre entreprise pour vous fournir des conclusions exactes.",
        selector: 'textarea, input, [class*="overflow-y-auto"]'
      },
      {
        title: "Suggestions de Prompts Métier",
        badge: "Raccourcis",
        elementDesc: "Cliquez sur ces jetons de requêtes pré-formulées pour exécuter immédiatement les audits les plus fréquents.",
        tip: "Idéal pour obtenir un diagnostic rapide en un seul clic.",
        selector: 'button[class*="rounded-full"], [class*="chip"], button'
      }
    ]
  },
  chat: {
    tabName: "Messagerie K-Chat & Équipes",
    intro: "Communiquez en temps réel avec l'ensemble des membres de votre entreprise au sein de canaux sécurisés.",
    steps: [
      {
        title: "Canaux de Discussion & Membres",
        badge: "Navigation",
        elementDesc: "Basculez entre le canal général d'entreprise, vos groupes de projets et vos messages privés.",
        tip: "Sélectionnez un membre dans la liste pour démarrer une conversation directe sécurisée.",
        selector: 'aside, [class*="border-r"], [class*="w-64"]'
      },
      {
        title: "Fil d'Échanges & Historique",
        badge: "Messagerie",
        elementDesc: "Consultez le fil continu des échanges, pièces jointes partagées, images et comptes-rendus d'activité.",
        tip: "Tous les messages sont horodatés et conservés dans la mémoire de l'entreprise.",
        selector: '[class*="overflow-y-auto"], [class*="flex-1"]'
      },
      {
        title: "Zone de Saisie & Envoi",
        badge: "Envoi Rapide",
        elementDesc: "Tapez votre message ou faites glisser un document et appuyez sur Entrée pour le transmettre.",
        tip: "Vous pouvez également solliciter Blue AI directement dans vos échanges.",
        selector: 'textarea, input[type="text"], form'
      }
    ]
  },
  tickets: {
    tabName: "Helpdesk & Support Client",
    intro: "Suivez le traitement des demandes d'assistance et offrez un support réactif à vos utilisateurs.",
    steps: [
      {
        title: "File de Traitement des Demandes",
        badge: "Tickets",
        elementDesc: "Consultez l'ensemble des requêtes ouvertes avec leur niveau de priorité (Basse, Moyenne, Haute, Urgente).",
        tip: "Filtrez par statut pour traiter prioritairement les demandes nécessitant une action rapide.",
        selector: 'table, tbody, [class*="space-y"]'
      },
      {
        title: "Créer un Ticket de Support",
        badge: "Nouveau Ticket",
        elementDesc: "Soumettez une nouvelle demande de support technique ou fonctionnel à l'équipe KONTROL.",
        tip: "Saisissez un titre explicite pour accélérer le temps de prise en charge.",
        selector: 'button[class*="bg-kontrol-blue"], button'
      }
    ]
  },
  company_hub: {
    tabName: "Hub d'Entreprise & Organisation",
    intro: "Gérez l'identité juridique de votre société, l'annuaire de vos collaborateurs et vos paramètres légaux.",
    steps: [
      {
        title: "Informations Légales & KBIS",
        badge: "Raison Sociale",
        elementDesc: "Renseignez la Raison sociale, le numéro SIRET, le numéro de TVA intracommunautaire et le siège social.",
        tip: "Ces mentions légales sont automatiquement réinjectées sur toutes vos factures PDF.",
        selector: 'form, input, textarea'
      },
      {
        title: "Gestion des Collaborateurs & Accès",
        badge: "Équipe",
        elementDesc: "Consultez la liste des membres enregistrés et configurez leurs rôles et autorisations d'accès.",
        tip: "Attribuez les rôles Administrateur, Gestionnaire ou Utilisateur selon les responsabilités.",
        selector: 'table, [class*="grid"], div'
      }
    ]
  },
  profil: {
    tabName: "Profil Utilisateur & Sécurité",
    intro: "Gérez vos informations personnelles de connexion, votre mot de passe et vos préférences d'utilisation.",
    steps: [
      {
        title: "Coordonnées Personnelles",
        badge: "Identité",
        elementDesc: "Mettez à jour votre nom, votre prénom, votre e-mail professionnel et votre rôle principal.",
        tip: "Maintenez votre adresse e-mail à jour pour recevoir les alertes de sécurité prioritaires.",
        selector: 'form, [class*="space-y"]'
      },
      {
        title: "Mot de Passe & Accès Sécurisé",
        badge: "Sécurité",
        elementDesc: "Modifiez votre mot de passe de connexion en respectant les exigences de sécurité renforcée.",
        tip: "Utilisez au moins 8 caractères comprenant des lettres, chiffres et symboles.",
        selector: 'input[type="password"], button'
      }
    ]
  },
  signature: {
    tabName: "Signature Électronique & Cachet",
    intro: "Déposez votre signature officielle ou le tampon de votre entreprise pour sceller vos contrats et factures.",
    steps: [
      {
        title: "Zone de Tracé ou Téléversement",
        badge: "Signature",
        elementDesc: "Dessinez votre signature manuscrite à l'écran ou importez une image transparente de votre tampon d'entreprise.",
        tip: "Privilégiez une image au format PNG avec fond transparent pour un rendu net sur les documents PDF.",
        selector: 'canvas, [class*="border-dashed"], input[type="file"]'
      },
      {
        title: "Enregistrement & Validation Officielle",
        badge: "Certification",
        elementDesc: "Sauvegardez votre signature pour qu'elle s'appose automatiquement sur tous vos contrats et reçus édités.",
        tip: "Vos documents bénéficient d'une empreinte d'authentification certifiée.",
        selector: 'button[class*="bg-kontrol-blue"], button'
      }
    ]
  },
  abonnements: {
    tabName: "Offres & Abonnements KONTROL",
    intro: "Découvrez les caractéristiques de votre formule KONTROL, le nombre de licences actives et les options d'extension.",
    steps: [
      {
        title: "Formule Active & Renouvellement",
        badge: "Forfait",
        elementDesc: "Consultez la formule actuellement souscrite par votre entreprise (Pro, Business, Entreprise) et la période de validité.",
        tip: "Vous pouvez faire évoluer votre offre à tout moment en fonction de l'accroissement de vos équipes.",
        selector: '[class*="border-2"], .card, [class*="bg-gradient"]'
      },
      {
        title: "Grille Comparative des Licences",
        badge: "Abonnements",
        elementDesc: "Comparez les volumes de factures, le nombre d'utilisateurs et les modules d'IA inclus selon les niveaux d'offres.",
        tip: "Sélectionnez l'offre adaptée à votre rythme d'activité.",
        selector: '.grid, [class*="grid-cols"]'
      }
    ]
  },
  actions: {
    tabName: "Journal d'Audit & Sécurité",
    intro: "Accédez au registre exhaustif des actions et événements de sécurité enregistrés au sein de l'application.",
    steps: [
      {
        title: "Registre Chronologique d'Audit",
        badge: "Traçabilité",
        elementDesc: "Chaque création de facture, modification de profil ou connexion est horodatée avec l'identifiant de son auteur.",
        tip: "Assure une transparence totale et facilite les vérifications comptables ou internes.",
        selector: 'table, tbody, [class*="space-y"]'
      },
      {
        title: "Filtres d'Analyse d'Audit",
        badge: "Tri Événements",
        elementDesc: "Filtrer les lignes du journal par type d'action (Connexion, Inscription, Facturation) ou par période.",
        tip: "Permet de cibler rapidement une opération spécifique.",
        selector: 'select, input'
      }
    ]
  },
  notifications: {
    tabName: "Centre de Notifications & Alertes",
    intro: "Ne manquez aucun événement stratégique : relances d'impayés, alertes de sécurité, échéances et mises à jour.",
    steps: [
      {
        title: "Fil d'Actualités & Événements",
        badge: "Alertes",
        elementDesc: "Retrouvez la liste chronologique de toutes les notifications générées par le système KONTROL.",
        tip: "Les événements de sécurité prioritaires apparaissent surlignés pour une visibilité immédiate.",
        selector: '[class*="space-y"], ul, li, div'
      },
      {
        title: "Filtres par Catégorie",
        badge: "Tri",
        elementDesc: "Isolez les notifications par domaine : Sécurité, Comptabilité, Système ou Messages.",
        tip: "Marquez comme lues les notifications traitées pour conserver une boîte d'alerte claire.",
        selector: 'button, nav, [class*="flex"]'
      }
    ]
  },
  data_exchange: {
    tabName: "Importation / Exportation de Données",
    intro: "Exportez l'intégralité de vos écritures ou importez vos données clients et catalogues aux formats CSV / JSON.",
    steps: [
      {
        title: "Module d'Exportation Globale",
        badge: "Export Data",
        elementDesc: "Générez un extrait au format CSV ou JSON de l'ensemble de vos factures, tiers et produits.",
        tip: "Parfait pour transmettre les données à votre expert-comptable ou réaliser une sauvegarde externe.",
        selector: '.grid, button[class*="bg-kontrol-blue"], [class*="border"]'
      },
      {
        title: "Zone d'Importation Structurée",
        badge: "Importation",
        elementDesc: "Déposez vos fichiers de données structurées pour intégrer en masse vos anciens fichiers clients.",
        tip: "Un contrôle automatique d'intégrité est effectué avant l'insertion en base.",
        selector: 'input[type="file"], [class*="border-dashed"]'
      }
    ]
  }
};

export function AppGuideAssistant({ activeTab, forceOpen = false, onCloseForce, suppressAutoOpen = false }: AppGuideAssistantProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const prevForceOpenRef = useRef<boolean>(false);
  const prevTabRef = useRef<string>('');

  const resolvedKey = normalizeTabKey(activeTab);
  const activeGuide = TOURS_DATA[resolvedKey] || TOURS_DATA['dashboard'];

  // Handle open state and reset step ONLY when forceOpen transitions to true or tab changes
  useEffect(() => {
    if (suppressAutoOpen) return;

    const forceJustTriggered = forceOpen && !prevForceOpenRef.current;
    const tabChanged = resolvedKey !== prevTabRef.current;

    prevForceOpenRef.current = forceOpen;
    prevTabRef.current = resolvedKey;

    const alreadySeen = localStorage.getItem(`kontrol_guide_${resolvedKey}_seen`);

    if (forceOpen) {
      setIsOpen(true);
      if (forceJustTriggered || tabChanged) {
        setCurrentStep(0);
      }
    } else if (tabChanged && !alreadySeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStep(0);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [resolvedKey, forceOpen, suppressAutoOpen]);

  // Handle active element spotlight bounding box
  const stepsLength = activeGuide?.steps?.length || 0;
  const currentStepData = activeGuide?.steps?.[currentStep];

  // Smart DOM discovery helper that guarantees framing an actual element on the page
  const findTargetElement = (selectorStr: string): HTMLElement | null => {
    if (!selectorStr) return null;

    // Try primary comma-separated candidate selectors
    const candidates = selectorStr.split(',').map(s => s.trim()).filter(Boolean);
    for (const sel of candidates) {
      try {
        const el = document.querySelector(sel) as HTMLElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) return el;
        }
      } catch (e) {
        // ignore invalid CSS selectors
      }
    }

    // Generic fallback selectors to highlight major structural elements on the active view
    const fallbacks = [
      'main table',
      'main form',
      'main .grid',
      'main section',
      'main header',
      'main button[class*="blue"]',
      'main button[class*="primary"]',
      'main input',
      'table',
      'form',
      '.grid',
      'header'
    ];

    for (const fb of fallbacks) {
      try {
        const el = document.querySelector(fb) as HTMLElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) return el;
        }
      } catch (e) {}
    }

    return null;
  };

  useEffect(() => {
    if (!isOpen || !currentStepData?.selector) {
      setHighlightRect(null);
      return;
    }

    const updateRect = () => {
      const targetEl = findTargetElement(currentStepData.selector);
      if (targetEl) {
        // Smoothly bring target element into focus on the page
        try {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch (e) {}

        const rect = targetEl.getBoundingClientRect();
        setHighlightRect(rect);
      } else {
        setHighlightRect(null);
      }
    };

    updateRect();
    const interval = setInterval(updateRect, 300);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStep, currentStepData?.selector]);

  if (!isOpen || !activeGuide) return null;

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep < stepsLength - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete(e);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleComplete(e);
  };

  const handleComplete = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    localStorage.setItem(`kontrol_guide_${resolvedKey}_seen`, 'true');
    localStorage.setItem('kontrol_guide_dashboard_seen', 'true');
    setIsOpen(false);
    if (onCloseForce) {
      onCloseForce();
    }
  };

  const hasSpotlight = !!highlightRect;

  // Compute precise positioning of the guide card near the element if highlighted
  let cardStyle: React.CSSProperties = {};
  let relativePlacement = false;

  if (highlightRect) {
    const cardHeight = 420;
    const cardWidth = 440;
    const spaceBelow = window.innerHeight - highlightRect.bottom;
    const spaceAbove = highlightRect.top;
    
    if (window.innerWidth > 768) {
      relativePlacement = true;
      let calculatedTop = highlightRect.bottom + 16;
      if (spaceBelow < cardHeight && spaceAbove > cardHeight) {
        calculatedTop = highlightRect.top - cardHeight - 16;
      }
      // Safely clamp inside screen boundaries to avoid overlap or clipping
      calculatedTop = Math.max(20, Math.min(window.innerHeight - cardHeight - 20, calculatedTop));
      const calculatedLeft = Math.min(
        window.innerWidth - cardWidth - 20, 
        Math.max(20, highlightRect.left + (highlightRect.width / 2) - (cardWidth / 2))
      );
      
      cardStyle = {
        position: 'fixed',
        top: `${calculatedTop}px`,
        left: `${calculatedLeft}px`,
        width: `${cardWidth}px`,
      };
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 overflow-hidden pointer-events-none">
        
        {/* Draw Custom Spotlight Cutout Screen Overlay */}
        {hasSpotlight && highlightRect ? (
          <svg className="fixed inset-0 pointer-events-none z-[3998] w-full h-full">
            <defs>
              <mask id="spotlight-mask-svg">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect 
                  x={highlightRect.left - 8} 
                  y={highlightRect.top - 8} 
                  width={highlightRect.width + 16} 
                  height={highlightRect.height + 16} 
                  rx="14" 
                  fill="black" 
                />
              </mask>
            </defs>
            <rect 
              x="0" 
              y="0" 
              width="100%" 
              height="100%" 
              fill="rgba(15, 23, 42, 0.55)" 
              mask="url(#spotlight-mask-svg)" 
              className="pointer-events-auto cursor-pointer"
              onClick={handleSkip}
            />
            <rect 
              x={highlightRect.left - 8} 
              y={highlightRect.top - 8} 
              width={highlightRect.width + 16} 
              height={highlightRect.height + 16} 
              rx="14" 
              fill="none" 
              stroke="#0284C7" 
              strokeWidth="2.5" 
              className="animate-pulse"
            />
          </svg>
        ) : (
          /* Normal modal fallback backdrop without blur artifacts */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="absolute inset-0 bg-slate-900/60 pointer-events-auto z-[3998]"
          />
        )}

        {/* Floating/Centered Guide Card */}
        <motion.div
          initial={relativePlacement ? { scale: 0.95, opacity: 0 } : { scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={relativePlacement ? { scale: 0.95, opacity: 0 } : { scale: 0.92, opacity: 0, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={cardStyle}
          className={cn(
            "bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-[3999] flex flex-col pointer-events-auto max-h-[90vh]",
            !relativePlacement && "relative w-full max-w-[460px]"
          )}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-kontrol-blue to-blue-700 text-white p-5 pr-6 relative shrink-0">
            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl border border-white/10 flex items-center justify-center shadow-inner">
                  <Sparkles size={16} className="text-kontrol-orange animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-kontrol-orange text-white">
                      Guide Interactif
                    </span>
                    <span className="text-[10px] font-bold text-white/80">
                      Module {activeGuide.tabName}
                    </span>
                  </div>
                  <h3 className="text-sm font-black tracking-tight mt-0.5">Visite guidée des outils</h3>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleSkip}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/5 active:scale-95 cursor-pointer"
                title="Fermer le guide"
              >
                <X size={13} className="text-white" />
              </button>
            </div>
          </div>

          {/* Interactive Steps Visual Indicator */}
          <div className="h-1 bg-slate-100 flex shrink-0">
            {activeGuide.steps.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex-1 h-full transition-all duration-300", 
                  idx <= currentStep ? "bg-kontrol-blue" : "bg-slate-100"
                )}
              />
            ))}
          </div>

          {/* Body Content */}
          <div className="p-5 md:p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-3.5">
              {currentStep === 0 && (
                <div className="p-3.5 bg-slate-50 border border-kontrol-border/60 rounded-2xl flex items-start gap-2.5">
                  <Info size={15} className="text-kontrol-blue mt-0.5 shrink-0" />
                  <p className="text-[11.5px] text-kontrol-ink-soft leading-relaxed font-semibold">
                    {activeGuide.intro}
                  </p>
                </div>
              )}

              {/* Main Guide Pointer */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-kontrol-blue/10 text-kontrol-blue border border-kontrol-blue/15 flex items-center justify-center font-black text-[10px]">
                    {currentStep + 1}
                  </div>
                  <span className="text-[8.5px] font-black text-kontrol-blue uppercase tracking-widest bg-kontrol-blue/5 border border-kontrol-blue/15 px-2 py-0.5 rounded-full">
                    {currentStepData.badge}
                  </span>
                </div>

                <h4 className="text-[13.5px] font-black text-kontrol-dark tracking-tight leading-snug">
                  {currentStepData.title}
                </h4>

                <p className="text-[11.5px] text-kontrol-ink leading-relaxed font-semibold">
                  {currentStepData.elementDesc}
                </p>
              </div>

              {/* Pro-Tips panel */}
              <div className="p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex gap-2.5 mt-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Lightbulb size={14} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-amber-700 tracking-widest leading-none">Astuce KONTROL Pro</p>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed font-bold mt-1">
                    {currentStepData.tip}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              {/* Pagination text */}
              <span className="text-[10px] text-kontrol-ink-muted font-bold uppercase tracking-wider">
                Étape {currentStep + 1} sur {stepsLength}
              </span>

              {/* Buttons panel */}
              <div className="flex gap-1.5">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1.2 px-3 py-2 bg-slate-50 border border-kontrol-border text-kontrol-ink-soft hover:text-kontrol-dark rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all select-none"
                  >
                    <ChevronLeft size={12} /> Préc
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-3 py-2 bg-white border border-transparent text-kontrol-ink-muted hover:text-kontrol-dark hover:border-kontrol-border rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer transition-all select-none"
                  >
                    Passer
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className={cn(
                    "flex items-center gap-1.2 px-4 py-2 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest cursor-pointer select-none border border-transparent shadow-md active:scale-95 transition-all",
                    currentStep === stepsLength - 1 
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/15" 
                      : "bg-kontrol-blue hover:bg-blue-600 shadow-kontrol-blue/15"
                  )}
                >
                  {currentStep === stepsLength - 1 ? (
                    <>
                      Terminer <CheckCircle2 size={12} />
                    </>
                  ) : (
                    <>
                      Suivant <ChevronRight size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
