export type TiersType = 'CLIENT' | 'FOURNISSEUR';

export interface Tiers {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  type: TiersType;
  adresse: string;
  statut: 'ACTIF' | 'INACTIF';
  ownerId: string;
  createdAt: number;
}
