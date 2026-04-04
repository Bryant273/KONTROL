import React from 'react';
import { Plus, Search, Package, AlertCircle, Loader2, X, Boxes, History, Trash2, Edit2, FileText, Table, Upload, Download, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import * as XLSX from 'xlsx';
import { Produit, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { logAction } from '../../firebase';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CompanySelector } from '../../components/common/CompanySelector';
import { productService } from '../../services/productService';
import { User as FirebaseUser } from 'firebase/auth';
import { where, orderBy } from 'firebase/firestore';

import { ModuleActivityLog } from '../../components/common/ModuleActivityLog';

interface ProduitsModuleProps {
  user: FirebaseUser;
  currentUserProfile: UserProfile | null;
}

export function ProduitsModule({ user, currentUserProfile }: ProduitsModuleProps) {
  const isERPAdmin = currentUserProfile?.role === 'ADMINISTRATEUR_ERP' || currentUserProfile?.role === 'GESTIONNAIRE_ERP';
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(currentUserProfile?.companyId || null);
  
  const companyId = isERPAdmin 
    ? (selectedCompanyId || currentUserProfile?.companyId || user.uid) 
    : (currentUserProfile?.companyId || user.uid);
  const [produits, setProduits] = React.useState<Produit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterDate, setFilterDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const [currentProduit, setCurrentProduit] = React.useState({
    reference: '',
    designation: '',
    prixAchat: 0,
    prixVente: 0,
    stockInitial: 0,
    alertStock: 5,
    tva: 18
  });

  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const item of data) {
          if (item.designation && item.reference) {
            const prodData: Produit = {
              reference: String(item.reference || ''),
              designation: String(item.designation || ''),
              prixAchat: Number(item.prixAchat || 0),
              prixVente: Number(item.prixVente || 0),
              stock: Number(item.stock || 0),
              alertStock: Number(item.alertStock || 5),
              cump: Number(item.prixAchat || 0),
              tva: Number(item.tva || 18),
              ownerId: companyId,
              createdAt: Date.now()
            } as Produit;
            await productService.createProduct(prodData, user);
            importedCount++;
          }
        }

        if (currentUserProfile) {
          await logAction(
            companyId,
            user.uid,
            currentUserProfile.displayName,
            "Produits: Importés",
            `${importedCount} produits importés via Excel`
          );
        }
        if (importedCount > 0) {
          setMessage({ type: 'success', text: `${importedCount} produits importés avec succès.` });
          setTimeout(() => setMessage(null), 3000);
        }
      } catch (error) {
        console.error("Import error:", error);
        setMessage({ type: 'error', text: "Erreur lors de l'importation. Vérifiez le format du fichier." });
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadFiche = (p: Produit) => {
    const headers = ['Caractéristique', 'Valeur'];
    const data = [
      ['Référence', p.reference],
      ['Désignation', p.designation],
      ['Prix Achat', formatCurrency(p.prixAchat)],
      ['Prix Vente', formatCurrency(p.prixVente)],
      ['TVA', `${p.tva}%`],
      ['Stock Actuel', `${p.stock} u.`],
      ['Stock Alerte', `${p.alertStock || 5} u.`],
      ['Valeur Stock', formatCurrency(p.stock * p.prixVente)],
      ['Marge Brute', formatCurrency(p.prixVente - p.prixAchat)],
      ['Date Création', new Date(p.createdAt).toLocaleDateString()]
    ];
    exportToPDF(`Fiche Produit - ${p.designation}`, headers, data, `Fiche_${p.reference}`, currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleAddProduit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduit.reference || !currentProduit.designation) {
      setMessage({ type: 'error', text: "Veuillez remplir tous les champs obligatoires." });
      return;
    }
    if (!companyId) {
      setMessage({ type: 'error', text: "Erreur: ID de l'entreprise non trouvé." });
      return;
    }

    setLoading(true);
    try {
      const initialStock = Number(currentProduit.stockInitial);
      const prixAchat = Number(currentProduit.prixAchat);

      const prodData: Produit = {
        reference: currentProduit.reference,
        designation: currentProduit.designation,
        prixAchat: prixAchat,
        prixVente: Number(currentProduit.prixVente),
        stock: initialStock,
        alertStock: Number(currentProduit.alertStock),
        cump: prixAchat,
        tva: Number(currentProduit.tva),
        ownerId: companyId!,
        createdAt: Date.now()
      } as Produit;

      await productService.createProduct(prodData, user);

      if (currentUserProfile) {
        await logAction(
          companyId!,
          user.uid,
          currentUserProfile.displayName,
          "Produit: Créé",
          `Désignation: ${currentProduit.designation}`
        );
      }

      setMessage({ type: 'success', text: "Produit enregistré avec succès !" });
      setTimeout(() => {
        setIsAdding(false);
        setMessage(null);
        setCurrentProduit({ reference: '', designation: '', prixAchat: 0, prixVente: 0, stockInitial: 0, alertStock: 5, tva: 18 });
      }, 1500);
    } catch (error) {
      console.error("Add product error:", error);
      setMessage({ type: 'error', text: "Erreur lors de l'enregistrement du produit." });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    try {
      await productService.update(selectedId, {
        reference: currentProduit.reference,
        designation: currentProduit.designation,
        prixAchat: Number(currentProduit.prixAchat),
        prixVente: Number(currentProduit.prixVente),
        alertStock: Number(currentProduit.alertStock),
        tva: Number(currentProduit.tva)
      }, user);

      if (currentUserProfile) {
        await logAction(
          companyId!,
          user.uid,
          currentUserProfile.displayName,
          "Produit: Modifié",
          `Désignation: ${currentProduit.designation}`
        );
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Edit product error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduit = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await productService.delete(selectedId, user);

      if (currentUserProfile) {
        await logAction(
          companyId!,
          user.uid,
          currentUserProfile.displayName,
          "Produit: Supprimé",
          `ID: ${selectedId}`
        );
      }

      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      console.error("Delete product error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p: Produit) => {
    setCurrentProduit({
      reference: p.reference,
      designation: p.designation,
      prixAchat: p.prixAchat,
      prixVente: p.prixVente,
      stockInitial: p.stock,
      alertStock: p.alertStock || 5,
      tva: p.tva
    });
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (!currentUserProfile) return;
    
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    if (!(isERPAdmin && !selectedCompanyId)) {
      constraints.unshift(where('ownerId', '==', companyId));
    }

    const unsubscribe = productService.subscribeToAll(setProduits, user, constraints);
    setLoading(false);

    return () => unsubscribe();
  }, [user, companyId, currentUserProfile, selectedCompanyId]);

  const selectedProduit = produits.find(p => p.id === selectedId);
  
  const filteredProduits = produits.filter(p => {
    const matchesSearch = p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || new Date(p.createdAt).toISOString().split('T')[0] === filterDate;
    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredProduits.length / itemsPerPage);
  const paginatedProduits = filteredProduits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = () => {
    const headers = ['Référence', 'Désignation', 'Prix Achat', 'Prix Vente', 'Stock', 'Valeur Stock'];
    const data = filteredProduits.map(p => [
      p.reference,
      p.designation,
      formatCurrency(p.prixAchat),
      formatCurrency(p.prixVente),
      `${p.stock} u.`,
      formatCurrency(p.stock * p.prixVente)
    ]);
    exportToPDF('Catalogue Produits - KONTROL', headers, data, 'Produits_KONTROL', currentUserProfile?.companyLogo || currentUserProfile?.logoUrl);
  };

  const handleExportExcel = () => {
    const data = filteredProduits.map(p => ({
      Référence: p.reference,
      Désignation: p.designation,
      'Prix Achat': p.prixAchat,
      'Prix Vente': p.prixVente,
      Stock: p.stock,
      'Valeur Stock': p.stock * p.prixVente
    }));
    exportToExcel(data, 'Produits_KONTROL');
  };

  return (
    <div className="space-y-4">
      <ConfirmModal 
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteProduit}
        loading={loading}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer "${selectedProduit?.designation}" ? Cette action est irréversible.`}
      />

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-kontrol-border flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-kontrol-dark">{isEditing ? 'Modifier Produit' : 'Nouveau Produit'}</h3>
              <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="p-2 hover:bg-kontrol-bg rounded-full text-kontrol-ink-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={isEditing ? handleEditProduit : handleAddProduit} className="p-6 space-y-4">
              {message && (
                <div className={cn(
                  "p-3 rounded-lg text-[13px] font-bold text-center animate-in fade-in slide-in-from-top-2",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                )}>
                  {message.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Référence *</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.reference}
                    onChange={(e) => setCurrentProduit({...currentProduit, reference: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Désignation *</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.designation}
                    onChange={(e) => setCurrentProduit({...currentProduit, designation: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Prix Achat *</label>
                  <input 
                    type="number" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.prixAchat || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, prixAchat: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Prix Vente *</label>
                  <input 
                    type="number" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.prixVente || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, prixVente: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Stock Initial *</label>
                  <input 
                    type="number" required
                    disabled={isEditing}
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue disabled:opacity-50"
                    value={currentProduit.stockInitial || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, stockInitial: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Stock d'alerte *</label>
                  <input 
                    type="number" required
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.alertStock || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, alertStock: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">TVA (%)</label>
                  <input 
                    type="number"
                    className="w-full px-3 py-2 bg-white border border-kontrol-border rounded-lg focus:outline-none focus:border-kontrol-blue"
                    value={currentProduit.tva || ''}
                    placeholder="0"
                    onChange={(e) => setCurrentProduit({...currentProduit, tva: e.target.value === '' ? 0 : Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-bold flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : isEditing ? 'Mettre à jour' : 'Enregistrer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Produits</h2>
            <p className="text-[13px] text-kontrol-ink-muted mt-1">Catalogue — Feuille PRODUITS</p>
          </div>
          {isERPAdmin && (
            <div className="hidden md:block">
              <CompanySelector 
                selectedId={selectedCompanyId} 
                onSelect={setSelectedCompanyId} 
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <Upload size={14} /> Importer
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleImportExcel} 
          />
          <button 
            onClick={handleExportPDF}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <FileText size={14} /> PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2"
          >
            <Table size={14} /> Excel
          </button>
          <button 
            onClick={() => {
              setCurrentProduit({ reference: '', designation: '', prixAchat: 0, prixVente: 0, stockInitial: 0, alertStock: 5, tva: 18 });
              setIsAdding(true);
            }} 
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
          >
            <Plus size={14} /> Nouveau produit
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder="Rechercher désignation, référence…"
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5">
          <Calendar size={14} className="text-kontrol-ink-muted" />
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

      <div className="grid lg:grid-cols-[1fr_350px] gap-4 items-start">
        {/* Table Card */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-kontrol-bg border-b border-kontrol-border">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Référence</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Désignation</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-right">Prix Vente</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted text-center">Stock</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading && !produits.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : paginatedProduits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-kontrol-ink-muted">
                      Aucun produit trouvé.
                    </td>
                  </tr>
                ) : (
                  paginatedProduits.map((p) => {
                    const [scls, slbl] = p.stock <= 0 ? ["bg-rose-50 text-rose-600", "Rupture"] : 
                                       p.stock <= (p.alertStock || 5) ? ["bg-orange-50 text-orange-600", "Stock bas"] : 
                                       ["bg-emerald-50 text-emerald-600", "En stock"];
                    return (
                      <tr 
                        key={p.id} 
                        className={cn(
                          "hover:bg-kontrol-blue/5 cursor-pointer transition-colors even:bg-kontrol-bg/30",
                          selectedId === p.id && "bg-kontrol-blue/10"
                        )}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold bg-kontrol-bg px-2 py-0.5 rounded text-kontrol-ink-muted">
                            {p.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-kontrol-dark">{p.designation}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-kontrol-ink-soft">{formatCurrency(p.prixVente)}</td>
                        <td className="px-4 py-3 text-center font-bold">{p.stock} u.</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider",
                            scls
                          )}>
                            {slbl}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
            <span className="text-[11.5px] text-kontrol-ink-muted font-medium">
              {filteredProduits.length} produits au total
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

        {/* Detail Panel */}
        <div className="card sticky top-4 overflow-hidden min-h-[400px]">
          {selectedProduit ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">Fiche produit</h4>
                <button 
                  className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="w-12 h-12 rounded-xl bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted mb-4">
                  <Package size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-extrabold text-kontrol-dark leading-tight">{selectedProduit.designation}</h3>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 uppercase tracking-wider">{selectedProduit.reference} · {selectedProduit.id.slice(0,8)}</p>
                
                <div className="grid grid-cols-2 gap-2 mt-6 mb-6">
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Prix Achat</p>
                    <p className="text-sm font-extrabold text-kontrol-ink-soft">{formatCurrency(selectedProduit.prixAchat)}</p>
                  </div>
                  <div className="bg-kontrol-dark rounded-lg p-3">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Prix Vente</p>
                    <p className="text-sm font-extrabold text-kontrol-blue">{formatCurrency(selectedProduit.prixVente)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Stock Actuel</p>
                    <p className={cn(
                      "text-lg font-extrabold",
                      selectedProduit.stock <= (selectedProduit.alertStock || 5) ? "text-rose-600" : "text-kontrol-dark"
                    )}>{selectedProduit.stock} u.</p>
                  </div>
                  <div className="bg-kontrol-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest mb-1">Valeur Stock</p>
                    <p className="text-lg font-extrabold text-kontrol-dark">{formatCurrency(selectedProduit.stock * selectedProduit.prixVente)}</p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2 border-t border-kontrol-border">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-kontrol-ink-muted font-bold uppercase tracking-tighter text-[11px]">TVA Applicable</span>
                    <span className="text-kontrol-ink-soft font-bold">{selectedProduit.tva}%</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-kontrol-ink-muted font-bold uppercase tracking-tighter text-[11px]">Marge Brute</span>
                    <span className="text-emerald-600 font-bold">{formatCurrency(selectedProduit.prixVente - selectedProduit.prixAchat)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  <button 
                    className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                    onClick={() => handleDownloadFiche(selectedProduit)}
                  >
                    <Download size={14} /> Fiche
                  </button>
                  <button 
                    className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                    onClick={() => openEdit(selectedProduit)}
                  >
                    <Edit2 size={14} /> Modifier
                  </button>
                </div>
                <div className="mt-2">
                  <button 
                    className="w-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    onClick={() => setIsDeleting(true)}
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <Package size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                Sélectionnez un produit<br />pour voir ses détails.
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <ModuleActivityLog 
              companyId={companyId!} 
              moduleName="produit" 
              title="Journal des produits" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
