import { db, collection, getDocs, query, where, doc, getDoc } from '../firebase';

export interface RAGChunk {
  id: string;
  sourceType: 'TRANSACTION' | 'PRODUCT' | 'TIERS' | 'CHARGE' | 'WALLET' | 'COMPANY';
  title: string;
  content: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface RAGIndexResult {
  totalChunks: number;
  breakdown: Record<string, number>;
  indexedAt: number;
}

export class RAGService {
  private calculateTFIDFScore(queryTerms: string[], documentText: string): number {
    const docLower = documentText.toLowerCase();
    let matches = 0;
    
    for (const term of queryTerms) {
      if (term.length <= 2) continue;
      if (docLower.includes(term)) {
        // Frequency boost
        const regex = new RegExp(term, 'gi');
        const count = (docLower.match(regex) || []).length;
        matches += 1 + count * 0.5;
      }
    }
    return matches;
  }

  public extractChunks(companyData: {
    companyInfo?: any;
    transactions?: any[];
    products?: any[];
    charges?: any[];
    tiers?: any[];
    wallets?: any[];
  }): RAGChunk[] {
    const chunks: RAGChunk[] = [];

    // 1. Company Metadata Chunk
    if (companyData.companyInfo) {
      const c = companyData.companyInfo;
      chunks.push({
        id: `chunk_company_${c.id || 'main'}`,
        sourceType: 'COMPANY',
        title: `Fiche Entreprise: ${c.name || c.nom || 'Entreprise'}`,
        content: `Nom: ${c.name || c.nom || 'Entreprise'} | Secteur: ${c.industry || c.secteur || 'Général'} | Plan: ${c.plan || 'KONTROL Pro'} | MRR: ${c.mrr || 0} F CFA`,
        metadata: { id: c.id }
      });
    }

    // 2. Transactions Chunks
    if (Array.isArray(companyData.transactions)) {
      companyData.transactions.forEach((t, idx) => {
        const type = (t.type || 'FLUX').toUpperCase();
        const amount = Number(t.amount || t.montant || 0).toLocaleString('fr-FR');
        const category = t.category || t.categorie || 'Général';
        const partner = t.tiers_nom || t.tiersNom || 'Inconnu';
        const desc = t.description || 'N/A';
        const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Récents';

        chunks.push({
          id: `chunk_trans_${t.id || idx}`,
          sourceType: 'TRANSACTION',
          title: `Transaction [${type}] - ${amount} F CFA`,
          content: `Transaction: Type=${type}, Montant=${amount} F CFA, Catégorie=${category}, Partenaire=${partner}, Description=${desc}, Date=${dateStr}`,
          metadata: { id: t.id, type, amount, category, partner }
        });
      });
    }

    // 3. Products/Stock Chunks
    if (Array.isArray(companyData.products)) {
      companyData.products.forEach((p, idx) => {
        const name = p.nom || p.name || 'Produit sans nom';
        const stock = Number(p.stock || 0);
        const minThreshold = Number(p.min_threshold || 5);
        const price = Number(p.prix_vente || p.price || 0).toLocaleString('fr-FR');
        const category = p.categorie || p.category || 'Général';
        const status = p.status || (stock <= minThreshold ? 'RUPTURE' : 'DISPONIBLE');

        chunks.push({
          id: `chunk_prod_${p.id || idx}`,
          sourceType: 'PRODUCT',
          title: `Produit: ${name} (Stock: ${stock})`,
          content: `Article: ${name} | Catégorie: ${category} | Stock physique: ${stock} unités (Seuil alerte: ${minThreshold}) | Prix de vente: ${price} F CFA | Statut: ${status}`,
          metadata: { id: p.id, name, stock, minThreshold, price }
        });
      });
    }

    // 4. Charges Chunks
    if (Array.isArray(companyData.charges)) {
      companyData.charges.forEach((c, idx) => {
        const title = c.titre || c.title || 'Charge';
        const amount = Number(c.montant || c.amount || 0).toLocaleString('fr-FR');
        const status = c.status || 'En attente';
        const dueDate = c.due_date || c.dueDate || 'N/A';
        const freq = c.frequence || c.frequency || 'Ponctuelle';

        chunks.push({
          id: `chunk_charge_${c.id || idx}`,
          sourceType: 'CHARGE',
          title: `Charge: ${title} (${amount} F CFA)`,
          content: `Obligation/Charge: ${title} | Montant: ${amount} F CFA | Statut: ${status} | Échéance: ${dueDate} | Fréquence: ${freq}`,
          metadata: { id: c.id, title, amount, status }
        });
      });
    }

    // 5. Tiers Chunks
    if (Array.isArray(companyData.tiers)) {
      companyData.tiers.forEach((tr, idx) => {
        const name = tr.nom || tr.name || 'Tiers';
        const type = tr.type || 'Partenaire';
        const balance = Number(tr.solde || 0).toLocaleString('fr-FR');
        const phone = tr.telephone || tr.phone || 'N/A';
        const email = tr.email || 'N/A';

        chunks.push({
          id: `chunk_tiers_${tr.id || idx}`,
          sourceType: 'TIERS',
          title: `Tiers (${type}): ${name}`,
          content: `Partenaire Tiers: Nom=${name}, Type=${type}, Solde courant=${balance} F CFA, Téléphone=${phone}, Email=${email}`,
          metadata: { id: tr.id, name, type, balance }
        });
      });
    }

    // 6. Wallets Chunks
    if (Array.isArray(companyData.wallets)) {
      companyData.wallets.forEach((w, idx) => {
        const name = w.name || w.nom || 'Portefeuille';
        const balance = Number(w.balance || w.solde || 0).toLocaleString('fr-FR');
        const currency = w.currency || 'XOF';

        chunks.push({
          id: `chunk_wallet_${w.id || idx}`,
          sourceType: 'WALLET',
          title: `Portefeuille: ${name}`,
          content: `Compte/Portefeuille: ${name} | Solde disponible: ${balance} ${currency}`,
          metadata: { id: w.id, name, balance }
        });
      });
    }

    return chunks;
  }

  public retrieveRelevantChunks(
    queryText: string,
    companyData: any,
    topK: number = 5
  ): { chunks: RAGChunk[]; totalIndexed: number; summary: string } {
    const allChunks = this.extractChunks(companyData);
    if (allChunks.length === 0) {
      return { chunks: [], totalIndexed: 0, summary: "Index RAG vide (Aucune donnée d'entreprise)." };
    }

    const queryTerms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const scored = allChunks.map(chunk => {
      const score = this.calculateTFIDFScore(queryTerms, chunk.content);
      return { ...chunk, score };
    });

    // Sort descending by score
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Filter chunks with score > 0 or pick topK if all scores are low
    let selected = scored.filter(c => (c.score || 0) > 0).slice(0, topK);
    if (selected.length === 0) {
      selected = scored.slice(0, Math.min(topK, 3));
    }

    const summary = `Indexation RAG: ${allChunks.length} entités analysées. ${selected.length} segments vectoriels pertinents retenus pour la requête.`;

    return {
      chunks: selected,
      totalIndexed: allChunks.length,
      summary
    };
  }
}

export const ragService = new RAGService();
