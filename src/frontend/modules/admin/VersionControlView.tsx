import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  History, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Brain, 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  ChevronRight,
  Shield,
  Code,
  Layout,
  Cpu,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  auth,
  logAction,
  setDoc,
  writeBatch
} from '../../../api/firebase';

interface AppVersion {
  id: string;
  version: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'EXPERIMENTAL';
  releaseDate: number;
  description: string;
  features: string[];
  author: string;
}

interface AIProposal {
  id: string;
  title: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'UI' | 'PERFORMANCE' | 'SECURITY' | 'FEATURE';
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
}

export function VersionControlView() {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVersion, setCurrentVersion] = useState<string>('V1.0.0');
  const [isSwitching, setIsSwitching] = useState(false);
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newVersionData, setNewVersionData] = useState({
    version: '',
    description: '',
    features: '',
    author: 'Innov\'Korp Team'
  });

  const pushUpdateNotificationToAllCompanies = async (
    versionNum: string,
    desc: string,
    feats: string[],
    versionAuthor: string
  ) => {
    try {
      const companiesSnap = await getDocs(collection(db, 'companies'));
      if (companiesSnap.empty) return;

      const batch = writeBatch(db);
      companiesSnap.docs.forEach((compDoc) => {
        const companyId = compDoc.id;
        const docId = `update_${companyId}_${versionNum.replace(/\./g, '_')}`;
        const docRef = doc(db, 'notifications', docId);

        batch.set(docRef, {
          companyId,
          title: `Mise à jour Système : ${versionNum}`,
          message: desc,
          type: 'update',
          read: false,
          timestamp: Date.now(),
          isUpdate: true,
          versionNumber: versionNum,
          versionDescription: desc,
          versionFeatures: feats || [],
          versionAuthor: versionAuthor || "Innov'Korp Team"
        });
      });

      await batch.commit();
    } catch (err) {
      console.error("Error setting deterministic update notifications:", err);
    }
  };

  useEffect(() => {
    // Listen to system config for current version
    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setCurrentVersion((snap.data().currentVersion || 'V1.0.0').replace(/-PRO/gi, ''));
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, 'system/config', auth.currentUser, false);
      }
    });

    // Listen to versions list
    const q = query(collection(db, 'app_versions'), orderBy('releaseDate', 'desc'));
    const unsubVersions = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Initialize with default versions if empty
        const initialVersions: Omit<AppVersion, 'id'>[] = [
          {
            version: 'V1.0.0',
            status: 'ACTIVE',
            releaseDate: Date.now(),
            description: "Version initiale de lancement de la plateforme de gestion centralisée KONTROL.",
            features: [
              "Module de Comptabilité & Reporting de Trésorerie en temps réel",
              "Module de Gestion Répertoire Tiers (Contacts, Relations clients et fournisseurs)",
              "Cerveau Cognitif Intégré (Blue AI Brain) pour analyses comptables automatisées",
              "Module de Gestion de Stocks et Produits",
              "Assistance IA intégrée par Innov'Korp"
            ],
            author: 'Innov\'Korp Team'
          }
        ];
        (async () => {
          for (const v of initialVersions) {
            try {
              await addDoc(collection(db, 'app_versions'), v);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, 'app_versions/init', auth.currentUser, false);
            }
          }
        })().catch(err => console.error("Unhandled rejection in initial versions setup:", err));
      } else {
        setVersions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppVersion)));
      }
      setIsLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'app_versions', auth.currentUser, false);
      }
      setIsLoading(false);
    });

    return () => {
      unsubConfig();
      unsubVersions();
    };
  }, [t]);

  const handleSwitchVersion = async (version: string) => {
    setIsSwitching(true);
    try {
      // Real impact: update system config
      await updateDoc(doc(db, 'system', 'config'), { 
        currentVersion: version,
        lastSwitchAt: serverTimestamp(),
        switchedBy: auth.currentUser?.uid
      });
      
      // Log the critical action
      await logAction(
        'SYSTEM',
        auth.currentUser?.uid || 'SYSTEM',
        auth.currentUser?.displayName || t('common.roles.admin_kontrol'),
        'VERSION_SWITCH',
        `Bascule réelle du système vers la version ${version}`
      );

      // Instantly generate release update notification for all companies
      const matchingVersion = versions.find(v => v.version === version);
      if (matchingVersion) {
        await pushUpdateNotificationToAllCompanies(
          matchingVersion.version,
          matchingVersion.description,
          matchingVersion.features,
          matchingVersion.author
        );
      }

      console.log(t('admin.versions.switch_success', { version }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system/config', auth.currentUser, false);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionData.version || !newVersionData.description) return;

    try {
      const featuresArray = newVersionData.features.split(',').map(f => f.trim()).filter(f => f !== '');
      await addDoc(collection(db, 'app_versions'), {
        version: newVersionData.version,
        description: newVersionData.description,
        features: featuresArray,
        author: newVersionData.author,
        status: 'ARCHIVED',
        releaseDate: Date.now()
      });

      // Instantly notify everyone of the new archived/releasable version
      await pushUpdateNotificationToAllCompanies(
        newVersionData.version,
        newVersionData.description,
        featuresArray,
        newVersionData.author
      );

      setIsAddingVersion(false);
      setNewVersionData({ version: '', description: '', features: '', author: 'Innov\'Korp Team' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_versions/create', auth.currentUser, false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Current Version Status */}
      <div className="bg-kontrol-dark rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-kontrol-blue/20 blur-[100px] -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-kontrol-blue rounded-2xl flex items-center justify-center shadow-lg shadow-kontrol-blue/20">
                {isSwitching ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-white/40">{t('admin.versions.active_label')}</p>
                <h2 className="text-3xl font-extrabold tracking-tighter">{currentVersion}</h2>
              </div>
            </div>
            <p className="text-sm text-white/60 max-w-md">
              {t('admin.versions.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">{t('admin.versions.deployment_status')}</p>
              <p className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('admin.versions.production_live')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.versions.log_title')}</h3>
            <p className="text-sm text-kontrol-ink-soft mt-1">{t('admin.versions.log_subtitle')}</p>
          </div>
          <button 
            onClick={() => setIsAddingVersion(true)}
            className="flex items-center gap-2 px-6 py-3 bg-kontrol-dark text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-kontrol-blue transition-all shadow-lg shadow-kontrol-dark/10"
          >
            <Plus size={14} /> {t('admin.versions.archive_current')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {versions.map((v) => (
            <div 
              key={v.id} 
              className={cn(
                "card p-6 transition-all border-2",
                v.version === currentVersion ? "border-kontrol-blue bg-kontrol-blue/5 shadow-xl shadow-kontrol-blue/5" : "border-transparent hover:border-kontrol-border"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-sm transition-all",
                    v.version === currentVersion ? "bg-kontrol-blue text-white scale-110" : "bg-kontrol-bg text-kontrol-ink-muted"
                  )}>
                    {v.version.split('.')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{v.version}</h4>
                      <span className={cn(
                        "px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-full border",
                        v.version === currentVersion ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-kontrol-bg text-kontrol-ink-muted border-kontrol-border"
                      )}>
                        {v.version === currentVersion ? t('common.active') : t('admin.versions.archive_modal.title').split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-kontrol-ink-muted font-bold uppercase tracking-widest">
                      {t('produits.details.created_at')} {new Date(v.releaseDate).toLocaleDateString()} • {t('common.powered_by')} {v.author}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {v.version !== currentVersion && (
                    <button 
                      onClick={() => handleSwitchVersion(v.version)}
                      disabled={isSwitching}
                      className="px-8 py-3 bg-white border border-kontrol-border text-kontrol-dark rounded-xl text-[11px] font-extrabold uppercase tracking-widest hover:border-kontrol-blue hover:text-kontrol-blue hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {isSwitching ? t('admin.versions.switching') : t('admin.versions.activate_this')}
                    </button>
                  )}
                  <button className="p-3 bg-kontrol-bg text-kontrol-ink-muted rounded-xl hover:bg-kontrol-border transition-all">
                    <History size={20} />
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-kontrol-border/50">
                <p className="text-[13px] text-kontrol-ink-soft mb-5 font-medium leading-relaxed">{v.description}</p>
                <div className="flex flex-wrap gap-2">
                  {v.features.map((feature, idx) => (
                    <span key={idx} className="flex items-center gap-2 px-4 py-1.5 bg-white border border-kontrol-border rounded-xl text-[10px] font-bold text-kontrol-dark shadow-sm">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Version Modal */}
      <AnimatePresence>
        {isAddingVersion && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-kontrol-dark/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between bg-kontrol-bg/30">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">{t('admin.versions.archive_modal.title')}</h3>
                <button onClick={() => setIsAddingVersion(false)} className="p-2 hover:bg-kontrol-border rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddVersion} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.versions.archive_modal.number')}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="ex: V3.1.0"
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" 
                    value={newVersionData.version} 
                    onChange={(e) => setNewVersionData({...newVersionData, version: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('charges.form.description')}</label>
                  <textarea 
                    required 
                    rows={3}
                    placeholder="Décrivez les changements majeurs..."
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue resize-none" 
                    value={newVersionData.description} 
                    onChange={(e) => setNewVersionData({...newVersionData, description: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-kontrol-ink-muted">{t('admin.versions.archive_modal.features')}</label>
                  <input 
                    type="text" 
                    placeholder="Feature 1, Feature 2..."
                    className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl text-[13px] outline-none focus:border-kontrol-blue" 
                    value={newVersionData.features} 
                    onChange={(e) => setNewVersionData({...newVersionData, features: e.target.value})} 
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-4 font-extrabold uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 shadow-xl shadow-kontrol-blue/20">
                  <CheckCircle2 size={18} /> {t('admin.versions.archive_modal.save')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
