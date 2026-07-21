import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Robust helper to strip any accents or non-standard characters from text strings,
// preventing the classic jsPDF encoding bug where accents appear as human-unreadable symbols.
const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove all combining diacritical marks (accents)
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/’/g, "'")
    .replace(/[^\x00-\x7F]/g, " "); // Replace any other non-ASCII characters with spaces
};

// Formats amount with a clean space separator to avoid non-breaking space issues.
const formatSimpleNumber = (num: number, currency: string) => {
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} ${cleanText(currency)}`;
};

const drawKontrolLogo = (doc: jsPDF, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;

  // Draw light blue outer swirl/circle segment
  doc.setDrawColor(125, 211, 252);
  doc.setLineWidth(size * 0.12);
  doc.circle(cx, cy, size * 0.42, 'S');

  // Draw orange inner swirl/circle segment
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(size * 0.1);
  doc.circle(cx, cy, size * 0.32, 'S');

  // Draw the central blue arrow
  doc.setFillColor(59, 130, 246);
  doc.triangle(
    x + size * 0.5, y + size * 0.22,
    x + size * 0.72, y + size * 0.55,
    x + size * 0.28, y + size * 0.55,
    'F'
  );
  doc.rect(
    x + size * 0.41, y + size * 0.55,
    size * 0.18, size * 0.23,
    'F'
  );
};

// Simple padlock vector drawer for digital seal
const drawPadlockIcon = (doc: jsPDF, x: number, y: number, size: number) => {
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.circle(x + size / 2, y + size / 3, size / 4, 'S');
  doc.setFillColor(239, 246, 255);
  doc.rect(x, y + size / 3, size, size * 0.6, 'FD');
  doc.setFillColor(37, 99, 235);
  doc.circle(x + size / 2, y + size * 0.55, size * 0.08, 'F');
};

export const generateInvoicePDF = (transaction: any, userProfile?: any) => {
  const reference = transaction.transactionId || transaction.id || "GP-TX-UNKNOWN";
  const amount = transaction.amount || 15000;
  const currency = transaction.currency || "XOF";
  
  const rawDate = new Date(transaction.createdAt || Date.now());
  const dateStr = rawDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate Échéances (Previous and New due dates)
  const prevDueDateObj = transaction.previousDueDate ? new Date(transaction.previousDueDate) : rawDate;
  const nextDueDateObj = transaction.nextDueDate 
    ? new Date(transaction.nextDueDate) 
    : new Date(rawDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const prevDueDateStr = prevDueDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const nextDueDateStr = nextDueDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const invoiceNumber = `KT-FAC-${reference.substring(0, 10).toUpperCase()}`;
  
  const companyName = cleanText(userProfile?.companyName || userProfile?.companyAbbreviation || "Votre Entreprise");
  const userName = cleanText(userProfile?.displayName || userProfile?.email || "Utilisateur KONTROL");
  const userEmail = cleanText(userProfile?.email || "");

  // Initialize jsPDF (A4, portrait, mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 15;
  const pageWidth = 210;

  // 1. Decorative Header Strip
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Draw Vector KONTROL Logo
  drawKontrolLogo(doc, margin, 14, 16);

  // 3. App branding text next to Logo
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('KONTROL.', 35, 23);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cleanText("GESTION ERP INTELLIGENTE par INNOV'KORP"), 35, 28);

  // 4. Invoice Title & ID (Top Right)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(cleanText("FACTURE D'ABONNEMENT"), pageWidth - margin, 22, { align: 'right' });

  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(invoiceNumber, pageWidth - margin, 28, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageWidth - margin, 35);

  // 5. Metadata Layout:
  // - ÉMETTEUR (Issuer) on the LEFT at y = 42
  // - CLIENT (Facturé à) slightly BELOW on the RIGHT at y = 54
  
  // Left Side: ÉMETTEUR
  const issuerY = 42;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(cleanText("EMETTEUR (PRESTATAIRE)"), margin, issuerY);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("INNOV'KORP", margin, issuerY + 6);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("Email : Innov.korp@gmail.com", margin, issuerY + 11);

  // Right Side: CLIENT / FACTURÉ À (slanted/staggered slightly below at y = 54)
  const clientY = 54;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(cleanText("CLIENT (FACTURE A)"), 115, clientY);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(companyName, 115, clientY + 6);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(cleanText(`A l'attention de : ${userName}`), 115, clientY + 11);
  doc.text(`Email : ${userEmail}`, 115, clientY + 16);

  // Horizontal divider before payment details & due dates
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(margin, 76, pageWidth - margin, 76);

  // 6. Payment Details & Échéance Section Box
  const detailsY = 82;

  // Box background for Payment & Dates
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, detailsY, pageWidth - (margin * 2), 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin, detailsY, pageWidth - (margin * 2), 24, 'S');

  // Left Column inside details box: Transaction Details
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(cleanText("DETAILS DU RÈGLEMENT"), margin + 5, detailsY + 6);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cleanText(`Date d'emission : `), margin + 5, detailsY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(dateStr), margin + 35, detailsY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(cleanText("Reglement : "), margin + 5, detailsY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text("GeniusPay (Mobile Money)", margin + 27, detailsY + 18);

  // Right Column inside details box: Nouvelle Échéance
  const echeanceX = 115;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(cleanText("ÉCHÉANCE DE L'ABONNEMENT"), echeanceX, detailsY + 6);

  doc.setTextColor(37, 99, 235); // Blue for new due date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cleanText("Nouvelle echeance : "), echeanceX, detailsY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(cleanText(nextDueDateStr), echeanceX + 34, detailsY + 14);

  // 7. Draw Table for Subscriptions
  const formattedAmount = formatSimpleNumber(amount, currency);

  const descriptionText = [
    "ABONNEMENT: KONTROL STANDARD",
    "",
    "Acces complet aux modules de l'ERP :",
    "- Achats et Ventes (Facturation, devis, gestion clients)",
    "- Stocks et Logistique (Inventaire en temps reel)",
    "- Tresorerie et Flux de caisse (Rapprochements)",
    "- Blue AI Assistant (Analyses predictives)",
    "- Synchronisation instantanee et sauvegarde securisee cloud",
    "",
    `Nouvelle echeance d'abonnement : ${cleanText(nextDueDateStr)}`,
    "Support technique dedie d'INNOV'KORP : Innov.korp@gmail.com"
  ].map(line => cleanText(line)).join("\n");

  autoTable(doc, {
    startY: 112,
    margin: { left: margin, right: margin },
    head: [[
      cleanText("Description des services d'abonnement"),
      cleanText("Qte"),
      cleanText("Prix Unitaire"),
      cleanText("Montant Net")
    ]],
    body: [
      [
        descriptionText,
        "1",
        formattedAmount,
        formattedAmount
      ]
    ],
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: 5,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [71, 85, 105],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 100, halign: 'left' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || 185;
  const totalsY = finalTableY + 10;

  // Totals Box on the right
  const totalsLeftX = pageWidth - margin - 75;
  
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("Sous-total :", totalsLeftX, totalsY + 6);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedAmount, pageWidth - margin, totalsY + 6, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanText("TVA (0% - Exonere) :"), totalsLeftX, totalsY + 12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(formatSimpleNumber(0, currency), pageWidth - margin, totalsY + 12, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(totalsLeftX, totalsY + 16, pageWidth - margin, totalsY + 16);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Montant net paye :", totalsLeftX, totalsY + 22);
  
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(12);
  doc.text(formattedAmount, pageWidth - margin, totalsY + 22, { align: 'right' });

  // PAYEE Stamp box on the left
  doc.setFillColor(236, 253, 245);
  doc.rect(margin, totalsY, 85, 25, 'F');
  
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.rect(margin, totalsY, 85, 25, 'S');
  doc.setLineDashPattern([], 0);

  doc.setFillColor(16, 185, 129);
  doc.circle(margin + 6, totalsY + 12.5, 3.5, 'F');
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.line(margin + 4.5, totalsY + 12.5, margin + 5.8, totalsY + 14);
  doc.line(margin + 5.8, totalsY + 14, margin + 8, totalsY + 11);

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("PAYEE", margin + 12, totalsY + 9);

  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cleanText("Reglement securise via GeniusPay"), margin + 12, totalsY + 14);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Ref : ${reference.substring(0, 16)}...`, margin + 12, totalsY + 19);

  // 8. Cachet Numérique de KONTROL (Security Digital Seal)
  const sealY = totalsY + 34;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, sealY, pageWidth - (margin * 2), 22, 'F');

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.rect(margin, sealY, pageWidth - (margin * 2), 22, 'S');

  drawPadlockIcon(doc, margin + 5, sealY + 4, 8);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(cleanText("CACHET NUMERIQUE DE CERTIFICATION KONTROL"), margin + 17, sealY + 7);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(cleanText("Document certifie conforme et signe numeriquement par la cle de securite cryptographique KONTROL."), margin + 17, sealY + 12);
  
  doc.setFont('courier', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text(`Verification ID: SEC-KEY-SHA256-${reference.substring(0, 12).toUpperCase()}-VERIFIED-BY-INNOV-KORP`, margin + 17, sealY + 17);

  // 9. Footer (Anchored to bottom at Y=264)
  const footerY = 264;
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("INNOV'KORP", pageWidth / 2, footerY, { align: 'center' });

  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'semibold');
  doc.setFontSize(8);
  doc.text("Email de contact d'INNOV'KORP : Innov.korp@gmail.com", pageWidth / 2, footerY + 4, { align: 'center' });

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(cleanText("Facture generee automatiquement et certifiee conforme. Aucune signature manuscrite n'est requise."), pageWidth / 2, footerY + 9, { align: 'center' });
  doc.text(cleanText("Merci pour votre abonnement et votre confiance envers nos solutions."), pageWidth / 2, footerY + 13, { align: 'center' });

  // Trigger download of generated PDF
  doc.save(`Facture_INNOV_KORP_${invoiceNumber}.pdf`);
};

export const generateReceiptPDF = (transaction: any, userProfile?: any) => {
  generateInvoicePDF(transaction, userProfile);
};
