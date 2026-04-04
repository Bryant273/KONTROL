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
  Globe
} from 'lucide-react';
import { UserProfile } from '../../types';
import { 
  updateUserProfile, 
  logout, 
  auth, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  logAction
} from '../../firebase';
import { cn } from '../../lib/utils';
import { deleteCompanyAccount } from '../../services/dataResetService';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { countries } from '../../lib/countries';

interface ProfileModuleProps {
  profile: UserProfile | null;
}

export function ProfileModule({ profile }: ProfileModuleProps) {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [passLoading, setPassLoading] = React.useState(false);
  const [passSuccess, setPassSuccess] = React.useState(false);
  const [passError, setPassError] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    displayName: profile?.displayName || '',
    email: profile?.email || '',
    companyName: profile?.companyName || '',
    companyLogo: profile?.companyLogo || '',
    country: profile?.country || '',
    city: profile?.city || '',
    address: profile?.address || ''
  });

  const [passData, setPassData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  React.useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        email: profile.email || '',
        companyName: profile.companyName || '',
        companyLogo: profile.companyLogo || '',
        country: profile.country || '',
        city: profile.city || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, companyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !auth.currentUser) return;

    setLoading(true);
    setSuccess(false);
    try {
      // If email changed, we need to update it in Auth too
      if (formData.email !== profile.email) {
        // This usually requires re-auth, but for simplicity in this demo 
        // we'll just update the profile doc. In a real app, we'd use updateEmail(auth.currentUser, formData.email)
        // after re-authenticating.
      }
      
      await updateUserProfile(profile.uid, formData);
      setSuccess(true);
      
      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Mise à jour profil",
        "Les informations du profil ont été mises à jour"
      );

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile", error);
    } finally {
      setLoading(false);
    }
  };

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
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, passData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, passData.newPassword);
      
      setPassSuccess(true);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      await logAction(
        profile.companyId,
        profile.uid,
        profile.displayName,
        "Modification mot de passe",
        "Le mot de passe a été mis à jour avec succès"
      );

      setTimeout(() => setPassSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error updating password", error);
      if (error.code === 'auth/wrong-password') {
        setPassError("Le mot de passe actuel est incorrect.");
      } else {
        setPassError("Une erreur est survenue lors de la mise à jour du mot de passe.");
      }
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    setDeleteLoading(true);
    try {
      await deleteCompanyAccount(profile.companyId);
      await logout();
    } catch (error) {
      console.error("Error deleting account", error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Mon Profil</h2>
        <p className="text-[13px] text-kontrol-ink-muted mt-1">Gérez vos informations personnelles et celles de votre entreprise</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-kontrol-blue to-kontrol-dark relative">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-xl border border-kontrol-border overflow-hidden">
                  <div className="w-full h-full rounded-xl bg-kontrol-bg flex items-center justify-center overflow-hidden">
                    {formData.companyLogo ? (
                      <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={32} className="text-kontrol-ink-muted" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-12 pb-6 px-6 text-center">
              <h3 className="text-lg font-extrabold text-kontrol-dark leading-tight">{profile.displayName}</h3>
              <p className="text-[12px] text-kontrol-ink-muted mt-1">{profile.email}</p>
              
              <div className="mt-4 inline-flex items-center px-2.5 py-1 rounded-full bg-kontrol-blue/10 text-kontrol-blue text-[10px] font-bold uppercase tracking-widest">
                <Shield size={10} className="mr-1.5" /> {profile.role}
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h4 className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest px-2">Statut du compte</h4>
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span className="text-[12px] font-bold">Vérifié</span>
              </div>
              <span className="text-[10px] uppercase font-extrabold">Actif</span>
            </div>
            <button 
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 p-2.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[13px] font-bold transition-colors"
            >
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </div>

        {/* Main Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="card p-8 space-y-8">
            <div className="space-y-6">
              <h4 className="text-[13px] font-extrabold text-kontrol-dark border-b border-kontrol-border pb-2 flex items-center gap-2">
                <User size={16} className="text-kontrol-blue" /> Informations Personnelles
              </h4>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nom complet</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    />
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Email / Identifiant</label>
                  <div className="relative">
                    <input 
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[13px] font-extrabold text-kontrol-dark border-b border-kontrol-border pb-2 flex items-center gap-2">
                <Building2 size={16} className="text-kontrol-orange" /> Informations Entreprise
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nom de l'entreprise</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Pays</label>
                    <div className="relative">
                      <select 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] appearance-none"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value, city: '' }))}
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
                    <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Ville</label>
                    <div className="relative">
                      <select 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px] appearance-none disabled:opacity-50"
                        value={formData.city}
                        disabled={!formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      >
                        <option value="">Sélectionner une ville</option>
                        {countries.find(c => c.name === formData.country)?.cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Adresse complète</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                      value={formData.address}
                      placeholder="N° de rue, Quartier, etc."
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Logo de l'entreprise</label>
                  <div className="flex items-center gap-4 p-4 bg-kontrol-bg/50 rounded-xl border border-dashed border-kontrol-border">
                    <div className="w-16 h-16 rounded-xl bg-white border border-kontrol-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {formData.companyLogo ? (
                        <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Camera size={24} className="text-kontrol-ink-muted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <span className="inline-block px-4 py-2 bg-white border border-kontrol-border rounded-lg text-[12px] font-bold text-kontrol-dark hover:bg-kontrol-bg transition-colors shadow-sm">
                          Changer le logo
                        </span>
                        <input 
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="text-[10px] text-kontrol-ink-muted mt-1">Format PNG, JPG ou SVG recommandé</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between">
              {success && (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px] animate-in fade-in duration-300">
                  <CheckCircle2 size={16} /> Profil mis à jour !
                </div>
              )}
              <div className="flex-1" />
              <button 
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-kontrol-dark text-white font-extrabold rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Enregistrer les modifications</>}
              </button>
            </div>
          </form>

          {/* Password Section */}
          <form onSubmit={handleUpdatePassword} className="card p-8 space-y-8 mt-8">
            <div className="space-y-6">
              <h4 className="text-[13px] font-extrabold text-kontrol-dark border-b border-kontrol-border pb-2 flex items-center gap-2">
                <Lock size={16} className="text-kontrol-blue" /> Sécurité & Mot de passe
              </h4>

              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[12px] rounded-lg font-medium flex items-center gap-2">
                  <AlertCircle size={14} /> {passError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Mot de passe actuel</label>
                  <div className="relative">
                    <input 
                      type={showPass ? "text" : "password"}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
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
                    <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nouveau mot de passe</label>
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
                    <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Confirmer le nouveau mot de passe</label>
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
            </div>

            <div className="pt-6 flex items-center justify-between">
              {passSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px] animate-in fade-in duration-300">
                  <CheckCircle2 size={16} /> Mot de passe mis à jour !
                </div>
              )}
              <div className="flex-1" />
              <button 
                type="submit"
                disabled={passLoading}
                className="px-8 py-3 bg-kontrol-blue text-white font-extrabold rounded-xl hover:bg-kontrol-blue/90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {passLoading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Mettre à jour le mot de passe</>}
              </button>
            </div>
          </form>

          {/* Danger Zone for Company Owners */}
          {profile.role === 'ADMINISTRATEUR_ENTREPRISE' && (
            <div className="card p-8 space-y-6 mt-8 border-rose-100 bg-rose-50/30">
              <div className="space-y-2">
                <h4 className="text-[13px] font-extrabold text-rose-600 flex items-center gap-2">
                  <AlertTriangle size={16} /> Zone de Danger
                </h4>
                <p className="text-[12px] text-rose-500 font-medium">
                  La suppression de votre compte entreprise est irréversible. Toutes vos données (transactions, produits, clients, utilisateurs) seront définitivement supprimées.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-2.5 bg-rose-600 text-white font-extrabold rounded-xl hover:bg-rose-700 transition-all shadow-md flex items-center gap-2"
                >
                  <Trash2 size={16} /> Supprimer définitivement mon compte entreprise
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => !deleteLoading && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Supprimer mon compte entreprise ?"
        message="Cette action est irréversible. Toutes les données de votre entreprise seront supprimées et vous ne pourrez plus vous connecter. Êtes-vous certain de vouloir continuer ?"
        confirmLabel="Oui, supprimer tout"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
