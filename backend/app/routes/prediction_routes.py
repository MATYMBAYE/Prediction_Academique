from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.auth import role_required
from app.models import Student
from app.services import compute_and_store_prediction

prediction_bp = Blueprint("prediction", __name__, url_prefix="/api/predictions")


@prediction_bp.post("/students/<int:student_id>/compute")
@jwt_required()
@role_required("admin")
def compute_prediction(student_id):
    """Recalcule la prediction d'un etudiant a la demande (FR-05, FR-06, FR-08).
    Normalement declenchee automatiquement apres saisie de notes/assiduite,
    mais peut aussi etre relancee manuellement par l'administrateur.
    """
    student = Student.query.get_or_404(student_id)
    prediction = compute_and_store_prediction(student)
    if prediction is None:
        return (
            jsonify({"error": "Aucune donnee (notes/assiduite) disponible pour cet etudiant."}),
            400,
        )
    return jsonify(prediction.to_dict()), 201


@prediction_bp.get("/students/<int:student_id>/history")
@jwt_required()
@role_required("admin")
def prediction_history(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify([p.to_dict() for p in student.predictions]), 200
