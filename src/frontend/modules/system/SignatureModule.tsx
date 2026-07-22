import React, { useState } from 'react';
import { Upload, CheckCircle2, Trash2, FileCheck, ShieldCheck, FileText, Sparkles, Building2, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../api/firebase';
import { UserProfile } from '../../types';
import { toast } from 'sonner';

interface SignatureModuleProps {
  profile: UserProfile | null;
  onProfileUpdate?: (updated: UserProfile) => void;
}

export const SignatureModule: React.FC<SignatureModuleProps> = ({ profile, onProfileUpdate }) => {
  const initialSig = profile?.companySignature || profile?.signatureUrl || '';
  const [signatureData, setSignatureData] = useState<string>(initialSig);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    if (profile?.companySignature || profile?.signatureUrl) {
      setSignatureData(profile.companySignature || profile.signatureUrl || '');
    }
  }, [profile]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner un fichier image valide (PNG, JPEG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignatureData(dataUrl);
      toast.info("Image chargée. Cliquez sur 'Enregistrer la signature' pour la valider.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updatePayload: any = {
        companySignature: signatureData,
        signatureUrl: signatureData,
        updatedAt: Date.now()
      };

      // 1. Update user profile
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, updatePayload);

      // 2. Update company profile if companyId exists
      if (profile.companyId) {
        try {
          const companyRef = doc(db, 'companies', profile.companyId);
          await updateDoc(companyRef, updatePayload);
        } catch (cErr) {
          console.warn("Notice: Company signature sync update", cErr);
        }
      }

      const updatedProfile: UserProfile = {
        ...profile,
        companySignature: signatureData,
        signatureUrl: signatureData
      };

      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast.success("Signature officielle enregistrée avec succès ! Elle est désormais apposée sur vos contrats et factures.");
    } catch (err: any) {
      console.error("Error saving signature:", err);
      toast.error("Erreur lors de l'enregistrement de la signature.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setSignatureData('');
    if (!profile) return;
    try {
      const clearPayload: any = {
        companySignature: '',
        signatureUrl: '',
        updatedAt: Date.now()
      };

      await updateDoc(doc(db, 'users', profile.uid), clearPayload);
      if (profile.companyId) {
        try {
          await updateDoc(doc(db, 'companies', profile.companyId), clearPayload);
        } catch (e) {}
      }

      if (onProfileUpdate) {
        onProfileUpdate({
          ...profile,
          companySignature: '',
          signatureUrl: ''
        });
      }
      toast.success("Signature supprimée.");
    } catch (e) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const companyName = profile?.companyName || 'Votre Entreprise';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-kontrol-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              Système & Certification
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">
            Signature & Cachet Officiel d'Entreprise
          </h2>
          <p className="text-xs text-kontrol-ink-muted mt-1">
            Importez l'image numérique de la signature ou du tampon de votre entreprise pour certifier automatiquement vos devis, factures et contrats d'abonnement.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {signatureData && (
            <button
              onClick={handleClear}
              disabled={isSaving}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 size={14} />
              <span>Supprimer</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-kontrol-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la signature'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Upload Box */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-kontrol-border shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-kontrol-dark flex items-center gap-2">
              <Upload size={16} className="text-kontrol-blue" />
              Importer la signature
            </h3>
            
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[220px] ${
                isDragging 
                  ? 'border-kontrol-blue bg-blue-50/50 scale-[0.99]' 
                  : signatureData 
                    ? 'border-emerald-300 bg-emerald-50/20' 
                    : 'border-slate-200 hover:border-kontrol-blue/60 bg-slate-50/50'
              }`}
            >
              {signatureData ? (
                <div className="space-y-3 w-full flex flex-col items-center">
                  <div className="w-full h-32 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center shadow-2xs overflow-hidden">
                    <img src={signatureData} alt="Signature Officielle" className="max-h-full max-w-full object-contain" />
                  </div>
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Image chargée & prête
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-kontrol-blue flex items-center justify-center mx-auto mb-2">
                    <Upload size={22} />
                  </div>
                  <p className="text-xs font-extrabold text-slate-800">
                    Glissez-déposez votre image ici
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Format PNG avec fond transparent recommandé (max 5 Mo)
                  </p>
                </div>
              )}

              <label className="mt-4 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center gap-2 active:scale-95">
                <Upload size={14} />
                <span>{signatureData ? "Changer le fichier" : "Sélectionner une image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 space-y-1">
              <span className="font-extrabold block flex items-center gap-1">
                <Sparkles size={12} className="text-blue-600" /> Recommandation
              </span>
              <p className="text-blue-800/90 leading-relaxed">
                Utilisez une photo nette ou un scan de votre signature manuscrite avec le tampon commercial. Pour un rendu parfait sur vos PDF, privilégiez un fond blanc ou transparent.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Document Previews */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-kontrol-border shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-kontrol-dark flex items-center gap-2">
                  <FileCheck size={16} className="text-emerald-600" />
                  Aperçu temps réel sur vos documents
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visualisez comment votre signature s'affichera sur vos contrats et factures.
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                Certifié KONTROL
              </span>
            </div>

            {/* Specimen 1: Contract Preview */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-kontrol-blue" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Aperçu : Contrat d'Abonnement KONTROL
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500">Document d'engagement</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">{companyName}</p>
                  <p className="text-[11px] text-slate-500">Signataire : {profile?.contractSignedBy || profile?.displayName || 'Représentant légal'}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <ShieldCheck size={12} /> Validation électronique conforme
                  </p>
                </div>

                <div className="w-32 h-14 border border-dashed border-slate-300 rounded-lg p-1 bg-slate-50 flex flex-col items-center justify-center shrink-0">
                  {signatureData ? (
                    <img src={signatureData} alt="Signature Aperçu" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-slate-400 italic text-center">Aucune signature</span>
                  )}
                </div>
              </div>
            </div>

            {/* Specimen 2: Invoice / Devis Preview */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-amber-600" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Aperçu : Factures & Devis Clients
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500">Export PDF</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">Pied de page Facture / Devis</p>
                  <p className="text-[11px] text-slate-500">Tampon commercial & cachet officiel du vendeur</p>
                  <p className="text-[10px] text-slate-400 mt-1">Apposé automatiquement en bas à droite de chaque facture</p>
                </div>

                <div className="w-32 h-14 border border-dashed border-slate-300 rounded-lg p-1 bg-slate-50 flex flex-col items-center justify-center shrink-0">
                  {signatureData ? (
                    <img src={signatureData} alt="Signature Aperçu Facture" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-slate-400 italic text-center">Aucune signature</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
