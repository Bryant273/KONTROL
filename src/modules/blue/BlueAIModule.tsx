import React from 'react';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Calendar,
  Zap,
  BrainCircuit,
  BarChart3
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  User 
} from '../../firebase';
import { UserProfile, Transaction, Charge, Produit } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import Markdown from 'react-markdown';

interface BlueAIModuleProps {
  user: User;
  currentUserProfile: UserProfile | null;
}

export function BlueAIModule({ user, currentUserProfile }: BlueAIModuleProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 bg-gradient-to-br from-kontrol-blue to-kontrol-orange rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-kontrol-blue/20 animate-pulse">
        <BrainCircuit size={48} className="text-white" />
      </div>
      <h2 className="text-3xl font-extrabold text-kontrol-dark mb-4 tracking-tighter uppercase">Blue AI Intelligence</h2>
      <p className="text-kontrol-ink-muted max-w-md mb-10 font-medium leading-relaxed">
        Notre moteur d'intelligence artificielle avancée est en cours de déploiement. 
        Bientôt, Blue analysera vos données en temps réel pour vous offrir des conseils stratégiques inédits.
      </p>
      <div className="inline-flex items-center gap-3 px-6 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl text-kontrol-blue font-extrabold text-xs uppercase tracking-widest">
        <Sparkles size={16} className="animate-spin-slow" />
        Bientôt disponible
      </div>
    </div>
  );
}
