from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.academic import ALL_SEMESTRES
from app.auth import role_required
from app.extensions import db
from app.models import (
    CourseSession,
    DemandeRattrapage,
    Grade,
    Presence,
    PresenceHistory,
    Reclamation,
    ReclamationMessage,
    Student,
    Teacher,
    TeacherAssignment,
    User,
)
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


def _get_owned_session(teacher, session_id):
    """Charge une session de cours en verifiant qu'elle appartient bien a
    l'enseignant connecte, pour eviter qu'il ne consulte/modifie l'appel
    d'un collegue en devinant un identifiant.
    """
    session = CourseSession.query.get(session_id)
    if session is None:
        return None, (jsonify({"error": "Session d'appel introuvable."}), 404)
    if session.teacher_id != teacher.id:
        return None, (jsonify({"error": "Vous n'etes pas l'auteur de cet appel."}), 403)
    return session, None


@teacher_bp.get("/appel/<int:session_id>")
@jwt_required()
@role_required("enseignant")
def attendance_session_detail(session_id):
    """Detail d'une session d'appel passee, pour relecture ou correction."""
    teacher = _current_teacher()
    session, error = _get_owned_session(teacher, session_id)
    if error:
        return error

    presences = sorted(session.presences, key=lambda p: (p.student.nom, p.student.prenom) if p.student else ("", ""))
    return jsonify(
        {
            "session": session.to_dict(),
            "presences": [
                {
                    "id": p.id,
                    "student_id": p.student_id,
                    "etudiant": f"{p.student.prenom} {p.student.nom}" if p.student else None,
                    "statut": p.statut,
                }
                for p in presences
            ],
        }
    ), 200


@teacher_bp.put("/appel/<int:session_id>")
@jwt_required()
@role_required("enseignant")
def update_attendance(session_id):
    """Corrige le statut d'un ou plusieurs etudiants sur un appel deja
    enregistre (ex. absence contestee et justifiee apres coup). Un motif est
    obligatoire et chaque changement est trace dans l'historique (§FR-04).
    """
    teacher = _current_teacher()
    session, error = _get_owned_session(teacher, session_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    presences_payload = data.get("presences") or []
    motif = (data.get("motif") or "").strip()

    presences_by_student = {p.student_id: p for p in session.presences}
    affected_students = []

    for entry in presences_payload:
        student_id = entry.get("student_id")
        statut = entry.get("statut")
        if statut not in ("present", "absent"):
            continue
        presence = presences_by_student.get(student_id)
        if not presence or presence.statut == statut:
            continue
        if not motif:
            return jsonify({"error": "Un motif est requis pour justifier une modification de presence."}), 400

        db.session.add(
            PresenceHistory(
                presence_id=presence.id,
                ancien_statut=presence.statut,
                nouveau_statut=statut,
                motif=motif,
                modifie_par_teacher_id=teacher.id,
            )
        )
        presence.statut = statut
        affected_students.append(student_id)

    if not affected_students:
        return jsonify({"error": "Aucune modification detectee."}), 400

    db.session.commit()

    for student_id in affected_students:
        student = Student.query.get(student_id)
        if student:
            compute_and_store_prediction(student)

    return jsonify(session.to_dict()), 200


@teacher_bp.get("/appel/<int:session_id>/historique")
@jwt_required()
@role_required("enseignant")
def attendance_session_history(session_id):
    """Historique des corrections apportees a un appel : qui a change quoi,
    depuis quel statut vers lequel, et pourquoi.
    """
    teacher = _current_teacher()
    session, error = _get_owned_session(teacher, session_id)
    if error:
        return error

    presence_ids = [p.id for p in session.presences]
    if not presence_ids:
        return jsonify([]), 200

    historique = (
        PresenceHistory.query.filter(PresenceHistory.presence_id.in_(presence_ids))
        .order_by(PresenceHistory.date_changement.desc())
        .all()
    )
    return jsonify([h.to_dict() for h in historique]), 200


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


# ------------------------------------------------------------------
# Reclamations (§3.4) - reception et reponse cote enseignant
#
# Une reclamation est routee vers l'enseignant qui assure la matiere
# concernee (cf. app/routes/student_routes.py) : chaque enseignant ne voit
# et ne peut repondre qu'aux reclamations qui lui sont propres.
# ------------------------------------------------------------------
@teacher_bp.get("/reclamations")
@jwt_required()
@role_required("enseignant")
def list_my_reclamations():
    teacher = _current_teacher()
    statut = request.args.get("statut")

    query = Reclamation.query.filter_by(teacher_id=teacher.id)
    if statut:
        query = query.filter_by(statut=statut)
    reclamations = query.order_by(Reclamation.date_creation.desc()).all()
    return jsonify([r.to_dict() for r in reclamations]), 200


@teacher_bp.get("/reclamations/compteur")
@jwt_required()
@role_required("enseignant")
def count_my_reclamations():
    teacher = _current_teacher()
    nouvelles = Reclamation.query.filter_by(teacher_id=teacher.id, statut="nouvelle").count()
    return jsonify({"nouvelles": nouvelles}), 200


@teacher_bp.get("/reclamations/<int:reclamation_id>")
@jwt_required()
@role_required("enseignant")
def get_my_reclamation(reclamation_id):
    teacher = _current_teacher()
    reclamation = Reclamation.query.filter_by(id=reclamation_id, teacher_id=teacher.id).first_or_404()
    return jsonify(reclamation.to_dict(include_messages=True)), 200


@teacher_bp.post("/reclamations/<int:reclamation_id>/messages")
@jwt_required()
@role_required("enseignant")
def reply_reclamation(reclamation_id):
    teacher = _current_teacher()
    reclamation = Reclamation.query.filter_by(id=reclamation_id, teacher_id=teacher.id).first_or_404()
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Le message ne peut pas etre vide."}), 400

    db.session.add(
        ReclamationMessage(reclamation_id=reclamation.id, auteur_role="enseignant", message=message)
    )
    if reclamation.statut == "nouvelle":
        reclamation.statut = "en_cours"
    # Signale a l'etudiant qu'une reponse l'attend (pastille de notification
    # sur "Mes reclamations", remise a zero des qu'il consulte le detail).
    reclamation.a_nouvelle_reponse = True
    db.session.commit()
    return jsonify(reclamation.to_dict(include_messages=True)), 201


@teacher_bp.put("/reclamations/<int:reclamation_id>")
@jwt_required()
@role_required("enseignant")
def update_reclamation_status(reclamation_id):
    teacher = _current_teacher()
    reclamation = Reclamation.query.filter_by(id=reclamation_id, teacher_id=teacher.id).first_or_404()
    data = request.get_json(silent=True) or {}
    statut = data.get("statut")
    if statut not in ("nouvelle", "en_cours", "resolue"):
        return jsonify({"error": "Statut invalide."}), 400
    reclamation.statut = statut
    db.session.commit()
    return jsonify(reclamation.to_dict()), 200


# ------------------------------------------------------------------
# Rattrapages : gestion et traitement par l'enseignant
# ------------------------------------------------------------------
@teacher_bp.get("/rattrapages")
@jwt_required()
@role_required("enseignant")
def list_teacher_rattrapages():
    teacher = _current_teacher()
    if teacher is None:
        return jsonify({"error": "Profil enseignant introuvable."}), 404

    statut = request.args.get("statut")
    matiere = request.args.get("matiere")

    query = DemandeRattrapage.query.filter_by(teacher_id=teacher.id)
    if statut:
        query = query.filter_by(statut=statut)
    if matiere:
        query = query.filter_by(matiere=matiere)

    demandes = query.order_by(DemandeRattrapage.date_demande.desc()).all()
    return jsonify([d.to_dict() for d in demandes]), 200


@teacher_bp.get("/rattrapages/compteur")
@jwt_required()
@role_required("enseignant")
def count_teacher_rattrapages():
    teacher = _current_teacher()
    if teacher is None:
        return jsonify({"en_attente": 0}), 200

    en_attente = DemandeRattrapage.query.filter_by(teacher_id=teacher.id, statut="en_attente").count()
    return jsonify({"en_attente": en_attente}), 200


@teacher_bp.get("/rattrapages/<int:demande_id>")
@jwt_required()
@role_required("enseignant")
def get_teacher_rattrapage(demande_id):
    teacher = _current_teacher()
    demande = DemandeRattrapage.query.filter_by(id=demande_id, teacher_id=teacher.id).first_or_404()
    return jsonify(demande.to_dict()), 200


@teacher_bp.post("/rattrapages/<int:demande_id>/traiter")
@jwt_required()
@role_required("enseignant")
def process_teacher_rattrapage(demande_id):
    teacher = _current_teacher()
    demande = DemandeRattrapage.query.filter_by(id=demande_id, teacher_id=teacher.id).first_or_404()

    data = request.get_json(silent=True) or {}
    statut = data.get("statut")  # 'acceptee', 'refusee', 'planifiee', 'terminee'
    reponse = (data.get("reponse_enseignant") or "").strip()

    if statut not in ("acceptee", "refusee", "planifiee", "terminee", "en_attente"):
        return jsonify({"error": "Action ou statut invalide."}), 400

    demande.statut = statut
    if reponse:
        demande.reponse_enseignant = reponse

    # Si planification
    date_planifiee_raw = data.get("date_planifiee")
    heure_debut_raw = data.get("heure_debut_planifiee")
    heure_fin_raw = data.get("heure_fin_planifiee")
    salle_planifiee = data.get("salle_planifiee")

    if date_planifiee_raw:
        try:
            demande.date_planifiee = datetime.strptime(date_planifiee_raw, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Format date_planifiee invalide (AAAA-MM-JJ)."}), 400

    if heure_debut_raw:
        try:
            demande.heure_debut_planifiee = datetime.strptime(heure_debut_raw, "%H:%M").time()
        except ValueError:
            pass

    if heure_fin_raw:
        try:
            demande.heure_fin_planifiee = datetime.strptime(heure_fin_raw, "%H:%M").time()
        except ValueError:
            pass

    if salle_planifiee is not None:
        demande.salle_planifiee = salle_planifiee.strip()

    # Notifier l'étudiant
    demande.a_nouvelle_reponse = True
    db.session.commit()

    return jsonify(demande.to_dict()), 200
