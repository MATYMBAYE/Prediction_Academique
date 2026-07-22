# Product Requirements Document (PRD)
## Application Web de Prédiction de Performance Académique des Étudiants
### Cas d'étude : ISI-SUPETCH

---

## 1. Informations générales

| Élément | Détail |
|---|---|
| Établissement | ISI DIEUPPEUL |
| Étudiant | Maty Mbaye |
| Encadreur | Robert Diasse |
| Classe | L3GL |
| Année académique | 2025/2026 |
| Sujet | Application Web de Prédiction de Performance Académique des Étudiants |
| Version du document | 1.0 |
| Date | 20 juillet 2026 |

---

## 2. Contexte et problématique

De nombreux étudiants échouent ou décrochent académiquement faute d'un suivi précoce de leurs difficultés. Les signaux d'alerte (notes en baisse, absentéisme croissant) existent souvent bien avant l'échec final, mais ne sont pas exploités de manière systématique par les établissements.

ISI-SUPETCH souhaite se doter d'un outil capable d'anticiper ces situations à risque afin de permettre une intervention pédagogique rapide (tutorat, accompagnement, alerte aux parents/administration).

## 3. Objectifs du produit

### 3.1 Objectif général
Développer une application web capable de **prédire la réussite ou l'échec d'un étudiant** à partir de ses notes et de son taux d'assiduité, et de déclencher une **alerte précoce** en cas de risque détecté.

### 3.2 Objectifs spécifiques
- Collecter et centraliser les données académiques (notes, assiduité) des étudiants.
- Entraîner et exploiter un modèle de Machine Learning supervisé pour prédire un risque d'échec.
- Générer des alertes précoces à destination des acteurs concernés (administration, encadreurs).
- Permettre à l'étudiant de consulter le résultat de sa propre prédiction, sous réserve d'un compte actif.
- Donner à l'établissement les moyens de gérer l'accès des étudiants à l'application (activation/désactivation de compte).
- Offrir une expérience utilisable sur ordinateur, tablette et smartphone.

## 4. Périmètre du projet

### 4.1 Inclus dans le périmètre (in-scope)
- Application web (backend + frontend) avec base de données relationnelle.
- Module de prédiction basé sur un modèle de Machine Learning supervisé.
- Gestion des comptes étudiants (création, activation, désactivation).
- Interface responsive (desktop, tablette, smartphone).
- Environnement de développement/déploiement local via XAMPP.

### 4.2 Hors périmètre (out-of-scope)
- Application mobile native (iOS/Android).
- Paiement en ligne des frais de scolarité (le système gère seulement le statut du compte, pas la transaction financière elle-même).
- Intégration avec un ENT (Espace Numérique de Travail) tiers existant.
- Déploiement en production sur un serveur cloud (le projet cible un environnement XAMPP local, sauf évolution future).

## 5. Utilisateurs cibles / Personas

| Persona | Description | Besoins principaux |
|---|---|---|
| **Étudiant** | Utilisateur final consultant sa prédiction | Voir son résultat de prédiction, comprendre son niveau de risque, accéder via compte actif |
| **Administrateur (établissement)** | Gère les comptes et les données | Activer/désactiver les comptes, gérer notes et assiduité, consulter les listes d'étudiants à risque |
| **Encadreur / Enseignant** | Peut consulter les alertes de sa classe (selon l'évolution du périmètre) | Identifier rapidement les étudiants à accompagner |

## 6. Exigences fonctionnelles

### 6.1 Module de gestion des étudiants et des données académiques
- FR-01 : L'administrateur peut créer, modifier et supprimer une fiche étudiant.
- FR-02 : L'administrateur peut saisir/importer les notes des étudiants.
- FR-03 : L'administrateur peut saisir/importer le taux d'assiduité des étudiants.
- FR-04 : Le système stocke l'historique des notes et de l'assiduité par étudiant et par période.

### 6.2 Module de prédiction (Machine Learning)
- FR-05 : Le système utilise un modèle de Machine Learning supervisé entraîné sur les données historiques (notes + assiduité) pour prédire la réussite ou l'échec d'un étudiant.
- FR-06 : Le système calcule et affiche un résultat de prédiction (ex. : probabilité de réussite/échec, niveau de risque : faible / moyen / élevé).
- FR-07 : Le système déclenche une alerte précoce lorsque le niveau de risque dépasse un seuil défini.
- FR-08 : Les résultats des prédictions sont enregistrés en base de données, avec horodatage.

### 6.3 Module d'alerte
- FR-09 : Une alerte est générée automatiquement pour tout étudiant identifié à risque.
- FR-10 : L'administrateur/encadreur peut consulter la liste des étudiants à risque.
- FR-11 : (Optionnel / évolution) Notification par email à l'administration en cas de détection de risque élevé.

### 6.4 Gestion de l'accès étudiant (nouvelle fonctionnalité)
- FR-12 : Chaque étudiant dispose d'un compte utilisateur pour accéder à l'application.
- FR-13 : L'étudiant ne peut consulter le résultat de sa prédiction que si son compte est **actif**.
- FR-14 : L'administrateur (établissement) peut **activer** ou **désactiver** un compte étudiant.
- FR-15 : Le compte peut être désactivé notamment en cas de **non-paiement des frais de scolarité** ou pour **toute autre décision administrative**.
- FR-16 : Lorsqu'un compte est désactivé, l'étudiant :
  - ne peut plus se connecter, **ou**
  - peut se connecter mais reçoit un message l'informant que l'accès aux résultats est bloqué (à trancher en phase de conception détaillée).
- FR-17 : Un historique des activations/désactivations de compte est conservé (traçabilité), avec la date et éventuellement le motif.
- FR-18 : L'administrateur peut consulter la liste des comptes actifs/inactifs.

### 6.5 Authentification et gestion des rôles
- FR-19 : Le système propose une authentification (identifiant/mot de passe) distincte pour les étudiants et pour les administrateurs.
- FR-20 : Le système applique un contrôle d'accès basé sur les rôles (étudiant / administrateur).

## 7. Exigences non fonctionnelles

| Catégorie | Exigence |
|---|---|
| **Compatibilité** | Développement sur Desktop ; interface Responsive adaptée aux ordinateurs, tablettes et smartphones |
| **Performance** | Le résultat d'une prédiction doit s'afficher en quelques secondes après la demande |
| **Sécurité** | Mots de passe stockés de façon sécurisée (hachage) ; accès aux données restreint selon le rôle |
| **Disponibilité** | Application fonctionnelle en environnement local XAMPP pendant la durée du projet/soutenance |
| **Fiabilité du modèle** | Le modèle de prédiction doit être évalué (précision, rappel, F1-score) sur un jeu de données de test avant mise en production |
| **Maintenabilité** | Code structuré et documenté (backend Flask, frontend React.js) |
| **Ergonomie** | Interface simple et compréhensible pour un public non technique (étudiants) |

## 8. Architecture technique

### 8.1 Stack technologique

| Couche | Technologie |
|---|---|
| Frontend | React.js |
| Backend | Python (Flask) |
| Machine Learning | Modèle supervisé (ex. Régression Logistique, Random Forest, ou autre à déterminer lors de la phase de modélisation) |
| Base de données | MySQL — nom de la base : **Prediction_db** |
| Environnement de développement/serveur local | XAMPP |

### 8.2 Schéma d'architecture (haut niveau)
```
[React.js - Frontend]
        │  (appels API REST)
        ▼
[Flask - Backend / API]
   ├── Module Authentification
   ├── Module Gestion Étudiants (notes, assiduité)
   ├── Module Gestion des comptes (activation/désactivation)
   ├── Module Prédiction (modèle ML)
   └── Module Alertes
        │
        ▼
[MySQL - Prediction_db]  (via XAMPP)
```

### 8.3 Aperçu des données principales (base Prediction_db)
- **Étudiants** : identifiant, nom, prénom, classe, statut du compte (actif/inactif), date de dernière modification du statut.
- **Notes** : identifiant étudiant, matière, note, période/semestre.
- **Assiduité** : identifiant étudiant, taux de présence, période.
- **Prédictions** : identifiant étudiant, résultat (réussite/échec ou score de risque), date de la prédiction.
- **Comptes/Utilisateurs** : identifiant, rôle (étudiant/admin), identifiants de connexion, statut actif/inactif, historique des changements de statut.
- **Alertes** : identifiant étudiant, niveau de risque, date de déclenchement, statut de traitement.

## 9. Parcours utilisateur principaux

### 9.1 Parcours "Étudiant consulte sa prédiction"
1. L'étudiant se connecte à l'application avec ses identifiants.
2. Le système vérifie si le compte est actif.
   - Si **inactif** → message d'information (ex. « Accès bloqué pour non-paiement des frais de scolarité, veuillez contacter l'administration ») et accès refusé aux résultats.
   - Si **actif** → l'étudiant accède à son tableau de bord.
3. L'étudiant consulte le résultat de sa prédiction (réussite/échec, niveau de risque).

### 9.2 Parcours "Administrateur gère un compte"
1. L'administrateur se connecte à l'espace admin.
2. Il recherche l'étudiant concerné.
3. Il active ou désactive le compte, en précisant éventuellement le motif (non-paiement, autre décision administrative).
4. Le système met à jour le statut et l'historise.

### 9.3 Parcours "Génération d'une prédiction"
1. Les notes et l'assiduité d'un étudiant sont saisies/mises à jour.
2. Le système déclenche (automatiquement ou sur demande) le calcul de la prédiction via le modèle ML.
3. Le résultat est enregistré et rendu disponible à l'étudiant (si compte actif) et à l'administrateur.
4. Si le niveau de risque dépasse le seuil défini, une alerte est générée.

## 10. Critères d'acceptation (exemples)

- Étant donné un étudiant avec un compte actif, lorsqu'il se connecte, alors il voit le résultat de sa dernière prédiction.
- Étant donné un étudiant avec un compte désactivé, lorsqu'il tente de se connecter ou d'accéder à ses résultats, alors l'accès lui est refusé avec un message explicite.
- Étant donné un administrateur connecté, lorsqu'il désactive un compte, alors le statut est mis à jour immédiatement en base et l'étudiant ne peut plus consulter ses résultats.
- Étant donné de nouvelles notes/données d'assiduité saisies, lorsque la prédiction est recalculée, alors le nouveau résultat est stocké avec horodatage dans Prediction_db.
- L'application s'affiche correctement (mise en page adaptée) sur un écran desktop, une tablette et un smartphone.

## 11. Indicateurs de succès (KPIs)

- Précision (accuracy) du modèle de prédiction sur le jeu de test.
- Taux de détection correcte des étudiants réellement à risque (rappel).
- Délai entre la saisie des données et la disponibilité de la prédiction.
- Taux d'adoption : pourcentage d'étudiants actifs consultant régulièrement leurs résultats.
- Nombre d'interventions pédagogiques déclenchées suite à une alerte.

## 12. Risques et hypothèses

| Risque | Impact | Mitigation |
|---|---|---|
| Données historiques insuffisantes pour entraîner un modèle fiable | Prédictions peu précises | Collecter un jeu de données suffisant ; envisager des méthodes adaptées aux petits volumes |
| Confusion entre désactivation de compte et suppression de données | Perte d'information | Désactivation = simple changement de statut, pas de suppression |
| Mauvaise interprétation des résultats de prédiction par les étudiants | Stress ou mauvaise décision | Présenter les résultats avec pédagogie (ex. niveau de risque plutôt qu'un verdict brut) |
| Environnement XAMPP limité pour un usage à grande échelle | Non-scalabilité | Prévoir une migration possible vers un hébergement cloud en cas d'évolution |

## 13. Prochaines étapes

1. Validation du présent PRD avec l'encadreur.
2. Modélisation de la base de données Prediction_db (MCD/MLD).
3. Choix et entraînement de l'algorithme de Machine Learning.
4. Maquettage des interfaces (étudiant / administrateur).
5. Développement itératif (backend Flask, frontend React.js).
6. Tests (fonctionnels, du modèle ML, responsive).
7. Démonstration / soutenance.
