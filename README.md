# 🛡️ KONTROL ERP — Manuel de Sécurité, Robustesse et Spécifications Techniques

Bienvenue dans la documentation de référence et le rapport d'analyse technique de **KONTROL ERP**, une solution logicielle d'entreprise hautement sécurisée, modulaire et résiliente, conçue par **Innov'Korp**. 

Ce manuel fait office de document d'architecture, de rapport officiel d'audit de sécurité, d'explication de robustesse et de guide technique d'exploitation pour les administrateurs et les ingénieurs d'infrastructure.

---

## 📋 Table des Matières
1. [💎 Vision & Identité d'Entreprise](#-vision--identité-dentreprise)
2. [🏛️ Architecture Applicative & Flux de Données](#%EF%B8%8F-architecture-applicative--flux-de-données)
3. [🛡️ Rapport Complet d'Audit de Sécurité](#%EF%B8%8F-rapport-complet-daudit-de-sécurité)
4. [🦾 Résilience & Robustesse du Code Source](#-résilience--robustesse-du-code-source)
5. [📦 Spécifications de la Base de Données & Schémas Firestore](#-spécifications-de-la-base-de-données--schémas-firestore)
6. [💳 Intégration FinTech : Passerelle Wave Business](#-intégration-fintech--passerelle-wave-business)
7. [🧠 Intelligence Artificielle Virtuelle : BLUE AI](#-intelligence-artificielle-virtuelle--blue-ai)
8. [🖨️ Générateur Professionnel de Certificat d'Éligibilité (PDF)](#%EF%B8%8F-générateur-professionnel-de-certificat-déligibilité-pdf)
9. [🌍 Internationalisation & Pipeline de Traduction (i18n)](#-internationalisation--pipeline-de-traduction-i18n)
10. [🚀 Guide de Déploiement et d'Exploitation](#-guide-de-déploiement-et-dexploitation)
11. [📈 Conclusion d'Ingénierie & Recommandations d'Évolution](#-conclusion-dingénierie--recommandations-dévolution)

---

## 💎 Vision & Identité d'Entreprise

**KONTROL** est le système d'exploitation par excellence des entreprises de taille intermédiaire (ETI) et des PME à forte croissance. Porté par l'exigence technologique d'**Innov'Korp**, KONTROL résout le défi de la fragmentation des données financières et opérationnelles. 

### Objectifs Majeurs du Produit
*   **Élimination de la Latence Décisionnelle** : Grâce au suivi en direct des transactions financières, des stocks physiques et des mouvements de trésorerie.
*   **Contrôle Réparti Sans Faille** : Gestion stricte des droits d'accès basée sur le rôle (RBAC) pour s'assurer que les directeurs de filiales, gestionnaires de stocks et comptables ne manipulent que les ressources qui leur incombent.
*   **Intégration d'IA Native non Intrusive** : L'assistant **BLUE AI** agit comme un copilote pour guider la gestion stratégique, l'optimisation des approvisionnements et l'analyse préventive des goulets d'étranglement de liquidités.

---

## 🏛️ Architecture Applicative & Flux de Données

Le système KONTROL utilise une architecture **Full-Stack unifiée (Express + Vite + React 18)** compilée en modules standard Node.js (ES Module & CommonJS).

```
┌─────────────────────────────────────────────────────────────────┐
│                      NAVIGATEUR DU CLIENT (CLIENT UI)           │
│  - React 18 (Vite SPA)                                          │
│  - Tailwind CSS & Lucide Icons                                  │
│  - Internationalisation Native via i18next                      │
│  - Moteur d'Animation Motion (Framer Motion)                    │
└────────────────────────────────┬────────────────└───────────────┘
                                 │                 ▲
                  Requêtes REST / Webhooks         │ Réponses JSON
                                 ▼                 │
┌─────────────────────────────────────────────────────────────────┐
│                    SERVEUR D'APPLICATION (EXPRESS)              │
│  - Node.js (Compilation unifiée esbuild en dist/server.cjs)     │
│  - Routage Strict /api/                                         │
│  - Proxy sécurisé vers les API tierces (Wave Mobile Money)      │
│  - Intégration Firebase Admin SDK ou SQLite locales             │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                    Persistance / Sécurité Native
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUD FIRESTORE & FIREBASE                  │
│  - Regles de securite isolees (firestore.rules)                 │
│  - Chiffrement natif au repos et en transit (TLS 1.3)           │
└─────────────────────────────────────────────────────────────────┘
```

### Le Processus de Build Unifié
Pour s'assurer d'une performance optimale en production et éviter les écueils liés aux résolutions complexes de chemins sous Node.js, KONTROL intègre un script de packaging complet :
1.  **Phase Frontend** : `vite build` compile les composants React en fichiers hautement compressés dans `/dist/`.
2.  **Phase Backend** : `esbuild server.ts --bundle --platform=node` génère un fichier autonome `/dist/server.cjs` en injectant ses importations relatives tout en maintenant les dépendances externes lourdes (natives) via le flag de sécurité `--packages=external`.
3.  **Démarrage** : Exécuté proprement à l'aide de `node dist/server.cjs` garantissant un démarrage à froid instantané sur les conteneurs Cloud Run.

---

## 🛡️ Rapport Complet d'Audit de Sécurité

La sécurité n'est pas une surcouche de peinture ; c'est le squelette sur lequel repose KONTROL ERP. Cette section analyse et valide l'architecture de protection de la plateforme.

### 1. Contrôle d'Accès Basé sur les Rôles (RBAC)
KONTROL sépare strictement les privilèges à deux niveaux : le macro-niveau ERP (KONTROL Global) et le micro-niveau Entreprise (Locataire/Client).

| Rôle | Niveau de Permissions | Restrictions Principales |
| :--- | :--- | :--- |
| **ADMINISTRATEUR_ERP** | Global / Super-utilisateur | Accès total à la console Control Tower, statistiques de la plateforme, gestion des locataires. |
| **GESTIONNAIRE_ERP** | Global / Support | Consultation de télémétrie, aide aux locataires, blocage manuel de comptes suspects. |
| **ADMINISTRATEUR_ENTREPRISE** | Locataire (Entreprise) | Accès total au profil entreprise, invites utilisateurs, validation d'abonnements via Wave, suppression de mouvements. |
| **GESTIONNAIRE_ENTREPRISE** | Locataire (Entreprise) | Saisie de transactions, mouvements financiers, édition de produits, pas de modification d'abonnements. |
| **UTILISATEUR** | Locataire (Entreprise) | Visualisation des données courantes du tableau de bord d'entreprise, pas de suppression ni de création critique. |

### 2. Sécurisation Cristalline du Compte Test
Suite aux demandes de l'équipe de gouvernance de **KONTROL**, une faille d'accès liée au compte `test-entreprise@kontrol.com` a été décelée et résolue chirurgicalement.
*   **Problématique** : Le compte de démonstration d'entreprise avait été accidentellement promu aux privilèges d'administration système ERP dans certains scripts de test.
*   **Résolution dans le Backend (`/src/api/firebase.ts`)** : Retrait formel de l'adresse de la fonction `isAdminEmail` et application d'un démonstrateur dynamique qui dégrade instantanément son profil vers un niveau de restriction de type `ADMINISTRATEUR_ENTREPRISE` (limité à son propre espace entreprise virtuel).
*   **Résolution dans la Base de Données (`/firestore.rules`)** : Retrait formel de l'adresse du groupe d'administration globale `isKontrolAdmin()`. Plus aucune requête de ce compte ne peut contourner la vérification d'espace locataire.

### 3. Les Règles de Sécurité Firestore (`firestore.rules`) : Analyse Ligne par Ligne
Les règlements de sécurité Firestore de KONTROL reposent sur le paradigme du **"Default Deny Everything"** (Refus par défaut).

```javascript
match /{document=**} {
  allow read, write: if false;
}
```
Ce filet de sécurité de niveau 0 garantit que si une nouvelle collection de base de données est créée à l'avenir sans règle explicite, elle sera hermétiquement close aux yeux des attaquants du web.

#### Sécurité de la Collection `/users`
```javascript
match /users/{userId} {
  allow get: if isSignedIn() && (request.auth.uid == userId || isKontrolAdmin());
  allow list: if isSignedIn() && (isKontrolAdmin() || resource.data.companyId == getUserField('companyId', ''));
  allow create: if isSignedIn() && request.auth.uid == userId;
  allow update: if isSignedIn() && (request.auth.uid == userId || isKontrolAdmin()) && 
                (request.resource.data.role == resource.data.role || isKontrolAdmin()); // Empêche l'auto-promotion de rôle
}
```
*Analyse des garanties* : Un utilisateur ne peut pas lire le profil d'un autre utilisateur, sauf s'ils appartiennent à la **même entreprise** ou s'il s'agit d'un administrateur KONTROL. L'auto-promotion de rôle (par exemple, s'attribuer le rôle de super-admin par requête HTTP directe) est structurellement impossible.

#### Sécurité de la Collection `/transactions`
```javascript
match /transactions/{transId} {
  allow read: if isSignedIn() && (belongsToCompany(resource.data.ownerId) || isKontrolAdmin());
  allow create: if isSignedIn() && belongsToCompany(incoming().ownerId) && isValidTransaction(incoming());
  allow update: if isSignedIn() && belongsToCompany(existing().ownerId) && belongsToCompany(incoming().ownerId);
  allow delete: if isSignedIn() && (isCompanyAdmin(existing().ownerId) || isKontrolAdmin());
}
```
*Analyse des garanties* :
1.  **Cloisonnement Multi-Locataire (Multi-tenant isolation)** : On ne peut lire ou écrire que des transactions appartenant à sa propre entreprise (`belongsToCompany(ownerId)`).
2.  **Intégrité Strictement Typée** : La fonction `isValidTransaction` vérifie que les montants sont numériques, que les statuts correspondent strictement aux enums (`PAYE`, `ATTENTE`, `ANNULE`), et que la date d'enregistrement ou sa création possède le type timestamp.
3.  **Destruction Contrôlée** : Seuls les administrateurs de l'entreprise ou de l'ERP ont la capacité matérielle de supprimer une transaction. Elle est protégée contre les erreurs de manipulation des agents subalternes.

---

## 🦾 Résilience & Robustesse du Code Source

Pour être qualifié de "robuste", le logiciel doit fonctionner sans planter dans des conditions de réseaux instables ou d'erreurs de liaisons Firestore. KONTROL ERP met en œuvre plusieurs techniques de tolérance globale aux pannes.

### 1. Gestion Systématique des Erreurs Firestore (L'Adapter de Sécurité)
Au lieu d'appeler directement les API brutes Firestore de Firebase dans l'ensemble des modules UI (ce qui causerait des crashs d'affichage non interceptés si une restriction de règles est levée), KONTROL intègre un adaptateur de gestion d'erreur applicatif unifié.

Lorsqu'une exception de type `PERMISSION_DENIED` ou `UNAVAILABLE` est détectée :
1.  Elle est interceptée au niveau de l'appel d'API.
2.  Un message clair et humanisé est généré et envoyé à l'interface via des alertes Web (non perturbatrices).
3.  L'état de l'application revient à sa dernière configuration stable au lieu de geler ou d'afficher une page blanche.

### 2. Élimination des Re-Rendus Infinis dans React (Performance & Économie d'Énergie)
Conformément aux directives de performance d'ingénierie d'**Innov'Korp**, toutes les déclarations de crochets d'effets (`useEffect`) ont été auditées pour neutraliser les boucles de re-rendus infinis :
*   Les objets ou structures de données complexes en dépendances ont été sérialisés en chaînes primitives de caractères (`string`, `number`, `boolean`) ou stabilisés en dehors des composants de rendu.
*   Les abonnements temps réel Firestore (`onSnapshot`) sont **immédiatement déconnectés** lorsque l'utilisateur quitte le module sous-jacent, libérant de manière proactive la mémoire vive et réduisant le coût facturable de connexion client.

---

## 📦 Spécifications de la Base de Données & Schémas Firestore

Firestore est une base de données NoSQL orientée documents. Les données de KONTROL sont structurées selon un modèle rigide afin de préserver l'intégrité transactionnelle tout au long des modules applicatifs.

### Collection : `/users`
La table d'identité de tous les collaborateurs inscrits sur la plateforme.

```js
{
  "uid": "USER_UNIQUE_ID_007",
  "email": "collaborateur@kontrol-client.ci",
  "displayName": "Amadou Traore",
  "role": "GESTIONNAIRE_ENTREPRISE", // ADMINISTRATEUR_ERP | GESTIONNAIRE_ENTREPRISE etc.
  "companyId": "COMP-9281-CI",
  "companyName": "Traore S.A.D.",
  "isProfileComplete": true,
  "active": true,
  "createdAt": Timestamp(1716283592000),
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndDate": 1747819592000
}
```

### Collection : `/companies`
Indique la fiche d'identité des entreprises clientes (les locataires) gérant leurs ressources sur KONTROL.

```js
{
  "id": "COMP-9281-CI",
  "name": "Traore S.A.D.",
  "industry": "Import-Export Logistique",
  "logoUrl": "https://firebasestorage.googleapis.com/.../logo.png",
  "fiscalAddress": "Bld de la Republique, Abidjan, Cote d'Ivoire",
  "capital": 15000000,
  "createdAt": Timestamp(1710000000000)
}
```

### Collection : `/transactions`
La collection de données critiques d'achats ou de ventes de biens ou services.

```js
{
  "reference": "TR-481977",
  "date": 1716283592000,
  "ownerId": "COMP-9281-CI",
  "tiersId": "TIERS-993",
  "tiersNom": "Fournisseur AgroMax",
  "type": "ACHAT", // ACHAT | VENTE
  "modePaiement": "Wave Business", // Wave Business | Especes | Virement
  "devise": "XOF",
  "tauxChange": 1,
  "montantTotal": 450000,
  "statut": "PAYE", // PAYE | ATTENTE | ANNULE
  "articles": [
    {
      "produitId": "PROD-201",
      "designation": "Engrais Azote Bio-10kg",
      "quantite": 30,
      "prixUnitaire": 15000,
      "total": 450000
    }
  ]
}
```

### Collection : `/payments` (La Trésorerie en Direct)
Table des encaissements et décaissements de flux monétaires purs de l'entreprise.

```js
{
  "date": 1716283620000,
  "ownerId": "COMP-9281-CI",
  "montant": 450000,
  "type": "DECAISSEMENT", // ENCAISSEMENT | DECAISSEMENT
  "modePaiement": "Wave Business",
  "tiersId": "TIERS-993",
  "tiersNom": "Fournisseur AgroMax",
  "description": "Reglement integral facture AgroMax #481977",
  "createdAt": 1716283625000
}
```

### Collection : `/produits` (Les Stocks)
Comptabilise l'ensemble des marchandises ou matières de l'entreprise.

```js
{
  "id": "PROD-201",
  "reference": "REF-AZ-10KG",
  "designation": "Engrais Azote Bio-10kg",
  "buyPrice": 10000,
  "sellPrice": 15000,
  "stock": 124, // Alerte automatique si stock < min
  "ownerId": "COMP-9281-CI",
  "createdAt": 1710000000000
}
```

---

## 💳 Intégration FinTech : Passerelle Wave Business

Conformément à la dernière reconfiguration de la pile de services financiers de KONTROL ERP, la plateforme a migré ses passerelles de transactions de renouvellement de licence et de paiement opérationnel vers **Wave Business**.

### L'Écosystème de Paiement Wave
*   **Fin de l'Intégration Paystack** : Paystack a été supprimé afin d'optimiser l'expérience utilisateur et d'éviter les frais trop importants d'intermédiation en Afrique de l'Ouest.
*   **Intégration Directe** : L'interface intègre désormais la redirection de paiement mobile via l'adresse de survol de paiement instantanée de Wave.
*   **Le Processus Automatisé** :
    1.  Lors de l'achat d'un abonnement standard ou de la création d'un paiement en direct, le bouton d'initiation Wave contacte l'API proxy `/api/wave/checkout`.
    2.  Cette route sécurisée génère un lien de redirection crypté unique `checkout_url`.
    3.  L'utilisateur procède au paiement dans son application mobile Wave Business et réinjecte la référence de transaction.
    4.  L'administrateur KONTROL valide le flux, assurant une continuité de services sans temps mort.

---

## 🧠 Intelligence Artificielle Virtuelle : BLUE AI

Sous la direction technique d'**Innov'Korp**, le chatbot d'assistance stratégique a subi un affinement de son identité visuelle et textuelle.

```
       🛡️ BLUE AI - L'ASSISTANT VIRTUEL INTELLIGENT 🛡️
                 [Statut: Assistant virtuel]
 
  "Comment puis-je vous aider à maximiser votre flux de 
   trésorerie ou à anticiper la commande de vos matières ?"
```

### Affinement de l'Interface de Chatbot
*   **Changement d'Identité** : Le titre "Blue AI Intelligence" a été épuré pour devenir simplement **BLUE AI**, une désignation sobre et impactante.
*   **Humanisation du Statut** : L'apprivoisement et la description de statut ont été changés de "Cerveau Actif" à l'appellation beaucoup plus humble et utile d'**Assistant virtuel**.
*   **Sécurisation de la Clé API** : La clé d'interfaçage Gemini API reste exclusivement gérée par le serveur backend Express (via `process.env.GEMINI_API_KEY`). Aucune signature de clé ou d'envoi d'URL API Gemini brut n'est visible depuis la console Développeur du Chrome ou Safari du visiteur.

---

## 🖨️ Générateur Professionnel de Certificat d'Éligibilité (PDF)

Une fonctionnalité haut de gamme a été développée au sein du module **Trésorerie/Finance**. Lors de la simulation prévisionnelle d'éligibilité aux financements courts de types de découverts interbancaires, l'utilisateur a accès au bouton de génération de certificat officiel.

### Spécifications Visual-Craft du Document PDF Émis
Généré de manière purement asynchrone à l'aide de la bibliothèque `jsPDF`, le document est conçu pour présenter une mise en forme impeccable digne d'un acte officiel d'une institution financière :
*   **Double Cadre Vectoriel** : Un premier cadre sombre Slate-900 (épaisseur de 1.5mm) ceinturé par un second cadre de finesse Blue-600 à haute densité.
*   **Bandeau d'En-Tête Épuré (Slate-900)** : Logo et désignation textuelle en lettrage blanc et argenté de la police Helvetica Bold.
*   **Typographie Rythmée** : Pairings soignés de tailles de caractères et d'espacements négatifs de bloc pour guider la lecture (Titre de certificat, nom d'entreprise centré à fort contraste, description d'audit détaillée, boîte de données).
*   **Panneau d'Éligibilité Rendu par Coordonnées Fixes** : Un carton de couleur grise d'arrière-plan intégrant un indicateur de montant en bleu cyan proéminent affichant le montant exact éligible au financement, flanqué de l'avertissement de taux préférentiel (3.5% annuel garanti).
*   **Double Pavé de Signatures** : Directions des Risques et Comité d'algorithmes de KONTROL avec date et heure précises d'émission.
*   **Filigrane de Sceau Officiel de Protection de l'Intégrité des Données** : Dessiné par coordonnées géométriques (cercle de sceau KONTROL).
*   **Identifiant Code Hash Translucide** : Pour traquer et répertorier l'acte d'émission, prévenant ainsi les fraudes de faux documents.

---

## 🌍 Internationalisation & Pipeline de Traduction (i18n)

KONTROL ERP intègre un pipeline multilingue transparent géré par `i18next`. Cela permet un basculement instantané de l'interface en français et en anglais sans perte de fluidité.

### Structuration des Fichiers de Traduction
Pour résoudre l'erreur récurrente `"common.status returned an object instead of string"`, qui se propageait sur les exports PDF et les modules de listes, les structures de fichiers `fr.json` et `en.json` ont été harmonisées :
1.  **L'Objet `common.status`** : Conserve sa structure de sous-clés (`common.status.active`, `common.status.paid`, etc.) car il sert à traduire les états réels des entités stockées en base de données.
2.  **Introduction de `common.status_label`** : Une clé autonome renvoyant la chaîne simple `"Statut"` (fr) / `"Status"` (en), utilisée pour le rendu des en-têtes de colonnes de tableaux d'affichage et l'impression des documents d'export PDF unifiés.
3.  **Introduction de `common.ref`, `common.type`, `common.description`, `finance.table.party`** : Garantit une résolution sans faille des en-têtes sans valeurs d'erreur ou de texte brut dans l'interface ou les rapports émis.

---

## 🚀 Guide de Déploiement et d'Exploitation

### Prérequis Systèmes
L'application requiert un environnement d'exécution Node.js égal ou supérieur à la version **v18.0.0**.

### 1. Variables d'Environnement (Fichier `.env`)
Créer un fichier `.env` à la racine de votre répertoire de production en vous basant sur `.env.example`.
```env
# Clé d'API du service d'intelligence BLUE AI (Obligatoire, maintenue coté serveur)
GEMINI_API_KEY=votre_cle_secrete_gemini_api_ici

# Paramètres de Connexion Wave Mobile Money (Proxy FinTech)
WAVE_BUSINESS_API_KEY=votre_cle_secrete_wave_ici
```

### 2. Procédure d'Installation & Lancement Local
```bash
# 1. Cloner et se positionner dans le répertoire racine
cd kontrol-erp/

# 2. Installer les packages du package.json de manière sécurisée
npm install

# 3. Compiler l'interface front-end et le package serveur unifié
npm run build

# 4. Exécuter le serveur de test de développement local
npm run dev
```

### 3. Déploiement vers Google Cloud Run (Container Cloud Native)
KONTROL ERP est conçu pour s'exécuter dans un conteneur Cloud Run sans état (stateless) géré à l'intérieur du port par défaut `3000`.

```bash
# Compiler l'image Docker de production intégrée
gcloud builds submit --tag gcr.io/votre-projet-id/kontrol-erp:v3.0

# Déployer vers Cloud Run avec accès public sur port 3000
gcloud run deploy kontrol-erp \
  --image gcr.io/votre-projet-id/kontrol-erp:v3.0 \
  --platform managed \
  --port 3000 \
  --allow-unauthenticated
```

---

## 📈 Conclusion d'Ingénierie & Recommandations d'Évolution

KONTROL ERP atteint un niveau de maturité technique robuste grâce à :
*   Le nettoyage ciblé du compte `test-entreprise@kontrol.com` des instances globales, écartant le risque de contournement d'Espace Locataire.
*   L'unification des en-têtes multilingues et la suppression définitive des alertes de retour d'objet `common.status` sur l'ensemble de l'interface et des générateurs d'exports.
*   La centralisation des calculs d'audit de trésorerie avec émission de certificats haute fidélité pour simplifier l'accès au crédit.
*   Le déplacement intelligent du bouton "Flux de trésorerie" vers sa page naturelle (Trésorerie/Finance) pour un parcours utilisateur optimal et cohérent.

### Road-Map Technologique Recommandée pour v4.0
1.  **Chiffrement de Bout en Bout des Fichiers Facture** : L'utilisation d'une double enveloppe asymétrique clés publiques/clés privées sur le dossier de stockage Firestore Storage pour interdire la lecture des factures jointes même en cas de prise de contrôle d'identifiant.
2.  **Mise en Cache Redis pour les Données de Contrôle de Stock** : Afin d'éviter les surcoûts d'accès à Firestore sur les transactions de stocks volumineuses pendant les heures de pointe commerciales.

---
© 2026 **Innov'Korp** — Système KONTROL ERP. Tous droits réservés.
