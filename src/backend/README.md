# 🖥️ ENGIN BACKEND ET INTERFACE DE ROUTAGE SERVER-SIDE — SYSTEM KONTROL

---
### DOSSIER : `/src/backend`
**Statut du Module :** Architecture Serveur, Middlewares de Sécurité & Routage API  
**Rôle Principal :** Point de contrôle, proxy de communication LLM, traitement de requêtes FinTech & intégrations d'infrastructure  
**Moteur d'Exécution :** Node.js runtime unifié avec compilations hybrides CJS (`/dist/server.cjs`)  
**Gouvernance Intellectuelle :** Division R&D, Département d'Architecture Logicielle d'**Innov’Korp**

---

## 1. 🏛️ POSITIONNEMENT ET LOGIQUE ARCHITECTURALE
Dans la conception unifiée de la plateforme **KONTROL ERP**, le serveur agit comme le gardien et l'orchestrateur de confiance de toutes les actions logiques. Alors que l'écosystème frontal déploie une interface réactive et esthétique sur le navigateur de l'employé, tout appel impliquant des éléments confidentiels ou des règles de calcul strictes est délégué au serveur.

Le dossier `/src/backend` représente la structure modulaire réservée pour l'accueil futur des contrôleurs d'API découplés et middlewares rattachés. Le point d'entrée central du backend réside de manière native à la racine du projet sous le fichier d’exploitation `server.ts`.

---

## 2. 📁 PROCESSUS DE BOOTSTRAP, COMPILATION ET PRODUCTION

```
                                 [ server.ts ] (Source)
                                       │
                         ┌─────────────┴─────────────┐
                         ▼ (Développement)           ▼ (Build de Production)
                    [ tsx server.ts ]            [ esbuild Compilation ]
                         │                           │
          (Runtime direct TypeScript)                ▼
                         │                     [ dist/server.cjs ] (CJS Bundle)
                         │                           │
                         │                           ▼
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                       [ Éléments Internes du Serveur ]
                       - API /api/chat Proxy (BLUE AI)
                       - Webhooks de notification
                       - Routage statique des fichiers Vite SPA
                       - Serveur d'écoute PORT 3000
```

### 2.1 Mode Développement (`npm run dev`)
En cours de développement de la plateforme ERP, la commande d'activation s'appuie sur le moteur **tsx** (`tsx server.ts`). Ce chargeur moderne de modules TypeScript intercepte l'appel à chaud sans latence de boucle de compilation préalable et instancie le serveur.
*   **Vite Middleware Mode** : Durant cette étape, le serveur Express monte l'infrastructure logicielle de Vite directement en mémoire (`process.env.NODE_ENV !== "production"`). Toutes les actions et re-rendus des composants d'écrans du client ou validations de styles Tailwind sont orchestrés à la volée par le biais d'un port d'accès unifié.

### 2.2 Mode Production et Compilation Unifiée (`npm run build`)
Pour des raisons de performance d'exécution industrielle au sein de conteneurs isolés et de sûreté face aux anomalies classiques de chemins (path resolutions) de Node.js, Innov'Korp applique une routine de compression et compilation rigoureuse :
```bash
vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
```
Cette compilation se décompose ainsi :
1.  **Vite Asset Engine** : Transforme les fichiers de l'ensemble React 18 en pages statiques HTML/JS optimisées au sein de `/dist`.
2.  **Esbuild Micro-Bundle** : Analyse l'arborescence complète de `server.ts` et la rassemble en un **unique fichier autonome écrit en CommonJS : `dist/server.cjs`**.
    *   Le paramètre `--packages=external` indique au compilateur d'exclure les packages d'infrastructure natifs préinstallés au sein du conteneur (comme les dépendances de pilotes bases de données NoSQL), réduisant le poids et le temps de décompression de l'image de 80%.
    *   Le format CommonJS (`.cjs`) élimine les verrous d'importation ES Module et accélère la vitesse de démarrage à froid de la plateforme de manière spectaculaire lors de la mise en route des serveurs Cloud Run régionaux.
3.  **Lancement Restreint de Sécurité (`npm start`)** :
    ```json
    "start": "node dist/server.cjs"
    ```
    Plus aucun brique TypeScript n'est requis en phase de production. Le serveur exécute du JavaScript natif stable.

---

## 3. 🛡️ FILTRES DE SÉCURITÉ ET MIDDLEWARES DU SERVEUR

Le noyau du serveur implémente une matrice de sécurité robuste contre les attaques en ligne classiques :

### 3.1 Proxy Sémantique Isolé (Gemini API Server-Side Safeguard)
Sous la charte stricte d'ingénierie d'Innov'Korp, aucune clé d'identification API n'est tolérée sur le client Web. Le service **BLUE AI** passe exclusivement par le proxy du serveur central :
1. L'application Web transmet l'historique du dialogue vers le routeur serveur `/api/chat`.
2. Le serveur intercepte la demande, valide l'existence et l'intégrité de la session d'utilisateur actif.
3. Le serveur extrait de manière sécurisée la variable d'administration `process.env.GEMINI_API_KEY` (non visible sur le réseau).
4. Le serveur transmet la requête de calcul vers les clusters de calcul de Google, reçoit la synthèse, applique si nécessaire des filtres de sécurité linguistique, et retourne le flux final structuré au client d'application.

### 3.2 Contrôle d'Ingress de Réseau et Port Majeur
Par configuration matérielle et pour interdire tout contournement d'habilitation :
*   Le serveur se positionne de manière unique sur l'écoute du **Port 3000** et de l'interrupteur réseau `0.0.0.0`. Aucun autre port (comme 5173 ou 3001) n'est exposé à internet de façon extérieure.
*   L'ensemble du trafic d'arrivée est préalablement intercepté par l'équilibreur de charges (load-balancer) d'Innov’Korp qui décèle et neutralise les requêtes non conformes aux protocoles cryptographiques sécurisés TLS 1.3 de la plateforme.
