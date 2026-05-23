import * as React from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Package, 
  Shield, 
  Zap, 
  Clock, 
  ArrowRight,
  Loader2,
  Sparkles,
  History as HistoryIcon,
  X,
  Printer,
  FileText,
  Download,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { exportToPDF } from '../../lib/export';
import { db, doc, getDoc, getDocs, updateDoc, logAction, serverTimestamp, collection, addDoc, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType, auth } from '../../../api/firebase';
import { sendNotification } from '../../../api/services/notificationService';
import { motion, AnimatePresence } from 'motion/react';

import { ModuleActivityLog } from '../../components/common/ModuleActivityLog';

interface SubscriptionsModuleProps {
  profile: UserProfile | null;
}

export function SubscriptionsModule({ profile }: SubscriptionsModuleProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'WAVE_INFO' | 'SUCCESS'>('SELECT');
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentInfo, setPaymentInfo] = useState({
    email: profile?.email || '',
    phone: profile?.phone || '',
    companyName: profile?.companyName || ''
  });

  const formatStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE': return t('common.status.active');
      case 'EXPIRED': return t('common.status.expired');
      case 'PENDING': return t('common.status.pending');
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'EXPIRED': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        console.error("Caught by ErrorBoundary:", error);
        setHasError(true);
      };
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
      return (
        <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2rem] text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-rose-900 uppercase tracking-tighter">{t('common.chatbot.error')}</h3>
          <p className="text-sm text-rose-600 max-w-xs mx-auto">Le module de paiement n'a pas pu être chargé correctement.</p>
          <button 
            onClick={() => setHasError(false)}
            className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-all"
          >
            {t('common.chatbot.thinking')}
          </button>
        </div>
      );
    }

    return <>{children}</>;
  };

  useEffect(() => {
    if (profile) {
      setPaymentInfo({
        email: profile.email || '',
        phone: profile.phone || '',
        companyName: profile.companyName || profile.displayName || ''
      });
    }
  }, [profile]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualReference, setManualReference] = useState('');
  const itemsPerPage = 10;

  // Derive pending requests directly from billing history for real-time accuracy
  const pendingRequests = billingHistory.filter(h => h.status === 'PENDING');

  const checkLiveStatus = async () => {
    setIsSyncing(true);
    try {
      // Direct verification on the "machine" (server)
      const userSnap = await getDoc(doc(db, 'users', profile.uid));
      const payRequestsSnap = await getDocs(query(
        collection(db, 'payment_requests'),
        where('userId', '==', profile.uid),
        where('status', '==', 'PENDING')
      ));
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Comfort delay
      
      if (payRequestsSnap.empty) {
        // No pending requests found on server
        if (billingHistory.some(h => h.status === 'APPROVED')) {
          alert("✅ Vérification terminée : Votre paiement a bien été validé par l'administrateur.");
        } else {
          alert("ℹ️ Aucun paiement en attente n'a été trouvé sur le serveur.");
        }
      } else {
        alert("⏳ Vérification terminée : Vos demandes (Réf: " + payRequestsSnap.docs.map(d => d.data().reference).join(', ') + ") sont toujours en attente de traitement manuel.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'payment_verification', auth.currentUser, false);
      alert("❌ Erreur lors de la vérification en direct. Veuillez réessayer.");
    } finally {
      setIsSyncing(false);
    }
  };

  const currency = profile?.currency || 'XOF';
  const price = currency === 'XOF' ? 10000 : (currency === 'EUR' ? 15 : 16);

  const handleWaveConfirmation = async (e?: React.BaseSyntheticEvent) => {
    if (e && e.preventDefault && typeof e.preventDefault === 'function' && (e.target as any).tagName !== 'A') {
      e.preventDefault();
    }
    
    if (!manualReference.trim()) {
      alert("Veuillez saisir votre référence de paiement Wave pour continuer.");
      return;
    }
    
    setLoading(true);
    try {
      const companyId = profile?.companyId || profile?.uid || '';
      const finalReference = manualReference.trim();
      const currentCompanyName = profile?.companyName || profile?.displayName || profile?.email || 'Client K';
      
      // Enregistrer l'intention de paiement / demande de validation
      await addDoc(collection(db, 'payment_requests'), {
        userId: profile?.uid,
        email: paymentInfo.email || profile?.email || '',
        phone: paymentInfo.phone || '',
        companyName: currentCompanyName,
        companyId: companyId,
        amount: price,
        currency: currency,
        reference: finalReference,
        gateway: 'WAVE',
        status: 'PENDING',
        createdAt: serverTimestamp()
      });

      await logAction(
        companyId,
        profile?.uid || '',
        profile?.displayName || profile?.email || '',
        "Demande de validation d'abonnement (Wave)",
        `En attente de validation manuelle par l'administrateur. Réf Wave: ${finalReference}`
      );

      // Notification de confirmation pour l'utilisateur
      await sendNotification({
        companyId: companyId,
        userId: profile?.uid,
        title: "✨ Demande de paiement reçue",
        message: `Félicitations ${profile?.displayName || 'cher client'} ! Votre demande pour l'abonnement Standard (${price} ${currency}) via Wave est en cours d'examen.`,
        type: 'info',
        link: '/subscriptions'
      });

      // Notification Admin
      await sendNotification({
        companyId: 'SYSTEM',
        title: "🚨 Nouvelle validation Wave requise",
        message: `L'entreprise ${currentCompanyName} vient de soumettre un paiement Wave de ${price} ${currency} (Réf: ${finalReference}).`,
        type: 'info',
        link: '/admin?tab=subscriptions'
      });

      setPaymentStep('SUCCESS');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payment_requests', auth.currentUser, false);
      alert("Erreur lors de l'enregistrement de votre confirmation. Veuillez contacter le support.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(billingHistory.length / itemsPerPage);

  useEffect(() => {
    if (!profile) return;
    
    // Watch for ALL payment requests (PENDING, APPROVED, REJECTED)
    // Order by createdAt descending to show most recent first
    const qPayments = query(
      collection(db, 'payment_requests'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(qPayments, (snap) => {
      const history = snap.docs.map(doc => {
        const data = doc.data();
        const time = data.approvedAt?.seconds ? data.approvedAt.seconds * 1000 : 
                     (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now());
        
        const date = new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const expiryDateTime = time + (30 * 24 * 60 * 60 * 1000);
        const expiryDate = data.status === 'APPROVED' ? 
                           new Date(expiryDateTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 
                           null;
        
        // Auto-reminder logic: Check if expiry is near (within 7 days)
        if (data.status === 'APPROVED' && !data.reminderSent) {
          const now = Date.now();
          const daysLeft = (expiryDateTime - now) / (1000 * 60 * 60 * 24);
          
          if (daysLeft > 0 && daysLeft <= 7) {
            triggerExpiryReminder(doc.id, daysLeft, expiryDate);
          }
        }

        return {
          id: doc.id,
          date,
          expiryDate,
          desc: `Renouvellement Abonnement Standard - ${data.gateway === 'WAVE' ? 'Wave' : (data.reference || 'Paiement')}`,
          amount: data.amount,
          status: data.status, // Directly use the database status
          fullData: data
        };
      });
      setBillingHistory(history);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'payment_requests', auth.currentUser, false));

    return () => unsubscribe();
  }, [profile]);

  const triggerExpiryReminder = async (requestId: string, daysLeft: number, expiryDate: string | null) => {
    try {
      // Mark as reminder sent to avoid loops
      await updateDoc(doc(db, 'payment_requests', requestId), {
        reminderSent: true,
        lastReminderAt: serverTimestamp()
      });

      // Send local notification
      await sendNotification({
        companyId: profile?.companyId || profile?.uid || '',
        title: "⚠️ Expiration Proche",
        message: `Votre abonnement KONTROL expire dans ${Math.ceil(daysLeft)} jours (${expiryDate}). Pensez à renouveler pour éviter toute interruption.`,
        type: 'warning',
        link: '/subscriptions'
      });
      
      console.log("Subscription expiry reminder sent.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'payment_requests', auth.currentUser, false);
    }
  };

  const paginatedHistory = billingHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isExpired = profile?.subscriptionEndDate ? new Date(profile.subscriptionEndDate) < new Date() : true;

  if (!profile) return null;

  const isDemo = profile.isDemo === true;
  const endDate = profile.subscriptionEndDate || 0;
  const createdAtDate = profile.createdAt || (endDate - 30 * 24 * 60 * 60 * 1000);
  const totalDuration = Math.max(1, endDate - createdAtDate);
  const elapsed = Math.max(0, Date.now() - createdAtDate);
  const percentElapsed = Math.min(100, Math.round((elapsed / totalDuration) * 100));
  const percentRemaining = 100 - percentElapsed;
  const daysLeftTrial = Math.max(0, Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleExportInvoice = (invoice: any) => {
    const headers = ['Libellé', 'Émission', 'Prochaine Échéance', 'Référence', 'Montant'];
    const data = [[
      invoice.desc,
      invoice.date,
      invoice.expiryDate || 'N/A',
      invoice.fullData?.reference || 'N/A',
      formatCurrency(invoice.amount, currency)
    ]];
    
    exportToPDF(
      `Facture d'Abonnement`, 
      headers, 
      data, 
      `Facture_KONTROL_${invoice.date.replace(/ /g, '_')}`,
      {
        companyInfo: {
          name: 'KONTROL ERP',
          email: 'support@kontrol.app'
        },
        clientInfo: {
          name: profile?.displayName || 'Client',
          email: profile?.email || '',
          company: profile?.companyName
        },
        footer: 'KONTROL - Solution de gestion intelligente pour entreprises. Merci de votre confiance.'
      }
    );
  };

  const plan = {
    id: 'standard',
    name: 'Standard',
    price: 10000,
    period: 'mois',
    features: [
      'Utilisateurs illimités', 
      'Gestion de stock complète', 
      'Transactions illimitées', 
      'Support prioritaire', 
      'Analyse Blue AI',
      'Multi-devises & Langues'
    ],
    color: 'bg-kontrol-blue'
  };

  return (
    <ErrorBoundary>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">{t('subscriptions.title')}</h2>
          <p className="text-[14px] text-kontrol-ink-muted mt-1 font-medium">{t('subscriptions.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-kontrol-border rounded-2xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-kontrol-dark uppercase tracking-widest">{t('subscriptions.verified')}</span>
        </div>
      </header>

      {pendingRequests.length > 0 && (
        <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200">
            {isSyncing ? <Loader2 size={24} className="animate-spin" /> : <Clock size={24} />}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-sm font-extrabold text-amber-900 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
              {t('subscriptions.pending_validation.title')}
              {isSyncing && <span className="text-[10px] font-bold text-amber-500 animate-pulse">{t('subscriptions.pending_validation.verifying')}</span>}
            </h4>
            <div className="space-y-1 mt-1">
              <p className="text-[12px] text-amber-600 font-medium">
                {t('subscriptions.pending_validation.desc')}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                {pendingRequests.map(req => (
                  <span key={req.id} className="text-[9px] font-black text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    Réf: {req.fullData?.reference || '...'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={checkLiveStatus}
            disabled={isSyncing}
            className="w-full md:w-auto px-6 py-3 bg-white border-2 border-amber-300 text-amber-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? t('common.loading') : t('subscriptions.pending_validation.live_check')}
          </button>
        </div>
      )}

      {/* Hero Subscription Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-kontrol-blue to-kontrol-orange rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative card p-10 bg-kontrol-dark border-none text-white overflow-hidden rounded-[2rem]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-kontrol-blue/20 rounded-full blur-[100px]" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-kontrol-orange/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.2em] border backdrop-blur-md",
                  isDemo 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                    : "bg-white/10 text-white border-white/10"
                )}>
                  {isDemo ? (
                    <>
                      <Sparkles size={14} className="mr-2 text-amber-400 fill-amber-400" />
                      PÉRIODE D'ESSAI
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="mr-2 text-kontrol-blue fill-kontrol-blue" />
                      {t('subscriptions.hero.current_plan', { name: plan.name })}
                    </>
                  )}
                </div>
                <div className={cn(
                  "inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.2em] border backdrop-blur-md",
                  isExpired 
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                    : isDemo 
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                )}>
                  {isExpired 
                    ? t('common.status.expired') 
                    : isDemo 
                    ? "PROLONGÉE" 
                    : t('common.status.active')}
                </div>
              </div>
              
              <h3 className="text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none">
                {isDemo 
                  ? "Votre période d'essai a été prolongée pour vous accompagner de manière durable !"
                  : t('subscriptions.hero.promo_text')}
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-8 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Calendar size={20} className={isDemo ? "text-amber-400" : "text-kontrol-blue"} />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/50 block font-bold uppercase tracking-wider">
                      {isDemo ? "Date d'expiration de l'essai" : "Prochaine Échéance"}
                    </span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-lg font-bold text-white">
                        {profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '15 Avril 2026'}
                      </p>
                      <button 
                        onClick={() => setIsPaying(true)}
                        className="px-4 py-1.5 bg-white text-kontrol-dark rounded-xl font-extrabold text-[10px] uppercase tracking-wider hover:bg-kontrol-blue hover:text-white transition-all duration-300 shadow-lg flex items-center gap-1.5 group/btn"
                      >
                        {isDemo ? "S'abonner" : t('subscriptions.hero.renew')} <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <CreditCard size={20} className="text-kontrol-orange" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{formatCurrency(price, currency)} <span className="text-xs font-normal text-white/50">/ mois</span></p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-80 shrink-0">
              {isDemo ? (
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/70 font-black uppercase tracking-widest">Suivi d'Évolution</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg font-black tracking-wider uppercase">
                      {isExpired ? "Terminée" : `${daysLeftTrial} Jours Restants`}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-white/50 font-bold">
                      <span>Restant : {Math.max(0, percentRemaining)}%</span>
                      <span>Écoulé : {Math.min(100, percentElapsed)}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-[2px] border border-white/5 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-kontrol-orange rounded-full transition-all duration-1000"
                        style={{ width: `${isExpired ? 0 : Math.max(0, percentRemaining)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/45 leading-relaxed font-medium">
                    Ce compte bénéficie d'une période d'essai VIP prolongée de façon personnalisée par notre équipe de support.
                  </p>
                </div>
              ) : (
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl text-center space-y-4">
                  <div>
                    <p className={cn(
                      "text-xl font-extrabold",
                      isExpired ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {isExpired ? t('subscriptions.details.required') : t('subscriptions.details.active')}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/30 italic">{t('subscriptions.details.auto_renew')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-8 grid sm:grid-cols-2 gap-x-12 gap-y-6">
          <div className="col-span-full mb-2">
            <h4 className="text-lg font-extrabold text-kontrol-dark flex items-center gap-2">
              <Package size={20} className="text-kontrol-blue" /> {t('subscriptions.features_title')}
            </h4>
          </div>
          {plan.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 size={14} />
              </div>
              <span className="text-[13px] font-bold text-kontrol-ink-soft">{feature}</span>
            </div>
          ))}
        </div>

        <div className="card p-8 bg-kontrol-blue/5 border-kontrol-blue/20 flex flex-col items-center text-center justify-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center text-kontrol-blue border border-kontrol-blue/10">
            <Shield size={32} />
          </div>
          <div>
            <h4 className="text-lg font-extrabold text-kontrol-dark">{t('subscriptions.protection.title')}</h4>
            <p className="text-[12px] text-kontrol-ink-muted mt-2 leading-relaxed">
              {t('subscriptions.protection.desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-lg font-extrabold text-kontrol-dark flex items-center gap-2">
            <HistoryIcon size={20} className="text-kontrol-orange" /> {t('subscriptions.history.title')}
          </h4>
          <button className="text-[11px] font-bold text-kontrol-blue uppercase tracking-widest hover:underline">{t('subscriptions.history.view_all')}</button>
        </div>
        
        <div className="card overflow-hidden border-none shadow-xl shadow-kontrol-dark/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">{t('subscriptions.history.columns.date')}</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">{t('subscriptions.history.columns.desc')}</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">{t('subscriptions.history.columns.amount')}</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">{t('subscriptions.history.columns.status')}</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted text-right">{t('subscriptions.history.columns.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border font-medium">
                {paginatedHistory.map((item, i) => (
                  <tr key={i} className={cn("hover:bg-kontrol-bg/30 transition-colors group", i % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10")}>
                    <td className="px-8 py-5 text-[13px] text-kontrol-dark font-bold">{item.date}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-blue">
                          <Package size={14} />
                        </div>
                        <span className="text-[13px] text-kontrol-ink-soft font-medium">{item.desc}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[14px] font-extrabold text-kontrol-dark">{formatCurrency(item.amount, currency)}</td>
                    <td className="px-8 py-5">
                      {item.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 uppercase tracking-widest border border-emerald-200 shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t('common.status.paid')}
                        </span>
                      ) : item.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200 shadow-sm">
                          <Clock size={10} className="animate-spin-slow" />
                          {t('common.status.pending')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 uppercase tracking-widest border border-rose-200">
                          {t('common.status.rejected')}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {item.status === 'APPROVED' ? (
                        <button 
                          onClick={() => setSelectedInvoice(item)}
                          className="px-4 py-2 bg-kontrol-bg text-kontrol-ink-soft hover:bg-kontrol-dark hover:text-white rounded-xl text-[11px] font-extrabold transition-all uppercase tracking-widest"
                        >
                          {t('subscriptions.history.invoice')}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase italic">{t('subscriptions.history.unavailable')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-8 py-4 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
              <span className="text-[11px] text-kontrol-ink-muted font-extrabold uppercase tracking-widest">
                {billingHistory.length} {t('finance.transactions.title').toLowerCase()}
              </span>
              <div className="flex items-center gap-4">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm border border-transparent hover:border-kontrol-border"
                >
                  <ArrowRight size={16} className="rotate-180" />
                </button>
                <span className="text-[11px] font-extrabold text-kontrol-dark uppercase tracking-widest">
                  {t('common.pagination', { current: currentPage, total: totalPages })}
                </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm border border-transparent hover:border-kontrol-border"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Payment Modal */}
      <AnimatePresence>
        {isPaying && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-kontrol-dark/90 backdrop-blur-xl p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[500px] overflow-hidden"
            >
              <div className="p-6 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-kontrol-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-kontrol-blue/20">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-kontrol-dark tracking-tight">{t('subscriptions.modal.renewal')}</h3>
                    <p className="text-[10px] text-kontrol-ink-muted font-bold uppercase tracking-widest">{t('subscriptions.modal.secure_payment')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsPaying(false);
                    setPaymentStep('SELECT');
                    setManualReference('');
                  }}
                  className="p-2 hover:bg-white rounded-full text-kontrol-ink-muted transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {paymentStep === 'SELECT' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Wave Option */}
                      <button 
                        onClick={() => setPaymentStep('WAVE_INFO')}
                        className="group relative p-6 bg-white border-2 border-kontrol-border rounded-[2rem] hover:border-[#1dc8ee] hover:bg-[#1dc8ee]/5 transition-all duration-500 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity translate-x-2 translate-y--2">
                          <ExternalLink size={24} className="text-[#1dc8ee]" />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#1dc8ee]/10 rounded-2xl flex items-center justify-center text-[#1dc8ee]">
                            <Smartphone size={24} />
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-extrabold text-kontrol-dark uppercase tracking-tight">{t('subscriptions.modal.wave.title')}</h4>
                            <p className="text-[10px] text-kontrol-ink-muted font-bold">{t('subscriptions.modal.wave.subtitle')}</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {paymentStep === 'WAVE_INFO' && (
                  <div className="space-y-6">
                    <div className="bg-[#1dc8ee]/5 p-6 rounded-[2rem] border border-[#1dc8ee]/10 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1dc8ee] text-white rounded-lg flex items-center justify-center font-bold text-sm">1</div>
                        <p className="text-sm font-bold text-kontrol-dark">{t('subscriptions.modal.wave.step1')}</p>
                      </div>
                      
                      <a 
                        href={`https://pay.wave.com/m/M_ci_jlScZ6K4EoKg/c/ci/?amount=${price}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-[#1dc8ee] text-white rounded-2xl font-extrabold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#1dc8ee]/20"
                      >
                        {t('subscriptions.modal.wave.cta_wave')} <ExternalLink size={16} />
                      </a>

                      <div className="border-t border-[#1dc8ee]/10 pt-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#1dc8ee] text-white rounded-lg flex items-center justify-center font-bold text-sm">2</div>
                          <p className="text-sm font-bold text-kontrol-dark">{t('subscriptions.modal.wave.step2')}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest ml-2">{t('subscriptions.modal.wave.ref_label')}</label>
                          <input 
                            type="text"
                            value={manualReference}
                            onChange={(e) => setManualReference(e.target.value)}
                            placeholder="Ex: T-WAVE-123456"
                            className="w-full px-5 py-4 bg-white border-2 border-kontrol-border rounded-xl font-bold text-sm focus:border-[#1dc8ee] outline-none transition-all"
                          />
                        </div>

                        <button 
                          onClick={(e) => handleWaveConfirmation(e)}
                          disabled={loading || !manualReference.trim()}
                          className="w-full py-4 bg-[#1dc8ee] text-white rounded-2xl font-extrabold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#1dc8ee]/20 disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : t('subscriptions.modal.wave.confirm')}
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => setPaymentStep('SELECT')}
                      className="w-full text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest hover:text-kontrol-dark transition-colors"
                    >
                      ← {t('auth.back')}
                    </button>
                  </div>
                )}

                {paymentStep === 'SUCCESS' && (
                  <div className="py-8 flex flex-col items-center text-center space-y-5">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                      paymentStep === 'SUCCESS' ? "bg-amber-100 text-amber-600 shadow-amber-500/20" : "bg-emerald-100 text-emerald-600 shadow-emerald-500/20"
                    )}>
                      {paymentStep === 'SUCCESS' ? <Clock size={32} /> : <CheckCircle2 size={32} />}
                    </div>
                    <div>
                      <h4 className="text-xl font-extrabold text-kontrol-dark tracking-tight">
                        {t('subscriptions.modal.success.title')}
                      </h4>
                      <p className="text-[12px] text-kontrol-ink-muted mt-1.5 px-4">
                        {t('subscriptions.modal.success.desc')}
                      </p>
                    </div>
                    <div className="w-full space-y-3">
                      <button 
                        onClick={() => {
                          setIsPaying(false);
                          setPaymentStep('SELECT');
                          setManualReference('');
                        }}
                        className="w-full py-3.5 bg-kontrol-dark text-white rounded-xl font-extrabold text-xs hover:bg-kontrol-blue transition-all shadow-xl"
                      >
                        {t('dashboard.ai_analysis.close')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-kontrol-dark/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[380px] overflow-hidden border border-white/20"
            >
              {/* Modal Header - Professional & Compact */}
              <div className="p-4 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-kontrol-dark text-white rounded-lg flex items-center justify-center shadow-lg">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-kontrol-dark uppercase tracking-tight">{t('subscriptions.modal.invoice_details.title')}</h3>
                    <p className="text-[9px] text-kontrol-ink-muted font-bold tracking-widest uppercase">Réf: {selectedInvoice.fullData?.reference || 'N/A'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 hover:bg-white rounded-full text-kontrol-ink-muted transition-all border border-transparent hover:border-kontrol-border"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="p-5 space-y-5">
                {/* Header Layout (Company Left, Client Right) */}
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-extrabold text-kontrol-blue uppercase tracking-widest">{t('subscriptions.modal.invoice_details.issuer')}</p>
                    <p className="text-[11px] font-black text-kontrol-dark uppercase">KONTROL ERP</p>
                    <p className="text-[8px] text-kontrol-ink-muted font-medium">support@kontrol.app</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[9px] font-extrabold text-kontrol-orange uppercase tracking-widest">{t('subscriptions.modal.invoice_details.client')}</p>
                    <p className="text-[11px] font-black text-kontrol-dark uppercase">{profile.companyName || profile.displayName}</p>
                    <p className="text-[8px] text-kontrol-ink-muted font-medium">{profile.email}</p>
                  </div>
                </div>

                {/* Content Section */}
                <div className="bg-kontrol-bg/30 p-4 rounded-xl border border-kontrol-border/50">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('subscriptions.modal.invoice_details.issue_date')}</p>
                      <p className="text-[11px] font-bold text-kontrol-dark">{selectedInvoice.date}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[8px] font-extrabold text-rose-600 uppercase tracking-widest">{t('subscriptions.modal.invoice_details.expiry')}</p>
                      <p className="text-[11px] font-bold text-kontrol-dark">{selectedInvoice.expiryDate || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('subscriptions.modal.invoice_details.method')}</p>
                      <p className="text-[11px] font-bold text-kontrol-dark">{selectedInvoice.fullData?.gateway || 'Wave'}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[8px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('subscriptions.modal.invoice_details.status')}</p>
                      <p className="text-[11px] font-bold text-emerald-600">{t('common.status.paid')}</p>
                    </div>
                    <div className="col-span-full pt-2 border-t border-kontrol-border/50">
                      <p className="text-[8px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-0.5">{t('subscriptions.modal.invoice_details.designation')}</p>
                      <p className="text-[11px] font-medium text-kontrol-dark leading-tight">{selectedInvoice.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Total Section */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-kontrol-dark uppercase tracking-tight">{t('subscriptions.modal.invoice_details.net_to_pay')}</p>
                    <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest">{t('subscriptions.modal.invoice_details.receipt')}</p>
                  </div>
                  <p className="text-xl font-black text-kontrol-blue tracking-tighter">
                    {formatCurrency(selectedInvoice.amount, currency)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-kontrol-bg/20 border-t border-kontrol-border flex gap-2">
                <button 
                  onClick={() => handleExportInvoice(selectedInvoice)}
                  className="flex-1 py-2.5 px-4 bg-kontrol-dark text-white rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-kontrol-blue transition-all shadow-lg active:scale-95"
                >
                  <Download size={12} /> {t('common.download')} PDF
                </button>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 py-2.5 px-4 bg-white text-kontrol-ink-soft border border-kontrol-border rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-kontrol-bg transition-all active:scale-95"
                >
                  {t('dashboard.ai_analysis.close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
