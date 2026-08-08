import React, { useState } from 'react';
import { Rocket, FileText, CheckCircle2, ShieldCheck, Download, Upload, Trash2, ArrowRight, Loader2, LogOut, FileCheck, Sparkles, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../api/firebase';
import { UserProfile } from '../../types';
import { generateContractPDF } from '../../lib/contract';
import { toast } from 'sonner';

interface SubscriptionContractPageProps {
  profile: UserProfile;
  onSigned: (updatedProfile: UserProfile) => void;
  onLogout: () => void;
}

export const SubscriptionContractPage: React.FC<SubscriptionContractPageProps> = ({ profile, onSigned, onLogout }) => {
  const [signing, setSigning] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState<string>(
    profile.companySignature || profile.signatureUrl || ''
  );

  const isSigned = Boolean(profile.contractSignedAt);
  const signDate = profile.contractSignedAt ? new Date(profile.contractSignedAt) : new Date();
  const signDateFormatted = signDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const dueDate = new Date(signDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateFormatted = dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const companyName = profile.companyName || profile.companyAbbreviation || 'Votre Entreprise';
  const managerName = profile.displayName || profile.email;

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
      toast.success("Signature officielle importée avec succès !");
    };
    reader.readAsDataURL(file);
  };

  const handleSignContract = async () => {
    if (!agreedTerms && !isSigned) {
      toast.error("Veuillez cocher la case d'acceptation des termes du contrat d'abonnement.");
      return;
    }

    setSigning(true);
    const now = Date.now();
    const nextDueDate = now + 30 * 24 * 60 * 60 * 1000;

    const updatedProfile: UserProfile = {
      ...profile,
      contractSignedAt: now,
      contractSignedBy: managerName,
      subscriptionStatus: 'ACTIVE',
      subscriptionNextDueDate: nextDueDate,
      subscriptionEndDate: nextDueDate,
      companySignature: uploadedSignature || profile.companySignature,
      signatureUrl: uploadedSignature || profile.signatureUrl
    };

    try {
      localStorage.setItem('kontrol_profile_cache', JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn("Local profile cache warning:", e);
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const updateData: any = {
        contractSignedAt: now,
        contractSignedBy: managerName,
        subscriptionStatus: 'ACTIVE',
        subscriptionNextDueDate: nextDueDate,
        subscriptionEndDate: nextDueDate,
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
    } catch (err) {
      console.warn("Firestore contract update warning:", err);
    } finally {
      setSigning(false);
      toast.success("Contrat d'abonnement KONTROL signé avec succès ! Abonnement actif 30 jours.");
      
      try {
        generateContractPDF(updatedProfile);
      } catch (pdfErr) {
        console.warn("Contract PDF auto generation notice:", pdfErr);
      }

      onSigned(updatedProfile);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Stepper */}
      <div className="max-w-4xl mx-auto w-full mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-kontrol-blue via-indigo-600 to-kontrol-orange flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Rocket size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white uppercase">KONTROL <span className="text-kontrol-orange">ERP</span></span>
              <p className="text-xs text-slate-400 font-medium">Contrat d'Abonnement Service SaaS</p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>

        {/* Stepper Wizard */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Étape 1</p>
              <p className="text-xs font-extrabold truncate">Inscription</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Étape 2</p>
              <p className="text-xs font-extrabold truncate">Entreprise</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-kontrol-blue/20 border border-kontrol-blue/40 text-white shadow-lg shadow-blue-500/10">
            <div className="w-5 h-5 rounded-full bg-kontrol-blue text-white flex items-center justify-center text-[10px] font-black shrink-0">
              3
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-kontrol-blue tracking-wider">Étape 3</p>
              <p className="text-xs font-extrabold truncate">Contrat</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400">
            <div className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0">
              4
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Étape 4</p>
              <p className="text-xs font-extrabold truncate">Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto w-full my-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kontrol-blue/20 border border-kontrol-blue/30 text-kontrol-blue text-xs font-extrabold mb-2">
                <ShieldCheck size={14} /> Contrat Officiel d'Abonnement SaaS
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Signature du Contrat d'Abonnement</h1>
              <p className="text-sm text-slate-400 mt-1">
                Veuillez relire et signer électroniquement les termes de la convention d'utilisation de la plateforme KONTROL.
              </p>
            </div>

            <button
              type="button"
              onClick={() => generateContractPDF(profile)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all shrink-0 cursor-pointer"
            >
              <Download size={16} /> Télécharger PDF
            </button>
          </div>

          {/* Key Terms Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
              <p className="text-[10px] uppercase font-bold text-slate-400">Entreprise Souscriptrice</p>
              <p className="text-base font-extrabold text-white mt-0.5 truncate">{companyName}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
              <p className="text-[10px] uppercase font-bold text-slate-400">Représentant Légal</p>
              <p className="text-base font-extrabold text-white mt-0.5 truncate">{managerName}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
              <p className="text-[10px] uppercase font-bold text-emerald-400">Statut Abonnement</p>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">Actif (30 Jours Inclus)</p>
            </div>
          </div>

          {/* Contract Terms Container */}
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-5 text-xs text-slate-300 space-y-4 max-h-[350px] overflow-y-auto leading-relaxed custom-scrollbar">
            <h3 className="font-extrabold text-sm text-white border-b border-white/10 pb-2">
              CONVENTION DE SERVICE SAAS ET LICENCE D'UTILISATION KONTROL ERP
            </h3>
            
            <p>
              Entre l'Éditeur de la plateforme KONTROL SaaS et l'Entreprise <strong>{companyName}</strong> représentée par <strong>{managerName}</strong>, il est convenu ce qui suit :
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-200 uppercase text-[11px]">ARTICLE 1 : OBJET DU CONTRAT</h4>
                <p className="text-slate-400">
                  Le présent contrat définit les conditions de mise à disposition des services cloud de gestion intégrée KONTROL ERP (Facturation, Trésorerie, Stocks, Tiers, Comptabilité, Rapports).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 uppercase text-[11px]">ARTICLE 2 : DURÉE ET ACCÈS (30 JOURS D'ABONNEMENT ACTIF)</h4>
                <p className="text-slate-400">
                  Dès la signature électronique du présent contrat, l'Entreprise bénéficie d'un accès complet et sans restriction pendant une période de <strong>30 jours</strong>. À l'issue de cette période, l'abonnement sera renouvelable selon la formule choisie.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 uppercase text-[11px]">ARTICLE 3 : CONFIDENTIALITÉ ET SÉCURITÉ DES DONNÉES</h4>
                <p className="text-slate-400">
                  Les données stockées sur la plateforme demeurent la propriété exclusive de l'Entreprise <strong>{companyName}</strong>. L'éditeur garantit le chiffrement, la sauvegarde quotidienne et la conformité aux normes régionales en matière de protection des données.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 uppercase text-[11px]">ARTICLE 4 : DROIT APPLICABLE ET JURIDICTION COMPÉTENTE</h4>
                <p className="text-slate-400">
                  Le présent contrat est régi par le <strong>Droit Ivoirien</strong> et les <strong>Actes Uniformes de l'OHADA</strong>. En cas de différend non résolu à l'amiable, compétence exclusive est attribuée au <strong>TRIBUNAL DE COMMERCE D'ABIDJAN (TCA)</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Signature Upload & Agreement */}
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-white">Signature Officielle de l'Entreprise</h4>
                <p className="text-xs text-slate-400">Importez le cachet ou la signature de votre société pour sceller ce contrat.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-14 h-12 rounded-lg bg-slate-800 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                  {uploadedSignature ? (
                    <img src={uploadedSignature} alt="Signature" className="w-full h-full object-contain p-1" />
                  ) : (
                    <FileCheck size={20} className="text-slate-500" />
                  )}
                </div>

                <label className="cursor-pointer">
                  <span className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2">
                    <Upload size={14} /> {uploadedSignature ? 'Changer' : 'Importer signature'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            <label className="flex items-start gap-3 pt-2 cursor-pointer group">
              <input 
                type="checkbox"
                checked={agreedTerms || isSigned}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                disabled={isSigned}
                className="mt-0.5 rounded border-white/20 bg-slate-800 text-kontrol-blue focus:ring-kontrol-blue focus:ring-offset-slate-900 w-4 h-4"
              />
              <span className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">
                Je soussigné(e) <strong>{managerName}</strong>, agissant en qualité de représentant légal de <strong>{companyName}</strong>, certifie avoir lu et accepté sans réserve les conditions du contrat d'abonnement KONTROL SaaS.
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleSignContract}
              disabled={signing || (!agreedTerms && !isSigned)}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-kontrol-blue via-indigo-600 to-kontrol-orange text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {signing ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Signature électronique en cours...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} /> Signer électroniquement & Accéder au Dashboard <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center mt-8 text-xs text-slate-500 font-medium">
        KONTROL SaaS ERP &copy; {new Date().getFullYear()} — Conformité OHADA & Droit Ivoirien.
      </div>
    </div>
  );
};
