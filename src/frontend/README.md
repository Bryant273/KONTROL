# 🎨 INTERFACE UTILISATEUR ET ARCHITECTURE FRONTEND — SYSTEM KONTROL

---
### DOSSIER : `/src/frontend`
**Statut du Module :** Couche Client React 18 SPA (Vite Engine Bundle)  
**Rôle Principal :** Interface d'exploitation, visualisations analytiques d3/recharts, signatures & cachets officiels, paiement GeniusPay/Kkiapay/Wave, micro-animations & saisies comptables  
**Cadre Stylistique :** Tailwind CSS Utility Engine • Animations Motion (Framer Engine)  
**Gouvernance Intellectuelle :** Département Front-End & Expérience Utilisateur d’**Innov’Korp**

---

## 1. 🏛️ VISION ET GOUVERNANCE ERGONOMIQUE
L’interface utilisateur de **KONTROL ERP** a été entièrement conçue selon les normes les plus élevées de réactivité, d’adéquation métier et de sobriété émotionnelle. Elle tourne sur une structure **Single Page Application (SPA)** propulsée par React 18 et construite par le biais de Vite.

Dans le strict respect de la **Charte d'Honnêteté Architecturale d'Innov'Korp**, le design rejette les artifices d'affichage superflus ("AI Slop" et "Tech-Larping"). La densité d'information, la taille des cibles tactiles (minimum 44px sur mobile pour les opérateurs d'entrepôt), et la finesse de la typographie ("Inter", "Space Grotesk" couplées aux caractères techniques "JetBrains Mono" pour les chiffres financiers) concourent à créer une interface fluide d'une impeccable rigueur comptable.

---

## 2. 🗂️ CARTOGRAPHIE COMPLÈTE DE L'INTERFACE CLIENT

```
/src/frontend
├── 📜 README.md                 -> Ce guide d'explication d'interface et de composants
├── 📄 App.tsx                   - Point de contrôle applicatif principal (Routage dynamique, tabs et état du profil)
├── 📄 types.ts                  - Modèles d'interfaces TypeScript stricts et uniformisés (UserProfile, Company, Transaction...)
├── 📂 components/               -> Éléments UI briques de bases partagés
│   ├── auth/                    - Écrans d'identification, création de compte et d'initialisation de société
│   ├── common/                  - Grilles d'affichages réutilisables, boutons sobres, loaders & visualisations
│   ├── dashboard/               - Cartes de tendances, barre de progression d'abonnement, décompte jours/heures, Recharts
│   ├── landing/                 - Écran d'accueil public et présentation des briques de services
│   ├── layout/                  - Barre latérale de navigation, menus systèmes (avec Signature & Cachet), entêtes
│   ├── subscription/            - SubscriptionContractModal (Contrat d'abonnement, CGU, signature & paiements)
│   └── notifications/           - Modals de retours utilisateur, alertes de stocks bas et notifications interactives
├── 📂 constants/                -> Dictionnaires et référentiels de données statiques physiques
│   └── navigation.ts            - Arborescence des sous-sections de la sidebar (Commercial, Gestion, Système)
└── 📂 lib/                      -> Outils et fonctions d'exportations locales d'arrière-plan
│   ├── cashflow.ts              - Algorithme d'amortissement et de calcul de courbes de trésorerie
│   ├── contract.ts              - Génération du Contrat d'Abonnement PDF avec incrustation de la signature officielle
│   ├── countries.ts             - Base de données des pays et départements de la zone UEMOA
│   ├── export.ts                - Code d'extraction tabulaire vers les formats universels (Excel, CSV)
│   ├── invoice.ts               - Génération des modèles d'impressions de factures/devis PDF avec signature & cachet
│   ├── permissions.ts           - Évaluation à la volée des droits de l'opérateur connecté (RBAC Client Helper)
│   └── utils.ts                 - Formatage comptable du Franc CFA (XOF), dates locales et jointures de classes Tailwind
└── 📂 modules/                  -> Écrans métiers majeurs (Modules autonomes orientés cas d'usage)
    ├── finance/                 - Suivi de trésorerie, bridge de crédit et générateur PDF du Certificat d'Éligibilité
    ├── transactions/            - Facturation de ventes et d'achats avec réduction de stocks dynamique & liens GeniusPay/Wave
    ├── stocks/ & produits/      - Inventaire d'entrepôt, alertes de sous-produits et mouvements physiques
    ├── blue/                    - Salon de consultation avec l'assistant virtuel BLUE AI
    ├── system/                  - SignatureModule (Signature & Cachet), NotificationsCenterModule, DataExchangeModule
    └── companies/               - CompanyHubModule, CompanyProfileModule
```

---

## 3. 🧩 DÉTAILS DES MODULES CLÉS ET COMPOSANTS

### 3.1. Module Signature & Cachet Officiel (`/src/frontend/modules/system/SignatureModule.tsx`)
Inclus dans la section **Système** du menu latéral :
* Permet le téléversement en glisser-déposer de l'image de la signature ou du tampon officiel d'entreprise.
* Sauvegarde automatique dans Firestore sur le document utilisateur et le document entreprise.
* Prévisualisation sur spécimens de contrat et de facture.

### 3.2. Modalité de Contrat d'Abonnement (`/src/frontend/components/subscription/SubscriptionContractModal.tsx`)
* Présente les clauses d'engagement d'abonnement selon le cadre légal OHADA / Loi 2013-546.
* Permet d'importer la signature de l'entreprise à la volée avant de signer.
* Génère le fichier PDF certifié KONTROL et met à jour l'échéance d'abonnement à 30 jours.

### 3.3. Intégrations de Paiement (GeniusPay, Kkiapay, Wave)
* Prise en charge des paiements par Mobile Money et Carte Bancaire pour les renouvellements d'abonnements et le paiement de factures.
* Boutons d'encaissement direct et codes QR configurés dynamiquement.

---

## 4. 🧮 UTILITAIRES DE GÉNÉRATION DOCUMENTAIRE PDF (`lib/contract.ts` & `lib/invoice.ts`)

* **Incrustation de la Signature Officielle** : Si une signature (`companySignature` / `signatureUrl`) est enregistrée sur le profil, elle est automatiquement lue et dessinée sur les documents PDF générés par `jspdf`.
* **Rendu Haute Définition** : Formatage d'impression épuré avec en-têtes claires, logos vectoriels et bloc de sécurité SHA-256.

---
*INTERFACE FRONTEND KONTROL ERP v1.0.0 — INNOV'KORP 2026*
