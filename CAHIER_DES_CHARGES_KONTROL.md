# Cahier des Charges & Spécifications Fonctionnelles – KONTROL ERP

**Version d'Écosystème & de Saisie Unique :** Version 1.0.0 (Alignée sur l'Interface Utilisateur active)  
**Sécurité & Intégration API :** Architecture sécurisée unifiée par variables d'environnement distantes. Les clés secrètes et API de production ne sont jamais exposées dans la documentation ou l'interface.

Ce document constitue la référence exhaustive de l'architecture fonctionnelle, de l'interface utilisateur et des exigences logicielles de la plateforme **KONTROL**, un ERP de Gestion Intelligente conçu pour les Petites et Moyennes Entreprises (PME) ainsi que pour la supervision administrative par les super-administrateurs.

---

## 1. Présentation Générale de l’Application

**KONTROL** est un Écosystème ERP Full-Stack modulaire permettant de centraliser le pilotage d'entreprise. Il résout les défis de la gestion financière, du suivi des stocks, de la relation clients/fournisseurs, et de l'analyse décisionnelle assistée par Intelligence Artificielle.

L'application propose deux profils d'expérience distincts et sécurisés :
1. **L'Espace Client (Entreprise)** : Dédié aux chefs d'entreprises, comptables et gestionnaires pour administrer l'activité commerciale quotidienne.
2. **La Tour de Contrôle (Super-Administrateur ERP)** : Dédié aux administrateurs de la plateforme KONTROL pour superviser l'ensemble des entreprises inscrites, analyser les revenus globaux (MRR), gérer la maintenance et coordonner le support.

---

## 2. Charte Graphique, Identité Visuelle & Expérience Utilisateur (UX/UI)

L'interface de KONTROL est conçue selon des principes professionnels stricts, privilégiant l'élégance, la clarté et un fort contraste visuel.

*   **Palette de Couleurs** : 
    *   Fonds principaux : Blanc brillant et nuances douces de gris ardoise (`slate-50` à `slate-100`) pour limiter la fatigue visuelle.
    *   Teintes d'accentuation : Bleu institutionnel KONTROL (`#0284C7`), Bleu royal vif pour les actions clés (`#2563EB`) et Orange dynamique (`#F97316`) pour les flux secondaires ou indicateurs de mise en garde.
    *   Textes : Gris très sombre (`#0F172A`, `slate-900`) pour une lisibilité maximale.
*   **Typographie** : Pairing moderne et haut de gamme.
    *   Titres & En-têtes : **Space Grotesk** pour un rendu technologique et affirmé.
    *   Corps de texte & UI générale : **Inter** pour sa neutralité et son excellente lisibilité.
    *   Données chiffrées & Logs d'audit : **JetBrains Mono** pour un alignement tabulaire impeccable et professionnel.
*   **Animations & Micro-interactions** : Intégration de transitions fluides via la librairie `motion` (fondu à l'apparition, expansion des menus latéraux, états réactifs au survol des cartes et boutons).

---

## 3. Description Détaillée des Modules Opérationnels

### 3.1. Espace Client – Pour les Entreprises Mandataires

L'expérience des entreprises est cloisonnée et sécurisée. Elle s'articule autour de 5 grandes sections de navigation :

#### A. Pilotage (Tableau de bord)
*   **Visualisation des KPIs Clés** : Cartes synthétiques des ventes, des charges mensuelles, du solde réel de trésorerie et de la marge d'exploitation.
*   **Graphiques de Performance** : Histogrammes et courbes de tendance dynamiques représentant les flux de trésorerie récents.
*   **Gestion de l'État de l'Abonnement (Algorithme de Notification Dynamique)** :
    *   **Compte sous Abonnement Actif et Non-Échéant** : Aucun encart de rappel ou bannière intrusive n'est affiché dans l'interface, afin de garantir un espace de travail épuré.
    *   **Abonnement proche de l'échéance (Seuil de $\le 10$ jours)** : Une bannière d'alerte s'affiche dynamiquement en haut de la page d'accueil d'une manière élégante indiquant le nombre de jours exacts restants avant coupure et fournissant un raccourci de paiement.
    *   **Compte en Période d'Essai (TRIAL)** : Un widget de progression visuel est affiché, montrant le pourcentage de la période d'essai de 30 jours écoulée et l'échéance exacte.

#### B. Gestion Commerciale & Financière
*   **Tiers (Clients et Fournisseurs)** :
    *   Annuaire complet avec recherche prédictive, types d'entité, contacts associés, conditions de paiement individuelles et historique des transactions liées.
*   **Produits & Services** :
    *   Catalogue de l'entreprise incluant les références internes (SKU / Codes-barres), fiches de désignation, prix d'achat, prix de vente standard et taux de marge calculé automatiquement.
*   **Transactions** :
    *   Enregistrement rigoureux de tous les mouvements financiers : rentrées d'argent (Ventes clients, subventions) et sorties (Règlements fournisseurs, salaires).
    *   Intégration d'un bouton de facturation rapide générant des liens de paiement sécurisés Wave (`Wave Mobile Money`) configurés à un montant fluide et dynamique.
*   **Finance** :
    *   Analyses graphiques interactives via `Recharts` (diagrammes circulaires de répartition des charges, barres comparatives).
    *   Rapport d'analyse de trésorerie complet, exportable d'un clic.
*   **Charges** :
    *   Gestionnaire analytique des dépenses fixes et variables de l'entreprise (loyers, abonnements tiers, factures d'énergie) avec catégorisation et filtres intelligents.

#### C. Gestion des Stocks
*   **Mouvements de Stocks** :
    *   Historique chronologique des entrées (approvisionnements) et sorties (livraisons clients, pertes).
    *   Indicateur d'état du stock en temps réel avec **système d'alerte automatique de stock bas** (calculé selon un seuil de sécurité ajustable par produit).

#### D. Communication & Support
*   **Chat Interne (K-Chat)** :
    *   Messagerie collaborative en temps réel permettant aux membres d'une même entreprise d'échanger des instructions de gestion opérationnelle.
*   **Tickets de Support** :
    *   Portail d'ouverture de fiches d'assistance pour signaler une anomalie ou poser une question d'utilisation à l'équipe technique de KONTROL ERP.

#### E. Système & Paramètres
*   **Blue AI (L'IA de Pilotage)** :
    *   Module intelligent agissant comme directeur financier virtuel (CFO). Il analyse à la demande l'état de la trésorerie et rédige des analyses stratégiques formelles d'aide à la décision.
*   **Company Hub** :
    *   Personnalisation complète de la fiche d'entreprise, incluant le téléversement de logos personnalisés et la synchronisation des données d'en-tête pour les exports de documents officiels.

---

### 3.2. Tour de Contrôle – Pour les Super-Administrateurs

L'espace super-administrateur est l'organe central de supervision et de maintenance de la plateforme KONTROL :

*   **Supervision de l'Écosystème** :
    *   **Gestion des Entreprises** : Liste de toutes les entreprises clientes inscrites avec modification de leur statut d'abonnement (Actif, Essai, Bloqué) et édition de leurs informations de facturation.
    *   **Suivi des Utilisateurs globaux** : Droits d'accès et révocations pour l'ensemble des comptes créés.
*   **Analyse du Business de la Plateforme** :
    *   **Revenus récurrents (MRR)** : Calcul automatique du revenu mensuel récurrent basé sur le nombre de clients sous licence active (Standardisé à `15 000 XOF` / mois par entreprise active).
    *   **Flux global des transactions** : Console d'audit visualisant toutes les transactions générées à l'échelle de la plateforme pour fins statistiques ou contrôle fiscal.
*   **Coordination des Demandes d'Assistance** :
    *   **Console de Gestion des Tickets** : Attribution des tickets de support client ouverts, mise à jour des statuts (Nouveau, En Cours, Résolu) et réponses directes transmises aux clients.
*   **Maintenance du Système** :
    *   **Status Monitor (Santé Système)** : Diagnostic de performance serveur, temps de réponse applicatif et taux d'utilisation de la base de données.
    *   **Action Audit Logs** : Journal d'audit transparent recensant chaque modification critique (créations de fiches, transactions ou modifications d'accès) pour une traçabilité totale.
    *   **Versions & Mises à jour** : Gestionnaire de déploiement de correctifs applicatifs et de fonctionnalités en direct.

---

## 4. Perfectionnement des Exports Documentaires (PDF & Excel)

Pour garantir des exports officiels hautement professionnels, le système d'édition de documents PDF bénéficie d'une mise en page épurée et optimisée :

1.  **En-tête de Document Ultra-Lisible (Version Épurée)** :
    *   Abandon des arrière-plans sombres d'en-tête qui consomment inutilement de l'encre à l'impression et réduisent le contraste.
    *   Utilisation d'un fond de page blanc immaculé ou gris subtil très clair (`#FDFEFF`), séparé du tableau de données par une fine bordure Slate élégante de `0.5px`.
2.  **Logo KONTROL Vectorisé Haut de Gamme** :
    *   Le logo vectoriel de KONTROL (dessiné à la volée avec l'API canvas PDF) utilise des couleurs vives et parfaitement visibles sur fond clair (Bleu azur `#0284C7`, Orange vif `#F97316` et un indicateur dynamique bleu roi `#2563EB`).
    *   Positionné de manière équilibrée sur le coin supérieur gauche du document, offrant une identité de marque nette et professionnelle.
3.  **Présentation des Données en Tableaux** :
    *   Génération d'audits financiers et rapports d'inventaire avec alignement décimal pour les nombres et police monospace pour les colonnes de chiffres (Idéal pour l'exploitation comptable).
    *   Intégration automatique des informations de l'entreprise (Nom, sigle, contact) et, le cas échéant, de la fiche du client pour les devis ou factures.

---

## 5. Exigences Techniques, Sécurité & Persistance

*   **Persistance Durable des Données** : 
    *   Toutes les données transactionnelles, profils utilisateurs, informations d'entreprises et journaux d'audit sont stockés de manière résiliente sur une base de données cloud Firestore sécurisée.
*   **Résilience du Client & Mode Hors-Ligne** :
    *   Pour parer aux aléas de connexion internet (très fréquents en mobilité), la base de données est configurée pour utiliser des caches locaux persistants multi-onglets (IndexedDB) avec un mécanisme de secours par requêtage persistant (Long Polling) garantissant l'accessibilité continue de l'ERP même sans couverture réseau immédiate.
*   **Cloisonnement & Confidentialité (Security Rules)** :
    *   Sécurité stricte assurant qu'un utilisateur d'une entreprise $A$ ne peut en aucun cas lire ou écrire des fiches financières ou de stock appartenant à l'entreprise $B$.
    *   Seuls les comptes ayant le privilège administratif universel (Super-Administrateurs KONTROL) ont accès à la vue consolidée de la Tour de Contrôle.

---

## 6. Architecture Découplée de Demain : Division Tri-Applicative

Pour répondre au besoin d'expansion et d'étanchéité industrielle de la suite logicielle, KONTROL ERP établit son architecture cible sous la forme de **trois applications distinctes, autonomes et reliées par des interfaces d'API sécurisées**. Chaque composant possède sa propre base de données avec son schéma spécifique (Schema de DB par interface).

### 6.1. Module 1 : L'Application Client / Entreprise (Espace PME)
*   **Nature** : Application Frontend Web SPA (Vite/React) et backend d'orchestration locale des transactions d'affaires. 
*   **Schéma DB Client** : Restreint à la logique métier de l'entreprise locataire.
    *   `transactions` : Ventes et Achats des entités.
    *   `products` : Registre physique des stocks et prix d'achat/vente.
    *   `payments` : Encaissements de trésorerie (Wave ou virement direct).
    *   `tiers` : Fournisseurs, clients et relations commerciales locales.

### 6.2. Module 2 : L'Application Admin / Back-Office (La Tour de Contrôle)
*   **Nature** : Portail d'administration de haute sécurité inaccessible au public, restreint aux administrateurs certifiés via un DNS sécurisé propre.
*   **Schéma DB Admin** : Gère la télémétrie de l'écosystème, les données financières de second niveau (Revenus de la plateforme MRR) et les dossiers de support.
    *   `companies` : Liste des structures clientes de la suite, avec statut d'approbation et validité de licence (`subscriptionStatus` / `subscriptionEndDate`).
    *   `admin_audit_logs` : Journal d'infringement de sécurité, traçabilité des modifications administratives majeures.
    *   `tickets` : Recensement des sollicitations d'assistance technique.

### 6.3. Module 3 : BLUE AI (Le Serveur Sémantique Autonome)
*   **Nature** : Service d’IA décisionnelle décliné en microservice, piloté par un orchestrateur neuronal Python (Python ensemble core), des signatures de bas niveau et des agents LLM.
*   **Schéma DB BLUE AI** : Schéma orienté cognition et continuous-learning. L'IA apprend en continu de chaque retour utilisateur et de chaque action acceptée sur l'application principale d'entreprise, les transformant dynamiquement en scripts et codes d'évaluation à exécuter à chaud.
    *   `blue_brain_training_pairs` : Paires de données d'affinement (`prompt`/`response`) assorties de facteurs probabilistes et de hashes de contrôle anti-intrusion.
    *   `blue_system_cognitive_indexes` : Cartographie des anomalies comptables, vélocité logistique et scores de risque d'octroi de découverts Bridge.

---

## 7. Synthèse des flux applicatifs récurrents

```
[Utilisateur Entreprise]
       │
       ▼
[Interface KONTROL Cloud (IndexedDB Cache + Long Polling Force)]
       │
       ├─► [Abonnement Expirant <= 10 jours ?] ──► Affiche Bannière Alerte + Wave Link (15 000 XOF)
       ├─► [Abonnement Standard Actif] ─────────► Espace Clean sans perturbation publicitaire
       ├─► [Abonnement TRIAL] ──────────────────► Widget de progression de 30 jours
       │
       └─► [Export PDF] ──► Rendus clairs sur fond blanc (#FDFEFF) + Logo KONTROL vif
```

Ce document de spécifications sert de socle pour guider les développements futurs et garantir la cohérence d'utilisation de la plateforme **KONTROL**.

---

## 8. Extensions de Sécurité, Contrôle des Stocks & Notifications Connectées

### 7.1. Gestion Strict du Stock & Blocage de Vente
Pour sécuriser l'exploitation commerciale des entreprises partenaires et interdire les découverts arbitraires, la plateforme intègre un **principe de contrôle strict des flux de stocks** lors de la création d'écritures :
* **Interdiction de Vente à Découvert** : Lors de l'enregistrement d'une vente (transaction `VENTE`), l'ERP vérifie instantanément pour chaque produit ajouté si la quantité disponible en stock est supérieure ou égale à la quantité demandée (`prod.stock >= art.quantite`).
* **Retour Utilisateur Explicite** : Si les stocks sont insuffisants, le système bloque immédiatement la transaction, remonte un message d'erreur d'une grande clarté à l'écran (ex. `Stock insuffisant : [Désignation] ([Dispo] disponibles)`), et empêche l'écriture dans la base de données.

### 7.2. Bouclier de Sécurité Multi-Langages : Rust, Go & Java
La plateforme KONTROL renforce son intégrité et sa protection système en s'appuyant sur trois composants autonomes hautement de niveau entreprise :
1. **Bouclier Interne Rust (Rust Shield - `/backend/rust-shield`)** :
   * Fournit une barrière mémoire imperméable contre les dépassements de mémoire tampon (buffer overflows) et les injections d'entrées malveillantes via des validations de payload strictes sous Linux.
   * Valide algorithmiquement la cohérence des transactions financières au plus bas niveau matériel et produit des signatures d'audit immuables (`TransactionGuard::generate_audit_proof`).
   * Valide rigoureusement les états de stock par comparaison directe de registres via sa brique d'évaluation `verify_stock_integrity`.
2. **Noyau de Pilotage Go (Go Kernel - `/backend/go-kernel`)** :
   * Orchestre la validation des comptes et le cache sécurisé (`SafeCache`) de performance multi-threadé avec protection contre les conditions de concurrence (`sync.RWMutex`).
   * Expose un service d'intégrité de niveau entreprise pour contrôler la validation d'autorisation de stock (`/api/v1/security/verify-stock`), protégeant les opérations d'achat/vente multi-utilisateurs en parallèle.
3. **Moteur Métier Java (Java Enterprise Engine - `/backend/java-core` & `/backend/java-spring`)** :
   * Orchestre la validation des règles de gestion d'entreprise, les scores de risque financier complexe et les intégrations bancaires de haut niveau.
   * Expose un contrôleur REST Spring Boot (`/api/business/verify-stock`) s'appuyant sur l'algorithme `verifyStockIntegrity` du Java Core pour certifier et journaliser l'intégrité opérationnelle des inventaires avant tout déblocage d'écritures ou financements.

### 7.3. Système de Notifications Universel & Interactif
Chaque notification émise dans l'écosystème KONTROL (depuis les alertes d'inventaire bas, les rapports financiers générés par l'IA ou les commentaires de ticket support) est **100% interactive** :
* **Clic Réactif & Ciblé** : Lorsque l'utilisateur clique sur une notification depuis le menu rapide ou le centre dédié, l'application analyse le champ lié `link` (contenant l'identifiant unique formaté tel que `transaction:TX_ID` ou `ticket:TICKET_ID`).
* **Redirection & Sélection Automatique** :
  1. Le système redirige instantanément l'utilisateur vers le module approprié (Transactions, Produits, Partenaires, Charges, ou Support).
  2. Un mécanisme de détection dynamique par événements personnalisés et persistance rapide de session récupère l'identifiant pour sélectionner, surligner et ouvrir la fiche détaillée correspondante automatiquement, libérant l'utilisateur de toute recherche manuelle contraignante.

