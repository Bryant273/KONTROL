import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  auth, 
  logout, 
  onAuthStateChanged, 
  db,
  doc,
  onSnapshot,
  ensureUserProfile,
  type User 
} from './firebase';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { TiersModule } from './modules/tiers/TiersModule';
import { ProduitsModule } from './modules/produits/ProduitsModule';
import { TransactionsModule } from './modules/transactions/TransactionsModule';
import { ChargesModule } from './modules/charges/ChargesModule';
import { StocksModule } from './modules/stocks/StocksModule';
import { FinanceModule } from './modules/finance/FinanceModule';
import { BlueAIModule } from './modules/blue/BlueAIModule';
import { UsersModule } from './modules/users/UsersModule';
import { TicketsModule } from './modules/tickets/TicketsModule';
import { CompaniesModule } from './modules/companies/CompaniesModule';
import { ProfileModule } from './modules/profile/ProfileModule';
import { ActionsModule } from './modules/actions/ActionsModule';
import { SubscriptionsModule } from './modules/subscriptions/SubscriptionsModule';
import { CompanySetupModal } from './components/auth/CompanySetupModal';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { cn, formatCurrency } from './lib/utils';
import { UserProfile } from './types';
import { AlertTriangle, Clock, X } from 'lucide-react';

import { SystemModule } from './modules/system/SystemModule';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSection, setActiveSection] = useState('Pilotage');
  const [activeLabel, setActiveLabel] = useState('Tableau de bord');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showReminder, setShowReminder] = useState<{ days: number } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  
  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        localStorage.removeItem('customUser');
        setLoading(false);
      } else {
        const saved = localStorage.getItem('customUser');
        if (saved) {
          setUser(JSON.parse(saved));
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Profile listener
  useEffect(() => {
    if (!user) return;
    
    // Set a timeout to stop loading if profile fetch takes too long
    const timeout = setTimeout(() => setLoading(false), 3000);

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const profileData = snapshot.data() as UserProfile;
        setProfile(profileData);
        if (!profileData.isProfileComplete && (profileData.role === 'ADMINISTRATEUR_ENTREPRISE' || profileData.role === 'GESTIONNAIRE_ENTREPRISE')) {
          setShowSetup(true);
        }
        setLoading(false);
        clearTimeout(timeout);
      } else {
        ensureUserProfile(user).catch((err) => {
          console.error(err);
          setLoading(false);
          clearTimeout(timeout);
        });
      }
    }, (error) => {
      console.error("Profile fetch error:", error);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user]);

  // Subscription Logic - Disabled for now (Free access)
  useEffect(() => {
    if (!profile || (profile.role !== 'ADMINISTRATEUR_ENTREPRISE' && profile.role !== 'GESTIONNAIRE_ENTREPRISE')) return;

    const checkSubscription = () => {
      // Logic disabled: users use the app for free
      setIsBlocked(false);
      setShowReminder(null);
    };

    checkSubscription();
  }, [profile]);

  // Action Logging - Login
  useEffect(() => {
    if (profile && !sessionStorage.getItem(`logged_in_${profile.uid}`)) {
      import('./firebase').then(({ logAction }) => {
        logAction(
          profile.companyId, 
          profile.uid, 
          profile.displayName, 
          'CONNEXION', 
          'L\'utilisateur s\'est connecté à la plateforme'
        ).then(() => {
          sessionStorage.setItem(`logged_in_${profile.uid}`, 'true');
        });
      });
    }
  }, [profile]);

  const handleLogout = async () => {
    await logout(profile);
    setUser(null);
    setProfile(null);
    setAuthView('landing');
  };

  const handleTabChange = (tab: string, section: string, label: string) => {
    setActiveTab(tab);
    setActiveSection(section);
    setActiveLabel(label);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-kontrol-blue/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-kontrol-blue rounded-full animate-spin" />
        </div>
        <p className="text-[13px] font-black tracking-widest text-kontrol-dark uppercase animate-pulse">KONTROL</p>
        <p className="text-[11px] text-kontrol-ink-muted mt-2">Initialisation sécurisée par INNOV'KORP...</p>
      </div>
    );
  }

  if (!user) {
    if (authView === 'auth') {
      return <AuthPage onBack={() => setAuthView('landing')} initialMode={authInitialMode} />;
    }
    return (
      <LandingPage onLoginClick={(mode) => {
        setAuthInitialMode(mode === 'register' ? 'register' : 'login');
        setAuthView('auth');
      }} />
    );
  }

  return (
    <div className="min-h-screen bg-kontrol-bg flex overflow-hidden">
      {showSetup && profile && (
        <CompanySetupModal 
          profile={profile} 
          onClose={() => setShowSetup(false)} 
          onComplete={(updated) => {
            setProfile(updated);
            setShowSetup(false);
          }}
        />
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        user={user} 
        profile={profile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <Header 
        section={activeSection} 
        page={activeLabel} 
        user={user} 
        profile={profile}
        onLogout={handleLogout}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <main className={cn(
        "flex-1 pt-14 h-screen overflow-y-auto transition-all duration-300 ease-in-out",
        isSidebarOpen ? "lg:pl-[250px]" : "pl-0"
      )}>
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          {isBlocked && activeTab !== 'abonnements' ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-black text-kontrol-dark mb-2 tracking-tighter">Accès restreint</h2>
              <p className="text-kontrol-ink-muted max-w-md mb-8 font-medium">
                Votre abonnement KONTROL a expiré. Veuillez renouveler votre forfait pour continuer à accéder à vos outils de gestion.
              </p>
              <button 
                onClick={() => handleTabChange('abonnements', 'Compte', 'Abonnement')}
                className="btn-primary px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-kontrol-blue/20"
              >
                Renouveler maintenant
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard user={user} currentUserProfile={profile} />}
              {activeTab === 'tiers' && <TiersModule user={user} currentUserProfile={profile} />}
              {activeTab === 'produits' && <ProduitsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'transactions' && <TransactionsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'charges' && <ChargesModule user={user} currentUserProfile={profile} />}
              {activeTab === 'stocks' && <StocksModule user={user} currentUserProfile={profile} />}
              {activeTab === 'finance' && <FinanceModule user={user} currentUserProfile={profile} />}
              {activeTab === 'ai' && <BlueAIModule user={user} currentUserProfile={profile} />}
              {activeTab === 'utilisateurs' && <UsersModule user={user} currentUserProfile={profile} />}
              {activeTab === 'tickets' && <TicketsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'entreprises' && <CompaniesModule />}
              {activeTab === 'system' && <SystemModule currentUserProfile={profile} />}
              {activeTab === 'actions' && <ActionsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'abonnements' && <SubscriptionsModule profile={profile} />}
              {activeTab === 'profil' && <ProfileModule profile={profile} />}
            </>
          )}
        </div>
      </main>

      {showSetup && profile && (
        <CompanySetupModal 
          profile={profile} 
          onClose={() => setShowSetup(false)} 
          onComplete={(updated) => {
            setProfile(updated);
            setShowSetup(false);
          }}
        />
      )}

      {/* Subscription Reminder Toast */}
      {showReminder && !isBlocked && (
        <div className="fixed bottom-6 right-6 z-[2000] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-kontrol-dark text-white p-5 rounded-2xl shadow-2xl border border-white/10 flex items-start gap-4 max-w-sm">
            <div className="w-10 h-10 bg-kontrol-orange rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-kontrol-orange/20">
              <Clock size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black tracking-tight">Renouvellement proche</h4>
              <p className="text-[12px] text-white/60 mt-1 leading-relaxed">
                Votre abonnement expire dans <span className="text-white font-bold">{showReminder.days} jours</span>. Évitez toute interruption de service.
              </p>
              <button 
                onClick={() => handleTabChange('abonnements', 'Compte', 'Abonnement')}
                className="mt-3 text-[11px] font-black uppercase tracking-widest text-kontrol-blue hover:text-white transition-colors"
              >
                Renouveler →
              </button>
            </div>
            <button onClick={() => setShowReminder(null)} className="text-white/30 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
