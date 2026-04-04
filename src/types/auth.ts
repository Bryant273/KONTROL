export type UserRole = 
  | 'ADMINISTRATEUR_ERP' 
  | 'GESTIONNAIRE_ERP' 
  | 'ADMINISTRATEUR_ENTREPRISE' 
  | 'GESTIONNAIRE_ENTREPRISE';

export interface UserProfile {
  uid: string;
  id?: string;
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  companyId?: string;
  companyName?: string;
  companyLogo?: string;
  logoUrl?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  currency?: string;
  language?: string;
  active?: boolean;
  subscriptionStatus?: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'none';
  subscriptionEndDate?: number;
  isProfileComplete: boolean;
  lastLogin?: number;
  createdAt: number;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  manager: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: number;
  subscriptionEndDate?: number;
  userCount: number;
}
