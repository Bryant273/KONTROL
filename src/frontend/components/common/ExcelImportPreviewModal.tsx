import React, { useState, useMemo } from 'react';
import { X, Check, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Search, FileDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { downloadModuleTemplate } from '../../lib/templates';
import { toast } from 'sonner';

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (val: any) => React.ReactNode;
}

interface ExcelImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalData: any[]) => Promise<void>;
  rawData: any[];
  columns: ColumnConfig[];
  existingData: any[];
  // function to match potential duplicate e.g. (row, existingItem) => boolean
  isDuplicate: (row: any, existingItem: any) => boolean;
  title: string;
  moduleKey?: string; // e.g. 'tiers', 'charges', 'transactions', etc. for downloading templates
  validateRow?: (row: any) => string | null; // Optional strict validation callback
}

export function ExcelImportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  rawData,
  columns,
  existingData,
  isDuplicate,
  title,
  moduleKey,
  validateRow
}: ExcelImportPreviewModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const itemsPerPage = 7; // Precise setting (5 to 7 rows per page)

  // Mark potential duplicates & initialize selections safely
  const processedRows = useMemo(() => {
    return rawData.map((row, idx) => {
      const isRecordDuplicate = existingData.some(existing => isDuplicate(row, existing));
      const validationError = validateRow ? validateRow(row) : null;
      return {
        row,
        idx,
        isRecordDuplicate,
        validationError,
        // Match search against any field value
        searchStr: Object.values(row).map(v => String(v || '').toLowerCase()).join(' ')
      };
    });
  }, [rawData, existingData, isDuplicate, validateRow]);

  // Handle auto-selection of non-duplicate, non-error records on load
  React.useEffect(() => {
    if (isOpen && rawData.length > 0) {
      const initialSelected = new Set<number>();
      processedRows.forEach(item => {
        if (!item.isRecordDuplicate && !item.validationError) {
          initialSelected.add(item.idx);
        }
      });
      setSelectedIndices(initialSelected);
      setCurrentPage(1);
      setSearchTerm('');
    }
  }, [isOpen, rawData, processedRows]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return processedRows;
    const term = searchTerm.toLowerCase();
    return processedRows.filter(item => item.searchStr.includes(term));
  }, [processedRows, searchTerm]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);
  
  const pagedRows = useMemo(() => {
    const start = (currentPageSafe - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPageSafe, itemsPerPage]);

  if (!isOpen) return null;

  const handleToggleRow = (idx: number) => {
    const rowItem = processedRows.find(r => r.idx === idx);
    if (rowItem?.validationError) {
      toast.warning(`Cette ligne comporte des erreurs de validation: ${rowItem.validationError}`);
      return;
    }
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const handleToggleAll = () => {
    const pageIndicesNotError = pagedRows.filter(r => !r.validationError).map(r => r.idx);
    if (pageIndicesNotError.length === 0) return;
    
    const allSelectedOnPage = pageIndicesNotError.every(i => selectedIndices.has(i));
    const next = new Set(selectedIndices);
    
    if (allSelectedOnPage) {
      pageIndicesNotError.forEach(i => next.delete(i));
    } else {
      pageIndicesNotError.forEach(i => next.add(i));
    }
    setSelectedIndices(next);
  };

  const duplicateOnCurrentPageCount = pagedRows.filter(r => r.isRecordDuplicate).length;
  const duplicateTotalCount = processedRows.filter(r => r.isRecordDuplicate).length;
  const invalidTotalCount = processedRows.filter(r => r.validationError).length;

  const handleImportSubmit = async () => {
    if (selectedIndices.size === 0) {
      toast.error("Veuillez sélectionner au moins une ligne valide à importer !");
      return;
    }

    // Double check search errors
    const selectedRowsProcessed = processedRows.filter(item => selectedIndices.has(item.idx));
    const firstInvalidRow = selectedRowsProcessed.find(item => item.validationError);
    if (firstInvalidRow) {
      toast.error(`Sélection invalide : ${firstInvalidRow.validationError}`);
      return;
    }

    setImporting(true);
    try {
      const finalSelectedData = rawData.filter((_, idx) => selectedIndices.has(idx));
      await onConfirm(finalSelectedData);
      onClose();
    } catch (err) {
      console.error("Failed to commit excel import:", err);
      toast.error("Erreur technique lors de la validation finale de l'import.");
    } finally {
      setImporting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-kontrol-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-kontrol-border flex justify-between items-center bg-kontrol-bg/40 shrink-0">
          <div>
            <span className="text-[10px] font-bold text-kontrol-blue uppercase tracking-wider bg-kontrol-blue/10 px-2.5 py-1 rounded-full">{title}</span>
            <h3 className="text-lg font-extrabold text-kontrol-dark mt-1 flex items-center gap-2">
              Aperçu & Filtrage de l'importation Excel
            </h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={importing}
            className="w-9 h-9 rounded-full hover:bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted hover:text-kontrol-dark transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Templates and Statistics Bar */}
        <div className="px-6 py-4 border-b border-kontrol-border bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between shrink-0">
          <div className="flex flex-wrap gap-3 items-center">
            {moduleKey && (
              <button
                onClick={() => {
                  downloadModuleTemplate(moduleKey);
                  toast.success("Modèle de document téléchargé !");
                }}
                className="btn-outline text-xs py-1.5 px-3.5 flex items-center gap-2 text-kontrol-blue hover:bg-kontrol-blue/5 border-kontrol-blue/20"
                title="Téléchargez le modèle Excel structuré requis"
              >
                <FileDown size={14} />
                <span>Modèle requis (.xlsx)</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-kontrol-ink-soft">
            <span className="bg-slate-100 px-3 py-1.5 rounded-xl">
              Total détecté : <strong className="text-kontrol-dark">{rawData.length}</strong> lignes
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-100">
              Prêt à importer : <strong className="text-emerald-900">{selectedIndices.size}</strong> lignes
            </span>
            {duplicateTotalCount > 0 && (
              <span className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-150 flex items-center gap-1.5">
                <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                Doublons : <strong className="text-amber-900">{duplicateTotalCount}</strong> détectés
              </span>
            )}
            {invalidTotalCount > 0 && (
              <span className="bg-red-50 text-red-800 px-3 py-1.5 rounded-xl border border-red-150 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle size={12} className="shrink-0 text-red-600" />
                Données invalides : <strong className="text-red-900">{invalidTotalCount}</strong> à corriger
              </span>
            )}
          </div>
        </div>

        {/* Field Correspondence / Mapping Section */}
        <div className="px-6 py-3 border-b border-kontrol-border bg-slate-50 flex flex-col gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-kontrol-ink-soft uppercase tracking-wider">
            Correspondance des colonnes identifiées :
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
            {columns.map(col => (
              <div key={col.key} className="bg-white border border-kontrol-border rounded-xl p-2 flex flex-col justify-between shadow-xs">
                <span className="text-[9px] font-bold text-kontrol-ink-muted leading-tight uppercase">Champs App</span>
                <span className="text-[11px] font-extrabold text-[#3b82f6] leading-tight truncate" title={col.label}>{col.label}</span>
                <div className="my-1 h-px bg-slate-100" />
                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                  Excel OK
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Embedded Filters */}
        <div className="p-4 border-b border-kontrol-border flex gap-3 items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-kontrol-bg border border-kontrol-border rounded-xl text-xs w-80">
            <Search size={14} className="text-kontrol-ink-muted" />
            <input
              type="text"
              placeholder="Filtrer dans cet aperçu..."
              className="bg-transparent border-none outline-none w-full text-kontrol-dark"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <p className="text-[11px] text-kontrol-ink-muted font-bold">
            Page {currentPageSafe} sur {totalPages} — {filteredRows.length} lignes trouvées
          </p>
        </div>

        {/* Content Table Area */}
        <div className="overflow-y-auto grow p-6 min-h-[300px] bg-slate-50/20">
          {filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-kontrol-ink-muted font-medium">Aucun résultat ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="border border-kontrol-border rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse table-auto">
                <thead className="bg-kontrol-bg/60 text-[11px] font-bold text-kontrol-ink-muted uppercase tracking-widest border-b border-kontrol-border">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center bg-slate-50">
                      <input
                        type="checkbox"
                        className="rounded accent-kontrol-blue cursor-pointer"
                        checked={pagedRows.length > 0 && pagedRows.filter(r => !r.validationError).every(r => selectedIndices.has(r.idx))}
                        onChange={handleToggleAll}
                      />
                    </th>
                    {columns.map(col => (
                      <th key={col.key} className="py-3 px-4">{col.label}</th>
                    ))}
                    <th className="py-3 px-4 text-center w-48 bg-slate-50">Statut de validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kontrol-border text-[12px] text-kontrol-dark">
                  {pagedRows.map(({ row, idx, isRecordDuplicate, validationError }) => (
                    <tr 
                      key={idx} 
                      className={cn(
                        "hover:bg-slate-50 transition-colors",
                        validationError ? "bg-red-50/10 hover:bg-red-50/20" : isRecordDuplicate ? "bg-amber-50/10 hover:bg-amber-50/20" : "",
                        selectedIndices.has(idx) ? "bg-kontrol-blue/5" : ""
                      )}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          className={cn(
                            "rounded accent-kontrol-blue cursor-pointer",
                            validationError ? "opacity-30 cursor-not-allowed" : ""
                          )}
                          checked={selectedIndices.has(idx)}
                          disabled={!!validationError}
                          onChange={() => handleToggleRow(idx)}
                        />
                      </td>
                      {columns.map(col => {
                        const cellVal = row[col.key] ?? row[col.label] ?? '';
                        return (
                          <td key={col.key} className="py-3 px-4 font-medium max-w-[200px] truncate">
                            {col.render ? col.render(row) : String(cellVal)}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center">
                        {validationError ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200/60 px-2.5 py-1 rounded-full text-left max-w-xs leading-tight" title={validationError}>
                            <AlertTriangle size={11} className="shrink-0 text-red-500 animate-bounce" />
                            <span>Invalide : {validationError}</span>
                          </span>
                        ) : isRecordDuplicate ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full">
                            <AlertTriangle size={11} className="shrink-0 text-amber-500" />
                            <span>Double potentiel</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                            <Check size={11} className="shrink-0 text-emerald-500" />
                            <span>Prêt à importer</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-kontrol-border flex items-center justify-between bg-slate-50 shrink-0">
          <span className="text-[11px] font-bold text-kontrol-ink-muted">
            Affichage de {Math.min(filteredRows.length, (currentPageSafe - 1) * itemsPerPage + 1)} - {Math.min(filteredRows.length, currentPageSafe * itemsPerPage)} sur {filteredRows.length} lignes
          </span>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPageSafe === 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-kontrol-border bg-white hover:bg-slate-50 disabled:opacity-40 transition-all text-kontrol-ink-soft"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-kontrol-dark px-2">
              {currentPageSafe} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPageSafe === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-kontrol-border bg-white hover:bg-slate-50 disabled:opacity-40 transition-all text-kontrol-ink-soft"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Modal Footer Actions - High Visibility Styled Validation Button */}
        <div className="p-6 border-t border-kontrol-border flex justify-between items-center bg-slate-50/55 shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            * Les lignes signalées comme <span className="text-red-600 font-bold">invalides</span> ou décochées seront exclues de l'alimentation définitive de votre base de données.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="text-xs px-5 py-2.5 font-bold rounded-xl border border-slate-200 hover:bg-slate-100/80 text-slate-600 transition-colors bg-white hover:cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={importing || selectedIndices.size === 0}
              className={cn(
                "text-xs px-6 py-2.5 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2",
                selectedIndices.size > 0 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-emerald-600/30 scale-100 active:scale-95 cursor-pointer" 
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              )}
            >
              {importing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Confirmer & Valider l'importation ({selectedIndices.size} lignes)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
