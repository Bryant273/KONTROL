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

interface LandingPageProps {
  onLoginClick: (mode?: 'login' | 'register') => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
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
    // Basic currency detection based on locale
    const locale = navigator.language;
    if (locale.includes('fr-FR') || locale.includes('de') || locale.includes('it') || locale.includes('es')) {
      setCurrency({ code: 'EUR', symbol: '€', rate: 0.0015, label: 'EUR' });
    } else if (locale.includes('en-US')) {
      setCurrency({ code: 'USD', symbol: '$', rate: 0.0016, label: 'USD' });
    } else {
      // Default to XOF for West Africa or others
      setCurrency({ code: 'XOF', symbol: 'F CFA', rate: 1, label: 'XOF' });
    }
  }, []);

  const basePrice = 10000; // 10,000 XOF per month
  const displayPrice = Math.round(basePrice * currency.rate);

  return (
    <div className="min-h-screen bg-white text-kontrol-dark font-sans selection:bg-kontrol-blue/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-kontrol-border z-[100] px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" className="border-none shadow-none" />
          <span className="text-xl font-extrabold tracking-tighter">KONTROL</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">Tarifs</a>
          <a href="#about" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">À propos</a>
        </div>

        <button 
          onClick={() => onLoginClick('login')}
          className="px-6 py-2.5 bg-kontrol-dark text-white text-[13px] font-bold rounded-full hover:bg-kontrol-blue transition-all active:scale-95 shadow-lg shadow-kontrol-dark/10"
        >
          Accéder à l'Espace Client
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 lg:px-12 max-w-7xl mx-auto text-center relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-kontrol-blue/5 rounded-full blur-[120px] -z-10" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles size={14} className="text-kontrol-orange" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-kontrol-ink-muted">Propulsé par Blue AI & INNOV'KORP</span>
        </div>

        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tighter leading-[0.9] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Gérez votre boutique <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-kontrol-blue to-kontrol-orange">en toute simplicité.</span>
        </h1>

        <p className="text-base text-kontrol-ink-soft max-w-xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          KONTROL est la solution tout-en-un conçue par INNOV'KORP pour simplifier la gestion des stocks, des ventes et de la comptabilité des <strong>TPE, boutiques et petits commerces</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <button 
            onClick={() => onLoginClick('register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-kontrol-blue text-white font-extrabold rounded-2xl hover:bg-kontrol-blue-hover transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group"
          >
            Démarrer gratuitement
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto px-8 py-3.5 bg-white border border-kontrol-border text-kontrol-dark font-extrabold rounded-2xl hover:bg-kontrol-bg transition-all"
          >
            Demander une démo
          </button>
        </div>

        {/* Mockup Preview */}
        <div className="mt-20 relative animate-in fade-in zoom-in duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
          <div className="bg-kontrol-dark rounded-[32px] p-3 shadow-2xl border border-white/10 overflow-hidden">
            <div className="bg-white rounded-[20px] aspect-video overflow-hidden shadow-inner flex">
              {/* Sidebar Mockup */}
              <div className="w-16 border-r border-kontrol-border bg-kontrol-bg flex flex-col items-center py-6 gap-6">
                <div className="w-8 h-8 rounded-lg bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue">
                  <Logo size="sm" className="border-none shadow-none" />
                </div>
                <div className="flex flex-col gap-4">
                  {[Layout, Box, ArrowLeftRight, Users, BarChart3].map((Icon, i) => (
                    <div key={i} className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", i === 0 ? "bg-kontrol-blue text-white" : "text-kontrol-ink-muted hover:bg-kontrol-border")}>
                      <Icon size={18} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Mockup */}
              <div className="flex-1 flex flex-col">
                <div className="h-12 border-b border-kontrol-border bg-white flex items-center justify-between px-6">
                  <div className="h-6 bg-kontrol-bg rounded-md w-32" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kontrol-bg" />
                    <div className="h-4 bg-kontrol-bg rounded w-20" />
                  </div>
                </div>
                <div className="flex-1 p-6 bg-kontrol-bg/30">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="h-24 bg-white rounded-2xl border border-kontrol-border p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-kontrol-blue/5 rounded-full -mr-6 -mt-6" />
                      <div className="h-3 bg-kontrol-bg rounded w-1/2 mb-2" />
                      <div className="h-6 bg-kontrol-blue/20 rounded w-3/4" />
                    </div>
                    <div className="h-24 bg-white rounded-2xl border border-kontrol-border p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-kontrol-orange/5 rounded-full -mr-6 -mt-6" />
                      <div className="h-3 bg-kontrol-bg rounded w-1/2 mb-2" />
                      <div className="h-6 bg-kontrol-orange/20 rounded w-3/4" />
                    </div>
                    <div className="h-24 bg-white rounded-2xl border border-kontrol-border p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full -mr-6 -mt-6" />
                      <div className="h-3 bg-kontrol-bg rounded w-1/2 mb-2" />
                      <div className="h-6 bg-emerald-500/20 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 h-48 bg-white rounded-2xl border border-kontrol-border shadow-sm p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-kontrol-bg rounded w-1/4" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-kontrol-blue" />
                          <div className="w-2 h-2 rounded-full bg-kontrol-orange" />
                        </div>
                      </div>
                      <div className="flex items-end gap-2 h-32">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                          <div key={i} className={cn("flex-1 rounded-t-md", i % 2 === 0 ? "bg-kontrol-blue/30" : "bg-kontrol-orange/30")} style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="col-span-4 h-48 bg-white rounded-2xl border border-kontrol-border shadow-sm p-4">
                      <div className="h-4 bg-kontrol-bg rounded w-1/2 mb-4" />
                      <div className="space-y-3">
                        {[
                          { color: 'bg-kontrol-blue/20' },
                          { color: 'bg-kontrol-orange/20' },
                          { color: 'bg-emerald-500/20' }
                        ].map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <div className={cn("w-8 h-8 rounded", item.color)} />
                            <div className="flex-1 space-y-1">
                              <div className="h-2 bg-kontrol-bg rounded w-full" />
                              <div className="h-2 bg-kontrol-bg rounded w-1/2" />
                            </div>
                          </div>
                        ))}
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
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tighter mb-4">Tout ce dont vous avez besoin.</h2>
            <p className="text-kontrol-ink-soft font-medium text-sm">Une suite complète d'outils pour piloter votre activité en temps réel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Box, title: 'Gestion de Stock', desc: 'Suivez vos entrées et sorties en temps réel avec alertes de stock bas.' },
              { icon: ArrowLeftRight, title: 'Transactions', desc: 'Gérez vos ventes et vos achats avec une interface ultra-rapide.' },
              { icon: Users, title: 'CRM Tiers', desc: 'Centralisez vos clients et fournisseurs pour un suivi personnalisé.' },
              { icon: BarChart3, title: 'Analytique', desc: 'Visualisez vos performances avec des graphiques clairs et précis.' },
              { icon: Shield, title: 'Sécurité Maximale', desc: 'Vos données sont chiffrées et protégées par les standards bancaires.' },
              { icon: Sparkles, title: 'Blue AI', desc: 'L\'intelligence artificielle qui vous aide à prendre les meilleures décisions.' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-[24px] border border-kontrol-border hover:shadow-xl transition-all group">
                <div className="w-10 h-10 bg-kontrol-bg rounded-xl flex items-center justify-center mb-4 group-hover:bg-kontrol-blue group-hover:text-white transition-colors">
                  <f.icon size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-[13px] text-kontrol-ink-soft leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tighter mb-3">Un tarif simple et transparent.</h2>
            <p className="text-kontrol-ink-soft font-medium text-sm">Pas de frais cachés, pas de mauvaises surprises.</p>
          </div>

          <div className="max-w-[400px] mx-auto bg-kontrol-dark rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-kontrol-orange/20 rounded-full blur-3xl" />
            
            <div className="mb-6">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest">Offre Unique</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tighter">
                  {displayPrice.toLocaleString()} {currency.symbol}
                </span>
                <span className="text-white/50 font-medium text-sm">/mois</span>
              </div>
              <p className="mt-3 text-white/60 text-xs">Tout inclus, pour toujours.</p>
              {currency.code !== 'XOF' && (
                <p className="text-[9px] text-white/30 mt-1 uppercase font-bold tracking-widest">
                  Équivalent à 10 000 F CFA
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Utilisateurs illimités',
                'Transactions illimitées',
                'Support prioritaire 24/7',
                'Blue AI inclus',
                'Mises à jour gratuites',
                'Exportation de données'
              ].map((item, i) => (
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
              Commencer maintenant
            </button>
          </div>
        </div>
      </section>

      {/* About / INNOV'KORP */}
      <section id="about" className="py-24 px-6 lg:px-12 bg-kontrol-dark text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-kontrol-blue rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-kontrol-orange rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8">
              <Globe size={14} className="text-kontrol-blue" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">À propos de nous</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tighter leading-tight mb-6">
              L'innovation au service de <br />
              <span className="text-kontrol-blue">votre croissance.</span>
            </h2>
            <p className="text-base text-white/60 mb-8 leading-relaxed">
              KONTROL est une création de <strong>INNOV'KORP</strong>, une entreprise technologique dédiée à la transformation numérique des <strong>TPE et boutiques</strong>. Notre mission est de démocratiser les outils de gestion de pointe pour permettre à chaque petit commerçant de réussir.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-2xl font-extrabold text-white">10+</p>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Entreprises nous font confiance</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">99.9%</p>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Disponibilité</p>
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
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Siège Social</p>
                  <p className="text-sm font-bold">Abidjan, Côte d'Ivoire</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-white/60 text-sm">"Notre vision est de créer des outils si intuitifs qu'ils deviennent invisibles, laissant l'entrepreneur se concentrer sur ce qu'il aime."</p>
                  <p className="mt-4 font-bold text-sm">— Direction INNOV'KORP</p>
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
                Parlons de votre <br />
                <span className="text-kontrol-orange">projet.</span>
              </h2>
              <p className="text-base text-kontrol-ink-soft mb-10 leading-relaxed">
                Vous avez des questions ou besoin d'une démonstration personnalisée ? Notre équipe est à votre écoute pour vous accompagner dans votre transformation numérique.
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
              <form className="space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const data = {
                  name: formData.get('name'),
                  email: formData.get('email'),
                  subject: formData.get('subject'),
                  message: formData.get('message'),
                  status: 'NEW',
                  priority: 'MEDIUM',
                  createdAt: Date.now()
                };
                
                try {
                  const { db, collection, addDoc } = await import('../../firebase');
                  await addDoc(collection(db, 'tickets'), data);
                  alert('Message envoyé avec succès ! Notre équipe vous contactera sous peu.');
                  form.reset();
                } catch (err) {
                  console.error(err);
                  alert('Une erreur est survenue. Veuillez réessayer.');
                }
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Nom complet</label>
                    <input name="name" type="text" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px]" placeholder="Jean Dupont" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Email</label>
                    <input name="email" type="email" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px]" placeholder="jean@entreprise.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Sujet</label>
                  <input name="subject" type="text" required className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px]" placeholder="Demande de démo" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Message</label>
                  <textarea name="message" required rows={3} className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px] resize-none" placeholder="Comment pouvons-nous vous aider ?" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-kontrol-dark text-white font-extrabold rounded-xl hover:bg-kontrol-blue transition-all flex items-center justify-center gap-2 group text-sm">
                  Envoyer le message
                  <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
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
              <span className="text-sm font-extrabold tracking-tighter">KONTROL by INNOV'KORP</span>
            </div>
            <div className="flex gap-8">
              <a href="mailto:Innov.korp@gmail.com" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors flex items-center gap-2">
                <Mail size={16} /> Innov.korp@gmail.com
              </a>
              <a href="#" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">Mentions légales</a>
              <a href="#" className="text-[13px] font-bold text-kontrol-ink-soft hover:text-kontrol-blue transition-colors">Confidentialité</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-kontrol-border">
            <p className="text-[11px] text-kontrol-ink-muted font-medium uppercase tracking-widest">
              © 2026 INNOV'KORP. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-kontrol-ink-muted hover:text-kontrol-dark transition-colors"><Globe size={18} /></a>
              <a href="#" className="text-kontrol-ink-muted hover:text-kontrol-dark transition-colors"><CreditCard size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          "fixed bottom-8 right-8 w-12 h-12 bg-kontrol-dark text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-[110] hover:bg-kontrol-blue hover:-translate-y-1 active:scale-90",
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        <ArrowUp size={20} />
      </button>

      <Chatbot />
    </div>
  );
}
