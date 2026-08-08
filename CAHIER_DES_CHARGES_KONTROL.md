# Cahier des Charges & Spécifications Fonctionnelles – KONTROL ERP

**Version d'Écosystème & de Saisie Unique :** Version 1.0.0 (Alignée sur l'Interface Utilisateur active)  
**Sécurité & Intégration API :** Architecture Full-Stack sécurisée unifiée par variables d'environnement distantes. Passerelles de paiement (GeniusPay, Kkiapay, Wave) et clés d'Intelligence Artificielle (Gemini API) gérées côté serveur.

Ce document constitue la référence exhaustive de l'architecture fonctionnelle, des processus de souscription, de l'imputation documentaire certifiée, de l'interface utilisateur, du système de guidage interactif et des exigences logicielles de la plateforme **KONTROL**, un ERP de Gestion Intelligente pour les Petites et Moyennes Entreprises (PME).

---

## 1. Présentation Générale de l’Application

**KONTROL** est un Écosystème ERP Full-Stack modulaire permettant de centraliser l'intégralité du pilotage opérationnel et financier des entreprises. Il résout la fragmentation des données en interconnectant les achats, les ventes, les stocks, la trésorerie, la facturation certifiée, les abonnements, le guidage utilisateur pas à pas et le conseil stratégique assisté par l'Intelligence Artificielle.

L'application est dédiée aux dirigeants, comptables et gestionnaires pour administrer l'activité commerciale quotidienne, gérer l'empreinte documentaire (signatures/cachets) et suivre leur abonnement en toute autonomie.

---

## 2. Charte Graphique, Identité Visuelle & Expérience Utilisateur (UX/UI)

L'interface de KONTROL respecte une charte professionnelle stricte, privilégiant l'élégance, la clarté et un fort contraste visuel.

* **Palette de Couleurs** : 
  * Fonds principaux : Blanc brillant et nuances douces ardoise (`slate-50` à `slate-100`) pour limiter la fatigue visuelle.
  * Teintes d'accentuation : Bleu institutionnel KONTROL (`#0284C7`), Bleu royal vif pour les actions clés (`#2563EB`), Vert émeraude pour les confirmations (`#10B981`) et Ambre/Orange pour les alertes de souscription (`#F59E0B`).
  * Textes : Gris très sombre (`#0F172A`, `slate-900`) garantissant un contraste conforme aux normes WCAG AA.
* **Typographie** :
  * Titres & En-têtes : **Space Grotesk** pour un rendu technologique et affirmé.
  * Corps de texte & UI générale : **Inter** / **Plus Jakarta Sans** pour une lisibilité optimale.
  * Données chiffrées & Logs d'audit : **JetBrains Mono** pour un alignement tabulaire irréprochable.
* **Animations & Micro-interactions** : Transitions réactives fluides via `motion` (fondu à l'apparition, expansion des menus latéraux, états réactifs au survol des cartes et boutons).
* **Système de Guidage Interactif Intégré (`AppGuideAssistant`)** :
  * Assistant de visite guidée en surimpression avec détourage optique dynamique (spotlight SVG cutout) encadrant précisément l'élément cible sur l'écran.
  * Parcours d'onboarding contextuel structuré pour chacun des 18 modules fonctionnels.
  * Conseils d'experts métier ("Astuces KONTROL Pro") intégrés à chaque étape du parcours.

---

## 3. Description Détaillée des Modules Opérationnels

L'expérience utilisateur s'articule autour des grandes sections de navigation :

### A. Pilotage (Tableau de bord)
* **Visualisation des KPIs Clés** : Cartes synthétiques des ventes, des charges mensuelles, du solde réel de trésorerie et de la marge d'exploitation.
* **Graphiques de Performance** : Histogrammes et courbes de tendance dynamiques représentant les flux de trésorerie récents (`Recharts`).
* **Suivi d'Abonnement Temps Réel & Calculateur de Précision** :
  * **Indicateur d'Abonnement en cours** : Affiche en haut de tableau de bord le statut d'abonnement actif ou période d'essai VIP avec badge visuel.
  * **Décompte de Précision Temps Réel** : Affiche dynamiquement les jours et heures restants (ex: `12j 18h restants`) mis à jour en direct via un timer réactif.
  * **Barre de Progression Fonctionnelle** : Calcule le pourcentage exact consommé de la période de souscription (`elapsedPercent`) en comparant la date de souscription/contrat (`contractSignedAt`/`createdAt`) et la date d'échéance (`subscriptionEndDate`).
  * **Bouton d'Action Directe "Gérer l'offre" / "Renouveler"** : Redirige vers le module d'abonnements pour souscrire ou régulariser.

### B. Gestion Commerciale, Financière & Facturation
* **Tiers (Clients et Fournisseurs)** : Annuaire complet avec recherche prédictive, types d'entité, contacts associés, conditions de paiement individuelles et historique des transactions liées.
* **Produits & Services** : Catalogue complet des articles et services (sans masque ou filtrage restrictif par date du jour, affichage exhaustif garanti) avec références (SKU), prix d'achat, prix de vente standard, marge brute, filtres par statut de stock et suivi automatique des niveaux de stock.
* **Transactions & Encaissements Multi-Canaux** :
  * Enregistrement des ventes et achats avec déduction/réapprovisionnement instantané des stocks.
  * **Passerelles de Paiement Intégrées (GeniusPay & Kkiapay & Wave)** : Génération de liens de paiement rapides et boutons sécurisés pour encaissement par Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money) ou Carte Bancaire.
* **Finance & Trésorerie** : Analyses graphiques interactives via `Recharts`, rapports de liquidités exportables et calcul de l'éligibilité au financement de trésorerie.
* **Charges** : Gestionnaire analytique des dépenses fixes et variables (loyers, électricité, abonnements tiers) avec catégorisation et filtres intelligents.
* **Devis & Propositions Commerciales** : Création de devis personnalisés, suivi des statuts de validation et conversion instantanée en facture définitive sans re-saisie.

### C. Gestion des Stocks
* **Mouvements de Stocks** : Historique chronologique des entrées (approvisionnements) et sorties (livraisons clients, pertes).
* **Contrôle Strict contre Vente à Découvert** : Blocage systématique à la saisie de vente si la quantité en stock est insuffisante avec message explicite.
* **Alerte de Stock Bas** : Indicateur visuel d'état du stock avec seuil de sécurité personnalisable.

### D. Communication & Assistance
* **Chat Interne (K-Chat)** : Messagerie collaborative en temps réel permettant aux membres d'une même entreprise d'échanger des instructions opérationnelles.
* **Tickets de Support** : Portail d'ouverture et de suivi de fiches d'assistance pour vos demandes auprès du support KONTROL.

### E. Système, Paramètres, Signature & Guidage
* **Assistant Guide Interactif (`/guide`)** :
  * Déclenchement automatique lors de la première découverte d'un module ou sur demande via le bouton d'aide du header (`Guide Interactif`).
  * Découpage pédagogique : Titre de l'élément, badge de fonction, description d'usage et astuce métier Pro.
  * Repérage automatique d'éléments dans le DOM avec centrage fluide (`scrollIntoView`) et masque d'ombrage interactif.
* **Signature & Cachet Officiel d'Entreprise (`/signature`)** :
  * Module dédié dans le menu Système pour téléverser l'image officielle de la signature manuscrite ou du tampon d'entreprise (PNG/JPG jusqu'à 5 Mo).
  * Aperçu en temps réel de l'apposition sur les spécimens de contrats, factures et devis.
  * **Apposition Automatique Certifiée** : L'image de la signature enregistrée est automatiquement intégrée lors des éditions PDF de contrats d'abonnement, factures et devis.
* **Company Hub / Profil d'Entreprise** : Fiche d'identité commerciale, logo d'entreprise, coordonnées de facturation et synchronisation des données d'en-tête.
* **Blue AI (Assistant Virtuel CFO)** : Module d'IA décisionnelle analysant les flux financiers, rédigant des rapports de gestion stratégiques et suggérant des optimisations de trésorerie.
* **Échange de Données XML** : Import et export structuré de fichiers XML pour l'interopérabilité comptable.

---

## 4. Processus Contractuel, Signature Électronique & Certifications

### 4.1. Contrat d'Abonnement Électronique (Cadre Légal OHADA & Côte d'Ivoire)
Conformément aux **Articles 28 à 35 de la Loi n° 2013-546 du 30 juillet 2013 relative aux transactions électroniques en Côte d'Ivoire** et aux dispositions de l'**Acte Uniforme OHADA**, la plateforme intègre un parcours de signature électronique à valeur juridique :

1. **Modal de Contrat d'Abonnement (`SubscriptionContractModal`)** :
   * Présentation des CGU, des engagements réciproques, du rôle des administrateurs d'entreprise et des modalités de renouvellement à 30 jours.
2. **Import Préalable ou Intégré de la Signature** :
   * L'entreprise peut importer son image de signature/cachet directement depuis le modal de contrat ou depuis la page dédiée `Signature & Cachet`.
3. **Acceptation & Horodatage Certifié** :
   * Validation par le représentant habilité enregistrant le nom du signataire, la date et l'heure exactes, le statut d'approbation et l'empreinte visuelle du tampon.
4. **Export PDF du Contrat Officiel (`contract.ts`)** :
   * Génération automatique du document PDF officiel certifié KONTROL incluant les clauses juridiques, l'en-tête de l'entreprise, le sceau de sécurité et la signature numérique apposée.

### 4.2. Apposition Automatique sur les Factures & Devis (`invoice.ts`)
Toute facture ou devis édité au format PDF intègre automatiquement :
* Le logo de l'entreprise et le logo certifié KONTROL.
* Le bloc de vérification de sécurité (Clé SHA-256 de certification).
* **L'image officielle du tampon et de la signature de l'entreprise** en bas de document, éliminant tout besoin d'impression et d'apposition manuscrite ultérieure.

---

## 5. Intégrations de Paiement (GeniusPay, Kkiapay, Wave)

Pour fluidifier le règlement des abonnements et des factures clients, KONTROL intègre un sous-système de paiement multi-options :

1. **Paiement d'Abonnement KONTROL** :
   * Intégration directe des passerelles **GeniusPay** et **Kkiapay** permettant le paiement instantané par Mobile Money (Wave, Orange Money, MTN Mobile Money, Moov Money) et cartes bancaires (Visa, Mastercard).
   * Validation automatique de l'abonnement dès confirmation de paiement.
2. **Règlement Rapide des Factures Clients** :
   * Génération de liens d'encaissement direct et codes QR Wave / Kkiapay configurés dynamiquement au montant exact de la facture.

---

## 6. Architecture Technique & Sécurité

### 6.1. Persistance & Haute Disponibilité
* **Base de Données Cloud Firestore Multi-Tenant** : Stockage sécurisé avec isolation stricte des données par `companyId`.
* **Résilience Hors-Ligne (IndexedDB & Long Polling)** : Cache local persistant assurant la continuité de saisie en cas d'instabilité du réseau internet.

### 6.2. Bouclier Multi-Langages de Sécurité (Rust, Go & Java)
* **Rust Shield (`/backend/rust-shield`)** : Validation bas niveau contre les débordements de mémoire, hachage immuable des transactions et vérification d'intégrité de registre de stock.
* **Go Kernel (`/backend/go-kernel`)** : Cache sécurisé multi-thread (`sync.RWMutex`) et vérification d'autorisation de stock à haute concurrence.
* **Java Core Engine (`/backend/java-core`)** : Contrôleur d'intégrité d'inventaires et calcul des règles de risques bancaires.

---

## 7. Synthèse des Flux Opérationnels

```
[Utilisateur Entreprise]
       │
       ├─► [Guide Interactif / AppGuideAssistant] ─────────────► Découverte pas à pas avec Spotlight
       │                                                         │
       ├─► [Menu Système -> Signature & Cachet] ──► Téléversement Image Signature/Tampon
       │                                                         │
       ├─► [Souscription / Modale Contrat] ──────────────────────┼─► Apposition Automatique sur PDF
       │     (Signature Électronique + CGU OHADA)                │   (Contrats, Factures & Devis)
       │                                                         │
       ├─► [Règlement Abonnement] ───────────────────────────────┴─► GeniusPay / Kkiapay / Wave
       │     (Paiement Mobile Money & Carte)
       │
       └─► [Tableau de Bord / Pilotage] ──► Suivi Temps Réel "Abonnement en cours" + Décompte (Jours/Heures)
                                           + Barre de Progression Réelle (% Écoulé)
```

---
*Ce document constitue le cahier des charges officiel mis à jour pour la version 1.0.0 de la plateforme **KONTROL ERP**.*usPay / Kkiapay / Wave
       │     (Paiement Mobile Money & Carte)
       │
       └─► [Tableau de Bord / Pilotage] ──► Suivi Temps Réel "Abonnement en cours" + Décompte (Jours/Heures)
                                           + Barre de Progression Réelle (% Écoulé)
```

---
*Ce document constitue le cahier des charges officiel mis à jour pour la version 1.0.0 de la plateforme **KONTROL ERP**.*
