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
  AlertCircle,
  Eye,
  FileText,
  Compass
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
import { cacheCompanyLogo, updateFavicon } from '../../lib/logoCache';

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
      const signatureVal = company.signatureUrl || company.companySignature || '';
      await updateDoc(doc(db, 'companies', company.id), {
        name: company.name,
        abbreviation: company.abbreviation || '',
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        sector: company.sector || '',
        logo: company.logo || '',
        signatureUrl: signatureVal,
        companySignature: signatureVal,
        updatedAt: Date.now()
      });

      // Also update company name, abbreviation and signature in user profile if it changed
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          companyName: company.name,
          companyAbbreviation: company.abbreviation || '',
          companyLogo: company.logo,
          signatureUrl: signatureVal,
          companySignature: signatureVal
        });
      }

      if (company.logo) {
        await cacheCompanyLogo(company.logo);
      } else {
        updateFavicon('/favicon.svg');
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
                <div className="w-full mt-4 space-y-2">
                  <label className="w-full py-2 bg-kontrol-blue/10 hover:bg-kontrol-blue/20 text-kontrol-blue font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-kontrol-blue/20">
                    <Upload size={14} />
                    <span>Importer logo (PNG/JPG/SVG)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          setCompany({ ...company, logo: dataUrl });
                          updateFavicon(dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }} 
                    />
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ou URL du logo..."
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-xl text-xs outline-none focus:border-kontrol-blue"
                    value={company.logo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompany({ ...company, logo: val });
                      if (val) updateFavicon(val);
                    }}
                  />
                  {company.logo && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompany({ ...company, logo: '' });
                        updateFavicon('/favicon.svg');
                      }}
                      className="w-full py-1 text-[10px] text-rose-600 hover:text-rose-800 font-bold text-center"
                    >
                      Supprimer le logo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Signature Officielle Card */}
            <div className="card p-6 flex flex-col items-center">
              <p className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-4 self-start flex items-center gap-1.5">
                <span>Signature & Cachet Officiel</span>
              </p>

              <div className="relative group w-full h-28 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all hover:border-kontrol-blue p-2">
                {company.companySignature || company.signatureUrl ? (
                  <img src={company.companySignature || company.signatureUrl} alt="Signature Officielle" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center p-2">
                    <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-medium block">Aucune signature chargée</span>
                  </div>
                )}
              </div>

              {canUpdate && (
                <div className="w-full mt-3 space-y-2">
                  <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5">
                    <Upload size={14} />
                    <span>Importer image (PNG/JPG)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          setCompany({ ...company, companySignature: dataUrl, signatureUrl: dataUrl });
                        };
                        reader.readAsDataURL(file);
                      }} 
                    />
                  </label>
                  {(company.companySignature || company.signatureUrl) && (
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, companySignature: '', signatureUrl: '' })}
                      className="w-full py-1 text-[10px] text-rose-600 hover:text-rose-800 font-bold text-center"
                    >
                      Supprimer la signature
                    </button>
                  )}
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

        {/* Live Preview Zone */}
        <div className="card p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Eye className="text-kontrol-sky" size={20} />
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Zone de Prévisualisation en Direct</h3>
                <p className="text-[11px] text-slate-400">Aperçu dynamique du logo sur vos documents et dans le navigateur avant enregistrement</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Aperçu en temps réel
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Browser Tab Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><Compass size={14} className="text-kontrol-sky" /> 1. Onglet du Navigateur (Favicon)</span>
                <span className="text-slate-500 text-[10px]">Sync Head Tag</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-t-xl px-3 py-2.5 max-w-xs shadow-inner">
                  <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {company.logo ? (
                      <img src={company.logo} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-black text-kontrol-sky">{company.abbreviation || company.name.substring(0, 2) || 'K'}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {company.name ? `${company.name} | KONTROL ERP` : 'KONTROL ERP'}
                  </span>
                  <span className="text-slate-500 ml-auto text-xs font-mono">×</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 text-[10px] text-slate-400 border-t border-slate-800/80 rounded-b-xl flex items-center justify-between">
                  <span>MIME Type : <code className="text-kontrol-sky">{company.logo ? (company.logo.includes('svg') ? 'image/svg+xml' : 'image/png') : 'image/svg+xml'}</code></span>
                  <span className="text-emerald-400 font-medium">Injection instantanée</span>
                </div>
              </div>
            </div>

            {/* Print Header Document Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><FileText size={14} className="text-kontrol-sky" /> 2. En-tête de Document Officiel (Factures/Devis)</span>
                <span className="text-slate-500 text-[10px]">A4 Print Header</span>
              </div>
              <div className="bg-white text-slate-900 p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {company.logo ? (
                        <img src={company.logo} alt="Logo Facture" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {company.abbreviation || company.name.substring(0, 2) || 'K'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{company.name || 'NOM DE VOTRE ENTREPRISE'}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{company.address || 'Adresse du siège social, Ville'}</p>
                      <p className="text-[10px] text-slate-500">{company.phone ? `Tél: ${company.phone}` : ''} {company.email ? `• ${company.email}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded border border-blue-200">FACTURE N° FAC-2026-0001</span>
                    <p className="text-[9px] text-slate-400 mt-1">Date : 28/07/2026</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>En-tête haute définition pour impression et export PDF</span>
                  <span className="font-mono text-slate-600">jsPDF Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
