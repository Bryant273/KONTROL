import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Check,
  Activity,
  UserCheck,
  X,
  Plus,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '../../types';
import { db, doc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, logAction, getDocs } from '../../../api/firebase';
import { apiClient } from '../../../api/lib/api-client';
import { formatCurrency } from '../../lib/utils';
import { generateInvoicePDF } from '../../lib/invoice';

interface SubscriptionsModuleProps {
  profile: UserProfile | null;
}

interface SubscriptionRequest {
  id: string;
  amount: number;
  currency: string;
  transactionId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUCCESS' | 'FAILED';
  createdAt: number;
  type: string;
  previousDueDate?: number | string;
  nextDueDate?: number | string;
}

export function SubscriptionsModule({ profile }: SubscriptionsModuleProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionRequest | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Load subscription/payment validation requests for this company in real-time
  useEffect(() => {
    if (!profile?.companyId) {
      setLoadingRequests(false);
      return;
    }

    const q = query(
      collection(db, 'subscription_requests'),
      where('companyId', '==', profile.companyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: SubscriptionRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          amount: data.amount || 15000,
          currency: data.currency || 'XOF',
          transactionId: data.transactionId || '',
          status: data.status || 'PENDING',
          createdAt: data.createdAt || Date.now(),
          type: data.type || 'WAVE_RENEWAL'
        });
      });
      setRequests(loaded);
      setLoadingRequests(false);
    }, (error) => {
      console.error("Error fetching subscription requests:", error);
      setLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [profile?.companyId]);

  // Helper to handle all operations upon a successful GeniusPay payment
  const handlePaymentSuccessFlow = async (reference: string) => {
    if (!profile) return;
    setPaymentSuccess(true);
    setIsPolling(false);
    
    // Update profile locally if possible
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        subscriptionStatus: 'ACTIVE'
      });
      console.log("[AUTO-DEBLOCAGE] Profile updated in Firebase!");
    } catch (dbErr) {
      console.warn("Firestore update failed, but transaction is successful", dbErr);
    }

    // Approve the subscription request document in Firestore so that the history list updates
    try {
      const reqQuery = query(
        collection(db, 'subscription_requests'),
        where('transactionId', '==', reference)
      );
      const reqSnapshot = await getDocs(reqQuery);
      reqSnapshot.forEach(async (requestDoc) => {
        await updateDoc(doc(db, 'subscription_requests', requestDoc.id), {
          status: 'APPROVED',
          updatedAt: Date.now()
        });
      });
      console.log("[AUTO-DEBLOCAGE] subscription_requests updated in Firebase!");
    } catch (reqErr) {
      console.warn("Firestore subscription_requests update failed", reqErr);
    }

    // Register payment in the core 'payments' collection so it displays on the main dashboard
    try {
      await addDoc(collection(db, 'payments'), {
        description: `Abonnement KONTROL Standard - 30 jours (Réf: ${reference})`,
        montant: 15000,
        type: 'ENCAISSEMENT',
        modePaiement: 'GeniusPay',
        date: Date.now(),
        tiersId: 'system',
        tiersNom: 'GeniusPay',
        ownerId: profile.companyId,
        createdAt: Date.now()
      });
      console.log("[AUTO-DEBLOCAGE] payment logged in core payments collection!");
    } catch (payErr) {
      console.warn("Failed to create entry in core payments collection", payErr);
    }

    // Register transaction in the core 'transactions' collection so it displays on the main dashboard
    try {
      await addDoc(collection(db, 'transactions'), {
        reference: `FAC-${reference.toUpperCase()}`,
        description: `Abonnement KONTROL Standard - 30 jours (Réf: ${reference})`,
        montantTotal: 15000,
        type: 'VENTE',
        modePaiement: 'GeniusPay',
        devise: 'XOF',
        tauxChange: 1,
        montantDevise: 15000,
        statut: 'PAYE',
        ownerId: profile.companyId,
        companyId: profile.companyId,
        createdAt: Date.now(),
        articles: [
          {
            produitId: 'sub_standard_30d',
            designation: 'Abonnement KONTROL Standard 30 jours',
            prixUnitaire: 15000,
            quantite: 1,
            total: 15000
          }
        ]
      });
      console.log("[AUTO-DEBLOCAGE] transaction logged in core transactions collection!");
    } catch (txErr) {
      console.warn("Failed to create entry in core transactions collection", txErr);
    }
    
    // Log action
    await logAction(
      profile.companyId,
      profile.uid,
      profile.displayName || profile.email,
      'RECONNAISSANCE_AUTOMATIQUE_GENIUSPAY_REUSSIE',
      `Paiement GeniusPay détecté automatiquement. Licence prolongée de 30 jours (Réf: ${reference})`
    );

    toast.success("Abonnement activé avec succès ! KONTROL est maintenant débloqué.");
    
    // Auto-close modal after 3.5 seconds
    setTimeout(() => {
      setIsModalOpen(false);
      setPaymentSuccess(false);
      setPaymentReference('');
    }, 3500);
  };

  // Immediate manual verification of payment status
  const verifyPaymentStatus = async () => {
    if (!paymentReference) return;
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/geniuspay/verify/${paymentReference}`);
      const data = await response.json();
      if (response.ok && data.status === 'SUCCESS') {
        await handlePaymentSuccessFlow(paymentReference);
      } else {
        toast.info("Le paiement n'a pas encore été détecté ou est toujours en cours sur la passerelle.");
      }
    } catch (err) {
      console.error("Error verifying payment status manually:", err);
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Immediate manual bypass simulation (for testing / sandbox / developer confirmation)
  const forcePaymentSuccess = async () => {
    if (!paymentReference) return;
    setIsForcing(true);
    try {
      const response = await fetch(`/api/geniuspay/force-success/${paymentReference}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok && data.status === 'SUCCESS') {
        await handlePaymentSuccessFlow(paymentReference);
      } else {
        toast.error("Échec de la simulation de paiement.");
      }
    } catch (err) {
      console.error("Error forcing payment success:", err);
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsForcing(false);
    }
  };

  // Automatic background verification polling for GeniusPay
  useEffect(() => {
    if (!isPolling || !paymentReference) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/geniuspay/verify/${paymentReference}`).catch(e => {
          console.warn("[POLLING] Network call failed (will retry):", e.message);
          return null;
        });
        if (!response) return;

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.warn("[POLLING] Failed to parse JSON response:", jsonErr);
          return;
        }

        if (response.ok && data.status === 'SUCCESS') {
          clearInterval(intervalId);
          await handlePaymentSuccessFlow(paymentReference);
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isPolling, paymentReference, profile]);

  // Automatic reconciliation for any pending subscription requests on load or mount
  useEffect(() => {
    if (requests.length === 0 || !profile) return;

    const pendingRequests = requests.filter(req => req.status === 'PENDING');
    if (pendingRequests.length === 0) return;

    const reconcilePending = async () => {
      for (const req of pendingRequests) {
        try {
          console.log(`[RECONCILIATION] Checking pending transaction: ${req.transactionId}`);
          const response = await fetch(`/api/geniuspay/verify/${req.transactionId}`).catch(e => {
            console.warn(`[RECONCILIATION] Network call failed for transaction ${req.transactionId} (will retry):`, e.message);
            return null;
          });
          if (!response) continue;

          let data;
          try {
            data = await response.json();
          } catch (jsonErr) {
            console.warn(`[RECONCILIATION] Failed to parse JSON response for ${req.transactionId}:`, jsonErr);
            continue;
          }

          if (response.ok && data.status === 'SUCCESS') {
            console.log(`[RECONCILIATION] Transaction ${req.transactionId} verified as successful! Activating subscription...`);
            
            // 1. Update profile subscription status
            await updateDoc(doc(db, 'users', profile.uid), {
              subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
              subscriptionStatus: 'ACTIVE'
            });

            // 2. Update the subscription request status in Firestore
            await updateDoc(doc(db, 'subscription_requests', req.id), {
              status: 'APPROVED',
              updatedAt: Date.now()
            });

            // 3. Register payment in the core 'payments' collection so it shows on the dashboard
            await addDoc(collection(db, 'payments'), {
              description: `Abonnement KONTROL Standard - 30 jours (Réf: ${req.transactionId})`,
              montant: 15000,
              type: 'ENCAISSEMENT',
              modePaiement: 'GeniusPay',
              date: Date.now(),
              tiersId: 'system',
              tiersNom: 'GeniusPay',
              ownerId: profile.companyId,
              createdAt: Date.now()
            });

            // 4. Register transaction in the core 'transactions' collection so it shows on the dashboard
            await addDoc(collection(db, 'transactions'), {
              reference: `FAC-${req.transactionId.toUpperCase()}`,
              description: `Abonnement KONTROL Standard - 30 jours (Réf: ${req.transactionId})`,
              montantTotal: 15000,
              type: 'VENTE',
              modePaiement: 'GeniusPay',
              devise: 'XOF',
              tauxChange: 1,
              montantDevise: 15000,
              statut: 'PAYE',
              ownerId: profile.companyId,
              companyId: profile.companyId,
              createdAt: Date.now(),
              articles: [
                {
                  produitId: 'sub_standard_30d',
                  designation: 'Abonnement KONTROL Standard 30 jours',
                  prixUnitaire: 15000,
                  quantite: 1,
                  total: 15000
                }
              ]
            });

            await logAction(
              profile.companyId,
              profile.uid,
              profile.displayName || profile.email,
              'RECONCILIATION_AUTOMATIQUE_REUSSIE',
              `Abonnement reconcilié et validé pour la référence ${req.transactionId}`
            );

            toast.success(`Votre règlement GeniusPay (${req.transactionId}) a été récupéré et validé avec succès !`);
          }
        } catch (err) {
          console.error(`[RECONCILIATION] Failed for transaction ${req.transactionId}:`, err);
        }
      }
    };

    reconcilePending();
  }, [requests, profile]);

  const handlePayWave = async () => {
    setIsGeneratingLink(true);
    setPaymentSuccess(false);
    setIsPolling(false);
    try {
      toast.success("Génération du lien de paiement GeniusPay sécurisé...");
      
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: profile?.companyId || 'company_001',
          businessName: profile?.companyName || profile?.companyAbbreviation || 'KONTROL',
          phone: (profile as any)?.phoneNumber || '',
          email: profile?.email || '',
          plan: 'monthly',
          amount: 15000
        })
      });

      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Impossible de générer le lien de paiement.");
      }

      setPaymentReference(data.reference);
      setCheckoutUrl(data.checkout_url);
      setIsPolling(true);

      // Create a pending request in Firestore so they see it in real-time
      if (profile?.companyId) {
        await addDoc(collection(db, 'subscription_requests'), {
          companyId: profile.companyId,
          companyName: profile.companyName || profile.companyAbbreviation || 'KONTROL',
          userId: profile.uid,
          userEmail: profile.email,
          amount: 15000,
          currency: 'XOF',
          transactionId: data.reference,
          status: 'PENDING',
          createdAt: Date.now(),
          type: 'GENIUSPAY_RENEWAL'
        });
      }

      toast.success("Redirection vers la passerelle sécurisée GeniusPay...");
      window.open(data.checkout_url, '_blank');
    } catch (error: any) {
      console.error("[GENIUSPAY INITIATION ERROR]", error);
      toast.error(`Impossible d'initier le paiement GeniusPay : ${error.message || error}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'SUCCESS':
        return 'Validé';
      case 'REJECTED':
      case 'FAILED':
        return 'Rejeté';
      case 'PENDING':
      default:
        return 'En attente de validation';
    }
  };

  // Determine standard end date representation
  const getSubscriptionEndDateLabel = () => {
    if (profile?.subscriptionEndDate) {
      const date = new Date(profile.subscriptionEndDate);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    // Default 15 days placeholder if empty
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 15);
    return defaultDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isSubActive = profile?.subscriptionStatus === 'ACTIVE' || !profile?.subscriptionEndDate || profile.subscriptionEndDate > Date.now();
  const isFirstTime = !profile?.subscriptionEndDate || profile.subscriptionStatus === 'TRIAL';
  const mainActionLabel = isFirstTime ? "S'abonner" : "Se réabonner";

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300" id="subscriptions-module-root">
      {/* Header section */}
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-kontrol-blue">
          <CreditCard size={18} />
          <span className="text-[10px] font-extrabold uppercase tracking-widest">{t('subscriptions.title')}</span>
        </div>
        <h1 className="text-3xl font-black text-kontrol-dark tracking-tighter uppercase">
          {t('subscriptions.title')}
        </h1>
        <p className="text-sm text-kontrol-ink-muted">
          {t('subscriptions.subtitle')}
        </p>
      </header>

      {/* Bento Grid: Subscription status & renewal action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Card: Beautiful active plan status */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Active plan details */}
          <div className="p-8 bg-kontrol-dark text-white rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-white/5">
            <div className="absolute top-0 right-0 w-80 h-80 bg-kontrol-blue/15 rounded-full blur-3xl -mr-28 -mt-28 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <span className="px-3.5 py-1.5 bg-kontrol-blue text-[9px] font-extrabold uppercase tracking-widest rounded-full">
                  {t('subscriptions.hero.current_plan', { name: 'Forfait Standard' })}
                </span>
                <h2 className="text-5xl font-black mt-5 tracking-tighter">
                  15 000 F CFA <span className="text-base text-white/50 font-normal">/ mois</span>
                </h2>
              </div>
              
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <ShieldCheck className="text-kontrol-blue" size={32} />
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4 relative z-10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Statut de la licence d'utilisation</span>
                <span className="flex items-center gap-2 font-bold">
                  <span className={`w-2.5 h-2.5 rounded-full ${isSubActive ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                  {isSubActive ? 'Licence Active' : 'Expirée (Paiement requis)'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Date de validité actuelle</span>
                <span className="font-bold">{getSubscriptionEndDateLabel()}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Méthode de règlement</span>
                <span className="font-bold">Règlements Web</span>
              </div>
            </div>

            {/* Prominent Re-subscribe Modal Trigger Button */}
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="text-xs text-white/60 text-center sm:text-left">
                Prolongez instantanément votre accès à KONTROL.
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-kontrol-blue hover:bg-kontrol-blue/90 text-white font-extrabold text-[11px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-lg shadow-kontrol-blue/20 transform active:scale-95"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                {mainActionLabel} (15 000 F CFA)
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Benefits details */}
        <div className="lg:col-span-5">
          <div className="p-8 bg-white border border-kontrol-border rounded-[2.5rem] shadow-sm h-full flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-kontrol-dark tracking-tight uppercase mb-4">
                {t('subscriptions.features_title')}
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-kontrol-dark">Gestion ERP Complète</h4>
                    <p className="text-[10.5px] text-kontrol-ink-muted mt-0.5">Tiers, produits, stocks, factures, finances.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-kontrol-dark">Blue AI Assistant</h4>
                    <p className="text-[10.5px] text-kontrol-ink-muted mt-0.5">Intelligence Artificielle intégrée 24h/24.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-kontrol-dark">Chiffrement & Sécurité</h4>
                    <p className="text-[10.5px] text-kontrol-ink-muted mt-0.5">Sauvegardes quotidiennes et protection.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-kontrol-border flex items-center gap-2 text-kontrol-blue font-extrabold text-[10px] uppercase tracking-wider">
              <ShieldCheck size={14} />
                Paiement direct sécurisé GeniusPay (Wave, Orange, MTN, Moov, Cartes)
            </div>
          </div>
        </div>

      </div>

      {/* Beautiful Modal Component */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="wave-payment-modal-backdrop">
            {/* Backdrop with blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGeneratingLink && setIsModalOpen(false)}
              className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm cursor-default"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] border border-kontrol-border shadow-2xl p-8 z-10 overflow-hidden"
              id="wave-payment-modal-content"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-kontrol-blue/5 rounded-bl-[2.5rem] flex items-center justify-center border-l border-b border-kontrol-blue/5 pointer-events-none" />

              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-kontrol-blue bg-kontrol-blue/10 px-2.5 py-1 rounded-full">
                    Règlements Web
                  </span>
                  <h3 className="text-2xl font-black text-kontrol-dark tracking-tight mt-3">
                    {mainActionLabel}
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => !isGeneratingLink && setIsModalOpen(false)}
                  disabled={isGeneratingLink}
                  className="p-2 bg-kontrol-light hover:bg-kontrol-border rounded-full text-kontrol-dark/60 hover:text-kontrol-dark transition-all disabled:opacity-30 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Main Steps Content */}
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {!paymentReference && !paymentSuccess ? (
                    <motion.div
                      key="init"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <p className="text-xs text-kontrol-ink-muted leading-relaxed">
                        Payez en toute sécurité via la passerelle GeniusPay (Orange Money, MTN, Moov, Wave, Visa, Mastercard). Votre licence sera automatiquement validée et prolongée sans aucune saisie de code ou d'action manuelle de votre part.
                      </p>

                      <div className="p-5 bg-kontrol-light rounded-[1.5rem] border border-kontrol-border">
                        <div className="flex items-center gap-2 text-kontrol-blue text-xs font-extrabold uppercase tracking-wider mb-2">
                          <CreditCard size={14} />
                          Abonnement Standard 30 jours (15 000 F CFA)
                        </div>
                        <p className="text-[11px] text-kontrol-ink-muted mb-4 leading-relaxed">
                          Cliquez ci-dessous pour ouvrir la page de paiement sécurisée de GeniusPay.
                        </p>
                        
                        <button
                          type="button"
                          onClick={handlePayWave}
                          disabled={isGeneratingLink}
                          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-kontrol-blue hover:bg-kontrol-blue/90 text-white font-extrabold text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingLink ? (
                            <RefreshCw className="animate-spin" size={14} />
                          ) : (
                            <>
                              Initier le paiement sécurisé
                              <ExternalLink size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ) : isPolling ? (
                    <motion.div
                      key="polling"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-6 bg-kontrol-dark text-white rounded-[2rem] border border-white/10 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className="flex flex-col items-center justify-center py-4 space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-kontrol-blue animate-spin" />
                          <Activity className="absolute inset-0 m-auto text-kontrol-blue animate-pulse" size={24} />
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-extrabold uppercase tracking-wider text-kontrol-blue">
                            En attente du paiement
                          </h4>
                          <p className="text-[10px] text-white/40 font-mono mt-1">RÉF: {paymentReference}</p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 text-left space-y-3">
                        <p className="text-xs text-white/80 leading-relaxed font-sans">
                          La page de paiement sécurisée de GeniusPay a été ouverte dans un nouvel onglet. Veuillez y finaliser votre transaction.
                        </p>
                        <p className="text-[10px] text-white/60 leading-relaxed font-sans border-t border-white/10 pt-2.5 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-kontrol-blue animate-ping shrink-0" />
                          Vérification automatique en cours... Détection en temps réel.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 font-sans">
                        <button
                          type="button"
                          onClick={() => window.open(checkoutUrl || `https://pay.genius.ci/checkout/sandbox/${paymentReference}?amount=15000&desc=Abonnement%20KONTROL`, '_blank')}
                          className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all border border-white/5 cursor-pointer"
                        >
                          Ouvrir / Réouvrir la page de paiement GeniusPay
                        </button>
                      </div>
                    </motion.div>
                  ) : paymentSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-6 bg-emerald-950 text-emerald-100 rounded-[2rem] border border-emerald-500/20 space-y-5 text-center"
                    >
                      <div className="flex flex-col items-center justify-center py-4 space-y-4">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                          <Check className="text-white font-black" size={32} />
                        </div>
                        
                        <div>
                          <h4 className="text-base font-extrabold uppercase tracking-wider text-emerald-400">
                            Paiement validé avec succès !
                          </h4>
                          <p className="text-[11px] text-emerald-400/70 mt-1">Votre licence KONTROL a été renouvelée de 30 jours.</p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 text-xs font-sans text-left leading-relaxed">
                        Merci pour votre confiance ! La plateforme a été débloquée en temps réel. Cette fenêtre va se fermer d'ici quelques instants.
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setPaymentSuccess(false);
                          setPaymentReference('');
                        }}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        Retourner à l'application
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Requests History */}
      <div className="p-8 bg-white border border-kontrol-border rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-kontrol-blue" size={18} />
            <h3 className="text-lg font-extrabold text-kontrol-dark tracking-tight uppercase">
              Historique des transactions d'abonnement
            </h3>
          </div>
          {requests.length > 0 && (
            <span className="px-3 py-1 bg-kontrol-light border border-kontrol-border rounded-full text-[10px] font-extrabold text-kontrol-ink-muted">
              {requests.length} transaction{requests.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loadingRequests ? (
          <div className="flex items-center justify-center py-12 text-kontrol-ink-muted gap-2 text-xs">
            <RefreshCw className="animate-spin" size={16} />
            Chargement de l'historique...
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-kontrol-ink-muted space-y-2">
            <div className="w-12 h-12 rounded-full bg-kontrol-light text-kontrol-ink-muted/50 flex items-center justify-center mx-auto">
              <FileText size={20} />
            </div>
            <p className="text-xs font-medium">Aucun règlement GeniusPay initié à ce jour.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-kontrol-border text-kontrol-ink-muted font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="pb-4 font-extrabold">Date de soumission</th>
                  <th className="pb-4 font-extrabold">Description</th>
                  <th className="pb-4 font-extrabold">Référence GeniusPay</th>
                  <th className="pb-4 font-extrabold">Montant</th>
                  <th className="pb-4 font-extrabold">Statut</th>
                  <th className="pb-4 font-extrabold text-right">Justificatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border text-kontrol-dark">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-kontrol-light/50 transition-colors">
                    <td className="py-4 font-medium">
                      {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 font-medium">
                      <span className="font-extrabold text-kontrol-dark">Réabonnement Standard 30 jours</span>
                    </td>
                    <td className="py-4 font-mono text-kontrol-blue font-bold">
                      {req.transactionId}
                    </td>
                    <td className="py-4 font-extrabold">
                      {formatCurrency(req.amount, req.currency)}
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {req.status === 'APPROVED' || req.status === 'SUCCESS' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(req);
                            setInvoiceModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-kontrol-dark border border-slate-200 hover:border-slate-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Afficher la facture officielle PDF acquittée"
                        >
                          <FileText size={13} className="text-slate-500" />
                          Facture PDF
                        </button>
                      ) : (
                        <span className="text-[10px] text-kontrol-ink-muted/50 italic select-none">
                          Non disponible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* High-End Interactive Invoice Overlay Modal */}
      <AnimatePresence>
        {invoiceModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col h-[80vh] md:h-auto max-h-[80vh]"
            >
              {/* Top Bar Actions */}
              <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="text-kontrol-blue" size={15} />
                  <span className="text-[10px] font-black text-kontrol-dark uppercase tracking-wider">
                    Aperçu de la Facture
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => generateInvoicePDF(selectedInvoice, profile)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-kontrol-blue hover:bg-kontrol-blue/90 text-white rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Printer size={12} />
                    Télécharger PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Page Body */}
              <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white">
                <div id="kontrol-invoice-content" className="max-w-xl mx-auto space-y-5 text-slate-800">
                  {/* Decorative Header Bar */}
                  <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" />

                  {/* Invoice Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                        KONTROL<span className="text-blue-600">.</span>
                      </h2>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                        Gestion ERP Intelligente
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <h1 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                        Facture d'Abonnement
                      </h1>
                      <p className="text-[11px] font-mono font-bold text-blue-600 mt-0.5">
                        KT-FAC-{selectedInvoice.transactionId.substring(0, 10).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Blocks */}
                  <div className="space-y-4">
                    {/* Issuer (Left) & Client (Slightly below Right) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      {/* Émetteur à gauche */}
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 border-b border-slate-200/60 pb-0.5">
                          Émetteur (Prestataire)
                        </h3>
                        <p className="text-[12px] font-black text-slate-900">
                          INNOV'KORP
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Email : <span className="font-semibold text-slate-800">Innov.korp@gmail.com</span>
                        </p>
                      </div>

                      {/* Client légèrement en dessous à droite */}
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 sm:mt-3">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 border-b border-slate-200/60 pb-0.5">
                          Client (Facturé à)
                        </h3>
                        <p className="text-[12px] font-black text-slate-900">
                          {profile?.companyName || profile?.companyAbbreviation || "Votre Entreprise"}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          À l'attention de : <span className="font-semibold text-slate-800">{profile?.displayName || profile?.email || "Utilisateur KONTROL"}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Email : <span className="font-semibold text-slate-800">{profile?.email || ""}</span>
                        </p>
                      </div>
                    </div>

                    {/* Payment details and Subscription due date */}
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <h4 className="font-black uppercase text-blue-900 text-[9px] tracking-wider mb-1">
                          Règlement
                        </h4>
                        <p className="text-slate-600">
                          Date d'émission : <span className="font-bold text-slate-900">{new Date(selectedInvoice.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </p>
                        <p className="text-slate-600 mt-0.5">
                          Moyen de paiement : <span className="font-bold text-slate-900">GeniusPay (Mobile Money)</span>
                        </p>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-l border-blue-100 pt-2 sm:pt-0 sm:pl-3">
                        <h4 className="font-black uppercase text-blue-900 text-[9px] tracking-wider mb-1">
                          Échéance d'Abonnement
                        </h4>
                        <p className="text-blue-700 font-medium mt-1">
                          Nouvelle échéance : <span className="font-black text-blue-950">{new Date(selectedInvoice.nextDueDate || (new Date(selectedInvoice.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[8px] tracking-wider border-b border-slate-200">
                          <th className="py-1.5 px-2">Description</th>
                          <th className="py-1.5 px-2 text-center">Qté</th>
                          <th className="py-1.5 px-2 text-right">Prix Unitaire</th>
                          <th className="py-1.5 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-3 px-2 max-w-xs">
                            <span className="font-extrabold text-slate-900 block">
                              ABONNEMENT: KONTROL STANDARD
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed">
                              Accès complet aux modules Achats/Ventes, Stocks, Trésorerie, Blue AI Assistant et synchronisation en temps réel de vos données d'entreprise. Validité : 30 jours.
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-bold">1</td>
                          <td className="py-3 px-2 text-right font-mono font-semibold">
                            {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-extrabold text-slate-950">
                            {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-100">
                    {/* Stamp of Success */}
                    <div className="bg-emerald-50 border border-dashed border-emerald-400 p-2.5 rounded-xl flex items-center gap-2 max-w-xs shrink-0 select-none">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-emerald-800 leading-none">
                          PAYEE
                        </h4>
                        <p className="text-[8px] text-emerald-600 mt-0.5 font-mono font-semibold leading-relaxed">
                          Via GeniusPay • {selectedInvoice.transactionId.substring(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-60 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Sous-total</span>
                        <span className="font-mono font-medium">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>TVA (0% - Exonéré)</span>
                        <span className="font-mono font-medium">0 XOF</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-black text-slate-900 pt-1.5 border-t border-slate-100">
                        <span>Montant Net Payé</span>
                        <span className="font-mono text-xs text-blue-600">
                          {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer block */}
                  <div className="pt-4 border-t border-slate-100 text-center text-[9px] text-slate-400 space-y-0.5">
                    <p className="font-extrabold text-slate-500">INNOV'KORP</p>
                    <p>Facture générée numériquement et certifiée conforme.</p>
                    <p>Merci pour votre abonnement et votre fidélité !</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
