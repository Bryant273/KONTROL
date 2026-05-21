# 🗄️ MANUEL D'INTEGRITÉ DE STRUCTURE DES DONNÉES ET SCHÉMAS DE RÉFÉRENCE — KONTROL ERP

---
### DOSSIER : `/database`
**Statut du Module :** Référentiel de Schémas, Profils d'Intégrité NoSQL & Blueprints Relationnels (SQL)  
**Rôle Principal :** Cartographie relationnelle unifiée, scripts de déploiement et audits d'intégrité des bases de données  
**Modèle Physique Implémenté :** Google Cloud Firestore (NoSQL temps-réel hautement disponible)  
**Gouvernance Intellectuelle :** Division Base de Données & Cybersécurité d'**Innov’Korp**

---

## 1. 🏛️ ARCHITECTURE LOGIQUE DE PERSISTANCE UNIFIÉE
KONTROL ERP exploite la flexibilité et la réactivité instantanée de **Google Cloud Firestore**. Cependant, pour satisfaire aux audits de conformité de nos partenaires bancaires institutionnels et des structures de réglementation de la zone UEMOA, **Innov’Korp** maintient une modélisation relationnelle (SQL) double rigoureuse. 

Chaque document NoSQL de base possède une équivalence sémantique parfaite avec une représentation en table relationnelle classique. Cette double structure assure aux analystes et développeurs d'avoir un cadre conceptuel unifié pour les indexations, les jointures complexes et le reporting de haut niveau.

---

## 2. 🗂️ STRUCTURE COMPLÈTE DU RÉPERTOIRE

```
/database
├── 📜 README.md                 -> Ce manuel d'architecture et de gouvernance
└── 📂 tables/                   -> Blueprints SQL de structure relationnelle
    ├── actions.sql              - Journalisation d'audit des opérateurs de l'ERP
    ├── full_schema.sql          - Script SQL global pour les déploiements de serveurs relationnels
    ├── governance.sql           - Script d'audit et règles d'habilitation par profils
    ├── notifications.sql        - Structure de routage des alertes du système
    ├── payments.sql             - Registre comptable précis des flux de trésorerie (Cash Flow)
    ├── produits.sql             - Catalogue complet des biens physiques et alertes stocks
    ├── stock_movements.sql      - Tracement des flux d'inventaires (E/S) physiques
    ├── tiers.sql                - Gestion du répertoire clients-fournisseurs (CRMs)
    ├── transactions.sql         - Facturations commerciales d'achats et de ventes
    └── users.sql                - Profils d'habilitation et comptes de sécurité utilisateurs
```

---

## 3. 🗺️ ANALYSE DES COMPOSANTS RELATIONNELS ET Blueprints (SQL)

### 3.1 Profils de Sécurité et Identités : `users.sql`
Décrit l'habilitation d'accès basée sur les rôles (RBAC). 
*   **Champs principaux** : ID Unique (UID), email (certifié unique), rôle strict (`ADMINISTRATEUR_ERP` | `ADMINISTRATEUR_ENTREPRISE` | `GESTIONNAIRE_ENTREPRISE` | `UTILISATEUR`), et ID de l'entreprise d'exploitation (`company_id`).
*   **Pivot Multi-Tenant** : Le champ `company_id` agit comme clé d'isolement. Aucune jointure ne peut être autorisée hors de ce périmètre de l'entité cliente.

### 3.2 Catalogue et Gestion de Stock : `produits.sql`
Modélise la table des biens matériels consommables ou commercialisés par l'ETI cliente.
*   **Caractéristiques clés** : Code-barres ou SKU unique, prix unitaire de vente, coût de revient d'acquisition, quantité actuelle en stock physique réel, et quantité minimale d'alerte (`stock_alerte`).
*   **Alerte Automatique** : Si le stock disponible chute sous le seuil `stock_alerte`, l'ERP déclenche une notification visuelle et prépare un brouillon de réapprovisionnement pour le pôle des achats.

### 3.3 Clients & Fournisseurs : `tiers.sql`
Table unifiant le répertoire commercial de l’entreprise cliente.
*   **Enregistrement discriminant** : Le champ de type (`type_relation`) prend la valeur `CLIENT` ou `FOURNISSEUR`. Ils reçoivent une clé unique de désignation pour l'association avec les écritures de facturations.

### 3.4 Factures et Flux d'Achats/Ventes : `transactions.sql`
Contient l'historique complet des documents commerciaux émis de manière légale.
*   **Traçabilité** : Référence de facturation (ex: `FACT-2026-0001`), date Unix précise, type d'activité (`VENTE` | `ACHAT`), mode de règlement (`Wave Business`, etc.), montant total, et l'état d'acquittement (`PAYE` | `ATTENTE` | `ANNULE`).
*   **Lien d'inventaire** : Chaque entrée de mouvement commercial engendre une ligne correspondante dans la table des mouvements de stocks.

### 4.5 Tracement des Flux Physiques d'Inventaires : `stock_movements.sql`
Assure l'audit permanent et empêche les pertes clandestines de marchandises.
*   **Mécanique d'enregistrement** : Enregistre le type de déplacement (`ENTREE` pour les achats, `SORTIE` pour les ventes), la désignation du produit, la quantité de mouvement nette, la date et la référence de la transaction d'origine.

### 4.6 Encaissements de Monnaie (Cash Flow) : `payments.sql`
Cette structure sémantique est l'émettrice de la balance finale de trésorerie de la société cliente.
*   **Indépendance Comportementale** : Gère les écritures réelles d'entrée et de sortie monétaires liées à une facture ou des frais généraux. L'unification de ce registre avec le modèle théorique des ventes permet l'agrégation de l'activité réelle en opposition aux volumes théoriques de créances clients.

### 4.7 Le Registre d'Audit des Actions Systèmes : `actions.sql`
C’est le journal de bord d’audit impénétrable de KONTROL ERP.
*   Modélise l'enregistrement de chaque action effectuée par les employés. Toute création de produit, suppression ponctuelle d'écriture autorisée par le gérant ou validation d'échéance y est scellée avec son empreinte temporelle, son adresse IP et son ID d'opérateur pour parer d'éventuelles malversations financières internes.

---

## 4. 🔄 LE PIVOT DE CONCORDANCE NOSQL (FIRESTORE) VS SQL
Afin de réaliser des agrégations ultra-rapides sur le client d'application mobile et Web sans compromettre la solidité relationnelle, le SDK Firestore utilise des documents imbriqués optimisés (Sub-collections) :

| Identifiant NoSQL Firestore | Table SQL de Correspondance | Mode de Liaison Sémantique |
| :--- | :--- | :--- |
| `/users/{uid}` | `users` | Unitaire, clé d'authentification Firebase Auth. |
| `/companies/{companyId}` | `companies` | Multi-Tenant Root. |
| `/transactions/{txId}` | `transactions` | Indexé sur `ownerId` correspondant à la société. |
| `/payments/{payId}` | `payments` | Indexé sur `ownerId` avec champ `tiersId` lié. |
| `/products/{prodId}` | `produits` | Géré avec le document de stock. |

---

## 5. 🛡️ GOUVERNANCE ET CLOISONNEMENT DES LOGICIES : `governance.sql`
Le fichier de configuration de gouvernance relationnelle décrit les conditions formelles d'accès théorique aux données :
1.  **Isolation Multi-Tenant** : Aucun compte utilisateur ne peut avoir le canal ouvert pour consulter des données d'un document dont le champ `ownerId` ou `companyId` n'est pas strictement identique au champ `companyId` de son propre profil.
2.  **Protection des Administrateurs Système** : Le compte central de contrôle `test-entreprise@kontrol.com` est expressément exclu de la sphère d'administration globale, ce qui empêche d'éventuels contournements logiques et protège l'intégrité de l’ensemble des structures enregistrées.
