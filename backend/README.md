# 🗺️ ARCHITECTURE DE RÉFÉRENCE DES MICROSERVICES COMPLÉMENTAIRES — R&D INNOV'KORP

---
### DOSSIER : `/backend`
**Statut du Module :** Plans de Référence Technique & Systèmes de Sécurité Auxiliaires  
**Rôle Principal :** Cadre de microservices isolés de haute performance pour la mise à l'échelle future de la suite ERP KONTROL  
**Gouvernance Intellectuelle :** Division de Recherche & Développement d'**Innov’Korp**

---

## 1. 🏛️ CADRE CONCEPTUEL DU MULTI-LANGUAGE ENGINE SÉCURISÉ
Bien que la suite logicielle principale de KONTROL ERP s'exécute de manière unifiée sous un serveur Express rapide (`server.ts` compilé en `/dist/server.cjs`), Innov'Korp a conçu des architectures de référence complémentaires prêtes pour l'industrialisation à l'échelle continentale (ETI d'Afrique de l'Ouest). 

Le répertoire `/backend` regroupe des prototypes avancés et des architectures découplées rédigés en quatre écosystèmes linguistiques spécifiques. Chacun de ces écosystèmes répond à un défi précis de traitement d'infrastructure comptable ou de haute sécurité réseau.

---

## 2. 📁 COMPOSITION TECHNIQUE DU RÉPERTOIRE

```
/backend
├── 🪐 go/                        -> Passerelle et Noyau de Session Ultra-Léger
│   ├── go-auth/                 - Authentification unifiée et validation JWT bas-niveau
│   ├── go-gateway/              - Reverse proxy réactif haute performance
│   └── go-kernel/               - Moteur d'évaluation de transactions temps-réel
├── ☕ java/                      -> Traitements Comptables Institutionnels
│   ├── java-auditor/            - Moteur de conformité et calculs d'asymétrie
│   ├── java-core/               - Modèles métiers conformes à l'OHADA
│   └── java-spring/             - Passerelle bancaire et éligibilité de crédit
├── 🐍 python/                    -> Traitements Cognitifs & Modèles Décisionnels
│   └── [ai_analytics]/          - Indexation prévisionnelle d'activité commerciale
└── 🦀 rust/                      -> Chiffrement Militaire & Isolation Réseau
    └── rust-shield/             - Cryptographie à divulgation nulle de connaissance
```

---

## 3. 🛡️ DESCRIPTION DÉTAILLÉE DES ÉCOSYSTEMES DÉCOUPLÉS

### 3.1 🪐 L'Écosystème Go (Haute Vitesse & Routage Ingress)
L'infrastructure Go concentre le contrôle de flux d'entrée à haut débit. En cas d'unification multi-tenant de milliers d'entreprises simultanées, la barrière de routage et de chiffrement TLS représente le premier facteur de latence serveur.

*   `go-auth` : Microservice autonome de décodage à chaud des jetons d'identification (Firebase ID Tokens). Développé sans dépendances lourdes pour des temps de réponse sous la milliseconde (`<1ms`).
*   `go-gateway` : Un reverse proxy implémentant des algorithmes de *Rate-Limiting* dynamiques par adresse IP et par jeton de compte pour neutraliser les attaques par déni de service (DDoS).
*   `go-kernel` : Évalue le traitement concurrent des validations de commandes et d'inventaires physiques en mémoire avant de séquencer l'écriture sur les bases NoSQL distribuées.

### 3.2 ☕ L'Écosystème Java (Robustesse Financière & Cadre Juridique)
La rigueur du traitement comptable au sein de la région UEMOA requiert une adéquation absolue aux règlements révisés récurrents de l'**OHADA** (Organisation pour l’Harmonisation en Afrique du Droit des Affaires).

*   `java-core` : Implémente le plan comptable unifié standardisé par l'acte uniforme de l'OHADA. Il gère de manière typée les classes de comptes d'actifs, de passifs, de charges d'exploitation et de ventes de services.
*   `java-auditor` : Service d'arrière-plan analysant l'historique complet pour détecter d'éventuels déséquilibres de balisages, de doublons de facturation, ou de discordances comptables locales.
*   `java-spring` : Plateforme centrale destinée à l'interfaçage direct avec les API bancaires ouvertes (Open Banking) afin de collecter les flux de virement SEPA, Swift ou locaux interbancaires régionaux.

### 3.3 🐍 L'Écosystème Python (Analyses Prévisionnelles & IA)
L'intégration de modèles prédictifs s'effectue par des routines Python optimisées pour l'algèbre linéaire et la prévision de séries temporelles de trésorerie.
*   Ce dossier regroupe des scripts de scoring évaluant de manière probabiliste les retards de paiements des tiers (clients) basés sur l'historique des règlements de factures d’entreprises similaires de la sous-région.
*   Il sert de complément décisionnel à l'assistant virtuel local pour affiner le calcul du score d'éligibilité d'octroi de découverts commerciaux.

### 3.4 🦀 L'Écosystème Rust (Sécurité Système Cryptographique)
Le sous-dossier `rust-shield` implémente des logiques de chiffrement unifiées de haute sécurité :
*   **Protection des Données Client** : Implémentation d'algorithmes de cryptographie asymétrique pour sceller les coordonnées fiscales et commerciales des entreprises à destination des bases de données distantes.
*   **Validation Anti-Falsification** : Génération ultra-rapide et sécurisée des condensats (hashes) cryptographiques uniques apposés sur les certificats officiels de financement d’Innov'Korp au format PDF.

---

## 4. 🔗 ROUTAGE ET TRANSITION AVEC LE NOYAU NODE.JS CENTRAL
Dans l'architecture active de développement de KONTROL ERP :
1.  **Le Pivot Host Express** (`server.ts`) exécute de manière unifiée 100% des fonctions requises pour l'utilisation directe du logiciel par le biais d'un serveur puissant et compact optimisé pour le Cloud Run et Firebase Firestore.
2.  **L'Écosystème de Référence `/backend`** sert de base de documentation interne et de canevas d'intégration de modules complémentaires. Les ingénieurs système de nos partenaires certifiés s'y réfèrent pour concevoir et greffer des microservices conteneurisés d'arrière-plan sans altérer la cohérence du noyau applicatif global de KONTROL ERP.
