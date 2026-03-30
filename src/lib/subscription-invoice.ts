import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile } from '../types';
import { formatCurrency } from './utils';

export const generateSubscriptionInvoicePDF = (invoice: any, profile: UserProfile | null) => {
  const doc = new jsPDF();
  const companyName = profile?.companyName || 'KONTROL';
  const companyLogo = profile?.companyLogo;
  
  // Header
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 15, 15, 30, 30);
    } catch (e) {
      // Fallback if logo is invalid
      doc.setFontSize(22);
      doc.setTextColor(0, 48, 80);
      doc.text('KONTROL', 15, 25);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(0, 48, 80);
    doc.text('KONTROL', 15, 25);
  }

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('INNOV\'KORP - KONTROL', 15, 35);
  doc.text('Support: Innov.korp@gmail.com', 15, 40);

  // Invoice Details
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text('FACTURE D\'ABONNEMENT', 120, 25);
  
  doc.setFontSize(10);
  doc.text(`Référence: INV-${Date.now().toString().slice(-6)}`, 120, 35);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, 40);
  doc.text(`Période: ${invoice.period}`, 120, 45);

  // Client Info
  doc.setFontSize(12);
  doc.text('DESTINATAIRE:', 15, 60);
  doc.setFontSize(10);
  doc.text(companyName, 15, 67);
  doc.text(profile?.email || '', 15, 72);

  // Table
  autoTable(doc, {
    startY: 85,
    head: [['Désignation', 'Période', 'Mode de Paiement', 'Montant']],
    body: [
      [
        invoice.desc,
        invoice.period,
        invoice.method || 'Mobile Money',
        formatCurrency(invoice.amount, profile?.currency || 'XOF')
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 48, 80], textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`TOTAL À PAYER: ${formatCurrency(invoice.amount, profile?.currency || 'XOF')}`, 140, finalY);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Merci de votre confiance. KONTROL par INNOV\'KORP.', 105, 285, { align: 'center' });

  doc.save(`Facture_KONTROL_${invoice.period.replace(/ /g, '_')}.pdf`);
};
