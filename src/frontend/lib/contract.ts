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
  const contentWidth = pageWidth - (margin * 2);

  const companyName = cleanText(profile?.companyName || profile?.companyAbbreviation || 'ENTREPRISE ABONNEE');
  const companyId = cleanText(profile?.companyId || 'ENT-KONTROL-01');
  const managerName = cleanText(profile?.displayName || profile?.email || 'Gestionnaire Referent');
  const email = cleanText(profile?.email || 'contact@entreprise.ci');
  const phone = cleanText(profile?.phone || 'Non renseigne');

  const signDateObj = profile?.contractSignedAt ? new Date(profile.contractSignedAt) : new Date();
  const signDateStr = signDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const dueDateObj = new Date(signDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  let currentPage = 1;

  const drawPageHeader = (pageNum: number) => {
    // Decorative top band
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 4, 'F');

    if (pageNum === 1) {
      drawKontrolLogo(doc, margin, 10, 14);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('KONTROL ERP', 33, 18);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(cleanText("EDITION DE SERVICE · INNOV'KORP · GESTION COMMERCIALE & TRESORERIE"), 33, 23);

      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(cleanText("CONTRAT D'ABONNEMENT KONTROL ERP"), pageWidth - margin, 18, { align: 'right' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Ref: CTR-ABN-${companyId.substring(0, 10).toUpperCase()}`, pageWidth - margin, 23, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, 28, pageWidth - margin, 28);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(cleanText("KONTROL ERP · CONTRAT D'ABONNEMENT & CONDITIONS D'UTILISATION"), margin, 12);
      doc.text(`Ref: CTR-ABN-${companyId.substring(0, 10).toUpperCase()}`, pageWidth - margin, 12, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 15, pageWidth - margin, 15);
    }
  };

  const checkPageSpace = (neededHeight: number, currentY: number): number => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      return currentPage === 2 ? 22 : 20;
    }
    return currentY;
  };

  // Start Page 1
  drawPageHeader(1);

  let y = 34;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(cleanText("CONVENTION D'ABONNEMENT ET CONDITIONS GENERALES D'UTILISATION"), pageWidth / 2, y, { align: 'center' });

  // Parties Box
  y += 5;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 32, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(cleanText("PARTIES CONTRACTANTES :"), margin + 4, y + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("1. INNOV'KORP (L'Editeur)", margin + 4, y + 11);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(cleanText("Siege social : Abidjan, Cote d'Ivoire · Email : Innov.korp@gmail.com"), margin + 8, y + 16);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`2. ${companyName} (L'Abonne)`, margin + 4, y + 22);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(cleanText(`Represente par : ${managerName} · Email : ${email} · Tel : ${phone}`), margin + 8, y + 27);

  y += 37;

  // List of 25 detailed Articles grouped into Titles
  const sections = [
    {
      sectionTitle: "TITRE I : MENTIONS LEGALES & IDENTIFICATION DE L'EDITEUR",
      articles: [
        {
          num: "ARTICLE 1 : IDENTIFICATION DE L'EDITEUR",
          text: "La plateforme applicative KONTROL ERP est entierement concue, editee, developpee et exploitee par l'entite INNOV'KORP (ci-apres \"l'Editeur\"), dont le siege social est situe a Abidjan, Cote d'Ivoire (Email de contact officiel : Innov.korp@gmail.com)."
        },
        {
          num: "ARTICLE 2 : HEBERGEMENT, INFRASTRUCTURE CLOUD & DISPONIBILITE",
          text: "Les infrastructures informatiques, serveurs cloud, bases de donnees et services applicatifs de KONTROL ERP sont heberges sur des centres de donnees securises offrant un taux de disponibilite cible de 99,9%, un chiffrement continu des communications (TLS/SSL) et une redondance geographique des sauvegardes."
        },
        {
          num: "ARTICLE 3 : ASSISTANCE TECHNIQUE ET SUPPORT CLIENT",
          text: "L'Editeur met a la disposition de l'Abonne un service d'assistance technique et d'accompagnement client directement accessible depuis l'interface KONTROL ERP ainsi que par courrier electronique, afin d'assurer le traitement des demandes de support, correctifs ou conseils d'utilisation."
        }
      ]
    },
    {
      sectionTitle: "TITRE II : CONDITIONS GENERALES D'UTILISATION (CGU)",
      articles: [
        {
          num: "ARTICLE 4 : OBJET, OBJECTIFS STRATEGIQUES & ACCOMPAGNEMENT FNE",
          text: "Les presentes CGU definissent les regles d'utilisation de KONTROL ERP. Concue specialement pour structurer la gestion des PME et TPE, la plateforme a pour objectif d'assainir la gestion commerciale, financiere et comptable des entreprises, tout en les preparant a la mise en conformite reglementaire avec la Facture Normalisee Electronique (FNE) exigee par les administrations fiscales."
        },
        {
          num: "ARTICLE 5 : ACCEPTATION, ENTREE EN VIGUEUR ET OPPOSABILITE",
          text: "L'utilisation des services de KONTROL ERP est strictement conditionnee par l'acceptation sans reserve des presentes CGU. La validation electronique effectuee par le representant habilite de l'Abonne vaut signature ferme, definitive et opposable a l'Abonne."
        },
        {
          num: "ARTICLE 6 : CREATION, ACCES ET SECURISATION DES COMPTES UTILISATEURS",
          text: "Chaque compte souscrit est propre a l'entreprise Abonnee. L'Abonne s'engage a fournir des informations exactes lors de la creation du compte et est seul responsable de la garde, de la confidentialite et de la transmission de ses identifiants de connexion. Tout acces realise au moyen des identifiants de l'Abonne est repute effectue sous sa responsabilite exclusive."
        },
        {
          num: "ARTICLE 7 : HIERARCHIE INTERNE, ROLES ET HABILITATIONS UTILISATEURS",
          text: "L'Abonne dispose d'une gestion fine des utilisateurs articulee autour de trois roles cles du logiciel : (1) ADMINISTRATEUR ENTREPRISE : Representant legal ou dirigeant avec controle total de la societe, gestion des comptes utilisateurs, signature des contrats, validation financiere et reinitialisations ; (2) GESTIONNAIRE ENTREPRISE : Responsable operationnel ou comptable habilite a piloter les transactions, valider les factures, suivre la tresorerie, les stocks et les tiers ; (3) UTILISATEUR : Collaborateur, commercial ou caissier restreint aux operations quotidiennes d'execution (saisie des devis, facturation, enregistrement des reglements)."
        },
        {
          num: "ARTICLE 8 : USAGE ACCEPTABLE, INTERDICTIONS ET COMPORTEMENTS PROHIBES",
          text: "L'Abonne s'interdit formellement toute tentative de retro-ingenierie, decompilation, extraction massive de code ou de donnees, introduction de scripts malveillants ou surcharge intentionnelle des serveurs. Tout manquement entrainera la resiliation immediate du compte sans preavis ni indemnite."
        },
        {
          num: "ARTICLE 9 : PROPRIETE INTELLECTUELLE ET DROITS CONCEDES",
          text: "L'ensemble de la plateforme KONTROL ERP, ses codes sources, interfaces graphiques, logos, marques, bases de donnees et algorithmes demeurent la propriete exclusive d'INNOV'KORP. L'Abonne ne beneficie que d'un droit d'usage personnel, non exclusif, temporaire et intransferable."
        },
        {
          num: "ARTICLE 10 : DISPONIBILITE, MAINTENANCE PREVENTIVE ET EVOLUTIONS",
          text: "L'Editeur s'efforce d'assurer un acces ininterrompu au service 24h/24 et 7j/7. Toutefois, l'Editeur se reserve le droit d'interrompre momentanement l'acces pour realiser des operations de maintenance preventive, evolutive ou corrective, en informant prealablement l'Abonne via la plateforme."
        }
      ]
    },
    {
      sectionTitle: "TITRE III : CONTRAT D'ABONNEMENT, TARIFICATION & REGLEMENT",
      articles: [
        {
          num: "ARTICLE 11 : PERIMETRE DES MODULES ET FONCTIONNALITES INCLUSES",
          text: "L'abonnement KONTROL ERP donne un acces complet aux modules natifs de l'application : (1) Tableau de Bord 360° (suivi du CA, marges, creances, dettes et solde de tresorerie) ; (2) Ventes & Achats (Devis, Factures Proforma, Factures de Vente, Factures d'Avoir, Bons de Commande, Recus et Repertoire Tiers Clients/Fournisseurs) ; (3) Module de Preparation FNE (conformite des mentions de facturation pour transmission aux impots) ; (4) Tresorerie, Caisse & Charges (suivi des comptes, charges d'exploitation, attestations financieres) ; (5) Gestion des Stocks & Mouvements (entrees/sorties, inventaires, valorisation) ; (6) Assistant IA KONTROL Genius (analyses financieres et conseils) ; (7) Messagerie d'Entreprise K-Chat & Support ; (8) Fiche Entreprise & Journal d'Audit des actions."
        },
        {
          num: "ARTICLE 12 : TARIFICATION ET CONDITIONS DE REVISION",
          text: "Le droit d'acces au service est accorde moyennant le paiement d'un abonnement mensuel forfaitaire fixe a 15 000 F CFA TTC par mois. L'Editeur se reserve la faculte de reviser ses tarifs en notifiant l'Abonne au moins 30 jours civils avant l'application du nouveau tarif."
        },
        {
          num: "ARTICLE 13 : PRISE D'EFFET & ECHEANCE EFFECTIVE D'ABONNEMENT A 30 JOURS",
          text: `Le present contrat prend effet a compter de sa signature electronique le ${signDateStr}. L'Abonne beneficie d'une periode d'utilisation dont la premiere echeance effective de renouvellement est imperativement fixee a 30 jours calendaires a compter du jour de la signature, soit le ${dueDateStr}.`
        },
        {
          num: "ARTICLE 14 : MODALITES DE REGLEMENT ET MODES DE PAIEMENT",
          text: "Le reglement des mensualites s'effectue au moyen des systemes et canaux de paiement electronique securises mis a disposition sur la plateforme. La generation de la reference de transaction validee constitue la preuve irrefragable du paiement effectif."
        },
        {
          num: "ARTICLE 15 : DEFAUT DE PAIEMENT, RETARDS ET SUSPENSION DES ACCES",
          text: "A defaut de reglement de la redevance a la date d'echeance effective fixee, l'Editeur se reserve le droit de restreindre temporairement l'acces aux fonctions d'ecriture et d'emission de pieces commerciales jusqu'a la regularisation complete des sommes dues."
        },
        {
          num: "ARTICLE 16 : FACTURATION ET QUITTANCES D'ABONNEMENT",
          text: "Chaque paiement valide donne lieu a la mise a disposition automatique d'un recu numerique d'achat d'abonnement au sein de l'espace d'administration de l'Abonne, servant de justificatif comptable et fiscal."
        }
      ]
    },
    {
      sectionTitle: "TITRE IV : CONFIDENTIALITE, TRAITEMENT DES DONNEES & SECURITE",
      articles: [
        {
          num: "ARTICLE 17 : SECRET DES AFFAIRES ET CONFIDENTIALITE STRICTE",
          text: "L'Editeur s'engage a observer la plus stricte confidentialite sur l'ensemble des donnees commerciales, financieres, comptables, clients et fournisseurs saisies ou stockees par l'Abonne au sein de son espace KONTROL ERP."
        },
        {
          num: "ARTICLE 18 : PROPRIETE ET PROTECTION DES DONNEES ENTREPRISE",
          text: "L'Abonne demeure le seul et unique proprietaire de l'ensemble de ses donnees commerciales, fichiers clients et ecritures comptables. L'Editeur ne procede a aucune vente, location ou cession de donnees a des tiers."
        },
        {
          num: "ARTICLE 19 : SAUVEGARDES AUTOMATIQUES, ARCHIVAGE ET RESTITUTION",
          text: "L'Editeur realise des sauvegardes automatisees quotidiennes. En cas de cessation ou de resiliation de l'abonnement, l'Abonne dispose d'un delai de 30 jours pour solliciter l'extraction complete de ses donnees au format standard."
        },
        {
          num: "ARTICLE 20 : HORODATAGE, TRACABILITE ET INTEGRITE DES REGISTRES",
          text: "L'ensemble des pieces commerciales et operations saisies sur KONTROL ERP fait l'objet d'un horodatage numerique infalsifiable garantissant l'integrite et la valeur probante des ecritures enregistrees."
        }
      ]
    },
    {
      sectionTitle: "TITRE V : RESPONSABILITES, RESILIATION, SIGNATURE & LITIGES",
      articles: [
        {
          num: "ARTICLE 21 : LIMITATION ET EXCLUSION DE RESPONSABILITE",
          text: "L'Editeur ne saurait etre tenu pour responsable des dommages indirects, pertes d'exploitation, manque a gagner ou erreurs de decision financiere resultant de donnees de saisie inexactes ou incompletes effectuees par les utilisateurs de l'Abonne."
        },
        {
          num: "ARTICLE 22 : CAS DE FORCE MAJEURE",
          text: "Chacune des parties sera exoneree de sa responsabilite en cas d'inexecution subie consecutive a un evenement de force majeure habituellement reconnu par la jurisprudence et les tribunaux competents."
        },
        {
          num: "ARTICLE 23 : DUREE DU CONTRAT, ROULEMENT ET MODALITES DE RESILIATION",
          text: "Le present contrat est conclu sans engagement de duree minimale de conservation. L'Abonne conserve la faculte de resilier son abonnement a tout moment directement depuis son tableau de bord d'administration sans penalites."
        },
        {
          num: "ARTICLE 24 : VALEUR PROBANTE DE LA SIGNATURE ELECTRONIQUE",
          text: "La validation du present document via le bouton d'acceptation \"J'accepte et je signe le contrat\" constitue une signature electronique pleinement valide, authentique et legalement opposable entre l'Abonne et l'Editeur."
        },
        {
          num: "ARTICLE 25 : DROIT APPLICABLE ET JURIDICTION EN CAS DE LITIGE",
          text: "Le present contrat est soumis au droit en vigueur. Tout differend relatif a sa validite, son interpretation ou son execution fera l'objet d'une recherche de solution amiable avant toute saisie des tribunaux competents."
        }
      ]
    }
  ];

  sections.forEach((sec) => {
    y = checkPageSpace(12, y);

    // Section Header Title
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText(sec.sectionTitle), margin + 3, y + 4.2);
    y += 9;

    sec.articles.forEach((art) => {
      const artLines = doc.splitTextToSize(cleanText(art.text), contentWidth);
      const neededBoxHeight = 4.5 + (artLines.length * 3.5) + 3;

      y = checkPageSpace(neededBoxHeight, y);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(cleanText(art.num), margin, y);

      y += 4;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(artLines, margin, y);

      y += (artLines.length * 3.5) + 3.5;
    });

    y += 2;
  });

  // Signatures section on final page
  y = checkPageSpace(35, y);

  y += 2;
  doc.setFillColor(236, 253, 245);
  doc.rect(margin, y, contentWidth, 28, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, contentWidth, 28, 'S');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(cleanText("ATTESTATION DE SIGNATURE ELECTRONIQUE CERTIFIEE"), margin + 4, y + 5.5);

  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(cleanText(`Signe electroniquement par : ${managerName} (${companyName})`), margin + 4, y + 12);
  doc.text(cleanText(`Date & Heure de Signature : ${signDateStr}`), margin + 4, y + 17);
  doc.text(cleanText(`Echeance d'abonnement effective : ${dueDateStr}`), margin + 4, y + 22);

  // Digital Seal Badge
  doc.setFillColor(16, 185, 129);
  doc.rect(pageWidth - margin - 48, y + 5, 44, 17, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text("CONTRAT SIGNE", pageWidth - margin - 26, y + 11.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text("KONTROL VERIFIED", pageWidth - margin - 26, y + 16, { align: 'center' });

  // Render footers & page numbers on all pages
  const totalPages = currentPage;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 10;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      cleanText(`Contrat d'Abonnement KONTROL ERP · INNOV'KORP · Client ID: ${companyId}`),
      margin,
      footerY
    );

    doc.text(
      `Page ${p} sur ${totalPages}`,
      pageWidth - margin,
      footerY,
      { align: 'right' }
    );
  }

  doc.save(`Contrat_Abonnement_KONTROL_${companyName.replace(/\s+/g, '_')}.pdf`);
};
