import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { db, doc, updateDoc, logAction, serverTimestamp } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { KkiapayButton } from '../../components/common/KkiapayButton';

interface SubscriptionsModuleProps {
  profile: UserProfile | null;
}

const formatStatus = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Actif';
    case 'EXPIRED': return 'Expiré';
    case 'PENDING': return 'En attente';
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
        <h3 className="text-lg font-extrabold text-rose-900 uppercase tracking-tighter">Une erreur est survenue</h3>
        <p className="text-sm text-rose-600 max-w-xs mx-auto">Le module de paiement n'a pas pu être chargé correctement.</p>
        <button 
          onClick={() => setHasError(false)}
          className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-all"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export function SubscriptionsModule({ profile }: SubscriptionsModuleProps) {
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'SUCCESS'>('SELECT');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const currency = profile?.currency || 'XOF';
  const price = currency === 'XOF' ? 10000 : (currency === 'EUR' ? 15 : 16);

  const billingHistory = [
    { date: '15 Mars 2026', desc: 'Abonnement Mensuel Standard', amount: price, status: 'Payé' },
    { date: '15 Février 2026', desc: 'Abonnement Mensuel Standard', amount: price, status: 'Payé' },
    { date: '15 Janvier 2026', desc: 'Abonnement Mensuel Standard', amount: price, status: 'Payé' }
  ];

  const totalPages = Math.ceil(billingHistory.length / itemsPerPage);
  const paginatedHistory = billingHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isExpired = profile?.subscriptionEndDate ? new Date(profile.subscriptionEndDate) < new Date() : true;

  if (!profile) return null;

  const handleKkiapaySuccess = async (response: any) => {
    if (!profile) return;
    
    console.log("Kkiapay Success Response:", response);
    setLoading(true);
    
    try {
      const companyId = profile.companyId || profile.uid;
      const currentEnd = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : new Date();
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      
      // Add 30 days
      baseDate.setDate(baseDate.getDate() + 30);
      
      const newEndDate = baseDate.getTime();
      
      // Update User Profile
      await updateDoc(doc(db, 'users', profile.uid), {
        subscriptionEndDate: newEndDate,
        subscriptionStatus: 'ACTIVE',
        updatedAt: serverTimestamp()
      });

      // Update Company Profile if exists
      if (profile.companyId) {
        await updateDoc(doc(db, 'companies', profile.companyId), {
          status: 'ACTIVE',
          subscriptionEndDate: newEndDate,
          updatedAt: serverTimestamp()
        });
      }

      await logAction(
        companyId,
        profile.uid,
        profile.displayName || profile.email,
        "Abonnement renouvelé (Kkiapay)",
        `Transaction: ${response.transactionId || 'N/A'}, Montant: ${price} ${currency}. Nouvelle échéance: ${new Date(newEndDate).toLocaleDateString()}`
      );

      setPaymentStep('SUCCESS');
    } catch (error) {
      console.error("Payment processing error:", error);
      alert("Une erreur est survenue lors de la mise à jour de votre abonnement. Veuillez contacter le support.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportInvoice = (invoice: any) => {
    const headers = ['Libellé', 'Période', 'Mode de paiement', 'Montant'];
    const data = [[
      invoice.desc,
      invoice.date,
      'Mobile Money / Carte',
      formatCurrency(invoice.amount, currency)
    ]];
    exportToPDF(`Facture - ${invoice.date}`, headers, data, `Facture_KONTROL_${invoice.date.replace(/ /g, '_')}`);
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
          <h2 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter">Abonnement & Services</h2>
          <p className="text-[14px] text-kontrol-ink-muted mt-1 font-medium">Gérez votre forfait Premium et accédez à vos factures</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-kontrol-border rounded-2xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-kontrol-dark uppercase tracking-widest">Compte Vérifié</span>
        </div>
      </header>

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
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] border border-white/10 backdrop-blur-md">
                  <Zap size={14} className="mr-2 text-kontrol-blue fill-kontrol-blue" /> 
                  Forfait Actuel: {plan.name}
                </div>
                <div className={cn(
                  "inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.2em] border backdrop-blur-md",
                  isExpired 
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                )}>
                  {isExpired ? "Expiré" : "Actif"}
                </div>
              </div>
              
              <h3 className="text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none">
                Propulsez votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-kontrol-blue to-kontrol-orange">Boutique</span> au niveau supérieur.
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-8 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Calendar size={20} className="text-kontrol-blue" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-extrabold tracking-widest text-white/40">Prochaine échéance</p>
                    <p className="text-lg font-bold text-white">
                      {profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '15 Avril 2026'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <CreditCard size={20} className="text-kontrol-orange" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-extrabold tracking-widest text-white/40">Tarif Mensuel</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(price, currency)} <span className="text-xs font-normal text-white/50">/ mois</span></p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-72 shrink-0">
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl space-y-6">
                <div className="text-center">
                  <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Total à payer</p>
                  <p className="text-3xl font-extrabold text-white">{formatCurrency(price, currency)}</p>
                </div>
                <button 
                  onClick={() => setIsPaying(true)}
                  className="w-full py-4 bg-white text-kontrol-dark rounded-2xl font-extrabold text-sm hover:bg-kontrol-blue hover:text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2 group/btn"
                >
                  Renouveler <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <p className="text-[10px] text-center text-white/30">Paiement sécurisé via Mobile Money ou Carte</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-8 grid sm:grid-cols-2 gap-x-12 gap-y-6">
          <div className="col-span-full mb-2">
            <h4 className="text-lg font-extrabold text-kontrol-dark flex items-center gap-2">
              <Package size={20} className="text-kontrol-blue" /> Inclus dans votre offre
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
            <h4 className="text-lg font-extrabold text-kontrol-dark">Protection Totale</h4>
            <p className="text-[12px] text-kontrol-ink-muted mt-2 leading-relaxed">
              Vos données sont chiffrées et sauvegardées quotidiennement sur nos serveurs sécurisés.
            </p>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-lg font-extrabold text-kontrol-dark flex items-center gap-2">
            <HistoryIcon size={20} className="text-kontrol-orange" /> Historique des paiements
          </h4>
          <button className="text-[11px] font-bold text-kontrol-blue uppercase tracking-widest hover:underline">Voir tout</button>
        </div>
        
        <div className="card overflow-hidden border-none shadow-xl shadow-kontrol-dark/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">Date de paiement</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">Description</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">Montant</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">Statut</th>
                  <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
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
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setSelectedInvoice(item)}
                        className="px-4 py-2 bg-kontrol-bg text-kontrol-ink-soft hover:bg-kontrol-dark hover:text-white rounded-xl text-[11px] font-extrabold transition-all uppercase tracking-widest"
                      >
                        Facture
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-8 py-4 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
              <span className="text-[11px] text-kontrol-ink-muted font-extrabold uppercase tracking-widest">
                {billingHistory.length} paiements
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
                  Page {currentPage} / {totalPages}
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
                    <h3 className="text-lg font-extrabold text-kontrol-dark tracking-tight">Renouvellement</h3>
                    <p className="text-[10px] text-kontrol-ink-muted font-bold uppercase tracking-widest">Paiement Sécurisé</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsPaying(false);
                    setPaymentStep('SELECT');
                  }}
                  className="p-2 hover:bg-white rounded-full text-kontrol-ink-muted transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {paymentStep === 'SELECT' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-0.5">Montant à régler</p>
                      <p className="text-3xl font-extrabold text-kontrol-dark">{formatCurrency(price, currency)}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-5 bg-kontrol-bg rounded-2xl border border-kontrol-border space-y-4">
                        <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest text-center">Mobile Money & Carte</p>
                        
                        <KkiapayButton 
                          amount={price}
                          onSuccess={handleKkiapaySuccess}
                          label="Payer mon abonnement"
                          email={profile.email}
                          firstname={profile.displayName?.split(' ')[0]}
                          lastname={profile.displayName?.split(' ').slice(1).join(' ')}
                          phone={profile.phone}
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-kontrol-border"></span>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-extrabold tracking-widest">
                          <span className="bg-white px-4 text-kontrol-ink-muted">Ou utiliser le widget officiel</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        {/* @ts-ignore */}
                        <kkiapay-widget 
                          sandbox="true" 
                          amount={price} 
                          key="97a427c750032e63b0dab8c64f86a71dd216e5f0"
                          callback="https://kkiapay-redirect.com"
                          text="Payer Maintenant"
                          className="w-full"
                        />
                        <p className="text-[10px] text-kontrol-ink-muted text-center font-medium">
                          Supporte les codes QR pour tous les opérateurs
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-3 opacity-40 grayscale scale-90">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" alt="Orange" className="h-4" referrerPolicy="no-referrer" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/MTN_Logo.svg" alt="MTN" className="h-4" referrerPolicy="no-referrer" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Moov_Africa_logo.png" alt="Moov" className="h-4" referrerPolicy="no-referrer" />
                        <img src="https://www.wave.com/static/images/wave-logo.svg" alt="Wave" className="h-4" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  </div>
                )}

                {paymentStep === 'SUCCESS' && (
                  <div className="py-8 flex flex-col items-center text-center space-y-5">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Paiement Réussi !</h4>
                      <p className="text-[12px] text-kontrol-ink-muted mt-1.5">
                        Votre abonnement a été prolongé de 30 jours avec succès.
                      </p>
                    </div>
                    <div className="w-full space-y-3">
                      <button 
                        onClick={() => {
                          setIsPaying(false);
                          setPaymentStep('SELECT');
                        }}
                        className="w-full py-3.5 bg-kontrol-dark text-white rounded-xl font-extrabold text-xs hover:bg-kontrol-blue transition-all shadow-xl"
                      >
                        Terminer
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
      {selectedInvoice && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-kontrol-dark/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-kontrol-dark rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Détails Facture</h3>
                  <p className="text-[11px] text-kontrol-ink-muted font-bold uppercase tracking-widest">KONTROL PREMIUM SERVICES</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-2.5 hover:bg-white rounded-full text-kontrol-ink-muted transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="flex justify-center">
                {profile.companyLogo ? (
                  <img src={profile.companyLogo} alt="Logo" className="h-16 object-contain" />
                ) : (
                  <div className="text-2xl font-extrabold text-kontrol-dark tracking-tighter">KONTROL</div>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Période</p>
                    <p className="text-sm font-bold text-kontrol-dark">{selectedInvoice.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Mode de paiement</p>
                    <p className="text-sm font-bold text-kontrol-dark">Mobile Money / Carte</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Libellé</p>
                  <p className="text-sm font-bold text-kontrol-dark">{selectedInvoice.desc}</p>
                </div>

                <div className="pt-6 border-t border-kontrol-border flex items-center justify-between">
                  <p className="text-lg font-extrabold text-kontrol-dark uppercase tracking-tighter">Montant Total</p>
                  <p className="text-3xl font-extrabold text-kontrol-blue">{formatCurrency(selectedInvoice.amount, currency)}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-kontrol-bg/30 flex gap-4">
              <button 
                onClick={() => handleExportInvoice(selectedInvoice)}
                className="flex-1 btn-primary py-4 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl"
              >
                <Printer size={18} /> Imprimer PDF
              </button>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 btn-outline py-4 font-extrabold text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
