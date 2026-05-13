import React from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock,
  Trash2
} from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  handleFirestoreError,
  OperationType,
  auth
} from '../../../api/firebase';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
  companyId: string;
  link?: string;
}

interface NotificationCenterProps {
  profile: UserProfile | null;
  onNavigate?: (tab: string, section: string, label: string) => void;
}

export function NotificationCenter({ profile, onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }

    if (notif.link && onNavigate) {
      // Basic link parsing (e.g., /admin?tab=subscriptions)
      if (notif.link.includes('admin')) {
        onNavigate('admin', 'Système', 'Tour de contrôle');
      } else if (notif.link.includes('tickets')) {
        onNavigate('tickets', 'Support', 'Tickets Support');
      } else if (notif.link.includes('subscriptions')) {
        onNavigate('subscriptions', 'Entreprise', 'Mon Abonnement');
      }
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (!profile?.companyId) return;

    const q = query(
      collection(db, 'notifications'),
      where('companyId', '==', profile.companyId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications', auth.currentUser, false));

    return () => unsubscribe();
  }, [profile]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`, auth.currentUser, false);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0 || notifications.every(n => n.read)) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications', auth.currentUser, false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`, auth.currentUser, false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'warning': return <AlertCircle size={16} className="text-amber-500" />;
      case 'error': return <AlertCircle size={16} className="text-rose-500" />;
      default: return <Info size={16} className="text-kontrol-blue" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-xl transition-all active:scale-95"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-kontrol-orange text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in duration-300">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-kontrol-border overflow-hidden z-[1000] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
            <h3 className="text-[14px] font-extrabold text-kontrol-dark">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button 
                  onClick={async () => {
                    if (window.confirm("Tout effacer ?")) {
                      try {
                        const batch = writeBatch(db);
                        notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
                        await batch.commit();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.DELETE, 'notifications', auth.currentUser, false);
                      }
                    }
                  }}
                  className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                  title="Tout effacer"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-kontrol-blue hover:underline"
                >
                  Tout lu
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-kontrol-border rounded-lg text-kontrol-ink-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-kontrol-border">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted mx-auto mb-3">
                  <Bell size={24} />
                </div>
                <p className="text-[13px] text-kontrol-ink-muted">Aucune notification pour le moment</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={cn(
                    "p-4 flex gap-3 hover:bg-kontrol-bg/50 transition-colors group relative cursor-pointer text-left w-full",
                    !notif.read && "bg-kontrol-blue/5"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1 pr-6">
                    <div className="flex items-center justify-between">
                      <h4 className={cn("text-[13px] font-bold", notif.read ? "text-kontrol-dark" : "text-kontrol-blue")}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-kontrol-ink-muted flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(notif.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[12px] text-kontrol-ink-soft leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-kontrol-ink-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-kontrol-border bg-kontrol-bg/30 text-center">
              <button 
                onClick={() => {
                  if (onNavigate) onNavigate('notifications', 'Système', 'Centre de Notifications');
                  setIsOpen(false);
                }}
                className="text-[12px] font-bold text-kontrol-ink-muted hover:text-kontrol-dark transition-colors"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
