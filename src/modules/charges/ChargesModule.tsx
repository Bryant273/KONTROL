import React from 'react';
import { Plus, Search, Receipt, Loader2, X, History, Calendar, Tag, CreditCard, ArrowDownRight, Edit2, Trash2, FileText, Table } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../lib/export';
import { Charge, UserProfile } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  User,
  doc,
  updateDoc,
  deleteDoc,
  logAction
} from '../../firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { chargeService } from '../../services/chargeService';

interface ChargesModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function ChargesModule({ user, currentUserProfile }: ChargesModuleProps) {
  const companyId = currentUserProfile?.companyId || user.uid;
  const userName = currentUserProfile?.displayName || user.displayName || user.email || 'Utilisateur';
  const [charges, setCharges] = React.useState<Charge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [currentCharge, setCurrentCharge] = React.useState({
    description: '',
    categorie: 'Loyer',
    montant: 0,
    modePaiement: 'Espèces',
    date: new Date().toISOString().split('T')[0]
  });

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing && selectedId) {
        await chargeService.updateCharge(selectedId, {
          ...currentCharge,
          date: new Date(currentCharge.date).getTime(),
          montant: Number(currentCharge.montant)
        }, user);

        await logAction(
          companyId,
          user.uid,
          userName,
          'Produit: Modifié', // Using standardized prefix
          `Modification de la charge: ${currentCharge.description} (${formatCurrency(currentCharge.montant)})`
        );

        setIsEditing(false);
      } else {
        await chargeService.createCharge({
          ...currentCharge,
          date: new Date(currentCharge.date).getTime(),
          montant: Number(currentCharge.montant),
          devise: 'FCFA',
          ownerId: companyId,
          createdAt: Date.now()
        }, user);

        await logAction(
          companyId,
          user.uid,
          userName,
          'Mouvement: Décaissement', // Using standardized prefix
          `Nouvelle charge: ${currentCharge.description} (${formatCurrency(currentCharge.montant)})`
        );

        setIsAdding(false);
      }
      setCurrentCharge({ description: '', categorie: 'Loyer', montant: 0, modePaiement: 'Espèces', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      // Error handled in service
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharge = async () => {
    if (!selectedId || !selectedCharge) return;
    setLoading(true);
    try {
      const chargeDesc = selectedCharge.description;
      const chargeAmount = selectedCharge.montant;

      await chargeService.deleteCharge(selectedId, user);

      await logAction(
        companyId,
        user.uid,
        userName,
        'Mouvement: Supprimé', // Using standardized prefix
        `Suppression de la charge: ${chargeDesc} (${formatCurrency(chargeAmount)})`
      );

      setSelectedId(null);
      setIsDeleting(false);
    } catch (error) {
      // Error handled in service
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    if (!selectedCharge) return;
    setCurrentCharge({
      description: selectedCharge.description,
      categorie: selectedCharge.categorie,
      montant: selectedCharge.montant,
      modePaiement: selectedCharge.modePaiement || 'Espèces',
      date: new Date(selectedCharge.date).toISOString().split('T')[0]
    });
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (!currentUserProfile || !companyId) return;
    const path = 'charges';
    const q = query(
      collection(db, path),
      where('ownerId', '==', companyId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chargesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Charge[];
      setCharges(chargesData);
      setLoading(false);
    }, (error) => {
      console.error("Charges list error:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, path, user);
      } catch (e) {}
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, companyId, currentUserProfile]);

  const selectedCharge = charges.find(c => c.id === selectedId);

  const filteredCharges = charges.filter(c => 
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCharges = filteredCharges.reduce((acc, c) => acc + c.montant, 0);

  const handleExportPDF = () => {
    const headers = ['Date', 'Description', 'Catégorie', 'Montant', 'Mode'];
    const data = filteredCharges.map(c => [
      new Date(c.date).toLocaleDateString(),
      c.description,
      c.categorie,
      formatCurrency(c.montant),
      c.modePaiement
    ]);
    exportToPDF('Journal des Charges - KONTROL', headers, data, 'Charges_KONTROL');
  };

  const handleExportExcel = () => {
    const data = filteredCharges.map(c => ({
      Date: new Date(c.date).toLocaleDateString(),
      Description: c.description,
      Catégorie: c.categorie,
      Montant: c.montant,
      Mode: c.modePaiement
    }));
    exportToExcel(data, 'Charges_KONTROL');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Charges & Dépenses</h2>
          <p className="text-[13px] text-kontrol-ink-muted mt-1">Frais fixes et variables — Feuille CHARGES</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-2">
            <Table size={14} /> Excel
          </button>
          <button 
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={14} /> Nouvelle charge
          </button>
        </div>
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="card-hd">
              <h3 className="card-title">{isEditing ? 'Modifier la charge' : 'Nouvelle Charge'}</h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCharge} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Description</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                  value={currentCharge.description}
                  onChange={(e) => setCurrentCharge({ ...currentCharge, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Catégorie</label>
                  <select 
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.categorie}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, categorie: e.target.value })}
                  >
                    <option value="Loyer">Loyer</option>
                    <option value="Électricité">Électricité</option>
                    <option value="Eau">Eau</option>
                    <option value="Internet">Internet</option>
                    <option value="Salaires">Salaires</option>
                    <option value="Transport">Transport</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Autres">Autres</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Montant</label>
                  <input 
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.montant}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, montant: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Mode de paiement</label>
                  <select 
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.modePaiement}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, modePaiement: e.target.value })}
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Carte">Carte</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-kontrol-bg border border-kontrol-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all text-[13px]"
                    value={currentCharge.date}
                    onChange={(e) => setCurrentCharge({ ...currentCharge, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="flex-1 py-2.5 border border-kontrol-border text-kontrol-ink-soft font-bold rounded-xl hover:bg-kontrol-bg transition-all text-[13px]"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-kontrol-blue text-white font-bold rounded-xl hover:bg-kontrol-blue/90 transition-all text-[13px] shadow-lg shadow-kontrol-blue/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteCharge}
        title="Supprimer la charge"
        message={`Êtes-vous sûr de vouloir supprimer la charge "${selectedCharge?.description}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi">
          <p className="kpi-lbl">Total charges (période)</p>
          <h3 className="kpi-val text-rose-600">{formatCurrency(totalCharges)}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Nb de pièces</p>
          <h3 className="kpi-val">{filteredCharges.length}</h3>
        </div>
        <div className="kpi">
          <p className="kpi-lbl">Moyenne / charge</p>
          <h3 className="kpi-val">
            {filteredCharges.length > 0 ? formatCurrency(totalCharges / filteredCharges.length) : '0 FCFA'}
          </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-kontrol-border rounded-lg p-2.5 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-kontrol-bg border border-kontrol-border rounded-lg px-3 py-1.5 focus-within:border-kontrol-blue transition-all">
          <Search size={14} className="text-kontrol-ink-muted" />
          <input 
            type="text"
            placeholder="Rechercher description, catégorie…"
            className="bg-transparent border-none outline-none text-[13px] w-full text-kontrol-ink placeholder:text-kontrol-ink-muted"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Date</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Catégorie</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic">Description</th>
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-kontrol-ink-muted italic text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin text-kontrol-blue mx-auto" size={24} />
                    </td>
                  </tr>
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-kontrol-ink-muted italic">
                      Aucune charge trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((c) => (
                    <tr 
                      key={c.id} 
                      className={cn(
                        "hover:bg-kontrol-blue/5 cursor-pointer transition-colors",
                        selectedId === c.id && "bg-kontrol-blue/10"
                      )}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="px-4 py-3 text-kontrol-ink-muted">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-kontrol-bg text-kontrol-ink-muted">
                          {c.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-kontrol-dark truncate max-w-[200px]">{c.description}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-rose-600">{formatCurrency(c.montant)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-kontrol-border bg-kontrol-bg/30 text-[11.5px] text-kontrol-ink-muted font-medium">
            {filteredCharges.length} charges affichées
          </div>
        </div>

        {/* Detail Panel */}
        <div className="card sticky top-4 overflow-hidden min-h-[400px]">
          {selectedCharge ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="card-hd">
                <h4 className="card-title">Détails de la charge</h4>
                <button 
                  className="p-1 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-md transition-all"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <ArrowDownRight size={24} />
                </div>
                <h3 className="text-[15px] font-extrabold text-kontrol-dark leading-tight">{selectedCharge.description}</h3>
                <p className="text-[11px] text-kontrol-ink-muted mt-0.5 font-mono uppercase tracking-wider">{selectedCharge.categorie} · {selectedCharge.id.slice(0,8)}</p>
                
                <div className="bg-kontrol-dark rounded-lg p-4 mt-6 mb-6">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Montant Décaissé</p>
                  <p className="text-xl font-extrabold text-kontrol-blue">{formatCurrency(selectedCharge.montant)}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex gap-3 text-[12.5px]">
                    <Calendar size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Date de paiement</p>
                      <p className="text-kontrol-ink-soft font-medium">{new Date(selectedCharge.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <Tag size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Catégorie</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedCharge.categorie}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[12.5px]">
                    <CreditCard size={14} className="text-kontrol-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-kontrol-ink-muted text-[11px] font-bold uppercase tracking-tighter">Mode de règlement</p>
                      <p className="text-kontrol-ink-soft font-medium">{selectedCharge.modePaiement || 'Espèces'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  <button className="flex-1 btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-2">
                    <Receipt size={14} /> Justificatif
                  </button>
                  <button 
                    onClick={openEdit}
                    className="p-2.5 border border-kontrol-border text-kontrol-ink-soft hover:bg-kontrol-bg rounded-xl transition-all"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setIsDeleting(true)}
                    className="p-2.5 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-kontrol-ink-muted opacity-40">
              <Receipt size={48} strokeWidth={1} className="mb-3" />
              <p className="text-[12.5px] font-medium leading-relaxed">
                Sélectionnez une dépense<br />pour voir ses détails.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
