import React, { useState, useMemo } from 'react';
import { Rocket, Loader2, Sparkles, Building2, Phone, PenTool, Camera, CheckCircle2, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '../../types';
import { updateUserProfile, logAction, handleFirestoreError, OperationType, logout } from '../../../api/firebase';
import { countries } from '../../lib/countries';
import { cn } from '../../lib/utils';
import { sendNotification } from '../../../api/services/notificationService';

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
  '49': { country: 'Allemagne', currency: 'EUR', language: 'en' },
  '34': { country: 'Espagne', currency: 'EUR', language: 'en' },
  '39': { country: 'Italie', currency: 'EUR', language: 'en' },
  '1': { country: 'USA/Canada', currency: 'USD', language: 'en' },
  '212': { country: 'Maroc', currency: 'MAD', language: 'fr' },
  '213': { country: 'Algérie', currency: 'DZD', language: 'fr' },
  '216': { country: 'Tunisie', currency: 'TND', language: 'fr' },
};

interface CompanySetupPageProps {
  profile: UserProfile;
  onComplete: (updatedProfile: UserProfile) => void;
  onLogout: () => void;
}

export const CompanySetupPage: React.FC<CompanySetupPageProps> = ({ profile, onComplete, onLogout }) => {
  const [companyName, setCompanyName] = useState(profile.companyName || '');
  const [companyAbbreviation, setCompanyAbbreviation] = useState(profile.companyAbbreviation || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [country, setCountry] = useState(profile.country || '');
  const [city, setCity] = useState(profile.city || '');
  const [address, setAddress] = useState(profile.address || '');
  const [logo, setLogo] = useState(profile.companyLogo || '');
  const [signature, setSignature] = useState(profile.companySignature || profile.signatureUrl || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const selectedCountryData = useMemo(() => {
    return countries.find(c => c.name === country);
  }, [country]);

  const detectedInfo = useMemo(() => {
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

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignature(reader.result as string);
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

    setLoading(true);
    const now = Date.now();
    const activeEndDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days active

    const updates = {
      companyName,
      companyAbbreviation,
      companyLogo: logo,
      companySignature: signature,
      signatureUrl: signature,
      phone,
      country,
      city,
      address,
      currency: detectedInfo?.currency || 'XOF',
      language: detectedInfo?.language || 'fr',
      isProfileComplete: true,
      subscriptionStatus: 'ACTIVE' as const,
      subscriptionEndDate: activeEndDate,
      companyId: profile.companyId || profile.uid,
      role: 'ADMINISTRATEUR_ENTREPRISE' as any
    };

    const updatedProfile: UserProfile = { ...profile, ...updates };

    try {
      localStorage.setItem('kontrol_profile_cache', JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn("Local profile save notice:", e);
    }

    try {
      await updateUserProfile(profile.uid, updates);
      
      await sendNotification({
        companyId: updates.companyId,
        userId: profile.uid,
        title: "Espace de travail configuré",
        message: `Votre entreprise ${companyName} est configurée. Votre abonnement actif de 30 jours est démarré.`,
        type: 'success'
      }).catch(() => {});

      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Configuration entreprise",
        `Entreprise: ${companyName}`
      ).catch(() => {});
    } catch (error) {
      console.warn("Firestore profile update warning:", error);
    } finally {
      setLoading(false);
      onComplete(updatedProfile);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar with Logo & Stepper */}
      <div className="max-w-4xl mx-auto w-full mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-kontrol-blue via-indigo-600 to-kontrol-orange flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Rocket size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white uppercase">KONTROL <span className="text-kontrol-orange">ERP</span></span>
              <p className="text-xs text-slate-400 font-medium">Plateforme d'administration & de gestion</p>
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

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-kontrol-blue/20 border border-kontrol-blue/40 text-white shadow-lg shadow-blue-500/10">
            <div className="w-5 h-5 rounded-full bg-kontrol-blue text-white flex items-center justify-center text-[10px] font-black shrink-0">
              2
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-kontrol-blue tracking-wider">Étape 2</p>
              <p className="text-xs font-extrabold truncate">Entreprise</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400">
            <div className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0">
              3
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Étape 3</p>
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

      {/* Main Card */}
      <div className="max-w-3xl mx-auto w-full my-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6"
        >
          {/* Header info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold mb-2">
                <ShieldCheck size={14} /> Abonnement Actif - 30 Jours Inclus
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Configuration de votre Entreprise</h1>
              <p className="text-sm text-slate-400 mt-1">
                Renseignez les informations officielles de votre entité pour personnaliser vos documents et votre espace de travail.
              </p>
            </div>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-xl text-xs font-bold text-center border animate-in fade-in",
              message.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            )}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Nom de l'entreprise *</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Ivoire Solutions SARL"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-kontrol-blue focus:border-transparent transition-all"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Sigle / Abbrev *</label>
                <input 
                  type="text"
                  placeholder="Ex: ISS"
                  maxLength={6}
                  required
                  className="w-full px-3 py-3 bg-slate-900/80 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-extrabold uppercase text-center focus:outline-none focus:ring-2 focus:ring-kontrol-blue focus:border-transparent transition-all"
                  value={companyAbbreviation}
                  onChange={(e) => setCompanyAbbreviation(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Téléphone de contact *</label>
              <div className="relative">
                <input 
                  type="tel"
                  required
                  placeholder="+225 07 00 00 00 00"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-kontrol-blue focus:border-transparent transition-all"
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
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Pays *</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-900/80 border border-white/15 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-kontrol-blue focus:border-transparent transition-all"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCity('');
                  }}
                >
                  <option value="">-- Sélectionner le pays --</option>
                  {countries.map(c => (
                    <option key={c.name} value={c.name} className="bg-slate-900 text-white">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Ville *</label>
                <select
                  required
                  disabled={!country}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-white/15 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-kontrol-blue focus:border-transparent transition-all disabled:opacity-40"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">-- Sélectionner la ville --</option>
                  {selectedCountryData?.cities?.map(c => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Adresse du siège social</label>
              <input 
                type="text"
                placeholder="Ex: Plateau, Avenue Chardy, Immeuble KONTROL"
                className="w-full px-4 py-3 bg-slate-900/80 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-kontrol-blue focus:border-transparent transition-all"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Camera size={16} className="text-kontrol-blue" /> Logo Officiel
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={20} className="text-slate-500" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-block border border-white/10">
                      {logo ? 'Changer le logo' : 'Téléverser un logo'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <PenTool size={16} className="text-kontrol-orange" /> Signature & Cachet
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                    {signature ? (
                      <img src={signature} alt="Signature" className="w-full h-full object-contain" />
                    ) : (
                      <PenTool size={20} className="text-slate-500" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-block border border-white/10">
                      {signature ? 'Changer signature' : 'Téléverser signature'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSignatureFileChange} />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={loading || !companyName || !companyAbbreviation || !phone || !country || !city}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-kontrol-orange via-amber-500 to-kontrol-blue text-white font-extrabold text-sm sm:text-base shadow-xl shadow-orange-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Enregistrement...
                  </>
                ) : (
                  <>
                    Valider & Continuer vers le Contrat <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center mt-8 text-xs text-slate-500 font-medium">
        KONTROL SaaS ERP &copy; {new Date().getFullYear()} — Tous droits réservés. Sécurité et chiffrement haute disponibilité.
      </div>
    </div>
  );
};
