# 🛡️ SYSTEM KONTROL ERP — SPÉCIFICATIONS TECHNIQUES EXTENSIVE ET MANUEL DE GOUVERNANCE DE SÉCURITÉ

---
### DOCUMENT TECHNIQUE ET OPÉRATIONNEL DE RÉFÉRENCE DE LA SUITE APPLICATIVE
**Version de Production :** 1.0.0 (Version Unique et Harmonisée)  
**Classification d'Accès :** Restreint aux Partenaires Certifiés & Administrateurs Système KONTROL  
**Gouvernance Intellectuelle :** Division de Recherche & Développement, Département de Cybersécurité et Architectures Distribuées de **Innov’Korp**  
**Pile Logicielle Fondatrice :** Full-Stack ESM/CJS • React 18 • Vite SPA • Express Unified Engine • Cloud Firestore Multi-Tenant • GeniusPay & Kkiapay & Wave Payment Gateways • Digital Signature Apposition • BLUE AI Cognitive Assistant

---

## 🏛️ PARTIE 1 : LA GENÈSE DE KONTROL ERP ET LA VISION D'INNOV'KORP

### 1.1 Le Défi de la Dispersion Opérationnelle dans les ETI de la Région UEMOA
Au cours de l'analyse menée par **Innov’Korp** auprès de plus de cinquante entreprises de taille moyenne et grandes industries de la sous-région ouest-africaine, une friction constante a été observée : la fragmentation généralisée des données opérationnelles de gestion. 

Traditionnellement, le traitement quotidien des flux opérationnels au sein d'une entreprise se fait de manière segmentée et manuelle :
* Les niveaux d'inventaires physiques sont mis à jour de façon aléatoire sur des carnets physiques ou des feuilles de calcul locales modifiables à volonté, gâchant toute politique d'achat rationnelle.
* Le pôle de facturation opère de manière isolée, émettant des pièces commerciales qui ne se répercutent jamais instantanément dans la balance monétaire de la société.
* La gestion de trésorerie reste dépendante de rapprochements bancaires manuels effectués au bout de plusieurs semaines, maintenant la direction générale dans une cécité stratégique totale quant à son solde de trésorerie réel.
* L’accès à de petits crédits d'exploitation ou financements de fonds de roulement auprès de partenaires bancaires traditionnels (BICICI, SGBCI, Ecobank, Orabank, BOA...) s'avère extrêmement laborieux à cause de l'incapacité criante à présenter des livres de comptes et des diagnostics prévisionnels de liquidités fiables et certifiables immédiatement.

**KONTROL ERP** a été spécifiquement conceptualisé pour éliminer définitivement cette inertie organisationnelle. À travers une interface utilisateur épurée et réactive unifiée, la plateforme interconnecte les métiers physiques (gestion de stocks), financiers (facturations, règlements, banque, passerelles Mobile Money GeniusPay/Kkiapay/Wave), juridiques (contrats d'abonnement signés numériquement), opérationnels (signatures & cachets d'entreprise) et stratégiques (synthèses de flux, audits intelligents BLUE AI).

---

### 1.2 La Charte de Respect et de Sobriété Technologique d'Innov'Korp
Face à la recrudescence d'interfaces qualifiées "d'AI slop" ou polluées par des artifices techniques dénués de valeur, la suite KONTROL s'érige sur des conventions de design humbles, strictes et profondément professionnelles :
* **Neutralisation des Faux Indicateurs Réseau** : KONTROL n'intègre pas de graphiques fictifs de paquets de données ou de compteurs de serveurs arbitraires. Toute information se matérialisant devant l'opérateur découle d'un service d'écriture ou de calcul réel.
* **Conventions Linguistiques Standardisées** : Des intitulés sobres et explicites ("Signature & Cachet", "Abonnement en cours", "Finances", "Tiers").
* **Focus-Mode de l'Écran d'Applications** : Nos pages évitent la surcharge d’icônes et privilégient la vitesse d'exécution des saisies comptables denses et l'ergonomie.

---

## 2. ⚙️ ARCHITECTURE APPLICATIVE ET RÉSEAU DE DISTRIBUTION DE L'ERP

Le système KONTROL utilise une architecture **Full-Stack unifiée (Express + Vite + React 18)** compilée en modules standard Node.js (ES Module & CommonJS).

### 2.1 Schéma Complet de Routage et de Persistance Multi-Locataires (Multi-Tenant)

```
=============================================================================================
                                     PANEL NAVIGATEUR CLIENT (BROWSER UI)
=============================================================================================
    - React 18 SPA (Vite compilation optimisée)
    - CSS Utility Framework : Tailwind CSS
    - Transitions Réactives : Motion (Framer Motion Engine)
    - Gestion de Traduction Directe : i18next Interface (Français)
    - Rendu Géométrique de Données : D3.js & Recharts Unified Vectors
                      │
                      │ (Connexion Sécurisée HTTPS TLS 1.3 - Port 3000 uniquement)
                      ▼
=============================================================================================
                                INGRESS CONTROLLING & REVERSE PROXY
=============================================================================================
    - NginX Reverse Proxy Ingress (Port d'entrée standardisé et scellé 3000)
    - Blocage strict de toutes les requêtes directes hors flux Ingress
                      │
                      ▼
=============================================================================================
                               SERVEUR PRINCIPAL D'APPLICATION (EXPRESS)
=============================================================================================
    - Node.js ESM/CJS Runtime (Exécuté depuis /dist/server.cjs)
    - Routage d'API strict : /api
    - Passerelles de Paiement : GeniusPay API & Kkiapay SDK & Wave Business Proxy
    - Middleware de Sécurité : Helmet, Rate-Limiter, CORS
                      │
                      ├─────────────────────────────────────────┐
                      │ (Appels Web SDK Sécurisés)             │ (Proxy de requêtes LLM)
                      ▼                                         ▼
==============================================================  =============================
                     BASE DE DONNÉES CLOUD                        COGNITION SYSTEM BLUE AI
==============================================================  =============================
    - Google Cloud Firestore Database                           - Vertex AI / Gemini API
    - Règles de Sécurité de Base : firestore.rules               - Clé cachée : GEMINI_API_KEY
    - Chiffrement Complet en transit et au repos                - Mode Assistant Virtuel CFO
=============================================================================================
```

---

### 2.2 Analyse Détaillée de la Chaîne d’Assemblage et du Packaging de Production
1. **Le Frontend (Compilateur Vite)** : 
   La commande `vite build` prend les pages React, les traductions `i18n` et les styles Tailwind, puis compile l'ensemble dans le dossier `/dist`.
2. **Le Backend (Esbuild System)** : 
   Compilé via `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`, produisant un fichier CommonJS autonome et ultra-performant.
3. **Lancement de Sécurité** : 
   `npm start` exécute `node dist/server.cjs`, éliminant les temps de transpilation à chaud en production.

---

## 3. 💳 INTÉGRATION DE PASSERELLES DE PAIEMENT (GENIUSPAY & KKIAPAY & WAVE)

Afin de répondre aux spécificités monétaires et bancaires de la zone UEMOA et à l'usage massif du Mobile Money, KONTROL intègre un sous-système de paiement multi-fournisseurs :

1. **GeniusPay Gateway Integration** :
   * Permet le paiement sécurisé par Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money) ainsi que par Carte Bancaire.
   * Traitement rapide des transactions d'abonnement KONTROL et réconciliation des paiements d'entreprises.
2. **Kkiapay Mobile Money Integration** :
   * Intégration du SDK Kkiapay offrant une expérience d'encaissement fluide et sécurisée.
3. **Wave Business Direct API & Links** :
   * Génération dynamique de QR codes et liens de règlement Wave configurés avec les montants exacts des factures ou des abonnements.

---

## 4. 🖋️ MODULE SIGNATURE & CACHET OFFICIEL D'ENTREPRISE (`/signature`)

Pour éliminer l'obligation d'imprimer, tamponner manuellement et scanner des documents, KONTROL intègre un module complet de gestion d'empreinte officielle :

### 4.1. Interface de Gestion (`SignatureModule.tsx`)
Accessible depuis la barre latérale dans la section **Système** via l'onglet **Signature & Cachet** :
* **Téléversement Glisser-Déposer** : Accepte les images PNG/JPEG (jusqu'à 5 Mo) avec fond blanc ou transparent.
* **Stockage Centralisé Multi-Tenant** : Sauvegarde synchrone dans le profil de l'utilisateur (`users/{uid}`) et dans la fiche entreprise (`companies/{companyId}`).
* **Aperçu Temps Réel sur Spécimens** : Visualisation instantanée du rendu sur les spécimens de contrat et de facture.

### 4.2. Apposition Automatique sur les Documents PDF
* **Contrats d'Abonnement PDF (`contract.ts`)** : L'image de la signature est automatiquement incrustée à côté du sceau de vérification KONTROL et de l'horodatage.
* **Factures & Devis PDF (`invoice.ts`)** : L'image de la signature et du tampon est intégrée en bas à droite de chaque facture certifiée émise à destination des clients.

---

## 5. 📜 CONTRAT D'ABONNEMENT ÉLECTRONIQUE ET SUIVI TEMPS RÉEL

### 5.1. Modal de Contrat d'Abonnement (`SubscriptionContractModal.tsx`)
* **Cadre Légal Conforme (Loi 2013-546 CI / OHADA)** : Validation avec mention exprès du représentant légal, acceptation des conditions d'utilisation et horodatage certifié.
* **Téléchargement PDF Officiel** : Génération immédiate d'un contrat d'abonnement formalisé avec articles juridiques et signature électronique.

### 5.2. Barre de Progression & Décompte de Précision Temps Réel
Sur le Tableau de Bord (Pilotage) :
* **Décompte de Précision** : Calcul dynamique affichant les jours et heures restants (ex. `12j 18h restants`).
* **Barre de Progression Fonctionnelle** : Affiche le pourcentage réel consommé de l'abonnement (`elapsedPercent`) calculé selon la formule :
  $$\text{Pourcentage Écoulé} = \min\left(100, \max\left(0, \frac{\text{Temps Écoulé depuis la Signature}}{\text{Durée Totale de la Période}}\right) \times 100\right)$$
* **Bannières d'Alerte Intelligentes** : Alerte élégante si l'échéance approche ($\le 10$ jours) avec bouton de paiement immédiat.

---

## 6. 🧩 INVENTAIRE DES MODULES FONCTIONNELS

1. **Dashboard / Pilotage** : Vue d'ensemble des KPIs, solde de trésorerie, statut d'abonnement actif, barre de progression et décompte direct.
2. **Tiers** : Annuaire des clients et fournisseurs, coordonnées, conditions de règlement et historique des opérations.
3. **Produits & Services** : Catalogue complet (affichage exhaustif de tous les articles sans filtre restrictif par date), SKUs, marges brutes, filtres par état de stock (Tous, En Stock, Stock Faible, Rupture), import/export Excel/CSV/PDF et contrôle strict du stock (blocage des ventes à découvert).
4. **Transactions** : Enregistrement des ventes et achats, liens de paiement GeniusPay / Kkiapay / Wave.
5. **Finance & Trésorerie** : Graphiques `Recharts`, rapports de liquidités et simulateur de financement de trésorerie.
6. **Charges** : Suivi analytique des charges fixes et variables.
7. **Stocks** : Mouvements d'entrepôt, seuils de sécurité et alertes de stock bas.
8. **Signature & Cachet (`/signature`)** : Importation, gestion et apposition automatique des signatures sur PDF.
9. **Chat Interne (K-Chat)** : Messagerie d'équipe en temps réel.
10. **Tickets de Support** : Gestion des demandes d'assistance technique.
11. **BLUE AI** : Directeur Financier virtuel propulsé par Gemini AI.
12. **Échange de Données XML** : Imports/exports structurés.
13. **Company Hub & Profil** : Identité, logo, adresse et informations d'entreprise.

---

## 7. 🔒 SÉCURITÉ & BOUCLIER MULTI-LANGAGES (RUST, GO & JAVA)

* **Rust Shield (`/backend/rust-shield`)** : Protection mémoire bas niveau, signatures immuables des transactions et vérification d'intégrité de registre de stock.
* **Go Kernel (`/backend/go-kernel`)** : Cache concurrent hautement performant (`sync.RWMutex`) et validation d'autorisation de stock.
* **Java Core Engine (`/backend/java-core`)** : Validation des règles de gestion complexe et audits financiers.

---

## 8. 🚀 GUIDE DE DÉMARRAGE RAPIDE ET COMMANDES

### Installation des dépendances
```bash
npm install
```

### Lancement en Mode Développement
```bash
npm run dev
```
*Le serveur hybride Express + Vite démarrera sur `http://localhost:3000`.*

### Compilation et Build de Production
```bash
npm run build
```

### Lancement en Production
```bash
npm start
```

---
*DOCUMENTATION OFFICIELLE SYSTÈME KONTROL ERP — TOUS DROITS RÉSERVÉS INNOV'KORP 2026.*
