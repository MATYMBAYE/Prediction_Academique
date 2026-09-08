"""
Test d'integration du backend.

Monte l'application Flask sur une base SQLite en memoire, cree un jeu de
donnees representatif (3 etudiants aux profils contrastes, un enseignant, un
administrateur), puis appelle chaque nouvel endpoint en verifiant le code de
reponse ET la structure du corps renvoye.

Lancement :
    ../venvtest/bin/python test_integration.py
"""
import json
import os
import sys
from datetime import date, timedelta

# Base SQLite en memoire : le test ne touche jamais MySQL et ne laisse
# aucun fichier derriere lui.
os.environ["DB_HOST"] = ""
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app  # noqa: E402
from app.config import Config  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import (  # noqa: E402
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
from app.services import compute_and_store_prediction  # noqa: E402


class ConfigTest(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    TESTING = True
    JWT_SECRET_KEY = "cle-de-test"


VERT, ROUGE, JAUNE, GRIS, FIN = "\033[92m", "\033[91m", "\033[93m", "\033[90m", "\033[0m"

resultats = {"reussis": 0, "echoues": 0}


def verifier(nom, condition, detail=""):
    if condition:
        resultats["reussis"] += 1
        print(f"  {VERT}OK{FIN}     {nom}")
    else:
        resultats["echoues"] += 1
        print(f"  {ROUGE}ECHEC{FIN}  {nom}  {GRIS}{detail}{FIN}")


def peupler():
    """Trois profils volontairement contrastes, pour verifier que le modele
    les discrimine correctement."""
    filiere = Filiere(nom="Reseaux Informatiques", code="RI")
    db.session.add(filiere)
    db.session.flush()

    classe = Classe(filiere_id=filiere.id, niveau="L3", nom="L3-RI")
    db.session.add(classe)
    db.session.flush()

    admin_user = User(identifiant="admin", role="admin", statut="actif")
    admin_user.set_password("Admin@2026")
    db.session.add(admin_user)

    ens_user = User(identifiant="ens1", role="enseignant", statut="actif")
    ens_user.set_password("Ens@2026!")
    db.session.add(ens_user)
    db.session.flush()

    enseignant = Teacher(user_id=ens_user.id, nom="Diallo", prenom="Fatou")
    db.session.add(enseignant)
    db.session.flush()

    db.session.add(
        TeacherAssignment(
            teacher_id=enseignant.id, classe_id=classe.id, matiere="Reseaux"
        )
    )

    profils = [
        ("Sow", "Amadou", "ETU001", [15, 16, 14.5, 17, 15.5], 0.95),
        ("Ba", "Mariama", "ETU002", [11, 10.5, 9.5, 10, 11.5], 0.72),
        ("Fall", "Ousmane", "ETU003", [8, 7, 6.5, 5, 6], 0.42),
    ]

    etudiants = []
    for nom, prenom, matricule, notes, taux in profils:
        utilisateur = User(identifiant=matricule.lower(), role="etudiant", statut="actif")
        utilisateur.set_password("Etudiant@2026")
        db.session.add(utilisateur)
        db.session.flush()

        etudiant = Student(
            user_id=utilisateur.id,
            matricule=matricule,
            nom=nom,
            prenom=prenom,
            classe_id=classe.id,
        )
        db.session.add(etudiant)
        db.session.flush()
        etudiants.append(etudiant)

        for index, note in enumerate(notes):
            db.session.add(
                Grade(
                    student_id=etudiant.id,
                    matiere="Reseaux" if index % 2 == 0 else "Mathematiques",
                    note=note,
                    semestre="S5",
                    type_evaluation="devoir" if index % 2 else "examen",
                    saisi_par_teacher_id=enseignant.id,
                )
            )

    # Appels de presence : 20 seances communes a la classe
    for jour in range(20):
        seance = CourseSession(
            classe_id=classe.id,
            matiere="Reseaux",
            teacher_id=enseignant.id,
            semestre="S5",
            date_cours=date.today() - timedelta(days=jour * 3),
        )
        db.session.add(seance)
        db.session.flush()

        for etudiant, (_, _, _, _, taux) in zip(etudiants, profils):
            present = (jour / 20) < taux
            db.session.add(
                Presence(
                    session_id=seance.id,
                    student_id=etudiant.id,
                    statut="present" if present else "absent",
                )
            )

    db.session.commit()

    for etudiant in etudiants:
        compute_and_store_prediction(etudiant)

    return etudiants


def jeton(client, identifiant, mot_de_passe):
    reponse = client.post(
        "/api/auth/login",
        json={"identifiant": identifiant, "mot_de_passe": mot_de_passe},
    )
    return reponse.get_json().get("access_token")


def executer():
    application = create_app(ConfigTest)

    with application.app_context():
        db.create_all()
        etudiants = peupler()
        identifiants_etudiants = [e.id for e in etudiants]

        client = application.test_client()

        print(f"\n{JAUNE}=== AUTHENTIFICATION ==={FIN}")
        jeton_admin = jeton(client, "admin", "Admin@2026")
        verifier("Connexion administrateur", jeton_admin is not None)

        jeton_enseignant = jeton(client, "ens1", "Ens@2026!")
        verifier("Connexion enseignant", jeton_enseignant is not None)

        jeton_etudiant = jeton(client, "etu003", "Etudiant@2026")
        verifier("Connexion etudiant", jeton_etudiant is not None)

        entetes_admin = {"Authorization": f"Bearer {jeton_admin}"}
        entetes_ens = {"Authorization": f"Bearer {jeton_enseignant}"}
        entetes_etu = {"Authorization": f"Bearer {jeton_etudiant}"}

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== TABLEAU DE BORD ADMINISTRATEUR ==={FIN}")
        reponse = client.get("/api/admin/dashboard", headers=entetes_admin)
        verifier("GET /api/admin/dashboard", reponse.status_code == 200, reponse.status_code)

        corps = reponse.get_json() or {}
        for cle in (
            "statistiques",
            "repartition_risque",
            "evolution",
            "par_filiere",
            "alertes_recentes",
            "etudiants_a_risque",
        ):
            verifier(f"  bloc '{cle}' present", cle in corps)

        stats = corps.get("statistiques", {})
        verifier(
            "  total_etudiants = 3",
            stats.get("total_etudiants") == 3,
            f"recu {stats.get('total_etudiants')}",
        )
        verifier(
            "  moyenne_generale calculee",
            isinstance(stats.get("moyenne_generale"), (int, float))
            and stats.get("moyenne_generale") > 0,
        )
        verifier(
            "  assiduite_moyenne calculee",
            isinstance(stats.get("assiduite_moyenne"), (int, float))
            and stats.get("assiduite_moyenne") > 0,
        )
        verifier(
            "  repartition totalise 3 etudiants",
            sum(l["valeur"] for l in corps.get("repartition_risque", [])) == 3,
        )
        verifier(
            "  filiere RI presente",
            any(f["filiere"] == "RI" for f in corps.get("par_filiere", [])),
        )

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== TABLEAU DE BORD ENSEIGNANT ==={FIN}")
        reponse = client.get("/api/teacher/dashboard", headers=entetes_ens)
        verifier("GET /api/teacher/dashboard", reponse.status_code == 200, reponse.status_code)

        corps = reponse.get_json() or {}
        verifier(
            "  3 etudiants suivis",
            corps.get("statistiques", {}).get("total_etudiants") == 3,
        )
        verifier("  1 affectation", len(corps.get("affectations", [])) == 1)
        verifier(
            "  effectif de la classe renseigne",
            corps.get("affectations", [{}])[0].get("effectif") == 3,
        )

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== PREDICTION DETAILLEE ==={FIN}")
        id_faible = identifiants_etudiants[2]  # Ousmane Fall, profil fragile
        reponse = client.get(
            f"/api/predictions/students/{id_faible}/detail", headers=entetes_admin
        )
        verifier("GET .../detail", reponse.status_code == 200, reponse.status_code)

        detail = reponse.get_json() or {}
        for cle in (
            "score_reussite",
            "score_risque",
            "niveau_risque",
            "confiance",
            "explication",
            "recommandations",
            "variables",
            "contexte",
            "etudiant",
        ):
            verifier(f"  bloc '{cle}' present", cle in detail)

        verifier(
            "  score_reussite + score_risque = 100",
            abs(detail.get("score_reussite", 0) + detail.get("score_risque", 0) - 100) < 0.2,
        )
        verifier(
            "  etudiant faible classe a risque eleve",
            detail.get("niveau_risque") == "eleve",
            f"recu {detail.get('niveau_risque')}",
        )
        verifier(
            "  indice de confiance entre 0 et 100",
            0 <= detail.get("confiance", {}).get("indice", -1) <= 100,
        )
        verifier(
            "  au moins une contribution expliquee",
            len(detail.get("explication", {}).get("contributions", [])) > 0,
        )
        verifier(
            "  synthese redigee",
            bool(detail.get("explication", {}).get("synthese")),
        )
        verifier(
            "  au moins une recommandation",
            len(detail.get("recommandations", [])) > 0,
        )
        verifier(
            "  recommandation urgente presente",
            any(r.get("priorite") == 1 for r in detail.get("recommandations", [])),
        )
        verifier(
            "  matieres en difficulte detectees",
            len(detail.get("contexte", {}).get("matieres_en_difficulte", [])) > 0,
        )

        # Verification de la discrimination du modele
        reponse_bon = client.get(
            f"/api/predictions/students/{identifiants_etudiants[0]}/detail",
            headers=entetes_admin,
        )
        detail_bon = reponse_bon.get_json() or {}
        verifier(
            "  etudiant solide classe a risque faible",
            detail_bon.get("niveau_risque") == "faible",
            f"recu {detail_bon.get('niveau_risque')}",
        )
        verifier(
            "  bon profil > mauvais profil",
            detail_bon.get("score_reussite", 0) > detail.get("score_reussite", 100),
            f"{detail_bon.get('score_reussite')} vs {detail.get('score_reussite')}",
        )

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== ESPACE ETUDIANT ==={FIN}")
        reponse = client.get("/api/student/prediction", headers=entetes_etu)
        verifier("GET /api/student/prediction", reponse.status_code == 200, reponse.status_code)

        vue_etudiant = reponse.get_json() or {}
        categories = {r.get("categorie") for r in vue_etudiant.get("recommandations", [])}
        verifier(
            "  recommandations internes filtrees",
            "Suivi individuel" not in categories and "Orientation" not in categories,
            f"categories vues : {categories}",
        )
        verifier(
            "  l'etudiant voit bien son score",
            vue_etudiant.get("score_reussite") is not None,
        )

        reponse = client.get("/api/student/dashboard", headers=entetes_etu)
        verifier("GET /api/student/dashboard", reponse.status_code == 200, reponse.status_code)

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== ADMINISTRATION DU MODELE ==={FIN}")
        reponse = client.get("/api/admin/modele/metriques", headers=entetes_admin)
        verifier("GET /api/admin/modele/metriques", reponse.status_code == 200)

        metriques = reponse.get_json() or {}
        verifier("  roc_auc present", "roc_auc" in metriques)
        verifier("  rappel_echec present", "rappel_echec" in metriques)
        verifier("  comparatif des modeles present", len(metriques.get("comparatif_modeles", [])) >= 3)
        verifier("  importances presentes", len(metriques.get("importances", [])) > 0)
        verifier("  matrice de confusion presente", "matrice_confusion" in metriques)

        reponse = client.post("/api/admin/predictions/recalculer", headers=entetes_admin)
        verifier("POST /api/admin/predictions/recalculer", reponse.status_code == 200)
        verifier(
            "  3 predictions recalculees",
            (reponse.get_json() or {}).get("nombre_predictions") == 3,
        )

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== SIMULATEUR ==={FIN}")
        reponse = client.post(
            "/api/admin/predictions/simuler",
            headers=entetes_admin,
            json={"notes": [14, 15, 13], "seances_totales": 20, "seances_presentes": 18},
        )
        verifier("POST /simuler (profil solide)", reponse.status_code == 200)
        verifier(
            "  profil solide -> risque faible",
            (reponse.get_json() or {}).get("niveau_risque") == "faible",
        )

        reponse = client.post(
            "/api/admin/predictions/simuler",
            headers=entetes_admin,
            json={"notes": [5, 6, 4], "seances_totales": 20, "seances_presentes": 6},
        )
        verifier(
            "  profil fragile -> risque eleve",
            (reponse.get_json() or {}).get("niveau_risque") == "eleve",
        )

        reponse = client.post(
            "/api/admin/predictions/simuler",
            headers=entetes_admin,
            json={"notes": [25], "seances_totales": 10, "seances_presentes": 5},
        )
        verifier("  note hors bornes rejetee (400)", reponse.status_code == 400)

        reponse = client.post(
            "/api/admin/predictions/simuler",
            headers=entetes_admin,
            json={"notes": [12], "seances_totales": 5, "seances_presentes": 10},
        )
        verifier("  presences > seances rejetees (400)", reponse.status_code == 400)

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== SECURITE ET CONTROLE D'ACCES ==={FIN}")
        reponse = client.get("/api/admin/dashboard")
        verifier("Acces sans jeton refuse (401)", reponse.status_code == 401, reponse.status_code)

        reponse = client.get("/api/admin/dashboard", headers=entetes_etu)
        verifier("Etudiant sur route admin refuse (403)", reponse.status_code == 403, reponse.status_code)

        reponse = client.get("/api/admin/dashboard", headers=entetes_ens)
        verifier("Enseignant sur route admin refuse (403)", reponse.status_code == 403, reponse.status_code)

        reponse = client.get("/api/teacher/dashboard", headers=entetes_admin)
        verifier("Admin sur route enseignant refuse (403)", reponse.status_code == 403, reponse.status_code)

        reponse = client.get("/api/predictions/students/9999/detail", headers=entetes_admin)
        verifier("Etudiant inexistant -> 404", reponse.status_code == 404, reponse.status_code)

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== NON-REGRESSION DES ROUTES EXISTANTES ==={FIN}")
        for route in (
            "/api/admin/overview",
            "/api/admin/students",
            "/api/admin/classes",
            "/api/admin/teachers",
            "/api/admin/alerts",
            "/api/admin/filieres",
            "/api/admin/accounts",
        ):
            reponse = client.get(route, headers=entetes_admin)
            verifier(f"GET {route}", reponse.status_code == 200, reponse.status_code)

        reponse = client.get("/api/health")
        verifier("GET /api/health", reponse.status_code == 200)

        # ------------------------------------------------------------------
        print(f"\n{JAUNE}=== GESTION DES ALERTES (absence de doublons) ==={FIN}")
        from app.models import Alert

        avant = Alert.query.filter_by(student_id=id_faible).count()
        etudiant_faible = db.session.get(Student, id_faible)
        for _ in range(3):
            compute_and_store_prediction(etudiant_faible)
        apres = Alert.query.filter_by(student_id=id_faible).count()

        verifier(
            "3 recalculs ne creent pas de doublons d'alerte",
            apres == avant,
            f"{avant} avant, {apres} apres",
        )

        db.drop_all()

    # ----------------------------------------------------------------------
    total = resultats["reussis"] + resultats["echoues"]
    print(f"\n{'=' * 62}")
    if resultats["echoues"] == 0:
        print(f"{VERT}TOUS LES TESTS PASSENT{FIN} — {resultats['reussis']}/{total}")
    else:
        print(
            f"{ROUGE}{resultats['echoues']} ECHEC(S){FIN} sur {total} "
            f"({resultats['reussis']} reussis)"
        )
    print("=" * 62)
    return 0 if resultats["echoues"] == 0 else 1


if __name__ == "__main__":
    sys.exit(executer())
