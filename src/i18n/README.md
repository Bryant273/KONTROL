# 🌐 SYSTÈME D'INTERNATIONALISATION COMPTABILISÉ — KONTROL I18N MODULE

---
### DOSSIER : `/src/i18n`
**Statut du Module :** Noyau d'Internationalisation et de Traduction Linguistique de la Suite ERP  
**Rôle Principal :** Localisation complète des libellés d'interfaces, devises comptables, documents administratifs et statuts en français et en anglais  
**Moteur de Traduction :** i18next core suite & React-i18next wrapper bindings  
**Gouvernance Intellectuelle :** Division de Traduction & Conformité Juridique Régionale d'**Innov’Korp**

---

## 1. 🏛️ CADRE DE TRADUCTION ET ADÉQUATION MÉTIER
Au cœur de l'Afrique de l'Ouest, les entreprises de taille moyenne et grandes industries de la région UEMOA pilotent le commerce international sous un régime multilingue complexe. L'interopérabilité fluide des services de support technique, de facturation et d'administration exige un système d'internationalisation de premier niveau.

La suite logicielle **KONTROL ERP** intègre une architecture de traduction réactive capable d’adapter l’ensemble du vocabulaire, des formules de calculs, des entêtes analytiques et de la documentation d’aide en fonction de la configuration linguistique préférée de l'opérateur ou de la filiale d'exploitation.

---

## 2. 🗂️ STRUCTURE DU RÉPERTOIRE

```
/src/i18n
├── 📜 README.md                 -> Ce manuel d'architecture de traduction et de corrections
├── 📄 config.ts                 - Fichier de configuration central, initialisation du SDK de traduction
└── 📂 locales/                  -> Dictionnaires de glossaires linguistiques JSON
    ├── fr.json                  - Traduction exhaustive française (Conforme OHADA & UEMOA)
    └── en.json                  - Traduction exhaustive anglaise (Pour les opérations internationales)
```

---

## 3. ⚙️ PROCESSUS ET CONFIGURATION DU NOYAU : `config.ts`
La configuration de l’API `i18next` est initialisée au début du cycle de vie de l’application. Le fichier `config.ts` configure l'unification :

*   **Détection dynamique de langue** : Le système interroge d'abord les paramètres d'exploitation sauvegardés de l'utilisateur. Si aucun n'est présent, il analyse la pile linguistique du navigateur de l'appareil client pour s'adapter instantanément.
*   **Langue de repli (Fallback)** : En cas d'indisponibilité, la langue de repli universelle est configurée sur le Français (`fr`), qui représente la langue de travail légale de la zone d'affaires OHADA.
*   **Neutralisation des fuites de mémoire (react-i18next)** : Le Wrapper de liaison réactive est configuré pour éluder les re-rendus inutiles d'écrans lors d'un basculement de dictionnaire.

---

## 4. 🧑‍💻 ANALYSE DE L'INCIDENT MAJEUR RÉSOLU SUR `common.status`

Lors des audits d'intégration de la version 3.1.2 de la plateforme ERP, un incident technique critique lié à l'internationalisation sémantique a été résolu de manière durable au sein de ce module par nos ingénieurs en cybersécurité et typage.

### 4.1 La Problématique d'Objet Brute (Fatal Render Crash)
Pour désigner génériquement le statut d'un élément au sein d'une table d'inventaires physiques de produits, ou d'un registre de facturations géré par l'ERP, l’ancien code appelait :
```typescript
{t('common.status')}
```
*   **Le Conflit Structurel** :
    Dans le référentiel français `locales/fr.json`, le mot clé `"status"` n'était pas associé à une simple chaîne de caractères pour désigner une colonne de tableau. Il servait d'espace racine et d'emplacement parent stockant l'ensemble associatif des états logiques d'abonnements des dossiers entreprises de la base :
    ```json
    "status": {
      "active": "Actif",
      "expired": "Expiré",
      "pending": "En attente"
    }
    ```
*   **Conséquences sur l'Écran de l'ERP** :
    Face à cet appel, l'intercesseur `i18next` résolvait la requête en extrayant l'objet imbriqué tout entier au lieu de retourner un simple mot de désignation (String). React, de manière structurelle, ne tolère pas le rendu d'un objet JavaScript brut au sein du DOM virtuel. L'application interrompait aussitôt son exécution avec le message fatal : `"key 'common.status (fr)' returned an object instead of string"`. Ce blocage empêchait complètement l'opérateur d'exploiter les rapports financiers et de concevoir des certificats, car le moteur d’impression à la volée se heurtait également à cette anomalie de typage lexicale.

---

### 4.2 La Correction Durable par Découplage : `common.status_label`
Les dictionnaires de langues `fr.json` et `en.json` ont été restructurés et optimisés de sorte à découpler de manière distincte les objets d’états et les étiquettes de colonnes nominatives :

1.  **Instauration d'une Clé Dédiée Simplifiée pour les Tables** :
    *   Fichier français (`fr.json`) : `"status_label": "Statut"`
    *   Fichier anglais (`en.json`) : `"status_label": "Status"`
2.  **Mise à jour des Dépendances** :
    Sur l'ensemble des modules d'inventaires de produits, de bilans compta de trésorerie de `FinanceModule` et de facturations de `TransactionsModule`, l'en-tête de colonne de tableau et l'étiquette d'affichage pointent de façon univoque vers la clé scalaire épurée :
    ```typescript
    {t('common.status_label')}
    ```
    Cette correction a éliminé toute vulnérabilité d'affichage ou d'assertion de types, permettant à la plateforme ERP KONTROL de compiler de manière irréprochable avec une robustesse maximale en phase de production globale.

---

## 5. 👥 GLOSSAIRE DE CONFORMITÉ ET SÉMANTIQUE TECHNIQUE

Les fichiers de traductions de KONTROL ERP respectent des règles lexicales précises édictées par la direction de l'écosystème commercial :
1.  **Dénomination de Marque Assistant** : L’outil d'aide à la décision stratégique prévisionnelle est unilatéralement nommé **BLUE AI** (sans fioriture complémentaire).
2.  **Humble Libellé d'État** : L'assistant est décrit de manière humble et sobre par l'étiquette **Assistant virtuel** (en français) ou **Virtual Assistant** (en anglais), évitant les superflus marketing pour se conformer à la de Charte de Sobriété Technologique d'Innov'Korp.
3.  **Vérifications de Validité de Licences** : L'état d'un paiement ou d'une validation d'abonnement en suspens dans la Control Tower est traduit par **En attente** (Fr) ou **Pending** (En), s'insérant de façon harmonieuse dans le protocole d'habilitation et de contrôle manuels.
4.  **Devise de Référence** : L’ensemble des calculs chiffrés sont désignés à l'aide de l'acronyme officiel unifié **F CFA** (Français) ou **FCFA** (Anglais), garantissant une totale clarté aux comptables sur le terrain.
