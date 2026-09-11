# type: ignore
# pyright: reportCallIssue=false, reportGeneralTypeIssues=false, reportArgumentType=false
"""
Script de peuplement de la base Prediction_db avec des donnees de
demonstration : filieres, classes (L1-M2), matieres, annees academiques,
enseignants et affectations, comptes admin/assistante/technicien/etudiants,
notes, appels de presence, predictions et reclamations.

Usage :
    python seed_data.py
Prealable :
    - La base "Prediction_db" doit exister (cf. database/schema.sql).
    - Le fichier .env doit etre configure (copier .env.example -> .env).
"""
import os
import random
import sys
from datetime import date, datetime, timedelta

# Assure la resolution du module 'app'
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from app.academic import SEMESTRES_PAR_NIVEAU
from app.extensions import db
from app.models import (
    AccountStatusHistory,
    AnneeAcademique,
    Classe,
    CourseSession,
    Filiere,
    Grade,
    Matiere,
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
    {
        "code": "GL",
        "nom": "Genie Logiciel",
        "domaine": "Génie Informatique & Télécoms",
        "niveaux": ["L1", "L2", "L3", "M1", "M2"],
    },
    {
        "code": "RI",
        "nom": "Reseaux Informatiques",
        "domaine": "Génie Informatique & Télécoms",
        "niveaux": ["L1", "L2", "L3"],
    },
    {
        "code": "FC",
        "nom": "Finance & Comptabilite",
        "domaine": "Sciences Économiques & Gestion",
        "niveaux": ["L1", "L2", "L3"],
    },
]

MATIERES_INFORMATIQUE = [
    ("ALGO", "Algorithmique", 2.0),
    ("BDD", "Base de donnees", 2.0),
    ("RES", "Reseaux", 1.5),
    ("MATH", "Mathematiques", 1.5),
    ("ANG", "Anglais", 1.0),
    ("GL", "Genie logiciel", 2.0),
]

MATIERES_FC = [
    ("COMPTA_GEN", "Comptabilite generale", 2.0),
    ("COMPTA_ANA", "Comptabilite analytique", 2.0),
    ("FISC", "Fiscalite", 1.5),
    ("CDG", "Controle de gestion", 2.0),
    ("AN_FIN", "Analyse financiere", 2.0),
    ("GEST_FIN", "Gestion financiere", 2.0),
    ("TRES", "Tresorerie", 1.5),
    ("DROIT_SOC", "Droit des societes", 1.0),
    ("STAT", "Statistiques", 1.5),
    ("MATH_FIN", "Mathematiques financieres", 1.5),
    ("ANG_FC", "Anglais", 1.0),
    ("WP", "Wordpress", 1.0),
    ("SAARI", "SAARI", 1.5),
]

MATIERES = [nom for _, nom, _ in MATIERES_INFORMATIQUE]
MATIERES_FC_NOMS = [nom for _, nom, _ in MATIERES_FC]

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
        print("Verification / creation des tables SQL...")
        db.create_all()

        if Student.query.count() > 0:
            print("Des donnees existent deja dans la base de donnees.")
            print("Le seed de demonstration est ignore pour preserver vos donnees existantes.")
            print("(Pour regenerer un jeu de test vierge, rejouez schema.sql avant ce script.)")
            return

        # --- 1. Annees academiques ----------------------------------
        print("Creation des annees academiques...")
        if AnneeAcademique.query.filter_by(libelle="2025-2026").first() is None:
            db.session.add(
                AnneeAcademique(
                    libelle="2025-2026",
                    annee_debut=2025,
                    annee_fin=2026,
                    statut="active",
                )
            )
        if AnneeAcademique.query.filter_by(libelle="2024-2025").first() is None:
            db.session.add(
                AnneeAcademique(
                    libelle="2024-2025",
                    annee_debut=2024,
                    annee_fin=2025,
                    statut="cloturee",
                )
            )
        db.session.commit()

        # --- 2. Comptes administratifs (Admin, Assistante, Technicien)
        print("Creation des comptes administratifs...")
        if User.query.filter_by(role="admin").first() is None:
            admin = User(
                identifiant="admin",
                email="matymbayeisidp@groupeisi.com",
                role="admin",
                statut="actif",
                email_verifie=True,
            )
            admin.set_password("Admin@1234")
            db.session.add(admin)

        if User.query.filter_by(role="assistante_pedagogique").first() is None:
            ast = User(
                identifiant="assistante",
                email="assistante@groupeisi.com",
                role="assistante_pedagogique",
                statut="actif",
                email_verifie=True,
            )
            ast.set_password("Assistante@1234")
            db.session.add(ast)

        if User.query.filter_by(role="technicien").first() is None:
            tech = User(
                identifiant="technicien",
                email="technicien@groupeisi.com",
                role="technicien",
                statut="actif",
                email_verifie=True,
            )
            tech.set_password("Technicien@1234")
            db.session.add(tech)
        db.session.commit()

        # --- 3. Filieres et classes (L1 a M2) -----------------------
        print("Creation des filieres et des classes...")
        classes_by_code = {}
        for f in FILIERES:
            filiere = Filiere.query.filter_by(code=f["code"]).first()
            if filiere is None:
                filiere = Filiere(nom=f["nom"], code=f["code"], domaine=f["domaine"])
                db.session.add(filiere)
                db.session.flush()

            for niveau in f["niveaux"]:
                nom_classe = f"{f['code']} - {niveau}"
                classe = Classe.query.filter_by(filiere_id=filiere.id, niveau=niveau).first()
                if classe is None:
                    classe = Classe(filiere_id=filiere.id, niveau=niveau, nom=nom_classe)
                    db.session.add(classe)
                    db.session.flush()
                classes_by_code[(f["code"], niveau)] = classe
        db.session.commit()

        # --- 4. Catalogue des matieres ------------------------------
        print("Creation du catalogue des matieres...")
        toutes_matieres = MATIERES_INFORMATIQUE + MATIERES_FC
        for code_mat, nom_mat, coeff in toutes_matieres:
            if Matiere.query.filter_by(code=code_mat).first() is None:
                db.session.add(
                    Matiere(
                        code=code_mat,
                        nom=nom_mat,
                        coefficient=coeff,
                        type_matiere="fondamentale",
                    )
                )
        db.session.commit()

        # --- 5. Enseignants et affectations -------------------------
        print("Creation des enseignants et des affectations...")
        teachers = []
        for i, (prenom, nom) in enumerate(TEACHERS):
            identifiant = make_login(prenom, nom, i + 1)
            user = User.query.filter_by(identifiant=identifiant).first()
            if user is None:
                user = User(
                    identifiant=identifiant,
                    email=f"{identifiant}@groupeisi.com",
                    role="enseignant",
                    statut="actif",
                    email_verifie=True,
                )
                user.set_password("Enseignant@1234")
                db.session.add(user)
                db.session.flush()

            teacher = Teacher.query.filter_by(user_id=user.id).first()
            if teacher is None:
                teacher = Teacher(user_id=user.id, nom=nom, prenom=prenom)
                db.session.add(teacher)
                db.session.flush()
            teachers.append(teacher)
        db.session.commit()

        for (code_filiere, _), classe in classes_by_code.items():
            liste_matieres = MATIERES_FC_NOMS if code_filiere == "FC" else MATIERES
            for i, matiere in enumerate(liste_matieres):
                teacher = teachers[i % len(teachers)]
                existant = TeacherAssignment.query.filter_by(
                    teacher_id=teacher.id, classe_id=classe.id, matiere=matiere
                ).first()
                if not existant:
                    db.session.add(
                        TeacherAssignment(
                            teacher_id=teacher.id, classe_id=classe.id, matiere=matiere
                        )
                    )
        db.session.commit()

        # --- 6. Etudiants, notes, presences -------------------------
        print("Creation des etudiants, notes et appels de presence...")
        student_index = 0
        all_students = []
        for (code_filiere, _), classe in classes_by_code.items():
            classe_students = []
            for _ in range(STUDENTS_PER_CLASSE):
                student_index += 1
                prenom = random.choice(PRENOMS)
                nom = random.choice(NOMS)
                matricule = f"ISI2026-{student_index:04d}"
                identifiant = make_login(prenom, nom, student_index)

                user = User(
                    identifiant=identifiant,
                    email=f"{identifiant}@groupeisi.com",
                    role="etudiant",
                    statut="actif",
                    email_verifie=True,
                )
                user.set_password("Etudiant@1234")
                db.session.add(user)
                db.session.flush()

                student = Student(
                    user_id=user.id,
                    matricule=matricule,
                    nom=nom,
                    prenom=prenom,
                    classe_id=classe.id,
                )
                db.session.add(student)
                db.session.flush()

                profil = random.choices(
                    ["bon", "moyen", "faible", "difficulte"],
                    weights=[0.35, 0.3, 0.2, 0.15],
                )[0]
                note_base, taux_base = {
                    "bon": (15, 0.92),
                    "moyen": (11, 0.75),
                    "faible": (8, 0.58),
                    "difficulte": (4.5, 0.35),
                }[profil]

                classe_students.append((student, note_base, taux_base))
            all_students.append((classe, code_filiere, classe_students))
        db.session.commit()

        for classe, code_filiere, classe_students in all_students:
            semestres = SEMESTRES_PAR_NIVEAU.get(classe.niveau, ["S1", "S2"])
            liste_matieres = MATIERES_FC_NOMS if code_filiere == "FC" else MATIERES

            for matiere in liste_matieres:
                assignment = TeacherAssignment.query.filter_by(
                    classe_id=classe.id, matiere=matiere
                ).first()
                teacher_id = assignment.teacher_id if assignment else None

                for semestre in semestres:
                    session_dates = [date(2026, 2, 1) + timedelta(days=14 * i) for i in range(3)]
                    sessions = []
                    for d in session_dates:
                        session = CourseSession(
                            classe_id=classe.id,
                            matiere=matiere,
                            teacher_id=teacher_id,
                            semestre=semestre,
                            date_cours=d,
                        )
                        db.session.add(session)
                        db.session.flush()
                        sessions.append(session)

                    for student, note_base, taux_base in classe_students:
                        for session in sessions:
                            present = random.random() < max(
                                0.15, min(0.98, taux_base + random.gauss(0, 0.05))
                            )
                            db.session.add(
                                Presence(
                                    session_id=session.id,
                                    student_id=student.id,
                                    statut="present" if present else "absent",
                                )
                            )
                        for type_eval in ("devoir", "examen"):
                            note = max(0, min(20, round(random.gauss(note_base, 2.5), 2)))
                            db.session.add(
                                Grade(
                                    student_id=student.id,
                                    matiere=matiere,
                                    note=note,
                                    semestre=semestre,
                                    type_evaluation=type_eval,
                                    saisi_par_teacher_id=teacher_id,
                                )
                            )
            db.session.commit()
            print(f"  - Classe {classe.nom} : {len(classe_students)} etudiants generes.")

        # --- 7. Calcul des predictions Machine Learning -------------
        print("Calcul des predictions initiales...")
        for classe, _, classe_students in all_students:
            for student, _, _ in classe_students:
                prediction = compute_and_store_prediction(student)
                if prediction:
                    print(
                        f"    {student.prenom} {student.nom} ({classe.nom}) -> risque {prediction.niveau_risque}"
                    )

        # --- 8. Compte etudiant desactive (demo FR-16) --------------
        demo_inactive = Student.query.first()
        if demo_inactive and demo_inactive.user:
            u = demo_inactive.user
            ancien = u.statut
            u.statut = "inactif"
            u.derniere_modification_statut = datetime.utcnow()
            db.session.add(
                AccountStatusHistory(
                    user_id=u.id,
                    ancien_statut=ancien,
                    nouveau_statut="inactif",
                    motif="Non-paiement des frais de scolarite (demonstration)",
                )
            )
            db.session.commit()
            print(f"\nCompte desactive pour la demonstration : {u.identifiant} / Etudiant@1234")

        # --- 9. Reclamations de demonstration -----------------------
        print("Creation de reclamations de demonstration...")
        demo_students = Student.query.limit(3).all()
        sample_reclamations = [
            (
                "Erreur sur une note d'examen",
                "Algorithmique",
                "Bonjour, je pense qu'il y a une erreur sur ma note d'Algorithmique du semestre en cours.",
            ),
            (
                "Probleme d'acces a mon compte",
                None,
                "Je n'arrive plus a me connecter depuis hier, pouvez-vous verifier mon compte ?",
            ),
            (
                "Assiduite mal comptabilisee",
                "Reseaux",
                "J'etais present au cours de Reseaux du 15 fevrier mais je suis marque absent.",
            ),
        ]
        for student, (sujet, matiere_rec, message) in zip(demo_students, sample_reclamations):
            reclamation = Reclamation(
                student_id=student.id,
                sujet=sujet,
                matiere=matiere_rec,
            )
            db.session.add(reclamation)
            db.session.flush()
            db.session.add(
                ReclamationMessage(
                    reclamation_id=reclamation.id,
                    auteur_role="etudiant",
                    message=message,
                )
            )
        db.session.commit()

        print("\nSeed termine avec succes !")
        print("Comptes de demonstration prets :")
        print("  - Admin                 : admin / Admin@1234")
        print("  - Assistante pedagogique: assistante / Assistante@1234")
        print("  - Technicien            : technicien / Technicien@1234")
        print("  - Enseignant (exemple)  : fatou.diagne1 / Enseignant@1234")
        print("  - Etudiant (exemple)    : awa.diop1 / Etudiant@1234")


if __name__ == "__main__":
    seed()
