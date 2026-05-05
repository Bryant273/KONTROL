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
import { loginWithGoogle, loginWithEmail, registerWithEmail, auth, handleFirestoreError, OperationType, db } from '../../../api/firebase';
import { notifySecurityEvent } from '../../../api/services/notificationService';

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
      // Set default navigation state for new login
      localStorage.setItem('activeTab', 'dashboard');
      localStorage.setItem('activeSection', 'Pilotage');
      localStorage.setItem('activeLabel', 'Tableau de bord');

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
      // Notify security event for failed login
      if (authMode === 'login') {
        notifySecurityEvent('system', null, 'Échec de Connexion', `Tentative échouée pour l'email: ${email}. Raison: ${error.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden font-sans">
      {/* Left Side - Visuals */}
      <div className="hidden lg:flex lg:w-[50%] bg-kontrol-dark relative items-center justify-center p-12 overflow-hidden">
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

        <div className="relative z-10 max-w-md">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold text-white tracking-tighter leading-[1.1]">
                La gestion de demain, <br />
                <span className="text-kontrol-blue">disponible aujourd'hui.</span>
              </h2>
              <p className="text-lg text-white/50 font-medium leading-relaxed">
                Rejoignez l'écosystème <strong>INNOV'KORP</strong> et transformez votre boutique avec KONTROL.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: ShieldCheck, title: "Sécurité Totale", desc: "Données chiffrées et sauvegardées." },
                { icon: Rocket, title: "Performance Accrue", desc: "Gagnez du temps sur vos tâches." },
                { icon: CheckCircle2, title: "Support Local", desc: "Équipe basée à Abidjan 24/7." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex gap-4 items-start group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-kontrol-blue group-hover:bg-kontrol-blue group-hover:text-white transition-all duration-300 shrink-0">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold mb-0.5">{item.title}</h4>
                    <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full lg:w-[50%] p-6 md:p-12 flex flex-col relative z-10 bg-white overflow-y-auto"
      >
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-[12px] font-bold text-kontrol-ink-muted hover:text-kontrol-dark transition-colors mb-8 w-fit"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Retour
        </button>

        <div className="max-w-[380px] mx-auto w-full flex-1 flex flex-col justify-center py-4">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-4">
              <Logo size="md" className="shadow-lg shadow-kontrol-blue/10 border-none" />
              <span className="text-3xl font-extrabold text-kontrol-dark tracking-tighter uppercase">KONTROL</span>
            </div>
            <h1 className="text-2xl font-extrabold text-kontrol-dark tracking-tighter leading-tight mb-2">
              {authMode === 'login' ? 'Bon retour.' : 'Propulsez votre boutique.'}
            </h1>
            <p className="text-sm text-kontrol-ink-soft font-medium leading-relaxed">
              {authMode === 'login' 
                ? 'Connectez-vous pour reprendre le contrôle.' 
                : 'Simplifiez votre gestion dès maintenant.'}
            </p>
          </div>

          <div className="flex bg-kontrol-bg p-1 rounded-xl mb-6">
            <button 
              onClick={() => setAuthMode('login')}
              className={cn(
                "flex-1 py-2 text-[12px] font-bold rounded-lg transition-all",
                authMode === 'login' ? "bg-white text-kontrol-dark shadow-sm" : "text-kontrol-ink-muted hover:text-kontrol-dark"
              )}
            >
              Connexion
            </button>
            <button 
              onClick={() => setAuthMode('register')}
              className={cn(
                "flex-1 py-2 text-[12px] font-bold rounded-lg transition-all",
                authMode === 'register' ? "bg-white text-kontrol-dark shadow-sm" : "text-kontrol-ink-muted hover:text-kontrol-dark"
              )}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] rounded-lg font-bold flex items-center gap-2"
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
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest ml-1">Entreprise</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        required
                        placeholder="Ma Super Entreprise"
                        className="w-full pl-10 pr-4 py-2.5 bg-kontrol-bg/50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[13px]"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                      <Sparkles size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-orange transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest ml-1">Gérant</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        required
                        placeholder="Jean Dupont"
                        className="w-full pl-10 pr-4 py-2.5 bg-kontrol-bg/50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[13px]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <input 
                  type="email"
                  required
                  placeholder="vous@entreprise.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-kontrol-bg/50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[13px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">Mot de passe</label>
                {authMode === 'login' && <button type="button" className="text-[10px] font-bold text-kontrol-blue hover:underline">Oublié ?</button>}
              </div>
              <div className="relative group">
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-kontrol-bg/50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue focus:bg-white transition-all font-medium text-[13px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-kontrol-dark text-white font-extrabold rounded-xl hover:bg-kontrol-blue transition-all shadow-lg shadow-kontrol-dark/10 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {authLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-kontrol-border"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-[0.2em] font-extrabold">
                <span className="bg-white px-4 text-kontrol-ink-muted">ou</span>
              </div>
            </div>

            <motion.button 
              whileHover={{ y: -1 }}
              type="button"
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, 'auth/google', null, false);
                }
              }}
              className="w-full h-12 bg-white border border-kontrol-border rounded-xl flex items-center justify-center gap-3 text-[13px] font-bold text-kontrol-dark hover:border-kontrol-blue/30 transition-all active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Google
            </motion.button>
          </form>

          <p className="mt-8 text-center text-[11px] text-kontrol-ink-muted font-medium">
            En continuant, vous acceptez nos <button className="text-kontrol-dark font-bold hover:underline">Conditions</button> et notre <button className="text-kontrol-dark font-bold hover:underline">Confidentialité</button>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
