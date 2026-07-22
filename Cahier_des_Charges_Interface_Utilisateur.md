# Cahier des Charges — Interface Utilisateur (UI/UX)
## Application Web de Prédiction de Performance Académique — ISI-SUPETCH

---

## 1. Objet du document

Ce cahier des charges définit les exigences graphiques, ergonomiques et fonctionnelles applicables à l'ensemble des interfaces de l'application (page d'accueil, page de connexion, tableau de bord Étudiant, tableau de bord Administrateur). Il complète le PRD et sert de référence pour le maquettage et l'intégration.

**Principe directeur :** chaque écran doit respecter (1) la charte graphique définie ci-dessous et (2) les règles d'authentification et de statut de compte, sans exception.

---

## 2. Direction artistique

### 2.1 Concept
L'identité visuelle s'organise autour d'une idée simple : **la trajectoire de l'étudiant**. Chaque note, chaque présence, dessine une courbe qui monte ou descend. Cette courbe de trajectoire devient le **signe distinctif** de l'application : on la retrouve dans le mark du logo, en filigrane sur l'écran de connexion, comme motif de chargement, et comme élément graphique dans les cartes de statistiques.

L'ensemble doit dégager du sérieux académique (l'institution, la confiance) sans tomber dans le froid administratif : couleurs profondes, typographie soignée, alertes lisibles mais non alarmistes.

### 2.2 Palette de couleurs

| Nom | Hex | Usage |
|---|---|---|
| Encre Nocturne | `#1B2A4A` | Couleur primaire — barre de navigation, en-têtes, texte fort |
| Brume Académique | `#EEF1F6` | Fond général de l'application (léger, froid, non blanc pur) |
| Sauge Réussite | `#4C7A64` | Statut « réussite probable / faible risque », validations |
| Ambre Vigilance | `#D98E3F` | Statut « risque modéré », alertes à surveiller |
| Brique Alerte | `#A83E32` | Statut « risque élevé », erreurs, compte désactivé |
| Indigo Trajectoire | `#3D5A99` | Accent des courbes, liens actifs, éléments interactifs |

> Règle : les couleurs de statut (Sauge / Ambre / Brique) sont **réservées exclusivement** à la signalétique de risque et d'état de compte. Elles ne doivent jamais être utilisées comme couleurs décoratives ailleurs, afin de préserver leur valeur de signal.

### 2.3 Typographie

| Rôle | Police | Usage |
|---|---|---|
| Display / Titres | **Fraunces** (serif, empattements marqués) | Titres de page, nom de l'application, moments clés (résultat de prédiction) |
| Corps de texte | **Inter** (sans-serif humaniste) | Textes courants, formulaires, navigation |
| Données / chiffres | **IBM Plex Mono** | Notes, taux d'assiduité, pourcentages — pour donner un rendu « tableau de bord » lisible et précis |

Échelle type suggérée : 12 / 14 / 16 / 20 / 28 / 40 px, graisses 400 (texte), 500 (labels), 600–700 (titres).

### 2.4 Signature visuelle
**« La Courbe de Trajectoire »** : une ligne fine et continue, en Indigo Trajectoire, qui trace une évolution (montée = réussite, descente = risque). Elle apparaît :
- en arrière-plan discret de l'écran de connexion ;
- comme mini-graphique dans chaque carte « résultat de prédiction » ;
- comme animation de chargement (la ligne se dessine progressivement) lors du calcul d'une prédiction.

### 2.5 Composants graphiques communs
- **Cartes** : coins arrondis (8–12 px), ombre légère, fond blanc sur fond Brume Académique.
- **Badges de statut** : pastille colorée + libellé texte (jamais la couleur seule, pour l'accessibilité) — ex. `● Risque élevé`.
- **Boutons** : primaire (Encre Nocturne, texte blanc), secondaire (contour Encre Nocturne), destructif (Brique Alerte) réservé aux actions de désactivation de compte.
- **Navigation** : barre latérale fixe (desktop) devenant menu inférieur ou menu « hamburger » (mobile).

---

## 3. Exigences transverses d'authentification

Ces règles s'appliquent à **toutes** les interfaces, quel que soit le rôle.

### 3.1 Écran de connexion
- Formulaire unique (identifiant + mot de passe) avec sélection implicite du rôle selon le compte.
- Message d'erreur explicite et non technique en cas d'échec (« Identifiant ou mot de passe incorrect »).
- Aucune indication ne doit permettre de deviner si un compte existe ou non (sécurité).
- Lien « Mot de passe oublié » (procédure à définir avec l'administration).

### 3.2 Vérification du statut de compte
- À **chaque connexion** et à **chaque rechargement** du tableau de bord Étudiant, le système vérifie si le compte est actif.
- Si le compte est **désactivé** :
  - L'étudiant est redirigé vers un écran dédié (pas d'accès au tableau de bord, ni aux résultats de prédiction).
  - Message clair, en Brique Alerte : *« Votre accès est actuellement désactivé. Motif : [non-paiement des frais de scolarité / décision administrative]. Veuillez contacter l'administration. »*
  - Aucune donnée de note, d'assiduité ou de prédiction n'est affichée sur cet écran.
- Le statut du compte (actif/inactif) doit être visible en un coup d'œil pour l'administrateur, sur chaque fiche étudiant.

### 3.3 Session et sécurité
- Déconnexion automatique après une durée d'inactivité définie.
- Bouton de déconnexion accessible depuis tous les écrans authentifiés.
- Les zones réservées à l'administrateur sont inaccessibles à un compte de rôle « étudiant » (contrôle d'accès par rôle, pas seulement masquage visuel).

---

## 4. Tableau de bord Étudiant

### 4.1 Objectif de l'écran
Permettre à l'étudiant de comprendre, en un coup d'œil, sa situation académique et son niveau de risque — uniquement si son compte est actif.

### 4.2 Structure (desktop)
```
┌─────────────────────────────────────────────────────┐
│  [Logo]              Tableau de bord   [Nom][Déco.]  │
├───────────┬─────────────────────────────────────────┤
│           │  Bonjour, {Prénom}                       │
│  Menu     │  ┌───────────────┐  ┌──────────────────┐ │
│  - Accueil│  │ Résultat de   │  │ Courbe de         │ │
│  - Notes  │  │ prédiction    │  │ trajectoire       │ │
│  - Assid. │  │ ● Risque      │  │ (notes/assiduité) │ │
│  - Profil │  │   modéré      │  └──────────────────┘ │
│           │  └───────────────┘                       │
│           │  ┌───────────────────────────────────┐   │
│           │  │ Détail des notes par matière       │   │
│           │  └───────────────────────────────────┘   │
│           │  ┌───────────────────────────────────┐   │
│           │  │ Taux d'assiduité                    │   │
│           │  └───────────────────────────────────┘   │
└───────────┴─────────────────────────────────────────┘
```

### 4.3 Contenus obligatoires
- Carte « Résultat de prédiction » : niveau de risque (badge coloré), courte explication en langage clair (pas de jargon statistique).
- Mini-courbe de trajectoire (évolution récente).
- Tableau des notes par matière et par période.
- Indicateur du taux d'assiduité (en %, avec seuil visuel).
- Aucune action de modification des données par l'étudiant (lecture seule).

### 4.4 Cas particulier — compte désactivé
Voir §3.2. L'étudiant ne doit jamais atteindre cet écran si son compte est inactif ; il est intercepté avant l'affichage.

---

## 5. Tableau de bord Administrateur

### 5.1 Objectif de l'écran
Donner à l'établissement une vue d'ensemble des étudiants, de leurs résultats de prédiction, et un contrôle sur l'activation des comptes.

### 5.2 Structure (desktop)
```
┌─────────────────────────────────────────────────────┐
│  [Logo]         Espace Administration  [Nom][Déco.]  │
├───────────┬─────────────────────────────────────────┤
│  Menu     │  Vue d'ensemble                          │
│  - Accueil│  ┌────────┐ ┌────────┐ ┌────────────┐    │
│  - Étud.  │  │ Total  │ │ À      │ │ Comptes    │    │
│  - Comptes│  │ étud.  │ │ risque │ │ désactivés │    │
│  - Alertes│  └────────┘ └────────┘ └────────────┘    │
│           │  ┌───────────────────────────────────┐   │
│           │  │ Liste des étudiants                │   │
│           │  │ Nom | Classe | Risque | Statut cpt │   │
│           │  │                          [●Actif]  │   │
│           │  │                          [○Inactif]│   │
│           │  └───────────────────────────────────┘   │
└───────────┴─────────────────────────────────────────┘
```

### 5.3 Contenus obligatoires
- Indicateurs synthétiques (nombre total d'étudiants, nombre à risque, nombre de comptes désactivés).
- Table des étudiants avec, pour chaque ligne : niveau de risque, **statut de compte visible**, action rapide « Activer / Désactiver ».
- Formulaire de saisie/import des notes et de l'assiduité.
- Page « Comptes » dédiée : historique des activations/désactivations avec date et motif (traçabilité — cf. PRD FR-17).
- Page « Alertes » : liste des étudiants ayant déclenché une alerte de risque élevé.

### 5.4 Règle de désactivation
Toute action de désactivation doit :
- demander une confirmation explicite (modale) ;
- proposer un champ motif (ex. « Non-paiement des frais de scolarité », « Autre décision administrative ») ;
- être historisée automatiquement.

---

## 6. Exigences de compatibilité et de responsive design

| Support | Comportement attendu |
|---|---|
| **Desktop** (≥ 1200 px) | Disposition complète avec menu latéral fixe, cartes en grille |
| **Tablette** (768–1199 px) | Menu latéral réductible en icônes, cartes en 2 colonnes |
| **Smartphone** (< 768 px) | Menu latéral remplacé par un menu inférieur ou « hamburger », cartes empilées en 1 colonne, tableaux transformés en listes de cartes |

- Aucune information critique (résultat de prédiction, statut de compte) ne doit être masquée ou tronquée sur mobile.
- Les zones cliquables (boutons, liens) respectent une taille minimale tactile de 44×44 px sur mobile.

---

## 7. Accessibilité

- Contraste minimum AA (WCAG 2.1) entre texte et fond, y compris pour les badges de statut colorés.
- Chaque badge de statut couleur est doublé d'un libellé texte (ne jamais coder l'information uniquement par la couleur).
- Navigation clavier complète (focus visible) sur les formulaires de connexion et d'administration.
- Textes alternatifs sur les graphiques (courbe de trajectoire) décrivant la tendance (ex. « tendance à la baisse sur les 3 dernières évaluations »).

---

## 8. Page d'accueil (site vitrine)

Cette section s'inspire de la structure éprouvée d'un site de référence du secteur (gestionecole.site — plateforme de gestion scolaire), **adaptée au sujet de la prédiction de performance académique** et à la charte graphique définie en §2 (et non à la palette bleue générique du site de référence).

### 8.1 Objectif de la page
Présenter le projet ISI-SUPETCH avant connexion : convaincre de son utilité, expliquer son fonctionnement, et orienter chaque profil (étudiant, administrateur) vers son espace de connexion.

### 8.2 En-tête (header)
- Logo + nom de l'application, fixe en haut de page (sticky).
- Navigation : *Fonctionnalités* · *Comment ça marche* · *Contact*.
- Bouton « Connexion » en haut à droite (bouton primaire, Encre Nocturne).

### 8.3 Section d'accueil (hero)
- Accroche courte centrée sur le bénéfice, ex. : *« Anticipez les difficultés académiques avant qu'il ne soit trop tard »*.
- Sous-titre expliquant en une phrase le principe (notes + assiduité → prédiction → alerte précoce).
- Bouton d'action principal : « Accéder à mon espace ».
- Chiffres clés (à titre d'exemple, à remplacer par des données réelles du projet) :

| Métrique | Exemple |
|---|---|
| Étudiants suivis | *(à définir)* |
| Précision du modèle | *(issue de l'évaluation ML, cf. PRD §11)* |
| Alertes générées | *(à définir)* |

- Illustration : mini-aperçu du tableau de bord Étudiant, avec la **courbe de trajectoire** bien visible (élément signature repris de la charte, §2.4).

### 8.4 Section « Fonctionnalités »
Grille de cartes (icônes + titre + description courte), reprenant les modules du PRD :

| Fonctionnalité | Description courte |
|---|---|
| Gestion des étudiants | Fiches étudiants, notes, historique par classe |
| Suivi de l'assiduité | Taux de présence par période |
| Prédiction académique | Modèle de Machine Learning identifiant les étudiants à risque |
| Alertes précoces | Notification automatique dès qu'un seuil de risque est atteint |
| Gestion des comptes | Activation / désactivation d'accès par l'administration |
| Historique & traçabilité | Suivi des changements de statut de compte et des prédictions passées |

### 8.5 Section « Comment ça marche »
Parcours en 3 étapes (numérotées, car il s'agit d'une réelle séquence) :
1. **Saisie des données** — notes et assiduité enregistrées par l'établissement.
2. **Calcul de la prédiction** — le modèle ML évalue le niveau de risque de chaque étudiant.
3. **Alerte & accompagnement** — l'administration et l'étudiant (si compte actif) sont informés, une intervention peut être organisée.

### 8.6 Section « Accédez à votre espace »
Deux cartes de connexion, correspondant aux rôles du projet (contrairement au site de référence qui en propose trois — Administrateur / Professeur / Parent — le périmètre actuel ne couvre que deux rôles, cf. PRD §5) :

| Carte | Contenu |
|---|---|
| **Étudiant** | « Consultez vos notes, votre assiduité et le résultat de votre prédiction » → lien vers connexion étudiant |
| **Administrateur** | « Gérez les étudiants, les comptes et suivez les alertes de risque » → lien vers connexion admin |

> Évolution possible : une troisième carte « Encadreur / Professeur » pourrait être ajoutée si ce rôle est intégré au périmètre (cf. PRD §5, persona Encadreur).

### 8.7 Section « Aperçu de l'application »
Captures d'écran (ou maquettes) du tableau de bord Étudiant et du tableau de bord Administrateur, présentées côte à côte ou en onglets, pour donner un aperçu concret avant connexion — sans jamais exposer de données réelles d'étudiants (utiliser des données fictives).

### 8.8 Pied de page (footer)
- Liens : Fonctionnalités, Contact.
- Coordonnées de contact de l'établissement / de l'équipe projet.
- Mention légale minimale (ex. politique de confidentialité si applicable).
- Copyright ISI-SUPETCH.

### 8.9 Points de vigilance par rapport au site de référence
- Ne pas reprendre la couleur bleue générique (`#2563eb`) du site inspirant : conserver strictement la palette définie en §2.2.
- Ne pas afficher de tarification (le projet n'est pas un produit commercial) — cette section du site de référence est **hors périmètre**.
- Adapter les rôles de connexion : 2 rôles (Étudiant, Administrateur) au lieu de 3.
- Conserver l'idée d'un aperçu applicatif en avant-connexion, mais avec la courbe de trajectoire comme élément différenciant plutôt qu'un simple tableau de statistiques.

---

## 9. Livrables attendus

1. Maquettes haute-fidélité (desktop, tablette, mobile) pour : page d'accueil, connexion, écran « compte désactivé », tableau de bord Étudiant, tableau de bord Administrateur, gestion des comptes.
2. Design system minimal : palette, typographie, composants (boutons, badges, cartes, tableaux) documentés.
3. Prototype cliquable pour validation avec l'encadreur avant développement.

---

## 10. Critères de validation du design

- Chaque écran respecte la palette et la typographie définies (§2).
- Aucun écran authentifié n'est atteignable sans vérification préalable du rôle et du statut de compte (§3).
- Les deux tableaux de bord (Étudiant, Administrateur) contiennent l'ensemble des contenus obligatoires listés (§4.3 et §5.3).
- L'interface reste pleinement utilisable et lisible sur les trois formats cibles (§6).
