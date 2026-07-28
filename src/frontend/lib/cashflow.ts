import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, UserProfile } from '../types';
import { drawCompanyLogoOrBadge, loadImageDataUrl } from './invoice';

// Helper to sanitize accents to prevent jsPDF text encoding bugs
const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D«»]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/°/g, '.')
    .replace(/€/g, 'EUR')
    .replace(/[^\x00-\x7F]/g, '');
};

const formatSimpleNumber = (num: number, currency: string = "XOF") => {
  const rounded = Math.round(num || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} ${cleanText(currency)}`;
};

const drawKontrolLogo = (doc: jsPDF, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;

  doc.setDrawColor(125, 211, 252);
  doc.setLineWidth(size * 0.12);
  doc.circle(cx, cy, size * 0.42, 'S');

  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(size * 0.1);
  doc.circle(cx, cy, size * 0.32, 'S');

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

export const generateCashFlowPDF = async (
  transactions: Transaction[], 
  dateRange: { start: string, end: string },
  profile: UserProfile | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const currency = profile?.currency || "XOF";

  // Calculate Initial Balance from prior completed transactions
  const initialTransactions = transactions.filter(t => new Date(t.date) < start && t.statut === 'PAYE');
  const initialBalance = initialTransactions.reduce((acc, t) => {
    const amount = t.montantTotal || t.montant || 0;
    const isIncome = t.type === 'VENTE';
    return isIncome ? acc + amount : acc - amount;
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
    .filter(t => (t.type === 'ACHAT' || (t.type as string) === 'CHARGE' || (t.type as string) === 'ABONNEMENT') && t.statut === 'PAYE')
    .reduce((acc, t) => acc + (t.montantTotal || t.montant || 0), 0);

  const finalBalance = initialBalance + encaissements - decaissements;
  const netFlow = encaissements - decaissements;

  // 1. Top Decorative Blue Bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Header Titles & Company Logo / Emblem
  const companyName = cleanText(profile?.companyName || profile?.companyAbbreviation || 'KONTROL ENTERPRISE');
  let companyLogo = profile?.companyLogo || profile?.logoUrl || (profile as any)?.logo;
  if (!companyLogo && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('kontrol_profile_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        companyLogo = parsed.companyLogo || parsed.logoUrl || parsed.logo;
      }
    } catch (e) {
      // ignore
    }
  }

  const loadedLogo = companyLogo ? await loadImageDataUrl(companyLogo) : { dataUrl: '', width: 0, height: 0, aspectRatio: 1 };
  drawCompanyLogoOrBadge(doc, margin, 10, 16, companyName, loadedLogo.dataUrl, false, loadedLogo.aspectRatio);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(companyName, 35, 23);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cleanText("RAPPORT SYNTHÉTIQUE ET ÉTAT DES FLUX DE TRÉSORERIE"), 35, 28);

  // Right Header
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(cleanText("DOCUMENT OFFICIEL DE TRÉSORERIE"), pageWidth - margin, 22, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cleanText(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`), pageWidth - margin, 27, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageWidth - margin, 35);

  // 4. Period & Executive Summary Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const periodText = `Période d'analyse : du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(cleanText(periodText), margin, 44);

  // 5. Four Executive Summary KPI Cards across full width
  const cardY = 50;
  const cardWidth = 42;
  const cardHeight = 26;

  // Card 1: Solde Initial
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, cardY, cardWidth, cardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, cardY, cardWidth, cardHeight, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(cleanText("SOLDE DE DÉPART"), margin + 4, cardY + 6);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.text(formatSimpleNumber(initialBalance, currency), margin + 4, cardY + 16);

  // Card 2: Total Encaissements (+)
  const c2X = margin + 45;
  doc.setFillColor(236, 253, 245);
  doc.rect(c2X, cardY, cardWidth, cardHeight, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.rect(c2X, cardY, cardWidth, cardHeight, 'S');

  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(cleanText("ENCAISSEMENTS (+)"), c2X + 4, cardY + 6);

  doc.setTextColor(6, 95, 70);
  doc.setFontSize(9.5);
  doc.text(`+${formatSimpleNumber(encaissements, currency)}`, c2X + 4, cardY + 16);

  // Card 3: Total Décaissements (-)
  const c3X = margin + 90;
  doc.setFillColor(255, 241, 242);
  doc.rect(c3X, cardY, cardWidth, cardHeight, 'F');
  doc.setDrawColor(254, 205, 211);
  doc.rect(c3X, cardY, cardWidth, cardHeight, 'S');

  doc.setTextColor(190, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(cleanText("DÉCAISSEMENTS (-)"), c3X + 4, cardY + 6);

  doc.setTextColor(159, 18, 57);
  doc.setFontSize(9.5);
  doc.text(`-${formatSimpleNumber(decaissements, currency)}`, c3X + 4, cardY + 16);

  // Card 4: Solde Final Net (=)
  const c4X = margin + 135;
  doc.setFillColor(239, 246, 255);
  doc.rect(c4X, cardY, cardWidth + 3, cardHeight, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.rect(c4X, cardY, cardWidth + 3, cardHeight, 'S');

  doc.setTextColor(29, 78, 216);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(cleanText("SOLDE FINAL DE CLÔTURE"), c4X + 4, cardY + 6);

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(10);
  doc.text(formatSimpleNumber(finalBalance, currency), c4X + 4, cardY + 16);

  // 6. Narrative Human Explanation Box
  const expY = 82;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, expY, pageWidth - (margin * 2), 16, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, expY, pageWidth - (margin * 2), 16, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const netText = netFlow >= 0 
    ? `Analyse humaine : Durant cette période, la trésorerie affiche un solde net positif de +${formatSimpleNumber(netFlow, currency)}, témoignant d'une bonne rentabilité globale et d'entrées financières suffisantes.`
    : `Analyse humaine : La trésorerie enregistre un déficit temporaire de ${formatSimpleNumber(netFlow, currency)} sur la période, principalement attribuable aux dépenses d'exploitation et aux règlements effectués.`;

  const expLines = doc.splitTextToSize(cleanText(netText), pageWidth - (margin * 2) - 8);
  doc.text(expLines, margin + 4, expY + 6);

  // 7. Table of Movements
  const tableData = periodTransactions.map(t => {
    const isEncaissement = t.type === 'VENTE';
    const natureStr = isEncaissement ? "Encaissement Client" : ((t.type as string) === 'ABONNEMENT' ? "Charge d'Abonnement" : "Décaissement Fournisseur");
    const amountVal = t.montantTotal || t.montant || 0;
    const formattedVal = (isEncaissement ? "+" : "-") + formatSimpleNumber(amountVal, currency);

    return [
      new Date(t.date).toLocaleDateString('fr-FR'),
      cleanText(t.reference || t.id || "N/A"),
      cleanText(t.tiersNom || (isEncaissement ? "Client" : "Fournisseur / Prestataire")),
      cleanText(natureStr),
      cleanText(t.modePaiement || "Comptant"),
      formattedVal,
      cleanText(t.statut || "PAYÉ")
    ];
  });

  autoTable(doc, {
    startY: 104,
    margin: { left: margin, right: margin },
    head: [[
      cleanText("Date"),
      cleanText("Référence"),
      cleanText("Partenaire / Tiers"),
      cleanText("Nature Mouvement"),
      cleanText("Mode Règlement"),
      cleanText("Montant Net"),
      cleanText("Statut")
    ]],
    body: tableData.length > 0 ? tableData : [[
      cleanText("Aucune opération enregistrée sur cette période"), "", "", "", "", "", ""
    ]],
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'left' },
      1: { cellWidth: 28, halign: 'left' },
      2: { cellWidth: 38, halign: 'left' },
      3: { cellWidth: 32, halign: 'left' },
      4: { cellWidth: 22, halign: 'left' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 10, halign: 'center' }
    }
  });

  // Footer & Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      cleanText(`Rapport certifié de trésorerie KONTROL ERP - ${companyName} - Page ${i} sur ${pageCount}`),
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    );
  }

  doc.save(`Rapport_Tresorerie_KONTROL_${start.toISOString().substring(0, 10)}.pdf`);
};
