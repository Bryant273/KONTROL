# 🎨 DOSSIER DES RESSOURCES STATIQUES ET VISUELLES — SYSTEM KONTROL

---
### DOSSIER : `/public`
**Statut du Module :** Répertoire public des médias d'affichage et vecteurs d'interface  
**Rôle Principal :** Optimisation et fourniture des fichiers d'assets statiques chargés directement par le client navigateur  
**Gouvernance Intellectuelle :** Département Design & Expérience Utilisateur d'**Innov’Korp**

---

## 1. 📂 CONTENU ET UTILISATION DU RÉPERTOIRE
Le dossier `/public` contient l'ensemble des fichiers bruts servis de manière directe par le serveur Express en production ou par l'environnement de développement Vite. Ces fichiers échappent au pipeline de traitement et de transpilations JS/TS de Vite et sont distribués sans modification de nom (pas de hachage de production).

```
/public
└── 🌀 favicon.svg               - Icône vectorielle universelle de la suite KONTROL
```

---

## 2. 🌀 SPÉCIFICATION DE L'ICÔNE SYSTEM : `favicon.svg`
L’identité de marque d'**Innov’Korp** repose sur une esthétique épurée et d’un haut niveau de contraste. L'icône système de KONTROL ERP est modélisée par un graphique vectoriel XML pur (`.svg`) à haute résolution :
*   **Performance** : Le fichier pèse moins de 2 Ko, s'affranchissant des lourdeurs des anciens formats d'icônes multi-résolution (`.ico` ou `.png`).
*   **Rendu Visuel** : S'adapte dynamiquement selon la configuration du mode d'affichage de l'appareil client (mode clair ou sombre du système d'exploitation).

---

## 3. 📋 DIRECTIVES DESIGN ET INSTRUCTIONS D'EXPLOITATION

Dans le cadre du respect de la **Charte de Sobriété Technologique d'Innov'Korp**, le dépôt de nouvelles ressources statiques est assujetti à d'importantes règles de contrôle :

### 3.1 Interdiction de Formats Lourds ou Non Compressés
Les images d’arrière-plan décoratifs volumineuses, les bannières lourdes sans intérêt fonctionnel de type illustrations d'ambiance et les captures d'écrans factices sont formellement bannis pour garantir une vitesse d'affichage instantanée aux employés connectés via des réseaux mobiles saturés en zone rurale.
*   **Privilégier le SVG** : Pour l'ensemble des illustrations d’angles d'écrans ou de cartes logiques, le format SVG doit rester l'unique option.
*   **Compression Rationnelle** : Si l'utilisateur importe une photo de profil d'employé ou un logo d'entreprise réelle, l'ERP l'oriente vers la base Cloud Firestore uniquement après une phase de redimensionnement et sous-échantillonnage de l'image (format WebP recommandé).

### 3.2 Placeholders Dynamiques et Mocking Propre
Le système d’affichage des modules frontaux (comme `FinanceModule` ou `TransactionsModule`) n'embarque pas d'illustrations factices de décoration. Si une marque d'entreprise n'a pas configuré d'image officielle, l’application génère directement au format HTML et CSS des initiales vectorielles de prestige encadrées par une couleur de fond sobre, éliminant tout appel superflu vers des serveurs d'images distants.
