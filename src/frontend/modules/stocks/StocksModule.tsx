import React from 'react';
import { useTranslation } from 'react-i18next';
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
  Info,
  Upload,
  Download
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ExcelImportPreviewModal, ColumnConfig } from '../../components/common/ExcelImportPreviewModal';
import { downloadModuleTemplate, cleanImportedRows, parseExcelDate, isValidExcelDate } from '../../lib/templates';
import { StockMovement, Produit, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { sendNotification } from '../../../api/services/notificationService';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  User,
  handleFirestoreError,
  OperationType,
  addDoc,
  updateDoc,
  doc,
  logAction
} from '../../../api/firebase';

import { ModuleActivityLog } from '../../components/common/ModuleActivityLog';

interface StocksModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function StocksModule({ user, currentUserProfile }: StocksModuleProps) {
  const { t } = useTranslation();
  const companyId = currentUserProfile?.companyId || user.uid;
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeView, setActiveView] = React.useState<'MOVEMENTS' | 'INVENTORY'>('MOVEMENTS');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const [excelPreviewData, setExcelPreviewData] = React.useState<any[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId || !currentUserProfile) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJsonData = XLSX.utils.sheet_to_json(ws) as any[];

        // Filtrer automatiquement les explications et exemples
        const data = cleanImportedRows(activeView === 'MOVEMENTS' ? 'stocks_movements' : 'stocks_inventory', rawJsonData);

        const parsedRows: any[] = [];

        if (activeView === 'MOVEMENTS') {
          for (const item of data) {
            const headers = Object.keys(item);
            const dateKey = headers.find(h => h.toLowerCase().includes('date'));
            const typeKey = headers.find(h => h.toLowerCase().includes('type'));
            const prodKey = headers.find(h => h.toLowerCase().includes('prod') || h.toLowerCase().includes('design') || h.toLowerCase().includes('nom'));
            const qtyKey = headers.find(h => h.toLowerCase().includes('quant') || h.toLowerCase().includes('qty') || h.toLowerCase().includes('qte'));
            const priceKey = headers.find(h => h.toLowerCase().includes('prix') || h.toLowerCase().includes('price') || h.toLowerCase().includes('valeur') || h.toLowerCase().includes('unitaire') || h.toLowerCase().includes('cump'));
            const srcKey = headers.find(h => h.toLowerCase().includes('sour') || h.toLowerCase().includes('orig'));

            const pName = prodKey ? String(item[prodKey] || '').trim() : '';
            const rawQty = qtyKey ? item[qtyKey] : '';

            let rawDateVal = dateKey ? String(item[dateKey] || '') : '';
            let dateVal = parseExcelDate(rawDateVal);

            const typeVal = typeKey ? String(item[typeKey]).toUpperCase() : 'AJUSTEMENT';
            const priceVal = priceKey ? Number(item[priceKey] || 0) : 0;
            const srcVal = srcKey ? String(item[srcKey] || '') : 'Import Excel';

            parsedRows.push({
              designation: pName,
              quantite: isNaN(Number(rawQty)) ? rawQty : Number(rawQty || 0),
              type: typeVal,
              prixUnitaire: priceVal,
              source: srcVal,
              date: dateVal,
              rawDateText: rawDateVal
            });
          }
        } else {
          // Inventory stock update
          for (const item of data) {
            const headers = Object.keys(item);
            const refKey = headers.find(h => h.toLowerCase().includes('ref') || h.toLowerCase().includes('code') || h.toLowerCase().includes('num'));
            const stockKey = headers.find(h => h.toLowerCase().includes('stock') || h.toLowerCase().includes('quant') || h.toLowerCase().includes('qty') || h.toLowerCase().includes('qte') || h.toLowerCase().includes('invent'));

            const refVal = refKey ? String(item[refKey] || '').trim() : '';
            const rawStock = stockKey ? item[stockKey] : '';

            parsedRows.push({
              reference: refVal,
              stock: isNaN(Number(rawStock)) ? rawStock : Number(rawStock || 0)
            });
          }
        }

        if (parsedRows.length > 0) {
          setExcelPreviewData(parsedRows);
          setIsPreviewOpen(true);
        } else {
          toast.info("Aucun mouvement ou article repéré.");
        }
      } catch (err) {
        console.error("Stocks Excel import error:", err);
        toast.error("Échec lors de l'import. Assurez-vous d'avoir des colonnes valides.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async (finalData: any[]) => {
    try {
      let count = 0;

      if (activeView === 'MOVEMENTS') {
        for (const item of finalData) {
          const matchedProd = produits.find(p => p.designation.toLowerCase() === item.designation.toLowerCase() || p.reference.toLowerCase() === item.designation.toLowerCase());
          let prodId = 'EXTERNAL';
          if (matchedProd && matchedProd.id) {
            prodId = matchedProd.id;
            const newStock = matchedProd.stock + (item.type === 'ENTREE' ? item.quantite : item.type === 'SORTIE' ? -item.quantite : item.quantite);
            await updateDoc(doc(db, 'produits', matchedProd.id), { stock: newStock });
          }

          await addDoc(collection(db, 'stock_movements'), {
            date: item.date,
            type: item.type,
            produitId: prodId,
            designation: item.designation,
            quantite: Math.abs(item.quantite),
            prixUnitaire: item.prixUnitaire,
            source: item.source,
            ownerId: companyId,
            createdAt: Date.now()
          });
          count++;
        }
        toast.success(`${count} mouvements de stock importés avec succès !`);
      } else {
        // Inventory level update
        for (const item of finalData) {
          const matchedProd = produits.find(p => p.reference.toLowerCase() === item.reference.toLowerCase());
          if (matchedProd && matchedProd.id) {
            const diff = item.stock - matchedProd.stock;
            if (diff !== 0) {
              await addDoc(collection(db, 'stock_movements'), {
                date: Date.now(),
                type: 'AJUSTEMENT',
                produitId: matchedProd.id,
                designation: matchedProd.designation,
                quantite: Math.abs(diff),
                prixUnitaire: matchedProd.cump || matchedProd.prixAchat || 0,
                source: 'Inventaire Importé',
                ownerId: companyId,
                createdAt: Date.now()
              });
            }
            await updateDoc(doc(db, 'produits', matchedProd.id), { stock: item.stock });
            count++;
          }
        }
        toast.success(`${count} articles d'inventaire mis à jour avec succès !`);
      }

      await logAction(
        companyId,
        user.uid,
        currentUserProfile.displayName,
        "Stocks: Importation Excel",
        `${count} ajustements appliqués via assistant de prévisualisation`
      );
    } catch (err) {
      console.error("Failed to commit stocks import:", err);
      toast.error("Erreur durant la validation de l'importation de stock.");
      throw err;
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeView, searchTerm]);

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
      handleFirestoreError(error, OperationType.LIST, 'stock_movements', user, false);
    }));

    // Fetch Produits for Inventory View
    const qProduits = query(
      collection(db, 'produits'),
      where('ownerId', '==', companyId),
      orderBy('designation', 'asc')
    );
    unsubscribes.push(onSnapshot(qProduits, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Produit[];
      setProduits(pData);
      setLoading(false);

      // Simple low stock detection logic
      pData.forEach(p => {
        if (p.stock <= 5 && !sessionStorage.getItem(`notif_low_stock_${p.id}`)) {
          sendNotification({
            companyId: companyId,
            title: t('stocks.notif_low_stock_title'),
            message: t('stocks.notif_low_stock_msg', { name: p.designation, count: p.stock }),
            type: 'warning'
          });
          sessionStorage.setItem(`notif_low_stock_${p.id}`, 'true');
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'produits', user, false);
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

  const totalPages = Math.ceil((activeView === 'MOVEMENTS' ? filteredMovements.length : filteredInventory.length) / itemsPerPage);
  const paginatedData = (activeView === 'MOVEMENTS' ? filteredMovements : filteredInventory).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = activeView === 'MOVEMENTS' 
      ? [t('stocks.table.date'), t('stocks.table.type'), t('stocks.table.product'), t('stocks.table.quantity'), t('stocks.table.unit_price'), t('stocks.table.source')] 
      : [t('stocks.table.ref'), t('stocks.table.designation'), t('stocks.table.stock'), t('stocks.table.cump'), t('stocks.table.inventory_value'), t('stocks.table.status')];
    
    const data = activeView === 'MOVEMENTS' 
      ? filteredMovements.map(m => [
          new Date(m.date).toLocaleDateString(),
          m.type,
          m.designation,
          m.quantite.toString(),
          formatCurrency(m.prixUnitaire),
          m.source
        ])
      : filteredInventory.map(p => [
          p.reference,
          p.designation,
          p.stock.toString(),
          formatCurrency(p.cump || p.prixAchat),
          formatCurrency(p.stock * (p.cump || p.prixAchat)),
          p.stock <= 0 ? t('stocks.table.status_rupture') : p.stock <= 10 ? t('stocks.table.status_low') : t('stocks.table.status_ok')
        ]);
    
    const title = activeView === 'MOVEMENTS' ? `${t('stocks.history_title')} - KONTROL` : `${t('stocks.inventory_title')} - KONTROL`;
    const filename = activeView === 'MOVEMENTS' ? 'Mouvements_Stock_KONTROL' : 'Inventaire_KONTROL';
    
    exportToPDF(title, headers, data, filename, currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = activeView === 'MOVEMENTS'
      ? filteredMovements.map(m => ({
          [t('stocks.table.date')]: new Date(m.date).toLocaleDateString(),
          [t('stocks.table.type')]: m.type,
          [t('stocks.table.product')]: m.designation,
          [t('stocks.table.quantity')]: m.quantite,
          [t('stocks.table.unit_price')]: m.prixUnitaire,
          [t('stocks.table.source')]: m.source
        }))
      : filteredInventory.map(p => ({
          [t('stocks.table.ref')]: p.reference,
          [t('stocks.table.designation')]: p.designation,
          [t('stocks.table.stock')]: p.stock,
          [t('stocks.table.cump')]: p.cump || p.prixAchat,
          [t('stocks.table.inventory_value')]: p.stock * (p.cump || p.prixAchat),
          [t('stocks.table.status')]: p.stock <= 0 ? t('stocks.table.status_rupture') : p.stock <= 10 ? t('stocks.table.status_low') : t('stocks.table.status_ok')
        }));
    
    const filename = activeView === 'MOVEMENTS' ? 'Mouvements_Stock_KONTROL' : 'Inventaire_KONTROL';
    exportToExcel(data, filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('stocks.title')}</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">{t('stocks.subtitle')}</p>
        </div>
        <div className="flex bg-kontrol-bg p-1 rounded-xl">
          <button 
            onClick={() => setActiveView('MOVEMENTS')}
            className={cn(
              "px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all",
              activeView === 'MOVEMENTS' ? "bg-white text-kontrol-dark shadow-sm" : "text-kontrol-ink-muted hover:text-kontrol-dark"
            )}
          >
            {t('stocks.movements_tab')}
          </button>
          <button 
            onClick={() => setActiveView('INVENTORY')}
            className={cn(
              "px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all",
              activeView === 'INVENTORY' ? "bg-white text-kontrol-dark shadow-sm" : "text-kontrol-ink-muted hover:text-kontrol-dark"
            )}
          >
            {t('stocks.inventory_tab')}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="kpi">
          <p className="kpi-lbl">{t('stocks.stats.total_value')}</p>
          <h3 className="kpi-val text-kontrol-blue">
            {formatCurrency(produits.reduce((acc, p) => acc + (p.stock * (p.cump || p.prixAchat)), 0))}
          </h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('stocks.stats.entries')}</p>
          <h3 className="kpi-val text-emerald-600">
            {movements.filter(m => m.type === 'ENTREE').length}
          </h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('stocks.stats.exits')}</p>
          <h3 className="kpi-val text-rose-600">
            {movements.filter(m => m.type === 'SORTIE').length}
          </h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">{t('stocks.stats.alerts')}</p>
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
            placeholder={t('stocks.search_placeholder')}
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => {
              if (activeView === 'MOVEMENTS') {
                downloadModuleTemplate('stocks_movements');
              } else {
                downloadModuleTemplate('stocks_inventory');
              }
            }} 
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2 text-kontrol-blue border-kontrol-blue/20 hover:bg-kontrol-blue/5"
            title="Télécharger le modèle Excel de stock"
          >
            <Download size={14} /> Modèle
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
            title={activeView === 'MOVEMENTS' ? "Importer des mouvements de stock depuis un fichier Excel" : "Mettre à jour l'inventaire depuis un fichier Excel"}
          >
            <Upload size={14} /> {t('common.import', 'Importer')}
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <History size={14} /> PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <History size={14} /> Excel
          </button>
        </div>
      </div>

      {activeView === 'MOVEMENTS' ? (
        <div className="card overflow-hidden">
          <div className="card-hd">
            <h4 className="card-title">{t('stocks.history_title')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.date')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.type')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.product')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-center">{t('stocks.table.quantity')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">{t('stocks.table.unit_price')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.source')}</th>
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
                    <td colSpan={6} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      {t('stocks.no_movements')}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((m: any, idx) => (
                    <tr key={m.id} className={cn("hover:bg-kontrol-bg/30 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10")}>
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
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
          <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
            {t('stocks.total_movements', { count: filteredMovements.length })}
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
            >
              <ArrowDownLeft size={16} className="rotate-45" />
            </button>
            <span className="text-[11.5px] font-bold text-kontrol-dark">
              {t('common.pagination', { current: currentPage, total: totalPages })}
            </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
                >
                  <ArrowUpRight size={16} className="rotate-45" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="card-hd flex justify-between items-center">
            <h4 className="card-title">{t('stocks.inventory_title')}</h4>
            <div className="flex items-center gap-2 text-[11px] text-kontrol-ink-muted bg-blue-50 px-2 py-1 rounded">
              <Info size={12} /> {t('stocks.cump_info')}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.ref')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.designation')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-center">{t('stocks.table.stock')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">{t('stocks.table.cump')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">{t('stocks.table.inventory_value')}</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">{t('stocks.table.status')}</th>
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
                    <td colSpan={6} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      {t('stocks.no_inventory')}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((p: any, idx) => {
                    const value = p.stock * (p.cump || p.prixAchat);
                    return (
                      <tr key={p.id} className={cn("hover:bg-kontrol-bg/30 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-kontrol-bg/10")}>
                        <td className="px-4 py-3 text-[11px] text-kontrol-ink-muted">{p.reference}</td>
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
                            {p.stock <= 0 ? t('stocks.table.status_rupture') : p.stock <= 10 ? t('stocks.table.status_low') : t('stocks.table.status_ok')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
          <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
            {t('stocks.total_products', { count: filteredInventory.length })}
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
            >
              <ArrowDownLeft size={16} className="rotate-45" />
            </button>
            <span className="text-[11.5px] font-bold text-kontrol-dark">
              {t('common.pagination', { current: currentPage, total: totalPages })}
            </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1 rounded hover:bg-kontrol-border disabled:opacity-30 transition-colors"
                >
                  <ArrowUpRight size={16} className="rotate-45" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Activity Log */}
      <div className="mt-8">
        <ModuleActivityLog 
          companyId={companyId} 
          moduleName="Stock" 
          title={t('stocks.movement_journal')} 
        />
      </div>

      {excelPreviewData && (
        <ExcelImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setExcelPreviewData(null);
          }}
          onConfirm={handleConfirmImport}
          rawData={excelPreviewData}
          existingData={activeView === 'MOVEMENTS' ? movements : produits}
          moduleKey={activeView === 'MOVEMENTS' ? "stocks_movements" : "stocks_inventory"}
          isDuplicate={(row, existing) => {
            if (activeView === 'MOVEMENTS') {
              return String(row.designation).toLowerCase().trim() === String(existing.designation).toLowerCase().trim() &&
                     Number(row.quantite) === Number(existing.quantite) &&
                     String(row.type) === String(existing.type);
            } else {
              return String(row.reference).toLowerCase().trim() === String(existing.reference).toLowerCase().trim();
            }
          }}
          validateRow={(row) => {
            if (activeView === 'MOVEMENTS') {
              if (!row.designation || !String(row.designation).trim()) {
                return "Désignation ou référence d'article requise";
              }
              if (row.quantite === undefined || row.quantite === '' || isNaN(Number(row.quantite)) || Number(row.quantite) <= 0) {
                return "Quantité invalide (doit être un nombre positif > 0)";
              }
              if (!row.type || (row.type !== 'ENTREE' && row.type !== 'SORTIE' && row.type !== 'AJUSTEMENT')) {
                return "Type requis (ENTREE / SORTIE / AJUSTEMENT)";
              }
              if (row.rawDateText && !isValidExcelDate(row.rawDateText)) {
                return "Format de date invalide (attendu: JJ/MM/AAAA ou AAAA-MM-JJ)";
              }
            } else {
              if (!row.reference || !String(row.reference).trim()) {
                return "Référence produit requise";
              }
              if (row.stock === undefined || row.stock === '' || isNaN(Number(row.stock)) || Number(row.stock) < 0) {
                return "Nouveau niveau de stock doit être un nombre positif (≥ 0)";
              }
            }
            return null;
          }}
          title={activeView === 'MOVEMENTS' ? "Mouvements de Stocks" : "Mise à jour Inventaire"}
          columns={activeView === 'MOVEMENTS' ? [
            { key: 'designation', label: 'Désignation Produit' },
            { key: 'quantite', label: 'Quantité' },
            { key: 'type', label: 'Type de Mouvement' },
            { key: 'prixUnitaire', label: 'Prix Unitaire' },
            { key: 'source', label: 'Source Originelle' },
            { key: 'date', label: 'Date', render: (val) => new Date(val.date).toLocaleDateString() }
          ] : [
            { key: 'reference', label: 'Référence Produit' },
            { key: 'stock', label: 'Nouveau niveau Stock' }
          ]}
        />
      )}
    </div>
  );
}
