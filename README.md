# Application Web de Prediction de Performance Academique — ISI-SUPETCH

Application complete (backend + frontend + Machine Learning + base de donnees)
implementant le [PRD](PRD_Application_Prediction_Performance_Academique.md) et
le [Cahier des charges UI/UX](Cahier_des_Charges_Interface_Utilisateur.md), etendue
avec le cursus Licence/Master complet, le role Enseignant, les statistiques de
prediction, les reclamations et les rapports exportables.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 (Vite) + Tailwind CSS + Recharts |
| Backend | Python / Flask + Flask-JWT-Extended |
| Machine Learning | scikit-learn (RandomForestClassifier) |
| Base de donnees | MySQL (`Prediction_db`) via XAMPP |
| Rapports | fpdf2 (PDF), CSV natif |

## Structure du projet

```
Prediction_Academique/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # Factory Flask (create_app)
│   │   ├── config.py          # Configuration (.env)
│   │   ├── academic.py        # Constantes du cursus (niveaux L1-M2, semestres S1-S10)
│   │   ├── extensions.py      # SQLAlchemy, JWT, CORS
│   │   ├── models.py          # Modeles ORM (User, Student, Teacher, Grade, ...)
│   │   ├── auth.py            # Decorateurs role/statut de compte
│   │   ├── services.py        # Calcul + enregistrement des predictions
│   │   ├── ml/                # Dataset synthetique, entrainement, prediction
│   │   ├── utils/              # Pagination, generation de rapports PDF
│   │   └── routes/            # Blueprints API (auth, student, teacher, admin, prediction)
│   ├── database/schema.sql    # Schema SQL de Prediction_db
│   ├── seed_data.py           # Peuplement de demonstration
│   ├── requirements.txt
│   └── run.py                 # Point d'entree Flask
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── student/         # Tableau de bord, reclamations
    │   │   ├── teacher/         # Mes classes, appel, saisie de notes
    │   │   └── admin/           # Etudiants, classes, enseignants, predictions,
    │   │                        # comptes, alertes, reclamations, rapports
    │   ├── components/         # Card, Button, TrajectoryCurve, StatusBadge, Pagination, ...
    │   ├── academic.js          # Constantes du cursus (miroir de app/academic.py)
    │   ├── context/AuthContext.jsx
    │   └── api/client.js
    ├── tailwind.config.js      # Palette et typographies du cahier des charges
    └── package.json
```

## 1. Prerequis

- [XAMPP](https://www.apachefriends.org/) (MySQL/MariaDB) demarre, avec le module MySQL actif.
- Python 3.11+ (teste avec Python 3.14).
- Node.js 18+ et npm.

## 2. Base de donnees (XAMPP / MySQL)

1. Demarrer MySQL depuis le panneau de controle XAMPP.
2. Creer le schema `Prediction_db` :

   ```bash
   "C:/xampp/mysql/bin/mysql.exe" -u root < backend/database/schema.sql
   ```

   (Adapter le chemin de `mysql.exe` a votre installation XAMPP. Ajouter
   `-p` si un mot de passe root est defini.)

## 3. Backend (Flask)

```bash
cd backend
python -m venv venv
./venv/Scripts/python -m pip install -r requirements.txt

copy .env.example .env         # puis adapter DB_USER / DB_PASSWORD si besoin
```

Entrainer le modele de Machine Learning (genere `app/ml/model.joblib` et
`app/ml/metrics.json`) :

```bash
./venv/Scripts/python -m app.ml.train_model
```

Peupler la base avec des donnees de demonstration (filieres, classes L1 a M2,
enseignants et affectations, etudiants, notes, appels de presence,
predictions, reclamations) :

```bash
./venv/Scripts/python seed_data.py
```

Lancer l'API (utiliser directement le python du venv evite tout probleme
d'activation de venv selon le shell) :

```bash
./venv/Scripts/python run.py
```

L'API est disponible sur `http://localhost:5000/api` (voir `/api/health`).
Cette URL ne sert que l'API — l'application s'utilise via le frontend
(`http://localhost:5173`), jamais directement sur le port 5000.

### Comptes de demonstration (crees par `seed_data.py`)

| Role | Identifiant | Mot de passe | Statut |
|---|---|---|---|
| Administrateur | `admin` | `Admin@1234` | Actif |
| Enseignant (exemple) | `fatou.diagne1` | `Enseignant@1234` | Actif |
| Etudiant (exemple actif) | voir la sortie du script | `Etudiant@1234` | Actif |
| Etudiant (exemple desactive) | `aminata.fall1` | `Etudiant@1234` | Inactif (demo FR-16) |

## 4. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

Le frontend appelle l'API sur `http://localhost:5000/api` par defaut
(modifiable via `VITE_API_URL` dans un fichier `.env.local`). Le backend
n'autorise en CORS que l'origine `FRONTEND_ORIGIN` definie dans `backend/.env`
(par defaut `http://localhost:5173`) : si Vite demarre sur un autre port
(5174, ...) parce que 5173 est deja occupe, les appels API seront bloques.

## 5. Fonctionnalites implementees

### Cœur du sujet (PRD)
- Gestion des etudiants, notes et assiduite (FR-01 a FR-04).
- Prediction ML (RandomForest) recalculee automatiquement a chaque nouvelle
  note ou appel de presence, avec probabilite de reussite et niveau de risque
  (faible / moyen / eleve) (FR-05, FR-06, FR-08).
- Alertes automatiques declenchees sur risque eleve (FR-07, FR-09, FR-10).
- Comptes etudiants avec activation/desactivation, motif, historique de
  tracabilite (FR-12 a FR-18).
- Authentification par role (etudiant / enseignant / administrateur) avec
  verification du statut de compte a chaque connexion et rechargement
  (FR-19, FR-20, cahier des charges §3).
- Interface responsive (desktop / tablette / mobile) respectant la charte
  graphique (palette, typographies Fraunces / Inter / IBM Plex Mono, courbe
  de trajectoire).

### Extensions (cursus complet + role Enseignant)
- **Structure academique L1 a M2** (10 semestres S1-S10) par filiere.
- **Role Enseignant** : classes/matieres affectees, appel de presence par
  session de cours (remplace la saisie manuelle d'un taux d'assiduite —
  celui-ci est desormais calcule automatiquement a partir des appels),
  saisie de notes (devoir/examen) restreinte a ses matieres.
- **Gestion des classes** (admin) : filieres, classes, affectation des
  enseignants, historique des appels en lecture seule.
- **Gestion des enseignants** (admin) : creation/suppression de comptes.
- **Statistiques de prediction** : repartition des risques (global, par
  filiere, par niveau), evolution du taux de reussite predit par semestre,
  taux d'assiduite moyen par classe, liste triable/filtrable des etudiants a
  risque eleve.
- **Reclamations** : soumission par l'etudiant, fil de discussion, traitement
  et changement de statut par l'administration (visible immediatement cote
  etudiant).
- **Rapports** : export PDF et CSV des predictions, CSV de l'assiduite, CSV
  des comptes desactives sur une periode.
- **Mot de passe oublie** : flux par token (30 min de validite). Aucun
  service SMTP n'est branche sur ce projet local — en mode debug, l'API
  renvoie le token directement pour permettre de tester le parcours de bout
  en bout (`dev_reset_token`). En production, il faudrait le remplacer par un
  envoi email et ne jamais exposer le token via l'API.
- **Pagination** sur les listes longues (etudiants, comptes, enseignants,
  alertes, reclamations, historique).

## 6. Evaluation du modele ML

Le modele est entraine sur un jeu de donnees synthetique plausible (a
remplacer par les donnees reelles ISI-SUPETCH des que disponibles — voir
`app/ml/dataset.py`). Les metriques (accuracy, precision, rappel, F1-score)
sont sauvegardees dans `backend/app/ml/metrics.json` a chaque entrainement.
Le modele ne tient pas compte du niveau (L1-M2) dans cette version : c'est une
piste d'amelioration mentionnee dans le PRD, non implementee pour rester dans
le perimetre "cœur + priorite elevee" convenu.

## 7. Non implemente dans cette iteration (perimetre volontairement differe)

Ces elements, proposes comme complementaires et de priorite Moyenne/Basse,
n'ont pas ete construits pour rester sur le cœur du sujet + priorite Elevee :
emploi du temps, bulletin PDF automatique, messagerie interne, journal
d'audit des actions sensibles, notifications push/email. A envisager dans une
iteration suivante si besoin.

## 8. Notes de securite

- Mots de passe hashes avec bcrypt.
- Authentification par JWT (Flask-JWT-Extended), controle d'acces par role.
- Le statut de compte (actif/inactif) est revérifié cote serveur a chaque
  requete du tableau de bord etudiant, pas seulement a la connexion.
- Message d'erreur de connexion generique (ne revele jamais si un compte
  existe) conformement au cahier des charges §3.1.
- Un enseignant ne peut saisir des notes ou faire l'appel que pour les
  classes/matieres qui lui sont explicitement affectees (verifie cote API,
  pas seulement masque cote interface).
