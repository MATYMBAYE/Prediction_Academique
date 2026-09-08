from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.academic import ALL_SEMESTRES
from app.auth import active_account_required, role_required
from app.extensions import db
from app.models import Alert, DemandeRattrapage, Reclamation, ReclamationMessage, TeacherAssignment, User
from app.services import attendance_rates_by_semestre, calculer_prediction
from datetime import datetime

student_bp = Blueprint("student", __name__, url_prefix="/api/student")

# Une alerte "risque d'echec" resulte du modele de ML dans son ensemble : on
# lui laisse tout le plan d'action. Les deux autres types ciblent un facteur
# precis, donc seules les recommandations de la categorie correspondante ont
# du sens - le reste distrairait l'etudiant d'une action non pertinente.
CATEGORIES_PAR_TYPE_ALERTE = {
    "notes_faibles": {"Accompagnement academique", "Methodologie de travail"},
    "absences_repetees": {"Assiduite"},
}
# Recommandations redigees pour l'equipe pedagogique (convoquer, signaler au
# service social...) : un etudiant ne peut pas agir dessus lui-meme.
CATEGORIES_INTERNES = {"Suivi individuel", "Orientation"}


def _recommandations_filtrees(recommandations, type_alerte):
    utilisables = [r for r in recommandations if r["categorie"] not in CATEGORIES_INTERNES]
    categories_ciblees = CATEGORIES_PAR_TYPE_ALERTE.get(type_alerte)
    if categories_ciblees:
        ciblees = [r for r in utilisables if r["categorie"] in categories_ciblees]
        if ciblees:
            return ciblees[:4]
    return utilisables[:3]


def _get_current_student():
    user = User.query.get(get_jwt_identity())
    return user.student if user else None


@student_bp.get("/dashboard")
@jwt_required()
@role_required("etudiant")
@active_account_required
def dashboard():
    """Tableau de bord etudiant (cahier des charges §4).
    Accessible uniquement si le compte est actif (verifie a chaque
    connexion ET a chaque rechargement, via active_account_required).
    """
    student = _get_current_student()
    if student is None:
        return jsonify({"error": "Fiche etudiant introuvable."}), 404

    grades = sorted(student.grades, key=lambda g: g.date_saisie)
    taux_par_semestre = attendance_rates_by_semestre(student)
    derniere_prediction = student.predictions[0] if student.predictions else None

    trajectoire = [
        {
            "semestre": g.semestre,
            "matiere": g.matiere,
            "note": float(g.note),
            "date": g.date_saisie.isoformat(),
        }
        for g in grades
    ]

    assiduite = [
        {"semestre": sem, "taux_presence": round(taux, 2)}
        for sem, taux in sorted(taux_par_semestre.items(), key=lambda kv: ALL_SEMESTRES.index(kv[0]) if kv[0] in ALL_SEMESTRES else 99)
    ]

    return jsonify(
        {
            "student": student.to_dict(),
            "prediction": derniere_prediction.to_dict() if derniere_prediction else None,
            "notes": [g.to_dict() for g in grades],
            "assiduite": assiduite,
            "trajectoire": trajectoire,
            "historique_predictions": [p.to_dict() for p in student.predictions],
        }
    ), 200


# ------------------------------------------------------------------
# Reclamations (§3.4) - soumission et suivi cote etudiant
#
# Chaque reclamation est desormais routee vers l'enseignant qui assure la
# matiere concernee dans la classe de l'etudiant (via TeacherAssignment),
# plutot que vers l'administration : l'echange reste dans le contexte
# pedagogique qui l'a motive.
# ------------------------------------------------------------------
@student_bp.get("/matieres")
@jwt_required()
@role_required("etudiant")
@active_account_required
def list_my_matieres():
    """Matieres (et enseignant associe) disponibles pour une reclamation,
    d'apres les affectations de la classe de l'etudiant."""
    student = _get_current_student()
    if student is None or student.classe_id is None:
        return jsonify([]), 200

    affectations = TeacherAssignment.query.filter_by(classe_id=student.classe_id).order_by(
        TeacherAssignment.matiere
    ).all()
    return jsonify(
        [
            {
                "matiere": a.matiere,
                "teacher_id": a.teacher_id,
                "enseignant": f"{a.teacher.prenom} {a.teacher.nom}" if a.teacher else None,
            }
            for a in affectations
        ]
    ), 200


@student_bp.get("/reclamations")
@jwt_required()
@role_required("etudiant")
@active_account_required
def list_my_reclamations():
    student = _get_current_student()
    reclamations = (
        Reclamation.query.filter_by(student_id=student.id).order_by(Reclamation.date_creation.desc()).all()
    )
    return jsonify([r.to_dict() for r in reclamations]), 200


@student_bp.get("/reclamations/compteur")
@jwt_required()
@role_required("etudiant")
@active_account_required
def count_my_reclamations():
    student = _get_current_student()
    if student is None:
        return jsonify({"non_lues": 0}), 200
    non_lues = Reclamation.query.filter_by(student_id=student.id, a_nouvelle_reponse=True).count()
    return jsonify({"non_lues": non_lues}), 200


@student_bp.get("/reclamations/<int:reclamation_id>")
@jwt_required()
@role_required("etudiant")
@active_account_required
def get_my_reclamation(reclamation_id):
    student = _get_current_student()
    reclamation = Reclamation.query.filter_by(id=reclamation_id, student_id=student.id).first_or_404()
    # Consulter le detail vaut accuse de lecture de la derniere reponse.
    if reclamation.a_nouvelle_reponse:
        reclamation.a_nouvelle_reponse = False
        db.session.commit()
    return jsonify(reclamation.to_dict(include_messages=True)), 200


@student_bp.post("/reclamations")
@jwt_required()
@role_required("etudiant")
@active_account_required
def create_reclamation():
    student = _get_current_student()
    data = request.get_json(silent=True) or {}
    matiere = (data.get("matiere") or "").strip()
    sujet = (data.get("sujet") or "").strip()
    message = (data.get("message") or "").strip()

    if not matiere or not sujet or not message:
        return jsonify({"error": "matiere, sujet et message sont requis."}), 400

    affectation = TeacherAssignment.query.filter_by(classe_id=student.classe_id, matiere=matiere).first()
    if affectation is None:
        return (
            jsonify({"error": "Aucun enseignant n'est affecte a cette matiere dans votre classe."}),
            400,
        )

    reclamation = Reclamation(
        student_id=student.id,
        teacher_id=affectation.teacher_id,
        matiere=matiere,
        sujet=sujet,
    )
    db.session.add(reclamation)
    db.session.flush()
    db.session.add(ReclamationMessage(reclamation_id=reclamation.id, auteur_role="etudiant", message=message))
    db.session.commit()

    return jsonify(reclamation.to_dict(include_messages=True)), 201


@student_bp.post("/reclamations/<int:reclamation_id>/messages")
@jwt_required()
@role_required("etudiant")
@active_account_required
def reply_my_reclamation(reclamation_id):
    student = _get_current_student()
    reclamation = Reclamation.query.filter_by(id=reclamation_id, student_id=student.id).first_or_404()
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Le message ne peut pas etre vide."}), 400

    db.session.add(ReclamationMessage(reclamation_id=reclamation.id, auteur_role="etudiant", message=message))
    # Un message de l'etudiant sur un dossier deja "traite" rouvre le suivi :
    # l'enseignant doit savoir qu'une action de sa part est de nouveau attendue.
    if reclamation.statut == "resolue":
        reclamation.statut = "en_cours"
    db.session.commit()
    return jsonify(reclamation.to_dict(include_messages=True)), 201


# ------------------------------------------------------------------
# Alertes de risque academique (notes, assiduite, prediction ML)
# ------------------------------------------------------------------
@student_bp.get("/alertes")
@jwt_required()
@role_required("etudiant")
@active_account_required
def list_my_alerts():
    student = _get_current_student()
    if student is None:
        return jsonify({"error": "Fiche etudiant introuvable."}), 404

    alertes = Alert.query.filter_by(student_id=student.id).order_by(Alert.date_declenchement.desc()).all()

    # Une seule evaluation du modele pour toute la liste : les recommandations
    # refletent l'etat actuel du dossier, pas celui au moment du declenchement
    # de chaque alerte (qui peut remonter a plusieurs semaines).
    resultat_prediction = calculer_prediction(student, avec_explication=True)
    recommandations = resultat_prediction.get("recommandations", []) if resultat_prediction else []

    data = []
    for alerte in alertes:
        item = alerte.to_dict()
        item["recommandations"] = _recommandations_filtrees(recommandations, alerte.type_alerte)
        data.append(item)

    return jsonify(data), 200


@student_bp.get("/alertes/compteur")
@jwt_required()
@role_required("etudiant")
@active_account_required
def count_my_alerts():
    student = _get_current_student()
    if student is None:
        return jsonify({"non_lues": 0}), 200

    non_lues = Alert.query.filter_by(student_id=student.id, vue_par_etudiant=False).count()
    return jsonify({"non_lues": non_lues}), 200


@student_bp.post("/alertes/<int:alert_id>/marquer-lue")
@jwt_required()
@role_required("etudiant")
@active_account_required
def mark_alert_read(alert_id):
    student = _get_current_student()
    alerte = Alert.query.filter_by(id=alert_id, student_id=student.id).first_or_404()
    alerte.vue_par_etudiant = True
    db.session.commit()
    return jsonify(alerte.to_dict()), 200


@student_bp.post("/alertes/tout-marquer-lu")
@jwt_required()
@role_required("etudiant")
@active_account_required
def mark_all_alerts_read():
    student = _get_current_student()
    Alert.query.filter_by(student_id=student.id, vue_par_etudiant=False).update({"vue_par_etudiant": True})
    db.session.commit()
    return jsonify({"message": "Toutes les alertes ont ete marquees comme lues."}), 200


# ------------------------------------------------------------------
# Rattrapages : demandes et suivi par l'etudiant
# ------------------------------------------------------------------
@student_bp.get("/rattrapages")
@jwt_required()
@role_required("etudiant")
@active_account_required
def list_my_rattrapages():
    student = _get_current_student()
    if student is None:
        return jsonify({"error": "Fiche etudiant introuvable."}), 404

    demandes = DemandeRattrapage.query.filter_by(student_id=student.id).order_by(DemandeRattrapage.date_demande.desc()).all()
    return jsonify([d.to_dict() for d in demandes]), 200


@student_bp.get("/rattrapages/compteur")
@jwt_required()
@role_required("etudiant")
@active_account_required
def count_my_rattrapages():
    student = _get_current_student()
    if student is None:
        return jsonify({"mises_a_jour": 0, "non_lues": 0}), 200

    mises_a_jour = DemandeRattrapage.query.filter_by(student_id=student.id, a_nouvelle_reponse=True).count()
    return jsonify({"mises_a_jour": mises_a_jour, "non_lues": mises_a_jour}), 200


@student_bp.get("/rattrapages/<int:demande_id>")
@jwt_required()
@role_required("etudiant")
@active_account_required
def get_my_rattrapage(demande_id):
    student = _get_current_student()
    demande = DemandeRattrapage.query.filter_by(id=demande_id, student_id=student.id).first_or_404()
    if demande.a_nouvelle_reponse:
        demande.a_nouvelle_reponse = False
        db.session.commit()
    return jsonify(demande.to_dict()), 200


@student_bp.post("/rattrapages")
@jwt_required()
@role_required("etudiant")
@active_account_required
def create_rattrapage():
    student = _get_current_student()
    if student is None:
        return jsonify({"error": "Fiche etudiant introuvable."}), 404

    data = request.get_json(silent=True) or {}
    matiere = (data.get("matiere") or "").strip()
    motif = (data.get("motif") or "").strip()
    date_souhaitee_raw = data.get("date_souhaitee")
    heure_souhaitee = (data.get("heure_souhaitee") or "").strip()
    message = (data.get("message") or "").strip()

    if not matiere:
        return jsonify({"error": "La matiere est requise."}), 400
    if not motif:
        return jsonify({"error": "Le motif de la demande est requis."}), 400

    # Verification de l'enseignant affecte a cette matiere
    affectation = TeacherAssignment.query.filter_by(classe_id=student.classe_id, matiere=matiere).first()
    teacher_id = affectation.teacher_id if affectation else None

    # Parse date souhaitee
    date_souhaitee_parsed = None
    if date_souhaitee_raw:
        try:
            date_souhaitee_parsed = datetime.strptime(date_souhaitee_raw, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Format de date souhaitee invalide (AAAA-MM-JJ)."}), 400

    # Verification d'une demande similaire encore en attente
    demande_existante = DemandeRattrapage.query.filter_by(
        student_id=student.id,
        matiere=matiere,
        statut="en_attente"
    ).first()
    if demande_existante:
        return jsonify({"error": "Une demande de rattrapage est deja en attente pour cette matiere."}), 400

    demande = DemandeRattrapage(
        student_id=student.id,
        teacher_id=teacher_id,
        matiere=matiere,
        motif=motif,
        date_souhaitee=date_souhaitee_parsed,
        heure_souhaitee=heure_souhaitee if heure_souhaitee else None,
        message=message if message else None,
        statut="en_attente",
    )
    db.session.add(demande)
    db.session.commit()

    return jsonify(demande.to_dict()), 201


@student_bp.delete("/rattrapages/<int:demande_id>")
@jwt_required()
@role_required("etudiant")
@active_account_required
def cancel_my_rattrapage(demande_id):
    student = _get_current_student()
    demande = DemandeRattrapage.query.filter_by(id=demande_id, student_id=student.id).first_or_404()
    if demande.statut not in ("en_attente",):
        return jsonify({"error": "Seules les demandes en attente peuvent etre annulees."}), 400

    db.session.delete(demande)
    db.session.commit()
    return jsonify({"message": "Demande de rattrapage annulee avec succes."}), 200
