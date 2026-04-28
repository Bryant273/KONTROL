import React from 'react';
import { X, Camera, Rocket, Loader2, Sparkles, Building2, User, Phone, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../../types';
import { updateUserProfile, logAction, db } from '../../../api/firebase';
import { countries } from '../../lib/countries';
import { cn } from '../../lib/utils';
import { sendNotification } from '../../../api/services/notificationService';
import { serverTimestamp } from 'firebase/firestore';

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
  '32': { country: 'Belgique', currency: 'EUR', language: 'fr' },
  '41': { country: 'Suisse', currency: 'CHF', language: 'fr' },
  '44': { country: 'Royaume-Uni', currency: 'GBP', language: 'en' },
  '49': { country: 'Allemagne', currency: 'EUR', language: 'de' },
  '34': { country: 'Espagne', currency: 'EUR', language: 'es' },
  '39': { country: 'Italie', currency: 'EUR', language: 'it' },
  '1': { country: 'USA/Canada', currency: 'USD', language: 'en' },
  '86': { country: 'Chine', currency: 'CNY', language: 'zh' },
  '81': { country: 'Japon', currency: 'JPY', language: 'ja' },
  '971': { country: 'Émirats Arabes Unis', currency: 'AED', language: 'ar' },
  '966': { country: 'Arabie Saoudite', currency: 'SAR', language: 'ar' },
  '212': { country: 'Maroc', currency: 'MAD', language: 'fr' },
  '213': { country: 'Algérie', currency: 'DZD', language: 'fr' },
  '216': { country: 'Tunisie', currency: 'TND', language: 'fr' },
  '55': { country: 'Brésil', currency: 'BRL', language: 'pt' },
  '91': { country: 'Inde', currency: 'INR', language: 'en' },
};

interface CompanySetupModalProps {
  profile: UserProfile;
  onClose: () => void;
  onComplete: (updatedProfile: UserProfile) => void;
}

export function CompanySetupModal({ profile, onClose, onComplete }: CompanySetupModalProps) {
  const [companyName, setCompanyName] = React.useState(profile.companyName || '');
  const [phone, setPhone] = React.useState(profile.phone || '');
  const [country, setCountry] = React.useState(profile.country || '');
  const [city, setCity] = React.useState(profile.city || '');
  const [address, setAddress] = React.useState(profile.address || '');
  const [logo, setLogo] = React.useState(profile.companyLogo || '');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'error' | 'success', text: string } | null>(null);

  const selectedCountryData = React.useMemo(() => {
    return countries.find(c => c.name === country);
  }, [country]);

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
    if (!companyName || !phone || !country || !city) {
      setMessage({ type: 'error', text: "Veuillez remplir tous les champs obligatoires (*)." });
      return;
    }

    const isAdminEmail = ["acherie812@gmail.com", "innov.korp@gmail.com", "Innov.korp@gmail.com", "Acherie812@gmail.com"].includes(profile.email || '');

    setLoading(true);
    try {
      const updates = {
        companyName,
        companyLogo: logo,
        phone,
        country,
        city,
        address,
        currency: detectedInfo?.currency || 'XOF',
        language: detectedInfo?.language || 'fr',
        isProfileComplete: true,
        companyId: profile.companyId || profile.uid,
        role: (isAdminEmail ? 'ADMINISTRATEUR_ERP' : 'ADMINISTRATEUR_ENTREPRISE') as any
      };
      await updateUserProfile(profile.uid, updates);
      
      // Welcome Notification
      await sendNotification({
        companyId: updates.companyId,
        userId: profile.uid,
        title: "Bienvenue sur KONTROL",
        message: `Votre espace de travail pour ${companyName} est prêt. Vous commencez avec une période d'essai de 14 jours.`,
        type: 'success'
      });

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] flex flex-col max-h-[85vh] overflow-hidden border border-black/5"
      >
        {/* Header - Fixed */}
        <div className="px-5 py-3.5 border-b border-kontrol-border flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kontrol-orange to-kontrol-blue flex items-center justify-center text-white shadow-sm">
              <Rocket size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-kontrol-dark leading-tight">Configuration</h3>
              <p className="text-[9px] text-kontrol-ink-muted uppercase tracking-widest font-bold">Espace de travail</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-4">
            {message && (
              <div className={cn(
                "p-3 rounded-xl text-[12px] font-bold text-center animate-in fade-in slide-in-from-top-2",
                message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
              )}>
                {message.text}
              </div>
            )}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-kontrol-blue/5 border border-kontrol-blue/10 rounded-xl p-3 flex gap-3 relative overflow-hidden"
            >
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-kontrol-blue shrink-0 shadow-sm border border-kontrol-blue/10">
                <Sparkles size={14} />
              </div>
              <div className="space-y-0.5 relative z-10">
                <p className="text-[11px] text-kontrol-dark font-extrabold leading-tight">
                  Configuration de votre espace
                </p>
                <p className="text-[10px] text-kontrol-ink-muted leading-relaxed">
                  Ces informations seront utilisées pour vos documents officiels.
                </p>
              </div>
            </motion.div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nom de l'entreprise *</label>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Ma Société SARL"
                    className="w-full pl-8 pr-4 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[12px] font-medium"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <Building2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Téléphone de contact *</label>
                <div className="relative group">
                  <input 
                    type="tel"
                    placeholder="+225 07 00 00 00 00"
                    className="w-full pl-8 pr-4 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[12px] font-medium"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhone(val);
                      if (!country) {
                        const cleanPhone = val.replace(/\D/g, '');
                        for (const prefix in phoneToCountry) {
                          if (cleanPhone.startsWith(prefix)) {
                            setCountry(phoneToCountry[prefix].country);
                            break;
                          }
                        }
                      }
                    }}
                  />
                  <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted group-focus-within:text-kontrol-blue transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Pays *</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[12px] font-medium"
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setCity('');
                    }}
                  >
                    <option value="">Sélectionner</option>
                    {countries.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Ville *</label>
                  <select
                    disabled={!country}
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[12px] font-medium disabled:opacity-50"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="">Sélectionner</option>
                    {selectedCountryData?.cities?.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Adresse du siège</label>
                <input 
                  type="text"
                  placeholder="Ex: Rue des Jardins, Cocody"
                  className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[12px] font-medium"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Logo de l'entreprise</label>
                <div className="flex items-center gap-3 p-2.5 bg-kontrol-bg/30 rounded-xl border border-dashed border-kontrol-border group hover:border-kontrol-blue transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-white border border-kontrol-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:shadow-md transition-all">
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Camera size={16} className="text-kontrol-ink-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <span className="inline-block px-2.5 py-1 bg-white border border-kontrol-border rounded-lg text-[10px] font-extrabold text-kontrol-dark hover:bg-kontrol-bg transition-all shadow-sm active:scale-95">
                        Choisir une image
                      </span>
                      <input 
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="text-[8px] text-kontrol-ink-muted mt-0.5 leading-tight">Max 500KB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t border-kontrol-border bg-kontrol-bg/10 space-y-2 shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={loading || !companyName}
            className="w-full py-2 bg-kontrol-orange text-white text-[12px] font-extrabold rounded-lg hover:bg-kontrol-orange-hover transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <><Rocket size={14} /> Créer mon espace</>}
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-1.5 bg-white border border-kontrol-border text-kontrol-ink-muted text-[11px] font-bold rounded-lg hover:bg-kontrol-bg transition-all"
          >
            Plus tard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
