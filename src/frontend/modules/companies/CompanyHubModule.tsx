import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { User } from '../../../api/firebase';
import { ProfileModule } from '../profile/ProfileModule';
import { UsersModule } from '../users/UsersModule';
import { hasPermission } from '../../lib/permissions';

interface CompanyHubModuleProps {
  profile: UserProfile | null;
  user: User;
  initialSubTab?: 'profile' | 'team';
}

export function CompanyHubModule({ profile, user, initialSubTab = 'profile' }: CompanyHubModuleProps) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'team'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const isManager = profile?.role === 'GESTIONNAIRE_ENTREPRISE';
  const isAdmin = profile?.role === 'ADMINISTRATEUR_ENTREPRISE';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Upper header card */}
      <div className="bg-white rounded-3xl p-6 border border-kontrol-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">
            Hub de l'Organisation
          </h2>
          <p className="text-xs text-kontrol-ink-muted mt-1 uppercase tracking-wider font-bold">
            Gérez l'identité de l'entreprise et les droits d'accès de vos collaborateurs
          </p>
        </div>

        {/* Sub-navigation controls */}
        <div className="flex bg-kontrol-bg p-1 rounded-2xl border border-kontrol-border shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'profile'
                ? 'bg-kontrol-blue text-white shadow-lg shadow-kontrol-blue/25'
                : 'text-kontrol-ink-soft hover:bg-kontrol-border'
            }`}
          >
            <Building2 size={14} />
            Identité d'Entreprise
          </button>
          <button
            onClick={() => setActiveSubTab('team')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'team'
                ? 'bg-kontrol-blue text-white shadow-lg shadow-kontrol-blue/25'
                : 'text-kontrol-ink-soft hover:bg-kontrol-border'
            }`}
          >
            <Users size={14} />
            Collaborateurs
          </button>
        </div>
      </div>

      {/* Access indicator for managers if on Profile tab */}
      {isManager && activeSubTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-2xl flex items-start gap-3"
        >
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
              Accès Gestionnaire (Lecture Seule)
            </h4>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
              En tant que gestionnaire, vous pouvez visualiser les informations fiduciaires de l'entreprise. 
              Cependant, seul le compte d'administration corporate (Compte Entreprise) est habilité à les modifier.
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Switch Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeSubTab === 'profile' ? (
            <ProfileModule profile={profile} initialSection="COMPANY" />
          ) : (
            <UsersModule user={user} currentUserProfile={profile} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
