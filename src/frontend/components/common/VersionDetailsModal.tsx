import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Zap, 
  Cpu, 
  Award,
  History
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AppVersion {
  id: string;
  version: string;
  status?: string;
  releaseDate: number;
  description: string;
  features: string[];
  author: string;
}

interface VersionDetailsModalProps {
  version: AppVersion | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionDetailsModal({ version, isOpen, onClose }: VersionDetailsModalProps) {
  if (!version) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-kontrol-border"
          >
            {/* Header: Cosmic / Premium styled bar */}
            <div className="relative p-8 bg-gradient-to-br from-kontrol-dark to-slate-900 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-kontrol-blue/20 blur-[80px]" />
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all outline-none"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 bg-kontrol-blue rounded-2xl flex items-center justify-center shadow-lg shadow-kontrol-blue/20">
                  <Zap size={22} className="text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-kontrol-blue bg-white/10 px-2.5 py-0.5 rounded-full">
                      Mise à Jour Appliquée
                    </span>
                  </div>
                  <h4 className="text-2xl font-black tracking-tighter mt-1">{version.version}</h4>
                </div>
              </div>

              <div className="flex items-center gap-4 text-white/50 text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                  <Calendar size={12} />
                  {new Date(version.releaseDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                  <Cpu size={12} />
                  {version.author}
                </span>
              </div>
            </div>

            {/* Content body */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-soft flex items-center gap-2">
                  <Award size={14} className="text-kontrol-blue" />
                  Note de version
                </h5>
                <p className="text-[13px] text-kontrol-ink leading-relaxed font-semibold bg-kontrol-bg/40 p-4 rounded-xl border border-kontrol-border/55">
                  {version.description}
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-soft flex items-center gap-2">
                  <Sparkles size={14} className="text-kontrol-blue" />
                  Fonctionnalités ajoutées
                </h5>
                <div className="grid grid-cols-1 gap-2.5">
                  {version.features && version.features.length > 0 ? (
                    version.features.map((feat, idx) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-white border border-kontrol-border/60 hover:border-kontrol-blue/20 rounded-xl hover:shadow-xs transition-all"
                      >
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[12.5px] font-bold text-kontrol-dark leading-tight">{feat}</span>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-xs text-kontrol-ink-muted italic pl-1">Aucun détail supplémentaire listé.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-kontrol-bg/30 border-t border-kontrol-border text-center">
              <button
                onClick={onClose}
                className="w-full bg-kontrol-dark text-white hover:bg-kontrol-blue py-3.5 px-6 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest transition-all shadow-lg hover:shadow-kontrol-blue/10 active:scale-98"
              >
                Fermer et continuer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
