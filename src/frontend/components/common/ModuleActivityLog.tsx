import React from 'react';
import { History, Clock, ArrowRight, Activity, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from '../../../api/firebase';
import { cn } from '../../lib/utils';

interface ActionLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: any;
}

interface ModuleActivityLogProps {
  companyId: string;
  moduleName?: string; // Optional filter for action text
  limitCount?: number;
  title?: string;
}

export function ModuleActivityLog({ companyId, moduleName, limitCount = 50, title = "Activité du module" }: ModuleActivityLogProps) {
  const [actions, setActions] = React.useState<ActionLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    if (!companyId) return;
    
    setLoading(true);
    const constraints: any[] = [
      where('companyId', '==', companyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    ];

    const q = query(collection(db, 'actions'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActionLog[];
      
      // Client-side filter if moduleName is provided
      if (moduleName) {
        data = data.filter(a => 
          a.action.toLowerCase().includes(moduleName.toLowerCase()) || 
          (a.details || '').toLowerCase().includes(moduleName.toLowerCase())
        );
      }
      
      setActions(data);
      setLoading(false);
    }, (error) => {
      console.error("Module actions fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, moduleName, limitCount]);

  const totalPages = Math.ceil(actions.length / itemsPerPage);
  const paginatedActions = actions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-kontrol-blue" size={20} />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-hd bg-kontrol-bg/30">
        <div className="flex items-center gap-2">
          <History size={16} className="text-kontrol-ink-muted" />
          <h4 className="card-title">{title}</h4>
        </div>
      </div>
      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <tbody className="divide-y divide-kontrol-border">
              {actions.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-kontrol-ink-muted">
                    Aucune activité récente.
                  </td>
                </tr>
              ) : (
                paginatedActions.map((action, idx) => (
                  <tr key={action.id} className={cn(
                    "hover:bg-kontrol-bg/30 transition-colors",
                    idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10"
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted">
                          <Clock size={12} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-kontrol-dark">{action.action}</span>
                          <span className="text-[10px] text-kontrol-ink-muted">
                            {action.userName} · {action.timestamp?.toDate ? action.timestamp.toDate().toLocaleString() : new Date(action.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={10} className="text-kontrol-ink-muted opacity-30" />
                        <span className="text-kontrol-ink-soft truncate max-w-[200px]">
                          {action.details || '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11px] text-kontrol-ink-muted font-bold uppercase tracking-widest">
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
              >
                <ArrowDownLeft size={14} className="rotate-45" />
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
              >
                <ArrowUpRight size={14} className="rotate-45" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
