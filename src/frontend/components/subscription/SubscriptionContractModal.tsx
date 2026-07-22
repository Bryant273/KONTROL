import React, { useState } from 'react';
import { X, CheckCircle2, Download, FileText, Building2, ShieldCheck, Calendar, ArrowRight, Sparkles, FileCheck, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../../api/firebase';
import { UserProfile } from '../../types';
import { generateContractPDF } from '../../lib/contract';
import { toast } from 'sonner';

interface SubscriptionContractModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSigned?: (updatedProfile: UserProfile) => void;
  isMandatoryPopup?: boolean;
}

export const SubscriptionContractModal: React.FC<SubscriptionContractModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSigned,
  isMandatoryPopup = false
}) => {
  const [signing, setSigning] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState<string>(
    profile?.companySignature || profile?.signatureUrl || ''
  );

  React.useEffect(() => {
    if (profile?.companySignature || profile?.signatureUrl) {
      setUploadedSignature(profile.companySignature || profile.signatureUrl || '');
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner un fichier image valide (PNG, JPEG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image de la signature ne doit pas dépasser 5 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedSignature(dataUrl);
      toast.success("Signature officielle importée avec succès ! Elle apparaîtra sur vos contrats et factures.");
    };
    reader.readAsDataURL(file);
  };

  const isSigned = Boolean(profile.contractSignedAt);
  const signDate = profile.contractSignedAt ? new Date(profile.contractSignedAt) : new Date();
  const signDateFormatted = signDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Due date is 30 days after signature
  const dueDate = new Date(signDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateFormatted = dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const companyName = profile.companyName || profile.companyAbbreviation || 'Votre Entreprise';
  const managerName = profile.displayName || profile.email;

  const handleSignContract = async () => {
    if (!agreedTerms && !isSigned) {
      toast.error("Veuillez cocher la case d'acceptation des termes du contrat.");
      return;
    }

    try {
      setSigning(true);
      const now = Date.now();
      const nextDueDate = now + 30 * 24 * 60 * 60 * 1000;

      const userRef = doc(db, 'users', profile.uid);
      const updateData: any = {
        contractSignedAt: now,
        contractSignedBy: managerName,
        subscriptionNextDueDate: nextDueDate,
        updatedAt: now
      };

      if (uploadedSignature) {
        updateData.companySignature = uploadedSignature;
        updateData.signatureUrl = uploadedSignature;
      }

      await updateDoc(userRef, updateData);

      if (profile.companyId) {
        try {
          const compRef = doc(db, 'companies', profile.companyId);
          const companyUpdateData: any = {
            contractSignedAt: now,
            contractSignedBy: managerName,
            subscriptionNextDueDate: nextDueDate
          };
          if (uploadedSignature) {
            companyUpdateData.companySignature = uploadedSignature;
            companyUpdateData.signatureUrl = uploadedSignature;
          }
          await updateDoc(compRef, companyUpdateData);
        } catch (compErr) {
          console.warn("Company contract update notice:", compErr);
        }
      }

      const updatedProfile: UserProfile = {
        ...profile,
        contractSignedAt: now,
        contractSignedBy: managerName,
        subscriptionNextDueDate: nextDueDate,
        companySignature: uploadedSignature || profile.companySignature,
        signatureUrl: uploadedSignature || profile.signatureUrl
      };

      toast.success("Contrat d'abonnement KONTROL signé avec succès ! Échéance fixée à 30 jours.");
      
      if (onSigned) {
        onSigned(updatedProfile);
      }
      
      // Generate PDF copy
      generateContractPDF(updatedProfile);

      onClose();
    } catch (err) {
      console.error("Signature error:", err);
      toast.error("Erreur lors de la signature du contrat.");
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`, auth.currentUser, false);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-kontrol-dark/70 backdrop-blur-md p-3 sm:p-5 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-kontrol-border w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           {/* Compact Fixed Header */}
        <div className="shrink-0 bg-kontrol-dark text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b border-slate-800 z-10">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-kontrol-blue/20 border border-kontrol-blue/40 rounded-lg shrink-0">
              <FileText className="text-kontrol-blue" size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                Contrat d'Abonnement KONTROL ERP
              </h2>
              <p className="text-[11px] text-slate-300">
                Convention d'utilisation et de service · INNOV'KORP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isSigned 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {isSigned ? 'Contrat Signé' : 'À Signer'}
            </span>
            {!isMandatoryPopup && (
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Fermer"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Contract Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-700 leading-relaxed custom-scrollbar bg-white min-h-0">
          
          {/* Scrollable Document Card Header */}
          <div className="bg-slate-50 border border-kontrol-border rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-kontrol-blue uppercase block">CONVENTION DE SERVICE OFFICIELLE</span>
                <h3 className="text-base font-extrabold text-kontrol-dark">Contrat d'Abonnement KONTROL ERP</h3>
              </div>
              <div className="text-left sm:text-right text-[11px] text-slate-500">
                <p>Réf : <span className="font-mono font-semibold text-slate-700">CTR-ABN-{profile.uid.substring(0,8).toUpperCase()}</span></p>
                <p>Échéance 1er cycle : <span className="font-semibold text-slate-700">{dueDateFormatted}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider block">Prestataire / Éditeur</span>
                <p className="font-extrabold text-kontrol-dark">INNOV'KORP</p>
                <p className="text-kontrol-ink-soft">Siège social : Abidjan, Côte d'Ivoire</p>
                <p className="text-kontrol-ink-soft">Email : Innov.korp@gmail.com</p>
              </div>

              <div className="space-y-0.5 md:border-l md:border-kontrol-border md:pl-4">
                <span className="text-[10px] font-bold text-kontrol-blue uppercase tracking-wider block">Abonné Souscripteur</span>
                <p className="font-extrabold text-kontrol-blue flex items-center gap-1.5">
                  <Building2 size={13} /> {companyName}
                </p>
                <p className="text-kontrol-ink-soft">Représentant : <span className="font-semibold">{managerName}</span></p>
                <p className="text-kontrol-ink-soft">Email : {profile.email}</p>
              </div>
            </div>
          </div>

          {/* Executive Summary Box */}
          <section className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 text-blue-900 shadow-sm">
            <h4 className="font-extrabold text-xs sm:text-sm mb-1.5 text-blue-950 flex items-center gap-2">
              <Sparkles size={16} className="text-kontrol-blue shrink-0" />
              RÉSUMÉ EXÉCUTIF DU CONTRAT D'ABONNEMENT
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Ensemble Contractuel :</strong> Regroupe les conditions d'utilisation, les mentions légales et le contrat d'abonnement.</li>
              <li><strong>Objectif Majeur :</strong> Structurer la gestion financière des TPE/PME et assurer leur préparation à la <strong>Facture Normalisée Électronique (FNE)</strong>.</li>
              <li><strong>Tarif Forfaitaire :</strong> 15 000 F CFA TTC / mois via les systèmes de paiement sécurisés de la plateforme.</li>
              <li><strong>Période & Échéance :</strong> Fixée impérativement à <strong>30 jours calendaires après signature</strong> ({dueDateFormatted}).</li>
              <li><strong>Modules Inclus :</strong> Tableau de Bord 360°, Ventes (Devis/Factures/Proforma/Avoirs), Achats, Trésorerie & Caisse, Charges, Stocks, IA KONTROL Genius, K-Chat & Journal d'Audit.</li>
            </ul>
          </section>

          {/* TITRE I */}
          <div className="space-y-3">
            <div className="px-3 py-1.5 bg-slate-100 border-l-4 border-kontrol-blue rounded-r-lg font-extrabold text-xs text-kontrol-dark uppercase tracking-wide">
              TITRE I : MENTIONS LÉGALES & IDENTIFICATION DE L'ÉDITEUR
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 1 : IDENTIFICATION DE L'ÉDITEUR</h5>
              <p className="text-slate-600 leading-relaxed">
                La plateforme applicative KONTROL ERP est entièrement conçue, éditée, développée et exploitée par l'entité <strong>INNOV'KORP</strong> (ci-après "l'Éditeur"), dont le siège social est situé à Abidjan, Côte d'Ivoire (Email de contact officiel : Innov.korp@gmail.com).
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 2 : HÉBERGEMENT, INFRASTRUCTURE CLOUD & DISPONIBILITÉ</h5>
              <p className="text-slate-600 leading-relaxed">
                Les infrastructures informatiques, serveurs cloud, bases de données et services applicatifs de KONTROL ERP sont hébergés sur des centres de données sécurisés offrant un taux de disponibilité cible de 99,9%, un chiffrement continu des communications (TLS/SSL) et une redondance géographique des sauvegardes.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 3 : ASSISTANCE TECHNIQUE ET SUPPORT CLIENT</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Éditeur met à la disposition de l'Abonné un service d'assistance technique et d'accompagnement client directement accessible depuis l'interface KONTROL ERP ainsi que par courrier électronique, afin d'assurer le traitement des demandes de support, correctifs ou conseils d'utilisation.
              </p>
            </div>
          </div>

          {/* TITRE II */}
          <div className="space-y-3">
            <div className="px-3 py-1.5 bg-slate-100 border-l-4 border-kontrol-blue rounded-r-lg font-extrabold text-xs text-kontrol-dark uppercase tracking-wide">
              TITRE II : CONDITIONS GÉNÉRALES D'UTILISATION (CGU)
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 4 : OBJET, OBJECTIFS STRATÉGIQUES & ACCOMPAGNEMENT FNE</h5>
              <p className="text-slate-600 leading-relaxed">
                Les présentes CGU définissent les règles d'accès, d'utilisation et de navigation sur l'ensemble des modules de KONTROL ERP. Conçue spécialement pour soutenir et formaliser la gestion des petites et moyennes entreprises (TPE/PME), la plateforme a pour objectif d'assainir la gestion commerciale, financière et comptable des souscripteurs, tout en les préparant à l'adoption réglementaire progressive de la <strong>Facture Normalisée Électronique (FNE)</strong> exigée par la Direction Générale des Impôts (DGI).
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 5 : ACCEPTATION, ENTRÉE EN VIGUEUR ET OPPOSABILITÉ</h5>
              <p className="text-slate-600 leading-relaxed">
                L'utilisation des services de KONTROL ERP est strictement conditionnée par l'acceptation sans réserve des présentes CGU. La validation électronique effectuée par le représentant habilité de l'Abonné vaut signature ferme, définitive et opposable à l'Abonné.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 6 : CRÉATION, ACCÈS ET SÉCURISATION DES COMPTES UTILISATEURS</h5>
              <p className="text-slate-600 leading-relaxed">
                Chaque compte souscrit est propre à l'entreprise Abonnée. L'Abonné s'engage à fournir des informations exactes lors de la création du compte et est seul responsable de la garde, de la confidentialité et de la transmission de ses identifiants de connexion. Tout accès réalisé au moyen des identifiants de l'Abonné est réputé effectué sous sa responsabilité exclusive.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 7 : HIÉRARCHIE INTERNE, RÔLES ET HABILITATIONS UTILISATEURS</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Abonné bénéficie d'une gestion fine des utilisateurs structurée autour de trois rôles applicatifs natifs :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li><strong>ADMINISTRATEUR ENTREPRISE :</strong> Dirigeant ou représentant légal disposant des droits maximaux (administration de la société, création/modification des comptes utilisateurs, signature du contrat d'abonnement, accès financier complet et réinitialisations).</li>
                <li><strong>GESTIONNAIRE ENTREPRISE :</strong> Manager ou responsable comptable habilité à piloter les transactions (ventes, achats, factures), gérer la trésorerie, la caisse, les stocks et le répertoire tiers clients/fournisseurs.</li>
                <li><strong>UTILISATEUR :</strong> Collaborateur, commercial ou caissier restreint aux opérations d'exécution quotidienne (saisie des devis, émission des factures clients, enregistrement des règlements et consultation du catalogue produits).</li>
              </ul>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 8 : USAGE ACCEPTABLE, INTERDICTIONS ET COMPORTEMENTS PROHIBÉS</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Abonné s'interdit formellement toute tentative de rétro-ingénierie, décompilation, extraction massive de code ou de données, introduction de scripts malveillants ou surcharge intentionnelle des serveurs. Tout manquement entraînera la suspension immédiate du compte sans préavis ni indemnité.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 9 : PROPRIÉTÉ INTELLECTUELLE ET DROITS CONCÉDÉS</h5>
              <p className="text-slate-600 leading-relaxed">
                L'ensemble de la plateforme KONTROL ERP, ses codes sources, interfaces graphiques, logos, marques, bases de données et algorithmes demeurent la propriété exclusive d'INNOV'KORP. L'Abonné ne bénéficie que d'un droit d'usage personnel, non exclusif, temporaire et intransférable.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 10 : DISPONIBILITÉ, MAINTENANCE PRÉVENTIVE ET ÉVOLUTIONS</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Éditeur s'efforce d'assurer un accès ininterrompu au service 24h/24 et 7j/7. Toutefois, l'Éditeur se réserve le droit d'interrompre momentanément l'accès pour réaliser des opérations de maintenance préventive, évolutive ou corrective, en informant préalablement l'Abonné via la plateforme.
              </p>
            </div>
          </div>

          {/* TITRE III */}
          <div className="space-y-3">
            <div className="px-3 py-1.5 bg-slate-100 border-l-4 border-kontrol-blue rounded-r-lg font-extrabold text-xs text-kontrol-dark uppercase tracking-wide">
              TITRE III : CONTRAT D'ABONNEMENT, TARIFICATION & RÈGLEMENT
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 11 : PÉRIMÈTRE ET FONCTIONNALITÉS DES MODULES INCLUS</h5>
              <p className="text-slate-600 leading-relaxed">
                L'abonnement KONTROL ERP octroie un accès illimité aux fonctionnalités opérationnelles disponibles dans le logiciel :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li><strong>Tableau de Bord 360° :</strong> Suivi en temps réel des indicateurs clés (CA, marge brute, créances clients, dettes fournisseurs et solde de trésorerie).</li>
                <li><strong>Gestion Commerciale Ventes & Achats :</strong> Répertoire Tiers (Clients & Fournisseurs), Catalogue Produits/Services, Devis, Factures Proforma, Factures de Vente, Factures d'Avoir, Bons de Commande et Reçus.</li>
                <li><strong>Préparation FNE :</strong> Formalisation des mentions obligatoire et conformité des pièces pour la transmission fiscale.</li>
                <li><strong>Trésorerie, Caisse & Charges :</strong> Suivi des comptes bancaires et caisses, enregistrement des dépenses, rapports de solvabilité et attestations financières.</li>
                <li><strong>Gestion des Stocks :</strong> Suivi des mouvements (entrées/sorties), inventaires, réassorts et valorisation du stock.</li>
                <li><strong>Assistant IA KONTROL Genius :</strong> Analyses prédictives des ventes, détection d'anomalies de trésorerie et conseils de gestion.</li>
                <li><strong>Communication & Administration :</strong> Messagerie interne K-Chat, support par tickets, fiche entreprise Hub et Journal d'Audit des opérations.</li>
              </ul>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 12 : TARIFICATION ET CONDITIONS DE RÉVISION</h5>
              <p className="text-slate-600 leading-relaxed">
                Le droit d'accès au service est accordé moyennant le paiement d'un abonnement mensuel forfaitaire fixé à <strong>15 000 F CFA TTC par mois</strong>. L'Éditeur se réserve la faculté de réviser ses tarifs en notifiant l'Abonné au moins 30 jours civils avant l'application du nouveau tarif.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 13 : PRISE D'EFFET & ÉCHÉANCE EFFECTIVE D'ABONNEMENT À 30 JOURS</h5>
              <p className="text-slate-600 leading-relaxed">
                Le présent contrat prend effet à compter de sa signature électronique. L'Abonné bénéficie d'une période d'utilisation dont la première échéance effective de renouvellement est impérativement fixée à 30 jours calendaires à compter du jour de la signature, soit le <strong>{dueDateFormatted}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 14 : MODALITÉS DE RÈGLEMENT ET MODES DE PAIEMENT</h5>
              <p className="text-slate-600 leading-relaxed">
                Le règlement des mensualités s'effectue au moyen des systèmes et canaux de paiement électronique sécurisés mis à disposition sur la plateforme. La génération de la référence de transaction validée constitue la preuve irréfragable du paiement effectif.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 15 : DÉFAUT DE PAIEMENT, RETARDS ET SUSPENSION DES ACCÈS</h5>
              <p className="text-slate-600 leading-relaxed">
                À défaut de règlement de la redevance à la date d'échéance effective fixée, l'Éditeur se réserve le droit de restreindre temporairement l'accès aux fonctions d'écriture et d'émission de pièces commerciales jusqu'à la régularisation complète des sommes dues.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 16 : FACTURATION ET QUITTANCES D'ABONNEMENT</h5>
              <p className="text-slate-600 leading-relaxed">
                Chaque paiement validé donne lieu à la mise à disposition automatique d'un reçu numérique d'achat d'abonnement au sein de l'espace d'administration de l'Abonné, servant de justificatif comptable et fiscal.
              </p>
            </div>
          </div>

          {/* TITRE IV */}
          <div className="space-y-3">
            <div className="px-3 py-1.5 bg-slate-100 border-l-4 border-kontrol-blue rounded-r-lg font-extrabold text-xs text-kontrol-dark uppercase tracking-wide">
              TITRE IV : CONFIDENTIALITÉ, TRAITEMENT DES DONNÉES & SÉCURITÉ
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 17 : SECRET DES AFFAIRES ET CONFIDENTIALITÉ STRICTE</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Éditeur s'engage à observer la plus stricte confidentialité sur l'ensemble des données commerciales, financières, comptables, clients et fournisseurs saisies ou stockées par l'Abonné au sein de son espace KONTROL ERP.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 18 : PROPRIÉTÉ ET PROTECTION DES DONNÉES ENTREPRISE</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Abonné demeure le seul et unique propriétaire de l'ensemble de ses données commerciales, fichiers clients et écritures comptables. L'Éditeur ne procède à aucune vente, location ou cession de données à des tiers.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 19 : SAUVEGARDES AUTOMATIQUES, ARCHIVAGE ET RESTITUTION</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Éditeur réalise des sauvegardes automatisées quotidiennes. En cas de cessation ou de résiliation de l'abonnement, l'Abonné dispose d'un délai de 30 jours pour solliciter l'extraction complète de ses données au format standard.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 20 : HORODATAGE, TRAÇABILITÉ ET INTÉGRITÉ DES REGISTRES</h5>
              <p className="text-slate-600 leading-relaxed">
                L'ensemble des pièces commerciales et opérations saisies sur KONTROL ERP fait l'objet d'un horodatage numérique infalsifiable garantissant l'intégrité et la valeur probante des écritures enregistrées.
              </p>
            </div>
          </div>

          {/* TITRE V */}
          <div className="space-y-3">
            <div className="px-3 py-1.5 bg-slate-100 border-l-4 border-kontrol-blue rounded-r-lg font-extrabold text-xs text-kontrol-dark uppercase tracking-wide">
              TITRE V : RESPONSABILITÉS, RÉSILIATION, SIGNATURE & LITIGES
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 21 : LIMITATION ET EXCLUSION DE RESPONSABILITÉ</h5>
              <p className="text-slate-600 leading-relaxed">
                L'Éditeur ne saurait être tenu pour responsable des dommages indirects, pertes d'exploitation, manque à gagner ou erreurs de décision financière résultant de données de saisie inexactes ou incomplètes effectuées par les utilisateurs de l'Abonné.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 22 : CAS DE FORCE MAJEURE</h5>
              <p className="text-slate-600 leading-relaxed">
                Chacune des parties sera exonérée de sa responsabilité en cas d'inexécution subie consécutive à un événement de force majeure habituellement reconnu par la jurisprudence et les tribunaux compétents.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 23 : DURÉE DU CONTRAT, ROULEMENT ET MODALITES DE RÉSILIATION</h5>
              <p className="text-slate-600 leading-relaxed">
                Le présent contrat est conclu sans engagement de durée minimale de conservation. L'Abonné conserve la faculté de résilier son abonnement à tout moment directement depuis son tableau de bord d'administration sans pénalités.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 24 : VALEUR PROBANTE DE LA SIGNATURE ÉLECTRONIQUE</h5>
              <p className="text-slate-600 leading-relaxed">
                En application des <strong>Articles 28 à 35 de la Loi n° 2013-546 du 30 juillet 2013 relative aux transactions électroniques en Côte d'Ivoire</strong>, la validation du présent document via le bouton d'acceptation "J'accepte et je signe le contrat" équivaut de plein droit à une signature manuscrite authentique, certifiée et légalement opposable entre l'Abonné et l'Éditeur.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-xs text-kontrol-dark">ARTICLE 25 : DROIT APPLICABLE ET JURIDICTION EN CAS DE LITIGE</h5>
              <p className="text-slate-600 leading-relaxed">
                Le présent contrat est exclusivement régi par le <strong>Droit Ivoirien</strong> et les <strong>Actes Uniformes de l'OHADA</strong>. En cas de différend relatif à sa validite, son interprétation ou son exécution non résolu à l'amiable, <strong>COMPÉTENCE EXCLUSIVE ET ATTRIBUTION DE JURIDICTION SONT DÉLÉGUÉES AU TRIBUNAL DE COMMERCE D'ABIDJAN (TCA)</strong> (Loi n° 2014-424 portant organisation et fonctionnement des juridictions de commerce en Côte d'Ivoire).
              </p>
            </div>

            {/* Interactive Company Signature Upload Box */}
            <div className="mt-5 p-4 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/40 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Upload size={16} className="text-blue-600 shrink-0" />
                    <h5 className="font-extrabold text-xs text-blue-950 uppercase tracking-wide">
                      Signature Officielle & Cachet de l'Entreprise
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Importez une image de votre signature manuscrite ou tampon d'entreprise (PNG/JPG). Elle sera liée et imprimée sur ce contrat ainsi que sur l'ensemble de vos devis et factures.
                  </p>
                </div>

                <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-xs shrink-0 flex items-center justify-center gap-2 active:scale-95">
                  <Upload size={14} />
                  <span>{uploadedSignature ? "Changer la signature" : "Importer l'image"}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {uploadedSignature && (
                <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-blue-200 shadow-2xs">
                  <div className="w-28 h-12 bg-slate-50 rounded-lg border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={uploadedSignature} alt="Signature Entreprise" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="text-[11px] text-slate-700 space-y-0.5">
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Image de signature valide & prête
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Apposée automatiquement sur vos documents officiels, factures et états.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedSignature('')}
                    className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">Effacer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Visual Signature Stamps in Contract Modal */}
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <FileCheck size={16} className="text-kontrol-blue" />
                Signatures & Cachets Électroniques des Parties
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Editor Stamp */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Pour l'Éditeur (INNOV'KORP)</span>
                  <p className="font-extrabold text-slate-900">INNOV'KORP Côte d'Ivoire</p>
                  <p className="text-[11px] text-slate-500">Signé électroniquement via la plateforme KONTROL ERP</p>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-200 mt-1">
                    <CheckCircle2 size={12} /> Cachet Éditeur Certifié
                  </div>
                </div>

                {/* Subscriber Stamp */}
                {isSigned ? (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Pour l'Abonné (Souscripteur)</span>
                    <p className="font-extrabold text-emerald-950">{companyName}</p>
                    <p className="text-[11px] text-emerald-800">Représenté par : <strong>{profile.contractSignedBy || managerName}</strong></p>
                    
                    {uploadedSignature && (
                      <div className="my-1.5 p-1.5 bg-white rounded-lg border border-emerald-200/80 inline-block">
                        <img src={uploadedSignature} alt="Signature Officielle" className="h-10 max-w-[140px] object-contain" />
                      </div>
                    )}

                    <p className="text-[10px] text-emerald-700">Horodatage : {signDateFormatted}</p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded shadow-xs mt-1">
                      <ShieldCheck size={12} /> Contrat Signé & Approuvé
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded-lg border border-dashed border-slate-300 space-y-2 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pour l'Abonné (Souscripteur)</span>
                    <p className="font-bold text-slate-700">{companyName}</p>
                    
                    {uploadedSignature ? (
                      <div className="my-1 p-1 bg-white rounded border border-slate-200 inline-block self-start">
                        <img src={uploadedSignature} alt="Signature Officielle" className="h-9 max-w-[120px] object-contain" />
                        <span className="text-[9px] text-emerald-700 font-bold block text-center">Prête à être apposée</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">En attente d'acceptation et de signature ci-dessous</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer Actions / Agreement */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-kontrol-border flex flex-col gap-3">
          
          {isSigned ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900">
              <div className="flex items-center gap-3">
                <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-xs">Contrat officiel d'abonnement signé !</p>
                  <p className="text-[11px] text-emerald-700">
                    Signé le {signDateFormatted} par {profile.contractSignedBy || managerName}. Échéance : {dueDateFormatted}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => generateContractPDF(profile)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm w-full sm:w-auto"
                >
                  <Download size={14} /> PDF du Contrat
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-100 transition-all w-full sm:w-auto"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border border-kontrol-border hover:border-kontrol-blue/50 transition-all shadow-sm">
                <input 
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-kontrol-blue rounded border-slate-300 focus:ring-kontrol-blue"
                />
                <span className="text-xs text-slate-700 font-medium leading-normal">
                  Je certifie être le représentant légal de <strong className="text-kontrol-dark">{companyName}</strong>, avoir lu et accepté l'ensemble des clauses du présent contrat d'abonnement KONTROL ERP.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => generateContractPDF(profile)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-200/60 font-bold rounded-xl text-xs flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
                >
                  <Download size={14} /> Aperçu PDF
                </button>

                <button
                  type="button"
                  disabled={!agreedTerms || signing}
                  onClick={handleSignContract}
                  className="px-6 py-2.5 bg-gradient-to-r from-kontrol-blue to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                >
                  {signing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> J'accepte et je signe le contrat
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
