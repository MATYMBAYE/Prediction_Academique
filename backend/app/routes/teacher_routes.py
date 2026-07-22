from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.academic import ALL_SEMESTRES
from app.auth import role_required
from app.extensions import db
from app.models import CourseSession, Grade, Presence, Student, Teacher, TeacherAssignment, User
from app.services import compute_and_store_prediction

teacher_bp = Blueprint("teacher", __name__, url_prefix="/api/teacher")


def _current_teacher():
    user = User.query.get(get_jwt_identity())
    return user.teacher if user else None


def _assert_assignment(teacher, classe_id, matiere):
    return TeacherAssignment.query.filter_by(teacher_id=teacher.id, classe_id=classe_id, matiere=matiere).first()


@teacher_bp.get("/me/classes")
@jwt_required()
@role_required("enseignant")
def my_classes():
    """Classes et matieres affectees a l'enseignant connecte (§2, §7)."""
    teacher = _current_teacher()
    if teacher is None:
        return jsonify({"error": "Fiche enseignant introuvable."}), 404

    return jsonify([a.to_dict() for a in teacher.assignments]), 200


@teacher_bp.get("/classes/<int:classe_id>/students")
@jwt_required()
@role_required("enseignant")
def class_students(classe_id):
    teacher = _current_teacher()
    matiere = request.args.get("matiere")
    if not TeacherAssignment.query.filter_by(teacher_id=teacher.id, classe_id=classe_id).first():
        return jsonify({"error": "Vous n'etes pas affecte a cette classe."}), 403

    students = Student.query.filter_by(classe_id=classe_id).order_by(Student.nom).all()
    return jsonify([s.to_dict() for s in students]), 200


@teacher_bp.post("/appel")
@jwt_required()
@role_required("enseignant")
def take_attendance():
    """Enregistre l'appel d'une session de cours (§2) : cree la session et
    le statut present/absent de chaque etudiant, puis recalcule la
    prediction de chaque etudiant concerne.
    """
    teacher = _current_teacher()
    data = request.get_json(silent=True) or {}

    classe_id = data.get("classe_id")
    matiere = data.get("matiere")
    semestre = data.get("semestre")
    date_cours = data.get("date_cours")
    presences_payload = data.get("presences") or []

    if not all([classe_id, matiere, semestre, date_cours]) or not presences_payload:
        return jsonify({"error": "classe_id, matiere, semestre, date_cours et presences sont requis."}), 400
    if semestre not in ALL_SEMESTRES:
        return jsonify({"error": "Semestre invalide."}), 400
    if not _assert_assignment(teacher, classe_id, matiere):
        return jsonify({"error": "Vous n'etes pas affecte a cette classe pour cette matiere."}), 403

    try:
        date_cours_parsed = datetime.strptime(date_cours, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Date de cours invalide (format attendu AAAA-MM-JJ)."}), 400

    session = CourseSession(
        classe_id=classe_id,
        matiere=matiere,
        teacher_id=teacher.id,
        semestre=semestre,
        date_cours=date_cours_parsed,
    )
    db.session.add(session)
    db.session.flush()

    affected_students = []
    for entry in presences_payload:
        student_id = entry.get("student_id")
        statut = entry.get("statut")
        if statut not in ("present", "absent") or not student_id:
            continue
        db.session.add(Presence(session_id=session.id, student_id=student_id, statut=statut))
        affected_students.append(student_id)

    db.session.commit()

    for student_id in affected_students:
        student = Student.query.get(student_id)
        if student:
            compute_and_store_prediction(student)

    return jsonify(session.to_dict()), 201


@teacher_bp.get("/appel/historique")
@jwt_required()
@role_required("enseignant")
def attendance_history():
    teacher = _current_teacher()
    classe_id = request.args.get("classe_id", type=int)
    matiere = request.args.get("matiere")

    query = CourseSession.query.filter_by(teacher_id=teacher.id)
    if classe_id:
        query = query.filter_by(classe_id=classe_id)
    if matiere:
        query = query.filter_by(matiere=matiere)

    sessions = query.order_by(CourseSession.date_cours.desc()).all()
    return jsonify([s.to_dict() for s in sessions]), 200


@teacher_bp.post("/notes")
@jwt_required()
@role_required("enseignant")
def add_grade():
    """Saisie de note par l'enseignant, restreinte a ses matieres/classes affectees (§7)."""
    teacher = _current_teacher()
    data = request.get_json(silent=True) or {}

    classe_id = data.get("classe_id")
    matiere = data.get("matiere")
    student_id = data.get("student_id")
    semestre = data.get("semestre")
    type_evaluation = data.get("type_evaluation", "examen")

    if not all([classe_id, matiere, student_id, semestre]):
        return jsonify({"error": "classe_id, matiere, student_id et semestre sont requis."}), 400
    if semestre not in ALL_SEMESTRES:
        return jsonify({"error": "Semestre invalide."}), 400
    if type_evaluation not in ("devoir", "examen"):
        return jsonify({"error": "type_evaluation doit etre 'devoir' ou 'examen'."}), 400
    if not _assert_assignment(teacher, classe_id, matiere):
        return jsonify({"error": "Vous n'etes pas affecte a cette classe pour cette matiere."}), 403

    student = Student.query.get_or_404(student_id)
    if student.classe_id != int(classe_id):
        return jsonify({"error": "Cet etudiant n'appartient pas a cette classe."}), 400

    try:
        note = float(data.get("note"))
    except (TypeError, ValueError):
        return jsonify({"error": "La note doit etre un nombre."}), 400
    if not 0 <= note <= 20:
        return jsonify({"error": "La note doit etre comprise entre 0 et 20."}), 400

    grade = Grade(
        student_id=student.id,
        matiere=matiere,
        note=note,
        semestre=semestre,
        type_evaluation=type_evaluation,
        saisi_par_teacher_id=teacher.id,
    )
    db.session.add(grade)
    db.session.commit()

    prediction = compute_and_store_prediction(student)

    return jsonify(
        {"grade": grade.to_dict(), "prediction": prediction.to_dict() if prediction else None}
    ), 201


@teacher_bp.get("/notes")
@jwt_required()
@role_required("enseignant")
def list_grades():
    teacher = _current_teacher()
    classe_id = request.args.get("classe_id", type=int)
    matiere = request.args.get("matiere")

    if not classe_id or not matiere:
        return jsonify({"error": "classe_id et matiere sont requis."}), 400
    if not _assert_assignment(teacher, classe_id, matiere):
        return jsonify({"error": "Vous n'etes pas affecte a cette classe pour cette matiere."}), 403

    students = Student.query.filter_by(classe_id=classe_id).order_by(Student.nom).all()
    data = []
    for s in students:
        grades = [g for g in s.grades if g.matiere == matiere]
        data.append({"student": s.to_dict(), "notes": [g.to_dict() for g in grades]})
    return jsonify(data), 200
