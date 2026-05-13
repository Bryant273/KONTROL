export type UserRole = 
  | 'ADMIN' 
  | 'ADMINISTRATEUR_ERP' 
  | 'GESTIONNAIRE_ERP' 
  | 'ADMINISTRATEUR_KONTROL'
  | 'GESTIONNAIRE_KONTROL'
  | 'ADMINISTRATEUR_ENTREPRISE' 
  | 'GESTIONNAIRE_ENTREPRISE' 
  | 'UTILISATEUR';

export type TiersType = 'CLIENT' | 'FOURNISSEUR';

export interface UserProfile {
  uid: string;
  id?: string; // Some code uses id
  email: string;
  displayName: string;
  role: UserRole;
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  logoUrl?: string;
  isProfileComplete: boolean;
  active: boolean;
  isDemo?: boolean;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  subscriptionTier?: 'STANDARD' | 'PRO' | 'ENTERPRISE';
  subscriptionEndDate?: number;
  autoConvertToSubscriber?: boolean;
  lastLogin?: number;
  createdAt: number;
  password?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  currency?: string;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  email: string;
  phone?: string;
  address?: string;
  sector?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  subscriptionTier: 'STANDARD' | 'PRO' | 'ENTERPRISE' | 'BASIC';
  isDemo?: boolean;
  subscriptionEndDate?: number;
  autoConvertToSubscriber?: boolean;
  createdAt: number;
}

export interface Transaction {
  id: string;
  type: 'VENTE' | 'ACHAT';
  companyId?: string;
  ownerId?: string; // Some code uses ownerId
  tiersId: string;
  tiersNom: string;
  montant?: number;
  montantTotal?: number; // Some code uses montantTotal
  date: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  statut: 'PAYE' | 'ATTENTE' | 'ANNULE'; 
  description: string;
  articles: any[];
  paymentMethod: string;
  modePaiement?: string; // Some code uses modePaiement
  reference?: string;
  invoiceFileUrl?: string;
  devise?: string;
  tauxChange?: number;
  montantDevise?: number;
  createdAt: number;
}

export interface Tiers {
  id: string;
  name?: string;
  nom?: string; // Some code uses nom
  type: 'CLIENT' | 'FOURNISSEUR';
  email?: string;
  phone?: string;
  telephone?: string; // Some code uses telephone
  address?: string;
  adresse?: string; // Some code uses adresse
  companyId?: string;
  status?: string;
  statut?: 'ACTIF' | 'INACTIF';
  createdAt: number;
}

export interface Produit {
  id: string;
  name?: string;
  designation?: string; // Some code uses designation
  description?: string;
  price?: number;
  prixVente?: number; // Some code uses prixVente
  purchasePrice?: number;
  prixAchat?: number; // Some code uses prixAchat
  stock: number;
  category?: string;
  companyId?: string;
  ownerId?: string; // Some code uses ownerId
  tva?: number;
  alertStock?: number;
  cump?: number;
  reference?: string;
  createdAt: number;
}

export interface Charge {
  id: string;
  companyId?: string;
  ownerId?: string; // Some code uses ownerId
  description: string;
  montant: number;
  category?: string;
  categorie?: string; // Some code uses categorie
  date: number;
  modePaiement?: string;
  justificatifUrl?: string;
  devise?: string;
  createdAt: number;
  isSystemGenerated?: boolean;
}

export interface Wallet {
  id: string;
  companyId: string;
  name: string;
  balance: number;
  type: 'CASH' | 'BANK' | 'MOBILE_MONEY';
  createdAt: number;
  walletId?: string; // Some code uses walletId
}

export interface Payment {
  id: string;
  ownerId: string;
  amount: number;
  montant: number;
  type: 'ENCAISSEMENT' | 'DECAISSEMENT';
  date: number;
  modePaiement: string;
  description: string;
  tiersNom?: string;
  walletId?: string;
  createdAt: number;
}

export interface Ticket {
  id: string;
  userId?: string;
  companyId?: string;
  subject: string;
  message: string;
  email: string;
  name: string;
  status: 'NEW' | 'PENDING' | 'RESOLVED' | 'OPEN' | 'CLOSED';
  createdAt: number;
  replies?: any[];
}

export interface StockMovement {
  id: string;
  productId: string;
  produitId?: string; // Some code uses produitId
  type: 'IN' | 'OUT' | 'ENTREE' | 'SORTIE';
  quantity: number;
  quantite?: number; // Some code uses quantite
  reason: string;
  date: number;
  companyId: string;
  createdAt: number;
  designation?: string;
  prixUnitaire?: number;
  source?: string;
}
