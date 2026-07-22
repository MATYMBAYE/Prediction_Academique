"""
Script pour ajouter la filiere Finance & Comptabilite avec ses matieres,
ses classes (L1, L2, L3) et des etudiants de demonstration.
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
    Student,
    Teacher,
    TeacherAssignment,
    User,
)
from app.services import compute_and_store_prediction

random.seed(42)

FILIERE_FC = {
    "code": "FC",
    "nom": "Finance & Comptabilite",
    "niveaux": ["L1", "L2", "L3"],
}

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


def add_finance_filiere():
    app = create_app()
    with app.app_context():
        # ---- Verifier si la filiere existe deja ----
        existing = Filiere.query.filter_by(code=FILIERE_FC["code"]).first()
        if existing:
            print(f"La filiere '{existing.nom}' (code={existing.code}) existe deja [id={existing.id}].")
            print("Rien a faire.")
            return

        print("=== Ajout de la filiere Finance & Comptabilite ===\n")

        # ---- Creer la filiere ----
        filiere = Filiere(nom=FILIERE_FC["nom"], code=FILIERE_FC["code"])
        db.session.add(filiere)
        db.session.flush()
        print(f"Filiere creee : {filiere.nom} ({filiere.code}) [id={filiere.id}]")

        # ---- Creer les classes L1, L2, L3 ----
        classes = []
        for niveau in FILIERE_FC["niveaux"]:
            classe = Classe(
                filiere_id=filiere.id,
                niveau=niveau,
                nom=f"FC - {niveau}",
            )
            db.session.add(classe)
            db.session.flush()
            classes.append(classe)
            print(f"  Classe creee : {classe.nom} [id={classe.id}]")

        db.session.commit()

        # ---- Recuperer les enseignants existants pour les affecter ----
        teachers = Teacher.query.all()
        if not teachers:
            print("\nAucun enseignant trouve en base. Les affectations seront ignorees.")
        else:
            print(f"\nAffectation de {len(teachers)} enseignant(s) aux matieres FC...")
            for classe in classes:
                for i, matiere in enumerate(MATIERES_FC):
                    teacher = teachers[i % len(teachers)]
                    assignment = TeacherAssignment(
                        teacher_id=teacher.id,
                        classe_id=classe.id,
                        matiere=matiere,
                    )
                    db.session.add(assignment)
            db.session.commit()
            print("  Affectations enregistrees.")

        # ---- Creer des etudiants de demonstration ----
        print(f"\nCreation d'etudiants de demonstration ({STUDENTS_PER_CLASSE} par classe)...")

        # Compter les etudiants existants pour eviter les doublons de matricule
        existing_count = Student.query.count()
        student_index = existing_count

        all_classe_students = []

        for classe in classes:
            classe_students = []
            for _ in range(STUDENTS_PER_CLASSE):
                student_index += 1
                prenom = random.choice(PRENOMS)
                nom = random.choice(NOMS)
                matricule = f"ISI2026-{student_index:04d}"
                identifiant = make_login(prenom, nom, student_index)

                # Eviter les doublons d'identifiant
                while User.query.filter_by(identifiant=identifiant).first():
                    student_index += 1
                    identifiant = make_login(prenom, nom, student_index)

                user = User(
                    identifiant=identifiant,
                    email=f"{identifiant}@etu.isi-supetch.sn",
                    role="etudiant",
                    statut="actif",
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

            all_classe_students.append((classe, classe_students))

        db.session.commit()

        # ---- Generer notes et presences ----
        print("\nGeneration des notes et appels de presence...")
        for classe, classe_students in all_classe_students:
            semestres = SEMESTRES_PAR_NIVEAU[classe.niveau]
            for matiere in MATIERES_FC:
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
                            present = random.random() < max(0.15, min(0.98, taux_base + random.gauss(0, 0.05)))
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
            print(f"  Classe {classe.nom} : {len(classe_students)} etudiant(s) genere(s).")

        # ---- Predictions initiales ----
        print("\nCalcul des predictions initiales...")
        for classe, classe_students in all_classe_students:
            for student, _, _ in classe_students:
                prediction = compute_and_store_prediction(student)
                if prediction:
                    print(f"  {student.prenom} {student.nom} ({classe.nom}) -> risque {prediction.niveau_risque}")

        print("\n=== Filiere Finance & Comptabilite ajoutee avec succes ! ===")
        print("Connexion etudiants FC : voir identifiants ci-dessus / Etudiant@1234")


if __name__ == "__main__":
    add_finance_filiere()
