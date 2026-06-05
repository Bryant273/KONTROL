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
  handleFirestoreError,
  logAction,
  OperationType,
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
import { CompanyProfileModule } from './modules/companies/CompanyProfileModule';
import { CompanyHubModule } from './modules/companies/CompanyHubModule';
import { ProfileModule } from './modules/profile/ProfileModule';
import { ActionsModule } from './modules/actions/ActionsModule';
import { SubscriptionsModule } from './modules/subscriptions/SubscriptionsModule';
import { CompanySetupModal } from './components/auth/CompanySetupModal';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { Chatbot } from './components/common/Chatbot';
import { AppGuideAssistant } from './components/common/AppGuideAssistant';
import { LoadingScreen } from './components/common/LoadingScreen';
import { cn, formatCurrency } from './lib/utils';
import { UserProfile } from './types';
import { AlertTriangle, Clock, X, Loader2 } from 'lucide-react';

import { SystemModule } from './modules/system/SystemModule';
import { KChatModule } from './modules/chat/KChatModule';
import { NotificationsCenterModule } from './modules/system/NotificationsCenterModule';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ERP_NAV_SECTIONS, COMPANY_NAV_SECTIONS } from './constants/navigation';

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('activeSection') || 'Pilotage');
  const [activeLabel, setActiveLabel] = useState(() => localStorage.getItem('activeLabel') || 'Tableau de bord');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [showSetup, setShowSetup] = useState(false);
  const [forceGuide, setForceGuide] = useState(false);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showReminder, setShowReminder] = useState<{ days: number } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const isKontrolAdmin = profile?.role === 'ADMINISTRATEUR_ERP' || profile?.role === 'GESTIONNAIRE_ERP' || profile?.role === 'ADMIN' || profile?.role === 'ADMINISTRATEUR_KONTROL' || profile?.role === 'GESTIONNAIRE_KONTROL';

  // Sync labels when language changes
  useEffect(() => {
    const sections = isKontrolAdmin ? ERP_NAV_SECTIONS : COMPANY_NAV_SECTIONS;
    for (const section of sections) {
      const item = section.items.find(i => i.id === activeTab);
      if (item) {
        setActiveSection(t(section.titleKey));
        setActiveLabel(t(item.labelKey));
        break;
      }
    }
  }, [i18n.language, activeTab, isKontrolAdmin, t]);
  
  // Auth state listener
  useEffect(() => {
    // Safety timeout to ensure loading screen eventually disappears
    const authTimeout = setTimeout(() => {
      console.warn("Auth check timed out. Forcing UI load.");
      setLoading(false);
    }, 20000);

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      clearTimeout(authTimeout);
      if (authUser) {
        setUser(authUser);
        localStorage.removeItem('customUser');
        setLoading(false);
      } else {
        const saved = localStorage.getItem('customUser');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (err) {
            console.warn("Failed to parse saved custom user:", err);
            localStorage.removeItem('customUser');
            setUser(null);
          }
          setLoading(false);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'auth_state', null, false);
      clearTimeout(authTimeout);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  // Profile listener
  useEffect(() => {
    if (!user) return;
    
    if (user.isAnonymous) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
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
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`, user, false);
          setLoading(false);
          clearTimeout(timeout);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, user, false);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user]);

  // Real-time company details synchronization (logo, name, abbreviation)
  useEffect(() => {
    if (!profile?.companyId) return;

    const unsubscribeCompany = onSnapshot(doc(db, 'companies', profile.companyId), (snapshot) => {
      if (snapshot.exists()) {
        const companyData = snapshot.data();
        setProfile(prev => {
          if (!prev) return null;
          if (
            prev.companyLogo !== companyData.logo || 
            prev.companyName !== companyData.name ||
            prev.companyAbbreviation !== companyData.abbreviation
          ) {
            return {
              ...prev,
              companyLogo: companyData.logo || '',
              companyName: companyData.name || prev.companyName || '',
              companyAbbreviation: companyData.abbreviation || prev.companyAbbreviation || ''
            };
          }
          return prev;
        });
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Company sync blocked by security or network:", error);
      }
    });

    return () => unsubscribeCompany();
  }, [profile?.companyId]);

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
      logAction(
        profile.companyId, 
        profile.uid, 
        profile.displayName, 
        'CONNEXION', 
        'L\'utilisateur s\'est connecté à la plateforme'
      ).then(() => {
        sessionStorage.setItem(`logged_in_${profile.uid}`, 'true');
      }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, 'actions', user, false);
      });
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await logout(profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'auth/logout', null, false);
    } finally {
      setUser(null);
      setProfile(null);
      setAuthView('landing');
      localStorage.removeItem('activeTab');
      localStorage.removeItem('activeSection');
      localStorage.removeItem('activeLabel');
      localStorage.removeItem('customUser');
    }
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

  if (!user || user.isAnonymous) {
    if (authView === 'auth') {
      return (
        <div className="min-h-screen bg-kontrol-bg text-kontrol-dark">
          <AuthPage onBack={() => setAuthView('landing')} initialMode={authInitialMode} />
          <Chatbot />
          <Toaster position="top-right" expand={false} richColors />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-kontrol-bg text-kontrol-dark">
        <LandingPage onLoginClick={(mode) => {
          setAuthInitialMode(mode === 'register' ? 'register' : 'login');
          setAuthView('auth');
        }} />
        <Chatbot />
        <Toaster position="top-right" expand={false} richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kontrol-bg flex overflow-hidden">
      {/* REACT SENTINEL - DEBUG ONLY */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-kontrol-blue to-kontrol-orange z-[9999]" />
      
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
        onStartGuide={() => setForceGuide(true)}
        activeTab={activeTab}
      />

      <main className={cn(
        "flex-1 pt-14 h-screen overflow-y-auto transition-all duration-300 ease-in-out",
        isSidebarOpen ? "lg:pl-[250px]" : "pl-0"
      )}>
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          {isBlocked && activeTab !== 'abonnements' && activeTab !== 'subscriptions' ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-kontrol-dark mb-2 tracking-tighter">
                {profile?.active === false ? t('common.blocked.title_deactivated') : t('common.blocked.title_restricted')}
              </h2>
              <p className="text-kontrol-ink-muted max-w-md mb-8 font-medium">
                {profile?.active === false 
                  ? t('common.blocked.desc_deactivated')
                  : t('common.blocked.desc_expired')}
              </p>
              {profile?.active !== false && (
                <button 
                  type="button"
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetTab = isKontrolAdmin ? 'subscriptions' : 'abonnements';
                    const targetSection = isKontrolAdmin ? t('sections.business') : t('sections.system');
                    handleTabChange(targetTab, targetSection, t('common.subscriptions'));
                  }}
                  className="btn-primary px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-kontrol-blue/20 cursor-pointer"
                >
                  {t('common.blocked.renew_now')}
                </button>
              )}
              {profile?.active === false && (
                <button 
                  onClick={handleLogout}
                  className="btn-primary px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-kontrol-blue/20"
                >
                  {t('common.logout')}
                </button>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (isKontrolAdmin ? <ControlTower user={user} profile={profile} /> : <Dashboard user={user} currentUserProfile={profile} onNavigate={handleTabChange} onStartGuide={() => setForceGuide(true)} />)}
              {activeTab === 'subscriptions' && (isKontrolAdmin ? <ControlTower activeSubTab="subscriptions" user={user} profile={profile} /> : <SubscriptionsModule profile={profile} />)}
              {activeTab === 'revenue' && (isKontrolAdmin ? <ControlTower activeSubTab="revenue" user={user} profile={profile} /> : null)}
              {activeTab === 'accounting' && (isKontrolAdmin ? <ControlTower activeSubTab="accounting" user={user} profile={profile} /> : null)}
              {activeTab === 'admin_tiers' && isKontrolAdmin && <ControlTower activeSubTab="admin_tiers" user={user} profile={profile} />}
              {activeTab === 'admin_transactions' && isKontrolAdmin && <ControlTower activeSubTab="admin_transactions" user={user} profile={profile} />}
              {activeTab === 'tiers' && <TiersModule user={user} currentUserProfile={profile} />}
              {activeTab === 'produits' && <ProduitsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'transactions' && <TransactionsModule user={user} currentUserProfile={profile} />}
              {activeTab === 'charges' && <ChargesModule user={user} currentUserProfile={profile} />}
              {activeTab === 'stocks' && <StocksModule user={user} currentUserProfile={profile} />}
              {activeTab === 'finance' && <FinanceModule user={user} currentUserProfile={profile} />}
              {activeTab === 'ai' && (isKontrolAdmin ? <ControlTower activeSubTab="ai" user={user} profile={profile} /> : <BlueAIModule user={user} currentUserProfile={profile} />)}
              {activeTab === 'utilisateurs' && (isKontrolAdmin ? <ControlTower activeSubTab="utilisateurs" user={user} profile={profile} /> : <CompanyHubModule user={user} profile={profile} />)}
              {activeTab === 'gestionnaires' && <ControlTower activeSubTab="gestionnaires" user={user} profile={profile} />}
              {activeTab === 'tickets' && (isKontrolAdmin ? <ControlTower activeSubTab="tickets" user={user} profile={profile} /> : <TicketsModule user={user} currentUserProfile={profile} />)}
              {activeTab === 'chat' && user && <KChatModule user={user} profile={profile} />}
              {activeTab === 'entreprises' && (isKontrolAdmin ? <ControlTower activeSubTab="entreprises" user={user} profile={profile} /> : <CompaniesModule />)}
              {activeTab === 'company_profile' && <CompanyHubModule user={user} profile={profile} />}
              {activeTab === 'company_hub' && <CompanyHubModule user={user} profile={profile} />}
              {activeTab === 'system' && (isKontrolAdmin ? <ControlTower activeSubTab="system" user={user} profile={profile} /> : <SystemModule currentUserProfile={profile} />)}
              {activeTab === 'versions' && (isKontrolAdmin ? <ControlTower activeSubTab="versions" user={user} profile={profile} /> : null)}
              {activeTab === 'updates' && (isKontrolAdmin ? <ControlTower activeSubTab="updates" user={user} profile={profile} /> : null)}
              {activeTab === 'actions' && (isKontrolAdmin ? <ControlTower activeSubTab="actions" user={user} profile={profile} /> : <ActionsModule user={user} currentUserProfile={profile} />)}
              {activeTab === 'abonnements' && <SubscriptionsModule profile={profile} />}
              {activeTab === 'notifications' && <NotificationsCenterModule profile={profile} onNavigate={handleTabChange} />}
              {activeTab === 'profil' && <ProfileModule profile={profile} initialSection="MENU" />}
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
              <h4 className="text-sm font-extrabold tracking-tight">{t('common.reminder.title')}</h4>
              <p className="text-[12px] text-white/60 mt-1 leading-relaxed">
                {t('common.reminder.desc', { days: showReminder.days })}
              </p>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const targetTab = isKontrolAdmin ? 'subscriptions' : 'abonnements';
                  const targetSection = isKontrolAdmin ? t('sections.business') : t('sections.system');
                  handleTabChange(targetTab, targetSection, t('common.subscriptions'));
                }}
                className="mt-3 text-[11px] font-extrabold uppercase tracking-widest text-kontrol-blue hover:text-white transition-colors cursor-pointer"
              >
                {t('common.reminder.action')}
              </button>
            </div>
            <button onClick={() => setShowReminder(null)} className="text-white/30 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <AppGuideAssistant activeTab={activeTab} forceOpen={forceGuide} onCloseForce={() => setForceGuide(false)} />
      <Chatbot profile={profile} />
      <Toaster position="top-right" expand={false} richColors />
    </div>
  );
}
