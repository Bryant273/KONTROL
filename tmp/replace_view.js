const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/frontend/modules/admin/ControlTower.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// We find the index of '  return (\n    <motion.div \n      initial={{ opacity: 0, x: 20 }}' which is the start of the return statement of IntelligenceAIView
const startToken = '  return (\n    <motion.div \n      initial={{ opacity: 0, x: 20 }}';
const startIndex = content.indexOf(startToken);

if (startIndex === -1) {
  console.error("Could not find start token!");
  process.exit(1);
}

// Now we find the end token, which is the system stats telemetry or the end of the return statement
// We look for where AnimatePresence ends and the function closes just before SystemTelemetryView
const endToken = '          </motion.div>\n        )}\n      </AnimatePresence>\n    </motion.div>\n  );\n}';
const endIndex = content.indexOf(endToken, startIndex);

if (endIndex === -1) {
  console.error("Could not find end token!");
  process.exit(1);
}

const replacement = `  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* Header and Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-kontrol-border shadow-sm">
        <div>
          <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight flex items-center gap-2">
            <Brain className="text-kontrol-blue" size={24} />
            Blue AI Studio & Command Center
          </h3>
          <p className="text-xs text-kontrol-ink-muted font-bold uppercase tracking-wider mt-1">
            Supervisez le Noyau d'Intelligence Artificielle, optimisez les prompts et suivez les métriques RAG
          </p>
        </div>

        {/* Dashboard Tabs */}
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
            Paramètres RAG
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
            Trafic & Coûts
          </button>
        </div>
      </div>

      {activeTab === 'prompt' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-kontrol-border bg-kontrol-bg/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider">Invite Système Principale (System Instructions)</h4>
                  <p className="text-[10px] text-kontrol-ink-muted mt-0.5">Définit le rôle, le cadre d'analyse fiduciaire et le comportement cognitif de Blue AI.</p>
                </div>
                <span className="text-[9px] font-extrabold bg-blue-50 text-kontrol-blue px-2 py-1 rounded border border-blue-100 uppercase">
                  Version Active
                </span>
              </div>
              <div className="p-6 bg-kontrol-dark/95 text-white/90 font-mono text-xs leading-relaxed relative">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-64 bg-transparent outline-none resize-none overflow-y-auto border-none p-0 focus:ring-0 placeholder-white/30 text-[11px]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
                <div className="absolute bottom-3 right-3 text-[9px] text-white/40 font-bold uppercase">
                  {systemPrompt.length} Caractères
                </div>
              </div>
              <div className="p-4 border-t border-kontrol-border flex items-center justify-between bg-kontrol-bg/10">
                <p className="text-[10px] text-kontrol-ink-soft italic">
                  Les modifications sont injectées à chaud dans les sessions utilisateurs en cours de chat.
                </p>
                <button 
                  onClick={() => toast.success("Directives de prompt sauvegardées et appliquées !")}
                  className="px-5 py-2.5 bg-kontrol-blue text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-kontrol-blue/10"
                >
                  Sauvegarder et Appliquer
                </button>
              </div>
            </div>

            {/* Prompt Helper Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-kontrol-border rounded-3xl space-y-2">
                <h5 className="text-xs font-black text-kontrol-dark uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Garde-fous d'Accès de Sécurité
                </h5>
                <p className="text-[11px] text-kontrol-ink-soft leading-relaxed">
                  Blue AI ignore et rejette systématiquement les tentatives d'injection d'instructions tierces (prompt injection). Les requêtes sont filtrées par tenantId au niveau de la passerelle RAG d'API.
                </p>
              </div>
              <div className="p-5 bg-white border border-kontrol-border rounded-3xl space-y-2">
                <h5 className="text-xs font-black text-kontrol-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" />
                  Auto-grounding des écritures
                </h5>
                <p className="text-[11px] text-kontrol-ink-soft leading-relaxed">
                  Toute réponse impliquant une devise ou un solde inter-comptabilité est automatiquement indexée par rapport aux transactions vérifiables présentes dans les stocks et journaux de vente.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 space-y-6">
              <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-kontrol-ink-soft" />
                Hyperparamètres du Modèle
              </h4>

              {/* Model Choice list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">Modèle Majeur Actif</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Performance optimale, vitesse ultra-rapide' },
                    { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro', desc: 'Raisonnement fiduciaire et audits complexes' },
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Compatibilité historique optimisée' }
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

              {/* Configuration sliders */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-kontrol-ink-muted">
                    <span>Température (Créativité)</span>
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
                    <span>Précis & Déterministe</span>
                    <span>Créatif & Fluide</span>
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
          {/* Diagnostic Console panel */}
          <div className="lg:col-span-5 card p-6 space-y-4 flex flex-col h-[520px]">
            <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-3 flex items-center justify-between">
              <span>Bac à sable d'Inférence</span>
              <span className="text-[8px] font-bold font-mono text-kontrol-ink-muted bg-kontrol-bg px-2 py-0.5 rounded border border-kontrol-border uppercase">
                {selectedModel}
              </span>
            </h4>

            {/* Simulation Query input */}
            <div className="space-y-1.5 flex-1 flex flex-col w-full">
              <label className="text-[9px] font-bold text-kontrol-ink-muted uppercase tracking-wider text-left block w-full">Saisissez une requête d'analyse à simuler</label>
              <textarea
                value={playgroundInput}
                onChange={(e) => setPlaygroundInput(e.target.value)}
                placeholder="Exemple: Analyse nos ventes de l'année et dégage la tendance majeure..."
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
                  <Loader2 size={14} className="animate-spin" /> Inférence en Cours...
                </>
              ) : (
                <>
                  <Play size={14} /> Lancer le Diagnostics cognitif
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-6 flex flex-col h-[520px]">
            {/* Terminal Pipeline Streams Output */}
            <div className="flex-1 bg-kontrol-dark rounded-[2rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <span className="text-[9px] font-extrabold tracking-widest text-white/50 uppercase">LOGS DE PIPELINE RAG + LLM</span>
                <span className={\`w-2 h-2 rounded-full \${isSimulating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}\`} />
              </div>
              <div className="p-6 font-mono text-[10px] text-white/95 leading-relaxed overflow-y-auto flex-1 space-y-1 bg-black/30 scrollbar-none text-left">
                {playgroundLogs.length === 0 ? (
                  <p className="text-white/30 italic">Le terminal est vide. Lancez une simulation pour observer la gateway d'API sémantique.</p>
                ) : (
                  playgroundLogs.map((log, idx) => (
                    <div key={idx} className="border-l-2 border-kontrol-blue/50 pl-2 text-white/80 animate-in fade-in duration-200">
                      {log}
                    </div>
                  ))
                )}
                {isSimulating && (
                  <div className="flex items-center gap-1.5 text-kontrol-blue animate-pulse pl-2 font-bold">
                    <span>$</span> <span className="animate-ping">_</span>
                  </div>
                )}
              </div>
            </div>

            {/* Answer display box */}
            <div className="h-[200px] bg-white border border-kontrol-border rounded-[2rem] p-6 overflow-y-auto flex flex-col shadow-sm text-left">
              <span className="text-[9px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest block mb-1">Résultat D'Inférence Cognitive (markdown)</span>
              <div className="text-xs text-kontrol-dark leading-relaxed font-sans flex-1 whitespace-pre-wrap">
                {simulationResponse || (
                  <span className="text-kontrol-ink-muted italic">La réponse s'affichera ici en streaming au fur et à mesure que l'inference s'exécute...</span>
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

            {/* Chunk & Overlap configuration options */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider block text-left">Modèle d'embedding</label>
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
                    <RefreshCw size={13} /> Forcer la Réindexation Complète
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RAG statistics cockpit */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="card p-6 border-l-4 border-l-kontrol-blue text-left">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-1">Total Fragments Vectorisés</p>
                <h4 className="text-2xl font-black text-kontrol-dark">1 420</h4>
                <span className="text-[9px] font-bold text-emerald-500 uppercase mt-2 block">Chunks RAG Vector Store</span>
              </div>
              <div className="card p-6 border-l-4 border-l-purple-500 text-left">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-1">Invariants SQL Catalogués</p>
                <h4 className="text-2xl font-black text-kontrol-dark">5 120</h4>
                <span className="text-[9px] font-bold text-emerald-500 uppercase mt-2 block">Lignes relationnelles RAG</span>
              </div>
              <div className="card p-6 border-l-4 border-l-amber-500 text-left">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-wider mb-1">Latence Sémantique</p>
                <h4 className="text-2xl font-black text-kontrol-dark">45 ms</h4>
                <span className="text-[9px] font-bold text-kontrol-blue uppercase mt-2 block">Vertex Embeddings</span>
              </div>
            </div>

            {/* Indexing terminal logs */}
            <div className="bg-kontrol-dark rounded-[2rem] p-6 text-white h-[260px] flex flex-col overflow-hidden border border-white/10 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 bg-white/5 p-4 rounded-xl">
                <h5 className="text-[10px] font-black tracking-widest text-white/50 uppercase">Statut d'Indexation RAG en Direct</h5>
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
          {/* Traffic stats block */}
          <div className="card p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider border-b border-kontrol-border pb-3 flex items-center justify-between">
              <span>Appels Cognitifs Globaux (Inférences / jour)</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full">Intégrité Fast Gateway</span>
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

          {/* Running costs metrics table */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-kontrol-border bg-amber-50/20 text-left">
              <h4 className="text-xs font-extrabold text-kontrol-dark uppercase tracking-wider flex items-center justify-between w-full">
                <span>Livre des coûts opérationnels (Token Analytics)</span>
                <span className="text-[10px] font-bold text-amber-600 bg-white px-3 py-1 rounded-full border border-amber-100">Dépenses Estimées</span>
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-kontrol-bg/50 border-b border-kontrol-border text-kontrol-ink-muted">
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px]">Mois d'Activité</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Tokens Entrants (Input)</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Tokens Sortants (Output)</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Coût Estimé ($)</th>
                    <th className="px-6 py-4 font-extrabold uppercase tracking-widest text-[9px] text-right">Coût Estimé (FCFA)</th>
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

const updated = content.substring(0, startIndex) + replacement + content.substring(endIndex + endToken.length);
fs.writeFileSync(filePath, updated, 'utf8');
console.log("SUCCESSFULLY COMPLETED REPLACEMENT!");
