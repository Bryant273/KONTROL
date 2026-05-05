import React from 'react';
import { 
  ChevronDown, 
  PieChart, 
  Users, 
  Box, 
  ArrowLeftRight, 
  Receipt, 
  History, 
  UserCircle, 
  Shield, 
  LogOut,
  X,
  Bell,
  LayoutDashboard,
  Boxes,
  Settings,
  CreditCard,
  MessageCircle,
  MessageSquare,
  Building2,
  Brain,
  TrendingUp,
  Activity,
  Wallet as WalletIcon,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from '../../../api/firebase';
import { UserProfile } from '../../types';
import { Logo } from '../common/Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string, section: string, label: string) => void;
  user: User;
  profile: UserProfile | null;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  items: { id: string; label: string; icon: React.ElementType }[];
}

const erpNavSections: NavSection[] = [
  {
    title: 'Command Center',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Vue d\'ensemble', icon: PieChart },
    ]
  },
  {
    title: 'Supervision Écosystème',
    icon: Building2,
    items: [
      { id: 'entreprises', label: 'Parc Entreprises', icon: Building2 },
      { id: 'utilisateurs', label: 'Utilisateurs Globaux', icon: Users },
      { id: 'ai', label: 'Intelligence Blue AI', icon: Brain },
    ]
  },
  {
    title: 'Pilotage Business KONTROL',
    icon: TrendingUp,
    items: [
      { id: 'revenue', label: 'Croissance & MRR', icon: TrendingUp },
      { id: 'subscriptions', label: 'Validation Paiements', icon: CreditCard },
      { id: 'admin_tiers', label: 'Partenaires & Tiers', icon: Users },
      { id: 'accounting', label: 'Trésorerie Centrale', icon: Receipt },
      { id: 'admin_transactions', label: 'Journal des Ventes', icon: ArrowLeftRight },
    ]
  },
  {
    title: 'Coordination & Équipe',
    icon: Shield,
    items: [
      { id: 'gestionnaires', label: 'Team KONTROL', icon: Shield },
      { id: 'chat', label: 'K-Chat Interne', icon: MessageSquare },
      { id: 'tickets', label: 'Tickets Support', icon: MessageCircle },
    ]
  },
  {
    title: 'Maintenance & Audit',
    icon: Settings,
    items: [
      { id: 'system', label: 'Stats & Télémétrie', icon: Activity },
      { id: 'actions', label: 'Audit Trail', icon: History },
      { id: 'versions', label: 'Déploiements', icon: History },
      { id: 'updates', label: 'Modèles IA', icon: Sparkles },
    ]
  },
  {
    title: 'Mon Compte',
    icon: UserCircle,
    items: [
      { id: 'profil', label: 'Profil Admin', icon: UserCircle },
    ]
  }
];

const companyNavSections: NavSection[] = [
  {
    title: 'Pilotage',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: PieChart },
    ]
  },
  {
    title: 'Gestion',
    icon: Box,
    items: [
      { id: 'tiers', label: 'Tiers', icon: Users },
      { id: 'produits', label: 'Produits', icon: Box },
      { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
      { id: 'finance', label: 'Trésorerie', icon: WalletIcon },
      { id: 'charges', label: 'Charges diverses', icon: Receipt },
    ]
  },
  {
    title: 'Stocks',
    icon: Boxes,
    items: [
      { id: 'stocks', label: 'Mouvements', icon: Boxes },
    ]
  },
  {
    title: 'Communication',
    icon: MessageSquare,
    items: [
      { id: 'chat', label: 'K-Chat', icon: MessageSquare },
      { id: 'tickets', label: 'Support Technique', icon: MessageCircle },
    ]
  },
  {
    title: 'Système',
    icon: Settings,
    items: [
      { id: 'ai', label: 'Blue AI', icon: Brain },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'company_profile', label: 'Profil Entreprise', icon: Building2 },
      { id: 'profil', label: 'Mon profil', icon: UserCircle },
      { id: 'abonnements', label: 'Abonnement', icon: CreditCard },
      { id: 'utilisateurs', label: 'Utilisateurs', icon: Users },
      { id: 'actions', label: 'Journal des actions', icon: History },
    ]
  }
];

export function Sidebar({ activeTab, setActiveTab, user, profile, onLogout, isOpen, setIsOpen }: SidebarProps) {
  const isKontrolAdmin = profile?.role === 'ADMINISTRATEUR_ERP' || profile?.role === 'GESTIONNAIRE_ERP' || profile?.role === 'ADMIN' || profile?.role === 'ADMINISTRATEUR_KONTROL' || profile?.role === 'GESTIONNAIRE_KONTROL';
  const navSections = isKontrolAdmin ? erpNavSections : companyNavSections;

  const [openSections, setOpenSections] = React.useState<string[]>(
    isKontrolAdmin 
      ? [erpNavSections[0].title, erpNavSections[1].title] 
      : [companyNavSections[0].title, companyNavSections[1].title]
  );

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const formatRole = (role?: string) => {
    if (!role) return '';
    const roles: Record<string, string> = {
      'ADMINISTRATEUR_ERP': 'Administrateur KONTROL',
      'GESTIONNAIRE_ERP': 'Gestionnaire KONTROL',
      'ADMINISTRATEUR_KONTROL': 'Administrateur KONTROL',
      'GESTIONNAIRE_KONTROL': 'Gestionnaire KONTROL',
      'ADMINISTRATEUR_ENTREPRISE': 'Administrateur Entreprise',
      'GESTIONNAIRE_ENTREPRISE': 'Gestionnaire Entreprise',
      'UTILISATEUR': 'Utilisateur',
      'ADMIN': 'Administrateur'
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
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navSections.map((section) => (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-2.5 py-2 text-[10.5px] font-bold text-white/40 uppercase tracking-widest hover:text-white/70 hover:bg-white/5 rounded-lg transition-all"
              >
                <span className="flex items-center gap-2">
                  <section.icon size={14} />
                  {section.title}
                </span>
                <ChevronDown 
                  size={10} 
                  className={cn("transition-transform duration-200", openSections.includes(section.title) ? "rotate-0" : "-rotate-90")} 
                />
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                openSections.includes(section.title) ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id, section.title, item.label)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] rounded-lg transition-all mb-0.5",
                      activeTab === item.id 
                        ? "bg-kontrol-blue/20 text-kontrol-blue font-medium" 
                        : "text-white/55 hover:bg-white/70 hover:text-white/90"
                    )}
                  >
                    <item.icon size={14} className="shrink-0" />
                    {item.label}
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
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">Santé Système</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-white/40">Base de données</span>
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
              Propulsé par <span className="text-kontrol-blue">BLUE AI</span> & <span className="text-kontrol-orange">INNOV'KORP</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
