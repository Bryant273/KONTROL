import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Zap, 
  BarChart3, 
  Users, 
  Box, 
  ArrowRight, 
  CheckCircle2, 
  Globe,
  Layout,
  Sparkles,
  MessageSquare,
  MessageCircle,
  CreditCard,
  ArrowLeftRight,
  Mail,
  Phone,
  MapPin,
  Send,
  ArrowUp
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { cn } from '../../lib/utils';
import { Chatbot } from '../common/Chatbot';
import { LegalTerms } from './LegalTerms';
import { FeatureExplorer } from './FeatureExplorer';
import { SupportForm } from '../common/SupportForm';
import { AnimatePresence } from 'motion/react';
import { useTranslation, Trans } from 'react-i18next';

interface LandingPageProps {
  onLoginClick: (mode?: 'login' | 'register') => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const { t } = useTranslation();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [legalView, setLegalView] = useState<'mentions' | 'confidentialite' | null>(null);
  const [activeFeature, setActiveFeature] = useState<'stock' | 'transactions' | 'crm' | 'analytics' | 'security' | 'blue_ai' | null>(null);
  const [currency, setCurrency] = useState<{ code: string; symbol: string; rate: number; label: string }>({
    code: 'XOF',
    symbol: 'F CFA',
    rate: 1,
    label: 'XOF'
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Advanced currency detection based on locale and timezone
    const locale = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (locale.includes('fr-FR') || locale.includes('de') || locale.includes('it') || locale.includes('es') || timezone.includes('Europe')) {
      setCurrency({ code: 'EUR', symbol: '€', rate: 0.0015, label: 'EUR' });
    } else if (locale.includes('en-US') || locale.includes('en-CA') || timezone.includes('America')) {
      setCurrency({ code: 'USD', symbol: '$', rate: 0.0016, label: 'USD' });
    } else if (timezone.includes('Asia')) {
      setCurrency({ code: 'CNY', symbol: '¥', rate: 0.012, label: 'CNY' });
    } else if (timezone.includes('London') || locale.includes('en-GB')) {
      setCurrency({ code: 'GBP', symbol: '£', rate: 0.0013, label: 'GBP' });
    } else {
      // Default to XOF for West Africa or others
      setCurrency({ code: 'XOF', symbol: 'F CFA', rate: 1, label: 'XOF' });
    }
  }, []);

  const basePrice = 10000; // 10,000 XOF per month
  const displayPrice = Math.round(basePrice * currency.rate);

  if (activeFeature) {
    return (
      <FeatureExplorer 
        featureId={activeFeature} 
        onClose={() => setActiveFeature(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-kontrol-dark font-sans selection:bg-kontrol-blue/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-kontrol-border z-[100] px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" className="border-none shadow-none" />
          <span className="text-2xl font-extrabold tracking-tighter text-kontrol-dark uppercase">KONTROL</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">{t('landing.nav.features')}</a>
          <a href="#pricing" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">{t('landing.nav.pricing')}</a>
          <a href="#about" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">{t('landing.nav.about')}</a>
        </div>

        <button 
          onClick={() => onLoginClick('login')}
          className="px-6 py-2.5 bg-kontrol-dark text-white text-[13px] font-bold rounded-full hover:bg-kontrol-blue transition-all active:scale-95 shadow-lg shadow-kontrol-dark/10"
        >
          {t('landing.nav.client_space')}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 lg:px-12 max-w-7xl mx-auto text-center relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-kontrol-blue/5 rounded-full blur-[120px] -z-10" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles size={14} className="text-kontrol-orange" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-kontrol-ink-muted">{t('common.powered_by')} BLUE AI & INNOV'KORP</span>
        </div>

        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tighter leading-[0.9] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <Trans i18nKey="landing.hero.title" />
        </h1>

        <p className="text-base text-kontrol-ink-soft max-w-xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {t('landing.hero.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <button 
            onClick={() => onLoginClick('register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-kontrol-blue text-white font-extrabold rounded-2xl hover:bg-kontrol-blue-hover transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group"
          >
            {t('landing.hero.cta_start')}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto px-8 py-3.5 bg-white border border-kontrol-border text-kontrol-dark font-extrabold rounded-2xl hover:bg-kontrol-bg transition-all"
          >
            {t('landing.hero.cta_demo')}
          </button>
        </div>

        {/* Mockup Preview */}
        <div className="mt-20 relative animate-in fade-in zoom-in duration-1000 delay-500 select-none">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
          <div className="bg-kontrol-dark rounded-[32px] p-3.5 shadow-2xl border border-white/10 overflow-hidden">
            <div className="bg-white rounded-[22px] overflow-hidden shadow-inner flex flex-col md:flex-row aspect-video text-left">
              {/* Sidebar Mockup */}
              <div className="w-full md:w-20 border-r border-kontrol-border bg-white flex md:flex-col items-center py-4 md:py-6 justify-between md:justify-start gap-4 md:gap-8 shrink-0 px-4 md:px-0">
                <div className="w-10 h-10 rounded-xl bg-kontrol-blue/5 border border-kontrol-blue/10 flex items-center justify-center text-kontrol-blue shrink-0">
                  <Logo size="sm" className="border-none shadow-none" />
                </div>
                <div className="flex md:flex-col gap-2 md:gap-4">
                  {[
                    { icon: Layout, active: true },
                    { icon: Box, active: false },
                    { icon: ArrowLeftRight, active: false },
                    { icon: Users, active: false },
                    { icon: BarChart3, active: false },
                  ].map((item, i) => (
                    <div key={i} className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border",
                      item.active 
                        ? "bg-kontrol-blue border-kontrol-blue text-white shadow-md shadow-blue-500/20" 
                        : "text-kontrol-ink-soft border-transparent hover:bg-kontrol-bg hover:border-kontrol-border"
                    )}>
                      <item.icon size={18} />
                    </div>
                  ))}
                </div>
                <div className="hidden md:flex mt-auto w-10 h-10 rounded-full bg-kontrol-bg items-center justify-center text-[10px] font-black border border-kontrol-border text-kontrol-ink-muted">
                  KO
                </div>
              </div>

              {/* Main Content Mockup */}
              <div className="flex-1 flex flex-col bg-kontrol-bg/40 overflow-hidden min-h-0">
                {/* Header Mockup */}
                <div className="h-16 border-b border-kontrol-border bg-white flex items-center justify-between px-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-[11px] font-black tracking-wider text-kontrol-dark uppercase flex items-center gap-1">
                        test test test test <span className="text-[9.5px] text-kontrol-blue font-bold tracking-normal uppercase bg-kontrol-blue/5 px-2 py-0.5 rounded-md border border-kontrol-blue/15">test</span>
                      </p>
                      <p className="text-[9.5px] text-kontrol-ink-muted font-bold uppercase tracking-wider">Administrateur, contrôle, test</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] font-extrabold text-kontrol-dark">Administrateur KONTROL</p>
                      <p className="text-[9px] font-bold text-kontrol-ink-soft">•••••••••@••••••••.•••</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-kontrol-dark text-white flex items-center justify-center font-black text-xs border border-white/10 shadow-lg">
                      IK
                    </div>
                  </div>
                </div>

                {/* Sub Content Area Layout */}
                <div className="flex-1 p-5 space-y-5 overflow-y-auto scrollbar-none min-h-0 text-[12px]">
                  {/* Top metrics bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-kontrol-border rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-24">
                      <span className="absolute top-0 right-0 w-16 h-16 bg-kontrol-blue/5 rounded-full -mr-8 -mt-8" />
                      <div>
                        <p className="text-[9.5px] font-black text-kontrol-ink-muted uppercase tracking-wider">Trésorerie Disponible</p>
                        <p className="text-lg font-black text-kontrol-dark mt-1">12 450 000 F CFA</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <span className="bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">+14.2%</span>
                        <span>par rapport à avril</span>
                      </div>
                    </div>

                    <div className="bg-white border border-kontrol-border rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-24">
                      <span className="absolute top-0 right-0 w-16 h-16 bg-kontrol-orange/5 rounded-full -mr-8 -mt-8" />
                      <div>
                        <p className="text-[9.5px] font-black text-kontrol-ink-muted uppercase tracking-wider">Suivi d'Inventaire</p>
                        <p className="text-lg font-black text-kontrol-dark mt-1">94% Optimum</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-kontrol-blue font-bold">
                        <span className="bg-kontrol-blue/5 border border-kontrol-blue/15 rounded-md px-1.5 py-0.5">324 Articles</span>
                        <span>0 rupture en suspens</span>
                      </div>
                    </div>

                    <div className="bg-white border border-kontrol-border rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-24">
                      <span className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -mr-8 -mt-8" />
                      <div>
                        <p className="text-[9.5px] font-black text-kontrol-ink-muted uppercase tracking-wider">Sécurité Shield</p>
                        <p className="text-lg font-black text-kontrol-dark mt-1">Niveau maximal</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                        <span className="bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5">AES-256</span>
                        <span>Audit système crypté ok</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Graph + Ledger List */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Graph panel */}
                    <div className="lg:col-span-8 bg-white border border-kontrol-border shadow-sm rounded-2xl p-4 flex flex-col justify-between h-56">
                      <div className="flex justify-between items-center shrink-0">
                        <div>
                          <p className="font-black text-kontrol-dark">Évolution des Flux Réels 2026</p>
                          <p className="text-[10px] text-kontrol-ink-soft font-semibold">Analyse consolidée par mois (F CFA)</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-kontrol-ink-soft">
                            <span className="w-2.5 h-2.5 bg-kontrol-blue rounded-full" />
                            <span>Ventes</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-kontrol-ink-soft">
                            <span className="w-2.5 h-2.5 bg-kontrol-orange rounded-full" />
                            <span>Charges</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end gap-3 h-32 pt-4">
                        {[
                          { sales: 40, cost: 20, label: 'Jan' },
                          { sales: 65, cost: 25, label: 'Fév' },
                          { sales: 50, cost: 15, label: 'Mar' },
                          { sales: 85, cost: 35, label: 'Avr' },
                          { sales: 100, cost: 30, label: 'Mai' },
                        ].map((m, i) => (
                          <div key={i} className="flex-1 flex flex-col justify-end h-full">
                            <div className="flex items-end gap-1.5 h-[85%]">
                              <div className="flex-1 bg-gradient-to-t from-kontrol-blue to-blue-400 rounded-t-md cursor-pointer hover:opacity-90 transition-opacity" style={{ height: `${m.sales}%` }} title={`Ventes: ${m.sales * 100000}`} />
                              <div className="flex-1 bg-gradient-to-t from-kontrol-orange to-amber-400 rounded-t-md cursor-pointer hover:opacity-90 transition-opacity" style={{ height: `${m.cost}%` }} title={`Charges: ${m.cost * 100000}`} />
                            </div>
                            <span className="text-[10px] font-bold text-kontrol-ink-muted text-center mt-2 block">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Blue AI Log panel */}
                    <div className="lg:col-span-4 bg-white border border-kontrol-border shadow-sm rounded-2xl p-4 flex flex-col justify-between h-56">
                      <div className="flex justify-between items-center bg-teal-50 border border-teal-100 p-2 rounded-xl">
                        <div className="flex items-center gap-1.5 text-teal-800">
                          <Sparkles size={14} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Blue AI Intelligence</span>
                        </div>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      </div>

                      <div className="flex-1 my-3 bg-kontrol-bg border border-kontrol-border rounded-xl p-3 flex flex-col justify-between text-[11px] leading-relaxed font-semibold text-kontrol-dark">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-kontrol-ink-muted uppercase">Analyse Trésorerie Automatique</p>
                          <p className="text-kontrol-ink-soft font-medium italic">« Votre ratio de liquidité est extrêmement robuste. Vos factures échues de la SARL Diallo ont été réglées à 100%. Marge nette estimée à 72%. »</p>
                        </div>
                        <div className="text-[9.5px] font-black text-kontrol-blue flex items-center gap-1 mt-2">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          RECOMMANDATIONS DE SÉCURITÉ OK
                        </div>
                      </div>

                      <div className="text-[9px] font-bold text-kontrol-ink-muted uppercase text-center tracking-widest">
                        PILOTÉ SANS INTERRUPTION PAR BLUE AI
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 lg:px-12 bg-kontrol-bg">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tighter mb-4">{t('landing.features.title')}</h2>
            <p className="text-kontrol-ink-soft font-medium text-sm">{t('landing.features.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 'stock', icon: Box, title: t('landing.features.items.stock_title'), desc: t('landing.features.items.stock_desc'), action: 'Tester le stock' },
              { id: 'transactions', icon: ArrowLeftRight, title: t('landing.features.items.transactions_title'), desc: t('landing.features.items.transactions_desc'), action: 'Simuler des flux' },
              { id: 'crm', icon: Users, title: t('landing.features.items.crm_title'), desc: t('landing.features.items.crm_desc'), action: 'Explorer des tiers' },
              { id: 'analytics', icon: BarChart3, title: t('landing.features.items.analytics_title'), desc: t('landing.features.items.analytics_desc'), action: 'Calculer les KPI' },
              { id: 'security', icon: Shield, title: t('landing.features.items.security_title'), desc: t('landing.features.items.security_desc'), action: 'Lancer un audit' },
              { id: 'blue_ai', icon: Sparkles, title: t('landing.features.items.blue_ai_title'), desc: t('landing.features.items.blue_ai_desc'), action: 'Parler à l\'IA' },
            ].map((f) => (
              <div 
                key={f.id} 
                onClick={() => setActiveFeature(f.id as any)}
                className="bg-white p-6 rounded-[24px] border border-kontrol-border hover:shadow-xl hover:border-kontrol-blue/50 transition-all group cursor-pointer relative flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 bg-kontrol-bg rounded-xl flex items-center justify-center mb-4 group-hover:bg-kontrol-blue group-hover:text-white transition-colors">
                    <f.icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-kontrol-blue transition-colors">{f.title}</h3>
                  <p className="text-[13px] text-kontrol-ink-soft leading-relaxed mb-6">{f.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-kontrol-blue group-hover:translate-x-1 transition-transform mt-auto text-left select-none">
                  <span>{f.action}</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tighter mb-3">{t('landing.pricing.title')}</h2>
            <p className="text-kontrol-ink-soft font-medium text-sm">{t('landing.pricing.subtitle')}</p>
          </div>

          <div className="max-w-[400px] mx-auto bg-kontrol-dark rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-kontrol-orange/20 rounded-full blur-3xl" />
            
            <div className="mb-6">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest">{t('landing.pricing.unique_offer')}</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tighter">
                  {displayPrice.toLocaleString()} {currency.symbol}
                </span>
                <span className="text-white/50 font-medium text-sm">{t('landing.pricing.per_month')}</span>
              </div>
              <p className="mt-3 text-white/60 text-xs">{t('landing.pricing.all_included')}</p>
              {currency.code !== 'XOF' && (
                <p className="text-[9px] text-white/30 mt-1 uppercase font-bold tracking-widest">
                  {t('landing.pricing.equivalent')}
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {(t('landing.pricing.bullets', { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-medium">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => onLoginClick('register')}
              className="w-full py-3.5 bg-white text-kontrol-dark font-extrabold rounded-xl hover:bg-kontrol-blue hover:text-white transition-all shadow-xl text-sm"
            >
              {t('landing.pricing.cta')}
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 lg:px-12 bg-kontrol-dark text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-kontrol-blue rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-kontrol-orange rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8">
              <Globe size={14} className="text-kontrol-blue" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">{t('landing.about.badge')}</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tighter leading-tight mb-6">
              <Trans i18nKey="landing.about.title" />
            </h2>
            <p className="text-base text-white/60 mb-8 leading-relaxed">
              {t('landing.about.desc')}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-2xl font-extrabold text-white">{t('landing.about.stat1')}</p>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{t('landing.about.stat1_desc')}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{t('landing.about.stat2')}</p>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{t('landing.about.stat2_desc')}</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-white/5 rounded-[60px] border border-white/10 p-12 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                  <Logo size="md" className="border-none shadow-none" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('landing.about.hq_title')}</p>
                  <p className="text-sm font-bold">{t('landing.about.hq_value')}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-white/60 text-sm">{t('landing.about.quote')}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-kontrol-blue transition-colors cursor-pointer">
                  <MessageSquare size={18} />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-kontrol-blue transition-colors cursor-pointer">
                  <Layout size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 lg:px-12 bg-kontrol-bg">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <div>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tighter leading-tight mb-6">
                <Trans i18nKey="landing.contact.title" />
              </h2>
              <p className="text-base text-kontrol-ink-soft mb-10 leading-relaxed">
                {t('landing.contact.subtitle')}
              </p>
              
              <div className="space-y-5">
                <a 
                  href="mailto:Innov.korp@gmail.com"
                  className="flex items-center gap-4 group hover:bg-kontrol-blue/5 p-2 rounded-2xl transition-all"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-kontrol-blue shadow-sm border border-kontrol-border group-hover:bg-kontrol-blue group-hover:text-white transition-colors">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Email</p>
                    <p className="font-bold text-sm">Innov.korp@gmail.com</p>
                  </div>
                </a>
                <a 
                  href="https://wa.me/2250150979123" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 group hover:bg-emerald-50 p-2 rounded-2xl transition-all"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-kontrol-border group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-widest">WhatsApp</p>
                    <p className="font-bold text-sm">+225 01 50 97 91 23</p>
                  </div>
                </a>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-kontrol-ink-soft shadow-sm border border-kontrol-border">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Siège</p>
                    <p className="font-bold text-sm">Abidjan, Côte d'Ivoire</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-kontrol-border shadow-2xl shadow-kontrol-dark/5">
              <SupportForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-kontrol-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex items-center gap-3">
              <Logo size="sm" className="border-none shadow-none" />
              <span className="text-xl font-extrabold tracking-tighter text-kontrol-dark uppercase">KONTROL</span>
            </div>
            <div className="flex gap-8">
              <a href="mailto:Innov.korp@gmail.com" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors flex items-center gap-2">
                <Mail size={16} /> Innov.korp@gmail.com
              </a>
              <button 
                onClick={() => setLegalView('mentions')}
                className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors"
              >
                {t('landing.footer.mentions')}
              </button>
              <button 
                onClick={() => setLegalView('confidentialite')}
                className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors"
              >
                {t('landing.footer.privacy')}
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-kontrol-border">
            <div className="flex flex-col items-center md:items-start gap-1">
              <p className="text-[11px] text-kontrol-ink-muted font-medium uppercase tracking-widest">
                {t('landing.footer.rights')}
              </p>
              <p className="text-[9px] text-kontrol-ink-muted/60 font-bold uppercase tracking-[0.2em]">
                {t('common.powered_by')} <span className="text-kontrol-blue">BLUE AI</span> & <span className="text-kontrol-orange">INNOV'KORP</span>
              </p>
            </div>
            <div className="flex gap-6">
              <button onClick={() => setLegalView('mentions')} className="text-kontrol-ink-muted hover:text-kontrol-dark transition-colors"><Globe size={18} /></button>
              <button onClick={() => setLegalView('confidentialite')} className="text-kontrol-ink-muted hover:text-kontrol-dark transition-colors"><Shield size={18} /></button>
            </div>
          </div>
        </div>
      </footer>
      
      <AnimatePresence>
        {legalView && (
          <LegalTerms 
            type={legalView} 
            onClose={() => setLegalView(null)} 
          />
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          "fixed bottom-24 right-8 w-12 h-12 bg-kontrol-dark text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-[110] hover:bg-kontrol-blue hover:-translate-y-1 active:scale-90",
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        <ArrowUp size={20} />
      </button>

      <Chatbot />
    </div>
  );
}
