import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  auth, 
  logout, 
  onAuthStateChanged, 
  signInAnonymously,
  db,
  doc,
  onSnapshot,
  ensureUserProfile,
  type User 
} from '../api/firebase';
import { ControlTower } from './modules/admin/ControlTower';
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
import { Chatbot } from './components/common/Chatbot';
import { LoadingScreen } from './components/common/LoadingScreen';
import { cn, formatCurrency } from './lib/utils';
import { UserProfile } from './types';
import { AlertTriangle, Clock, X, Loader2 } from 'lucide-react';

import { SystemModule } from './modules/system/SystemModule';
import { KChatModule } from './modules/chat/KChatModule';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('activeSection') || 'Pilotage');
  const [activeLabel, setActiveLabel] = useState(() => localStorage.getItem('activeLabel') || 'Tableau de bord');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showReminder, setShowReminder] = useState<{ days: number } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const isKontrolAdmin = profile?.role === 'ADMINISTRATEUR_ERP' || profile?.role === 'GESTIONNAIRE_ERP' || profile?.role === 'ADMIN' || profile?.role === 'ADMINISTRATEUR_KONTROL' || profile?.role === 'GESTIONNAIRE_KONTROL';
  
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
          setLoading(false);
        } else {
          // Sign in anonymously if no user is found
          signInAnonymously(auth).catch(err => {
            if (err.code === 'auth/admin-restricted-operation') {
              console.warn("L'authentification anonyme n'est pas activée dans la console Firebase. Le chatbot pour les invités pourrait ne pas fonctionner correctement.");
            } else {
              console.error("Anonymous sign-in error:", err);
            }
            setLoading(false);
          });
        }
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

  // Subscription Logic
  useEffect(() => {
    if (!profile) return;
    
    // KONTROL Admins and Managers are exempt from subscription requirements
    if (profile.role === 'ADMINISTRATEUR_ERP' || profile.role === 'GESTIONNAIRE_ERP' || profile.role === 'ADMINISTRATEUR_KONTROL' || profile.role === 'GESTIONNAIRE_KONTROL') {
      setIsBlocked(false);
      setShowReminder(null);
      return;
    }

    const checkSubscription = () => {
      // For now, we disable blocking while the payment system is being finalized
      setIsBlocked(false);
      setShowReminder(null);
      return;

      // Original logic (commented out)
      /*
      if (profile.active === false) {
        setIsBlocked(true);
        return;
      }
      ...
      */
    };

    checkSubscription();
  }, [profile]);

  // Action Logging - Login
  useEffect(() => {
    if (profile && !sessionStorage.getItem(`logged_in_${profile.uid}`)) {
      import('../api/firebase').then(({ logAction }) => {
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
    localStorage.removeItem('activeTab');
    localStorage.removeItem('activeSection');
    localStorage.removeItem('activeLabel');
  };

  const handleTabChange = (tab: string, section: string, label: string) => {
    setActiveTab(tab);
    setActiveSection(section);
    setActiveLabel(label);
    localStorage.setItem('activeTab', tab);
    localStorage.setItem('activeSection', section);
    localStorage.setItem('activeLabel', label);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
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
        onTabChange={handleTabChange}
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
              <h2 className="text-2xl font-extrabold text-kontrol-dark mb-2 tracking-tighter">
                {profile?.active === false ? "Compte désactivé" : "Accès restreint"}
              </h2>
              <p className="text-kontrol-ink-muted max-w-md mb-8 font-medium">
                {profile?.active === false 
                  ? "Votre compte entreprise a été supprimé ou désactivé. Veuillez contacter le support si vous pensez qu'il s'agit d'une erreur."
                  : "Votre abonnement KONTROL a expiré. Veuillez renouveler votre forfait pour continuer à accéder à vos outils de gestion."}
              </p>
              {profile?.active !== false && (
                <button 
                  onClick={() => handleTabChange('abonnements', 'Compte', 'Abonnement')}
                  className="btn-primary px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-kontrol-blue/20"
                >
                  Renouveler maintenant
                </button>
              )}
              {profile?.active === false && (
                <button 
                  onClick={handleLogout}
                  className="btn-primary px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-kontrol-blue/20"
                >
                  Déconnexion
                </button>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (isKontrolAdmin ? <ControlTower user={user} profile={profile} /> : <Dashboard user={user} currentUserProfile={profile} />)}
              {activeTab === 'subscriptions' && (isKontrolAdmin ? <ControlTower activeSubTab="subscriptions" user={user} profile={profile} /> : <SubscriptionsModule profile={profile} />)}
              {activeTab === 'revenue' && <ControlTower activeSubTab="revenue" user={user} profile={profile} />}
              {activeTab === 'accounting' && <ControlTower activeSubTab="accounting" user={user} profile={profile} />}
              {activeTab === 'ai_core' && <ControlTower activeSubTab="ai_core" user={user} profile={profile} />}
              {activeTab === 'telemetry' && <ControlTower activeSubTab="telemetry" user={user} profile={profile} />}
              {activeTab === 'audit' && <ControlTower activeSubTab="audit" user={user} profile={profile} />}
              {activeTab === 'tiers' && <TiersModule user={user} currentUserProfile={profile} />}
              {activeTab === 'produits' && <ProduitsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'transactions' && <TransactionsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'charges' && <ChargesModule user={user} currentUserProfile={profile} />}
              {activeTab === 'stocks' && <StocksModule user={user} currentUserProfile={profile} />}
              {activeTab === 'finance' && <FinanceModule user={user} currentUserProfile={profile} />}
              {activeTab === 'ai' && (isKontrolAdmin ? <ControlTower activeSubTab="ai_core" user={user} profile={profile} /> : <BlueAIModule user={user} currentUserProfile={profile} />)}
              {activeTab === 'utilisateurs' && (isKontrolAdmin ? <ControlTower activeSubTab="utilisateurs" user={user} profile={profile} /> : <UsersModule user={user} currentUserProfile={profile} />)}
              {activeTab === 'gestionnaires' && <ControlTower activeSubTab="gestionnaires" user={user} profile={profile} />}
              {activeTab === 'tickets' && (isKontrolAdmin ? <ControlTower activeSubTab="tickets" user={user} profile={profile} /> : <TicketsModule user={user} currentUserProfile={profile} />)}
              {activeTab === 'chat' && user && <KChatModule user={user} profile={profile} />}
              {activeTab === 'entreprises' && (isKontrolAdmin ? <ControlTower activeSubTab="entreprises" user={user} profile={profile} /> : <CompaniesModule />)}
              {activeTab === 'system' && (isKontrolAdmin ? <ControlTower activeSubTab="telemetry" user={user} profile={profile} /> : <SystemModule currentUserProfile={profile} />)}
              {activeTab === 'versions' && (isKontrolAdmin ? <ControlTower activeSubTab="versions" user={user} profile={profile} /> : null)}
              {activeTab === 'updates' && (isKontrolAdmin ? <ControlTower activeSubTab="updates" user={user} profile={profile} /> : null)}
              {activeTab === 'actions' && (isKontrolAdmin ? <ControlTower activeSubTab="audit" user={user} profile={profile} /> : <ActionsModule user={user} currentUserProfile={profile} />)}
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
              <h4 className="text-sm font-extrabold tracking-tight">Renouvellement proche</h4>
              <p className="text-[12px] text-white/60 mt-1 leading-relaxed">
                Votre abonnement expire dans <span className="text-white font-bold">{showReminder.days} jours</span>. Évitez toute interruption de service.
              </p>
              <button 
                onClick={() => handleTabChange('abonnements', 'Compte', 'Abonnement')}
                className="mt-3 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-blue hover:text-white transition-colors"
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

      <Chatbot />
    </div>
  );
}
