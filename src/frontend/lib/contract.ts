import jsPDF from 'jspdf';
import { UserProfile } from '../types';

const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // removes accents e.g. é -> e
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D«»]/g, '"') // smart double quotes & French quotes
    .replace(/[\u2013\u2014]/g, '-') // dashes
    .replace(/[\u00A0\u202F]/g, ' ') // non-breaking spaces
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/°/g, '.')
    .replace(/€/g, 'EUR')
    .replace(/[^\x00-\x7F]/g, ''); // strip remaining unknown non-ASCII cleanly without introducing extra spaces
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
  const isSigned = !!profile?.contractSignedAt;
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

  // Advance vertical cursor past Parties Box (32mm height + 7mm margin)
  y += 39;

  // List of 25 detailed Articles grouped into Titles with OHADA, CGI/DGI & Ivoirian legal citations
  const sections = [
    {
      sectionTitle: "TITRE I : MENTIONS LEGALES & IDENTIFICATION DE L'EDITEUR",
      articles: [
        {
          num: "ARTICLE 1 : IDENTIFICATION DE L'EDITEUR & REGISTRE OHADA",
          text: "La plateforme applicative KONTROL ERP est entierement concue, editee et exploitee par l'entite INNOV'KORP (ci-apres \"l'Editeur\"), dont le siege social est situe a Abidjan, Cote d'Ivoire (Email : Innov.korp@gmail.com). Conformement aux dispositions des Articles 13 a 20 de l'Acte Uniforme OHADA portant Droit Commercial General (AUDCG), l'Editeur est regulierement inscrit au Registre du Commerce et du Credit Mobilier (RCCM) d'Abidjan."
        },
        {
          num: "ARTICLE 2 : HEBERGEMENT, INFRASTRUCTURE CLOUD & CYBERSECURITE",
          text: "Les infrastructures informatiques, serveurs cloud et bases de donnees de KONTROL ERP sont heberges sur des centres de donnees haute disponibilite (99,9%) avec chiffrement continu TLS/SSL, conformement aux obligations de securite et d'integrite des systemes d'information edictees par la Loi n° 2013-451 du 19 juin 2013 relative a la lutte contre la cybercriminalite en Cote d'Ivoire."
        },
        {
          num: "ARTICLE 3 : ASSISTANCE TECHNIQUE ET SUPPORT CLIENT",
          text: "L'Editeur met a la disposition de l'Abonne un service d'assistance technique et d'accompagnement client accessible via la plateforme applicative et par courrier electronique, garantissant une prise en charge diligente des demandes d'assistance sous l'empire du Code des Obligations de Cote d'Ivoire."
        }
      ]
    },
    {
      sectionTitle: "TITRE II : CONDITIONS GENERALES D'UTILISATION (CGU), FNE & ROLES",
      articles: [
        {
          num: "ARTICLE 4 : OBJET, CONFORMITE FNE DGI & CONSOLIDATION DES PME/TPE",
          text: "Les presentes CGU definissent les regles d'utilisation de KONTROL ERP. Concue pour structurer et assainir la gestion financiere et comptable des PME/TPE, la plateforme a pour objectif majeur la mise en conformite des entreprises avec l'obligation legale de la Facture Normalisee Electronique (FNE) regie par le Code General des Impots (CGI) de Cote d'Ivoire (Articles 216, 217 et suivants) et les directives de la Direction Generale des Impots (DGI)."
        },
        {
          num: "ARTICLE 5 : ACCEPTATION, FORMATION DU CONTRAT ET OPPOSABILITE",
          text: "L'utilisation des services est conditionnee par l'acceptation sans reserve des presentes CGU. Conformement aux Articles 15 a 22 de la Loi n° 2013-546 du 30 juillet 2013 relative aux transactions electroniques en Cote d'Ivoire, la validation electronique vaut consentement ferme, definitif et legalement opposable a l'Abonne."
        },
        {
          num: "ARTICLE 6 : CREATION, ACCES ET SECURISATION DES COMPTES UTILISATEURS",
          text: "L'Abonne est responsable de l'exactitude des informations fournies et de la confidentialite absolue de ses identifiants. Tout acces ou transaction realise a l'aide des identifiants de l'Abonne est repute effectue sous sa responsabilite exclusive, en application du Droit Commercial General OHADA."
        },
        {
          num: "ARTICLE 7 : HIERARCHIE INTERNE, ROLES ET POUVOIRS DE REPRESENTATION",
          text: "Conformement a l'Acte Uniforme OHADA relatif au Droit des Societes Commerciales et du GIE (AUSCGIE, Art. 121 et suiv.), les privileges applicatifs sont repartis en trois roles cles : (1) ADMINISTRATEUR ENTREPRISE : Representant legal ou dirigeant avec pouvoir total (gestion de societe, signature des contrats, validation financiere et gestion des acces) ; (2) GESTIONNAIRE ENTREPRISE : Responsable operationnel habilite a piloter les ventes, achats, factures, la tresorerie, la caisse, les stocks et les tiers ; (3) UTILISATEUR : Collaborateur ou caissier restreint aux actes d'execution quotidienne (saisie des devis, factures, encaissements)."
        },
        {
          num: "ARTICLE 8 : USAGE ACCEPTABLE ET PROTECTION DU SYSTEME AUTOMATISE",
          text: "Tout usage abusif, tentative d'extraction non autorisee, retro-ingenierie ou atteinte a l'integrite du logiciel est formellement prohibe sous peine de resiliation immediate, sans prejudice des sanctions pénales prevues par la Loi n° 2013-451 du 19 juin 2013 sur la cybercriminalite."
        },
        {
          num: "ARTICLE 9 : PROPRIETE INTELLECTUELLE ET DROITS CONCEDES",
          text: "L'ensemble du logiciel KONTROL ERP, ses algorithmes, marques et bases de donnees sont proteges par l'Annexe I de l'Accord de Bangui (OAPI). L'Abonne ne beneficie que d'un droit d'usage personnel, non exclusif, temporaire et intransferable."
        },
        {
          num: "ARTICLE 10 : DISPONIBILITE, MAINTENANCE PREVENTIVE ET EVOLUTIONS",
          text: "L'Editeur s'efforce d'assurer un acces ininterrompu au service. Les interruptions temporaires pour maintenance preventive ou mises a jour reglementaires sont notifiees via le tableau de bord sans engager la responsabilite de l'Editeur."
        }
      ]
    },
    {
      sectionTitle: "TITRE III : CONTRAT D'ABONNEMENT, PERIMETRE & MODALITES FINANCIERES",
      articles: [
        {
          num: "ARTICLE 11 : PERIMETRE EXHAUSTIF DES MODULES ET FONCTIONNALITES INCLUSES",
          text: "L'abonnement KONTROL ERP octroie un acces illimite aux modules applicatifs natifs : (1) Tableau de Bord 360° (suivi du CA, marge brute, creances, dettes, solde de tresorerie) ; (2) Ventes & Achats (Devis/Proforma, Factures de Vente, Factures d'Avoir, Bons de Commande, Recus et Repertoire Tiers Clients/Fournisseurs) ; (3) Module de Preparation FNE (conformite des mentions fiscales d'identification) ; (4) Tresorerie, Caisse & Charges (comptes bancaires/caisses, suivi des charges, attestations financieres) ; (5) Gestion des Stocks (mouvements, inventaires, valorisation) ; (6) Assistant IA KONTROL Genius (analyses financieres) ; (7) Messagerie K-Chat & Journal d'Audit des actions."
        },
        {
          num: "ARTICLE 12 : TARIFICATION FORFAITAIRE ET LIBERTE DES PRIX",
          text: "L'abonnement est concédé au tarif forfaitaire mensuel de 15 000 F CFA TTC par mois, fixe conformement a la reglementation sur la liberte des prix et de la concurrence en Cote d'Ivoire (Ordonnance n° 2013-662)."
        },
        {
          num: "ARTICLE 13 : PRISE D'EFFET & ECHEANCE EFFECTIVE D'ABONNEMENT A 30 JOURS",
          text: `Le présent contrat prend effet le ${signDateStr}. L'Abonné bénéficie d'un cycle d'utilisation dont la premiere echeance de renouvellement est imperativement fixee a 30 jours calendaires a compter de la date d'effet, soit le ${dueDateStr}.`
        },
        {
          num: "ARTICLE 14 : REGLEMENT ET MONNAIE ELECTRONIQUE UMOA / BCEAO",
          text: "Le paiement s'effectue via les moyens de reglement electroniques et monelies electroniques autorises par la BCEAO au sein de l'UMOA. La validation electronique de la transaction vaut preuve libératoire de reglement."
        },
        {
          num: "ARTICLE 15 : RECOUVREMENT DES IMPAYES ET VOIES D'EXECUTION OHADA",
          text: "En cas de defaut de paiement a l'echeance, l'Editeur suspend les fonctions d'emission de pieces. L'Editeur se reserve la faculte de poursuivre le recouvrement des impayes conformement a l'Acte Uniforme OHADA portant organisation des procedures simplifiees de recouvrement et des voies d'execution (AUPSRVE)."
        },
        {
          num: "ARTICLE 16 : FACTURATION ET PIECES JUSTIFICATIVES COMPTABLES",
          text: "Chaque reglement valide genere une quittance d'abonnement numerique conforme aux obligations du Code General des Impots (CGI) de Cote d'Ivoire, servant de piece justificative comptable."
        }
      ]
    },
    {
      sectionTitle: "TITRE IV : CONFIDENTIALITE, PROTECTION DES DONNEES & CONSERVATION",
      articles: [
        {
          num: "ARTICLE 17 : SECRET DES AFFAIRES ET CONFIDENTIALITE STRICTE",
          text: "L'Editeur s'engage au secret professionnel et a la confidentialite absolue sur les donnees financieres et commerciales de l'Abonne, conformement aux usages du commerce sous le droit OHADA."
        },
        {
          num: "ARTICLE 18 : PROPRIETE ET PROTECTION DES DONNEES A CARACTERE PERSONNEL",
          text: "L'Abonne demeure le proprietaire exclusif de ses donnees. Conformement a la Loi n° 2013-450 du 19 juin 2013 relative a la protection des donnees a caractere personnel en Cote d'Ivoire (ARTCI), l'Abonne dispose d'un droit permanent d'acces, de rectification et de suppression de ses donnees."
        },
        {
          num: "ARTICLE 19 : CONSERVATION DES LIVRES COMPTABLES (SYSCOHADA) ET SAUVEGARDES",
          text: "L'Editeur opere des sauvegardes quotidiennes. Conformement a l'Article 24 de l'Acte Uniforme OHADA relatif au droit comptable et a l'information financiere (SYSCOHADA) fixant la conservation des documents comptables a 10 ans, l'Abonne peut exporter ses donnees a tout moment."
        },
        {
          num: "ARTICLE 20 : HORODATAGE ET TRACABILITE DES REGISTRES D'AUDIT",
          text: "Chaque operation et modification sur la plateforme fait l'objet d'un horodatage numerique certifie garantissant l'integrite et la valeur probante des ecritures, conformement a la Loi n° 2013-546 sur les transactions electroniques."
        }
      ]
    },
    {
      sectionTitle: "TITRE V : RESPONSABILITES, RESILIATION, SIGNATURE & JURIDICTION",
      articles: [
        {
          num: "ARTICLE 21 : RESPONSABILITE CONTRACTUELLE ET EXCLUSIONS",
          text: "L'Editeur est tenu a une obligation de moyens. Il ne saurait etre tenu responsable des erreurs de saisie effectuees par l'Abonne ou des pertes d'exploitation indirectes."
        },
        {
          num: "ARTICLE 22 : FORCE MAJEURE SELON LA JURISPRUDENCE CCJA / OHADA",
          text: "Les parties sont exonerees de leur responsabilite en cas d'evenement de force majeure repondant aux criteres d'exteriorite, d'imprevisibilite et d'irresistibilite etablis par la jurisprudence de la Cour Commune de Justice et d'Arbitrage (CCJA) de l'OHADA."
        },
        {
          num: "ARTICLE 23 : DUREE SANS ENGAGEMENT ET LIBERTE DE RESILIATION",
          text: "Le contrat est conclu sans engagement de duree minimale. L'Abonne peut resilier a tout moment sans penalites depuis son espace d'administration, conformement aux principes du droit des contrats OHADA."
        },
        {
          num: "ARTICLE 24 : VALEUR PROBANTE DE LA SIGNATURE ELECTRONIQUE",
          text: "En application des Articles 28 a 35 de la Loi n° 2013-546 du 30 juillet 2013 relative aux transactions electroniques en Cote d'Ivoire, l'acceptation electronique du contrat par le souscripteur via le bouton \"J'accepte et je signe le contrat\" equivaut de plein droit a une signature manuscrite authentique et legale."
        },
        {
          num: "ARTICLE 25 : DROIT APPLICABLE ET ATTRIBUTION DE COMPETENCE (TRIBUNAL DE COMMERCE D'ABIDJAN)",
          text: "Le present contrat est exclusivement regi par le Droit Ivoirien et les Actes Uniformes de l'OHADA. En cas de differend relatif a sa validite, son interpretation ou son execution non resolu a l'amiable, COMPETENCE EXCLUSIVE ET ATTRIBUTION DE JURIDICTION SONT DELEGUEES AU TRIBUNAL DE COMMERCE D'ABIDJAN (TCA) (Loi n° 2014-424 portant organisation des juridictions de commerce en Cote d'Ivoire)."
        }
      ]
    }
  ];

  sections.forEach((sec) => {
    // Check space for section header + first article to avoid orphan section titles
    let firstArtHeight = 20;
    if (sec.articles.length > 0) {
      const firstLines = doc.splitTextToSize(cleanText(sec.articles[0].text), contentWidth);
      firstArtHeight = 5 + (firstLines.length * 3.6) + 4;
    }
    y = checkPageSpace(9 + firstArtHeight, y);

    // Section Header Title
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 7, 'S');

    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText(sec.sectionTitle), margin + 3, y + 4.8);
    y += 10;

    sec.articles.forEach((art) => {
      const artLines = doc.splitTextToSize(cleanText(art.text), contentWidth);
      const neededBoxHeight = 5 + (artLines.length * 3.6) + 4;

      y = checkPageSpace(neededBoxHeight, y);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(cleanText(art.num), margin, y);

      y += 4.5;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(artLines, margin, y);

      y += (artLines.length * 3.6) + 4;
    });

    y += 2;
  });

  // Signatures section on final page
  y = checkPageSpace(38, y);
  y += 2;

  if (isSigned) {
    // Green box for certified signed contract
    doc.setFillColor(236, 253, 245);
    doc.rect(margin, y, contentWidth, 30, 'F');
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentWidth, 30, 'S');

    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("ATTESTATION DE SIGNATURE ELECTRONIQUE CERTIFIEE (LOI N° 2013-546)"), margin + 4, y + 5.5);

    doc.setTextColor(4, 120, 87);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(cleanText(`Editeur : INNOV'KORP · Signature electronique certifiée apposee`), margin + 4, y + 11);
    doc.text(cleanText(`Abonné Souscripteur : ${managerName} (${companyName})`), margin + 4, y + 16);
    doc.text(cleanText(`Horodatage certifie : ${signDateStr}`), margin + 4, y + 21);
    doc.text(cleanText(`Echéance d'abonnement effective (30 jours) : ${dueDateStr}`), margin + 4, y + 26);

    // Digital Seal Badge
    doc.setFillColor(16, 185, 129);
    doc.rect(pageWidth - margin - 48, y + 6, 44, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("CONTRAT SIGNE", pageWidth - margin - 26, y + 13, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text("KONTROL VERIFIED", pageWidth - margin - 26, y + 18, { align: 'center' });
  } else {
    // Slate / Neutral box for Unsigned Draft / Specimen
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 30, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentWidth, 30, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(cleanText("PROJET DE CONTRAT · SPECIMEN NON SIGNE"), margin + 4, y + 5.5);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(cleanText(`Editeur : INNOV'KORP (Signature electronique pre-apposee)`), margin + 4, y + 11);
    doc.text(cleanText(`Abonné Souscripteur : ${companyName} (EN ATTENTE DE SIGNATURE)`), margin + 4, y + 16);
    doc.text(cleanText(`Statut actuel : Non signe par l'Abonne`), margin + 4, y + 21);
    doc.text(cleanText(`Note : La signature electronique sera validee lors de la confirmation en ligne`), margin + 4, y + 26);

    // Pending Seal Badge
    doc.setFillColor(100, 116, 139);
    doc.rect(pageWidth - margin - 48, y + 6, 44, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text("EN ATTENTE", pageWidth - margin - 26, y + 13, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text("SIGNATURE CLIENT", pageWidth - margin - 26, y + 18, { align: 'center' });
  }

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
