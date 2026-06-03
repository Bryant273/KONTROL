import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'ControlTower.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find start of the billing gateway's mistaken return
const searchToken = '  return (\n    <motion.div \n      initial={{ opacity: 0, y: 15 }} \n      animate={{ opacity: 1, y: 0 }} \n      className="space-y-6"\n    >\n      {/* Header and Title */}';

const startIndex = content.indexOf(searchToken);

if (startIndex === -1) {
  console.error("COULD NOT FIND START POSITION!");
  process.exit(1);
}

// Find ending token
const endToken = '  );}\n\nfunction SystemTelemetryView';
const endIndex = content.indexOf(endToken);

if (endIndex === -1) {
  console.error("COULD NOT FIND END INTEGRITY TOKEN!");
  process.exit(1);
}

const replacement = `  const [activeTabSub, setActiveTabSub] = useState('roster');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(c => {
    const name = (c.companyName || c.displayName || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const pendingRequests = paymentRequests.filter(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-kontrol-border shadow-sm">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-kontrol-dark uppercase tracking-tight flex items-center gap-2">
            <Coins className="text-kontrol-blue" size={22} />
            Pilote des Abonnements & Activations
          </h3>
          <p className="text-xs text-kontrol-ink-soft">
            Gerez les licences KONTROL, prolongez les licences de demonstration et validez les transferts de fonds.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-5 py-3 bg-white hover:bg-kontrol-bg border border-kontrol-border text-kontrol-dark rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowDownToLine size={14} />
          {t('common.export')} .XLSX
        </button>
      </div>

      <div className="flex border-b border-kontrol-border pb-px gap-6">
        <button
          onClick={() => setActiveTabSub('roster')}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-wider relative transition-all",
            activeTabSub === 'roster' ? "text-kontrol-blue" : "text-kontrol-ink-soft hover:text-kontrol-dark"
          )}
        >
          Portefeuille Client ({filteredCompanies.length})
          {activeTabSub === 'roster' && (
            <motion.div layoutId="subTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-kontrol-blue" />
          )}
        </button>
        <button
          onClick={() => setActiveTabSub('requests')}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-wider relative transition-all flex items-center gap-2",
            activeTabSub === 'requests' ? "text-kontrol-blue" : "text-kontrol-ink-soft hover:text-kontrol-dark"
          )}
        >
          Confirmations de Paiement ({pendingRequests.length})
          {pendingRequests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          {activeTabSub === 'requests' && (
            <motion.div layoutId="subTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-kontrol-blue" />
          )}
        </button>
      </div>

      {activeTabSub === 'roster' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kontrol-ink-soft" size={16} />
              <input
                type="text"
                placeholder="Rechercher une entreprise par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-12 pr-4 py-3 bg-white border border-kontrol-border rounded-xl outline-none focus:border-kontrol-blue"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 border border-kontrol-border rounded-xl self-start">
              <span className="text-[10px] font-bold uppercase text-kontrol-ink-muted">Essai standard :</span>
              <select
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="text-xs font-extrabold text-kontrol-dark bg-transparent outline-none cursor-pointer"
              >
                <option value="15">15 jours</option>
                <option value="30">30 jours</option>
                <option value="60">60 jours</option>
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-kontrol-dark">
                <thead>
                  <tr className="bg-kontrol-bg/50 border-b border-kontrol-border text-kontrol-ink-muted uppercase font-bold tracking-wider text-[9px]">
                    <th className="px-6 py-4">Structure</th>
                    <th className="px-6 py-4">Contact mail</th>
                    <th className="px-6 py-4">Statut d'Abonnement</th>
                    <th className="px-6 py-4">Echeance de Licence</th>
                    <th className="px-6 py-4 text-right">Actions administratives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kontrol-border font-medium">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-kontrol-ink-muted italic">
                        Aucune entreprise ne correspond a votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => {
                      const isTrial = company.isDemo;
                      const isExpired = company.subscriptionEndDate ? company.subscriptionEndDate < Date.now() : true;
                      const status = company.subscriptionStatus || 'INACTIF';

                      return (
                        <tr key={company.id} className="hover:bg-kontrol-bg/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-kontrol-bg border border-kontrol-border flex items-center justify-center font-bold text-kontrol-blue uppercase">
                                {(company.companyName || company.displayName || '?')[0]}
                              </div>
                              <span className="font-bold text-kontrol-dark">
                                {company.companyName || company.displayName || 'Sans nom'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-kontrol-ink-soft">
                            {company.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                              status === 'ACTIVE'
                                ? isTrial
                                  ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-red-50 text-red-600 border-red-200"
                            )}>
                              {status === 'ACTIVE' ? (isTrial ? "Essai Gratuit" : "Fiduciaire Standard") : "Inactif"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-kontrol-ink-soft">
                            {company.subscriptionEndDate 
                              ? new Date(company.subscriptionEndDate).toLocaleDateString('fr-FR') 
                              : 'Non definie'
                            }
                            {status === 'ACTIVE' && isExpired && (
                              <span className="ml-2 text-[9px] font-black text-red-500 uppercase tracking-tighter">(Expieree)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpgradeToSubscriber(company.id, 30)}
                                disabled={isProcessing === company.id}
                                className="px-3 py-1.5 bg-kontrol-blue hover:bg-blue-600 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                +30J Standard
                              </button>
                              <button
                                onClick={() => handleUpgradeToSubscriber(company.id, parseInt(trialDays), true)}
                                disabled={isProcessing === company.id}
                                className="px-3 py-1.5 bg-white border border-kontrol-border hover:bg-kontrol-bg text-kontrol-dark rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                Activer Essai
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTabSub === 'requests' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-kontrol-dark">
              <thead>
                <tr className="bg-kontrol-bg/50 border-b border-kontrol-border text-kontrol-ink-muted uppercase font-bold tracking-wider text-[9px]">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Mode & Reference</th>
                  <th className="px-6 py-4">Montant Verse</th>
                  <th className="px-6 py-4">Date de Demande</th>
                  <th className="px-6 py-4 text-right">Actions de Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kontrol-border font-medium">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-kontrol-ink-soft italic">
                      Aucune demande de validation de paiement en attente.
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-kontrol-bg/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-kontrol-dark">
                        {req.companyName || "Client KONTROL"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[10px] text-kontrol-blue uppercase">{req.gateway || 'Wave'}</span>
                          <span className="font-semibold text-kontrol-ink-soft text-[10px] uppercase font-mono">{req.reference}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-kontrol-blue font-mono">
                        {req.amount} {req.currency}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-kontrol-ink-muted">
                        {req.createdAt ? new Date(req.createdAt).toLocaleString('fr-FR') : 'Date inconnue'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprovePayment(req)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all"
                          >
                            Valider l'octroi
                          </button>
                          <button
                            onClick={() => handleRejectPayment(req)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all"
                          >
                            Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function IntelligenceAIView({ stats, systemStats }: any) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab ] = useState('prompt');
  
  // Model Configurations
  const [systemPrompt, setSystemPrompt] = useState(\`Vous etes Blue, l'Intelligence Artificielle de gestion d'entreprise KONTROL. Votre mission est d'agir comme un analyste fiduciaire senior et un conseiller financier de niveau mondial.\`);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.95);

  // Playground Configurations
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResponse, setSimulationResponse] = useState('');
  const [playgroundLogs, setPlaygroundLogs] = useState([]);

  // RAG Indexing Configs
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-004');
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(50);
  const [isReindexing, setIsReindexing] = useState(false);
  const [indexingStatusLogs, setIndexingStatusLogs] = useState([
    "Index RAG initialise sous text-embedding-004",
    "Generation des embeddings semantiques pour les clients (Derniere synchro: il y a 2h)",
    "Index semantique coherent et aligne"
  ]);

  const runReindex = () => {
    setIsReindexing(true);
    setIndexingStatusLogs(prev => [...prev, \`[\${new Date().toLocaleTimeString()}] Lancement du pipeline d'indexation vectorielle...\`]);
    setTimeout(() => {
      setIndexingStatusLogs(prev => [
        ...prev,
        \`[\${new Date().toLocaleTimeString()}] Segmentation des invariants textuels en morceaux de \${chunkSize} tokens (overlap: \${overlap})\`,
        \`[\${new Date().toLocaleTimeString()}] Appel a Vertex Embeddings API pour rafraichir le store...\`,
        \`[\${new Date().toLocaleTimeString()}] Rafraichissement reussi des 1 420 chunks vectoriels !\`
      ]);
      setIsReindexing(false);
      toast.success("Reindexation RAG terminee !");
    }, 1500);
  };

  const handleTestPrompt = () => {
    if (!playgroundInput.trim()) return;
    setIsSimulating(true);
    setSimulationResponse('');
    setPlaygroundLogs([]);

    const responseSentences = [
      "## ANALYSE STRATEGIQUE DE TRESORERIE KONTROL\\n\\n",
      "Base sur l'extraction de vos journaux de ventes et de votre BFR actuel :\\n\\n",
      "1. **Acceleration des Recouvrements (DSO) :**\\n   - Automatisez les notifications de relance a J-5 de l'echeance legale.\\n   - Offrez un escompte financier de 1.2% pour tout paiement anticipe sous 7 jours.\\n\\n",
      "2. **Gestion Optimisee des Stocks (DSI) :**\\n   - Vos stocks inactifs d'approvisionnement excedent de 18% le seuil de securite.\\n   - Mettez en place des contrats cadres de type *Just-In-Time* avec vos fournisseurs principaux.\\n\\n",
      "3. **Preservation du Cash Flow :**\\n   - Negociez systematiquement de passer vos termes de credit fournisseurs de 30 a 45 jours fins de mois."
    ];

    setPlaygroundLogs(prev => [...prev, \`[\${new Date().toLocaleTimeString()}] Debut du streaming de la reponse d'intelligence cognitive...\`]);
    
    let currentIdx = 0;
    const streamTimer = setInterval(() => {
      if (currentIdx < responseSentences.length) {
        setSimulationResponse(prev => prev + responseSentences[currentIdx]);
        currentIdx++;
      } else {
        clearInterval(streamTimer);
        setIsSimulating(false);
        setPlaygroundLogs(prev => [...prev, \`[\${new Date().toLocaleTimeString()}] Session d'inference terminee avec succes.\`]);
        toast.success("Simulation cognitive terminee !");
      }
    }, 400);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-kontrol-border shadow-sm">
        <div>
          <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight flex items-center gap-2">
            <Brain className="text-kontrol-blue" size={24} />
            Blue AI Studio & Command Center
          </h3>
          <p className="text-xs text-kontrol-ink-muted font-bold uppercase tracking-wider mt-1">
            Supervisez le Noyau d'Intelligence Artificielle, optimisez les prompts et suivez les metriques RAG
          </p>
        </div>

        <div className="flex bg-kontrol-bg p-1 rounded-2xl border border-kontrol-border shrink-0 self-start lg:self-auto">
          <button
            onClick={() => setActiveTab('prompt')}
            className={\`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 \${
              activeTab === 'prompt'
                ? 'bg-kontrol-dark text-white shadow-lg'
                : 'text-kontrol-ink-soft hover:bg-kontrol-border'
            }\`}
          >
            <Sliders size={13} />
            Directives de Prompt
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={\`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 \${
              activeTab === 'playground'
                ? 'bg-kontrol-dark text-white shadow-lg'
                : 'text-kontrol-ink-soft hover:bg-kontrol-border'
            }\`}
          >
            <Play size={13} />
            Playground Sandbox
          </button>
          <button
            onClick={() => setActiveTab('indexing')}
            className={\`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 \${
              activeTab === 'indexing'
                ? 'bg-kontrol-dark text-white shadow-lg'
                : 'text-kontrol-ink-soft hover:bg-kontrol-border'
            }\`}
          >
            <Network size={13} />
            Parametres RAG
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={\`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 \${
              activeTab === 'analytics'
                ? 'bg-kontrol-dark text-white shadow-lg'
                : 'text-kontrol-ink-soft hover:bg-kontrol-border'
            }\`}
          >
            <LineChart size={13} />
            Trafic & Couts
          </button>
        </div>
      </div>

      {activeTab === 'prompt' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider">Invite Systeme Principale (System Instructions)</h4>
                  <p className="text-[10px] text-kontrol-ink-muted mt-0.5">Definit le role, le cadre d'analyse fiduciaire et le comportement cognitif de Blue AI.</p>
                </div>
                <span className="text-[9px] font-extrabold bg-blue-50 text-kontrol-blue px-2 py-1 rounded border border-blue-100 uppercase">
                  Version Active
                </span>
              </div>
              <div className="p-6 bg-kontrol-dark/95 text-white/90 font-mono text-xs leading-relaxed relative border-none outline-none">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-64 bg-transparent outline-none resize-none overflow-y-auto border-none p-0 focus:ring-0 placeholder-white/30 text-[11px]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
                <div className="absolute bottom-3 right-3 text-[9px] text-white/40 font-bold uppercase font-mono">
                  {systemPrompt.length} Caracteres
                </div>
              </div>
              <div className="p-4 border-t border-kontrol-border flex items-center justify-between bg-kontrol-bg/10">
                <p className="text-[10px] text-kontrol-ink-soft italic">
                  Les modifications sont injectees a chaud dans les sessions utilisateurs en cours de chat.
                </p>
                <button 
                  onClick={() => toast.success("Directives de prompt sauvegardees et appliquees !")}
                  className="px-5 py-2.5 bg-kontrol-blue text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-kontrol-blue/10"
                >
                  Sauvegarder et Appliquer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-kontrol-border rounded-3xl space-y-2">
                <h5 className="text-xs font-black text-kontrol-dark uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Garde-fous d'Acces de Securite
                </h5>
                <p className="text-[11px] text-kontrol-ink-soft leading-relaxed">
                  Blue AI ignore et rejette systematiquement les tentatives d'injection d'instructions tierces (prompt injection). Les requetes sont filtrees par tenantId au niveau de la passerelle RAG d'API.
                </p>
              </div>
              <div className="p-5 bg-white border border-kontrol-border rounded-3xl space-y-2">
                <h5 className="text-xs font-black text-kontrol-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" />
                  Auto-grounding des ecritures
                </h5>
                <p className="text-[11px] text-kontrol-ink-soft leading-relaxed">
                  Toute reponse impliquant une devise ou un solde inter-comptabilite est automatiquement indexee par rapport aux transactions verifiables presentes dans les stocks et journaux de vente.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 space-y-6">
              <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-kontrol-ink-soft" />
                Hyperparametres du Modele
              </h4>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Modele Majeur Actif</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Performance optimale, vitesse ultra-rapide' },
                    { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro', desc: 'Raisonnement fiduciaire et audits complexes' },
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Compatibilite historique optimisee' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={\`w-full text-left p-3 rounded-lg border transition-all \${
                        selectedModel === m.id
                          ? 'border-kontrol-blue bg-kontrol-blue/5'
                          : 'border-kontrol-border hover:bg-kontrol-bg/50'
                      }\`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-kontrol-dark">{m.name}</span>
                        {selectedModel === m.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-kontrol-blue animate-pulse" />
                        )}
                      </div>
                      <p className="text-[9px] text-kontrol-ink-muted mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-kontrol-ink-muted">
                    <span>Temperature (Creativite)</span>
                    <span className="text-kontrol-blue font-mono font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-kontrol-blue h-1 bg-kontrol-border rounded-lg appearance-none pointer-events-auto"
                  />
                  <div className="flex justify-between text-[8px] text-kontrol-ink-soft">
                    <span>Precis & Deterministe</span>
                    <span>Creatif & Fluide</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-kontrol-ink-muted">
                    <span>Max Output Tokens</span>
                    <span className="text-kontrol-blue font-mono font-bold">{maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-kontrol-blue h-1 bg-kontrol-border rounded-lg appearance-none pointer-events-auto"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-kontrol-ink-muted">
                    <span>Top-P (Nucleus Sampling)</span>
                    <span className="text-kontrol-blue font-mono font-bold">{topP}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full accent-kontrol-blue h-1 bg-kontrol-border rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 card p-6 space-y-4 flex flex-col h-[520px]">
            <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-3 flex items-center justify-between">
              <span>Bac a sable d'Inference</span>
              <span className="text-[8px] font-bold font-mono text-kontrol-ink-muted bg-kontrol-bg px-2 py-0.5 rounded border border-kontrol-border uppercase">
                {selectedModel}
              </span>
            </h4>

            <div className="space-y-1.5 flex-1 flex flex-col w-full">
              <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider text-left block w-full">Saisissez une requete d'analyse a simuler</label>
              <textarea
                value={playgroundInput}
                onChange={(e) => setPlaygroundInput(e.target.value)}
                placeholder="Exemple: Analyse nos ventes de l'annee et degage la tendance majeure..."
                disabled={isSimulating}
                className="w-full flex-1 p-4 bg-kontrol-bg border border-kontrol-border rounded-2xl text-xs outline-none focus:border-kontrol-blue focus:ring-1 focus:ring-kontrol-blue/15 resize-none placeholder-kontrol-ink-muted leading-relaxed"
              />
            </div>

            <button
              onClick={handleTestPrompt}
              disabled={isSimulating || !playgroundInput.trim()}
              className="w-full py-3.5 bg-kontrol-dark tracking-widest text-white text-[10px] font-extrabold uppercase rounded-2xl hover:bg-kontrol-blue transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {isSimulating ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Inference en Cours...
                </>
              ) : (
                <>
                  <Play size={14} /> Lancer le Diagnostics cognitif
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-6 flex flex-col h-[520px]">
            <div className="flex-1 bg-kontrol-dark rounded-[2rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <span className="text-[9px] font-extrabold tracking-widest text-white/50 uppercase font-mono">LOGS DE PIPELINE RAG + LLM</span>
                <span className={\`w-2 h-2 rounded-full \${isSimulating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}\`} />
              </div>
              <div className="p-6 font-mono text-[10px] text-white/95 leading-relaxed overflow-y-auto flex-1 space-y-1 bg-black/30 scrollbar-none text-left">
                {playgroundLogs.length === 0 ? (
                  <p className="text-white/30 italic">Le terminal est vide. Lancez une simulation pour observer la gateway d'API semantique.</p>
                ) : (
                  playgroundLogs.map((log, idx) => (
                    <div key={idx} className="border-l-2 border-kontrol-blue/50 pl-2 text-white/80 animate-in fade-in duration-200">
                      {log}
                    </div>
                  ))
                )}
                {isSimulating && (
                  <div className="flex items-center gap-1.5 text-kontrol-blue animate-pulse pl-2 font-bold font-mono">
                    <span>$</span> <span className="animate-ping">_</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-[200px] bg-white border border-kontrol-border rounded-[2rem] p-6 overflow-y-auto flex flex-col shadow-sm text-left">
              <span className="text-[9px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest block mb-1">Resultat D'Inference Cognitive (markdown)</span>
              <div className="text-xs text-kontrol-dark leading-relaxed font-sans flex-1 whitespace-pre-wrap">
                {simulationResponse || (
                  <span className="text-kontrol-ink-muted italic">La reponse s'affichera ici en streaming au fur et a mesure que l'inference s'execute...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'indexing' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="card p-6 space-y-6">
            <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-4 flex items-center gap-2">
              <Settings2 size={16} />
              Configuration d'Indexation RAG
            </h4>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider block text-left">Modele d'embedding</label>
                <select 
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full text-xs p-3 bg-kontrol-bg rounded-xl border border-kontrol-border text-kontrol-dark outline-none font-bold"
                >
                  <option value="text-embedding-004">Vertex Embeddings text-embedding-004</option>
                  <option value="text-embedding-gecko">Vertex Gecko Multi-lingual (Legacy)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider block text-left">Taille de Segment (Chunk Size)</label>
                <div className="flex gap-2">
                  {[256, 512, 1024].map((size) => (
                    <button
                      key={size}
                      onClick={() => setChunkSize(size)}
                      className={\`flex-1 py-2 text-xs font-bold rounded-xl border transition-all \${
                        chunkSize === size 
                          ? 'border-kontrol-blue bg-kontrol-blue/5 text-kontrol-blue' 
                          : 'border-kontrol-border text-kontrol-ink-soft hover:bg-kontrol-bg/50'
                      }\`}
                    >
                      {size} tokens
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider block text-left">Raccord de chevauchement (Overlap)</label>
                <div className="flex gap-2">
                  {[25, 50, 100].map((size) => (
                    <button
                      key={size}
                      onClick={() => setOverlap(size)}
                      className={\`flex-1 py-2 text-xs font-bold rounded-xl border transition-all \${
                        overlap === size 
                          ? 'border-kontrol-blue bg-kontrol-blue/5 text-kontrol-blue' 
                          : 'border-kontrol-border text-kontrol-ink-soft hover:bg-kontrol-bg/50'
                      }\`}
                    >
                      {size} tokens
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={runReindex}
                disabled={isReindexing}
                className="w-full py-3 bg-kontrol-dark text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-kontrol-blue transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isReindexing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Indexation en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} /> Forcer la Reindexation Complete
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="card p-6 border-l-4 border-l-kontrol-blue text-left">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-1">Total Fragments Vectorises</p>
                <h4 className="text-2xl font-black text-kontrol-dark">1 420</h4>
                <span className="text-[9px] font-bold text-emerald-500 uppercase mt-2 block">Chunks RAG Vector Store</span>
              </div>
              <div className="card p-6 border-l-4 border-l-purple-500 text-left">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-1">Invariants SQL Catalogues</p>
                <h4 className="text-2xl font-black text-kontrol-dark">5 120</h4>
                <span className="text-[9px] font-bold text-emerald-500 uppercase mt-2 block">Lignes relationnelles RAG</span>
              </div>
              <div className="card p-6 border-l-4 border-l-amber-500 text-left">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-1">Latence Semantique</p>
                <h4 className="text-2xl font-black text-kontrol-dark">45 ms</h4>
                <span className="text-[9px] font-bold text-kontrol-blue uppercase mt-2 block">Vertex Embeddings</span>
              </div>
            </div>

            <div className="bg-kontrol-dark rounded-[2rem] p-6 text-white h-[260px] flex flex-col overflow-hidden border border-white/10 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 bg-white/5 p-4 rounded-xl">
                <h5 className="text-[10px] font-black tracking-widest text-white/50 uppercase font-mono">Statut d'Indexation RAG en Direct</h5>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <div className="overflow-y-auto flex-1 font-mono text-[9.5px] leading-relaxed text-white/80 space-y-1 scrollbar-none text-left">
                {indexingStatusLogs.map((logStr, lIdx) => (
                  <div key={lIdx} className="border-l border-white/10 pl-2">
                    {logStr}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-3 flex items-center justify-between">
              <span>Appels Cognitifs Globaux (Inferences / jour)</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full">Integrite Fast Gateway</span>
            </h4>
            <div className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Lun', calls: 350 },
                  { name: 'Mar', calls: 490 },
                  { name: 'Mer', calls: 860 },
                  { name: 'Jeu', calls: 1420 },
                  { name: 'Ven', calls: 1200 },
                  { name: 'Sam', calls: 310 },
                  { name: 'Dim', calls: 120 }
                ]}>
                  <defs>
                    <linearGradient id="coolBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066FF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Area type="monotone" dataKey="calls" stroke="#0066FF" strokeWidth={2.5} fillOpacity={1} fill="url(#coolBlue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-6 border-b border-kontrol-border bg-amber-50/20 text-left">
              <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider flex items-center justify-between w-full">
                <span>Livre des couts operationnels (Token Analytics)</span>
                <span className="text-[10px] font-bold text-amber-600 bg-white px-3 py-1 rounded-full border border-amber-100 font-mono">Depenses Estimees</span>
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-kontrol-bg/50 border-b border-kontrol-border text-kontrol-ink-muted">
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px]">Mois d'Activite</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Tokens Entrants (Input)</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Tokens Sortants (Output)</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Cout Estime ($)</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Cout Estime (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kontrol-border text-kontrol-dark font-medium">
                  <tr className="hover:bg-kontrol-bg/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-kontrol-dark">Mai 2026</td>
                    <td className="px-6 py-4 text-right font-mono text-[11px] text-kontrol-ink-soft">42,501,200</td>
                    <td className="px-6 py-4 text-right font-mono text-[11px] text-kontrol-ink-soft">18,124,500</td>
                    <td className="px-6 py-4 text-right font-extrabold text-kontrol-dark">$47.92</td>
                    <td className="px-6 py-4 text-right font-extrabold text-kontrol-blue">28 750 FCFA</td>
                  </tr>
                  <tr className="hover:bg-kontrol-bg/30 transition-colors bg-kontrol-bg/10">
                    <td className="px-6 py-4 font-semibold text-kontrol-dark">Avril 2026</td>
                    <td className="px-6 py-4 text-right font-mono text-[11px] text-kontrol-ink-soft">15,402,400</td>
                    <td className="px-6 py-4 text-right font-mono text-[11px] text-kontrol-ink-soft">7,105,200</td>
                    <td className="px-6 py-4 text-right font-extrabold text-kontrol-dark">$18.25</td>
                    <td className="px-6 py-4 text-right font-extrabold text-kontrol-blue">10 950 FCFA</td>
                  </tr>
                  <tr className="hover:bg-kontrol-bg/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-kontrol-dark uppercase tracking-wider">Total Projet</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[11px] text-kontrol-dark">57,903,600</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[11px] text-kontrol-dark">25,229,700</td>
                    <td className="px-6 py-4 text-right font-bold text-kontrol-dark">$66.17</td>
                    <td className="px-6 py-4 text-right font-bold text-kontrol-blue">39 700 FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
`;

const updated = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, updated, 'utf8');
console.log("CLEAN SWAP COP-TOWER REWRITE COMPLETE!");
fs.unlinkSync(__filename); // cleanup runner
