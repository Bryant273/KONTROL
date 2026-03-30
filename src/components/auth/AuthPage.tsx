import React from 'react';
import { 
  LogIn, 
  Sparkles, 
  Loader2, 
  Mail, 
  Lock, 
  User as UserIcon,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Logo } from '../common/Logo';
import { loginWithGoogle, loginWithEmail, registerWithEmail, auth } from '../../firebase';

interface AuthPageProps {
  onBack: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthPage({ onBack, initialMode = 'login' }: AuthPageProps) {
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [authError, setAuthError] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const user = await loginWithEmail(email, password);
        // If it's a custom user (not in Firebase Auth), save to localStorage
        if (auth.currentUser?.uid !== user.uid) {
          localStorage.setItem('customUser', JSON.stringify(user));
          // Reload to trigger App.tsx state update
          window.location.reload();
        }
      } else {
        await registerWithEmail(email, password, name, companyName);
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden font-sans">
      {/* Left Side - Visuals */}
      <div className="hidden lg:flex lg:w-[55%] bg-kontrol-dark relative items-center justify-center p-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-kontrol-blue rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-kontrol-orange rounded-full blur-[100px]" 
          />
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <Zap size={14} className="text-kontrol-blue" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Propulsé par INNOV'KORP</span>
              </div>
              <h2 className="text-5xl font-black text-white tracking-tighter leading-[1.1]">
                La gestion de demain, <br />
                <span className="text-kontrol-blue">disponible aujourd'hui.</span>
              </h2>
              <p className="text-xl text-white/50 font-medium leading-relaxed">
                Rejoignez plus de 10 entrepreneurs qui ont déjà transformé leur boutique avec KONTROL.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {[
                { icon: ShieldCheck, title: "Sécurité Totale", desc: "Vos données sont chiffrées et sauvegardées quotidiennement." },
                { icon: Rocket, title: "Performance Accrue", desc: "Gagnez jusqu'à 10h par semaine sur vos tâches administratives." },
                { icon: CheckCircle2, title: "Support Local", desc: "Une équipe basée à Abidjan pour vous accompagner 24/7." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex gap-5 items-start group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-kontrol-blue group-hover:bg-kontrol-blue group-hover:text-white transition-all duration-300">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{item.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Floating UI Mockup */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="mt-12 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold text-white/40 uppercase tracking-widest">Aperçu Dashboard</div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-2/3 bg-white/10 rounded-full" />
                <div className="h-4 w-full bg-white/5 rounded-full" />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="h-16 bg-kontrol-blue/20 rounded-2xl border border-kontrol-blue/30" />
                  <div className="h-16 bg-white/5 rounded-2xl border border-white/10" />
                  <div className="h-16 bg-white/5 rounded-2xl border border-white/10" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full lg:w-[45%] p-8 md:p-16 flex flex-col relative z-10 bg-white"
      >
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-[13px] font-bold text-kontrol-ink-muted hover:text-kontrol-dark transition-colors mb-12 w-fit"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Retour à l'accueil
        </button>

        <div className="max-w-[400px] mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="mb-10">
            <Logo size="lg" className="mb-6 shadow-xl shadow-kontrol-blue/10 border-none" />
            <h1 className="text-3xl font-black text-kontrol-dark tracking-tighter leading-tight mb-3">
              {authMode === 'login' ? 'Bon retour parmi nous.' : 'Propulsez votre boutique.'}
            </h1>
            <p className="text-kontrol-ink-soft font-medium leading-relaxed">
              {authMode === 'login' 
                ? 'Connectez-vous pour reprendre le contrôle de votre activité.' 
                : 'Rejoignez INNOV\'KORP et simplifiez votre gestion quotidienne.'}
            </p>
          </div>

          <div className="flex bg-kontrol-bg p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setAuthMode('login')}
              className={cn(
                "flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all",
                authMode === 'login' ? "bg-white text-kontrol-dark shadow-md" : "text-kontrol-ink-muted hover:text-kontrol-dark"
              )}
            >
              Connexion
            </button>
            <button 
              onClick={() => setAuthMode('register')}
              className={cn(
                "flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all",
                authMode === 'register' ? "bg-white text-kontrol-dark shadow-md" : "text-kontrol-ink-muted hover:text-kontrol-dark"
              )}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[12.5px] rounded-xl font-bold flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  {authError}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {authMode === 'register' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-kontrol-ink-muted uppercase tracking-widest ml-1">Nom de l'entreprise</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        required
                        placeholder="Ma Super Entreprise"
                        className="w-full pl-11 pr-4 py-3.5 bg-kontrol-bg/50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[14px]"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                      <Sparkles size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-orange transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-kontrol-ink-muted uppercase tracking-widest ml-1">Nom du gérant</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        required
                        placeholder="Jean Dupont"
                        className="w-full pl-11 pr-4 py-3.5 bg-kontrol-bg/50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[14px]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-kontrol-ink-muted uppercase tracking-widest ml-1">Adresse e-mail</label>
              <div className="relative group">
                <input 
                  type="email"
                  required
                  placeholder="vous@entreprise.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-kontrol-bg/50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[14px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-black text-kontrol-ink-muted uppercase tracking-widest">Mot de passe</label>
                {authMode === 'login' && <button type="button" className="text-[11px] font-bold text-kontrol-blue hover:underline">Oublié ?</button>}
              </div>
              <div className="relative group">
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 bg-kontrol-bg/50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[14px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-kontrol-dark text-white font-black rounded-2xl hover:bg-kontrol-blue transition-all shadow-xl shadow-kontrol-dark/10 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
            >
              {authLoading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-kontrol-border"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
                <span className="bg-white px-6 text-kontrol-ink-muted">ou continuer avec</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <motion.button 
                whileHover={{ y: -2 }}
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="w-full h-14 bg-white border-2 border-kontrol-bg rounded-2xl flex items-center justify-center gap-4 text-[14px] font-bold text-kontrol-dark hover:border-kontrol-blue/30 transition-all active:scale-[0.98] shadow-sm"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continuer avec Google
              </motion.button>
            </div>
          </form>

          <p className="mt-12 text-center text-[12px] text-kontrol-ink-muted font-medium">
            En continuant, vous acceptez nos <button className="text-kontrol-dark font-bold hover:underline">Conditions d'utilisation</button> et notre <button className="text-kontrol-dark font-bold hover:underline">Politique de confidentialité</button>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
