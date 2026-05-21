# 🎨 INTERFACE UTILISATEUR ET ARCHITECTURE FRONTEND — SYSTEM KONTROL

---
### DOSSIER : `/src/frontend`
**Statut du Module :** Couche Client React 18 SPA (Vite Engine Bundle)  
**Rôle Principal :** Interface d'exploitation, visualisations analytiques d3/recharts, micro-animations & saisies comptables  
**Cadre Stylistique :** Tailwind CSS Utility Engine • Animations Motion (Framer Engine)  
**Gouvernance Intellectuelle :** Département Front-End & Expérience Utilisateur d’**Innov’Korp**

---

## 1. 🏛️ VISION ET GOUVERNANCE ERGONOMIQUE
L’interface utilisateur de **KONTROL ERP** a été entièrement conçue selon les normes les plus élevées de réactivité, d’adéquation métier et de sobriété émotionnelle. Elle tourne sur une structure **Single Page Application (SPA)** propulsée par React 18 et construite par le billet de Vite.

Dans le strict respect de la **Charte d'Honnêteté Architecturale d'Innov'Korp**, le design rejette les artifices d'affichage superflus ("AI Slop" et "Tech-Larping"). La densité d'information, la taille des cibles tactiles (minimum 44px sur mobile pour les opérateurs d'entrepôt), et la finesse de la typographie ("Inter" couplée aux caractères techniques "JetBrains Mono" pour les chiffres financiers) concourent à créer une interface fluide d'une impeccable rigueur comptable.

---

## 2. 🗂️ CARTOGRAPHIE COMPLÈTE DE L'INTERFACE CLIENT

```
/src/frontend
├── 📜 README.md                 -> Ce guide d'explication d'interface et de composants
├── 📄 App.tsx                   - Point de contrôle applicatif principal (Routage dynamique et Habilités)
├── 📄 types.ts                  - Modèles d'interfaces TypeScript stricts et uniformisés
├── 📂 components/               -> Éléments UI briques de bases partagés
│   ├── auth/                    - Écrans d'identification, création de compte et d'initialisation de société
│   ├── common/                  - Grilles d'affichages réutilisables, boutons sobres, loaders & visualisations
│   ├── dashboard/               - Cartes de tendances, graphiques financiers compacts de synthèse (Recharts)
│   ├── landing/                 - Écran d'accueil public et présentation des briques de services
│   ├── layout/                  - Barre latérale de navigation, menus systèmes, entêtes d'options et tiroir d'alertes
│   └── notifications/           - Modals de retours utilisateur, alertes de stocks bas et erreurs NoSQL
├── 📂 constants/                -> Dictionnaires et référentiels de données statiques physiques
└── 📂 lib/                      -> Outils et fonctions d'exportations locales d'arrière-plan
│   ├── cashflow.ts              - Algorithme d'amortissement et de calcul de courbes de trésorerie
│   ├── countries.ts             - Base de données des départements géographiques de la zone UEMOA
│   ├── export.ts                - Code d'extraction tabulaire vers les formats universels (Excel, CSV)
│   ├── invoice.ts               - Génération des modèles d'impressions de facturations en direct
│   ├── permissions.ts           - Évaluation à la volée des droits de l'opérateur connecté (RBAC Client Helper)
│   └── utils.ts                 - Formatage comptable du Franc CFA (XOF), dates locales et jointures de classes Tailwind
└── 📂 modules/                  -> Écrans métiers majeurs (Modules autonomes orientés cas d'usage)
    ├── finance/                 - Suivi de trésorerie, bridge de crédit et générateur PDF du Certificat d'Éligibilité
    ├── transactions/            - Facturation de ventes et d'achats avec réduction de stocks dynamique
    ├── stocks/ & produits/      - Inventaire d'entrepôt, alertes de sous-produits et mouvements physiques
    ├── blue/                    - Salon de consultation avec l'assistant virtuel BLUE AI
    ├── system/ & admin/         - Control Tower d'administration de la plateforme (réservé aux admins)
    └── [autres sous-modules]    - Gestion des charges opérationnelles, fiches de tiers, profils, etc.
```

---

## 3. 🧩 DÉTAILS DE COMPOSITION ET DÉCOUPAGE MODULAIRE

Des dossiers hautement coordonnés permettent d'éviter la prolifération de fichiers volumineux difficilement manipulables à travers la plateforme :

### 3.1 Les Composants Communs d'Infrastructure (`/src/frontend/components`)
*   `layout` : Met en œuvre une grille fluide dotée d'un menu latéral repliable pour s'ajuster instantanément aux écrans des terminaux mobiles de terrain. Tout élément graphique a été configuré de façon à s'effacer d'elle-même au profit de la lecture de l'information principale.
*   `common` : Centralise les entrées de données standard (champs de saisie, sélecteurs), les tableaux d'analyses de transactions dotés de fonctions de tris, et des graphiques épurés égarés de fioritures (propulsés par `recharts` pour les flux, et des vecteurs géométriques propres pour l'amortissement).

### 3.2 Les Véritables Modules d'Exploitation (`/src/frontend/modules`)
Chaque sous-module encapsule un écran d'activité, limitant les liaisons de codes croisées et de dependances :

#### A. Le Pôle de Suivi Monétaire : `finance/` (`FinanceModule.tsx`)
Regroupe la consultation des mouvements ou règlements d'espèces et le simulateur d'avance de trésorerie.
*   **Contrôle FinTech Wave** : C'est cet écran qui propose d'accompagner le client dans son parcours de paiement par récépissé avec la saisie manuelle de sa référence de paiement Wave (`T-WAVE-xxxx`).
*   **Moteur d'impression jsPDF** : Ce module héberge l'ensemble des coordonnées vectorielles de tracé pour assembler et générer le **Certificat officiel d'Éligibilité d'octroi de découverts bancaires** au format PDF haute-définition d'une tenue institutionnelle irréprochable.
*   **Bouton de rapport financier** : Intègre le bouton d'export de rapport **Flux de trésorerie** précédemment isolé au sein des transactions de biens commerciaux.

#### B. Le Module de Facturations : `transactions/` (`TransactionsModule.tsx`)
*   Permet au pôle comptable d'éditer, de stocker ou d'annuler les pièces justificatives de l'exercice fiscal.
*   **Liaison sémantique de Stock** : À la confirmation d'une facture d'expédition, des fonctions reliées se chargent de réduire physiquement la quantité en stock pour interdire la vente récurrente d'articles indisponibles d'entrepôt.

#### C. Console Centrale de Gouvernance globale : `system/` / `admin/` (`ControlTower.tsx`)
Ce cockpit opérationnel hautement confidentiel est réservé de façon restrictive aux titulaires d'habilitation d'administration globale (`test-admin@kontrol.com`).
*   Permet le diagnostic en direct de l'ensemble des installations de socles multi-tenants.
*   Il sert de passerelle d'autorisation d'abonnements pour valider manuellement de manière sécurisée les paiements reçus hors-système (vérifications manuelles croisées sur l'application Wave Business de la direction de la plateforme).

---

## 4. 🧮 MODULES ET COMPREHENSION DES OUTILS CLIENT (`/src/frontend/lib`)

### 4.1 Utilitaires d'Affichage Monétaire
Le pôle financier ouest-africain s'appuie sur le Franc CFA (code ISO : XOF). Pour éliminer toute source d'erreur lors des saisies denses, l'utilitaire `utils.ts` expose des filtres de mise en page stricts :
*   Aucune décimale n'est autorisée lors des opérations sur le Franc CFA, conformément aux pratiques fiduciaires de la **BCEAO** (Banque Centrale des États de l'Afrique de l'Ouest).
*   Formatage automatisé sous la forme de séparateurs de milliers clairs (ex: `15 000 000 F CFA`), limitant drastiquement les fautes de frappes des opérateurs de factures ordinaires.

### 4.2 Module de Gouvernance de Droits : `permissions.ts`
Intervient au niveau d'**App.tsx** pour parer de façon sémantique à toute initiative de consultation non légitime :
*   Si le compte d'un employé n'est pas assorti d'un niveau d'autorisation requis (comparaison directe de son rôle d'habilitation avec la matrice d'habilitation d’écrans), l'utilitaire de routage bloque l'initialisation du composant, présente un écran sobre d’accès refusé, et notifie par avertissement le journal système d'audit des actions de l'entreprise.
*   La tentative de l'adresse de compromission démonstration d’accder aux menus privilégiés de la platforme est ainsi interceptée et rétrogradée automatiquement en une fraction de seconde de manière imperméable.
