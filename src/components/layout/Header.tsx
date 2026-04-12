import React from 'react';
import { Menu, Bell, ChevronDown, UserCircle, Shield, LogOut, Globe } from 'lucide-react';
import { User } from '../../firebase';
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
}

export function Header({ section, page, user, profile, onLogout, onTabChange, toggleSidebar, isSidebarOpen }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

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
          <Logo size="sm" className="bg-transparent border-none" />
          <span className="text-xs font-extrabold text-kontrol-dark tracking-tighter">KONTROL</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-[10px] text-kontrol-ink-muted uppercase font-extrabold tracking-[0.15em] whitespace-nowrap">{section}</span>
          <span className="text-kontrol-border font-light text-xs">/</span>
          <span className="text-[13px] font-extrabold text-kontrol-dark truncate">{page}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-lg hover:bg-kontrol-border transition-colors">
            <Globe size={14} className="text-kontrol-blue" />
            <span className="text-[11px] font-bold uppercase">FR</span>
            <ChevronDown size={10} className="text-kontrol-ink-muted" />
          </button>
          <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-kontrol-border rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110]">
            <button className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-kontrol-bg transition-colors flex items-center justify-between">
              Français <span className="text-[9px] text-kontrol-blue">ACTIF</span>
            </button>
            <button className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-kontrol-bg transition-colors">Wolof</button>
            <button className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-kontrol-bg transition-colors">Fon</button>
            <button className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-kontrol-bg transition-colors">Bambara</button>
          </div>
        </div>

        <div className="hidden sm:block text-[11.5px] text-kontrol-ink-muted px-2.5 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-md whitespace-nowrap">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        
        <NotificationCenter profile={profile} />

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
                  onTabChange('profil', 'Compte', 'Mon profil');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-kontrol-ink-soft hover:bg-kontrol-bg transition-colors"
              >
                <UserCircle size={16} />
                Mon profil
              </button>
              <button 
                onClick={() => {
                  onTabChange('utilisateurs', 'Administration', 'Utilisateurs');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-kontrol-ink-soft hover:bg-kontrol-bg transition-colors"
              >
                <Shield size={16} />
                Utilisateurs
              </button>
              <div className="h-px bg-kontrol-border" />
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
