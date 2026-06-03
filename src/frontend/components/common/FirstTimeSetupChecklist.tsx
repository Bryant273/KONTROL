import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy,
  Check,
  Zap,
  X,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../types';

interface FirstTimeSetupChecklistProps {
  currentUserProfile: UserProfile | null;
  stats: {
    produits: number;
    clients: number;
    fournisseurs: number;
    ca: number;
    depenses: number;
    achats: number;
  };
  onNavigate?: (tab: string, section: string, label: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FirstTimeSetupChecklist({ currentUserProfile, stats, onNavigate, isOpen, onClose }: FirstTimeSetupChecklistProps) {
  if (!isOpen) return null;

  // Calculate dynamic completion flags based on real data
  const steps = [
    {
      id: 'profile',
      title: "Identité de l'entreprise",
      description: "Définissez le nom, le logo de marque et l'adresse de facturation officiels.",
      isCompleted: !!currentUserProfile?.companyName && !!currentUserProfile?.companyLogo,
      targetTab: 'profil',
      section: 'Compte',
      label: "Profil d'Entreprise"
    },
    {
      id: 'products',
      title: "Catalogue d'articles",
      description: "Ajoutez une première référence de produit ou service avec son prix public.",
      isCompleted: stats.produits > 0,
      targetTab: 'produits',
      section: 'Registre',
      label: 'Produits & Tarifs'
    },
    {
      id: 'tiers',
      title: "Fichier partenaires (CRM)",
      description: "Déclarez votre premier tiers de confiance : client ou fournisseur.",
      isCompleted: stats.clients > 0 || stats.fournisseurs > 0,
      targetTab: 'tiers',
      section: 'Registre',
      label: 'Gestion des Tiers'
    },
    {
      id: 'transactions',
      title: "Première transaction",
      description: "Documentez un revenu ou un coût pour initialiser votre comptabilité.",
      isCompleted: stats.ca > 0 || stats.depenses > 0 || stats.achats > 0,
      targetTab: 'transactions',
      section: 'Registre',
      label: 'Transactions & Factures'
    },
    {
      id: 'guide',
      title: "Découvrir le Guide",
      description: "Déclenchez la visite guidée pour maîtriser l'ergonomie générale.",
      isCompleted: localStorage.getItem('kontrol_guide_dashboard_seen') === 'true',
      targetTab: 'dashboard',
      section: '',
      label: 'Tableau de Bord',
      isGuideStep: true
    }
  ];

  const completedCount = steps.filter(step => step.isCompleted).length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Card container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="bg-white rounded-3xl shadow-2xl border border-kontrol-border max-w-4xl w-full overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
        >
          {/* Aesthetic colored bar at the top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-kontrol-blue to-kontrol-orange" />

          {/* Header Panel */}
          <div className="p-6 md:p-8 flex items-start justify-between border-b border-kontrol-border bg-slate-50/50 mt-1.5 relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-kontrol-blue/10 border border-kontrol-blue/15 flex items-center justify-center text-kontrol-blue shrink-0">
                <Trophy size={22} className={cn("text-kontrol-orange", progressPercent === 100 && "animate-bounce")} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-black uppercase text-kontrol-dark tracking-wider">
                    Parcours d'initialisation de votre compte
                  </h3>
                  {progressPercent === 100 && (
                    <span className="bg-emerald-500 text-white text-[8.5px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                      COMPLÉTÉ <Check size={10} className="stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-kontrol-ink-soft mt-1 leading-snug">
                  Complétez ces {totalSteps} étapes élémentaires pour configurer votre identité légale, vos produits et enregistrer vos premières transactions réelles.
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-kontrol-ink-muted hover:text-kontrol-dark transition-all cursor-pointer active:scale-95"
              title="Fermer la fenêtre"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Space */}
          <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
            
            {/* Global Progress Gauge */}
            <div className="bg-slate-50 border border-kontrol-border/60 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-kontrol-blue/5 border border-kontrol-blue/15 flex items-center justify-center text-kontrol-blue shrink-0">
                  <Zap size={18} className="text-kontrol-orange" />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold text-kontrol-dark uppercase tracking-wide">
                    Progression globale de la mise en service
                  </h4>
                  <p className="text-[11px] text-kontrol-ink-soft mt-0.5 leading-none">
                    Votre compte d'entreprise est actuellement configuré à {progressPercent}%.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <span className="text-[11.5px] font-extrabold text-kontrol-dark font-mono bg-white border border-kontrol-border px-3 py-1 rounded-lg">
                  {completedCount} sur {totalSteps} Étapes
                </span>
                <div className="flex-1 sm:w-40 h-2.5 bg-slate-200/60 rounded-full overflow-hidden p-[1.5px] border border-slate-200">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-750",
                      progressPercent === 100 ? "bg-emerald-500" : "bg-kontrol-blue"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[13px] font-black text-kontrol-blue font-mono min-w-[36px] text-right">{progressPercent}%</span>
              </div>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {steps.map((step, idx) => (
                <div 
                  key={step.id}
                  className={cn(
                    "p-4.5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden",
                    step.isCompleted 
                      ? "bg-slate-50/70 border-slate-200/80 grayscale-[15%]" 
                      : "bg-gradient-to-b from-white to-slate-50/50 border-kontrol-border hover:border-kontrol-blue/30 shadow-xs"
                  )}
                >
                  {/* Watermark checkbox */}
                  {step.isCompleted && (
                    <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-bl-2xl text-emerald-600">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        "text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono",
                        step.isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-kontrol-blue/10 text-kontrol-blue"
                      )}>
                        {idx + 1}
                      </span>
                      <h4 className={cn(
                        "text-[12.5px] font-extrabold tracking-tight leading-snug",
                        step.isCompleted ? "text-slate-500 line-through" : "text-kontrol-dark"
                      )}>
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-kontrol-ink-soft leading-relaxed font-semibold">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {step.isCompleted ? (
                      <span className="text-[9px] font-extrabold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                        COMPLÉTÉ
                      </span>
                    ) : (
                      <button 
                        onClick={() => {
                          onClose();
                          if (step.isGuideStep) {
                            // Find the guide button in KPI grid or trigger guide opening
                            setTimeout(() => {
                              const nativeClick = document.querySelector('[title*="Lancer le guide"]') as HTMLElement;
                              if (nativeClick) nativeClick.click();
                            }, 350);
                          } else if (onNavigate) {
                            onNavigate(step.targetTab, step.section, step.label);
                          }
                        }}
                        className="text-[9.5px] font-black text-kontrol-blue hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 select-none cursor-pointer hover:underline"
                      >
                        {step.isGuideStep ? 'Lancer' : 'Créer'} <ArrowRight size={11} className="text-kontrol-orange" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Informational Hint footer */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3">
              <Info size={16} className="text-kontrol-blue mt-0.5 shrink-0" />
              <p className="text-[11.5px] text-kontrol-ink-soft leading-relaxed font-semibold">
                Astuce : Chaque étape validée met à jour vos bases de données en arrière-plan. Une fois configuré, vous pourrez désactiver ou masquer définitivement cet indicateur de configuration depuis le tableau de bord.
              </p>
            </div>

          </div>

          {/* Footer action buttons */}
          <div className="p-6 border-t border-kontrol-border bg-slate-50/50 flex items-center justify-end">
            <button
               onClick={onClose}
               className="px-5 py-2.5 bg-gradient-to-r from-kontrol-blue to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest cursor-pointer shadow-sm active:scale-95 transition-all"
            >
               Compris, continuer
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
