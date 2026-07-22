import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Search, Loader2 } from 'lucide-react';
import { db, collection, getDocs, doc, getDoc, query, orderBy, handleFirestoreError, OperationType, auth } from '../../../api/firebase';
import { Company, UserProfile } from '../../types';
import { cn } from '../../lib/utils';

interface CompanySelectorProps {
  onSelect: (companyId: string | null) => void;
  selectedId: string | null;
}

export function CompanySelector({ onSelect, selectedId }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkRoleAndFetchCompanies = async () => {
      const user = auth.currentUser;
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);

          const isSuperAdmin = ['ADMINISTRATEUR_ERP', 'GESTIONNAIRE_ERP', 'ADMINISTRATEUR_KONTROL', 'GESTIONNAIRE_KONTROL', 'ADMIN'].includes(profile.role);
          if (isSuperAdmin) {
            setLoading(true);
            const snapshot = await getDocs(query(collection(db, 'companies'), orderBy('name')));
            setCompanies(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
          }
        }
      } catch (error) {
        // Silently catch or handle
      } finally {
        setCheckingRole(false);
        setLoading(false);
      }
    };
    checkRoleAndFetchCompanies();
  }, []);

  const isSuperAdmin = userProfile && ['ADMINISTRATEUR_ERP', 'GESTIONNAIRE_ERP', 'ADMINISTRATEUR_KONTROL', 'GESTIONNAIRE_KONTROL', 'ADMIN'].includes(userProfile.role);

  // Non-super-admins should NEVER see or use the company selector dropdown
  if (checkingRole || !isSuperAdmin) {
    return null;
  }

  const selectedCompany = companies.find(c => c.id === selectedId);
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-kontrol-border rounded-xl hover:border-kontrol-blue transition-all group"
      >
        <div className="w-6 h-6 rounded-lg bg-kontrol-blue/10 text-kontrol-blue flex items-center justify-center">
          <Building2 size={14} />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-widest leading-none">Vue Entreprise</p>
          <p className="text-[12px] font-extrabold text-kontrol-dark truncate max-w-[150px]">
            {selectedCompany?.name || 'Toutes les entreprises'}
          </p>
        </div>
        <ChevronDown size={14} className={cn("text-kontrol-ink-muted transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-kontrol-border z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-kontrol-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-kontrol-bg rounded-xl border border-kontrol-border">
              <Search size={14} className="text-kontrol-ink-muted" />
              <input 
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent border-none outline-none text-[12px] w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            <button
              onClick={() => { onSelect(null); setIsOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all",
                !selectedId ? "bg-kontrol-blue/10 text-kontrol-blue" : "hover:bg-kontrol-bg text-kontrol-ink-soft"
              )}
            >
              Toutes les entreprises
            </button>
            {loading ? (
              <div className="p-4 text-center">
                <Loader2 size={20} className="animate-spin text-kontrol-blue mx-auto" />
              </div>
            ) : (
              filteredCompanies.map(company => (
                <button
                  key={company.id}
                  onClick={() => { onSelect(company.id); setIsOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-3",
                    selectedId === company.id ? "bg-kontrol-blue/10 text-kontrol-blue" : "hover:bg-kontrol-bg text-kontrol-ink-soft"
                  )}
                >
                  <div className="w-6 h-6 rounded-lg bg-kontrol-bg flex items-center justify-center shrink-0">
                    {company.logo ? (
                      <img src={company.logo} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                      <Building2 size={12} />
                    )}
                  </div>
                  <span className="truncate">{company.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
