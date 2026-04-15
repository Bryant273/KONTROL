import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Zap, 
  Layout, 
  Shield, 
  Cpu, 
  Loader2, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Brain,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { db, collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from '../../../api/firebase';

interface AIProposal {
  id: string;
  title: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'UI' | 'PERFORMANCE' | 'SECURITY' | 'FEATURE';
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  createdAt: any;
}

export function UpdatesView() {
  const [proposals, setProposals] = useState<AIProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'ai_proposals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AIProposal));
      setProposals(data);
      setIsLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Proposals fetch error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGenerateProposal = async () => {
    setIsGenerating(true);
    try {
      // Simulation d'une réflexion IA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newProposal = {
        title: 'Optimisation Prédictive des Stocks v2',
        description: 'Intégration d\'un moteur de recommandation basé sur les tendances saisonnières pour anticiper les besoins d\'approvisionnement.',
        impact: 'HIGH',
        category: 'FEATURE',
        status: 'PROPOSED',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'ai_proposals'), newProposal);
    } catch (error) {
      console.error("Error generating proposal:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateDoc(doc(db, 'ai_proposals', id), { status });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-kontrol-blue mb-2">Intelligence Prédictive</h3>
          <h2 className="text-3xl font-extrabold text-kontrol-dark tracking-tighter uppercase">Mises à jour BLUE AI</h2>
          <p className="text-sm text-kontrol-ink-muted mt-1">Découvrez et validez les évolutions suggérées par l'IA pour KONTROL.</p>
        </div>
        <button 
          onClick={handleGenerateProposal}
          disabled={isGenerating}
          className="flex items-center gap-3 px-8 py-4 bg-kontrol-dark text-white rounded-2xl font-extrabold text-[12px] uppercase tracking-widest hover:bg-kontrol-blue transition-all disabled:opacity-50 shadow-xl shadow-kontrol-dark/10"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
          Générer une proposition
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} className="text-kontrol-blue animate-spin mb-4" />
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">Analyse des propositions en cours...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {proposals.map((proposal) => (
              <motion.div 
                key={proposal.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "card p-6 border-2 transition-all group relative overflow-hidden",
                  proposal.status === 'APPROVED' ? "border-emerald-500/20 bg-emerald-50/10" :
                  proposal.status === 'REJECTED' ? "border-rose-500/20 bg-rose-50/10" :
                  "border-transparent hover:border-kontrol-blue/20"
                )}
              >
                {/* Background Glow */}
                <div className={cn(
                  "absolute -top-10 -right-10 w-32 h-32 blur-[60px] -z-10 opacity-20",
                  proposal.category === 'UI' ? "bg-purple-500" :
                  proposal.category === 'FEATURE' ? "bg-blue-500" :
                  proposal.category === 'SECURITY' ? "bg-rose-500" :
                  "bg-emerald-500"
                )} />

                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                    proposal.category === 'UI' ? "bg-purple-100 text-purple-600" :
                    proposal.category === 'FEATURE' ? "bg-blue-100 text-blue-600" :
                    proposal.category === 'SECURITY' ? "bg-rose-100 text-rose-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {proposal.category === 'UI' ? <Layout size={24} /> :
                     proposal.category === 'FEATURE' ? <Zap size={24} /> :
                     proposal.category === 'SECURITY' ? <Shield size={24} /> :
                     <Cpu size={24} />}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full border",
                      proposal.impact === 'HIGH' ? "bg-rose-50 text-rose-600 border-rose-100" :
                      proposal.impact === 'MEDIUM' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      Impact {proposal.impact}
                    </span>
                    {proposal.status !== 'PROPOSED' && (
                      <span className={cn(
                        "text-[8px] font-extrabold uppercase tracking-widest",
                        proposal.status === 'APPROVED' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {proposal.status === 'APPROVED' ? 'Approuvé' : 'Rejeté'}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-lg font-extrabold text-kontrol-dark mb-3 tracking-tight group-hover:text-kontrol-blue transition-colors">
                  {proposal.title}
                </h4>
                <p className="text-[12px] text-kontrol-ink-soft leading-relaxed mb-8 min-h-[60px]">
                  {proposal.description}
                </p>

                <div className="flex items-center gap-3">
                  {proposal.status === 'PROPOSED' ? (
                    <>
                      <button 
                        onClick={() => handleStatusUpdate(proposal.id, 'APPROVED')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 size={14} /> Approuver
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(proposal.id, 'REJECTED')}
                        className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full py-3 bg-kontrol-bg rounded-xl text-center">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">
                        {proposal.status === 'APPROVED' ? 'Prêt pour déploiement' : 'Proposition archivée'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
