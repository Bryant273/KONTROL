import { 
  PieChart, 
  Users, 
  Building2, 
  Brain, 
  TrendingUp, 
  CreditCard, 
  Receipt, 
  ArrowLeftRight, 
  Shield, 
  MessageSquare, 
  MessageCircle, 
  Settings, 
  Activity, 
  History, 
  Sparkles, 
  UserCircle,
  LayoutDashboard,
  Box,
  Boxes,
  Bell,
  Wallet as WalletIcon,
  Database,
  FileCheck
} from 'lucide-react';

export interface NavItem {
  id: string;
  labelKey: string;
  icon: any;
}

export interface NavSection {
  titleKey: string;
  icon: any;
  items: NavItem[];
}

export const COMPANY_NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'sections.dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', labelKey: 'common.dashboard', icon: PieChart },
    ]
  },
  {
    titleKey: 'sections.management',
    icon: Box,
    items: [
      { id: 'tiers', labelKey: 'common.tiers', icon: Users },
      { id: 'produits', labelKey: 'common.products', icon: Box },
      { id: 'transactions', labelKey: 'common.transactions', icon: ArrowLeftRight },
      { id: 'finance', labelKey: 'common.finance', icon: WalletIcon },
      { id: 'charges', labelKey: 'common.charges', icon: Receipt },
      { id: 'devis', labelKey: 'common.quotes', icon: FileCheck },
    ]
  },
  {
    titleKey: 'sections.stocks',
    icon: Boxes,
    items: [
      { id: 'stocks', labelKey: 'common.movements', icon: Boxes },
    ]
  },
  {
    titleKey: 'sections.communication',
    icon: MessageSquare,
    items: [
      { id: 'chat', labelKey: 'common.chat', icon: MessageSquare },
      { id: 'tickets', labelKey: 'common.support', icon: MessageCircle },
    ]
  },
  {
    titleKey: 'sections.system',
    icon: Settings,
    items: [
      { id: 'ai', labelKey: 'common.blue_ai', icon: Brain },
      { id: 'notifications', labelKey: 'common.notifications', icon: Bell },
      { id: 'company_hub', labelKey: 'common.company_hub', icon: Building2 },
      { id: 'profil', labelKey: 'common.profile', icon: UserCircle },
      { id: 'abonnements', labelKey: 'common.subscriptions', icon: CreditCard },
      { id: 'actions', labelKey: 'common.actions', icon: History },
      { id: 'data_exchange', labelKey: 'common.data_exchange', icon: Database },
    ]
  }
];
