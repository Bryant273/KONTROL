import React, { useState } from 'react';
import { X, CheckCircle2, Download, FileText, Building2, ShieldCheck, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
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

  if (!isOpen || !profile) return null;

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
      const updateData = {
        contractSignedAt: now,
        contractSignedBy: managerName,
        subscriptionNextDueDate: nextDueDate,
        updatedAt: now
      };

      await updateDoc(userRef, updateData);

      if (profile.companyId) {
        try {
          const compRef = doc(db, 'companies', profile.companyId);
          await updateDoc(compRef, {
            contractSignedAt: now,
            contractSignedBy: managerName,
            subscriptionNextDueDate: nextDueDate
          });
        } catch (compErr) {
          console.warn("Company contract update notice:", compErr);
        }
      }

      const updatedProfile: UserProfile = {
        ...profile,
        contractSignedAt: now,
        contractSignedBy: managerName,
        subscriptionNextDueDate: nextDueDate
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
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-kontrol-dark/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-kontrol-border w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-kontrol-dark via-slate-900 to-kontrol-blue p-6 text-white relative">
          {!isMandatoryPopup && (
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-kontrol-blue/20 border border-kontrol-blue/40 rounded-xl">
              <FileText className="text-kontrol-blue" size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-kontrol-blue uppercase">DOCUMENT OFFICIEL</span>
              <h2 className="text-xl font-extrabold">Contrat d'Abonnement KONTROL ERP</h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Convention d'utilisation et d'accès aux services de gestion commerciale et trésorerie édités par INNOV'KORP.
          </p>
        </div>

        {/* Company & Signer Data Card */}
        <div className="bg-slate-50 border-b border-kontrol-border p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider block">Prestataire / Éditeur</span>
            <p className="font-extrabold text-kontrol-dark">INNOV'KORP</p>
            <p className="text-kontrol-ink-soft">Siège social: Abidjan, Côte d'Ivoire</p>
            <p className="text-kontrol-ink-soft">Email: Innov.korp@gmail.com</p>
          </div>

          <div className="space-y-1 md:border-l md:border-kontrol-border md:pl-4">
            <span className="text-[10px] font-bold text-kontrol-blue uppercase tracking-wider block">Abonné Souscripteur</span>
            <p className="font-extrabold text-kontrol-blue flex items-center gap-1.5">
              <Building2 size={13} /> {companyName}
            </p>
            <p className="text-kontrol-ink-soft">Représentant: <span className="font-semibold">{managerName}</span></p>
            <p className="text-kontrol-ink-soft">Email: {profile.email}</p>
          </div>
        </div>

        {/* Contract Text Scrollable Area */}
        <div className="p-6 max-h-[380px] overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed custom-scrollbar bg-white">
          <section className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/80 text-blue-900">
            <h4 className="font-extrabold text-sm mb-1 text-blue-950 flex items-center gap-2">
              <Sparkles size={16} className="text-kontrol-blue" />
              RÉSUMÉ DES CONDITIONS D'ABONNEMENT
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Tarif Mensuel :</strong> 15 000 F CFA TTC / mois via GeniusPay.</li>
              <li><strong>Échéance Effective :</strong> Exactement <strong>30 jours à compter de la date de signature</strong> ({dueDateFormatted}).</li>
              <li><strong>Accès complet :</strong> Modules Ventes, Achats, Facturation, Trésorerie, Stocks et Assistant IA.</li>
            </ul>
          </section>

          <div>
            <h4 className="font-bold text-sm text-kontrol-dark mb-1">ARTICLE 1 : OBJET DU CONTRAT & ACCÈS AU SERVICE</h4>
            <p className="text-slate-600">
              Le présent contrat régit les conditions d'accès et d'utilisation de la solution cloud KONTROL ERP, éditée par INNOV'KORP, au profit de l'Abonné. KONTROL ERP fournit des outils de gestion commerciale, comptabilité certifiée, trésorerie et pilotage d'entreprise.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-kontrol-dark mb-1">ARTICLE 2 : TARIF & MODALITÉS DE PAIEMENT</h4>
            <p className="text-slate-600">
              L'utilisation du service KONTROL ERP est soumise à un abonnement mensuel forfaitaire fixé à <strong>15 000 FCFA TTC / mois</strong>. Le paiement s'effectue exclusivement en ligne via la passerelle de paiement sécurisée intégrée <strong>GeniusPay</strong> (Mobile Money, Carte Bancaire).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-kontrol-dark mb-1">ARTICLE 3 : PRISE D'EFFET & ÉCHÉANCE FIXÉE À 30 JOURS</h4>
            <p className="text-slate-600">
              Le présent contrat prend effet de plein droit dès sa signature électronique. L'entreprise dispose d'une période initiale effective de <strong>30 jours calendaires</strong>. La première échéance de renouvellement est fixée au <strong>{dueDateFormatted}</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-kontrol-dark mb-1">ARTICLE 4 : CONFIDENTIALITÉ & SÉCURITÉ DES DONNÉES</h4>
            <p className="text-slate-600">
              INNOV'KORP s'engage à préserver la confidentialité absolue des données de trésorerie, factures et fichiers clients enregistrés par l'Abonné. Les données sont hébergées sur des serveurs hautement sécurisés avec chiffrement de bout en bout.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-kontrol-dark mb-1">ARTICLE 5 : VALEUR PROBANTE DE LA SIGNATURE ÉLECTRONIQUE</h4>
            <p className="text-slate-600">
              La validation électronique du présent contrat via le bouton "J'accepte et je signe le contrat" constitue une signature numérique valide et opposable, engagée librement par le représentant légal de l'Abonné.
            </p>
          </div>
        </div>

        {/* Footer Actions / Agreement */}
        <div className="p-5 bg-slate-50 border-t border-kontrol-border flex flex-col gap-4">
          
          {isSigned ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900">
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
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border border-kontrol-border hover:border-kontrol-blue/50 transition-all">
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

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
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
