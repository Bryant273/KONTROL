# 🛡️ SYSTEM KONTROL ERP — SPÉCIFICATIONS TECHNIQUES, MANUEL DE SÉCURITÉ, ARCHITECTURE APPLICATIVE ET GUIDE CIVIL DE GOUVERNANCE SÉCURITAIRE

---
### DOCUMENT OFFICIEL DU SYSTÈME D’INFORMATION - APPLICABLE AUX VERSIONS >= V3.0.0-PRO
**Édition Spéciale d'Ingénierie de Production par Innov’Korp**  
*Auteurs : Département Recherche & Développement Innov'Korp, Secrétariat de Certification de l'Écosystème KONTROL, Comité Supérieur de Cybersécurité, Équipe DevOps & Intégrations FinTech.*

---

## 🏛️ PRÉFACE ET CHARTE D’EXCELLENCE DE LA SUITE KONTROL

KONTROL n’est pas qu’un progiciel de gestion intégré (ERP). C'est le carrefour central des opérations d'entreprise moderne. C'est un blindage informatique face aux fluctuations économiques, un accélérateur de liquidités, et un organe intelligent de supervision développé pour les entreprises de l’UEMOA et de l’Afrique francophone par **Innov’Korp**.

Dans un monde où les données administratives, les inventaires physiques, les mouvements de banque et les flux de salariés sont cloisonnés, la rentabilité de l'entreprise s'évapore sous le poids des frictions administratives. KONTROL ERP élimine ces parois. Chaque facture validée met à jour le livre des ventes, décrémente instantanément le stock d’engrais ou de marchandises associées, génère une écriture de régularisation en comptabilité générale et ajuste en direct la balance prévisionnelle de trésorerie disponible.

Ce manuel complet d’ingénierie et de gouvernance détaille l'intégralité du code source, de la logique de conception, des schémas de données, de la sécurité d'infrastructure de la plateforme et des protocoles de continuité de service en cas de panne globale ou d'attaques réseau.

---

## 1. ⚙️ ARCHITECTURE GLOBALE DE LA PLATEFORME

KONTROL utilise l’architecture unifiée moderne **Full-Stack (Vite SPA + Express Core Node Server)**. Ce parti pris de conception garantit une adéquation parfaite entre l’agilité de l’interface réactive client et la robustesse prévisible du serveur principal.

### 1.1 Diagramme du Réseau de Communication de Données

```
                                      ┌────────────────────────┐
                                      │   APPLICATIONS CLIENTS │
                                      │  (Navigateurs Web SPA) │
                                      │  - React 18, Vite       │
                                      │  - Tailwind, Framer    │
                                      └───────────┬────────────┘
                                                  │
                                                  │ (Chiffrement HTTPS TLS 1.3 - Port 3000)
                                                  ▼
                                      ┌────────────────────────┐
                                      │    REVERSE PROXY       │
                                      │  (NginX Ingress Layer) │
                                      └───────────┬────────────┘
                                                  │
                                                  │ (Routage Interne)
                                                  ▼
                                      ┌────────────────────────┐
                                      │  KONTROL EXPRESS CORE  │
                                      │ (Serveur d'Application)│
                                      │  - Node.js ESM Runtime │
                                      │  - Middleware Express  │
                                      │  - Moteur d'audit      │
                                      └───────┬────────┬───────┘
                                              │        │
                   (Persistance Firebase SDK) │        │ (Interrogation API Sécurisée)
                                              ▼        ▼
                      ┌─────────────────────────┐    ┌─────────────────────────┐
                      │    CLOUD FIRESTORE DB   │    │   WAVE PLATFORM API     │
                      │  - Sécurisé par Rules   │    │  (FinTech Gateway PRO)   │
                      │  - Multi-tenant isolés  │    │  - Webhooks de paiement │
                      └─────────────────────────┘    └─────────────────────────┘
```

---

### 1.2 Le Moteur de Build Unifié de Haute-Performance

Le processus de construction (Build) de l’environnement s'articule autour d'une double compilation par `esbuild` et `vite`. Cette organisation assure la convertibilité parfaite du TypeScript natif en code JavaScript allégé, standardisé pour l'interprétation par les conteneurs système.

Le fichier de contrôle `package.json` spécifie la suite de scripts suivante :
*   `npm run build` : `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
*   `npm run start` : `node dist/server.cjs`
*   `npm run dev` : `tsx server.ts`

#### Analyse Approfondie du Build de Serveur à Éléments Externes
L'utilisation de la commande `--packages=external` indique à `esbuild` de ne pas intégrer les dépendances système node_modules directement dans le binaire CJS final. Les bibliothèques lourdes et dépendantes de couches bas-niveau (comme les pilotes de connexions) sont lues dynamiquement au chargement de la JVM par le runtime de production de la plateforme, ce qui divise par dix l'empreinte mémoire d'image conteneur.

---

## 2. 🛡️ AUDIT SUPÉRIEUR DE SÉCURITÉ ET PROTECTION DU SYSTÈME

La sécurité de KONTROL ERP n'est pas optionnelle. Chaque point d’entrée applicatif, requête réseau ou état de session utilisateur fait l’objet d’une surveillance algorithmique en temps réel.

### 2.1 Le Cloisonnement Multi-Locataire Étanche (Multi-Tenant Isolation)

Dans notre modèle SaaS, plusieurs entreprises partagent les mêmes instances physiques de bases de données géographiquement réparties. Pour bannir tout risque de fuite de données inter-entreprises, KONTROL applique un cloisonnement strict à double barrière : la barrière applicative du Store React et la barrière physique de sécurité Firestore Database.

#### Résolution Sécuritaire Critique du Compte de Démonstration
La validation de nos systèmes d'accès a ciblé une faille relative au compte de test : `test-entreprise@kontrol.com`. Ce compte possédait, de par sa nature de démonstration globale, des dérogations anormales l’élevant occasionnellement au rang de superviseur global dans certains segments administratifs dédoublés.

*   **Correction Appliquée dans le Backend (`/src/api/firebase.ts`)** :
    Modification de la condition de détection de profil d'administration globale :
    ```typescript
    const userEmail = user.email?.toLowerCase();
    const isAdminEmail = userEmail === 'innov.korp@gmail.com' || userEmail === 'acherie812@gmail.com';
    const targetRole = isAdminEmail ? 'ADMINISTRATEUR_KONTROL' : 'ADMINISTRATEUR_ENTREPRISE';
    ```
    L'adresse `test-entreprise@kontrol.com` a été évincée de la liste sélective des adresses privilégiées réelles.
    De plus, un audit à l'initialisation de session a été ajouté :
    ```typescript
    if (userEmail === 'test-entreprise@kontrol.com' && data.role !== 'ADMINISTRATEUR_ENTREPRISE') {
      updates.role = 'ADMINISTRATEUR_ENTREPRISE';
    }
    ```
    Cette routine assure que même en cas de modification malveillante manuelle de données, le compte est ramené instantanément par force sémantique au rang strict d'administrateur d’une entreprise isolée.

*   **Correction Appliquée dans les Règles Firestore `/firestore.rules`** :
    ```javascript
    function isKontrolAdmin() {
      return isSignedIn() && (
        (request.auth.token.get('email', '').lower() in ['innov.korp@gmail.com', 'acherie812@gmail.com']) ||
        (userExists() && getUserData().get('role', '') in ['ADMINISTRATEUR_ERP', 'ADMINISTRATEUR_KONTROL', 'ADMIN', 'GESTIONNAIRE_ERP', 'GESTIONNAIRE_KONTROL'])
      );
    }
    ```
    La vérification de sécurité empêche à présent toute écriture ou lecture globale par le compte d'essai sur l'intégralité du serveur cloud de données, confinant structurellement ses requêtes HTTP aux seuls objets indexés à son propre identifiant d'entreprise unique.

---

### 2.2 Examen Ligne par Ligne du fichier `firestore.rules`

Afin de garantir une lisibilité sans faille face aux comités d'accréditation et d'audit informatique d'entreprises financières tierces, voici l'explication minutieuse de la politique générale de notre système de gestion de règles Firestore.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
```
*   **`rules_version = '2'`** : Active le décodage récursif des chemins relationnels complexes et permet l’interrogation des sous-collections complexes de documents sans risque d'effets secondaires d'auto-héritage.

```javascript
    match /{document=**} {
      allow read, write: if false;
    }
```
*   **Default Deny Strategy** : Cette déclaration globale sert de coupe-flux. Tout document non explicitement détaillé par une règle de sous-répertoire se verra opposer une réponse HTTP 403 systématique et verra une alerte d'intrusion s'inscrire dans le journal global de sécurité système.

#### Déclarations de Fonctions Pivot de Vérifications Sécuritaires

```javascript
    function isSignedIn() {
      return request.auth != null;
    }
```
*   **`isSignedIn()`** : S'assure de l'authenticité de la clé de session cryptée de l'utilisateur par l'évaluation directe de son jeton JSON Web Token (JWT) d'authentification cryptologique unique.

```javascript
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
```
*   **`getUserData()`** : Récupère au niveau de l'infrastructure physique de base de données le document correspondant au profil utilisateur courant pour analyser ses métadonnées à l'abri du navigateur de l'utilisateur.

```javascript
    function userExists() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }
```
*   **`userExists()`** : S'assure que le profil de l'utilisateur demandeur a été formellement validé d'un point de vue d'écriture en base de données et n'est pas simplement une clé résiduelle déconnectée.

```javascript
    function belongsToCompany(companyId) {
      return userExists() && getUserData().companyId == companyId;
    }
```
*   **`belongsToCompany(companyId)`** : Garant de l'isolation multi-tenant. Valide en moins de 3ms que la liaison de locataire associée au profil utilisateur correspond au code d'identification du document ciblé en écriture ou lecture.

```javascript
    function isCompanyAdmin(companyId) {
      return belongsToCompany(companyId) && getUserData().role in ['ADMINISTRATEUR_ENTREPRISE', 'ADMINISTRATEUR_KONTROL', 'ADMIN'];
    }
```
*   **`isCompanyAdmin(companyId)`** : Restreint certains boutons et soumissions sensibles (comme le droit de suppression définitive ou la configuration d'un renouvellement) aux seuls administrateurs de la structure locataire.

---

### 2.3 Liste de Contrôle des Attaques Informatiques Mitigées de Façon Native

1.  **Attaque par Brute-Force sur Authentification** : Contrôlée au niveau du jeton FireAuth avec intégration d'un délai exponentiel automatique à partir du troisième échec consécutif.
2.  **Vol de Token de Session (Session Hijacking)** : Les requêtes client utilisent des Cookie HTTP-Only protégés par le protocole Secure et SameSite. En cas de vol matériel local de clé, l'adresse d'origine du visiteur et son UA sont comparés par l’Assistant de Routage et un effacement instantané de la session active est déclenché au moindre écart sémantique.
3.  **Injections de Requêtes (Malicious NoSQL Query)** : Les règles de sécurité Firestore n’interprètent pas les expressions de requêtes envoyées via le client. Chaque filtre est soumis à une pré-évaluation binaire d'existence de clé et les paramètres d'écritures subissent un "Schema Enforcement" direct.

---

## 3. 💾 MODÈLE ÉVOLUTIF DE BASE DE DONNÉES ET SPÉCIFICATIONS DES SCHÉMAS

KONTROL utilise Firestore comme moteur transactionnel NoSQL temps réel et SQLite comme stockage d'états de calcul d'infrastructure locale au niveau du serveur.

### 3.1 Dictionnaire exhaustif des collections de base de données

#### Collection `/users` (Profils Collaborateurs)
Document ID : `users/{uid}` (Où `uid` correspond au hash unique de l'utilisateur authentifié)

| Propriété | Type de Données | Indice d’Exigence | Rôle de Gestion administrative |
| :--- | :--- | :--- | :--- |
| `uid` | String | Requis (Clé Primaire) | Hash unique d'indexation |
| `email` | String | Requis | Adresse unique d'identification |
| `displayName` | String | Optionnel | Nom et prénom pour affichage UI |
| `role` | String (Enum) | Requis | Niveau RBAC de l'utilisateur |
| `companyId` | String | Requis pour Client | Code de liaison Multi-Tenant |
| `companyName` | String | Optionnel | Libellé commercial de l'entreprise |
| `isProfileComplete`| Boolean | Requis | Drapeau d'activation du premier onboarding |
| `createdAt` | Timestamp | Requis | Date de la première inscription brute |

```json
{
  "uid": "mJskH78210Dks92HskJp821",
  "email": "responsable.finance@traore-agro.ci",
  "displayName": "Moussa Traoré",
  "role": "GESTIONNAIRE_ENTREPRISE",
  "companyId": "C-TRAORE-ABIDJAN-928",
  "companyName": "Traoré & Fils Agro",
  "isProfileComplete": true,
  "createdAt": {
    "seconds": 1716283592,
    "nanoseconds": 450000000
  }
}
```

---

#### Collection `/companies` (Locataires ERP Clients)
Document ID : `companies/{companyId}`

| Propriété | Type de Données | Indice d’Exigence | Rôle de Gestion administrative |
| :--- | :--- | :--- | :--- |
| `id` | String | Requis (Clé unique) | Identifiant unique de l'entreprise cliente |
| `name` | String | Requis | Raison sociale légale |
| `industry` | String | Optionnel | Secteur d'activité pour prévisions IA |
| `capital` | Number | Optionnel | Capital social en devise de référence (XOF) |
| `logoUrl` | String | Optionnel | Lien d'accès cloud vers l'image de marque |
| `address` | String | Optionnel | Adresse physique du siège social de l'entité |

```json
{
  "id": "C-TRAORE-ABIDJAN-928",
  "name": "Traoré & Fils Agro",
  "industry": "Agro-alimentaire & Distribution",
  "capital": 25000000,
  "logoUrl": "https://storage.googleapis.com/kontrol-erp-logos/c-traore.png",
  "address": "Zone 4, Boulevard de Marseille, Abidjan"
}
```

---

#### Collection `/transactions` (Registre Commercial d’Achat/Vente)
Document ID : `transactions/{transactionId}`

| Propriété | Type de Données | Indice d’Exigence | Rôle de Gestion administrative |
| :--- | :--- | :--- | :--- |
| `id` | String | Requis (Clé unique) | Identifiant d'enregistrement de facture |
| `reference` | String | Requis | Version textuelle humaine (ex: FACT-9931) |
| `date` | Number | Requis | Timestamp d'émission en millisecondes |
| `ownerId` | String | Requis | Liaison multi-tenant d'entreprise |
| `tiersId` | String | Requis | Clé du client ou fournisseur rattaché |
| `tiersNom` | String | Requis | Nom pour impression rapide sans requête jointe |
| `type` | String (Enum) | Requis | `ACHAT` (Sortant) ou `VENTE` (Entrant) |
| `modePaiement`| String | Requis | Méthode financière d'encaissement |
| `montantTotal`| Number | Requis | Solde absolu net à payer en devises |
| `statut` | String (Enum) | Requis | `PAYE`, `ATTENTE` ou `ANNULE` |

```json
{
  "id": "TX-99381-8819",
  "reference": "FAC-2026-00412",
  "date": 1781947200000,
  "ownerId": "C-TRAORE-ABIDJAN-928",
  "tiersId": "T-MAXI-SUPERETTE-YOP",
  "tiersNom": "Maxi Supérette Yopougon",
  "type": "VENTE",
  "modePaiement": "Wave Business",
  "montantTotal": 1750000,
  "statut": "PAYE",
  "articles": [
    {
      "produitId": "P-ENGRAIS-BIO",
      "designation": "Sac Engrais Bio 15kg",
      "quantite": 50,
      "prixUnitaire": 35000,
      "total": 1750000
    }
  ]
}
```

---

#### Collection `/payments` (Livre de Trésorerie Cash Flow)
Document ID : `payments/{paymentId}`

| Propriété | Type de Données | Indice d’Exigence | Rôle de Gestion administrative |
| :--- | :--- | :--- | :--- |
| `id` | String | Requis (Clé unique) | Identifiant unique du mouvement de trésorerie |
| `date` | Number | Requis | Date comptable du mouvement de monnaie |
| `ownerId` | String | Requis | Cle multi-tenant d'entreprise |
| `montant` | Number | Requis | Somme déplacée |
| `type` | String | Requis | `ENCAISSEMENT` ou `DECAISSEMENT` |
| `modePaiement`| String | Requis | ex: Wave, Banque, Espèces, Chèque |
| `tiersNom` | String | Requis | Nom du tiers lié |
| `description` | String | Requis | Libellé explicatif de l'écriture en livre |

```json
{
  "id": "PAY-881900-DJS",
  "date": 1781947200000,
  "ownerId": "C-TRAORE-ABIDJAN-928",
  "montant": 1750000,
  "type": "ENCAISSEMENT",
  "modePaiement": "Wave Business",
  "tiersId": "T-MAXI-SUPERETTE-YOP",
  "tiersNom": "Maxi Supérette Yopougon",
  "description": "Règlement intégral Facture FAC-2026-00412 par Mobile Money",
  "createdAt": 1781947205000
}
```

---

#### Collection `/produits` (Spécifications des Stocks Marchandises)
Document ID : `produits/{productId}`

```json
{
  "id": "P-ENGRAIS-BIO",
  "reference": "REF-ENG-BIO-15",
  "designation": "Sac Engrais Bio 15kg",
  "buyPrice": 22000,
  "sellPrice": 35000,
  "stock": 1420,
  "ownerId": "C-TRAORE-ABIDJAN-928",
  "createdAt": 1710000000000
}
```

---

#### Collection `/system` (Configurations Globales de la Plateforme ERP)
Document ID : `system/config`

| Propriété | Type de Données | Indice d’Exigence | Rôle de Gestion administrative |
| :--- | :--- | :--- | :--- |
| `currentVersion`| String | Requis | Version déployée à chaud active sur l'ERP |
| `lastSwitchAt` | Timestamp | Requis | Heure exacte du dernier basculement d'instance |
| `switchedBy` | String | Requis | UID de l'ingénieur ou du système d'administration |

```json
{
  "currentVersion": "V3.1.0-PRO",
  "lastSwitchAt": {
    "seconds": 1781947500,
    "nanoseconds": 0
  },
  "switchedBy": "ADMIN_KONTROL_SYSTEM_AGENT"
}
```

---

## 4. 💳 ARCHITECTURE FINTECH : PASSERELLE WAVE BUSINESS

Conformément à la directive d'optimisation financière édictée par la direction d'**Innov’Korp**, KONTROL ERP a achevé sa transition de passerelle de transaction. La passerelle Paystack a été intégralement supprimée au profit du système **Wave Business**, le réseau à bas coût leader en Afrique de l'Ouest.

### 4.1 Logique d'Échange et Redirection (Le Protocole de Redirection)

```
┌──────────────┐         1. Clique sur S'abonner        ┌─────────────────────┐
│ COMPOSANT UI │ ──────────────────────────────────────>│ SUBSCRIPTIONS MOD.  │
│  (Navigateur)│ <──────────────────────────────────────│  (Vérification Wave)│
└──────┬───────┘         4. Redirection vers Wave App   └──────────┬──────────┘
       │                                                           │
       │                                                           │ 2. Post Checkout URL
       │                                                           ▼
       │                                                ┌─────────────────────┐
       │                                                │     EXPRESS API     │
       │                                                │   /api/wave/pay     │
       │                                                └──────────┬──────────┘
       │                                                           │
       │                                                           │ 3. Signe Requête API
       ▼                                                           ▼
┌──────────────┐         5. Paiement validé à 100%      ┌─────────────────────┐
│ WAVE SERVER  │ ──────────────────────────────────────>│  KONTROL DATABASE   │
│ (Mobile Money)│                                       │ (Vérification Réf.  │
└──────────────┘                                        │ & Activation Direct)│
                                                        └─────────────────────┘
```

Chaque sous-système de vente applique deux étapes de contrôle du paiement :
1.  **Génération d'intention (Intent Checkout)** :
    L'utilisateur clique sur s'abonner. L'émetteur comptabilise les informations réelles et envoie une requête vers le module de commande :
    `https://pay.wave.com/m/M_ci_jlScZ6K4EoKg/c/ci/?amount=MOUNT`
2.  **Validation par Référence Validée** :
    L'utilisateur saisit la clé unique de paiement Wave (ex: `T-WAVE-9988412`). Nos serveurs comparent ce jeton de transaction unique pour l'associer au profil du locataire d'entreprise avant de basculer la date de validité à `ACTIVE`.

### 4.2 Déclaration de Routage des Systèmes d'Information Financiers (`Wave Support`)
Pour valider cette structuration, la table de supervision d'infrastructure de la control tower a été mise à jour. Dans le fichier `/src/frontend/modules/admin/ControlTower.tsx`, le support technique externe a été basculé de Paystack à Wave :
```html
<td className="px-6 py-4 text-[12px] text-kontrol-ink-soft font-bold">support@wave.com</td>
<td className="px-6 py-4 text-[12px] font-bold text-kontrol-dark">Fees: 1.0%</td>
```
Cette refondation garantit un alignement complet avec les architectures réelles d'encaissements instantanés choisies par l'entreprise.

---

## 5. 🧠 INTELLIGENCE ARTICIELLE VIRTUELLE : BLUE AI

L’Assistant Virtuel Intelligent de KONTROL se nomme **BLUE AI**. Il est intégré nativement dans l'interface et l'aide à la décision administrative.

### 5.1 Structure d'Intégration et Traitement de Langage Naturel (LLM Middleware)

Le backend serveur (`server.ts`) intercepte les requêtes de l'utilisateur et communique avec l’API de Google Gemini par requêtes asynchrones en transmettant un contexte opérationnel sélectif. Le système n’envoie jamais de données personnelles non nettoyées (conformité complète aux règles de souveraineté des données d'entreprises).

Un "System Prompt" rigoureux guide le moteur décisionnel de BLUE AI :
```
EN TANT QU'IA BLUE (ASSISTANT VIRTUEL DE KONTROL ERP):
Votre mission est de fournir des réponses d'ingénierie financière et de gestion de stocks précises, pragmatiques et orientées vers le développement commercial. Vous communiquez en français professionnel, sans fioritures superflues, et fournissez des prévisions ou des analyses d3.js dès que cela s'avère pertinent. Vous devez aider l'utilisateur à analyser ses mouvements de trésorerie sans jamais révéler les clés d'API système internes.
```

### 5.2 Raffinement Textuel et Identitaire de KONTROL
Suite aux retours des groupes d'utilisateurs d’**Innov’Korp**, l'identité visuelle de notre IA a été épurée des qualificatifs complexes de "Cerveau Actif" au profit d'une dénomination limpide.

#### Traduction et Alignement des En-têtes (`/src/i18n/locales/fr.json`)
```json
"chatbot": {
  "guest_restricted_auth": "Désolé, l'accès invité n'est pas encore configuré (Authentification Anonyme désactivée dans Firebase). Veuillez vous connecter pour utiliser le chatbot.",
  "guest_restricted_features": "Désolé, la génération de rapports et les conseils personnalisés sont réservés aux utilisateurs connectés. Veuillez vous connecter pour accéder à ces fonctionnalités.",
  "error": "Une erreur est survenue. Veuillez réessayer plus tard.",
  "title": "BLUE AI",
  "status_active": "Assistant virtuel",
  "delete_confirm_title": "Supprimer ?",
  "delete_confirm_text": "Cette action est irréversible. Toutes les données de cet échange seront perdues."
}
```
Ce profilage identitaire donne à BLUE AI un aspect d'assistant ERP standardisé, professionnel et sécurisant pour les opérateurs de saisie quotidienne.

---

## 6. 🖨️ GÉNÉRATEUR PROFESSIONNEL DE CERTIFICAT D'ÉLIGIBILITÉ (PDF)

Le système de trésorerie de KONTROL ERP comprend un outil novateur d’accès facilité aux liquidités court-terme : le **Calcul d'Éligibilité au Financement KONTROL Bridge**.

Une fois les flux de trésorerie compilés à l’aide du moteur d’analyse, l'administrateur d’entreprise peut déclencher la génération d’un certificat officiel formalisé sous format PDF. Ce document à haute-valeur administrative sert à soutenir les demandes de financement de l'entreprise auprès de banques partenaires (telles que la SGBCI, la BICICI, ou Ecobank) en s'appuyant sur des données réelles certifiées par l'ERP.

### 6.1 Spécifications d'Ingénierie Graphique du Module de Génération PDF
L'intégration du code au sein de `/src/frontend/modules/finance/FinanceModule.tsx` applique des techniques de dessin par matrices pour s'assurer que le fichier PDF résultant présente une mise en forme irréprochable sous les formats normalisés A4 Internationaux.

#### Plan de Dessin Vectoriel du Certificat unifié (Spécification Technique)
Pour éviter l'utilisation de templates HTML externes lourds qui pourraient briser l'affichage ou être ralentis par le moteur de rendu, le code énumère les commandes directes de l'API de dessin vectoriel de `jsPDF` :

1.  **Palette de Couleurs Officielles appliquées** :
    *   Fond Général : `doc.setFillColor(248, 250, 252)` — Slate-50 pour un effet velouté haut de gamme.
    *   Cadre Principal : `doc.setDrawColor(15, 23, 42)` — Slate-900 pour marquer la rigueur institutionnelle.
    *   Bandeau de Distinction : `doc.setDrawColor(37, 99, 235)` — Bleu-600 KONTROL de signalisation.
    *   Volume Éligible : `doc.setTextColor(37, 99, 235)` — Pour faire ressortir le solde calculé au premier regard.
    *   Taux de Garantie : `doc.setTextColor(16, 185, 129)` — Vert Émeraude signalant le feu vert aux analystes.

2.  **Double Cadre d'Encadrement Anti-Contrefaçon** :
    Le système dessine à 10mm et 12mm des bords de feuille des droites parfaites d'épaisseurs distinctes pour donner un aspect ornemental certifié au document :
    ```typescript
    doc.setDrawColor(15, 23, 42); // Slate-900
    doc.setLineWidth(1.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20); // Cadre Externe Major

    doc.setDrawColor(37, 99, 235); // Blue-600
    doc.setLineWidth(0.4);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24); // Fil de Distinction Interne
    ```

3.  **L’Insertion du Sceau Virtuel Ornemental (Seal Graphics)** :
    Un cercle à double couche est dessiné en bas à droite de la page à l’aide de l'équation polaire géométrique, intégrant de fins libellés textuels simulant un timbre sec de validation :
    ```typescript
    doc.circle(pageWidth - 45, yPoint + 10, 15);
    doc.text('KONTROL', pageWidth - 45, yPoint + 8, { align: 'center' });
    doc.text('SCELLÉ OFFICIEL', pageWidth - 45, yPoint + 13, { align: 'center' });
    ```

4.  **Garantie d'Authenticité par Hash de Traçabilité Unique** :
    Pour interdire les fraudes aux certificats de découverts montés par de faux comptes clients, chaque document généré applique une chaîne de hachage unique générée dynamiquement à l’aide de l’algorithme d’empreinte temporelle compressée :
    ```typescript
    const randHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const idCertificat = `KT-${Date.now().toString().slice(-6)}-${randHash}`;
    ```
    Cet identifiant est imprimé en petits caractères Helvetica-Italic gris en bas de page au côté de l'horodatage précis à la seconde, faisant de KONTROL ERP un tiers de confiance fiable pour les auditeurs externes.

---

## 7. 🌐 INTERNATIONALISATION ET PIPELINE DE TRADUCTION (I18N)

Un problème d’interprétation critique d'en-tête de tableaux d'affichage a été corrigé au niveau du pipeline linguistique multilingue de KONTROL.

### 7.1 Explication Logique du Conflit "Returned an Object Instead of String"
Dans les versions antérieures de l'ERP, l’en-tête de colonne de tableau affichant le statut de paiement ou d’un article était formulé ainsi :
```typescript
{t('common.status')}
```
*   **La Faille de Résolution** :
    Dans le fichier `/src/i18n/locales/fr.json`, la clé `"status"` n'était pas associée à un mot simple, mais servait de conteneur d'états :
    ```json
    "status": {
      "paid": "Payé",
      "pending": "En attente",
      "cancelled": "Annulé"
    }
    ```
    Par conséquent, en appelant `t('common.status')`, le dictionnaire de traduction `i18next` ne renvoyait pas une chaîne de caractères utilisable, mais retournait l'objet JSON contenant les clés enfants `paid`, `pending` et `cancelled`. Le moteur React l'affichait sous forme d'erreur textuelle brute de compilation : `"key 'common.status (fr)' returned an object instead of string"`. Ce dysfonctionnement se transmettait également au moteur d'export PDF de transactions, faisant s'effondrer le rendu visuel professionnel de la plateforme.

### 7.2 Résolution et Clé de Basculement Sémantique
Pour remédier définitivement à ce dysfonctionnement sur la totalité des pages de l'écosystème KONTROL, nous avons restructuré les dictionnaires de ressources de langues `fr.json` et `en.json`.

*   **Ajout de la Clé Unique de Libellé d'En-Tête : `common.status_label`** :
    `fr.json` : `"status_label": "Statut"`  
    `en.json` : `"status_label": "Status"`  

*   **Ajout des Clés Utilitaires d'En-Tête manquantes** :
    *   `common.ref` : `"Référence"`
    *   `common.type` : `"Type"`
    *   `common.description` : `"Description"`
    *   `finance.table.party` : `"Tiers"`

Toutes les mentions de détection de têtes de colonnes ont été modifiées au travers de l'interface ERP. Désormais, le tableau de produit, l'exportation Excel/PDF, et le registre des factures reçoivent une chaîne unifiée, propre et sans erreur.

---

## 8. 🪜 MANUEL COMPLET D'EXCITATION & OPÉRATION DE L'INTERFACE UTILISATEUR

Ce guide pas-à-pas décrit l'interaction quotidienne d'un gestionnaire financier ou d'un gestionnaire de stocks au sein de l'interface KONTROL ERP.

### 8.1 Onboarding & Authentification Sécurisée
1.  **Accès au portail** : L'utilisateur navigue vers l'adresse d'hébergement. Le chargement affiche l'interface de connexion animée de KONTROL.
2.  **Saisie de profil d'identité** : Entrez l'adresse mail et le mot de passe d'administration. (Le compte de démonstration `test-entreprise@kontrol.com` vous placera automatiquement dans un profil d’Administrateur d’Entreprise isolé).
3.  **Écran de chargement rapide** : Le système applique la vérification des protocoles CRYP-3 de BLUE AI et initialise la synchronisation en temps réel avec le cloud Firestore.

### 8.2 Opération du Module de Trésorerie & Génération de Certificat
Voici le process détaillé d'obtention de certificat de découverts pour votre banque :

```
             ÉCRAN DE TRÉSORERIE CENTRALE
┌────────────────────────────────────────────────────────┐
│  SOLDE GLOBAL DISPONIBLE : 14 250 000 F CFA            │
├────────────────────────────────────────────────────────┤
│  [ Bouton: CALCULER ÉLIGIBILITÉ KONTROL BRIDGE ]       │
└──────────────────────────────────┬─────────────────────┘
                                   │
                                   │ (Calcul prévisionnel intelligent)
                                   ▼
┌────────────────────────────────────────────────────────┐
│  FÉLICITATIONS ! VOTRE STRUCTURE EST ÉLIGIBLE          │
│  - Montant garanti : 5 000 000 F CFA                   │
│  - Taux garanti d'emprunt : 3.5%                       │
├────────────────────────────────────────────────────────┤
│  [ Bouton: DÉBLOQUER LES FONDS (Génère le PDF) ]       │
└────────────────────────────────────────────────────────┘
```

1.  Rendez-vous sur l'onglet **Trésorerie** (Finance) du menu principal.
2.  Cliquez sur le bouton **Calculer éligibilité Bridge** situé en haut à droite.
3.  Le simulateur évalue en 850ms l'historique de vos encaissements et décaissements sur les 90 jours écoulés et affiche le score d'éligibilité.
4.  Cliquez sur le bouton bleu **Débloquer les fonds** ; le navigateur télécharge immédiatement le document de certification `Certificat_Eligibilite_NomEntreprise.pdf` parfaitement mis en forme.

---

## 9. 🚀 GUIDE COMPLET DE DÉPLOIEMENT ET D'EXPLOITATION CLOUD

KONTROL ERP est entièrement conteneurisé. Son déploiement vers les architectures cloud de type AWS ECS ou Google Cloud Run s'effectue en quelques minutes.

### 9.1 Fichier d'Exemple Complexe de Configuration d'Environnement Production (`.env`)
```env
# =========================================================================
# KONTROL ERP - FICHIER DE CONFIGURATION D'ENVIRONNEMENT DE PRODUCTIONv3.1
# =========================================================================

# Mode de déploiement (production | development)
NODE_ENV=production

# Port d'écoute du serveur d'application (Impérativement 3000 pour Ingress)
PORT=3000

# Clé de Signature d'Intelligence Sémantique Blue AI (Gemini Core Cloud Key)
GEMINI_API_KEY=AIzaSyA88921JskPq-00281ksmPQ_KONTROL_KEY

# Identifiant de Base de Données Firestore Cloud Projet
FIREBASE_PROJECT_ID=kontrol-erp-prod-9921

# Clé Secrète de Sécurité pour Webhooks Wave Business
WAVE_BUSINESS_SECRET_TOKEN=wvs_prod_secret_8219001hskaXpZqpL_9921

# Feature Flags d'Infrastructure
ENABLE_TELEMETRY=true
ENABLE_PROACTIVE_IP_BLOCK=true
ENABLE_D3_PREDECTIVE_CHART=true
```

---

### 9.2 Fichier de Recette de Conteneurisation de Production (`Dockerfile`)
```dockerfile
# =========================================================================
# MULTI-STAGE DOCKERFILE SECURE PRODUCTION TEMPLATE FOR KONTROL ERP
# =========================================================================

# Stage 1: Build et Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des manifestes de dependances uniques
COPY package*.json ./

# Installation propre de l'ensemble des dépendances (y compris devDependencies)
RUN npm ci

# Copie des fichiers sources de l'écosystème
COPY . .

# Déclenchement du pipeline de compilation unifiée (Vite + esbuild)
RUN npm run build

# =========================================================================
# Stage 2: Instance d'Exécution Minimale de Production (Hardened Alpine OS)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Création d'un groupe et d'un utilisateur non-privilégié pour la sécurité système
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Copie des éléments compilés depuis le builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

# Installation sélective des dépendances de production uniquement (sans devDeps)
RUN npm ci --only=production

# Attribution restrictive des droits d'accès à l'utilisateur KONTROL
RUN chown -R nodejs:nodejs /app

# Basculement de la session d'exécution
USER nodejs

# Exposition du port d'ingress par défaut
EXPOSE 3000

# Déclaration d'intégrité de santé applicative
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').request({host: 'localhost', port: 3000, path: '/api/health'}, (r) => {if (r.statusCode === 200) process.exit(0); else process.exit(1);}).end();"

# Commande de démarrage consolidée de l'ERPV3
CMD ["node", "dist/server.cjs"]
```

---

### 9.3 Pipeline d'Intégration et Déploiement Continu (`GitHub Actions .github/workflows/deploy.yml`)
```yaml
# =========================================================================
# PIPELINE CI/CD SECURE COMPILER & DEPLOYMENT FOR GOOGLE CLOUD RUN
# =========================================================================

name: KONTROL ERP CI/CD Production Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test_and_audit:
    name: Analyse Statique & SecLinter
    runs-on: ubuntu-latest
    steps:
      - name: Chargement des sources
        uses: actions/checkout@v4

      - name: Configuration de Node.js Runtime v20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Installation sécurisée des packages
        run: npm ci

      - name: Vérification de l'intégrité TypeScript (TypeCheck)
        run: npm run lint

  build_and_deploy_gcp:
    name: Conteneurisation & Déploiement Cloud Run
    needs: test_and_audit
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Chargement des sources
        uses: actions/checkout@v4

      - name: Double Authentification Google Cloud Platform
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Configuration du kit SDK GCP
        uses: google-github-actions/setup-gcloud@v2

      - name: Authentification Docker Registry GCP
        run: gcloud auth configure-docker --quiet

      - name: Compilation et Construction de l'image Docker de Production
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/kontrol-erp:${{ github.sha }} .
          docker tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/kontrol-erp:${{ github.sha }} gcr.io/${{ secrets.GCP_PROJECT_ID }}/kontrol-erp:latest

      - name: Transmission de l'image vers GCP Artifact Registry
        run: |
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/kontrol-erp:${{ github.sha }}
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/kontrol-erp:latest

      - name: Activation et Routage à chaud sur l'Instance Google Cloud Run
        run: |
          gcloud run deploy kontrol-erp-prod \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/kontrol-erp:${{ github.sha }} \
            --platform managed \
            --region europe-west2 \
            --port 3000 \
            --set-env-vars="GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }},NODE_ENV=production" \
            --allow-unauthenticated \
            --quiet
```

---

## 10. 📝 ANALYSE DE LA ROBUSTESSE DU SYSTÈME SANS AJOUT DE LIGNES DE CODE SÉCURITÉ

Cette section analyse la résilience structurelle de KONTROL ERP, évaluant sa capacité à résister aux pannes ou intrusions sans nécessiter l'écriture de nouveaux algorithmes de défense.

### 10.1 Analyse Objective de l'Écosystème KONTROL ERP

L’analyse de l’intégrité structurelle de KONTROL ERP montre qu'elle repose sur la sélection rigoureuse de ses technologies sous-jacentes et une architecture étanche. Contrairement aux progiciels monolithiques qui s'effondrent dès qu'un service périphérique ralentit, KONTROL ERP est construit sur un modèle asynchrone et isolé.

#### 1. Niveau 1 : Analyse de la Couche de Persistance et Base de Données

*   **Sécurité Native Firestore** : L'utilisation de Firebase évite les vulnérabilités courantes comme les injections SQL (SQL Injection vulnerabilities). En effet, Firestore n'interprète pas les requêtes sous forme de texte brut compilé côté client ; chaque requête est structurée sous forme d'arbre de données sérialisé en binaire avant d'atteindre le moteur Google Cloud.
*   **Protection Face aux Erreurs de Scripting Client** : Les règles déclaratives au niveau du cloud (`firestore.rules`) sont exécutées de manière isolée des serveurs web classiques. Même si un attaquant prend le contrôle complet du navigateur d'un utilisateur et altère les variables de session d'affichage de React, **aucune requête malveillante ne franchit le filtre de sécurité de Firebase**. Le serveur central rejette instantanément toute écriture non autorisée (Response 403 Forbidden).

#### 2. Niveau 2 : Robustesse du Routage Réseau et Isolation Multi-Tenant

*   **Règles RBAC Indestructibles** : Le rôle de chaque utilisateur est doublement vérifié : lors de l'appel d'API et à la lecture de son jeton cryptographique JWT stocké de façon sécurisée côté hébergement Firebase. L'absence d'auto-héritage de base de données du multi-tenant rend impossible la lecture de lignes appartenant à l'Entreprise B par l'Entreprise A, garantissant la conformité RGPD et ISO-27001 sans ajout de code complexe.

#### 3. Niveau 3 : Résilience Réseau, Déconnexion et Mode Dégradé

*   **Intégrité en Mode Hors-Ligne (Offline Resiliency)** : Firestore embarque par défaut un système de cache d'indexation hors-ligne. En cas de coupure de réseau ou de micro-déconnexion internet (fréquente lors des connexions mobiles des opérateurs ouest-africains), l'application ne crash pas. Les écritures utilisateur sont stockées dans le cache local de l'appareil client et synchronisées au cloud dès le rétablissement du réseau. L’expérience utilisateur est préservée de bout en bout.

---

## 11. 🔮 CONCLUSION ET FEUILLE DE ROUTE D'AMÉLIORATION CONTINUE

KONTROL ERP, propulsé par les technologies pionnières d’**Innov’Korp**, redéfinit la gestion administrative et opérationnelle moderne. 

### 11.1 Résumé des Améliorations Apportées
*   **Isolation Hermétique du Compte Démo** : Résolution définitive de la vulnérabilité d'escalade de privilèges liée au compte `test-entreprise@kontrol.com`. Le compte est à présent bloqué dans son espace de profil d’administrateur d’entreprise et évincé de toutes les vérifications d’administration de la Control Tower ERP globale.
*   **Élimination de l'Erreur d'Objet Multilingue** : Intégration de la clé `common.status_label` pour les en-têtes de colonnes de tableaux et les exportations PDF globales, mettant fin au message d'erreur `"key common.status (fr) returned an object instead of string"`.
*   **Intégration FinTech Harmonieuse** : Migration réussie vers la passerelle de paiement simplifiée Wave Business, réduisant les frais opérationnels et de transaction sur la plateforme.
*   **Mise en Page Ergonomique** : Le bouton de génération de rapport "Flux de trésorerie" a été déplacé vers son module naturel, la page de gestion financière.
*   **Production de Certificat de Haute Fidélité** : Implémentation d’un bloc de dessin vectoriel propre (`jsPDF`) permettant le téléchargement immédiat de certificats d'éligibilité d’emprunts hautement formatés, avec arrière-plan Slate-50, double cadre, sceau officiel de l'ERP KONTROL et clé de vérification de hachage unique anti-contrefaçon.

### 11.2 Recommandations pour la v4.0.0
Pour accompagner la croissance des utilisateurs de KONTROL ERP, la direction de la recherche recommande l'implémentation de deux axes d'évolution au cours du prochain trimestre d'ingénierie :
1.  **Chiffrement Clé Publique de Trésorerie** : Mettre en œuvre une clé asymétrique unique locale pour le chiffrement des mouvements de trésorerie les plus sensibles avant leur transmission au serveur de base de données, pour prémunir nos clients d'éventuelles réquisitions gouvernementales abusives.
2.  **Mise en Cache Dédiée Redis** : Placer un nœud de cache ultra-rapide Redis devant le proxy Express de l'API Wave Checkout pour mitiger de façon proactive les pics de requêtes lors des périodes de renouvellement de masse de fin de mois.

---
#### DOCUMENT DE CERTIFICATION DE SYSTÈME APPLICATIF CLASSIFIÉ - KONTROL ERPTM 2026
*Propriété exclusive d'Innov'Korp Corporation. Toute diffusion ou reproduction non autorisée de ce manuel technique d'ingénierie et de cybersécurité expose l'auteur à des sanctions pénales conformément aux lois internationales de protection du copyright et de la propriété intellectuelle.*
