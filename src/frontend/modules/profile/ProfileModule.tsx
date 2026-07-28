import React from 'react';
import { 
  User, 
  Building2, 
  Mail, 
  Shield, 
  Camera, 
  Save, 
  Loader2,
  CheckCircle2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Trash2,
  AlertTriangle,
  MapPin,
  Globe,
  ChevronLeft,
  KeyRound,
  Phone,
  Briefcase,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { UserProfile, Company } from '../../types';
import { 
  db,
  doc,
  getDoc,
  updateDoc,
  updateUserProfile, 
  logout, 
  auth, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  logAction,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { cn } from '../../lib/utils';
import { deleteCompanyAccount } from '../../../api/services/dataResetService';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { countries } from '../../lib/countries';
import { cacheCompanyLogo, updateFavicon } from '../../lib/logoCache';
import { motion, AnimatePresence } from 'motion/react';
import { hasPermission } from '../../lib/permissions';

interface ProfileModuleProps {
  profile: UserProfile | null;
  initialSection?: 'MENU' | 'PROFILE' | 'COMPANY' | 'SECURITY' | 'DANGER';
}

export function ProfileModule({ profile, initialSection = 'MENU' }: ProfileModuleProps) {
  const [activeSection, setActiveSection] = React.useState<'MENU' | 'PROFILE' | 'COMPANY' | 'SECURITY' | 'DANGER'>('MENU');
  
  // States for general view and forms
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [passLoading, setPassLoading] = React.useState(false);
  const [passSuccess, setPassSuccess] = React.useState(false);
  const [passError, setPassError] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  
  // Personal profile form state
  const [personalData, setPersonalData] = React.useState({
    displayName: profile?.displayName || '',
    email: profile?.email || ''
  });

  // Company profile states (loaded directly from firestore companies collection)
  const [company, setCompany] = React.useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = React.useState(true);
  const [companySaving, setCompanySaving] = React.useState(false);
  const [companySuccess, setCompanySuccess] = React.useState(false);
  const [companyError, setCompanyError] = React.useState('');

  const [companyFields, setCompanyFields] = React.useState({
    name: '',
    abbreviation: '',
    email: '',
    phone: '',
    sector: '',
    address: '',
    logo: '',
    country: '',
    city: ''
  });

  // Security credentials state
  const [passData, setPassData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Keep section active matching tab state
  React.useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // Sync personal info state
  React.useEffect(() => {
    if (profile) {
      setPersonalData({
        displayName: profile.displayName || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  // Fetch real company information from Firestore "companies" collection
  React.useEffect(() => {
    const fetchCompanyData = async () => {
      if (!profile?.companyId) {
        setCompanyLoading(false);
        return;
      }
      
      try {
        setCompanyLoading(true);
        const companyDoc = await getDoc(doc(db, 'companies', profile.companyId));
        if (companyDoc.exists()) {
          const originalCompany = { id: companyDoc.id, ...companyDoc.data() } as Company;
          setCompany(originalCompany);
          
          // Populate fields
          setCompanyFields({
            name: originalCompany.name || '',
            abbreviation: originalCompany.abbreviation || '',
            email: originalCompany.email || '',
            phone: originalCompany.phone || '',
            sector: originalCompany.sector || '',
            address: originalCompany.address || '',
            logo: originalCompany.logo || '',
            country: profile.country || '',
            city: profile.city || ''
          });
        } else {
          // Fallback
          setCompanyFields({
            name: profile.companyName || '',
            abbreviation: profile.companyAbbreviation || '',
            email: profile.email || '',
            phone: '',
            sector: '',
            address: profile.address || '',
            logo: profile.companyLogo || '',
            country: profile.country || '',
            city: profile.city || ''
          });
        }
      } catch (err) {
        console.error("Error loading company profile:", err);
      } finally {
        setCompanyLoading(false);
      }
    };

    fetchCompanyData();
  }, [profile?.companyId, profile]);

  const canUpdateCompany = hasPermission(profile?.role, 'COMPANY_UPDATE');

  // Handle Logo Upload base64 encoding
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoDataUrl = reader.result as string;
        setCompanyFields(prev => ({ ...prev, logo: logoDataUrl }));
        cacheCompanyLogo(logoDataUrl);
        updateFavicon(logoDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit personal profile updates to Firestore (users collection)
  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !auth.currentUser) return;

    setLoading(true);
    setSuccess(false);
    try {
      await updateUserProfile(profile.uid, {
        displayName: personalData.displayName,
        email: personalData.email
      });
      setSuccess(true);
      
      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Mise à jour profil",
        "Les informations personnelles du profil ont été mises à jour"
      ).catch(err => handleFirestoreError(err, OperationType.WRITE, 'actions', auth.currentUser, false));

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users', auth.currentUser, false);
    } finally {
      setLoading(false);
    }
  };

  // Submit corporate updates to Firestore (companies collection AND sync back to users)
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.companyId) return;
    if (!canUpdateCompany) {
      setCompanyError("Habilitations insuffisantes pour modifier les informations d'entreprise.");
      return;
    }

    setCompanySaving(true);
    setCompanySuccess(false);
    setCompanyError('');

    try {
      // 1. Update standard company document
      await updateDoc(doc(db, 'companies', profile.companyId), {
        name: companyFields.name,
        abbreviation: companyFields.abbreviation,
        email: companyFields.email,
        phone: companyFields.phone || '',
        address: companyFields.address || '',
        sector: companyFields.sector || '',
        logo: companyFields.logo || '',
        updatedAt: Date.now()
      });

      // 2. Sync to current user profile details
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          companyName: companyFields.name,
          companyAbbreviation: companyFields.abbreviation,
          companyLogo: companyFields.logo,
          country: companyFields.country,
          city: companyFields.city,
          address: companyFields.address
        });
      }

      if (companyFields.logo) {
        cacheCompanyLogo(companyFields.logo);
        updateFavicon(companyFields.logo);
      }

      setCompanySuccess(true);
      
      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Mise à jour entreprise",
        `Les informations de l'entreprise ${companyFields.name} ont été synchronisées`
      ).catch(err => handleFirestoreError(err, OperationType.WRITE, 'actions', auth.currentUser, false));

      setTimeout(() => setCompanySuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'companies', auth.currentUser, false);
      setCompanyError("Échec de l'enregistrement des données de l'entreprise.");
    } finally {
      setCompanySaving(false);
    }
  };

  // Change security password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !auth.currentUser) return;
    
    if (passData.newPassword !== passData.confirmPassword) {
      setPassError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (passData.newPassword.length < 6) {
      setPassError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setPassLoading(true);
    setPassError('');
    setPassSuccess(false);

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, passData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updatePassword(auth.currentUser, passData.newPassword);
      
      setPassSuccess(true);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Modification mot de passe",
        "Le mot de passe a été mis à jour avec succès"
      ).catch(err => handleFirestoreError(err, OperationType.WRITE, 'actions', auth.currentUser, false));

      setTimeout(() => setPassSuccess(false), 3000);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'auth/password', auth.currentUser, false);
      if (error.code === 'auth/wrong-password') {
        setPassError("Le mot de passe actuel est incorrect.");
      } else {
        setPassError("Une erreur est survenue lors de la mise à jour du mot de passe.");
      }
    } finally {
      setPassLoading(false);
    }
  };

  // Erase complete company administrative account
  const handleDeleteAccount = async () => {
    if (!profile) return;
    setDeleteLoading(true);
    try {
      await deleteCompanyAccount(profile.companyId);
      await logout();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'companies', auth.currentUser, false);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: CENTRAL COMMAND bento navigation list */}
        {activeSection === 'MENU' && (
          <motion.div
            key="menu-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <header className="flex flex-col gap-1">
              <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Paramètres Globaux</h2>
              <p className="text-[13px] text-kontrol-ink-muted">
                Configurez l’organisation de votre espace ERP, synchronisez vos options de sécurité et mettez à jour l’identité de votre marque.
              </p>
            </header>

            {/* Premium Header Greeting Panel */}
            <div className="bg-gradient-to-br from-[#0e1f32] to-[#162a3f] text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-[#1d3a5a]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#185FA5]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4.5">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0">
                    {companyFields.logo ? (
                      <img src={companyFields.logo} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : profile.companyLogo ? (
                      <img src={profile.companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : (
                      <User size={30} className="text-[#a0c5ea]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-white">{profile.displayName}</h3>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">{profile.email}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#185FA5]/30 border border-[#185FA5]/40 text-[#a0c5ea] text-[10px] font-extrabold uppercase tracking-widest">
                        <Shield size={10} className="mr-1" /> {profile.role}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
                        Vérifié KONTROL
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center gap-3">
                  <button 
                    onClick={() => logout()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-bold transition-all shadow-md group"
                  >
                    <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" /> Déconnexion
                  </button>
                </div>
              </div>
            </div>

            {/* Real-time Subscription Status Indicator */}
            <div className="bg-white border border-kontrol-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              <div className="flex items-start gap-4 relative z-10">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                  profile.subscriptionStatus === 'ACTIVE' 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-amber-50 text-amber-500 border-amber-100"
                )}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[14px] font-extrabold text-kontrol-dark">Statut de l'abonnement KONTROL</h4>
                    <span className={cn(
                      "px-2.5 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider border",
                      profile.subscriptionStatus === 'ACTIVE'
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                        : "bg-rose-500/15 text-rose-600 border-rose-500/20"
                    )}>
                      {profile.subscriptionStatus === 'ACTIVE' ? 'ACTIF' : 'EXPIRED / INACTIF'}
                    </span>
                  </div>
                  <p className="text-[12px] text-kontrol-ink-muted mt-1 leading-relaxed">
                    {profile.subscriptionStatus === 'ACTIVE' ? (
                      <>
                        Votre licence standard KONTROL est active et court jusqu'au <span className="font-bold text-kontrol-dark font-mono">{new Date(profile.subscriptionEndDate || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                      </>
                    ) : (
                      "Votre licence KONTROL a expiré ou n'est pas encore active. Veuillez régulariser votre abonnement standard."
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1.5 flex items-center gap-1.5">
                    <span className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      profile.subscriptionStatus === 'ACTIVE' ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"
                    )} />
                    Synchronisation temps réel via Firestore • Passerelle GeniusPay
                  </p>
                </div>
              </div>
              
              <div className="shrink-0 flex items-center gap-3 self-end md:self-center relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    const event = new CustomEvent('app-navigate', { 
                      detail: { 
                        tab: 'abonnements', 
                        section: 'Administration', 
                        label: 'Abonnements' 
                      } 
                    });
                    window.dispatchEvent(event);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-kontrol-dark border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  Gérer l'abonnement <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Bento interactive grid of buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card Button 1: Profil Personnel */}
              <button
                type="button"
                onClick={() => setActiveSection('PROFILE')}
                className="text-left bg-white border border-kontrol-border hover:border-text-kontrol-blue hover:shadow-md hover:border-kontrol-blue rounded-3xl p-6 transition-all group flex flex-col justify-between h-48 focus:ring-2 focus:ring-kontrol-blue/20 outline-none"
              >
                <div className="flex items-start justify-between w-full mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-kontrol-blue/5 flex items-center justify-center text-kontrol-blue border border-kontrol-blue/10">
                    <User size={22} />
                  </div>
                  <div className="p-1 px-2.5 bg-kontrol-bg rounded-lg text-[9px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">
                    CONFIGURER
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-kontrol-dark group-hover:text-kontrol-blue transition-colors">Profil Personnel</h4>
                  <p className="text-[11.5px] text-kontrol-ink-muted mt-1 leading-relaxed">
                    Éditez vos coordonnées d'identité, votre adresse e-mail d'exploitation et visualisez vos habilitations.
                  </p>
                </div>
              </button>

              {/* Card Button 2: Profil de l'Entreprise */}
              <button
                type="button"
                onClick={() => setActiveSection('COMPANY')}
                className="text-left bg-white border border-kontrol-border hover:border-text-kontrol-orange hover:shadow-md hover:border-kontrol-orange rounded-3xl p-6 transition-all group flex flex-col justify-between h-48 focus:ring-2 focus:ring-kontrol-orange/20 outline-none"
              >
                <div className="flex items-start justify-between w-full mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-kontrol-orange/5 flex items-center justify-center text-kontrol-orange border border-kontrol-orange/10">
                    <Building2 size={22} />
                  </div>
                  <div className="p-1 px-2.5 bg-[#FFF7ED] rounded-lg text-[9px] font-extrabold text-kontrol-orange uppercase tracking-widest border border-orange-100">
                    SOCIÉTÉ
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-kontrol-dark group-hover:text-kontrol-orange transition-colors">Identité de l'Entreprise</h4>
                  <p className="text-[11.5px] text-kontrol-ink-muted mt-1 leading-relaxed">
                    Mettez à jour votre raison sociale, adresses de facturation fiscale, pays de domiciliation et logo de société.
                  </p>
                </div>
              </button>

              {/* Card Button 3: Sécurité & Accès */}
              <button
                type="button"
                onClick={() => setActiveSection('SECURITY')}
                className="text-left bg-white border border-kontrol-border hover:border-text-kontrol-blue hover:shadow-md hover:border-[#185FA5] rounded-3xl p-6 transition-all group flex flex-col justify-between h-48 focus:ring-2 focus:ring-[#185FA5]/25 outline-none"
              >
                <div className="flex items-start justify-between w-full mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50/50 flex items-center justify-center text-[#185FA5] border border-blue-100">
                    <Lock size={20} />
                  </div>
                  <div className="p-1 px-2.5 bg-[#185FA5]/5 rounded-lg text-[9px] font-extrabold text-[#185FA5] uppercase tracking-widest">
                    ACCÈS
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-kontrol-dark group-hover:text-[#185FA5] transition-colors">Sécurité & Mots de passe</h4>
                  <p className="text-[11.5px] text-kontrol-ink-muted mt-1 leading-relaxed">
                    Renforcez l’intégrité opérationnelle de votre console d'administration en sécurisant vos mots de passe.
                  </p>
                </div>
              </button>

              {/* Card Button 4: Zone de Danger / Administration */}
              <button
                type="button"
                onClick={() => setActiveSection('DANGER')}
                className={cn(
                  "text-left bg-white border border-kontrol-border rounded-3xl p-6 transition-all hover:shadow-md group flex flex-col justify-between h-48 focus:ring-2 outline-none",
                  profile.role === 'ADMINISTRATEUR_ENTREPRISE' ? "hover:border-rose-500 focus:ring-rose-500/20" : "opacity-75 cursor-not-allowed hover:border-gray-300"
                )}
              >
                <div className="flex items-start justify-between w-full mb-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    profile.role === 'ADMINISTRATEUR_ENTREPRISE' 
                      ? "bg-rose-50 text-rose-500 border-rose-100" 
                      : "bg-gray-50 text-gray-400 border-gray-100"
                  )}>
                    <AlertTriangle size={20} />
                  </div>
                  <span className={cn(
                    "p-1 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border",
                    profile.role === 'ADMINISTRATEUR_ENTREPRISE' 
                      ? "bg-rose-50 text-rose-600 border-rose-100" 
                      : "bg-gray-50 text-gray-400 border-gray-100"
                  )}>
                    {profile.role === 'ADMINISTRATEUR_ENTREPRISE' ? 'DANGER' : 'VERROUILLÉ'}
                  </span>
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-kontrol-dark group-hover:text-rose-600 transition-colors">Compte & Options Administrateur</h4>
                  <p className="text-[11.5px] text-kontrol-ink-muted mt-1 leading-relaxed">
                    {profile.role === 'ADMINISTRATEUR_ENTREPRISE' 
                      ? "Options de suppression définitive, réinitialisation de l'instance ERP de votre firme." 
                      : "Option visible uniquement pour le propriétaire de l'organisation KONTROL."}
                  </p>
                </div>
              </button>

            </div>
          </motion.div>
        )}

        {/* VIEW 2: PROFILE PAGE COMPLETE */}
        {activeSection === 'PROFILE' && (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between pb-2 border-b border-kontrol-border">
              <button
                type="button"
                onClick={() => setActiveSection('MENU')}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-kontrol-ink-muted hover:text-kontrol-blue uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={16} /> Retour aux paramètres
              </button>
              <span className="text-[10px] bg-kontrol-bg px-3 py-1 font-extrabold tracking-widest text-[#185FA5] rounded-full border border-kontrol-border">
                SECTION 1 / 4
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Sidebar recap card */}
              <div className="space-y-4">
                <div className="card overflow-hidden text-center p-6 bg-gradient-to-b from-kontrol-bg/50 to-white">
                  <div className="w-20 h-20 rounded-3xl bg-[#185FA5]/5 border border-dashed border-[#185FA5]/25 flex items-center justify-center mx-auto mb-4">
                    <User size={34} className="text-[#185FA5]" />
                  </div>
                  <h3 className="text-base font-extrabold text-kontrol-dark">{personalData.displayName}</h3>
                  <p className="text-[11.5px] font-medium text-kontrol-ink-muted mt-0.5">{personalData.email}</p>
                  
                  <div className="mt-4 pt-4 border-t border-kontrol-border/60 flex items-center justify-between text-left">
                    <div>
                      <p className="text-[9px] text-kontrol-ink-muted font-bold uppercase tracking-wider">Habilitation</p>
                      <p className="text-[11px] font-extrabold text-kontrol-blue lowercase mt-0.5">{profile.role?.toLowerCase()?.replace(/_/g, ' ')}</p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  </div>
                </div>
              </div>

              {/* Information Form */}
              <div className="md:col-span-2">
                <form onSubmit={handlePersonalSubmit} className="card p-6 sm:p-8 bg-white border border-kontrol-border space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-kontrol-dark uppercase tracking-wider mb-1">Informations de Profil Personnel</h3>
                    <p className="text-[12px] text-kontrol-ink-muted">Modifiez vos désignations d'affichage utilisateur ainsi que vos accès e-mail</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Nom complet d'affichage</label>
                      <div className="relative">
                        <input 
                          type="text"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                          value={personalData.displayName}
                          onChange={(e) => setPersonalData(prev => ({ ...prev, displayName: e.target.value }))}
                        />
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Adresse Email / Identifiant unique</label>
                      <div className="relative">
                        <input 
                          type="email"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                          value={personalData.email}
                          onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                        />
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-kontrol-border flex items-center justify-between">
                    {success && (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px] animate-in fade-in duration-300">
                        <CheckCircle2 size={16} /> Profil mis à jour localement !
                      </div>
                    )}
                    <div className="flex-1" />
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-kontrol-dark text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14} /> Sauvegarder</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: COMPANY PROFILE PAGE COMPLETE (Direct sync with companies collection) */}
        {activeSection === 'COMPANY' && (
          <motion.div
            key="company-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between pb-2 border-b border-kontrol-border">
              <button
                type="button"
                onClick={() => setActiveSection('MENU')}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-kontrol-ink-muted hover:text-kontrol-blue uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={16} /> Retour aux paramètres
              </button>
              <span className="text-[10px] bg-kontrol-bg px-3 py-1 font-extrabold tracking-widest text-[#F97316] rounded-full border border-kontrol-border">
                SECTION 2 / 4
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Sidebar with logo setup status */}
              <div className="space-y-4">
                <div className="card overflow-hidden p-6 bg-gradient-to-b from-kontrol-bg/50 to-white text-center">
                  <div className="w-24 h-24 rounded-3xl bg-white p-2 shadow-sm border border-kontrol-border overflow-hidden mx-auto mb-4 flex items-center justify-center">
                    {companyFields.logo ? (
                      <img src={companyFields.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={36} className="text-kontrol-ink-muted" />
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-kontrol-dark">{companyFields.name || "Ma Firme"}</h3>
                  <p className="text-[11px] font-medium text-kontrol-ink-muted mt-0.5">{companyFields.address || "Aucune adresse configurée"}</p>
                
                  {company && (
                    <div className="mt-5 pt-4 border-t border-kontrol-border/60 space-y-2 text-left">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-kontrol-ink-muted font-bold">Abonnement :</span>
                        <span className="px-1.5 py-0.5 bg-kontrol-blue/10 text-kontrol-blue text-[9px] font-extrabold rounded uppercase tracking-wider">{company.subscriptionTier}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-kontrol-ink-muted font-bold">Statut :</span>
                        <span className={cn(
                          "px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wider",
                          company.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                        )}>{company.status}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Corporate Identity Form */}
              <div className="md:col-span-2">
                {companyLoading ? (
                  <div className="card p-12 flex justify-center items-center bg-white border border-kontrol-border">
                    <Loader2 className="w-8 h-8 text-kontrol-orange animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleCompanySubmit} className="card p-6 sm:p-8 bg-white border border-kontrol-border space-y-6">
                    <div>
                      <h3 className="text-sm font-extrabold text-kontrol-dark uppercase tracking-wider mb-1">Coordonnées de l'Entreprise</h3>
                      <p className="text-[12px] text-kontrol-ink-muted">Modifiez la raison sociale de votre entreprise, l'adresse du siège et votre logo</p>
                    </div>

                    {companyError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[12px] rounded-lg font-medium flex items-center gap-2">
                        <AlertCircle size={14} /> {companyError}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Raison Sociale de l'entreprise</label>
                          <div className="relative">
                            <input 
                              type="text"
                              required
                              disabled={!canUpdateCompany}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium disabled:opacity-55"
                              value={companyFields.name}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Sigle / Abréviation (Facturation)</label>
                          <div className="relative">
                            <input 
                              type="text"
                              required
                              placeholder="Ex: SOG / KTR"
                              maxLength={6}
                              disabled={!canUpdateCompany}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium disabled:opacity-55 uppercase"
                              value={companyFields.abbreviation}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, abbreviation: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                            />
                            <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Email Professionnel</label>
                          <div className="relative">
                            <input 
                              type="email"
                              required
                              disabled={!canUpdateCompany}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium disabled:opacity-55"
                              value={companyFields.email}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Téléphone de l'Etablissement</label>
                          <div className="relative">
                            <input 
                              type="tel"
                              disabled={!canUpdateCompany}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium disabled:opacity-55"
                              value={companyFields.phone}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+33 1 23 45 67 89"
                            />
                            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Pays de Domiciliation</label>
                          <div className="relative">
                            <select 
                              disabled={!canUpdateCompany}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium appearance-none disabled:opacity-55"
                              value={companyFields.country}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, country: e.target.value, city: '' }))}
                            >
                              <option value="">Sélectionner un pays</option>
                              {countries.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                            <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Ville / Secteur Local</label>
                          <div className="relative">
                            <select 
                              disabled={!canUpdateCompany || !companyFields.country}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium appearance-none disabled:opacity-55"
                              value={companyFields.city}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, city: e.target.value }))}
                            >
                              <option value="">Sélectionner une ville</option>
                              {countries.find(c => c.name === companyFields.country)?.cities?.map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                            </select>
                            <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Secteur d'Activité Standard</label>
                          <div className="relative">
                            <input 
                              type="text"
                              disabled={!canUpdateCompany}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium disabled:opacity-55"
                              value={companyFields.sector}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, sector: e.target.value }))}
                              placeholder="Commerce, Technologie, Finance, etc."
                            />
                            <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Adresse Postale & Fiscale Complète</label>
                        <div className="relative">
                          <input 
                            type="text"
                            disabled={!canUpdateCompany}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-orange/20 focus:border-kontrol-orange transition-all text-[13px] font-medium disabled:opacity-55"
                            value={companyFields.address}
                            placeholder="N° 52, Avenue des Champs-Élysées"
                            onChange={(e) => setCompanyFields(prev => ({ ...prev, address: e.target.value }))}
                          />
                          <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Emblème / Logo Institutionnel</label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-kontrol-bg/40 rounded-2xl border border-dashed border-kontrol-border">
                          <div className="w-14 h-14 rounded-xl bg-white border border-kontrol-border flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                            {companyFields.logo ? (
                              <img src={companyFields.logo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <Camera size={20} className="text-kontrol-ink-muted" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            {canUpdateCompany && (
                              <label className="cursor-pointer">
                                <span className="inline-block px-3.5 py-1.5 bg-white border border-kontrol-border rounded-xl text-[11px] font-extrabold text-[#F97316] hover:bg-[#FFF7ED] transition-colors shadow-2xs">
                                  Choisir une image
                                </span>
                                <input 
                                  type="file"
                                  accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                                  className="hidden"
                                  onChange={handleLogoUpload}
                                />
                              </label>
                            )}
                            <p className="text-[10px] text-kontrol-ink-muted leading-normal">PNG, JPG ou SVG. Recommandé : 512x512px.</p>
                          </div>
                        </div>

                        {canUpdateCompany && (
                          <div className="mt-2 text-xs">
                            <input 
                              type="text" 
                              placeholder="Ou entrez une URL de logo personnalisée..."
                              className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all"
                              value={companyFields.logo || ''}
                              onChange={(e) => setCompanyFields(prev => ({ ...prev, logo: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-kontrol-border flex items-center justify-between">
                      {companySuccess && (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px] animate-in fade-in duration-300">
                          <CheckCircle2 size={16} /> Établissement enregistré avec succès !
                        </div>
                      )}
                      <div className="flex-1" />
                      {canUpdateCompany && (
                        <button 
                          type="submit"
                          disabled={companySaving}
                          className="px-6 py-2.5 bg-kontrol-dark text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {companySaving ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14} /> Enregistrer l'Identité</>}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 4: SECURITY MANAGEMENT COMPLETE */}
        {activeSection === 'SECURITY' && (
          <motion.div
            key="security-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between pb-2 border-b border-kontrol-border">
              <button
                type="button"
                onClick={() => setActiveSection('MENU')}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-kontrol-ink-muted hover:text-kontrol-blue uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={16} /> Retour aux paramètres
              </button>
              <span className="text-[10px] bg-kontrol-bg px-3 py-1 font-extrabold tracking-widest text-[#185FA5] rounded-full border border-kontrol-border">
                SECTION 3 / 4
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Security diagnostics */}
              <div className="space-y-4">
                <div className="card p-6 bg-blue-50/10 border border-blue-100/50 space-y-4">
                  <div className="flex items-center gap-2 font-extrabold text-xs text-[#185FA5] uppercase tracking-wider">
                    <KeyRound size={16} /> Diagnostic d'accès
                  </div>
                  
                  <div className="space-y-3 pt-1">
                    <div className="p-3 bg-white/80 rounded-xl border border-kontrol-border">
                      <p className="text-[9px] text-kontrol-ink-muted font-bold uppercase tracking-wider">Méthode de connexion</p>
                      <p className="text-[12px] font-extrabold text-kontrol-dark mt-0.5">Mot de Passe Unique</p>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-kontrol-border">
                      <p className="text-[9px] text-kontrol-ink-muted font-bold uppercase tracking-wider">Chiffrement Certifié</p>
                      <p className="text-[11.5px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Standard AES-256 bits
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password updating form */}
              <div className="md:col-span-2">
                <form onSubmit={handleUpdatePassword} className="card p-6 sm:p-8 bg-white border border-kontrol-border space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-kontrol-dark uppercase tracking-wider mb-1">Sécurité & Changement de mot de passe</h3>
                    <p className="text-[12px] text-kontrol-ink-muted">Modifiez vos options d'accès critiques de manière sécurisée</p>
                  </div>

                  {passError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[12px] rounded-lg font-medium flex items-center gap-2">
                      <AlertCircle size={14} /> {passError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Mot de passe actuel</label>
                      <div className="relative">
                        <input 
                          type={showPass ? "text" : "password"}
                          required
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] font-medium"
                          value={passData.currentPassword}
                          onChange={(e) => setPassData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                        <button 
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted hover:text-kontrol-dark"
                        >
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Nouveau mot de passe</label>
                        <div className="relative">
                          <input 
                            type="password"
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                            value={passData.newPassword}
                            onChange={(e) => setPassData(prev => ({ ...prev, newPassword: e.target.value }))}
                          />
                          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider">Confirmer le mot de passe</label>
                        <div className="relative">
                          <input 
                            type="password"
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                            value={passData.confirmPassword}
                            onChange={(e) => setPassData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-kontrol-border flex items-center justify-between">
                    {passSuccess && (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px] animate-in fade-in duration-300">
                        <CheckCircle2 size={16} /> Mot de passe mis à jour !
                      </div>
                    )}
                    <div className="flex-1" />
                    <button 
                      type="submit"
                      disabled={passLoading}
                      className="px-6 py-2.5 bg-[#185FA5] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-[#185FA5]/95 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {passLoading ? <Loader2 className="animate-spin" size={14} /> : <><Lock size={14} /> Mettre à jour</>}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </motion.div>
        )}

        {/* VIEW 5: DANGER ZONE & CRITICAL ADMINISTRATIVE ACTIONS */}
        {activeSection === 'DANGER' && (
          <motion.div
            key="danger-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between pb-2 border-b border-kontrol-border">
              <button
                type="button"
                onClick={() => setActiveSection('MENU')}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-kontrol-ink-muted hover:text-rose-600 uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={16} /> Retour aux paramètres
              </button>
              <span className="text-[10px] bg-rose-50 px-3 py-1 font-extrabold tracking-widest text-rose-600 rounded-full border border-rose-100">
                SECTION 4 / 4
              </span>
            </div>

            <div className="card max-w-2xl mx-auto p-6 sm:p-8 border-rose-100 bg-rose-50/20 rounded-3xl space-y-6">
              
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-rose-700 uppercase tracking-wider mb-1">Actions d'Administration Irréversibles</h3>
                  <p className="text-[12px] text-rose-600 leading-relaxed font-medium">
                    Vous allez accéder aux privilèges destructeurs. Les modifications appliquées dans cette section s'imposent à l'ensemble des utilisateurs enregistrés sur votre instance d'entreprise KONTROL.
                  </p>
                </div>
              </div>

              {profile.role === 'ADMINISTRATEUR_ENTREPRISE' ? (
                <div className="p-5 bg-white border border-rose-100 rounded-2xl space-y-4">
                  <p className="text-[12.5px] text-kontrol-dark font-medium leading-relaxed">
                    La clôture de votre compte d'organisation KONTROL détruira de façon irréversible toutes les écritures de ventes (factures, de devis), les données opérationnelles des produits, de devises, d'employés et de trésorerie associés à l'identité <span className="font-extrabold text-rose-600">{profile.companyName}</span>.
                  </p>

                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Détruire mon compte entreprise définitivement
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl text-[12px] text-gray-500 font-medium leading-relaxed">
                  Votre habilitation actuelle (<span className="font-bold">{profile.role}</span>) est insuffisante pour administrer la suppression ou clôture de l'organisation. Veuillez vous rapprocher d'un <span className="font-bold">ADMINISTRATEUR_ENTREPRISE</span> habilité.
                </div>
              )}

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => !deleteLoading && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Détruire le compte d'entreprise ?"
        message="Cette action est irréversible et immédiate. Toutes les écritures de ventes, fiches de paies et analyses financières de votre entreprise seront définitivement supprimées. Êtes-vous absolument sûr de vouloir détruire cette instance ?"
        confirmLabel="Détruire définitivement"
        cancelLabel="Annuler & Retour"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
