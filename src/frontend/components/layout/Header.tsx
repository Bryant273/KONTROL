import React from 'react';
import { Menu, Bell, ChevronDown, UserCircle, Shield, LogOut, Globe, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User, db, doc, updateDoc, handleFirestoreError, OperationType } from '../../../api/firebase';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../types';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { Logo } from '../common/Logo';

interface HeaderProps {
  section: string;
  page: string;
  user: User;
  profile: UserProfile | null;
  onLogout: () => void;
  onTabChange: (tab: string, section: string, label: string) => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  onStartGuide?: () => void;
  activeTab?: string;
}

export function Header({ section, page, user, profile, onLogout, onTabChange, toggleSidebar, isSidebarOpen, onStartGuide, activeTab }: HeaderProps) {
  const { i18n, t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err: any) {
      console.warn("Fullscreen toggle failed or blocked:", err.message);
    }
  };

  const isFirstTime = activeTab ? !localStorage.getItem(`kontrol_guide_${activeTab}_seen`) : false;

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      if (user && profile) {
        await updateDoc(doc(db, 'users', user.uid), {
          language: lng
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, user, false);
    }
  };

  React.useEffect(() => {
    if (profile?.language && i18n.language !== profile.language) {
      i18n.changeLanguage(profile.language).catch(err => {
        console.error("[i18n] Failed to sync language from profile:", err);
      });
    }
  }, [profile?.language, i18n]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (user.displayName || user.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const firstName = (user.displayName || user.email || '').split(' ')[0];

  return (
    <header className={cn(
      "fixed top-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-kontrol-border flex items-center px-5 gap-3 z-[100] transition-all duration-300 ease-in-out",
      isSidebarOpen ? "left-[250px]" : "left-0"
    )}>
      <button 
        className="w-[34px] h-[34px] bg-kontrol-bg border border-kontrol-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-kontrol-border transition-colors shrink-0"
        onClick={toggleSidebar}
      >
        <span className={cn("block w-4 h-[2px] bg-kontrol-ink-soft rounded-full transition-all", isSidebarOpen && "rotate-45 translate-y-[6px]")}></span>
        <span className={cn("block w-4 h-[2px] bg-kontrol-ink-soft rounded-full transition-all", isSidebarOpen && "opacity-0")}></span>
        <span className={cn("block w-4 h-[2px] bg-kontrol-ink-soft rounded-full transition-all", isSidebarOpen && "-rotate-45 -translate-y-[6px]")}></span>
      </button>

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className="hidden lg:flex items-center gap-2 pr-4 border-r border-kontrol-border">
          <Logo companyLogo={profile?.companyLogo} size="sm" className="bg-transparent border-none" />
          <span className="text-lg font-extrabold tracking-tighter text-kontrol-dark uppercase">KONTROL</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-hidden">
          {section && section.trim() !== "" && section !== page && (
            <>
              <span className="text-[10px] text-kontrol-ink-muted uppercase font-extrabold tracking-[0.15em] whitespace-nowrap">{section}</span>
              <span className="text-kontrol-border font-light text-xs">/</span>
            </>
          )}
          <span className="text-[13px] font-extrabold text-kontrol-dark truncate">{page}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-lg hover:bg-kontrol-border transition-colors">
            <Globe size={14} className="text-kontrol-blue" />
            <span className="text-[11px] font-bold uppercase">{i18n.language.toUpperCase().slice(0, 2)}</span>
            <ChevronDown size={10} className="text-kontrol-ink-muted" />
          </button>
          <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-kontrol-border rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110]">
            <button 
              onClick={() => changeLanguage('fr')}
              className={cn(
                "w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-kontrol-bg transition-colors flex items-center justify-between",
                i18n.language.startsWith('fr') && "text-kontrol-blue bg-kontrol-blue/5"
              )}
            >
              Français {i18n.language.startsWith('fr') && <span className="text-[9px] text-kontrol-blue">{t('common.active')}</span>}
            </button>
            <button 
              onClick={() => changeLanguage('en')}
              className={cn(
                "w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-kontrol-bg transition-colors flex items-center justify-between",
                i18n.language.startsWith('en') && "text-kontrol-blue bg-kontrol-blue/5"
              )}
            >
              English {i18n.language.startsWith('en') && <span className="text-[9px] text-kontrol-blue">{t('common.active')}</span>}
            </button>
          </div>
        </div>

        <div className="hidden sm:block text-[11.5px] text-kontrol-ink-muted px-2.5 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-md whitespace-nowrap">
          {new Date().toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        <button
          onClick={toggleFullscreen}
          type="button"
          className="flex items-center justify-center w-8 h-8 bg-kontrol-bg border border-kontrol-border rounded-lg hover:bg-kontrol-border transition-colors text-kontrol-ink-soft cursor-pointer active:scale-95"
          title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {isFullscreen ? <Minimize2 size={14} className="text-kontrol-orange animate-[pulse_3s_infinite]" /> : <Maximize2 size={14} className="text-kontrol-blue" />}
        </button>

        {onStartGuide && (
          <div className="relative">
            {isFirstTime && (
              <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-kontrol-blue to-kontrol-orange opacity-75 blur-xs animate-pulse" />
            )}
            <button 
              type="button"
              onClick={onStartGuide}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r hover:from-kontrol-blue/10 hover:to-kontrol-orange/10 border rounded-lg text-[11px] font-extrabold uppercase tracking-widest text-kontrol-dark hover:text-kontrol-blue transition-all group shadow-sm cursor-pointer select-none active:scale-95",
                isFirstTime 
                  ? "from-kontrol-blue/15 to-kontrol-orange/15 border-kontrol-orange/50 text-kontrol-blue font-black animate-[pulse_2.5s_infinite]" 
                  : "from-kontrol-blue/5 to-kontrol-orange/5 border-kontrol-border text-kontrol-dark hover:text-kontrol-blue"
              )}
              title="Lancer le guide interactif de cette page"
            >
              <Sparkles size={13} className={cn("text-kontrol-orange group-hover:scale-110 transition-transform", isFirstTime && "animate-spin-slow")} />
              <span className="hidden sm:inline">Guide Page</span>
              {isFirstTime && (
                <span className="absolute top-0 right-0 -mr-1 -mt-1 w-2.5 h-2.5 bg-kontrol-orange border border-white rounded-full animate-ping" />
              )}
            </button>
          </div>
        )}

        <NotificationCenter profile={profile} onNavigate={onTabChange} />

        <div className="relative" ref={dropdownRef}>
          <button 
            className="flex items-center gap-2 p-1 pr-2.5 border border-kontrol-border rounded-lg hover:bg-kontrol-bg transition-colors"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-kontrol-blue to-kontrol-orange flex items-center justify-center text-[10px] font-bold text-white">
              {initials}
            </div>
            <span className="text-[13px] font-medium text-kontrol-ink hidden md:block">{firstName}</span>
            <ChevronDown size={10} className="text-kontrol-ink-muted" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-kontrol-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="p-3.5 border-b border-kontrol-border bg-kontrol-bg/30">
                <p className="text-[13px] font-bold text-kontrol-dark truncate">{user.displayName || user.email}</p>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 truncate">{user.email}</p>
              </div>
              <button 
                onClick={() => {
                  onTabChange('profil', t('sections.account'), t('common.profile'));
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-kontrol-ink-soft hover:bg-kontrol-bg transition-colors"
              >
                <UserCircle size={16} />
                {t('common.profile')}
              </button>
              <button 
                onClick={() => {
                  onTabChange('utilisateurs', t('sections.system'), t('common.users'));
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-kontrol-ink-soft hover:bg-kontrol-bg transition-colors"
              >
                <Shield size={16} />
                {t('common.users')}
              </button>
              <div className="h-px bg-kontrol-border" />
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
