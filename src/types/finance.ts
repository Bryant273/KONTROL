export type TransactionType = 'VENTE' | 'ACHAT';
export type TransactionStatut = 'PAYE' | 'ATTENTE' | 'ANNULE';

export interface TransactionLine {
  produitId: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Transaction {
  id: string;
  reference: string;
  date: number;
  type: TransactionType;
  tiersId: string;
  tiersNom: string;
  montantTotal: number;
  devise: string;
  statut: TransactionStatut;
  modePaiement: string;
  articles: TransactionLine[];
  ownerId: string;
  createdAt: number;
}

export interface Charge {
  id: string;
  date: number;
  description: string;
  categorie: string;
  montant: number;
  devise: string;
  modePaiement: string;
  justificatifUrl?: string;
  ownerId: string;
  createdAt: number;
}

export interface Wallet {
  id: string;
  nom: string;
  type: 'CASH' | 'BANK' | 'MOBILE_MONEY';
  solde: number;
  devise: string;
  ownerId: string;
  createdAt: number;
}

export interface Payment {
  id: string;
  date: number;
  montant: number;
  type: 'ENCAISSEMENT' | 'DECAISSEMENT';
  modePaiement: string;
  walletId?: string;
  transactionId?: string;
  chargeId?: string;
  tiersId?: string;
  tiersNom?: string;
  description: string;
  ownerId: string;
  createdAt: number;
}
