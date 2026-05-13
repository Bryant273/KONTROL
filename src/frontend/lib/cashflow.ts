import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, UserProfile } from '../types';
import { formatCurrency } from './utils';

export const generateCashFlowPDF = (
  transactions: Transaction[], 
  dateRange: { start: string, end: string },
  profile: UserProfile | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  
  // Calculate Initial Balance
  // Assuming all transactions in the state are available
  const initialTransactions = transactions.filter(t => new Date(t.date) < start && t.statut === 'PAYE');
  const initialBalance = initialTransactions.reduce((acc, t) => {
    const amount = t.montantTotal || t.montant || 0;
    return t.type === 'VENTE' ? acc + amount : acc - amount;
  }, 0);

  // Period Transactions
  const periodTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  }).sort((a, b) => a.date - b.date);

  const encaissements = periodTransactions
    .filter(t => t.type === 'VENTE' && t.statut === 'PAYE')
    .reduce((acc, t) => acc + (t.montantTotal || t.montant || 0), 0);
    
  const decaissements = periodTransactions
    .filter(t => t.type === 'ACHAT' && t.statut === 'PAYE')
    .reduce((acc, t) => acc + (t.montantTotal || t.montant || 0), 0);

  const finalBalance = initialBalance + encaissements - decaissements;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(profile?.companyName || 'KONTROL', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RAPPORT DE FLUX DE TRÉSORERIE', 15, 32);

  // Metadata
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Période du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`, 15, 55);

  // Summary Cards (Simulated)
  doc.setDrawColor(229, 231, 235);
  doc.rect(15, 65, 180, 45); // Main box
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SOLDE INITIAL:', 20, 75);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(initialBalance), 100, 75, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL ENCAISSEMENTS (+):', 20, 85);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(encaissements), 100, 85, { align: 'right' });

  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL DÉCAISSEMENTS (-):', 20, 95);
  doc.setTextColor(244, 63, 94); // rose-500
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(decaissements), 100, 95, { align: 'right' });

  doc.setTextColor(51, 51, 51);
  doc.setDrawColor(229, 231, 235);
  doc.line(20, 100, 100, 100);

  doc.setFontSize(11);
  doc.text('SOLDE FINAL:', 20, 106);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(finalBalance), 100, 106, { align: 'right' });

  // Table of Movements
  autoTable(doc, {
    startY: 120,
    head: [['Date', 'Référence', 'Tiers', 'Type', 'Montant', 'Statut']],
    body: periodTransactions.map(t => [
      new Date(t.date).toLocaleDateString('fr-FR'),
      t.reference || '',
      t.tiersNom || '',
      t.type === 'VENTE' ? 'Encaissement' : 'Décaissement',
      formatCurrency(t.montantTotal || t.montant || 0),
      t.statut || 'N/A'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9 }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Document généré par KONTROL ERP le ${new Date().toLocaleString('fr-FR')} - Page ${i} sur ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`Flux_Tresorerie_${dateRange.start}_${dateRange.end}.pdf`);
};
