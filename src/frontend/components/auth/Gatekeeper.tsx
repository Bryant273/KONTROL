import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../../types';
import { CompanySetupModal } from './CompanySetupModal';
import { SubscriptionContractModal } from '../subscription/SubscriptionContractModal';
import { Check, ShieldCheck, Building2, FileText } from 'lucide-react';
import { Toaster } from 'sonner';

interface GatekeeperProps {
  profile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  children: React.ReactNode;
}

export function validateTenantGatekeeper(profile: UserProfile | null): {
  isProfileComplete: boolean;
  isContractSigned: boolean;
  isFullyInitialized: boolean;
  currentStep: 'AUTH' | 'SETUP' | 'CONTRACT' | 'READY';
} {
  if (!profile) {
    return { isProfileComplete: false, isContractSigned: false, isFullyInitialized: false, currentStep: 'AUTH' };
  }
  const isProfileComplete = Boolean(profile.isProfileComplete);
  const isContractSigned = Boolean(profile.contractSignedAt);
  const isFullyInitialized = isProfileComplete && isContractSigned;

  let currentStep: 'AUTH' | 'SETUP' | 'CONTRACT' | 'READY' = 'READY';
  if (!isProfileComplete) {
    currentStep = 'SETUP';
  } else if (!isContractSigned) {
    currentStep = 'CONTRACT';
  }

  return { isProfileComplete, isContractSigned, isFullyInitialized, currentStep };
}

export const Gatekeeper: React.FC<GatekeeperProps> = ({ profile, onProfileUpdate, children }) => {
  const { isFullyInitialized, currentStep } = validateTenantGatekeeper(profile);

  if (!profile) {
    return null;
  }

  if (isFullyInitialized) {
    return <>{children}</>;
  }

  const stepNumber = currentStep === 'SETUP' ? 1 : 2;

  return (
    <div className="min-h-screen bg-kontrol-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Onboarding Stepper Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-kontrol-gold" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Initialisation du compte Entreprise
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-kontrol-gold/10 text-kontrol-gold">
            Étape {stepNumber} sur 2
          </span>
        </div>

        {/* Visual Stepper */}
        <div className="grid grid-cols-2 gap-3 relative">
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
            stepNumber === 1 
              ? 'bg-kontrol-gold/10 border border-kontrol-gold/30 text-slate-900 dark:text-white' 
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              stepNumber === 1 ? 'bg-kontrol-gold text-slate-950' : 'bg-emerald-500 text-white'
            }`}>
              {stepNumber > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">Profil Entreprise</p>
              <p className="text-[10px] opacity-75 mt-0.5">Informations & Logo</p>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
            stepNumber === 2 
              ? 'bg-kontrol-gold/10 border border-kontrol-gold/30 text-slate-900 dark:text-white' 
              : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-transparent'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              stepNumber === 2 ? 'bg-kontrol-gold text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              2
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">Contrat d'Abonnement</p>
              <p className="text-[10px] opacity-75 mt-0.5">Validation & Signature</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Animated Modal Switcher */}
      <AnimatePresence mode="wait">
        {currentStep === 'SETUP' && (
          <motion.div
            key="step-setup"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="w-full flex items-center justify-center"
          >
            <CompanySetupModal
              profile={profile}
              onClose={() => {}}
              onComplete={onProfileUpdate}
            />
          </motion.div>
        )}

        {currentStep === 'CONTRACT' && (
          <motion.div
            key="step-contract"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="w-full flex items-center justify-center"
          >
            <SubscriptionContractModal
              profile={profile}
              isOpen={true}
              onClose={() => {}}
              onSigned={onProfileUpdate}
              isMandatoryPopup={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-right" expand={false} richColors />
    </div>
  );
};
