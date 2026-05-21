import React from 'react';
import { 
  ChevronDown, 
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { User, db, doc, onSnapshot } from '../../../api/firebase';
import { UserProfile } from '../../types';
import { Logo } from '../common/Logo';
import { ERP_NAV_SECTIONS, COMPANY_NAV_SECTIONS } from '../../constants/navigation';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string, section: string, label: string) => void;
  user: User;
  profile: UserProfile | null;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, user, profile, onLogout, isOpen, setIsOpen }: SidebarProps) {
  const { t } = useTranslation();
  const isKontrolAdmin = profile?.role === 'ADMINISTRATEUR_ERP' || profile?.role === 'GESTIONNAIRE_ERP' || profile?.role === 'ADMIN' || profile?.role === 'ADMINISTRATEUR_KONTROL' || profile?.role === 'GESTIONNAIRE_KONTROL';
  
  const [currentVersion, setCurrentVersion] = React.useState<string>('V3.0.0-PRO');

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setCurrentVersion(snap.data().currentVersion || 'V3.0.0-PRO');
      }
    }, (error) => {
      console.warn("Sidebar: version sync blocked by security or network", error);
    });
    return () => unsub();
  }, []);

  const navSections = isKontrolAdmin ? ERP_NAV_SECTIONS : COMPANY_NAV_SECTIONS;

  const [openSections, setOpenSections] = React.useState<string[]>(
    isKontrolAdmin 
      ? [ERP_NAV_SECTIONS[0].titleKey, ERP_NAV_SECTIONS[1].titleKey] 
      : [COMPANY_NAV_SECTIONS[0].titleKey, COMPANY_NAV_SECTIONS[1].titleKey]
  );

  const toggleSection = (titleKey: string) => {
    setOpenSections(prev => 
      prev.includes(titleKey) ? prev.filter(t => t !== titleKey) : [...prev, titleKey]
    );
  };

  const formatRole = (role?: string) => {
    if (!role) return '';
    const roles: Record<string, string> = {
      'ADMINISTRATEUR_ERP': t('common.roles.admin_kontrol'),
      'GESTIONNAIRE_ERP': t('common.roles.manager_kontrol'),
      'ADMINISTRATEUR_KONTROL': t('common.roles.admin_kontrol'),
      'GESTIONNAIRE_KONTROL': t('common.roles.manager_kontrol'),
      'ADMINISTRATEUR_ENTREPRISE': t('common.roles.admin_company'),
      'GESTIONNAIRE_ENTREPRISE': t('common.roles.manager_company'),
      'UTILISATEUR': t('common.roles.user'),
      'ADMIN': t('common.roles.admin')
    };
    return roles[role] || role.replace('_', ' ');
  };

  const initials = (user.displayName || user.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[199]" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[200] w-[250px] bg-kontrol-dark flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header / Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <Logo companyLogo={profile?.companyLogo} size="sm" className="bg-transparent border-white/10" />
            {profile?.companyName && profile.companyName !== 'KONTROL' && (
              <span className="text-lg font-extrabold text-white tracking-tighter truncate">
                {profile.companyName.replace(' ERP', '')}
              </span>
            )}
          </div>
          <button 
            className="lg:hidden text-white/50 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
          {navSections.map((section) => (
            <div key={section.titleKey} className="mb-1">
              <button
                onClick={() => toggleSection(section.titleKey)}
                className="w-full flex items-center justify-between px-2.5 py-2 text-[10.5px] font-bold text-white/40 uppercase tracking-widest hover:text-white/70 hover:bg-white/5 rounded-lg transition-all"
              >
                <span className="flex items-center gap-2">
                  <section.icon size={14} />
                  {t(section.titleKey)}
                </span>
                <ChevronDown 
                  size={10} 
                  className={cn("transition-transform duration-200", openSections.includes(section.titleKey) ? "rotate-0" : "-rotate-90")} 
                />
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                openSections.includes(section.titleKey) ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id, t(section.titleKey), t(item.labelKey))}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] rounded-lg transition-all mb-0.5 text-left",
                      activeTab === item.id 
                        ? "bg-kontrol-blue/20 text-kontrol-blue font-medium" 
                        : "text-white/55 hover:bg-white/10 hover:text-white/90"
                    )}
                  >
                    <item.icon size={14} className="shrink-0" />
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ERP Admin System Health */}
        {profile?.role === 'ADMINISTRATEUR_ERP' && (
          <div className="px-4 py-3 border-t border-white/10 mt-auto">
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">{t('sections.system')}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-white/40">Database</span>
                  <span className="font-bold text-emerald-400">OK</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-white/40">Auth Service</span>
                  <span className="font-bold text-emerald-400">OK</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer / User */}
        <div className="p-2 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
            <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-kontrol-blue to-kontrol-orange flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-[12.5px] font-medium text-white truncate">{user.displayName || user.email}</p>
              <p className="text-[10.5px] text-white/35 uppercase tracking-tighter">
                {formatRole(profile?.role)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-center">
            <p className="text-[8px] text-white/20 font-bold uppercase tracking-[0.2em]">
              {t('common.powered_by')} <span className="text-kontrol-blue">BLUE AI</span> & <span className="text-kontrol-orange">INNOV'KORP</span>
            </p>
            <p className="text-[8px] text-kontrol-blue/50 font-bold uppercase tracking-[0.2em] mt-1">
              PROD ACTIVE : <span className="text-white bg-kontrol-blue/20 px-1.5 py-0.5 rounded ml-0.5">{currentVersion}</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
