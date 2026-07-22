from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.academic import ALL_SEMESTRES
from app.auth import active_account_required, role_required
from app.extensions import db
from app.models import Reclamation, ReclamationMessage, User
from app.services import attendance_rates_by_semestre

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


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
# ------------------------------------------------------------------
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


@student_bp.get("/reclamations/<int:reclamation_id>")
@jwt_required()
@role_required("etudiant")
@active_account_required
def get_my_reclamation(reclamation_id):
    student = _get_current_student()
    reclamation = Reclamation.query.filter_by(id=reclamation_id, student_id=student.id).first_or_404()
    return jsonify(reclamation.to_dict(include_messages=True)), 200


@student_bp.post("/reclamations")
@jwt_required()
@role_required("etudiant")
@active_account_required
def create_reclamation():
    student = _get_current_student()
    data = request.get_json(silent=True) or {}
    sujet = (data.get("sujet") or "").strip()
    message = (data.get("message") or "").strip()

    if not sujet or not message:
        return jsonify({"error": "sujet et message sont requis."}), 400

    reclamation = Reclamation(student_id=student.id, sujet=sujet)
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
    db.session.commit()
    return jsonify(reclamation.to_dict(include_messages=True)), 201
