import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Info,
  Lightbulb,
  ArrowRight
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
}

export function AppGuideAssistant({ activeTab, forceOpen = false, onCloseForce }: AppGuideAssistantProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Tour database for each page/feature in KONTROL
  const tours: Record<string, TourGuide> = {
    dashboard: {
      tabName: "Tableau de Bord",
      intro: "Bienvenue sur votre centre de pilotage KONTROL. C'est ici que vous suivez la santé financière de votre entreprise en temps réel.",
      steps: [
        {
          title: "Indicateurs de Performance (KPIs)",
          badge: "Aperçu Global",
          elementDesc: "Ces fiches de synthèse résument vos performances financières en temps réel : Trésorerie instantanée disponible, Chiffre d'Affaires consolidé, et Encours restants.",
          tip: "Cliquez sur l'indicateur de trésorerie pour être directement réorienté vers l'analyse de flux.",
          selector: '.grid.grid-cols-2.md\\:grid-cols-4'
        },
        {
          title: "Graphiques d'Évolution",
          badge: "Visualisation",
          elementDesc: "Ce composant dynamique affiche les courbes de vos encaissements consolidés face à vos décaissements sur les derniers mois de l'exercice.",
          tip: "Vous pouvez basculer entre diagramme en barres ou courbe de tendance pour identifier vos pics d'activité.",
          selector: '.recharts-responsive-container'
        },
        {
          title: "Raccourcis d'Actions Rapides",
          badge: "Efficacité",
          elementDesc: "Utilisez ces boutons d'apprentissage et d'analyse intégrés pour générer un audit complet de votre espace ou déclencher l'assistant d'IA.",
          tip: "Lancer régulièrement le Code Analyzer ou l'Analyse d'Intelligence contextuelle pour garder vos indicateurs sains.",
          selector: 'header.flex .bg-gradient-to-r, header.flex select, button[class*="BrainCircuit"]'
        }
      ]
    },
    tiers: {
      tabName: "Gestion des Tiers / CRM",
      intro: "Vos clients et vos fournisseurs sont le moteur de votre activité. Cette section centralise les identités, les historiques et les balances comptables.",
      steps: [
        {
          title: "Annuaire des partenaires",
          badge: "Fichier CRM",
          elementDesc: "Le tableau principal répertorie l'ensemble de vos contacts d'affaires triés par type : Client ou Fournisseur, avec leurs fiches de contacts complets.",
          tip: "Saisissez les coordonnées de contact complètes pour faciliter l'envoi direct de vos factures.",
          selector: 'table'
        },
        {
          title: "Création Rapide de Tiers",
          badge: "Ajout Instantané",
          elementDesc: "Déclarez un nouveau prospect, client exclusif ou sous-traitant logistique d'un seul geste à l'aide du bouton d'ajout rapide.",
          tip: "Le système valide automatiquement la conformité minimale des adresses e-mail pour sécuriser vos échanges.",
          selector: 'button.btn-primary, [class*="plus"], [class*="add"]'
        }
      ]
    },
    produits: {
      tabName: "Registre des Produits & Tarifs",
      intro: "Gérez votre inventaire de marchandises et votre catalogue de services avec exactitude pour assurer une tarification optimale.",
      steps: [
        {
          title: "Catalogue d'Articles",
          badge: "Inventaire",
          elementDesc: "Consultez l'ensemble de votre catalogue. Chaque service ou produit est décrit par sa catégorie logistique, son taux de TVA et ses prix conseillés.",
          tip: "N'hésitez pas à remplir les fiches détaillées pour bénéficier des rapports de rentabilité automatisés par article.",
          selector: 'table'
        },
        {
          title: "Saisie d'Article Nouveau",
          badge: "Nouveau Tarif",
          elementDesc: "Intégrez de nouveaux services, formules d'abonnements ou références physiques de composants directement via ce point d'entrée.",
          tip: "Spécifiez des alertes de sous-approvisionnement directement lors de la création.",
          selector: 'button.btn-primary, button[class*="blue"]'
        }
      ]
    },
    transactions: {
      tabName: "Transactions & Factures",
      intro: "C'est l'outil de gestion de vos flux réels. Enregistrez chaque entrée ou sortie d'argent et générez des factures professionnelles.",
      steps: [
        {
          title: "Livre Chronologique",
          badge: "Journal des Flux",
          elementDesc: "Tous vos flux d'affaires (ventes et achats) sont consignés par ordre de date d'établissement avec indication de leurs règlements.",
          tip: "Un filtre dynamique vous permet d'isoler uniquement les factures payées des créances à relancer.",
          selector: 'table'
        },
        {
          title: "Ajout de Flux Comptable",
          badge: "Saisie Écriture",
          elementDesc: "Enregistrez une facture de vente d'articles ou un règlement d'achat matériel pour garder votre trésorerie à jour.",
          tip: "Émettre des reçus automatisés réconforte la relation commerciale avec vos clients.",
          selector: 'button.btn-primary'
        }
      ]
    },
    charges: {
      tabName: "Charges d'Exploitation",
      intro: "Gardez le contrôle sur vos coûts fixes et vos dépenses de fonctionnement pour préserver vos marges bénéficiaires.",
      steps: [
        {
          title: "Suivi des Dépenses",
          badge: "Coûts réels",
          elementDesc: "Cette base de données compile vos charges régulières : abonnements cloud, électricité, frais de missions professionnelles ou loyer.",
          tip: "Ventilez les dépenses pour déceler immédiatement les opportunités d'économies budgétaires.",
          selector: 'table'
        },
        {
          title: "Graphiques Analytiques",
          badge: "Camembert",
          elementDesc: "Visualisez à l'aide d'un graphe sectoriel la répartition fine de vos charges selon les pôles de votre entreprise.",
          tip: "Isolez les pics saisonniers de coûts pour équilibrer vos projections de trésorerie.",
          selector: '.recharts-responsive-container'
        }
      ]
    },
    stocks: {
      tabName: "Inventaire & Logistique",
      intro: "Évitez les ruptures et le capital dormant en supervisant les mouvements physiques au sein de vos entrepôts.",
      steps: [
        {
          title: "Mouvements de Stock",
          badge: "Logistique",
          elementDesc: "Consultez les colis stockés et le calcul de la valeur financière brute accumulée par type d'article.",
          tip: "Maintenez à jour les taux d'ajustements de stocks en cas d'avarie ou de perte exceptionnelle.",
          selector: 'table'
        }
      ]
    },
    finance: {
      tabName: "Intelligence Financière",
      intro: "Prenez de la hauteur avec vos indicateurs financiers avancés : prévisions, marges brutes, et attestations de solvabilité.",
      steps: [
        {
          title: "Prévisions de Flux",
          badge: "Trésorerie future",
          elementDesc: "Suivez la trajectoire théorique de votre compte courant entreprise estimée sur 30 et 60 jours grâce à vos flux récurrents.",
          tip: "Utile pour planifier une embauche ou un investissement important en matériel.",
          selector: '.recharts-responsive-container'
        },
        {
          title: "Génération de Certificat d'Attestation",
          badge: "Solvabilité",
          elementDesc: "Émettez instantanément un bilan de conformité synthétisant vos performances clés et vos capitaux de sécurité prouvant votre solidité commerciale.",
          tip: "Ce PDF officiel prêt à l'envoi est l'argument parfait à présenter à vos assureurs ou courtiers financiers.",
          selector: 'button'
        }
      ]
    },
    ai: {
      tabName: "Blue AI Assistant",
      intro: "Blue AI est votre conseiller d'affaires intelligent. Dialoguez en langage naturel ou par commande textuelle pour obtenir des réponses instantanées.",
      steps: [
        {
          title: "Interface Conversationnelle",
          badge: "Requêtes directes",
          elementDesc: "Posez de simples questions orales ou saisissez vos demandes ('Établis un comparatif des charges du mois', 'Rédige une alerte').",
          tip: "Blue AI utilise le moteur Gemini de Google souverain pour rédiger ses conclusions.",
          selector: 'textarea, input'
        },
        {
          title: "Bouton d'envoi",
          badge: "IA Souveraine",
          elementDesc: "Déclenchez la commande pour interroger immédiatement notre base d'apprentissage et produire un résumé structuré.",
          tip: "Consultez les suggestions de requêtes pré-remplies pour accélérer vos analyses quotidiennes.",
          selector: 'button'
        }
      ]
    }
  };

  // Select the appropriate guide based on current activeTab
  const activeGuide = tours[activeTab];

  useEffect(() => {
    if (!activeGuide) return;

    const alreadySeen = localStorage.getItem(`kontrol_guide_${activeTab}_seen`);
    
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
    } else if (!alreadySeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, activeGuide, forceOpen]);

  // Handle active element spotlight bounding box
  const stepsLength = activeGuide?.steps?.length || 0;
  const currentStepData = activeGuide?.steps?.[currentStep];

  useEffect(() => {
    if (!isOpen || !currentStepData?.selector) {
      setHighlightRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStepData.selector);
      if (el) {
        setHighlightRect(el.getBoundingClientRect());
      } else {
        setHighlightRect(null);
      }
    };

    // Fast initial check and continuous poll for late loading components
    updateRect();
    const interval = setInterval(updateRect, 350);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStep, currentStepData?.selector]);

  if (!isOpen || !activeGuide) return null;

  const handleNext = () => {
    if (currentStep < stepsLength - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(`kontrol_guide_${activeTab}_seen`, 'true');
    // Set for first-time checklist update hook
    localStorage.setItem('kontrol_guide_dashboard_seen', 'true');
    setIsOpen(false);
    if (onCloseForce) {
      onCloseForce();
    }
  };

  const hasSpotlight = !!highlightRect;

  // Compute positions of the guide card near the element if highlighted
  let cardStyle: React.CSSProperties = {};
  let relativePlacement = false;

  if (highlightRect) {
    const spaceBelow = window.innerHeight - highlightRect.bottom;
    const spaceAbove = highlightRect.top;
    
    if (window.innerWidth > 768) {
      relativePlacement = true;
      if (spaceBelow > 380) {
        cardStyle = {
          position: 'fixed',
          top: `${highlightRect.bottom + 16}px`,
          left: `${Math.min(window.innerWidth - 480, Math.max(16, highlightRect.left + (highlightRect.width / 2) - 230))}px`,
          width: '460px',
        };
      } else if (spaceAbove > 380) {
        cardStyle = {
          position: 'fixed',
          top: `${highlightRect.top - 420}px`,
          left: `${Math.min(window.innerWidth - 480, Math.max(16, highlightRect.left + (highlightRect.width / 2) - 230))}px`,
          width: '460px',
        };
      } else {
        // Fallback to beautiful side dock
        cardStyle = {
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '420px',
        };
      }
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 overflow-hidden pointer-events-none">
        
        {/* Draw Custom Spotlight Cutout Screen Overlay using general SVG definitions */}
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
            {/* Dark mask backplate, listening for clicks/touches */}
            <rect 
              x="0" 
              y="0" 
              width="100%" 
              height="100%" 
              fill="rgba(15, 23, 42, 0.45)" 
              mask="url(#spotlight-mask-svg)" 
              className="pointer-events-auto cursor-pointer"
              onClick={handleSkip}
            />
            {/* Spotlight ring glowing border */}
            <rect 
              x={highlightRect.left - 8} 
              y={highlightRect.top - 8} 
              width={highlightRect.width + 16} 
              height={highlightRect.height + 16} 
              rx="14" 
              fill="none" 
              stroke="#50B0E0" 
              strokeWidth="2.5" 
              className="animate-pulse"
            />
          </svg>
        ) : (
          /* Normal modal fallback backdrop if no spotlight is found or if mobile scale */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="absolute inset-0 bg-kontrol-dark/45 backdrop-blur-sm pointer-events-auto z-[3998]"
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
            "bg-white rounded-3xl shadow-3xl border border-kontrol-border overflow-hidden z-[3999] flex flex-col pointer-events-auto max-h-[90vh]",
            !relativePlacement && "relative w-full max-w-[460px]"
          )}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-kontrol-blue to-blue-700 text-white p-5 pr-6 relative shrink-0">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-kontrol-orange/10 rounded-full blur-xl -ml-6 -mb-6" />

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
                onClick={handleSkip}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/5 active:scale-95 cursor-pointer"
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
                    onClick={handlePrev}
                    className="flex items-center gap-1.2 px-3 py-2 bg-slate-50 border border-kontrol-border text-kontrol-ink-soft hover:text-kontrol-dark rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all select-none"
                  >
                    <ChevronLeft size={12} /> Préc
                  </button>
                ) : (
                  <button
                    onClick={handleSkip}
                    className="px-3 py-2 bg-white border border-transparent text-kontrol-ink-muted hover:text-kontrol-dark hover:border-kontrol-border rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer transition-all select-none"
                  >
                    Passer
                  </button>
                )}

                <button
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
