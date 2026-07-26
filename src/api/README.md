# 📡 COUCHE DE SERVICES ET D'API ENTIÈREMENT TYPÉE — LIAISON KONTROL ERP

---
### DOSSIER : `/src/api`
**Statut du Module :** Couche API Client, Libs Auxiliaires & Services d’Intégration Firebase  
**Rôle Principal :** Interfaçage unifié entre l'Interface (UI) React 18 et les couches de persistance NoSQL ou services externes de paiement  
**Gouvernance Intellectuelle :** Division R&D, Département d'Architecture Logicielle d'**Innov’Korp**

---

## 1. 🏛️ CADRE CONCEPTUEL D'ENTRÉE ET DU CYCLE DE VIE DES DONNÉES
L’écosystème **KONTROL ERP** s’exécute de façon fluide à travers un ensemble structuré de services divisés par pôles de compétences. Ce dossier `/src/api` concentre l'ensemble des règles de calcul, requêtes Firestore et routines d'échanges d'API. 

Chaque module métier de l'interface graphique ne dialogue jamais directement avec le SDK brut de Firebase. Elle s'appuie sur la couche d'abstraction typée de ce dossier, garantissant la sûreté des transactions, l'isolation multi-locataire (multi-tenant) et une résilience réseau optimale lors des micro-coupures d'internet.

---

## 2. 🗂️ CARTOGRAPHIE COMPLÈTE DU DOSSIER

```
/src/api
├── 📜 README.md                 -> Ce manuel technique d'explications et d'architecture
├── 📄 firebase.ts               - Point d'entrée, initialisation Firebase Auth & configuration globale
├── 📂 lib/                      -> Outils d'infrastructure de bas niveau
│   ├── api-client.ts            - Client HTTP de communication pour les requêtes vers le serveur Express
│   ├── blue-neural-brain.ts     - Routage local, formatage cognitif et orchestration de l'assistant virtuel
│   ├── crypto.ts                - Utilitaires de désensibilisation et hachages sécuritaires de calculs
│   └── firestore-errors.ts      - Conduite d'exceptions, traduction propre des échecs Firestore
└── 📂 services/                 -> Services métiers orientés cas d'usage (CRUD & Logiques)
    ├── baseFirestoreService.ts  - Abstraction parente outillée de vérifications multi-tenant
    ├── blueAIService.ts         - Routage et proxy vers les modèles LLM sécurisés de Blue AI
    ├── chargeService.ts         - Gestion opérationnelle des dépenses de la structure
    ├── dataResetService.ts      - Module d'administration assurant la purge propre des données de démonstration
    ├── emailService.ts          - Notifications par courriel lors des facturations tiers
    ├── financeService.ts        - Trésorerie globale, calculs de soldes de comptes et du bridge financier
    ├── notificationService.ts   - Hub unifié de gestion des alertes d'inventaires physiques et d'abonnements
    ├── productService.ts        - Abonnement temps réel au catalogue complet (souscriptions NoSQL triées par date de création, sans restriction de date du jour)
    ├── stockService.ts          - Enregistrement des flux d'entrées et de sorties physiques marchandises
    ├── tiersService.ts          - Annuaire des comptes de clients et de fournisseurs (CRMs)
    ├── transactionService.ts    - Soumission, lettrage, modification et annulation de facturations
    ├── userService.ts           - Pilotage des habilitations (RBAC), invitations, et de la sécurité des profils
    └── waveService.ts           - Automatisation des commandes via la passerelle d'abonnement Wave Business
```

---

## 3. 🛡️ ANALYSE DES BIBLIOTHÈQUES FONDATRICES (`/src/api/lib`)

### 3.1 Unification du Canal de Transport : `api-client.ts`
Fait office de client HTTP unilatéral. Il s'assure d'injecter de manière systématique l'identifiant JWT de l'opérateur connecté dans les en-têtes de requêtes (`Authorization: Bearer <Token>`) avant la transmission des ordres d'API vers le serveur Express (`/api/*`).

### 3.2 Orchestration Cognitive : `blue-neural-brain.ts`
Gère la structure d'arrière-plan de l’assistant virtuel **BLUE AI**. Il s'occupe de la mise en forme de l'historique de discussion, de l'élimination automatique des invites de commandes (prompts) malicieuses de type injection, et de l'intégration contextuelle des données financières consolidées de l'entreprise (soldes de comptes, retards constatés).

### 3.3 Protection et Résistance d'Accès : `crypto.ts`
Ce service implémente des logiques de chiffrement pour dissimuler les identités fiscales de clients sensibles lors des transferts réseau ou du stockage dans le cache local persisté du navigateur.

### 3.4 Conduite d'Exceptions : `firestore-errors.ts`
Isole le client des remontées d’erreurs techniques de base de données brutes souvent inintelligibles pour les utilisateurs finaux. Il intercepte les signaux Firestore de type `permission-denied` ou `unavailable` et les convertit en alertes explicites exploitables dans la langue de l’opérateur (via `i18next`).

---

## 4. ⚙️ SERVICES MÉTIERS MAJEURS ET SÉCURISATION DU RBAC

### 4.1 La Sûreté Étanche du Multi-Tenant : `baseFirestoreService.ts`
Afin de conjurer tout risque de fuite d’informations stratégiques entre des structures concurrentes partageant la même base NoSQL, le service de base `baseFirestoreService.ts` intègre de manière native des clauses de blocage :
*   Toute opération d'extraction (`get`, `query`) se lie de manière obligatoire à une clause `.where('ownerId', '==', currentCompanyId)` ou `.where('companyId', '==', currentCompanyId)`.
*   Même si l'opérateur tente de modifier l'adresse de son navigateur de manière frauduleuse pour cibler la référence d'un tiers ne figurant pas sur son périmètre d'action, le filtre intercepte l'appel en amont du réseau et révoque l'autorisation d'affichage.

### 4.2 L'Ajustement d'Habilitation : `userService.ts`
À la suite du récent audit de robustesse de KONTROL ERP, ce service supervise de façon restrictive les permissions d'accès logiques. 
*   **Protection Contre l’Escalade du Compte Test** : À l'identification de l'adresse de test `test-entreprise@kontrol.com`, l’utilitaire réécrit dynamiquement les variables de rôles pour interdire tout accès privilégié à la Control Tower globale, le cantonnant strictement au périmètre isolé de démonstration.
*   **Gestion RBAC Rapprochée** : Bloque l'attribution de privilèges hiérarchiques de type `ADMINISTRATEUR_KONTROL` si l'opérateur n'a pas été authentifié par le biais de l’identité unique certifiée d'administration de la plateforme (`test-admin@kontrol.com`).

### 4.3 Pilotage FinTech Wave : `waveService.ts`
Ce service gère la génération des intentions de renouvellement de licence et prend en charge le protocole de **Paiement et Validation Manuelle** :
1.  Il transmet les requêtes d'archivage des factures de règlements en mode `ATTENTE_VALIDATION` (ou `PENDING`).
2.  Il propose l'interface de saisie de l'identifiant Wave unique (`T-WAVE-xxxx`).
3.  Il expose l'interrupteur d'activation de la Control Tower à destination de l'administrateur système pour transformer l'état temporaire en licence confirmée `ACTIVE`.
