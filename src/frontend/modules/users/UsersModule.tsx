import React from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  Mail, 
  MoreVertical, 
  Loader2, 
  X,
  UserCheck,
  UserX,
  Lock,
  Eye,
  Calendar,
  Phone,
  Globe,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { cn } from '../../lib/utils';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  addDoc,
  getDocs,
  setDoc,
  updateDoc,
  doc,
  User,
  auth,
  logAction,
  sendPasswordResetEmail,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';

interface UsersModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function UsersModule({ user, currentUserProfile }: UsersModuleProps) {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterDate, setFilterDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [newUser, setNewUser] = React.useState({
    email: '',
    displayName: '',
    password: '',
    role: 'GESTIONNAIRE_ENTREPRISE' as UserRole
  });

  React.useEffect(() => {
    if (!currentUserProfile || !currentUserProfile.companyId) return;

    const path = 'users';
    const companyId = currentUserProfile.companyId;
    const isERPAdmin = currentUserProfile.role === 'ADMINISTRATEUR_ERP' || currentUserProfile.role === 'GESTIONNAIRE_ERP';
    
    const q = isERPAdmin 
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(collection(db, path), where('companyId', '==', companyId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      console.error("Users list error:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, path, user);
      } catch (e) {
        // Silent catch
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentUserProfile]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const path = 'users';
      const companyId = currentUserProfile?.companyId || user.uid;

      // Check if email already exists
      const q = query(collection(db, path), where('email', '==', newUser.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("Cet e-mail est déjà utilisé par un autre utilisateur.");
        setLoading(false);
        return;
      }

      const newUserRef = doc(collection(db, path));
      const newUid = newUserRef.id;

      const profile: UserProfile = {
        uid: newUid,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        companyId: companyId,
        companyName: currentUserProfile?.companyName || '',
        companyLogo: currentUserProfile?.companyLogo || '',
        isProfileComplete: false,
        active: true,
        createdAt: Date.now()
      };

      if (newUser.password) {
        profile.password = newUser.password;
      }

      await setDoc(newUserRef, profile);

      if (currentUserProfile) {
        await logAction(
          companyId,
          user.uid,
          currentUserProfile.displayName,
          "Création utilisateur",
          `Nom: ${newUser.displayName} (${newUser.email})`
        );
      }

      setIsAdding(false);
      setNewUser({ email: '', displayName: '', password: '', role: 'GESTIONNAIRE_ENTREPRISE' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users', user);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean, userRole: UserRole) => {
    if (userRole === 'ADMINISTRATEUR_ENTREPRISE') {
      alert("Le compte administrateur entreprise ne peut pas être désactivé.");
      return;
    }
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        active: !currentStatus
      });
      
      if (currentUserProfile) {
        await logAction(
          currentUserProfile.companyId,
          user.uid,
          currentUserProfile.displayName,
          currentStatus ? "Désactivation utilisateur" : "Activation utilisateur",
          `Utilisateur: ${userId}`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', user);
    }
  };

  const handleResetPassword = async (email: string, userName: string) => {
    if (!confirm(`Envoyer un email de réinitialisation de mot de passe à ${userName} (${email}) ?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email de réinitialisation envoyé avec succès.");
      
      if (currentUserProfile) {
        await logAction(
          currentUserProfile.companyId,
          user.uid,
          currentUserProfile.displayName,
          "Réinitialisation mot de passe",
          `Utilisateur: ${userName} (${email})`
        );
      }
    } catch (error) {
      console.error("Error sending reset email", error);
      alert("Erreur lors de l'envoi de l'email.");
    }
  };

  const filteredUsers = users
    .filter(u => {
      const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !filterDate || new Date(u.createdAt).toISOString().split('T')[0] === filterDate;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (a.role === 'ADMINISTRATEUR_ENTREPRISE') return -1;
      if (b.role === 'ADMINISTRATEUR_ENTREPRISE') return 1;
      return 0;
    });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isOwner = currentUserProfile?.role === 'ADMINISTRATEUR_ENTREPRISE' || 
                  currentUserProfile?.role === 'GESTIONNAIRE_ENTREPRISE' ||
                  currentUserProfile?.role === 'ADMINISTRATEUR_ERP';

  return (
    <div className="space-y-6">
      {/* Add User Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-kontrol-dark">Nouvel Utilisateur</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Nom complet *</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                  placeholder="Jean Dupont"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Email *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  <input 
                    type="email" required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    placeholder="jean.dupont@exemple.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Mot de passe *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" />
                  <input 
                    type="text" required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    placeholder="Mot de passe temporaire"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Rôle *</label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                >
                  <option value="GESTIONNAIRE_ENTREPRISE">Gestionnaire Entreprise</option>
                  <option value="ADMINISTRATEUR_ENTREPRISE">Administrateur Entreprise</option>
                  <option value="GESTIONNAIRE_ERP">Gestionnaire KONTROL</option>
                  <option value="ADMINISTRATEUR_ERP">Administrateur KONTROL</option>
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full btn-primary py-3 font-bold flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[520px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header with Background */}
            <div className="relative h-40 bg-gradient-to-br from-kontrol-blue via-kontrol-blue-hover to-kontrol-orange">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              <button 
                onClick={() => setSelectedUser(null)} 
                className="absolute top-6 right-6 p-2.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-xl z-10 hover:rotate-90"
              >
                <X size={24} />
              </button>
              
              <div className="absolute -bottom-16 left-10 flex items-end gap-6">
                <div className="w-32 h-32 rounded-[32px] bg-white p-1.5 shadow-2xl">
                  <div className="w-full h-full rounded-[24px] bg-gradient-to-br from-kontrol-bg to-white flex items-center justify-center text-kontrol-blue font-extrabold text-5xl border border-kontrol-border">
                    {selectedUser.displayName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="pb-4">
                  <h3 className="text-3xl font-extrabold text-white tracking-tighter drop-shadow-md">{selectedUser.displayName}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[10px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 rounded-full backdrop-blur-md border",
                      selectedUser.role === 'ADMINISTRATEUR_ENTREPRISE' ? "bg-kontrol-orange/20 text-white border-white/20" : 
                      selectedUser.role === 'GESTIONNAIRE_ENTREPRISE' ? "bg-indigo-500/20 text-white border-white/20" :
                      "bg-kontrol-blue/20 text-white border-white/20"
                    )}>
                      {selectedUser.role === 'ADMINISTRATEUR_ENTREPRISE' ? 'Admin Entreprise' : 
                       selectedUser.role === 'GESTIONNAIRE_ENTREPRISE' ? 'Gestionnaire Entreprise' :
                       selectedUser.role === 'ADMINISTRATEUR_ERP' ? 'Administrateur KONTROL' :
                       selectedUser.role === 'GESTIONNAIRE_ERP' ? 'Gestionnaire KONTROL' :
                       selectedUser.role.replace('_', ' ')}
                    </span>
                    <span className={cn(
                      "text-[10px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 rounded-full backdrop-blur-md border",
                      selectedUser.active !== false ? "bg-emerald-500/20 text-emerald-100 border-emerald-500/20" : "bg-rose-500/20 text-rose-100 border-rose-500/20"
                    )}>
                      {selectedUser.active !== false ? 'Compte Actif' : 'Compte Suspendu'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-24 p-10 space-y-8">
              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] border-b border-kontrol-border pb-2">Informations Générales</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-blue shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Email Professionnel</p>
                        <p className="text-[13px] font-bold text-kontrol-dark truncate">{selectedUser.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-orange shrink-0">
                        <Phone size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Téléphone</p>
                        <p className="text-[13px] font-bold text-kontrol-dark">{selectedUser.phone || 'Non renseigné'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-ink-soft shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Date d'adhésion</p>
                        <p className="text-[13px] font-bold text-kontrol-dark">
                          {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em] border-b border-kontrol-border pb-2">Sécurité & Accès</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-ink-soft shrink-0">
                        <Shield size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Identifiant Unique (UID)</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-kontrol-dark truncate">{selectedUser.uid || selectedUser.id}</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedUser.uid || selectedUser.id || '');
                              alert('ID copié !');
                            }}
                            className="text-[10px] font-extrabold text-kontrol-blue hover:underline shrink-0"
                          >
                            Copier
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-ink-soft shrink-0">
                        <Lock size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Mot de passe</p>
                        {currentUserProfile?.role === 'ADMINISTRATEUR_ENTREPRISE' || currentUserProfile?.uid === selectedUser.uid ? (
                          <p className="text-[13px] font-bold text-kontrol-dark bg-kontrol-bg px-2 py-1 rounded mt-1">
                            {selectedUser.password || 'Non défini'}
                          </p>
                        ) : (
                          <p className="text-[11px] text-kontrol-ink-muted leading-tight">
                            Chiffré et sécurisé. <br />
                            Non visible pour votre sécurité.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-6 border-t border-kontrol-border flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[11px] text-kontrol-ink-muted font-medium">
                    Dernière activité : {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Inconnue'}
                  </p>
                </div>
                <div className="flex gap-3">
                  {isOwner && selectedUser.uid !== currentUserProfile?.uid && (
                    <>
                      <button 
                        onClick={() => handleResetPassword(selectedUser.email, selectedUser.displayName)}
                        className="px-5 py-2.5 bg-white border border-kontrol-border text-kontrol-dark text-[12px] font-extrabold rounded-2xl hover:bg-kontrol-bg transition-all flex items-center gap-2"
                      >
                        <Lock size={14} /> Réinitialiser
                      </button>
                      <button 
                        onClick={() => toggleUserStatus(selectedUser.id!, selectedUser.active !== false, selectedUser.role)}
                        className={cn(
                          "px-5 py-2.5 text-[12px] font-extrabold rounded-2xl transition-all flex items-center gap-2",
                          selectedUser.active !== false 
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100" 
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        )}
                      >
                        {selectedUser.active !== false ? <><UserX size={14} /> Suspendre</> : <><UserCheck size={14} /> Réactiver</>}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight">Gestion de l'équipe</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Consultez et gérez les accès des membres de votre entreprise</p>
        </div>
        {isOwner && (
          <button onClick={() => setIsAdding(true)} className="btn-primary text-xs py-2 px-5 flex items-center gap-2 shadow-lg shadow-kontrol-blue/20">
            <UserPlus size={14} /> Ajouter un membre
          </button>
        )}
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white border border-kontrol-border rounded-2xl p-2 flex items-center gap-2 shadow-sm">
          <div className="flex-1 flex items-center gap-3 bg-kontrol-bg/50 border border-kontrol-border rounded-xl px-4 py-2 focus-within:border-kontrol-blue focus-within:bg-white transition-all">
            <Search size={16} className="text-kontrol-ink-muted" />
            <input 
              type="text"
              placeholder="Rechercher par nom, email, rôle..."
              className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted font-medium"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2 bg-kontrol-bg/50 border border-kontrol-border rounded-xl px-4 py-2">
            <Calendar size={16} className="text-kontrol-ink-muted" />
            <input 
              type="date"
              className="bg-transparent border-none outline-none text-[13px] font-medium text-kontrol-ink-soft"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div className="bg-kontrol-blue/5 border border-kontrol-blue/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-kontrol-blue uppercase tracking-widest">Total Membres</p>
            <p className="text-2xl font-extrabold text-kontrol-blue">{users.length}</p>
          </div>
          <Users className="text-kontrol-blue/20" size={32} />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden border-none shadow-xl shadow-kontrol-dark/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-kontrol-bg/50 border-b border-kontrol-border">
                <th className="px-6 py-4 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Utilisateur</th>
                <th className="px-6 py-4 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Rôle</th>
                <th className="px-6 py-4 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Statut</th>
                <th className="px-6 py-4 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Créé le</th>
                <th className="px-6 py-4 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kontrol-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={32} />
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-kontrol-ink-muted text-sm">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-kontrol-bg/30 transition-colors group even:bg-kontrol-bg/10">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-kontrol-bg flex items-center justify-center text-kontrol-blue font-bold text-sm border border-kontrol-border group-hover:border-kontrol-blue/30 transition-colors">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-kontrol-dark truncate">{u.displayName}</p>
                          <p className="text-[11px] text-kontrol-ink-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.role === 'ADMINISTRATEUR_ENTREPRISE' ? (
                          <Shield size={14} className="text-kontrol-orange" />
                        ) : u.role === 'GESTIONNAIRE_ENTREPRISE' ? (
                          <Users size={14} className="text-indigo-500" />
                        ) : (
                          <Shield size={14} className="text-kontrol-blue" />
                        )}
                        <span className={cn(
                          "text-[11px] font-bold",
                          u.role === 'ADMINISTRATEUR_ENTREPRISE' ? "text-kontrol-orange" : 
                          u.role === 'GESTIONNAIRE_ENTREPRISE' ? "text-indigo-500" :
                          "text-kontrol-blue"
                        )}>
                          {u.role === 'ADMINISTRATEUR_ENTREPRISE' ? 'Admin Entreprise' : 
                           u.role === 'GESTIONNAIRE_ENTREPRISE' ? 'Gestionnaire Entreprise' :
                           u.role === 'ADMINISTRATEUR_ERP' ? 'Administrateur KONTROL' :
                           u.role === 'GESTIONNAIRE_ERP' ? 'Gestionnaire KONTROL' :
                           u.role.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        u.active !== false ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.active !== false ? "bg-emerald-500" : "bg-rose-500")} />
                        {u.active !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-kontrol-ink-muted font-medium">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-kontrol-blue/10 text-kontrol-blue hover:bg-kontrol-blue/20 rounded-lg transition-all text-[11px] font-bold"
                        >
                          <Eye size={14} /> Voir
                        </button>
                        {isOwner && u.uid !== currentUserProfile?.uid && (
                          <div className="relative group/actions">
                            <button className="p-2 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-lg transition-all">
                              <MoreVertical size={16} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-kontrol-border rounded-xl shadow-xl hidden group-hover/actions:block z-10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                              <button 
                                onClick={() => handleResetPassword(u.email, u.displayName)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] text-kontrol-ink-soft hover:bg-kontrol-bg text-left"
                              >
                                <Lock size={14} /> Réinitialiser MDP
                              </button>
                              <button 
                                onClick={() => toggleUserStatus(u.id!, u.active !== false, u.role)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-4 py-2.5 text-[12px] text-left",
                                  u.active !== false ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                                )}
                              >
                                {u.active !== false ? <><UserX size={14} /> Désactiver</> : <><UserCheck size={14} /> Activer</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
          <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
            {filteredUsers.length} utilisateurs au total
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
                >
                  <ArrowDownLeft size={16} className="rotate-45" />
                </button>
                <span className="text-[11.5px] font-bold text-kontrol-dark">
                  Page {currentPage} sur {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
                >
                  <ArrowUpRight size={16} className="rotate-45" />
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
