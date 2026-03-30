import React from 'react';
import { X, Camera, Rocket, Loader2, Sparkles, Building2, User, Phone, Globe } from 'lucide-react';
import { UserProfile } from '../../types';
import { updateUserProfile, logAction } from '../../firebase';

const phoneToCountry: Record<string, { country: string, currency: string, language: string }> = {
  '225': { country: 'Côte d\'Ivoire', currency: 'XOF', language: 'fr' },
  '221': { country: 'Sénégal', currency: 'XOF', language: 'fr' },
  '223': { country: 'Mali', currency: 'XOF', language: 'fr' },
  '226': { country: 'Burkina Faso', currency: 'XOF', language: 'fr' },
  '228': { country: 'Togo', currency: 'XOF', language: 'fr' },
  '229': { country: 'Bénin', currency: 'XOF', language: 'fr' },
  '227': { country: 'Niger', currency: 'XOF', language: 'fr' },
  '242': { country: 'Congo', currency: 'XAF', language: 'fr' },
  '237': { country: 'Cameroun', currency: 'XAF', language: 'fr' },
  '241': { country: 'Gabon', currency: 'XAF', language: 'fr' },
  '235': { country: 'Tchad', currency: 'XAF', language: 'fr' },
  '236': { country: 'Centrafrique', currency: 'XAF', language: 'fr' },
  '240': { country: 'Guinée Équatoriale', currency: 'XAF', language: 'fr' },
  '33': { country: 'France', currency: 'EUR', language: 'fr' },
  '1': { country: 'USA', currency: 'USD', language: 'en' },
};

interface CompanySetupModalProps {
  profile: UserProfile;
  onClose: () => void;
  onComplete: (updatedProfile: UserProfile) => void;
}

export function CompanySetupModal({ profile, onClose, onComplete }: CompanySetupModalProps) {
  const [companyName, setCompanyName] = React.useState(profile.companyName || '');
  const [phone, setPhone] = React.useState(profile.phone || '');
  const [logo, setLogo] = React.useState(profile.companyLogo || '');
  const [loading, setLoading] = React.useState(false);

  const detectedInfo = React.useMemo(() => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    for (const prefix in phoneToCountry) {
      if (cleanPhone.startsWith(prefix)) {
        return phoneToCountry[prefix];
      }
    }
    return null;
  }, [phone]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    setLoading(true);
    try {
      const updates = {
        companyName,
        companyLogo: logo,
        phone,
        country: detectedInfo?.country || '',
        currency: detectedInfo?.currency || 'XOF',
        language: detectedInfo?.language || 'fr',
        isProfileComplete: true
      };
      await updateUserProfile(profile.uid, updates);
      
      // Log the profile completion
      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Complétion du profil entreprise",
        `Entreprise: ${companyName}`
      );

      onComplete({ ...profile, ...updates });
    } catch (error) {
      console.error("Error updating profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-kontrol-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kontrol-orange to-kontrol-blue flex items-center justify-center text-white shadow-lg">
              <Rocket size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-kontrol-dark leading-tight">Bienvenue sur KONTROL</h3>
              <p className="text-[11px] text-kontrol-ink-muted uppercase tracking-widest font-bold">Configurez votre espace</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-kontrol-blue/5 border border-kontrol-blue/10 rounded-2xl p-4 flex gap-3 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-kontrol-blue/10 rounded-full blur-2xl" />
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-kontrol-blue shrink-0 shadow-sm border border-kontrol-blue/10">
              <Sparkles size={18} />
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-[13px] text-kontrol-dark font-extrabold leading-tight">
                Presque terminé !
              </p>
              <p className="text-[12px] text-kontrol-ink-muted leading-relaxed">
                Complétez les informations de votre entreprise pour personnaliser vos factures et rapports.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nom de l'entreprise *</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  placeholder="Ma Société SARL"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-kontrol-border rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Téléphone *</label>
              <div className="relative">
                <input 
                  type="tel"
                  required
                  placeholder="+225 07 00 00 00 00"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-kontrol-border rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
              </div>
              {detectedInfo && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold mt-1">
                  <Globe size={10} />
                  Pays détecté: {detectedInfo.country} ({detectedInfo.currency})
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Votre nom complet *</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  placeholder="Jean Dupont"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-kontrol-border rounded-xl focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                  value={profile.displayName}
                  disabled
                />
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
              </div>
              <p className="text-[10px] text-kontrol-ink-muted italic">Ce nom est lié à votre compte {profile.email}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Logo de l'entreprise</label>
              <div className="flex items-center gap-4 p-4 bg-kontrol-bg/50 rounded-2xl border border-dashed border-kontrol-border group hover:border-kontrol-blue transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-white border border-kontrol-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:shadow-md transition-all">
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Camera size={28} className="text-kontrol-ink-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <span className="inline-block px-5 py-2.5 bg-white border border-kontrol-border rounded-xl text-[12px] font-extrabold text-kontrol-dark hover:bg-kontrol-bg transition-all shadow-sm active:scale-95">
                      Choisir une image
                    </span>
                    <input 
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="text-[10px] text-kontrol-ink-muted mt-2 italic leading-tight">PNG, JPG ou SVG recommandé.<br/>Max 500KB pour une performance optimale.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button 
              type="submit"
              disabled={loading || !companyName}
              className="w-full py-3 bg-kontrol-orange text-white font-extrabold rounded-xl hover:bg-kontrol-orange-hover transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Rocket size={18} /> Créer mon espace KONTROL</>}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-white border border-kontrol-border text-kontrol-ink-muted font-bold rounded-xl hover:bg-kontrol-bg transition-all"
            >
              Renseigner plus tard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
