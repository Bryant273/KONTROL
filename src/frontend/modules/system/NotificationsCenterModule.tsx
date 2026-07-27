import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Filter,
  MoreVertical,
  ChevronRight,
  Clock,
  Calendar,
  X
} from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  getDocs,
  auth,
  handleFirestoreError,
  OperationType
} from '../../../api/firebase';
import { UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'update';
  read: boolean;
  timestamp: number;
  companyId: string;
  link?: string;
  isUpdate?: boolean;
  versionNumber?: string;
  versionDescription?: string;
  versionFeatures?: string[];
  versionAuthor?: string;
}

interface NotificationsCenterModuleProps {
  profile: UserProfile | null;
  onNavigate?: (tab: string, section: string, label: string) => void;
}

export function NotificationsCenterModule({ profile, onNavigate }: NotificationsCenterModuleProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  useEffect(() => {
    if (!profile?.companyId) return;

    const q = query(
      collection(db, 'notifications'),
      where('companyId', '==', profile.companyId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications', auth.currentUser, false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`, auth.currentUser, false);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications/all', auth.currentUser, false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`, auth.currentUser, false);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Voulez-vous vraiment effacer tout votre historique de notifications ?")) return;
    
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications/all', auth.currentUser, false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} className="text-emerald-500" />;
      case 'warning': return <AlertCircle size={20} className="text-amber-500" />;
      case 'error': return <AlertCircle size={20} className="text-rose-500" />;
      default: return <Info size={20} className="text-kontrol-blue" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' 
      ? true 
      : filterType === 'update' 
        ? (n.isUpdate === true || n.type === 'update')
        : n.type === filterType;
    const matchesUnread = !showOnlyUnread || !n.read;
    return matchesSearch && matchesType && matchesUnread;
  });

  const resolveNotificationDestination = (notif: any): { tab: string; section: string; label: string; entityId: string } | null => {
    const linkStr = (notif.link || '').trim();
    let tab = '';
    let section = 'Gestion';
    let label = '';
    let entityId = notif.productId || notif.metadata?.productId || notif.transactionId || notif.metadata?.transactionId || '';

    if (linkStr && linkStr.includes(':')) {
      const parts = linkStr.split(':');
      const entityType = parts[0].toLowerCase().trim();
      if (parts[1]) entityId = parts[1].trim();

      if (entityType.startsWith('transaction') || entityType.startsWith('vente') || entityType.startsWith('achat')) {
        tab = 'transactions';
        label = 'Transactions';
      } else if (entityType.startsWith('product') || entityType.startsWith('produit')) {
        tab = 'produits';
        label = 'Produits & Services';
      } else if (entityType.startsWith('stock')) {
        tab = 'stocks';
        label = 'Stocks & Inventaire';
      } else if (entityType.startsWith('tier') || entityType.startsWith('client') || entityType.startsWith('fournisseur')) {
        tab = 'tiers';
        label = 'Partenaires & Tiers';
      } else if (entityType.startsWith('charge') || entityType.startsWith('depense')) {
        tab = 'charges';
        label = 'Dépenses & Charges';
      } else if (entityType.startsWith('ticket')) {
        tab = 'tickets';
        section = 'Support';
        label = 'Tickets Support';
      } else if (entityType.startsWith('subscription') || entityType.startsWith('abonnement')) {
        tab = 'abonnements';
        section = 'Système';
        label = 'Mon Abonnement';
      }
    }

    if (!tab && linkStr) {
      const lowerLink = linkStr.toLowerCase();
      if (lowerLink.includes('stock')) {
        tab = 'stocks';
        label = 'Stocks & Inventaire';
      } else if (lowerLink.includes('product') || lowerLink.includes('produit')) {
        tab = 'produits';
        label = 'Produits & Services';
      } else if (lowerLink.includes('transaction') || lowerLink.includes('vente') || lowerLink.includes('achat')) {
        tab = 'transactions';
        label = 'Transactions';
      } else if (lowerLink.includes('charge') || lowerLink.includes('depense')) {
        tab = 'charges';
        label = 'Dépenses & Charges';
      } else if (lowerLink.includes('ticket')) {
        tab = 'tickets';
        section = 'Support';
        label = 'Tickets Support';
      } else if (lowerLink.includes('subscription') || lowerLink.includes('abonnement')) {
        tab = 'abonnements';
        section = 'Système';
        label = 'Mon Abonnement';
      } else if (lowerLink.includes('company') || lowerLink.includes('admin') || lowerLink.includes('entreprise')) {
        tab = 'company_hub';
        section = 'Système';
        label = 'Entreprise';
      }
    }

    if (!tab) {
      if (notif.isStockAlert || notif.metadata?.isStockAlert) {
        tab = 'stocks';
        label = 'Stocks & Inventaire';
      } else if (notif.isPaymentError || notif.metadata?.isPaymentError) {
        tab = 'transactions';
        label = 'Transactions';
      } else if (notif.isSecurityAlert || notif.metadata?.isSecurityAlert) {
        tab = 'journal';
        section = 'Système';
        label = "Journal d'Actions";
      }
    }

    if (!tab) {
      const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
      if (text.includes('stock') || text.includes('rupture') || text.includes('inventaire') || text.includes('seuil')) {
        tab = 'stocks';
        label = 'Stocks & Inventaire';
      } else if (text.includes('produit') || text.includes('article') || text.includes('service')) {
        tab = 'produits';
        label = 'Produits & Services';
      } else if (text.includes('transaction') || text.includes('vente') || text.includes('achat') || text.includes('facture') || text.includes('commande') || text.includes('encaissement') || text.includes('décaissement')) {
        tab = 'transactions';
        label = 'Transactions';
      } else if (text.includes('charge') || text.includes('dépense') || text.includes('depense')) {
        tab = 'charges';
        label = 'Dépenses & Charges';
      } else if (text.includes('ticket') || text.includes('support')) {
        tab = 'tickets';
        section = 'Support';
        label = 'Tickets Support';
      } else if (text.includes('abonnement') || text.includes('forfait') || text.includes('licence') || text.includes('expiration')) {
        tab = 'abonnements';
        section = 'Système';
        label = 'Mon Abonnement';
      } else if (text.includes('tiers') || text.includes('client') || text.includes('fournisseur') || text.includes('partenaire')) {
        tab = 'tiers';
        label = 'Partenaires & Tiers';
      } else if (text.includes('sécurité') || text.includes('securite') || text.includes('action')) {
        tab = 'journal';
        section = 'Système';
        label = "Journal d'Actions";
      }
    }

    if (!tab) return null;
    return { tab, section, label, entityId };
  };

  const handleAction = (notif: any) => {
    if (!notif.read) markAsRead(notif.id);
    
    // Intercept update notifications and open detailed release modal
    if (notif.isUpdate || notif.versionNumber || (notif.link && notif.link.startsWith('version:'))) {
      const versionData = {
        id: notif.id,
        version: notif.versionNumber || notif.link?.split(':')[1] || notif.title || 'Inconnu',
        description: notif.versionDescription || notif.message,
        features: notif.versionFeatures || [],
        author: notif.versionAuthor || "Innov'Korp Team",
        releaseDate: notif.timestamp || Date.now()
      };
      window.dispatchEvent(new CustomEvent('show-version-update-details', { detail: versionData }));
      return;
    }

    const dest = resolveNotificationDestination(notif);
    if (dest && onNavigate) {
      if (dest.entityId) {
        localStorage.setItem(`selected_target_id_${dest.tab}`, dest.entityId);
        window.dispatchEvent(new CustomEvent(`select-entity-${dest.tab}`, { detail: { id: dest.entityId } }));
        window.dispatchEvent(new CustomEvent(`select-entity-produits`, { detail: { id: dest.entityId } }));
        window.dispatchEvent(new CustomEvent(`select-entity-stocks`, { detail: { id: dest.entityId } }));
      }
      onNavigate(dest.tab, dest.section, dest.label);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with quick stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-kontrol-dark uppercase tracking-tighter">Centre de Notifications</h2>
          <p className="text-sm text-kontrol-ink-muted font-medium">Gérez vos alertes et gardez un œil sur l'activité de votre entreprise.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            disabled={!notifications.some(n => !n.read)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-kontrol-border rounded-xl text-[11px] font-extrabold uppercase tracking-widest text-kontrol-blue hover:bg-kontrol-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={14} /> Tout marquer comme lu
          </button>
          <button 
            onClick={clearAllNotifications}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-extrabold uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50"
          >
            <Trash2 size={14} /> Effacer l'historique
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/50 backdrop-blur-sm border border-kontrol-border p-4 rounded-2xl flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={18} />
          <input 
            type="text"
            placeholder="Rechercher une notification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-kontrol-border rounded-xl text-sm focus:ring-2 focus:ring-kontrol-blue focus:border-transparent outline-none transition-all font-medium"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-kontrol-bg p-1 rounded-xl border border-kontrol-border min-w-fit">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'info', label: 'Info' },
              { id: 'success', label: 'Succès' },
              { id: 'update', label: 'Mises à jour' },
              { id: 'warning', label: 'Alertes' },
              { id: 'error', label: 'Erreurs' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all",
                  filterType === type.id 
                    ? "bg-white text-kontrol-dark shadow-sm border border-kontrol-border" 
                    : "text-kontrol-ink-muted hover:text-kontrol-ink"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all border",
              showOnlyUnread 
                ? "bg-kontrol-blue text-white border-kontrol-blue shadow-lg shadow-kontrol-blue/20" 
                : "bg-white text-kontrol-ink-muted border-kontrol-border hover:bg-kontrol-bg"
            )}
          >
            {showOnlyUnread ? "Voir Tout" : "Non lues uniquement"}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-kontrol-blue/30 border-t-kontrol-blue rounded-full animate-spin" />
            <p className="text-sm font-bold text-kontrol-ink-muted animate-pulse uppercase tracking-widest">Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white/50 border border-dashed border-kontrol-border rounded-3xl p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-kontrol-bg rounded-full flex items-center justify-center text-kontrol-ink-muted mb-6">
              <Bell size={40} className="opacity-20" />
            </div>
            <h3 className="text-xl font-black text-kontrol-dark uppercase tracking-tighter mb-2">Aucune notification trouvée</h3>
            <p className="text-sm text-kontrol-ink-muted max-w-xs mx-auto">
              {searchTerm || filterType !== 'all' || showOnlyUnread 
                ? "Ajustez vos filtres pour trouver ce que vous cherchez." 
                : "Votre centre de notifications est vide pour le moment."}
            </p>
            {(searchTerm || filterType !== 'all' || showOnlyUnread) && (
              <button 
                onClick={() => { setSearchTerm(''); setFilterType('all'); setShowOnlyUnread(false); }}
                className="mt-6 text-xs font-extrabold text-kontrol-blue uppercase tracking-widest hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notif) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={notif.id}
                  className={cn(
                    "group relative bg-white border rounded-2xl p-4 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden",
                    notif.read ? "border-kontrol-border opacity-75" : "border-kontrol-blue/20 shadow-md ring-1 ring-kontrol-blue/5"
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      notif.read ? "bg-kontrol-bg text-kontrol-ink-muted" : "bg-kontrol-blue/10"
                    )}>
                      {getTypeIcon(notif.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                        <h4 className={cn("text-[15px] font-black uppercase tracking-tight", notif.read ? "text-kontrol-ink" : "text-kontrol-dark")}>
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="px-2 py-0.5 bg-kontrol-blue text-white text-[9px] font-black rounded-full uppercase tracking-widest">Nouveau</span>
                        )}
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-kontrol-ink-muted bg-kontrol-bg px-2 py-0.5 rounded-lg border border-kontrol-border">
                          <Calendar size={10} />
                          {new Date(notif.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          <Clock size={10} className="ml-1" />
                          {new Date(notif.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className={cn("text-[13px] leading-relaxed", notif.read ? "text-kontrol-ink-soft" : "text-kontrol-ink")}>
                        {notif.message}
                      </p>

                      {(notif.link || notif.isUpdate || notif.versionNumber) && (
                        <button 
                          onClick={() => handleAction(notif)}
                          className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-kontrol-blue uppercase tracking-widest hover:gap-2 transition-all group-link"
                        >
                          Voir les détails <ChevronRight size={14} />
                        </button>
                      )}
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {!notif.read && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          title="Marquer comme lu"
                          className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white border border-emerald-100 transition-all shadow-sm"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notif.id)}
                        title="Supprimer"
                        className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white border border-rose-100 transition-all shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Quick Summary / Statistics at the bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10">
        {[
          { label: 'Total Notifications', value: notifications.length, color: 'kontrol-dark' },
          { label: 'Non lues', value: notifications.filter(n => !n.read).length, color: 'kontrol-blue' },
          { label: 'Succès', value: notifications.filter(n => n.type === 'success').length, color: 'emerald-600' },
          { label: 'Alertes/Erreurs', value: notifications.filter(n => n.type === 'warning' || n.type === 'error').length, color: 'rose-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-kontrol-border p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-black tracking-tighter", `text-${stat.color}`)}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
