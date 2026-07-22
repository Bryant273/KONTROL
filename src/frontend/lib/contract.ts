import jsPDF from 'jspdf';
import { UserProfile } from '../types';

const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/’/g, "'")
    .replace(/[^\x00-\x7F]/g, " ");
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

  doc.setFillColor(37, 99, 235);
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

export const generateContractPDF = (profile: UserProfile | null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  const companyName = cleanText(profile?.companyName || profile?.companyAbbreviation || 'ENTREPRISE ABONNÉE');
  const companyId = cleanText(profile?.companyId || 'ENT-KONTROL-01');
  const managerName = cleanText(profile?.displayName || profile?.email || 'Gestionnaire Référent');
  const email = cleanText(profile?.email || 'contact@entreprise.ci');
  const phone = cleanText(profile?.phone || 'Non renseigné');
  const address = cleanText(profile?.address || profile?.city || 'Côte d\'Ivoire');

  const signDateObj = profile?.contractSignedAt ? new Date(profile.contractSignedAt) : new Date();
  const signDateStr = signDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const dueDateObj = new Date(signDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Decorative top band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. KONTROL Logo & Header
  drawKontrolLogo(doc, margin, 12, 16);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('KONTROL ERP', 35, 21);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cleanText("ÉDITÉ PAR INNOV'KORP · GESTION COMMERCIALE & TRÉSORERIE"), 35, 26);

  // Header Right
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(cleanText("CONTRAT D'ABONNEMENT OFFICIEL"), pageWidth - margin, 20, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Réf: CTR-KONTROL-${companyId.substring(0, 10).toUpperCase()}`, pageWidth - margin, 25, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 32, pageWidth - margin, 32);

  // Document Title
  let y = 40;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(cleanText("CONTRAT D'ABONNEMENT ET D'UTILISATION DU SERVICE KONTROL ERP"), pageWidth / 2, y, { align: 'center' });

  // Parties Box
  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - (margin * 2), 34, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - (margin * 2), 34, 'S');

  // Party 1: Provider
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(cleanText("ENTRE LES SOUSSIGNÉS :"), margin + 4, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("1. INNOV'KORP (L'Éditeur)", margin + 4, y + 12);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cleanText("Siège social : Abidjan, Côte d'Ivoire · Email : Innov.korp@gmail.com"), margin + 8, y + 17);

  // Party 2: Subscriber
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`2. ${companyName} (L'Abonné)`, margin + 4, y + 23);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cleanText(`Représenté par : ${managerName} · Email : ${email} · Tél : ${phone}`), margin + 8, y + 28);

  y += 40;

  // Articles
  const articles = [
    {
      title: "ARTICLE 1 : OBJET DU CONTRAT & ACCÈS AU SERVICE",
      content: "Le présent contrat régit la mise à disposition de la plateforme logicielle KONTROL ERP par INNOV'KORP au profit de l'Abonné. Ce service comprend l'accès complet aux modules de gestion commerciale, comptabilité, suivi de trésorerie, gestion de stock et facturation certifiée."
    },
    {
      title: "ARTICLE 2 : TARIF & MODALITÉS DE RÈGLEMENT",
      content: "L'accès aux services KONTROL ERP est souscrit sous la forme d'un abonnement mensuel forfaitaire fixé à 15 000 F CFA TTC par mois. Le paiement s'effectue en ligne via la plateforme GeniusPay (Mobile Money, Carte Bancaire)."
    },
    {
      title: "ARTICLE 3 : PRISE D'EFFET & ÉCHÉANCE AUTOMATIQUE À 30 JOURS",
      content: `Le présent contrat prend effet à compter de sa signature électronique le ${signDateStr}. La première échéance de paiement obligatoire est fixée exactement à 30 jours calendaires après la date de signature, soit le ${dueDateStr}.`
    },
    {
      title: "ARTICLE 4 : CONFIDENTIALITÉ & SÉCURITÉ DES REGISTRES",
      content: "INNOV'KORP garantit la confidentialité stricte des registres comptables, factures et données de trésorerie de l'Abonné. Les données sont conservées en environnement sécurisé infalsifiable conformément aux normes en vigueur."
    },
    {
      title: "ARTICLE 5 : ENGAGEMENT ET SIGNATURE ÉLECTRONIQUE",
      content: "La validation du présent document via le bouton d'acceptation de la plateforme vaut signature électronique opposable. L'Abonné certifie l'exactitude des informations fournies lors de son inscription."
    }
  ];

  articles.forEach((art) => {
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText(art.title), margin, y);

    y += 4.5;
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(cleanText(art.content), pageWidth - (margin * 2));
    doc.text(lines, margin, y);

    y += (lines.length * 4) + 4;
  });

  // Signatures section
  y += 4;
  doc.setFillColor(236, 253, 245);
  doc.rect(margin, y, pageWidth - (margin * 2), 30, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, pageWidth - (margin * 2), 30, 'S');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(cleanText("ATTESTATION DE SIGNATURE ÉLECTRONIQUE DÛMENT CERTIFIÉE"), margin + 5, y + 6);

  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cleanText(`Signé électroniquement par : ${managerName} (${companyName})`), margin + 5, y + 13);
  doc.text(cleanText(`Date & Heure de Signature : ${signDateStr}`), margin + 5, y + 18);
  doc.text(cleanText(`Prochaine échéance effective d'abonnement : ${dueDateStr}`), margin + 5, y + 23);

  // Digital Seal Badge inside box
  doc.setFillColor(16, 185, 129);
  doc.rect(pageWidth - margin - 50, y + 6, 45, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text("CONTRAT SIGNÉ", pageWidth - margin - 27.5, y + 13, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text("KONTROL VERIFIED", pageWidth - margin - 27.5, y + 18, { align: 'center' });

  // Footer
  const footerY = pageHeight - 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    cleanText(`Contrat d'Abonnement KONTROL ERP · INNOV'KORP · Certifié Conforme · Client ID: ${companyId}`),
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`Contrat_Abonnement_KONTROL_${companyName.replace(/\s+/g, '_')}.pdf`);
};
