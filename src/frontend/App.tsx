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
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { TiersModule } from './modules/tiers/TiersModule';
import { ProduitsModule } from './modules/produits/ProduitsModule';
import { TransactionsModule } from './modules/transactions/TransactionsModule';
import { ChargesModule } from './modules/charges/ChargesModule';
import { QuotesModule } from './modules/quotes/QuotesModule';
import { StocksModule } from './modules/stocks/StocksModule';
import { FinanceModule } from './modules/finance/FinanceModule';
import { BlueAIModule } from './modules/blue/BlueAIModule';
import { TicketsModule } from './modules/tickets/TicketsModule';
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

import { KChatModule } from './modules/chat/KChatModule';
import { NotificationsCenterModule } from './modules/system/NotificationsCenterModule';
import { DataExchangeModule } from './modules/system/DataExchangeModule';
import { SignatureModule } from './modules/system/SignatureModule';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { COMPANY_NAV_SECTIONS } from './constants/navigation';
import { VersionDetailsModal } from './components/common/VersionDetailsModal';
import { SubscriptionContractModal } from './components/subscription/SubscriptionContractModal';

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('kontrol_profile_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [updateVersionData, setUpdateVersionData] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('activeSection') || 'Pilotage');
  const [activeLabel, setActiveLabel] = useState(() => localStorage.getItem('activeLabel') || 'Tableau de bord');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [showSetup, setShowSetup] = useState(false);
  const [showContractPopup, setShowContractPopup] = useState(false);
  const [forceGuide, setForceGuide] = useState(false);

  // Auto show subscription contract modal after company setup or on login if not signed
  useEffect(() => {
    if (profile && profile.isProfileComplete && !profile.contractSignedAt && !showSetup) {
      setShowContractPopup(true);
    } else {
      setShowContractPopup(false);
    }
  }, [profile, showSetup]);

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

  // Listen for global system update detail popovers
  useEffect(() => {
    const handleShowUpdateDetails = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setUpdateVersionData(detail);
        setIsUpdateModalOpen(true);
      }
    };
    window.addEventListener('show-version-update-details', handleShowUpdateDetails);
    return () => {
      window.removeEventListener('show-version-update-details', handleShowUpdateDetails);
    };
  }, []);
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  // Sync labels when language changes
  useEffect(() => {
    const sections = COMPANY_NAV_SECTIONS;
    for (const section of sections) {
      const item = section.items.find(i => i.id === activeTab);
      if (item) {
        setActiveSection(t(section.titleKey));
        setActiveLabel(t(item.labelKey));
        break;
      }
    }
  }, [i18n.language, activeTab, t]);
  
  // Auth state listener
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { tab, section, label } = customEvent.detail;
        handleTabChange(tab, section || 'Administration', label || 'Abonnements');
      }
    };
    window.addEventListener('app-navigate', handleNavigate);

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
        localStorage.setItem('kontrol_profile_cache', JSON.stringify(profileData));
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
            const updated = {
              ...prev,
              companyLogo: companyData.logo || '',
              companyName: companyData.name || prev.companyName || '',
              companyAbbreviation: companyData.abbreviation || prev.companyAbbreviation || ''
            };
            localStorage.setItem('kontrol_profile_cache', JSON.stringify(updated));
            return updated;
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

  const [companyHubSubTab, setCompanyHubSubTab] = useState<'profile' | 'team'>('profile');

  const handleTabChange = (tab: string, section: string, label: string, subTab?: 'profile' | 'team') => {
    let targetTab = tab;
    if (tab === 'utilisateurs') {
      targetTab = 'company_hub';
      setCompanyHubSubTab('team');
    } else if (subTab) {
      setCompanyHubSubTab(subTab);
    } else if (tab === 'company_hub') {
      setCompanyHubSubTab('profile');
    }

    setActiveTab(targetTab);
    setActiveSection(section);
    setActiveLabel(label);
    localStorage.setItem('activeTab', targetTab);
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
          {activeTab === 'dashboard' && <Dashboard user={user} currentUserProfile={profile} onNavigate={handleTabChange} onStartGuide={() => setForceGuide(true)} />}
          {activeTab === 'tiers' && <TiersModule user={user} currentUserProfile={profile} />}
          {activeTab === 'produits' && <ProduitsModule user={user} currentUserProfile={profile} />}
          {activeTab === 'transactions' && <TransactionsModule user={user} currentUserProfile={profile} />}
          {activeTab === 'charges' && <ChargesModule user={user} currentUserProfile={profile} />}
          {activeTab === 'devis' && user && <QuotesModule user={user} currentUserProfile={profile} />}
          {activeTab === 'stocks' && <StocksModule user={user} currentUserProfile={profile} />}
          {activeTab === 'finance' && <FinanceModule user={user} currentUserProfile={profile} />}
          {activeTab === 'ai' && <BlueAIModule user={user} currentUserProfile={profile} />}
          {activeTab === 'chat' && user && <KChatModule user={user} profile={profile} />}
          {activeTab === 'tickets' && <TicketsModule user={user} currentUserProfile={profile} />}
          {activeTab === 'company_hub' && <CompanyHubModule user={user} profile={profile} initialSubTab={companyHubSubTab} />}
          {activeTab === 'company_profile' && <CompanyHubModule user={user} profile={profile} initialSubTab="profile" />}
          {activeTab === 'abonnements' && <SubscriptionsModule profile={profile} />}
          {activeTab === 'notifications' && <NotificationsCenterModule profile={profile} onNavigate={handleTabChange} />}
          {activeTab === 'profil' && <ProfileModule profile={profile} initialSection="MENU" />}
          {activeTab === 'signature' && <SignatureModule profile={profile} onProfileUpdate={setProfile} />}
          {activeTab === 'actions' && <ActionsModule user={user} currentUserProfile={profile} />}
          {activeTab === 'data_exchange' && <DataExchangeModule currentUserProfile={profile} />}
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

      <AppGuideAssistant activeTab={activeTab} forceOpen={forceGuide} onCloseForce={() => setForceGuide(false)} />
      <Chatbot profile={profile} />
      <Toaster position="top-right" expand={false} richColors />
      
      <VersionDetailsModal 
        version={updateVersionData} 
        isOpen={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)} 
      />

      <SubscriptionContractModal 
        profile={profile}
        isOpen={showContractPopup}
        onClose={() => setShowContractPopup(false)}
        onSigned={(updated) => setProfile(updated)}
        isMandatoryPopup={true}
      />
    </div>
  );
}
