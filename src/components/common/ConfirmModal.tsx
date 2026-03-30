import React from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirmer', 
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variants = {
    danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
    warning: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    info: 'bg-kontrol-blue hover:bg-kontrol-blue/90 shadow-kontrol-blue/20'
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-kontrol-dark/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
          <div className="flex items-center gap-2 text-kontrol-dark">
            <AlertCircle size={18} className={cn(
              variant === 'danger' ? 'text-rose-600' : 
              variant === 'warning' ? 'text-orange-500' : 'text-kontrol-blue'
            )} />
            <h3 className="font-extrabold text-[14px] uppercase tracking-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-kontrol-bg rounded-md text-kontrol-ink-muted transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-[13.5px] text-kontrol-ink-soft leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="p-4 bg-kontrol-bg/30 border-t border-kontrol-border flex gap-3">
          <button 
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-[13px] font-bold text-kontrol-ink-soft hover:bg-white rounded-xl border border-kontrol-border transition-all"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 py-2.5 text-[13px] font-bold text-white rounded-xl transition-all shadow-lg flex items-center justify-center gap-2",
              variants[variant]
            )}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
