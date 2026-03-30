export interface Produit {
  id: string;
  reference: string;
  designation: string;
  prixAchat: number;
  prixVente: number;
  stock: number;
  alertStock: number;
  tva: number;
  cump: number; // Coût Unitaire Moyen Pondéré
  ownerId: string;
  createdAt: number;
}

export type MovementType = 'ENTREE' | 'SORTIE';
export type MovementSource = 'INITIAL' | 'TRANSACTION' | 'MANUEL';

export interface StockMovement {
  id: string;
  produitId: string;
  designation: string;
  type: MovementType;
  quantite: number;
  prixUnitaire: number;
  source: MovementSource;
  referenceId?: string; // Transaction ID or "INITIAL"
  date: number;
  ownerId: string;
}
