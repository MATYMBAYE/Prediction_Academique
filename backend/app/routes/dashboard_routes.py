"""
Routes des tableaux de bord et des predictions detaillees.

Regroupees dans un blueprint distinct plutot qu'ajoutees a
`admin_routes.py` (deja long de 800 lignes) : les agregats de pilotage et la
gestion CRUD n'ont ni les memes evolutions ni les memes lecteurs.

A enregistrer dans app/__init__.py :
    from app.routes.dashboard_routes import dashboard_bp
    app.register_blueprint(dashboard_bp)
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.auth import active_account_required, role_required
from app.extensions import db
from app.ml.predict import obtenir_metriques_modele, recharger_modele
from app.models import Alert, Student, TeacherAssignment, User
from app.services import (
    attendance_rates_by_semestre,
    calculer_prediction,
    compute_and_store_prediction,
    dernieres_predictions_par_etudiant,
    evolution_du_risque,
    matieres_en_difficulte,
    recalculer_toutes_les_predictions,
    repartition_du_risque,
    situation_par_filiere,
    statistiques_globales,
)

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")


# ==========================================================================
# TABLEAU DE BORD ADMINISTRATEUR
# ==========================================================================

@dashboard_bp.get("/admin/dashboard")
@jwt_required()
@role_required("admin")
def tableau_de_bord_admin():
    """Alimente l'ecran de pilotage en un seul appel.

    Choix assume de regrouper six agregats dans une reponse unique plutot
    que d'exposer six endpoints : le tableau de bord les affiche toujours
    ensemble, et six requetes HTTP paralleles au chargement produisent un
    affichage en escalier peu agreable.
    """
    dernieres = dernieres_predictions_par_etudiant()

    # Etudiants a risque, tries du plus fragile au moins fragile
    etudiants_a_risque = []
    for etudiant in Student.query.all():
        prediction = dernieres.get(etudiant.id)
        if prediction is None or prediction.niveau_risque not in ("eleve", "moyen"):
            continue

        donnees = etudiant.to_dict(include_user=True)
        donnees.update(
            {
                "niveau_risque": prediction.niveau_risque,
                "probabilite_reussite": float(prediction.probabilite_reussite),
                "moyenne_generale": (
                    float(prediction.moyenne_generale)
                    if prediction.moyenne_generale is not None
                    else None
                ),
                "taux_assiduite": (
                    float(prediction.taux_assiduite_moyen)
                    if prediction.taux_assiduite_moyen is not None
                    else None
                ),
                "date_prediction": (
                    prediction.date_prediction.isoformat()
                    if prediction.date_prediction
                    else None
                ),
            }
        )
        etudiants_a_risque.append(donnees)

    etudiants_a_risque.sort(key=lambda e: e["probabilite_reussite"])

    alertes = (
        Alert.query.filter(Alert.statut_traitement.in_(["nouvelle", "en_cours"]))
        .order_by(Alert.date_declenchement.desc())
        .limit(10)
        .all()
    )

    return (
        jsonify(
            {
                "statistiques": statistiques_globales(),
                "repartition_risque": repartition_du_risque(),
                "evolution": evolution_du_risque(),
                "par_filiere": situation_par_filiere(),
                "alertes_recentes": [alerte.to_dict() for alerte in alertes],
                "etudiants_a_risque": etudiants_a_risque[:50],
            }
        ),
        200,
    )


# ==========================================================================
# TABLEAU DE BORD ENSEIGNANT
# ==========================================================================

@dashboard_bp.get("/teacher/dashboard")
@jwt_required()
@role_required("enseignant")
@active_account_required
def tableau_de_bord_enseignant():
    """Ecran d'accueil de l'enseignant.

    L'ancienne version se limitait a une liste de cartes de classes, sans
    aucune information exploitable. L'enseignant a besoin de savoir, en
    arrivant : combien d'etudiants il suit, lesquels sont en difficulte, et
    ce qu'il lui reste a saisir.
    """
    utilisateur = db.session.get(User, get_jwt_identity())
    enseignant = utilisateur.teacher if utilisateur else None
    if enseignant is None:
        return jsonify({"error": "Fiche enseignant introuvable."}), 404

    affectations = TeacherAssignment.query.filter_by(teacher_id=enseignant.id).all()
    identifiants_classes = {a.classe_id for a in affectations}

    etudiants = (
        Student.query.filter(Student.classe_id.in_(identifiants_classes)).all()
        if identifiants_classes
        else []
    )
    dernieres = dernieres_predictions_par_etudiant()

    compteurs = {"faible": 0, "moyen": 0, "eleve": 0, "inconnu": 0}
    etudiants_a_suivre = []

    for etudiant in etudiants:
        prediction = dernieres.get(etudiant.id)
        niveau = prediction.niveau_risque if prediction else "inconnu"
        compteurs[niveau] += 1

        if niveau in ("eleve", "moyen"):
            etudiants_a_suivre.append(
                {
                    "id": etudiant.id,
                    "nom": etudiant.nom,
                    "prenom": etudiant.prenom,
                    "matricule": etudiant.matricule,
                    "classe": etudiant.classe.nom if etudiant.classe else None,
                    "niveau_risque": niveau,
                    "probabilite_reussite": float(prediction.probabilite_reussite),
                    "moyenne_generale": (
                        float(prediction.moyenne_generale)
                        if prediction.moyenne_generale is not None
                        else None
                    ),
                    "taux_assiduite": (
                        float(prediction.taux_assiduite_moyen)
                        if prediction.taux_assiduite_moyen is not None
                        else None
                    ),
                }
            )

    etudiants_a_suivre.sort(key=lambda e: e["probabilite_reussite"])

    # Detail par affectation : effectif et nombre d'etudiants a risque
    detail_affectations = []
    for affectation in affectations:
        eleves_classe = [e for e in etudiants if e.classe_id == affectation.classe_id]
        a_risque = sum(
            1
            for e in eleves_classe
            if (dernieres.get(e.id) and dernieres[e.id].niveau_risque in ("eleve", "moyen"))
        )
        donnees = affectation.to_dict()
        donnees["effectif"] = len(eleves_classe)
        donnees["etudiants_a_risque"] = a_risque
        detail_affectations.append(donnees)

    return (
        jsonify(
            {
                "enseignant": enseignant.to_dict(include_user=True),
                "statistiques": {
                    "total_etudiants": len(etudiants),
                    "total_classes": len(identifiants_classes),
                    "total_matieres": len({a.matiere for a in affectations}),
                    "etudiants_a_risque": compteurs["eleve"] + compteurs["moyen"],
                },
                "repartition_risque": compteurs,
                "affectations": detail_affectations,
                "etudiants_a_suivre": etudiants_a_suivre[:25],
            }
        ),
        200,
    )


# ==========================================================================
# PREDICTION DETAILLEE
# ==========================================================================

def _prediction_complete(etudiant):
    """Assemble la fiche de prediction : scores, confiance, explication,
    recommandations et donnees de contexte."""
    resultat = calculer_prediction(etudiant, avec_explication=True)
    if resultat is None:
        return None

    assiduite = [
        {"semestre": semestre, "taux_presence": round(taux, 2)}
        for semestre, taux in sorted(attendance_rates_by_semestre(etudiant).items())
    ]

    historique = [
        {
            "date": p.date_prediction.isoformat() if p.date_prediction else None,
            "probabilite": float(p.probabilite_reussite),
            "score": round(float(p.probabilite_reussite) * 100, 1),
            "niveau_risque": p.niveau_risque,
            "semestre": p.semestre,
        }
        for p in sorted(
            etudiant.predictions,
            key=lambda p: p.date_prediction or 0,
        )
    ]

    resultat["contexte"] = {
        "assiduite_par_semestre": assiduite,
        "matieres_en_difficulte": [
            {**m, "moyenne": round(m["moyenne"], 2)} for m in matieres_en_difficulte(etudiant)
        ],
        "historique_predictions": historique,
    }
    return resultat


@dashboard_bp.get("/predictions/students/<int:student_id>/detail")
@jwt_required()
@role_required("admin", "enseignant")
def detail_prediction(student_id):
    """Fiche de prediction complete d'un etudiant (admin et enseignants)."""
    etudiant = db.session.get(Student, student_id)
    if etudiant is None:
        return jsonify({"error": "Etudiant introuvable."}), 404

    resultat = _prediction_complete(etudiant)
    if resultat is None:
        return (
            jsonify(
                {
                    "error": "donnees_insuffisantes",
                    "message": (
                        "Aucune note ni aucun appel de presence n'est enregistre "
                        "pour cet etudiant : aucune prediction n'est possible."
                    ),
                }
            ),
            422,
        )

    resultat["etudiant"] = etudiant.to_dict(include_user=True)
    return jsonify(resultat), 200


@dashboard_bp.get("/student/prediction")
@jwt_required()
@role_required("etudiant")
@active_account_required
def ma_prediction():
    """Prediction de l'etudiant connecte.

    Nuance importante par rapport a la vue administrateur : les
    recommandations destinees a l'equipe pedagogique ("convoquer",
    "signaler au service social") ne sont pas renvoyees telles quelles a
    l'etudiant. Elles sont filtrees pour ne conserver que celles qu'il peut
    lui-meme mettre en oeuvre, et le vocabulaire de pilotage est ecarte.
    """
    utilisateur = db.session.get(User, get_jwt_identity())
    etudiant = utilisateur.student if utilisateur else None
    if etudiant is None:
        return jsonify({"error": "Fiche etudiant introuvable."}), 404

    resultat = _prediction_complete(etudiant)
    if resultat is None:
        return (
            jsonify(
                {
                    "error": "donnees_insuffisantes",
                    "message": (
                        "Votre dossier ne contient pas encore assez de donnees "
                        "pour etablir une prediction."
                    ),
                }
            ),
            422,
        )

    categories_internes = {"Suivi individuel", "Orientation"}
    resultat["recommandations"] = [
        recommandation
        for recommandation in resultat.get("recommandations", [])
        if recommandation["categorie"] not in categories_internes
    ]
    return jsonify(resultat), 200


# ==========================================================================
# ADMINISTRATION DU MODELE
# ==========================================================================

@dashboard_bp.post("/admin/predictions/recalculer")
@jwt_required()
@role_required("admin")
def recalculer_predictions():
    """Recalcule la prediction de tous les etudiants."""
    nombre = recalculer_toutes_les_predictions()
    return (
        jsonify(
            {
                "message": f"{nombre} prediction(s) recalculee(s).",
                "nombre_predictions": nombre,
            }
        ),
        200,
    )


@dashboard_bp.post("/admin/predictions/students/<int:student_id>/recalculer")
@jwt_required()
@role_required("admin", "enseignant")
def recalculer_prediction_etudiant(student_id):
    """Recalcule la prediction d'un seul etudiant."""
    etudiant = db.session.get(Student, student_id)
    if etudiant is None:
        return jsonify({"error": "Etudiant introuvable."}), 404

    prediction = compute_and_store_prediction(etudiant)
    if prediction is None:
        return (
            jsonify({"error": "Aucune donnee disponible pour cet etudiant."}),
            422,
        )
    return jsonify(prediction.to_dict()), 201


@dashboard_bp.get("/admin/modele/metriques")
@jwt_required()
@role_required("admin")
def metriques_du_modele():
    """Performances du modele en service.

    Affichees dans l'interface d'administration : un systeme de prediction
    dont personne ne peut consulter la fiabilite ne devrait pas etre utilise
    pour prendre des decisions concernant des etudiants.
    """
    metriques = obtenir_metriques_modele()
    if not metriques:
        return (
            jsonify({"error": "Aucune metrique disponible. Entrainez d'abord le modele."}),
            404,
        )
    return jsonify(metriques), 200


@dashboard_bp.post("/admin/modele/recharger")
@jwt_required()
@role_required("admin")
def recharger_le_modele():
    """Recharge le modele depuis le disque apres un reentrainement, sans
    avoir a redemarrer le serveur Flask."""
    recharger_modele()
    return jsonify({"message": "Modele recharge.", "metriques": obtenir_metriques_modele()}), 200


# ==========================================================================
# SIMULATEUR
# ==========================================================================

@dashboard_bp.post("/admin/predictions/simuler")
@jwt_required()
@role_required("admin", "enseignant")
def simuler_prediction():
    """Simule une prediction a partir de valeurs saisies a la main.

    Sert deux usages : verifier le comportement du modele lors de la
    soutenance, et repondre a la question pedagogique "de combien cet
    etudiant doit-il remonter son assiduite pour repasser sous le seuil ?".

    Corps attendu :
        {"notes": [12, 9, 14], "seances_totales": 20, "seances_presentes": 15}
    """
    from flask import current_app

    donnees = request.get_json(silent=True) or {}
    notes = donnees.get("notes") or []

    if not isinstance(notes, list):
        return jsonify({"error": "`notes` doit etre une liste de nombres."}), 400

    try:
        notes = [float(note) for note in notes]
    except (TypeError, ValueError):
        return jsonify({"error": "Toutes les notes doivent etre numeriques."}), 400

    if any(note < 0 or note > 20 for note in notes):
        return jsonify({"error": "Les notes doivent etre comprises entre 0 et 20."}), 400

    try:
        seances_totales = int(donnees.get("seances_totales") or 0)
        seances_presentes = int(donnees.get("seances_presentes") or 0)
    except (TypeError, ValueError):
        return jsonify({"error": "Les nombres de seances doivent etre entiers."}), 400

    if seances_presentes > seances_totales:
        return (
            jsonify({"error": "Le nombre de presences ne peut exceder le nombre de seances."}),
            400,
        )

    from app.ml.predict import predire

    resultat = predire(
        notes_chronologiques=notes,
        seances_totales=seances_totales,
        seances_presentes=seances_presentes,
        seuil_eleve=current_app.config["SEUIL_RISQUE_ELEVE"],
        seuil_moyen=current_app.config["SEUIL_RISQUE_MOYEN"],
    )
    return jsonify(resultat), 200
