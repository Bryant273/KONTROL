# 🗄️ GUIDE ARCHITECTURAL : MIGRATION VERS UN SYSTÈME BANCAIRE ET CLOUD SQL / RELATIONNEL (KONTROL ERP)

---

## 1. Introduction & Objectif
Ce document décrit la méthodologie, les étapes techniques et les modifications de code requises pour libérer KONTROL ERP de la dépendance NoSQL (Firestore) et l'intégrer sur un système de base de données relationnelle hautement sécurisé (ex: **PostgreSQL / PostgreSQL managé dans un environnement bancaire** ou **Google Cloud SQL**), relié de manière sécurisée aux passerelles d'API d'un système bancaire d'entreprise.

---

## 2. Éléments Constituants du Système de Base de Données Relationnelle
Les structures de tables relationnelles requises sont déjà prédéfinies et documentées dans le dossier `/database/tables/`. Le fichier maître `/database/tables/full_schema.sql` regroupe la définition complète du schéma relationnel équivalent pour :
*   **users** : Comptes utilisateurs et permissions RBAC.
*   **produits** : Informations d'inventaire, seuils d'alerte.
*   **stock_movements** : Mouvements des stocks avec validation d'intégrité.
*   **tiers** : Répertoire clients et fournisseurs.
*   **transactions** : Facturation d'achat/vente (avec blocage de découvert si VENTE).
*   **payments** : Règlement financier et flux de trésorerie nette (Cash Flow).
*   **actions** : Journal d'audit d'intégrité impénétrable.

---

## 3. Étapes de Transition et d'Abstraction de l'API (Frontend/Backend)

Pour réussir la transition de l'application vers ce nouveau système bancaire et relationnel, le plan technique se compose de 4 étapes majeures :

### Étape 3.1 : Déclaration et Configuration des Variables d'Environnement
Pour centraliser la connexion vers le nouveau serveur de base de données bancaire (SQL), déclarez les variables d'accès dans le fichier `.env` ou les configurations de variables d'environnement Cloud Run (sans les exposer côté client) :

```env
# Configuration de la base de données relationnelle sécurisée (ex : Cloud SQL PostgreSQL)
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=kontrol_banking_db
DATABASE_USER=kontrol_admin_service
DATABASE_PASSWORD=YOUR_STRONG_BANKING_PASSWORD_HERE
DATABASE_SSL_CERT_PATH=/etc/ssl/certs/banking-db-ca.pem

# Liaison de l'API bancaire principale
BANKING_API_URL=https://api.sandbox.cyber-bank.com/v1
BANKING_API_KEY=your_banking_api_key_secret
```

### Étape 3.2 : Remplacement de l'initialisation de persistence client
Dans le fichier `/src/api/firebase.ts` (ou un nouveau fichier fédérateur `/src/api/database.ts`), remplacez le SDK Firestore par l'implémentation client HTTP standard connectée à des contrôleurs d'API intermédiaires sécurisés (Middleware Express Backend ou API Spring Boot).

Pour cela, implémentez un **Adapter Pattern** permettant de conserver la même signature de méthodes afin de minimiser l'impact sur le code de l'interface utilisateur (UI).

```typescript
// Exemple de restructuration d'un adaptateur de service pour les transactions (transactionService.ts)
// Avant (Firestore) :
// const snapshot = await getDocs(query(collection(db, 'transactions'), ...));

// Après (Service API Connecté à la base relationnelle bancaire) :
import { apiClient } from '../lib/api-client';
import { Transaction } from '../frontend/types';

export const getTransactions = async (companyId: string): Promise<Transaction[]> => {
  // Appel sécurisé au service backend qui interroge directement la base relationnelle SQL
  const response = await apiClient.get<Transaction[]>(`/api/transactions?companyId=${companyId}`);
  return response.data;
};
```

### Étape 3.3 : Implémentation du Dual Commit (2PC) / Validation du Core Bank
1.  **Validation Métier** : Les requêtes d'écriture sensibles (ex: validation d'une facture sous forme de transaction ou réduction de stock) doivent transiter par le **Java Enterprise Engine** (`/backend/java-spring`) qui exécute l'algorithme d'intégrité des stocks (`verifyStockIntegrity`) et vérifie la solvabilité financière.
2.  **Dual Commit** : En mode bancaire, utilisez le protocole d'engagement à deux phases (**Two-Phase Commit ou 2PC**) géré par le contrôleur Spring Boot pour s'assurer que l'écriture comptable en base de données SQL s'accompagne d'un acquittement irréprochable et cryptographiquement signé par le noyau de sécurité.

---

## 4. Préparation au Déploiement et Environnement Google Cloud

### Est-il nécessaire de déployer dans l'écosystème Google ?
**Non, ce n'est pas strictement obligatoire.** Grâce à son architecture modulaire et conteneurisée (Docker), KONTROL ERP peut être déployé sur n'importe quel cube Kubernetes ou plateforme cloud privée d'une institution financière bancaire. 

Cependant, **l'hébergement sur Google Cloud Platform (GCP) est vivement recommandé** pour les garanties suivantes :
1.  **Google Cloud SQL (PostgreSQL / AlloyDB)** : Offre des niveaux de conformité de sécurité bancaire très stricts, un chiffrement au repos natif géré par des clés client (CMEK) via KMS, ainsi qu'une réplication synchrone multi-zones pour la haute disponibilité.
2.  **Google Cloud Run / Kubernetes Engine (GKE)** : Autorise un cloisonnement réseau étanche au moyen d'un VPC privé communicant directement en local vers Cloud SQL via un connecteur de VPC sans passer par l'Internet public.
3.  **Firebase Authentication** : Gère l'authentification sécurisée des utilisateurs, les jetons JWT et la ré-authentification d'identité sans stocker directement les identifiants en base locale, simplifiant la mise en conformité réglementaire (RGPD/DSN).

---

## 5. Liste de Contrôle pour le passage en Production (Production Checklist)
Avant de lancer le déploiement sur la nouvelle base de données bancaire :
- [ ] **Compilation Correcte** : Vérifier que `npm run build` compile l'intégralité du client web sans erreurs de types.
- [ ] **Exécution des Linters** : S'assurer de la conformité du code TS/JS en exécutant les validations automatiques.
- [ ] **Validation des règles d'audit (Rust Shield)** : S'assurer que le bin `/backend/rust-shield` est compilé pour la plateforme cible de déploiement et configuré pour écouter les payloads JSON des contrôleurs Java/Go.
- [ ] **Définition de l'habilitation Multi-Tenant** : S'assurer que les index composites d'isolation (ex. index SQL sur `company_id`) sont créés pour empêcher efficacement les fuites de données inter-entreprises.
