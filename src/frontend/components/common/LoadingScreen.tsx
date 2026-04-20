import React from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-kontrol-bg overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-kontrol-blue blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-kontrol-orange blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo Container with rotating border/glow */}
        <div className="relative p-8">
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute inset-0 border-[1px] border-kontrol-blue/20 rounded-[2.5rem] dashed"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Logo size={80} className="relative z-10" />
          </motion.div>
        </div>

        {/* Text and progress */}
        <div className="mt-12 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tighter uppercase">
              KONTROL <span className="text-kontrol-blue tracking-widest font-black ml-1">SYSTEM</span>
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.3em]">
                Initialisation sécurisée
              </p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="w-48 h-1 bg-kontrol-border rounded-full overflow-hidden mx-auto">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 2.5, 
                ease: "easeInOut",
                repeat: Infinity 
              }}
              className="h-full bg-gradient-to-r from-kontrol-blue to-kontrol-orange shadow-lg shadow-kontrol-blue/40"
            />
          </div>
          
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[9px] font-bold text-kontrol-ink-soft uppercase tracking-widest"
          >
            Protocoles Blue AI actifs • Connexion chiffrée
          </motion.p>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-12 left-12 w-12 h-12 border-l-2 border-t-2 border-kontrol-border rounded-tl-2xl" />
      <div className="absolute top-12 right-12 w-12 h-12 border-r-2 border-t-2 border-kontrol-border rounded-tr-2xl" />
      <div className="absolute bottom-12 left-12 w-12 h-12 border-l-2 border-b-2 border-kontrol-border rounded-bl-2xl" />
      <div className="absolute bottom-12 right-12 w-12 h-12 border-r-2 border-b-2 border-kontrol-border rounded-br-2xl" />
    </div>
  );
}
