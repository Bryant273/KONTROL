import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Robust helper to strip accents and non-standard characters from text strings,
// preventing jsPDF character encoding defects where accents turn into unreadable symbols.
export const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks (accents)
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
    .replace(/[^\x00-\x7F]/g, ''); // Strip remaining unknown non-ASCII cleanly without introducing spaces
};

// Formats amount with a clean space separator to avoid non-breaking space issues.
export const formatSimpleNumber = (num: number, currency: string) => {
  const rounded = Math.round(num || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} ${cleanText(currency || 'XOF')}`;
};

export const drawKontrolLogo = (doc: jsPDF, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;

  // Outer sky blue ring
  doc.setDrawColor(125, 211, 252);
  doc.setLineWidth(size * 0.12);
  doc.circle(cx, cy, size * 0.42, 'S');

  // Orange inner swirl/circle segment
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(size * 0.1);
  doc.circle(cx, cy, size * 0.32, 'S');

  // Central blue arrow
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
export const drawPadlockIcon = (doc: jsPDF, x: number, y: number, size: number) => {
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.circle(x + size / 2, y + size / 3, size / 4, 'S');
  doc.setFillColor(239, 246, 255);
  doc.rect(x, y + size / 3, size, size * 0.6, 'FD');
  doc.setFillColor(37, 99, 235);
  doc.circle(x + size / 2, y + size * 0.55, size * 0.08, 'F');
};

export const loadImageDataUrl = (url?: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return resolve('');
    }

    const trimmed = url.trim();

    // If it's already a standard base64 PNG or JPEG data URL
    if (
      trimmed.startsWith('data:image/png;base64,') ||
      trimmed.startsWith('data:image/jpeg;base64,') ||
      trimmed.startsWith('data:image/jpg;base64,')
    ) {
      return resolve(trimmed);
    }

    // Load via HTMLImageElement to convert HTTP/HTTPS/relative/SVG URLs to a PNG data URL
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 200;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          return resolve(dataUrl);
        }
      } catch (err) {
        console.warn("Could not convert image to canvas data URL:", err);
      }
      resolve(trimmed);
    };

    img.onerror = () => {
      console.warn("Could not load image from URL:", trimmed);
      resolve('');
    };

    img.src = trimmed;
  });
};

export const drawCompanyLogoOrBadge = (
  doc: jsPDF, 
  x: number, 
  y: number, 
  size: number, 
  companyName: string, 
  logoUrl?: string, 
  isSubscription: boolean = false
) => {
  if (isSubscription) {
    drawKontrolLogo(doc, x, y, size);
    return;
  }

  let drawn = false;

  if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim().length > 0) {
    try {
      let format = 'PNG';
      if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
        format = 'JPEG';
      } else if (logoUrl.includes('image/webp')) {
        format = 'WEBP';
      }
      doc.addImage(logoUrl, format, x, y, size, size);
      drawn = true;
    } catch (err) {
      console.warn("Could not embed company logo in PDF:", err);
    }
  }

  if (!drawn) {
    // Light corporate emblem fallback (No dark black plate!)
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(x, y, size, size, 3, 3, 'FD');

    // Top brand accent
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(x, y, size, 1.8, 'F');

    // Extract 2-letter initials
    const cleanName = cleanText(companyName || 'ENTREPRISE').trim();
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    let initials = 'E';
    if (words.length >= 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      initials = words[0].substring(0, 2).toUpperCase();
    }

    doc.setTextColor(37, 99, 235); // royal blue
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size > 15 ? 10 : 8);
    
    // Center text
    doc.text(initials, x + (size / 2), y + (size / 2) + 1.8, { align: 'center' });
  }
};

export const generateInvoicePDF = async (transaction: any, userProfile?: any) => {
  const type = transaction.type || 'VENTE';
  
  // Only treat as KONTROL software subscription invoice if explicitly flagged
  const isSubscription = transaction.isKontrolSubscription === true || 
                         transaction.source === 'KONTROL_SUBSCRIPTION' ||
                         transaction.category === 'ABONNEMENT_KONTROL' ||
                         type === 'ABONNEMENT_KONTROL';

  const isSale = !isSubscription && (type === 'VENTE' || type === 'REVENUE' || type === 'INCOME' || type === 'SALE' || !type);
  const isPurchase = !isSubscription && (type === 'ACHAT' || type === 'CHARGE' || type === 'EXPENSE' || type === 'PURCHASE');

  const reference = transaction.reference || transaction.transactionId || transaction.id || "KT-REF-UNKNOWN";
  const amount = transaction.montantTotal || transaction.montant || transaction.amount || 0;
  const currency = transaction.devise || transaction.currency || "XOF";
  
  const rawDate = new Date(transaction.createdAt || transaction.date || Date.now());
  const dateStr = rawDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate Due Date if present
  const nextDueDateObj = transaction.nextDueDate 
    ? new Date(transaction.nextDueDate) 
    : new Date(rawDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextDueDateStr = nextDueDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const invoiceNumber = reference.startsWith('FAC') || reference.startsWith('KT-FAC')
    ? reference
    : `KT-FAC-${reference.substring(0, 10).toUpperCase()}`;

  // User / Company details
  const myCompany = cleanText(userProfile?.companyName || userProfile?.companyAbbreviation || "Votre Entreprise");
  const myUserName = cleanText(userProfile?.displayName || userProfile?.email || "Gestionnaire KONTROL");
  const myUserEmail = cleanText(userProfile?.email || "");

  // Counterparty details
  const partnerName = cleanText(transaction.tiersNom || (isSale ? "Client Tiers" : "Fournisseur Tiers"));

  // Initialize jsPDF (A4, portrait, mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 15;
  const pageWidth = 210;

  // 1. Top Decorative Strip
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Logo drawing (Company Logo for sale/purchase documents, KONTROL logo for subscription documents)
  let companyLogo = userProfile?.companyLogo || userProfile?.logoUrl || userProfile?.logo;
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

  // Pre-load logo to base64 Data URL so jsPDF addImage never fails
  const loadedLogoDataUrl = (!isSubscription && companyLogo) ? await loadImageDataUrl(companyLogo) : '';

  drawCompanyLogoOrBadge(
    doc,
    margin,
    10,
    18,
    myCompany,
    loadedLogoDataUrl,
    isSubscription
  );

  // 3. Branding & Company Name text next to Logo
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);

  const headerTitle = (!isSubscription && myCompany) ? myCompany : 'KONTROL ERP';
  doc.text(cleanText(headerTitle), 36, 22);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const headerSubtitle = (!isSubscription && myCompany) 
    ? `DOCUMENT OFFICIEL · ${myCompany.toUpperCase()}` 
    : "GESTION ERP INTELLIGENTE par INNOV'KORP";
  doc.text(cleanText(headerSubtitle), 36, 28);

  // 4. Invoice Title & ID (Top Right)
  const docTitle = isSubscription 
    ? "FACTURE D'ABONNEMENT" 
    : isSale 
      ? "FACTURE DE VENTE" 
      : "FACTURE D'ACHAT";

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(cleanText(docTitle), pageWidth - margin, 22, { align: 'right' });

  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(invoiceNumber, pageWidth - margin, 28, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageWidth - margin, 35);

  // 5. Parties Layout:
  // - ÉMETTEUR (Prestataire/Vendeur) on the LEFT at y = 42
  // - CLIENT / DESTINATAIRE slightly BELOW on the RIGHT at y = 54
  
  const issuerY = 42;
  const clientY = 54;

  if (isSubscription) {
    // Left: INNOV'KORP
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("ÉMETTEUR (PRESTATAIRE)"), margin, issuerY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("INNOV'KORP", margin, issuerY + 6);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("Email : Innov.korp@gmail.com", margin, issuerY + 11);

    // Right: User's Company
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("CLIENT (FACTURÉ À)"), 115, clientY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(myCompany, 115, clientY + 6);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanText(`À l'attention de : ${myUserName}`), 115, clientY + 11);
    doc.text(`Email : ${myUserEmail}`, 115, clientY + 16);
  } else if (isSale) {
    // Left: User's Company (Vendeur)
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("ÉMETTEUR (VENDEUR / PRESTATAIRE)"), margin, issuerY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(myCompany, margin, issuerY + 6);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanText(`Représentant : ${myUserName}`), margin, issuerY + 11);
    doc.text(`Email : ${myUserEmail}`, margin, issuerY + 16);

    // Right: Client Tiers
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("CLIENT (FACTURÉ À)"), 115, clientY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(partnerName, 115, clientY + 6);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanText("Partenaire enregistré sur KONTROL ERP"), 115, clientY + 11);
  } else {
    // Purchase: Left = Supplier Tiers, Right = User's Company
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("ÉMETTEUR (FOURNISSEUR)"), margin, issuerY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(partnerName, margin, issuerY + 6);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanText("Prestataire externe certifié"), margin, issuerY + 11);

    // Right: User's Company
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("DESTINATAIRE (ACHETEUR)"), 115, clientY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(myCompany, 115, clientY + 6);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanText(`Responsable : ${myUserName}`), 115, clientY + 11);
    doc.text(`Email : ${myUserEmail}`, 115, clientY + 16);
  }

  // Horizontal divider
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(margin, 76, pageWidth - margin, 76);

  // 6. Payment & Details Section Box
  const detailsY = 82;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, detailsY, pageWidth - (margin * 2), 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin, detailsY, pageWidth - (margin * 2), 24, 'S');

  // Left Column inside details box: Payment details
  const modePaiement = cleanText(transaction.modePaiement || transaction.paymentMethod || "Paiement Comptant");
  const refPaiement = cleanText(transaction.referencePaiement || transaction.numCheque || transaction.numBonCaisse || transaction.reference || "N/A");

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(cleanText("RÈGLEMENT & RENSEIGNEMENTS"), margin + 5, detailsY + 6);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cleanText(`Date d'émission : `), margin + 5, detailsY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(dateStr), margin + 35, detailsY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(cleanText("Mode de règlement : "), margin + 5, detailsY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(modePaiement, margin + 38, detailsY + 18);

  // Right Column: Reference / Due Date
  const colRightX = 115;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(cleanText(isSubscription ? "ÉCHÉANCE DE L'ABONNEMENT" : "RÉFÉRENCE ET JUSTIFICATIF"), colRightX, detailsY + 6);

  if (isSubscription) {
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(cleanText("Nouvelle échéance : "), colRightX, detailsY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(cleanText(nextDueDateStr), colRightX + 34, detailsY + 14);
  } else {
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(cleanText("Réf. Pièce / Transaction : "), colRightX, detailsY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(refPaiement.substring(0, 24), colRightX + 42, detailsY + 12);

    doc.setFont('helvetica', 'normal');
    doc.text(cleanText("Statut du paiement : "), colRightX, detailsY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(cleanText(transaction.statut || "PAYÉ / RÈGLÉ"), colRightX + 35, detailsY + 18);
  }

  // 7. Table for Items / Articles
  const formattedAmount = formatSimpleNumber(amount, currency);

  let tableHead = [cleanText("Désignation des articles / prestations"), cleanText("Qté"), cleanText("Prix Unitaire"), cleanText("Montant Net")];
  let tableRows: any[] = [];

  if (transaction.articles && Array.isArray(transaction.articles) && transaction.articles.length > 0) {
    tableRows = transaction.articles.map((art: any) => [
      cleanText(art.designation || art.produitId || "Article / Prestation"),
      art.quantite || 1,
      formatSimpleNumber(art.prixUnitaire || 0, currency),
      formatSimpleNumber(art.total || (art.quantite * art.prixUnitaire) || 0, currency)
    ]);
  } else {
    let desc = cleanText(transaction.description || (isSubscription ? "Abonnement KONTROL Standard - 30 jours" : `Opération de ${docTitle.toLowerCase()}`));
    tableRows = [[
      desc,
      "1",
      formattedAmount,
      formattedAmount
    ]];
  }

  autoTable(doc, {
    startY: 112,
    margin: { left: margin, right: margin },
    head: [tableHead],
    body: tableRows,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4.5,
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

  let finalTableY = (doc as any).lastAutoTable.finalY || 185;
  
  // Check if totals & security seal block fit on current page (need ~60mm)
  if (finalTableY + 60 > 255) {
    doc.addPage();
    finalTableY = 15;
  }
  
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
  doc.text(cleanText("TVA (0% - Exonéré) :"), totalsLeftX, totalsY + 12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(formatSimpleNumber(0, currency), pageWidth - margin, totalsY + 12, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(totalsLeftX, totalsY + 16, pageWidth - margin, totalsY + 16);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Montant total net :", totalsLeftX, totalsY + 22);
  
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
  doc.text("PAYEE ET VALIDEE", margin + 12, totalsY + 9);

  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cleanText(`Moyen : ${modePaiement}`), margin + 12, totalsY + 14);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Réf : ${reference.substring(0, 18)}`, margin + 12, totalsY + 19);

  // 8. Digital Security Seal
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
  doc.text(cleanText("Document certifie conforme, archive en registre infalsifiable et signe cryptographiquement par KONTROL."), margin + 17, sealY + 12);
  
  doc.setFont('courier', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text(`Verification ID: SEC-KEY-SHA256-${reference.substring(0, 12).toUpperCase()}-VERIFIED-KONTROL`, margin + 17, sealY + 17);

  // Embed official company signature if provided
  const companySig = userProfile?.companySignature || userProfile?.signatureUrl;
  if (companySig && companySig.startsWith('data:image')) {
    try {
      const format = companySig.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(companySig, format, pageWidth - margin - 35, sealY + 2, 30, 17);
    } catch (e) {
      console.warn("Could not embed company signature in invoice PDF:", e);
    }
  }

  // 9. Footers on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = 272;
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(myCompany, pageWidth / 2, footerY, { align: 'center' });

    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Contact : ${myUserEmail || 'Innov.korp@gmail.com'} · Page ${p} sur ${totalPages}`, pageWidth / 2, footerY + 4, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(cleanText("Facture generee automatiquement et certifiee conforme sur KONTROL. Aucune signature manuscrite n'est requise."), pageWidth / 2, footerY + 8, { align: 'center' });
  }

  // Trigger download
  doc.save(`Facture_${cleanText(myCompany).replace(/\s+/g, '_')}_${invoiceNumber}.pdf`);
};

export const generateReceiptPDF = async (transaction: any, userProfile?: any) => {
  await generateInvoicePDF(transaction, userProfile);
};
