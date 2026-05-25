import * as XLSX from 'xlsx';

export interface TemplateColumn {
  key: string;
  label: string;
  description: string;
  example: string;
}

export const MODULE_TEMPLATES: Record<string, { filename: string; columns: TemplateColumn[] }> = {
  tiers: {
    filename: 'KONTROL_Modele_Import_Recurrence_Tiers.xlsx',
    columns: [
      { key: 'nom', label: 'Nom Complet', description: 'Nom de l\'entreprise ou personne (requis)', example: 'SOCIETE IVOIRIENNE DISTRIBUTION' },
      { key: 'email', label: 'Email', description: 'Adresse email valide', example: 'distrib@example.ci' },
      { key: 'telephone', label: 'Téléphone', description: 'Numéro de téléphone complet avec indicatif', example: '+2250700000000' },
      { key: 'type', label: 'Type', description: 'CLIENT ou FOURNISSEUR', example: 'CLIENT' },
      { key: 'adresse', label: 'Adresse', description: 'Adresse postale ou localisation', example: 'Abidjan Cocody, Rue de la Paix' },
      { key: 'statut', label: 'Statut', description: 'ACTIF ou INACTIF', example: 'ACTIF' }
    ]
  },
  charges: {
    filename: 'KONTROL_Modele_Import_Charges.xlsx',
    columns: [
      { key: 'description', label: 'Description', description: 'Libellé de la dépense (requis)', example: 'Facture CIE Avril 2026' },
      { key: 'categorie', label: 'Catégorie', description: 'Loyer, Électricité, Eau, Internet, Salaires, Transport, Marketing, Autres', example: 'Électricité' },
      { key: 'montant', label: 'Montant', description: 'Valeur numérique positive', example: '45000' },
      { key: 'modePaiement', label: 'Mode Paiement', description: 'Espèces, Banque / Carte, Paiement Mobile', example: 'Paiement Mobile' },
      { key: 'date', label: 'Date', description: 'Format AAAA-MM-JJ', example: '2026-05-15' }
    ]
  },
  transactions: {
    filename: 'KONTROL_Modele_Import_Transactions.xlsx',
    columns: [
      { key: 'reference', label: 'Référence', description: 'Code de facture ou transaction unique', example: 'FAC-2026-0091' },
      { key: 'date', label: 'Date', description: 'Format AAAA-MM-JJ', example: '2026-05-20' },
      { key: 'tiers', label: 'Tiers / Contact', description: 'Nom complet du client ou fournisseur', example: 'Amadou Diallo' },
      { key: 'type', label: 'Type', description: 'VENTE ou ACHAT', example: 'VENTE' },
      { key: 'montantTotal', label: 'Montant Total', description: 'Montant de la facture', example: '125000' },
      { key: 'statut', label: 'Statut', description: 'PAYE, ATTENTE, ANNULE', example: 'PAYE' },
      { key: 'modePaiement', label: 'Mode Paiement', description: 'Espèces, Banque / Carte, Paiement Mobile', example: 'Espèces' }
    ]
  },
  stocks_movements: {
    filename: 'KONTROL_Modele_Mouvements_Stock.xlsx',
    columns: [
      { key: 'designation', label: 'Désignation', description: 'Nom du produit (Recherche automatique de correspondance)', example: 'Huile Dinor 1L' },
      { key: 'quantite', label: 'Quantité', description: 'Quantité du mouvement (positif)', example: '50' },
      { key: 'type', label: 'Type', description: 'ENTREE, SORTIE, AJUSTEMENT', example: 'ENTREE' },
      { key: 'prixUnitaire', label: 'Prix Unitaire', description: 'Prix d\'achat ou CUMP', example: '950' },
      { key: 'source', label: 'Source', description: 'Origine de la marchandise / Ajustement', example: 'Livraison Distributeur' },
      { key: 'date', label: 'Date', description: 'Format AAAA-MM-JJ', example: '2026-05-24' }
    ]
  },
  stocks_inventory: {
    filename: 'KONTROL_Modele_Mise_A_Jour_Inventaire.xlsx',
    columns: [
      { key: 'reference', label: 'Référence Produit', description: 'Code ou référence unique de l\'article (requis)', example: 'PROD-HUI-01' },
      { key: 'stock', label: 'Nouveau Stock', description: 'Quantité physique exacte en magasin', example: '120' }
    ]
  },
  users: {
    filename: 'KONTROL_Modele_Import_Utilisateurs.xlsx',
    columns: [
      { key: 'nom', label: 'Nom Complet', description: 'Prénom et nom de l\'utilisateur', example: 'Kouassi Kouamé' },
      { key: 'email', label: 'Email', description: 'Adresse mail unique de connexion', example: 'k.kouame@entreprise.ci' },
      { key: 'role', label: 'Rôle', description: 'ADMINISTRATEUR_ENTREPRISE, GESTIONNAIRE_ENTREPRISE, UTILISATEUR', example: 'GESTIONNAIRE_ENTREPRISE' },
      { key: 'motDePasse', label: 'Mot de Passe', description: 'Mot de passe initial (Min. 6 caractères)', example: 'SecuPass2026!' }
    ]
  },
  finance: {
    filename: 'KONTROL_Modele_Import_Mouvements_Tresorerie.xlsx',
    columns: [
      { key: 'description', label: 'Description', description: 'Libellé de la transaction (requis)', example: 'Encaissement commande #4092' },
      { key: 'montant', label: 'Montant', description: 'Montant numérique positif', example: '350000' },
      { key: 'type', label: 'Type Mouvement', description: 'ENCAISSEMENT ou DECAISSEMENT', example: 'ENCAISSEMENT' },
      { key: 'modePaiement', label: 'Mode de Règlement', description: 'Espèces, Banque / Carte, Paiement Mobile', example: 'Banque / Carte' },
      { key: 'date', label: 'Date', description: 'Format AAAA-MM-JJ', example: '2026-05-22' },
      { key: 'tiers', label: 'Partenaire / Tiers', description: 'Nom complet du tiers impliqué (optionnel)', example: 'SOCIETE BENEDICT' }
    ]
  },
  produits: {
    filename: 'KONTROL_Modele_Import_Produits.xlsx',
    columns: [
      { key: 'reference', label: 'Référence', description: 'Référence unique du produit (requis)', example: 'PRO-CAFE-100G' },
      { key: 'designation', label: 'Désignation', description: 'Nom de l\'article (requis)', example: 'Café soluble 100g' },
      { key: 'categorie', label: 'Catégorie', description: 'Catégorie de produit', example: 'Alimentation générale' },
      { key: 'prixAchat', label: 'Prix Achat', description: 'Prix unitaire d\'achat', example: '1200' },
      { key: 'prixVente', label: 'Prix Vente', description: 'Prix unitaire de vente', example: '1500' },
      { key: 'stock', label: 'Stock Initial', description: 'Quantité de départ en stock', example: '250' },
      { key: 'stockAlerte', label: 'Stock Alerte', description: 'Seuil minimum d\'alerte', example: '20' }
    ]
  }
};

export const downloadModuleTemplate = (moduleKey: string) => {
  const model = MODULE_TEMPLATES[moduleKey];
  if (!model) {
    console.error(`Pas de modèle trouvé pour le module ${moduleKey}`);
    return;
  }

  // Row 1: Headers (label name)
  // Row 2: Explanations/Descriptions
  // Row 3: Live Example
  const headers = model.columns.map(c => c.label);
  const descriptions = model.columns.map(c => c.description);
  const examples = model.columns.map(c => c.example);

  const sheetData = [
    headers,
    descriptions,
    examples
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto column widths
  const colWidths = model.columns.map((c, i) => {
    const maxLen = Math.max(c.label.length, c.description.length, c.example.length);
    return { wch: Math.min(Math.max(maxLen, 12), 45) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fiche de Remplissage");

  XLSX.writeFile(wb, model.filename);
};

/**
 * Filtre et supprime les lignes d'explications/descriptions
 * et les lignes d'exemples fournies dans les modèles Excel KONTROL.
 * Évite de filtrer par erreur des lignes de données réelles par une logique d'exact-match.
 */
export function cleanImportedRows(moduleKey: string, data: any[]): any[] {
  const model = MODULE_TEMPLATES[moduleKey];
  if (!model || !Array.isArray(data) || data.length === 0) return data;

  const lowercaseDescriptions = model.columns.map(c => c.description.toLowerCase().trim());

  return data.filter(row => {
    if (!row || typeof row !== 'object') return false;

    // Récupérer toutes les valeurs de cellules de la ligne
    const values = Object.values(row)
      .map(v => String(v || '').trim())
      .filter(Boolean);

    if (values.length === 0) return false;

    // Une ligne est une ligne de description/explication si plusieurs de ses cellules correspondent aux descriptions
    let descMatches = 0;
    for (const val of values) {
      const lowerVal = val.toLowerCase();
      // On cherche si la valeur de la cellule correspond exactement ou est extrêmement proche d'une description du modèle
      const isDesc = lowercaseDescriptions.some(desc => lowerVal === desc || (desc.includes(lowerVal) && lowerVal.length > 12));
      if (isDesc) {
        descMatches++;
      }
    }

    // Si on détecte au moins 2 correspondances de descriptions, c'est une ligne d'explications/instruction à sauter
    const isDescriptionRow = descMatches >= Math.min(2, model.columns.length);

    if (isDescriptionRow) {
      return false; // On l'ignore
    }

    return true; // On garde tout le reste (y compris les lignes d'exemples valides pour tester !)
  });
}

/**
 * Parses dates robustly from Excel files, supporting French DD/MM/YYYY formats,
 * standard date structures, and Excel Serial dates correctly.
 */
export function parseExcelDate(val: any): number {
  if (val === undefined || val === null || val === '') {
    return Date.now();
  }

  const strVal = String(val).trim();
  if (!strVal) return Date.now();

  // 1. Try parsing as normal positive number (Excel Serial Date format)
  const numVal = Number(strVal);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 100000) {
    const utc_days = Math.floor(numVal - 25569);
    return utc_days * 86400 * 1000;
  }

  // 2. Try French format DD/MM/YYYY or DD-MM-YYYY (eg 25/05/2026 or 25-05-2026)
  const frRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
  const match = strVal.match(frRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed in JS Date
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const dt = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(dt.getTime())) {
      return dt.getTime();
    }
  }

  // 3. Try standard Date parsing (YYYY-MM-DD, ISO, etc.)
  const parsed = Date.parse(strVal);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return Date.now();
}

/**
 * Checks if a string or value is a valid parseable date (standard, French, or Excel serial).
 */
export function isValidExcelDate(val: any): boolean {
  if (val === undefined || val === null || val === '') {
    return false;
  }

  const strVal = String(val).trim();
  if (!strVal) return false;

  // 1. Excel Serial
  const numVal = Number(strVal);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 100000) {
    return true;
  }

  // 2. French format
  const frRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
  if (frRegex.test(strVal)) {
    const match = strVal.match(frRegex)!;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const dt = new Date(year, month, day);
    return !isNaN(dt.getTime());
  }

  // 3. Standard
  const parsed = Date.parse(strVal);
  return !isNaN(parsed);
}

