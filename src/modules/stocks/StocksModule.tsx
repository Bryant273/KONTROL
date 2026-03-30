import React from 'react';
import { 
  Boxes, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  History, 
  TrendingUp, 
  TrendingDown,
  Package,
  Info
} from 'lucide-react';
import { StockMovement, Produit, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  User 
} from '../../firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

interface StocksModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function StocksModule({ user, currentUserProfile }: StocksModuleProps) {
  const companyId = currentUserProfile?.companyId || user.uid;
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeView, setActiveView] = React.useState<'MOVEMENTS' | 'INVENTORY'>('MOVEMENTS');

  React.useEffect(() => {
    if (!currentUserProfile || !companyId) return;
    const unsubscribes: (() => void)[] = [];

    // Fetch Movements
    const qMovements = query(
      collection(db, 'stock_movements'),
      where('ownerId', '==', companyId),
      orderBy('date', 'desc')
    );
    unsubscribes.push(onSnapshot(qMovements, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StockMovement[]);
    }, (error) => {
      console.error("Stock movements list error:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'stock_movements', user);
      } catch (e) {}
    }));

    // Fetch Produits for Inventory View
    const qProduits = query(
      collection(db, 'produits'),
      where('ownerId', '==', companyId),
      orderBy('designation', 'asc')
    );
    unsubscribes.push(onSnapshot(qProduits, (snapshot) => {
      setProduits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Produit[]);
      setLoading(false);
    }, (error) => {
      console.error("Produits list error in Stocks:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'produits', user);
      } catch (e) {}
      setLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, companyId, currentUserProfile]);

  const filteredMovements = movements.filter(m => 
    m.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.produitId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = produits.filter(p => 
    p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Gestion des Stocks</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Mouvements automatiques & Valorisation CUMP</p>
        </div>
        <div className="flex bg-kontrol-bg p-1 rounded-xl">
          <button 
            onClick={() => setActiveView('MOVEMENTS')}
            className={cn(
              "px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all",
              activeView === 'MOVEMENTS' ? "bg-white text-kontrol-dark shadow-sm" : "text-kontrol-ink-muted hover:text-kontrol-dark"
            )}
          >
            Mouvements
          </button>
          <button 
            onClick={() => setActiveView('INVENTORY')}
            className={cn(
              "px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all",
              activeView === 'INVENTORY' ? "bg-white text-kontrol-dark shadow-sm" : "text-kontrol-ink-muted hover:text-kontrol-dark"
            )}
          >
            État du stock
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="kpi">
          <p className="kpi-lbl">Valeur Totale (CUMP)</p>
          <h3 className="kpi-val text-kontrol-blue">
            {formatCurrency(produits.reduce((acc, p) => acc + (p.stock * (p.cump || p.prixAchat)), 0))}
          </h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Entrées (Mois)</p>
          <h3 className="kpi-val text-emerald-600">
            {movements.filter(m => m.type === 'ENTREE').length}
          </h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Sorties (Mois)</p>
          <h3 className="kpi-val text-rose-600">
            {movements.filter(m => m.type === 'SORTIE').length}
          </h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Ruptures / Alertes</p>
          <h3 className="kpi-val text-kontrol-orange">
            {produits.filter(p => p.stock <= 10).length}
          </h3>
        </div>
      </div>

      {/* Search & Tools */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder="Rechercher un produit..."
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
          <History size={14} /> Exporter
        </button>
      </div>

      {activeView === 'MOVEMENTS' ? (
        <div className="card overflow-hidden">
          <div className="card-hd">
            <h4 className="card-title">Historique des mouvements</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Date</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Type</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Produit</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic text-center">Quantité</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic text-right">P.U.</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-kontrol-ink-muted italic">
                      Aucun mouvement enregistré.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-kontrol-bg/30 transition-colors">
                      <td className="px-4 py-3 text-kontrol-ink-muted">{new Date(m.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.type === 'ENTREE' ? (
                            <TrendingUp size={14} className="text-emerald-500" />
                          ) : (
                            <TrendingDown size={14} className="text-rose-500" />
                          )}
                          <span className={cn(
                            "text-[11px] font-bold uppercase tracking-wider",
                            m.type === 'ENTREE' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {m.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-kontrol-dark">{m.designation}</td>
                      <td className="px-4 py-3 text-center font-extrabold">{m.quantite}</td>
                      <td className="px-4 py-3 text-right font-medium text-kontrol-ink-soft">{formatCurrency(m.prixUnitaire)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-kontrol-bg text-kontrol-ink-muted">
                          {m.source}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="card-hd flex justify-between items-center">
            <h4 className="card-title">Inventaire & Valorisation CUMP</h4>
            <div className="flex items-center gap-2 text-[11px] text-kontrol-ink-muted bg-blue-50 px-2 py-1 rounded">
              <Info size={12} /> CUMP = Coût Unitaire Moyen Pondéré
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Réf</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Désignation</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic text-center">Stock</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic text-right">CUMP</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic text-right">Valeur Stock</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-kontrol-ink-muted italic">
                      Aucun produit en stock.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((p) => {
                    const value = p.stock * (p.cump || p.prixAchat);
                    return (
                      <tr key={p.id} className="hover:bg-kontrol-bg/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-kontrol-ink-muted">{p.reference}</td>
                        <td className="px-4 py-3 font-bold text-kontrol-dark">{p.designation}</td>
                        <td className="px-4 py-3 text-center font-extrabold">{p.stock}</td>
                        <td className="px-4 py-3 text-right font-bold text-kontrol-blue">{formatCurrency(p.cump || p.prixAchat)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-kontrol-dark">{formatCurrency(value)}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            p.stock <= 0 ? "bg-rose-50 text-rose-600" : 
                            p.stock <= 10 ? "bg-orange-50 text-orange-600" : 
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            {p.stock <= 0 ? 'Rupture' : p.stock <= 10 ? 'Bas' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
