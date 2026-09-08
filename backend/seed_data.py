"""
Script de peuplement de la base Prediction_db avec des donnees de
demonstration : filieres, classes (L1-M2), enseignants et affectations,
comptes admin/etudiants, notes, appels de presence, predictions et
reclamations.

Usage :
    python seed_data.py
Prealable :
    - La base "Prediction_db" doit exister (cf. database/schema.sql).
    - Le fichier .env doit etre configure (copier .env.example -> .env).
"""
import random
from datetime import date, timedelta

from app import create_app
from app.academic import SEMESTRES_PAR_NIVEAU
from app.extensions import db
from app.models import (
    Classe,
    CourseSession,
    Filiere,
    Grade,
    Presence,
    Reclamation,
    ReclamationMessage,
    Student,
    Teacher,
    TeacherAssignment,
    User,
)
from app.services import compute_and_store_prediction

random.seed(7)

FILIERES = [
    {"code": "GL", "nom": "Genie Logiciel", "niveaux": ["L1", "L2", "L3", "M1", "M2"]},
    {"code": "RI", "nom": "Reseaux Informatiques", "niveaux": ["L1", "L2", "L3"]},
    {"code": "FC", "nom": "Finance & Comptabilite", "niveaux": ["L1", "L2", "L3"]},
]

MATIERES = ["Algorithmique", "Base de donnees", "Reseaux", "Mathematiques", "Anglais", "Genie logiciel"]

# Matieres specifiques a la filiere Finance & Comptabilite
MATIERES_FC = [
    "Comptabilite generale",
    "Comptabilite analytique",
    "Fiscalite",
    "Controle de gestion",
    "Analyse financiere",
    "Gestion financiere",
    "Tresorerie",
    "Droit des societes",
    "Statistiques",
    "Mathematiques financieres",
    "Anglais",
    "Wordpress",
    "SAARI",
]

TEACHERS = [
    ("Fatou", "Diagne"),
    ("Omar", "Seck"),
    ("Astou", "Ndoye"),
    ("Ibrahima", "Toure"),
    ("Coumba", "Sy"),
    ("Modou", "Diouf"),
]

PRENOMS = [
    "Awa", "Moussa", "Fatou", "Ibrahima", "Aissatou", "Ousmane", "Mariama",
    "Cheikh", "Khady", "Mamadou", "Aminata", "Abdoulaye", "Ndeye", "Souleymane",
    "Coumba", "Modou", "Aida", "Pape", "Fatimata", "Lamine",
]
NOMS = [
    "Diop", "Ndiaye", "Fall", "Gueye", "Sarr", "Diallo", "Ba", "Sow", "Faye",
    "Kane", "Cisse", "Sy", "Toure", "Ndour", "Mbaye",
]

STUDENTS_PER_CLASSE = 5


def make_login(prenom, nom, index):
    base = f"{prenom}.{nom}".lower().replace(" ", "")
    return f"{base}{index}"


def seed():
    app = create_app()
    with app.app_context():
        print("Creation des tables (si absentes)...")
        db.create_all()

        if Student.query.count() > 0:
            print("Des donnees existent deja - le seed de demonstration est ignore.")
            print("(Videz les tables si vous voulez regenerer un jeu de test.)")
            return

        # --- Compte administrateur ---------------------------------
        if User.query.filter_by(role="admin").first() is None:
            print("Creation du compte administrateur de demonstration...")
            admin = User(identifiant="admin", email="matymbayeisidp@groupeisi.com", role="admin", statut="actif", email_verifie=True)
            admin.set_password("Admin@1234")
            db.session.add(admin)
        db.session.commit()

        # --- Filieres et classes ------------------------------------
        print("Creation des filieres et des classes (L1 a M2)...")
        classes_by_code = {}
        for f in FILIERES:
            filiere = Filiere(nom=f["nom"], code=f["code"])
            db.session.add(filiere)
            db.session.flush()
            for niveau in f["niveaux"]:
                classe = Classe(filiere_id=filiere.id, niveau=niveau, nom=f"{f['code']} - {niveau}")
                db.session.add(classe)
                db.session.flush()
                classes_by_code[(f["code"], niveau)] = classe
        db.session.commit()

        # --- Enseignants et affectations -----------------------------
        print("Creation des enseignants et de leurs affectations...")
        teachers = []
        for i, (prenom, nom) in enumerate(TEACHERS):
            identifiant = make_login(prenom, nom, i + 1)
            user = User(identifiant=identifiant, email=f"{identifiant}@groupeisi.com", role="enseignant", statut="actif", email_verifie=True)
            user.set_password("Enseignant@1234")
            db.session.add(user)
            db.session.flush()
            teacher = Teacher(user_id=user.id, nom=nom, prenom=prenom)
            db.session.add(teacher)
            db.session.flush()
            teachers.append(teacher)
        db.session.commit()

        for classe in classes_by_code.values():
            for i, matiere in enumerate(MATIERES):
                teacher = teachers[i % len(teachers)]
                db.session.add(TeacherAssignment(teacher_id=teacher.id, classe_id=classe.id, matiere=matiere))
        db.session.commit()

        # --- Etudiants, notes, presences ------------------------------
        print("Creation des etudiants, notes et appels de presence...")
        student_index = 0
        all_students = []
        for classe in classes_by_code.values():
            classe_students = []
            for _ in range(STUDENTS_PER_CLASSE):
                student_index += 1
                prenom = random.choice(PRENOMS)
                nom = random.choice(NOMS)
                matricule = f"ISI2026-{student_index:04d}"
                identifiant = make_login(prenom, nom, student_index)

                user = User(identifiant=identifiant, email=f"{identifiant}@groupeisi.com", role="etudiant", statut="actif", email_verifie=True)
                user.set_password("Etudiant@1234")

                db.session.add(user)
                db.session.flush()

                student = Student(user_id=user.id, matricule=matricule, nom=nom, prenom=prenom, classe_id=classe.id)
                db.session.add(student)
                db.session.flush()

                profil = random.choices(["bon", "moyen", "faible", "difficulte"], weights=[0.35, 0.3, 0.2, 0.15])[0]
                note_base, taux_base = {
                    "bon": (15, 0.92),
                    "moyen": (11, 0.75),
                    "faible": (8, 0.58),
                    "difficulte": (4.5, 0.35),
                }[profil]

                classe_students.append((student, note_base, taux_base))
            all_students.append((classe, classe_students))
        db.session.commit()

        for classe, classe_students in all_students:
            semestres = SEMESTRES_PAR_NIVEAU[classe.niveau]
            for matiere in MATIERES:
                assignment = TeacherAssignment.query.filter_by(classe_id=classe.id, matiere=matiere).first()
                teacher_id = assignment.teacher_id if assignment else None

                for semestre in semestres:
                    session_dates = [date(2026, 2, 1) + timedelta(days=14 * i) for i in range(3)]
                    sessions = []
                    for d in session_dates:
                        session = CourseSession(
                            classe_id=classe.id, matiere=matiere, teacher_id=teacher_id,
                            semestre=semestre, date_cours=d,
                        )
                        db.session.add(session)
                        db.session.flush()
                        sessions.append(session)

                    for student, note_base, taux_base in classe_students:
                        for session in sessions:
                            present = random.random() < max(0.15, min(0.98, taux_base + random.gauss(0, 0.05)))
                            db.session.add(
                                Presence(session_id=session.id, student_id=student.id, statut="present" if present else "absent")
                            )
                        for type_eval in ("devoir", "examen"):
                            note = max(0, min(20, round(random.gauss(note_base, 2.5), 2)))
                            db.session.add(
                                Grade(
                                    student_id=student.id, matiere=matiere, note=note, semestre=semestre,
                                    type_evaluation=type_eval, saisi_par_teacher_id=teacher_id,
                                )
                            )
            db.session.commit()
            print(f"  - Classe {classe.nom} : {len(classe_students)} etudiants, donnees generees.")

        # --- Predictions ------------------------------------------------
        print("Calcul des predictions initiales...")
        for classe, classe_students in all_students:
            for student, _, _ in classe_students:
                prediction = compute_and_store_prediction(student)
                if prediction:
                    print(f"    {student.prenom} {student.nom} ({classe.nom}) -> risque {prediction.niveau_risque}")

        # --- Compte etudiant desactive, pour demo FR-16 -----------------
        demo_inactive = Student.query.first()
        if demo_inactive and demo_inactive.user:
            from app.models import AccountStatusHistory
            from datetime import datetime

            u = demo_inactive.user
            ancien = u.statut
            u.statut = "inactif"
            u.derniere_modification_statut = datetime.utcnow()
            db.session.add(
                AccountStatusHistory(
                    user_id=u.id, ancien_statut=ancien, nouveau_statut="inactif",
                    motif="Non-paiement des frais de scolarite (demonstration)",
                )
            )
            db.session.commit()
            print(f"\nCompte desactive a titre de demonstration : {u.identifiant} / Etudiant@1234")

        # --- Reclamations de demonstration -------------------------------
        print("Creation de reclamations de demonstration...")
        demo_students = Student.query.limit(3).all()
        sample_reclamations = [
            ("Erreur sur une note d'examen", "Bonjour, je pense qu'il y a une erreur sur ma note d'Algorithmique du semestre en cours."),
            ("Probleme d'acces a mon compte", "Je n'arrive plus a me connecter depuis hier, pouvez-vous verifier mon compte ?"),
            ("Assiduite mal comptabilisee", "J'etais present au cours de Reseaux du 15 fevrier mais je suis marque absent."),
        ]
        for student, (sujet, message) in zip(demo_students, sample_reclamations):
            reclamation = Reclamation(student_id=student.id, sujet=sujet)
            db.session.add(reclamation)
            db.session.flush()
            db.session.add(ReclamationMessage(reclamation_id=reclamation.id, auteur_role="etudiant", message=message))
        db.session.commit()

        print("\nSeed termine.")
        print("Connexion admin : admin / Admin@1234")
        print("Connexion enseignant (exemple) : fatou.diagne1 / Enseignant@1234")
        print("Connexion etudiant : voir la liste ci-dessus, mot de passe Etudiant@1234")


if __name__ == "__main__":
    seed()
