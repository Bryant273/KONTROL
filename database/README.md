# Structure de la base de données KONTROL

Cette base de données est implémentée sur **Firebase Firestore** (NoSQL), mais cette documentation fournit une représentation relationnelle (SQL) pour une meilleure compréhension de la structure des données.

## Dossier `database/`
- `schema.sql`: Contient les définitions des tables et des relations.
- `seed.sql`: Exemples de données pour les tests (à venir).

## Entités principales
1.  **Users**: Profils utilisateurs avec rôles (ENTREPRISE, ADMIN, GESTIONNAIRE).
2.  **Produits**: Catalogue d'articles avec gestion du stock et du stock d'alerte.
3.  **Tiers**: Clients et Fournisseurs.
4.  **Transactions**: Ventes et Achats impactant le stock et la comptabilité.
5.  **Stock Movements**: Historique détaillé de chaque entrée/sortie de stock.
6.  **Charges**: Dépenses d'exploitation.
7.  **Actions**: Journal d'audit des actions utilisateurs.
8.  **Subscriptions**: Gestion des abonnements de l'entreprise.

## Relations
- La plupart des entités sont liées par `ownerId` ou `companyId`, ce qui permet une isolation stricte des données par entreprise.
- Les transactions sont liées aux produits via les mouvements de stock (`transactionId`).
