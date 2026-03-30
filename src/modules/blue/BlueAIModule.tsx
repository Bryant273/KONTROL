import React from 'react';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Calendar,
  Zap,
  BrainCircuit,
  BarChart3
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  User 
} from '../../firebase';
import { UserProfile, Transaction, Charge, Produit } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import Markdown from 'react-markdown';

interface BlueAIModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function BlueAIModule({ user, currentUserProfile }: BlueAIModuleProps) {
  const [loading, setLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{
    revenue: number;
    expenses: number;
    profit: number;
    topProducts: { name: string; qty: number }[];
    stockValue: number;
  } | null>(null);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Gather Data
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const companyId = currentUserProfile?.companyId || user.uid;

      // Transactions
      const transSnap = await getDocs(query(
        collection(db, 'transactions'),
        where('ownerId', '==', companyId),
        where('date', '>=', firstDayOfMonth)
      ));
      const transactions = transSnap.docs.map(doc => doc.data() as Transaction);

      // Charges
      const chargesSnap = await getDocs(query(
        collection(db, 'charges'),
        where('ownerId', '==', companyId),
        where('date', '>=', firstDayOfMonth)
      ));
      const charges = chargesSnap.docs.map(doc => doc.data() as Charge);

      // Products
      const prodSnap = await getDocs(query(
        collection(db, 'produits'),
        where('ownerId', '==', companyId)
      ));
      const produits = prodSnap.docs.map(doc => doc.data() as Produit);

      // 2. Calculate Stats
      const revenue = transactions.filter(t => t.type === 'VENTE').reduce((acc, t) => acc + t.montantTotal, 0);
      const purchases = transactions.filter(t => t.type === 'ACHAT').reduce((acc, t) => acc + t.montantTotal, 0);
      const expenses = charges.reduce((acc, c) => acc + c.montant, 0) + purchases;
      const profit = revenue - expenses;
      const stockValue = produits.reduce((acc, p) => acc + (p.stock * (p.cump || p.prixAchat)), 0);

      // Top Products (simple count)
      const productCounts: Record<string, number> = {};
      transactions.filter(t => t.type === 'VENTE').forEach(t => {
        t.articles.forEach(art => {
          productCounts[art.designation] = (productCounts[art.designation] || 0) + art.quantite;
        });
      });
      const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, qty]) => ({ name, qty }));

      setStats({ revenue, expenses, profit, topProducts, stockValue });

      // 3. Call Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        En tant qu'expert en gestion d'entreprise (ERP), analyse les performances de l'entreprise "${currentUserProfile?.companyName}" pour le mois en cours.
        Ne te présente pas, va directement à l'essentiel avec l'analyse structurée.
        
        Données du mois :
        - Chiffre d'Affaires (CA) : ${formatCurrency(revenue)}
        - Dépenses totales (Achats + Charges) : ${formatCurrency(expenses)}
        - Résultat Net (Profit) : ${formatCurrency(profit)}
        - Valeur actuelle du stock : ${formatCurrency(stockValue)}
        - Top 5 produits vendus : ${topProducts.map(p => `${p.name} (${p.qty} unités)`).join(', ')}
        
        Fournis une analyse structurée en français incluant :
        1. Un résumé de la performance globale.
        2. Une analyse de la rentabilité.
        3. Des conseils stratégiques pour améliorer le CA ou réduire les charges.
        4. Une alerte sur le stock si nécessaire.
        
        Utilise un ton professionnel, encourageant et précis. Réponds en Markdown.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setAnalysis(response.text || "Désolé, je n'ai pas pu générer l'analyse.");
    } catch (err: any) {
      console.error(err);
      setError("Une erreur est survenue lors de la génération de l'analyse.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!analysis || !stats) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(0, 48, 80); // #003050
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT DE PERFORMANCE MENSUEL', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Entreprise : ${currentUserProfile?.companyName || 'N/A'}`, 15, 30);
    doc.text(`Date : ${new Date().toLocaleDateString()}`, pageWidth - 15, 30, { align: 'right' });

    // KPI Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Indicateurs Clés (KPI)', 15, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Chiffre d\'Affaires', formatCurrency(stats.revenue)],
        ['Dépenses Totales', formatCurrency(stats.expenses)],
        ['Résultat Net', formatCurrency(stats.profit)],
        ['Valeur du Stock', formatCurrency(stats.stockValue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [80, 176, 224] }, // #50B0E0
    });

    // Top Products
    doc.text('Top 5 Produits Vendus', 15, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Produit', 'Quantité']],
      body: stats.topProducts.map(p => [p.name, p.qty]),
      theme: 'grid',
      headStyles: { fillColor: [224, 96, 32] }, // #E06020
    });

    // Analysis Section
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Analyse Stratégique Blue AI', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Simple text wrapping for the markdown (stripping some markdown chars for PDF)
    const cleanText = analysis.replace(/[#*`]/g, '');
    const splitText = doc.splitTextToSize(cleanText, pageWidth - 30);
    doc.text(splitText, 15, 35);

    doc.save(`Rapport_Performance_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-kontrol-blue" /> Blue AI
          </h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Analyses stratégiques et rapports de performance</p>
        </div>
        {analysis && (
          <button onClick={downloadPDF} className="btn-outline text-xs py-1.5 px-4 flex items-center gap-2">
            <Download size={14} /> Télécharger PDF
          </button>
        )}
      </div>

      {!analysis ? (
        <div className="card p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-kontrol-blue/10 flex items-center justify-center mb-6 animate-pulse">
            <Sparkles size={40} className="text-kontrol-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-kontrol-dark mb-2">Bonjour, je suis Blue.</h3>
          <p className="text-kontrol-ink-muted mb-8 leading-relaxed">
            Je peux analyser vos données de vente, vos charges et vos stocks pour vous fournir un rapport de performance détaillé et des conseils stratégiques personnalisés.
          </p>
          <button 
            onClick={generateAnalysis}
            disabled={loading}
            className="btn-primary px-8 py-3 font-bold flex items-center gap-3 text-sm shadow-lg shadow-kontrol-blue/20"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Zap size={20} />
                Générer l'analyse mensuelle
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-4">
            <div className="card p-5">
              <h4 className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={14} /> Résumé Chiffré
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Revenus</p>
                  <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(stats?.revenue || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Dépenses</p>
                  <p className="text-lg font-extrabold text-rose-600">{formatCurrency(stats?.expenses || 0)}</p>
                </div>
                <div className="pt-4 border-t border-kontrol-border">
                  <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Profit Net</p>
                  <p className={cn(
                    "text-xl font-extrabold",
                    (stats?.profit || 0) >= 0 ? "text-kontrol-blue" : "text-rose-600"
                  )}>
                    {formatCurrency(stats?.profit || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5 bg-kontrol-dark text-white">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Top Produits</h4>
              <div className="space-y-3">
                {stats?.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-[12px] font-medium truncate mr-2">{p.name}</span>
                    <span className="text-[12px] font-extrabold text-kontrol-blue">{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-8 prose prose-sm max-w-none">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-kontrol-border">
              <div className="w-10 h-10 rounded-full bg-kontrol-blue flex items-center justify-center text-white">
                <BrainCircuit size={20} />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-kontrol-dark leading-none">Analyse de Blue</h4>
                <p className="text-[11px] text-kontrol-ink-muted mt-1 uppercase tracking-wider">Générée le {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="markdown-body">
              <Markdown>{analysis}</Markdown>
            </div>

            <div className="mt-8 pt-6 border-t border-kontrol-border flex justify-between items-center">
              <p className="text-[11px] text-kontrol-ink-muted italic">
                Cette analyse est générée par IA à titre indicatif.
              </p>
              <button onClick={() => setAnalysis(null)} className="text-[11px] font-bold text-kontrol-blue hover:underline">
                Nouvelle analyse
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
}
