import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, UserProfile } from '../types';
import { formatCurrency } from './utils';

export const generateInvoicePDF = (transaction: Transaction, profile: UserProfile | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Innovative Header Design ---
  // Background shapes
  doc.setFillColor(10, 25, 47); // Dark Blue
  doc.rect(0, 0, pageWidth, 65, 'F');
  
  doc.setFillColor(52, 152, 219); // Light Blue accent
  doc.rect(0, 65, pageWidth, 2, 'F');

  // Decorative corner
  doc.setFillColor(52, 152, 219, 0.1);
  doc.triangle(pageWidth, 0, pageWidth, 40, pageWidth - 40, 0, 'F');

  // Logo handling
  const logo = profile?.companyLogo || profile?.logoUrl;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 12, 36, 36, 6, 6, 'F');
      doc.addImage(logo, 'PNG', 18, 15, 30, 30);
    } catch (e) {
      console.error("Could not add logo to PDF", e);
    }
  }

  // Invoice Title & Branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(transaction.type === 'VENTE' ? 'FACTURE' : 'BON D\'ACHAT', pageWidth - 15, 30, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`RÉFÉRENCE: ${transaction.reference}`, pageWidth - 15, 40, { align: 'right' });
  doc.text(`DATE: ${new Date(transaction.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}`, pageWidth - 15, 46, { align: 'right' });

  // --- Company & Client Info Section ---
  const isAchat = transaction.type === 'ACHAT';
  
  // Left Side Info (Top-Left)
  doc.setTextColor(10, 25, 47);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(isAchat ? 'FOURNISSEUR' : 'ÉMETTEUR', 15, 80);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const leftName = isAchat ? transaction.tiersNom : (profile?.companyName || 'KONTROL USER');
  doc.text(leftName.toUpperCase(), 15, 88);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  if (isAchat) {
    doc.text('PARTENAIRE FOURNISSEUR', 15, 94);
    doc.text(`ID: ${transaction.tiersId.slice(0, 8).toUpperCase()}`, 15, 99);
  } else {
    doc.text(profile?.email || '', 15, 94);
    doc.text(`${profile?.city || 'DAKAR'}, ${profile?.country || 'SÉNÉGAL'}`, 15, 99);
    if (profile?.address) doc.text(profile.address.toUpperCase(), 15, 104);
  }

  // Right Side Info (Bottom-Right of header area)
  doc.setTextColor(10, 25, 47);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(isAchat ? 'CLIENT (NOUS)' : 'DESTINATAIRE', pageWidth - 15, 105, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const rightName = isAchat ? (profile?.companyName || 'KONTROL USER') : transaction.tiersNom;
  doc.text(rightName.toUpperCase(), pageWidth - 15, 113, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  if (isAchat) {
    doc.text(profile?.email || '', pageWidth - 15, 119, { align: 'right' });
    doc.text(`${profile?.city || 'DAKAR'}, ${profile?.country || 'SÉNÉGAL'}`, pageWidth - 15, 124, { align: 'right' });
  } else {
    doc.text('CLIENT PARTENAIRE KONTROL', pageWidth - 15, 119, { align: 'right' });
    doc.text(`ID TIERS: ${transaction.tiersId.slice(0, 8).toUpperCase()}`, pageWidth - 15, 124, { align: 'right' });
  }

  // --- Items Table ---
  autoTable(doc, {
    startY: 135,
    head: [['DÉSIGNATION', 'QTÉ', 'PRIX UNITAIRE', 'TOTAL']],
    body: transaction.articles.map(art => [
      art.designation.toUpperCase(),
      art.quantite,
      formatCurrency(art.prixUnitaire),
      formatCurrency(art.total)
    ]),
    theme: 'striped',
    headStyles: { 
      fillColor: [10, 25, 47], 
      textColor: 255, 
      fontSize: 9, 
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 5
    },
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 45 },
      3: { halign: 'right', cellWidth: 45 }
    },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  // --- Totals & Payment Section ---
  // Totals Box (Right)
  const totalBoxWidth = 80;
  const totalBoxX = pageWidth - totalBoxWidth - 15;
  
  doc.setFillColor(10, 25, 47);
  doc.rect(totalBoxX, finalY + 10, totalBoxWidth, 30, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('NET À PAYER (TTC)', totalBoxX + 5, finalY + 20);
  
  doc.setFontSize(18);
  doc.setTextColor(52, 152, 219);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(transaction.montantTotal), pageWidth - 20, finalY + 32, { align: 'right' });

  // Payment Info (Left)
  doc.setFontSize(10);
  doc.setTextColor(10, 25, 47);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DU RÈGLEMENT', 15, finalY + 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`MODE DE PAIEMENT: ${transaction.modePaiement.toUpperCase()}`, 15, finalY + 28);
  doc.text(`STATUT: ${transaction.statut.toUpperCase()}`, 15, finalY + 34);

  // Paid Stamp
  if (transaction.statut === 'PAYE') {
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(1.5);
    doc.roundedRect(15, finalY + 45, 40, 15, 2, 2, 'D');
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYÉ', 35, finalY + 55, { align: 'center' });
  }

  // --- Footer ---
  const footerY = pageHeight - 25;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(15, footerY, pageWidth - 15, footerY);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'bold');
  doc.text(`KONTROL • LA GESTION INTELLIGENTE PAR INNOV'KORP`, pageWidth / 2, footerY + 8, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('MERCI DE VOTRE CONFIANCE • DOCUMENT GÉNÉRÉ AUTOMATIQUEMENT', pageWidth / 2, footerY + 13, { align: 'center' });
  doc.setTextColor(52, 152, 219);
  
  const locationParts = [profile?.address, profile?.city, profile?.country].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(' • ').toUpperCase() : 'KONTROL';
  doc.text(locationStr, pageWidth / 2, footerY + 18, { align: 'center' });

  doc.save(`Facture_${transaction.reference}.pdf`);
};
