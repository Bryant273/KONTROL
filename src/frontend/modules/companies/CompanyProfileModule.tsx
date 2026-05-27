import React from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Save, 
  Upload, 
  Loader2,
  CheckCircle2,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { 
  db, 
  doc, 
  getDoc, 
  updateDoc, 
  handleFirestoreError, 
  OperationType, 
  auth 
} from '../../../api/firebase';
import { UserProfile, Company } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { cn } from '../../lib/utils';

interface CompanyProfileModuleProps {
  currentUserProfile: UserProfile | null;
}

export function CompanyProfileModule({ currentUserProfile }: CompanyProfileModuleProps) {
  const [company, setCompany] = React.useState<Company | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  const canUpdate = hasPermission(currentUserProfile?.role, 'COMPANY_UPDATE');

  React.useEffect(() => {
    const fetchCompany = async () => {
      if (!currentUserProfile?.companyId) return;
      
      try {
        const companyDoc = await getDoc(doc(db, 'companies', currentUserProfile.companyId));
        if (companyDoc.exists()) {
          setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
        } else {
          // Fallback to data from user profile if company doc doesn't exist
          setCompany({
            id: currentUserProfile.companyId,
            name: currentUserProfile.companyName || '',
            logo: currentUserProfile.companyLogo || '',
            email: currentUserProfile.email || '',
            status: 'ACTIVE',
            subscriptionTier: 'STANDARD',
            createdAt: Date.now()
          } as Company);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'companies', auth.currentUser, false);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [currentUserProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !canUpdate) return;

    setSaving(true);
    setMessage(null);

    try {
      await updateDoc(doc(db, 'companies', company.id), {
        name: company.name,
        abbreviation: company.abbreviation || '',
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        sector: company.sector || '',
        logo: company.logo || '',
        updatedAt: Date.now()
      });

      // Also update company name and abbreviation in user profile if it changed
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          companyName: company.name,
          companyAbbreviation: company.abbreviation || '',
          companyLogo: company.logo
        });
      }

      setMessage({ type: 'success', text: "Informations de l'entreprise mises à jour avec succès." });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies', auth.currentUser, false);
      setMessage({ type: 'error', text: "Erreur lors de la mise à jour." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 text-kontrol-blue animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="card p-12 text-center">
        <Building2 size={48} className="mx-auto text-kontrol-ink-muted mb-4" />
        <h3 className="text-xl font-bold text-kontrol-dark">Entreprise non trouvée</h3>
        <p className="text-kontrol-ink-muted mt-2">Impossible de charger les informations de votre entreprise.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Profil de l'Entreprise</h2>
        <p className="text-[13px] text-kontrol-ink-muted mt-1">Gérez l'identité visuelle et les coordonnées de votre établissement</p>
      </header>

      {message && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
        )}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="card p-6 flex flex-col items-center">
              <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-4 self-start">Logo Entreprise</p>
              <div className="relative group cursor-pointer w-32 h-32 rounded-3xl bg-kontrol-bg border-2 border-dashed border-kontrol-border flex items-center justify-center overflow-hidden transition-all hover:border-kontrol-blue">
                {company.logo ? (
                  <img src={company.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 size={40} className="text-kontrol-ink-muted" />
                )}
                {canUpdate && (
                  <div className="absolute inset-0 bg-kontrol-dark/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="text-white" size={24} />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-kontrol-ink-muted mt-4 text-center">Format recommandé : PNG ou JPG (max 2MB)</p>
              
              {canUpdate && (
                <div className="w-full mt-4">
                  <input 
                    type="text" 
                    placeholder="URL du logo..."
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-xl text-xs outline-none focus:border-kontrol-blue"
                    value={company.logo || ''}
                    onChange={(e) => setCompany({ ...company, logo: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="card p-6 bg-kontrol-blue/5 border-kontrol-blue/10">
              <p className="text-[11px] font-bold text-kontrol-blue uppercase tracking-widest mb-4">Statut Abonnement</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-kontrol-ink-soft">Tier</span>
                  <span className="px-2 py-0.5 bg-kontrol-blue text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider">{company.subscriptionTier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-kontrol-ink-soft">Statut</span>
                  <span className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md",
                    company.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>{company.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="card p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Nom de l'entreprise</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
                      <input 
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl outline-none focus:border-kontrol-blue transition-all font-medium text-kontrol-dark disabled:opacity-50"
                        value={company.name}
                        onChange={(e) => setCompany({ ...company, name: e.target.value })}
                        disabled={!canUpdate}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Sigle / Abréviation</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
                      <input 
                        type="text"
                        placeholder="Ex: SOG / KTR"
                        maxLength={6}
                        className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl outline-none focus:border-kontrol-blue transition-all font-medium text-kontrol-dark disabled:opacity-50 uppercase"
                        value={company.abbreviation || ''}
                        onChange={(e) => setCompany({ ...company, abbreviation: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        disabled={!canUpdate}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Email professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
                    <input 
                      type="email"
                      className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl outline-none focus:border-kontrol-blue transition-all font-medium text-kontrol-dark disabled:opacity-50"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      disabled={!canUpdate}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
                    <input 
                      type="tel"
                      className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl outline-none focus:border-kontrol-blue transition-all font-medium text-kontrol-dark disabled:opacity-50"
                      value={company.phone || ''}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      disabled={!canUpdate}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Secteur d'activité</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
                    <input 
                      type="text"
                      className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl outline-none focus:border-kontrol-blue transition-all font-medium text-kontrol-dark disabled:opacity-50"
                      value={company.sector || ''}
                      onChange={(e) => setCompany({ ...company, sector: e.target.value })}
                      disabled={!canUpdate}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-right self-end pb-3">
                  <a href="#" className="text-xs text-kontrol-blue font-bold hover:underline flex items-center justify-end gap-1">
                    <Globe size={12} /> Site web (optionnel)
                  </a>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Adresse Siège Social</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-kontrol-ink-muted" size={16} />
                    <textarea 
                      rows={3}
                      className="w-full pl-12 pr-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl outline-none focus:border-kontrol-blue transition-all font-medium text-kontrol-dark disabled:opacity-50 resize-none"
                      value={company.address || ''}
                      onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      disabled={!canUpdate}
                    />
                  </div>
                </div>
              </div>

              {canUpdate && (
                <div className="mt-10 flex justify-end">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="btn-primary py-3 px-8 flex items-center gap-2 shadow-lg shadow-kontrol-blue/20"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer les modifications
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
