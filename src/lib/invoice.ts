import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, UserProfile } from '../types';
import { formatCurrency } from './utils';

export const generateInvoicePDF = (transaction: Transaction, profile: UserProfile | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  // Add a background header bar
  doc.setFillColor(0, 48, 80);
  doc.rect(0, 0, pageWidth, 45, 'F');

  if (profile?.companyLogo) {
    try {
      // White circle background for logo
      doc.setFillColor(255, 255, 255);
      doc.circle(30, 22, 18, 'F');
      doc.addImage(profile.companyLogo, 'PNG', 15, 7, 30, 30);
    } catch (e) {
      console.error("Could not add logo to PDF", e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(transaction.type === 'VENTE' ? 'FACTURE' : 'BON D\'ACHAT', pageWidth - 15, 28, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Réf: ${transaction.reference}`, pageWidth - 15, 36, { align: 'right' });
  doc.text(`Date: ${new Date(transaction.date).toLocaleDateString()}`, pageWidth - 15, 41, { align: 'right' });

  // Company Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(profile?.companyName || 'KONTROL User', 15, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(profile?.email || '', 15, 71);

  // Client Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATAIRE', 120, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(transaction.tiersNom, 120, 71);

  // Table
  autoTable(doc, {
    startY: 85,
    head: [['Désignation', 'Qté', 'Prix Unitaire', 'Total']],
    body: transaction.articles.map(art => [
      art.designation,
      art.quantite,
      formatCurrency(art.prixUnitaire),
      formatCurrency(art.total)
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [0, 48, 80], 
      textColor: 255, 
      fontSize: 10, 
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 }
    },
    alternateRowStyles: { fillColor: [250, 250, 250] }
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  // Totals Box
  const totalBoxWidth = 70;
  const totalBoxX = pageWidth - totalBoxWidth - 15;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(totalBoxX, finalY + 10, totalBoxWidth, 25, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL TTC', totalBoxX + 5, finalY + 20);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 48, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(transaction.montantTotal), pageWidth - 20, finalY + 28, { align: 'right' });

  // Payment Info
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations de paiement', 15, finalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Mode: ${transaction.modePaiement}`, 15, finalY + 27);
  doc.text(`Statut: ${transaction.statut}`, 15, finalY + 33);

  // Paid Stamp if applicable
  if (transaction.statut === 'PAYE') {
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(1);
    doc.roundedRect(pageWidth / 2 - 25, finalY + 50, 50, 20, 3, 3, 'D');
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYÉ', pageWidth / 2, finalY + 63, { align: 'center' });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  const footerText = `KONTROL par INNOV'KORP — Logiciel de gestion intelligente — www.innovkorp.com`;
  doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
  doc.text(`Page 1/1 — Généré le ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  doc.save(`Facture_${transaction.reference}.pdf`);
};
