import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
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
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-kontrol-dark/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl",
                variant === 'danger' ? "bg-rose-50 text-rose-600" : 
                variant === 'warning' ? "bg-amber-50 text-amber-600" : 
                "bg-blue-50 text-blue-600"
              )}>
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{title}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-8">
            <p className="text-[14px] text-kontrol-ink-soft leading-relaxed">
              {message}
            </p>
          </div>

          <div className="p-8 bg-kontrol-bg/30 border-t border-kontrol-border flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-kontrol-border text-kontrol-ink-muted rounded-xl text-[12px] font-extrabold uppercase tracking-widest hover:bg-kontrol-bg transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                "flex-1 py-3 text-white rounded-xl text-[12px] font-extrabold uppercase tracking-widest transition-all shadow-lg",
                variant === 'danger' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : 
                variant === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" : 
                "bg-kontrol-blue hover:bg-blue-700 shadow-kontrol-blue/20"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
