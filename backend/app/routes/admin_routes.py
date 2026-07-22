import csv
import io
from collections import defaultdict
from datetime import datetime

from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.academic import ALL_SEMESTRES, NIVEAUX
from app.auth import role_required
from app.extensions import db
from app.utils.validators import validate_password
from app.models import (
    AccountStatusHistory,
    Alert,
    Classe,
    CourseSession,
    Filiere,
    Grade,
    Prediction,
    Reclamation,
    ReclamationMessage,
    Student,
    Teacher,
    TeacherAssignment,
    User,
)
from app.services import attendance_rates_by_semestre, compute_and_store_prediction
from app.utils.pagination import paginate_list
from app.utils.reports import build_predictions_pdf

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _latest_predictions_map():
    """Construit {student_id: Prediction} a partir de la derniere prediction de chacun."""
    latest = {}
    predictions = Prediction.query.order_by(Prediction.date_prediction.desc()).all()
    for p in predictions:
        if p.student_id not in latest:
            latest[p.student_id] = p
    return latest


# ------------------------------------------------------------------
# Vue d'ensemble (§5.3)
# ------------------------------------------------------------------
@admin_bp.get("/overview")
@jwt_required()
@role_required("admin")
def overview():
    total_students = Student.query.count()
    latest = _latest_predictions_map()
    nb_a_risque = sum(1 for p in latest.values() if p.niveau_risque in ("eleve", "moyen"))
    nb_comptes_desactives = User.query.filter_by(role="etudiant", statut="inactif").count()

    return jsonify(
        {
            "total_etudiants": total_students,
            "etudiants_a_risque": nb_a_risque,
            "comptes_desactives": nb_comptes_desactives,
        }
    ), 200


# ------------------------------------------------------------------
# Gestion des etudiants (FR-01 a FR-04)
# ------------------------------------------------------------------
@admin_bp.get("/students")
@jwt_required()
@role_required("admin")
def list_students():
    query = Student.query
    filiere_id = request.args.get("filiere_id", type=int)
    niveau = request.args.get("niveau")
    search = request.args.get("q")

    if filiere_id or niveau:
        query = query.join(Classe, Student.classe_id == Classe.id)
        if filiere_id:
            query = query.filter(Classe.filiere_id == filiere_id)
        if niveau:
            query = query.filter(Classe.niveau == niveau)
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Student.nom.ilike(like), Student.prenom.ilike(like), Student.matricule.ilike(like)))

    students = query.order_by(Student.nom).all()
    latest = _latest_predictions_map()

    risque = request.args.get("risque")
    data = []
    for s in students:
        pred = latest.get(s.id)
        niveau_risque = pred.niveau_risque if pred else "inconnu"
        if risque and niveau_risque != risque:
            continue
        item = s.to_dict(include_user=True)
        item["niveau_risque"] = niveau_risque
        data.append(item)

    return jsonify(paginate_list(data)), 200


@admin_bp.get("/students/<int:student_id>")
@jwt_required()
@role_required("admin")
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    data = student.to_dict(include_user=True)
    data["notes"] = [g.to_dict() for g in student.grades]
    data["assiduite"] = [
        {"semestre": sem, "taux_presence": round(taux, 2)}
        for sem, taux in sorted(attendance_rates_by_semestre(student).items(), key=lambda kv: ALL_SEMESTRES.index(kv[0]) if kv[0] in ALL_SEMESTRES else 99)
    ]
    data["predictions"] = [p.to_dict() for p in student.predictions]
    return jsonify(data), 200


@admin_bp.post("/students")
@jwt_required()
@role_required("admin")
def create_student():
    data = request.get_json(silent=True) or {}
    required = ["matricule", "nom", "prenom", "identifiant", "mot_de_passe"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Champs manquants : {', '.join(missing)}"}), 400

    if User.query.filter_by(identifiant=data["identifiant"]).first():
        return jsonify({"error": "Cet identifiant existe deja."}), 409
    if Student.query.filter_by(matricule=data["matricule"]).first():
        return jsonify({"error": "Ce matricule existe deja."}), 409

    classe_id = data.get("classe_id")
    if classe_id and not Classe.query.get(classe_id):
        return jsonify({"error": "Classe introuvable."}), 400

    is_valid, err_msg = validate_password(data["mot_de_passe"])
    if not is_valid:
        return jsonify({"error": err_msg}), 400

    user = User(identifiant=data["identifiant"], email=data.get("email"), role="etudiant", statut="actif")
    user.set_password(data["mot_de_passe"])
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        matricule=data["matricule"],
        nom=data["nom"],
        prenom=data["prenom"],
        classe_id=classe_id,
    )
    db.session.add(student)
    db.session.commit()

    return jsonify(student.to_dict(include_user=True)), 201


@admin_bp.put("/students/<int:student_id>")
@jwt_required()
@role_required("admin")
def update_student(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json(silent=True) or {}

    for field in ("nom", "prenom", "matricule"):
        if field in data:
            setattr(student, field, data[field])

    if "classe_id" in data:
        classe_id = data["classe_id"]
        if classe_id and not Classe.query.get(classe_id):
            return jsonify({"error": "Classe introuvable."}), 400
        student.classe_id = classe_id

    db.session.commit()
    return jsonify(student.to_dict(include_user=True)), 200


@admin_bp.delete("/students/<int:student_id>")
@jwt_required()
@role_required("admin")
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    user = student.user
    db.session.delete(student)
    if user:
        db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Etudiant supprime."}), 200


# ------------------------------------------------------------------
# Notes (FR-02, FR-04) + recalcul auto de prediction
# L'assiduite est desormais alimentee par le module d'appel Enseignant (§2)
# ------------------------------------------------------------------
@admin_bp.post("/students/<int:student_id>/grades")
@jwt_required()
@role_required("admin")
def add_grade(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json(silent=True) or {}

    required = ["matiere", "note", "semestre"]
    missing = [f for f in required if data.get(f) in (None, "")]
    if missing:
        return jsonify({"error": f"Champs manquants : {', '.join(missing)}"}), 400
    if data["semestre"] not in ALL_SEMESTRES:
        return jsonify({"error": "Semestre invalide."}), 400

    try:
        note = float(data["note"])
    except (TypeError, ValueError):
        return jsonify({"error": "La note doit etre un nombre."}), 400
    if not 0 <= note <= 20:
        return jsonify({"error": "La note doit etre comprise entre 0 et 20."}), 400

    type_evaluation = data.get("type_evaluation", "examen")
    if type_evaluation not in ("devoir", "examen"):
        return jsonify({"error": "type_evaluation doit etre 'devoir' ou 'examen'."}), 400

    grade = Grade(
        student_id=student.id,
        matiere=data["matiere"],
        note=note,
        semestre=data["semestre"],
        type_evaluation=type_evaluation,
    )
    db.session.add(grade)
    db.session.commit()

    prediction = compute_and_store_prediction(student)

    return jsonify(
        {"grade": grade.to_dict(), "prediction": prediction.to_dict() if prediction else None}
    ), 201


# ------------------------------------------------------------------
# Gestion des comptes etudiants (FR-14 a FR-18)
# ------------------------------------------------------------------
@admin_bp.get("/accounts")
@jwt_required()
@role_required("admin")
def list_accounts():
    users = User.query.filter_by(role="etudiant").order_by(User.identifiant).all()
    data = []
    for u in users:
        item = u.to_dict()
        if u.student:
            item["etudiant"] = f"{u.student.prenom} {u.student.nom}"
            item["matricule"] = u.student.matricule
        data.append(item)
    return jsonify(paginate_list(data)), 200


@admin_bp.post("/accounts/<int:user_id>/toggle-status")
@jwt_required()
@role_required("admin")
def toggle_account_status(user_id):
    """Active ou desactive un compte etudiant (FR-14, FR-15).
    Necessite confirmation cote frontend (modale) + motif (§5.4).
    """
    user = User.query.get_or_404(user_id)
    if user.role not in ("etudiant", "enseignant"):
        return jsonify({"error": "Seuls les comptes etudiants et enseignants peuvent etre geres ici."}), 400

    data = request.get_json(silent=True) or {}
    nouveau_statut = data.get("statut")
    motif = data.get("motif")

    if nouveau_statut not in ("actif", "inactif"):
        return jsonify({"error": "Statut invalide (attendu : 'actif' ou 'inactif')."}), 400

    ancien_statut = user.statut
    if ancien_statut == nouveau_statut:
        return jsonify({"error": f"Le compte est deja {nouveau_statut}."}), 409

    admin_id = get_jwt_identity()

    user.statut = nouveau_statut
    user.derniere_modification_statut = datetime.utcnow()

    history = AccountStatusHistory(
        user_id=user.id,
        ancien_statut=ancien_statut,
        nouveau_statut=nouveau_statut,
        motif=motif,
        modifie_par_user_id=admin_id,
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({"user": user.to_dict(), "history": history.to_dict()}), 200


@admin_bp.get("/accounts/history")
@jwt_required()
@role_required("admin")
def account_history():
    history = AccountStatusHistory.query.order_by(AccountStatusHistory.date_changement.desc()).all()
    return jsonify(paginate_list([h.to_dict() for h in history])), 200


# ------------------------------------------------------------------
# Alertes (FR-09, FR-10)
# ------------------------------------------------------------------
@admin_bp.get("/alerts")
@jwt_required()
@role_required("admin")
def list_alerts():
    alerts = Alert.query.order_by(Alert.date_declenchement.desc()).all()
    return jsonify(paginate_list([a.to_dict() for a in alerts])), 200


@admin_bp.put("/alerts/<int:alert_id>")
@jwt_required()
@role_required("admin")
def update_alert(alert_id):
    alert = Alert.query.get_or_404(alert_id)
    data = request.get_json(silent=True) or {}
    statut = data.get("statut_traitement")
    if statut not in ("nouvelle", "en_cours", "traitee"):
        return jsonify({"error": "Statut de traitement invalide."}), 400
    alert.statut_traitement = statut
    db.session.commit()
    return jsonify(alert.to_dict()), 200


# ------------------------------------------------------------------
# Filieres
# ------------------------------------------------------------------
@admin_bp.get("/filieres")
@jwt_required()
@role_required("admin")
def list_filieres():
    return jsonify([f.to_dict() for f in Filiere.query.order_by(Filiere.nom).all()]), 200


@admin_bp.post("/filieres")
@jwt_required()
@role_required("admin")
def create_filiere():
    data = request.get_json(silent=True) or {}
    if not data.get("nom") or not data.get("code"):
        return jsonify({"error": "nom et code sont requis."}), 400
    if Filiere.query.filter_by(code=data["code"]).first():
        return jsonify({"error": "Ce code de filiere existe deja."}), 409

    filiere = Filiere(nom=data["nom"], code=data["code"])
    db.session.add(filiere)
    db.session.commit()
    return jsonify(filiere.to_dict()), 201

@admin_bp.put("/filieres/<int:filiere_id>")
@jwt_required()
@role_required("admin")
def update_filiere(filiere_id):
    filiere = Filiere.query.get_or_404(filiere_id)
    data = request.get_json(silent=True) or {}
    if data.get("nom"):
        filiere.nom = data["nom"]
    if data.get("code"):
        existing = Filiere.query.filter_by(code=data["code"]).first()
        if existing and existing.id != filiere_id:
            return jsonify({"error": "Ce code de filiere existe deja."}), 409
        filiere.code = data["code"]
    db.session.commit()
    return jsonify(filiere.to_dict()), 200



# ------------------------------------------------------------------
# Gestion des classes (§3.2)
# ------------------------------------------------------------------
@admin_bp.get("/classes")
@jwt_required()
@role_required("admin")
def list_classes():
    return jsonify([c.to_dict(include_stats=True) for c in Classe.query.all()]), 200


@admin_bp.get("/classes/<int:classe_id>")
@jwt_required()
@role_required("admin")
def get_classe(classe_id):
    classe = Classe.query.get_or_404(classe_id)
    data = classe.to_dict(include_stats=True)
    sessions = CourseSession.query.filter_by(classe_id=classe_id).order_by(CourseSession.date_cours.desc()).all()
    data["historique_appels"] = [s.to_dict() for s in sessions]
    return jsonify(data), 200


@admin_bp.post("/classes")
@jwt_required()
@role_required("admin")
def create_classe():
    data = request.get_json(silent=True) or {}
    filiere_id = data.get("filiere_id")
    niveau = data.get("niveau")

    if not filiere_id or niveau not in NIVEAUX:
        return jsonify({"error": "filiere_id et niveau (L1..M2) sont requis."}), 400

    filiere = Filiere.query.get(filiere_id)
    if filiere is None:
        return jsonify({"error": "Filiere introuvable."}), 400
    if Classe.query.filter_by(filiere_id=filiere_id, niveau=niveau).first():
        return jsonify({"error": "Cette classe existe deja pour cette filiere."}), 409

    classe = Classe(filiere_id=filiere_id, niveau=niveau, nom=f"{filiere.code} - {niveau}")
    db.session.add(classe)
    db.session.commit()
    return jsonify(classe.to_dict(include_stats=True)), 201


@admin_bp.post("/classes/<int:classe_id>/enseignants")
@jwt_required()
@role_required("admin")
def assign_teacher(classe_id):
    Classe.query.get_or_404(classe_id)
    data = request.get_json(silent=True) or {}
    teacher_id = data.get("teacher_id")
    matiere = data.get("matiere")

    if not teacher_id or not matiere:
        return jsonify({"error": "teacher_id et matiere sont requis."}), 400
    if Teacher.query.get(teacher_id) is None:
        return jsonify({"error": "Enseignant introuvable."}), 400
    if TeacherAssignment.query.filter_by(teacher_id=teacher_id, classe_id=classe_id, matiere=matiere).first():
        return jsonify({"error": "Cette affectation existe deja."}), 409

    assignment = TeacherAssignment(teacher_id=teacher_id, classe_id=classe_id, matiere=matiere)
    db.session.add(assignment)
    db.session.commit()
    return jsonify(assignment.to_dict()), 201


@admin_bp.delete("/classes/enseignants/<int:assignment_id>")
@jwt_required()
@role_required("admin")
def unassign_teacher(assignment_id):
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"message": "Affectation supprimee."}), 200


# ------------------------------------------------------------------
# Gestion des enseignants
# ------------------------------------------------------------------
@admin_bp.get("/teachers")
@jwt_required()
@role_required("admin")
def list_teachers():
    teachers = Teacher.query.order_by(Teacher.nom).all()
    return jsonify(paginate_list([t.to_dict(include_user=True) for t in teachers])), 200


@admin_bp.post("/teachers")
@jwt_required()
@role_required("admin")
def create_teacher():
    data = request.get_json(silent=True) or {}
    required = ["nom", "prenom", "identifiant", "mot_de_passe"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Champs manquants : {', '.join(missing)}"}), 400
    if User.query.filter_by(identifiant=data["identifiant"]).first():
        return jsonify({"error": "Cet identifiant existe deja."}), 409

    is_valid, err_msg = validate_password(data["mot_de_passe"])
    if not is_valid:
        return jsonify({"error": err_msg}), 400

    user = User(identifiant=data["identifiant"], email=data.get("email"), role="enseignant", statut="actif")
    user.set_password(data["mot_de_passe"])
    db.session.add(user)
    db.session.flush()

    teacher = Teacher(user_id=user.id, nom=data["nom"], prenom=data["prenom"])
    db.session.add(teacher)
    db.session.commit()
    return jsonify(teacher.to_dict(include_user=True)), 201


@admin_bp.get("/teachers/<int:teacher_id>")
@jwt_required()
@role_required("admin")
def get_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    return jsonify(teacher.to_dict(include_user=True)), 200


@admin_bp.put("/teachers/<int:teacher_id>")
@jwt_required()
@role_required("admin")
def update_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    data = request.get_json(silent=True) or {}

    for field in ("nom", "prenom"):
        if field in data:
            setattr(teacher, field, data[field])

    if teacher.user:
        if "identifiant" in data and data["identifiant"] != teacher.user.identifiant:
            if User.query.filter_by(identifiant=data["identifiant"]).first():
                return jsonify({"error": "Cet identifiant existe deja."}), 409
            teacher.user.identifiant = data["identifiant"]
        if "email" in data:
            teacher.user.email = data["email"]
        if data.get("mot_de_passe"):
            is_valid, err_msg = validate_password(data["mot_de_passe"])
            if not is_valid:
                return jsonify({"error": err_msg}), 400
            teacher.user.set_password(data["mot_de_passe"])

    db.session.commit()
    return jsonify(teacher.to_dict(include_user=True)), 200


@admin_bp.delete("/teachers/<int:teacher_id>")
@jwt_required()
@role_required("admin")
def delete_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    user = teacher.user
    db.session.delete(teacher)
    if user:
        db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Enseignant supprime."}), 200


# ------------------------------------------------------------------
# Statistiques de prediction (§3.3)
# ------------------------------------------------------------------
@admin_bp.get("/predictions/stats")
@jwt_required()
@role_required("admin")
def predictions_stats():
    latest = _latest_predictions_map()
    students_by_id = {s.id: s for s in Student.query.all()}

    repartition_risque = defaultdict(int)
    par_filiere = defaultdict(lambda: defaultdict(int))
    par_niveau = defaultdict(lambda: defaultdict(int))
    assiduite_par_classe = defaultdict(list)
    a_risque_eleve = []

    for student_id, pred in latest.items():
        student = students_by_id.get(student_id)
        if student is None:
            continue
        repartition_risque[pred.niveau_risque] += 1

        classe = student.classe
        if classe:
            if classe.filiere:
                par_filiere[classe.filiere.nom][pred.niveau_risque] += 1
            par_niveau[classe.niveau][pred.niveau_risque] += 1
            if pred.taux_assiduite_moyen is not None:
                assiduite_par_classe[classe.nom].append(float(pred.taux_assiduite_moyen))

        if pred.niveau_risque == "eleve":
            a_risque_eleve.append(
                {
                    "student_id": student.id,
                    "nom": student.nom,
                    "prenom": student.prenom,
                    "classe": classe.nom if classe else None,
                    "probabilite_reussite": float(pred.probabilite_reussite),
                }
            )

    # Etudiants sans aucune classe assignee : non repartis par filiere/niveau,
    # deja comptabilises dans repartition_risque globale.

    evolution_raw = defaultdict(list)
    for pred in Prediction.query.filter(Prediction.semestre.isnot(None)).all():
        evolution_raw[pred.semestre].append(float(pred.probabilite_reussite))

    evolution_semestre = [
        {"semestre": sem, "taux_reussite_moyen": round(sum(vals) / len(vals), 4)}
        for sem, vals in evolution_raw.items()
        if sem in ALL_SEMESTRES
    ]
    evolution_semestre.sort(key=lambda item: ALL_SEMESTRES.index(item["semestre"]))

    taux_assiduite_par_classe = [
        {"classe": classe_nom, "taux_moyen": round(sum(vals) / len(vals), 2)}
        for classe_nom, vals in assiduite_par_classe.items()
    ]

    a_risque_eleve.sort(key=lambda item: item["probabilite_reussite"])

    return jsonify(
        {
            "repartition_risque": {
                "faible": repartition_risque.get("faible", 0),
                "moyen": repartition_risque.get("moyen", 0),
                "eleve": repartition_risque.get("eleve", 0),
            },
            "par_filiere": [
                {"filiere": nom, "faible": v.get("faible", 0), "moyen": v.get("moyen", 0), "eleve": v.get("eleve", 0)}
                for nom, v in par_filiere.items()
            ],
            "par_niveau": [
                {
                    "niveau": niveau,
                    "faible": par_niveau[niveau].get("faible", 0),
                    "moyen": par_niveau[niveau].get("moyen", 0),
                    "eleve": par_niveau[niveau].get("eleve", 0),
                }
                for niveau in NIVEAUX
                if niveau in par_niveau
            ],
            "evolution_semestre": evolution_semestre,
            "taux_assiduite_par_classe": taux_assiduite_par_classe,
            "etudiants_a_risque_eleve": a_risque_eleve,
        }
    ), 200


# ------------------------------------------------------------------
# Reclamations (§3.4)
# ------------------------------------------------------------------
@admin_bp.get("/reclamations")
@jwt_required()
@role_required("admin")
def list_reclamations():
    query = Reclamation.query
    statut = request.args.get("statut")
    if statut:
        query = query.filter_by(statut=statut)
    reclamations = query.order_by(Reclamation.date_creation.desc()).all()
    return jsonify(paginate_list([r.to_dict() for r in reclamations])), 200


@admin_bp.get("/reclamations/<int:reclamation_id>")
@jwt_required()
@role_required("admin")
def get_reclamation(reclamation_id):
    reclamation = Reclamation.query.get_or_404(reclamation_id)
    return jsonify(reclamation.to_dict(include_messages=True)), 200


@admin_bp.post("/reclamations/<int:reclamation_id>/messages")
@jwt_required()
@role_required("admin")
def reply_reclamation(reclamation_id):
    reclamation = Reclamation.query.get_or_404(reclamation_id)
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Le message ne peut pas etre vide."}), 400

    db.session.add(ReclamationMessage(reclamation_id=reclamation.id, auteur_role="admin", message=message))
    if reclamation.statut == "nouvelle":
        reclamation.statut = "en_cours"
    db.session.commit()
    return jsonify(reclamation.to_dict(include_messages=True)), 201


@admin_bp.put("/reclamations/<int:reclamation_id>")
@jwt_required()
@role_required("admin")
def update_reclamation_status(reclamation_id):
    reclamation = Reclamation.query.get_or_404(reclamation_id)
    data = request.get_json(silent=True) or {}
    statut = data.get("statut")
    if statut not in ("nouvelle", "en_cours", "resolue"):
        return jsonify({"error": "Statut invalide."}), 400
    reclamation.statut = statut
    db.session.commit()
    return jsonify(reclamation.to_dict()), 200


# ------------------------------------------------------------------
# Rapports (§3.5) - export PDF / CSV
# ------------------------------------------------------------------
@admin_bp.get("/rapports/predictions.csv")
@jwt_required()
@role_required("admin")
def rapport_predictions_csv():
    rows = _rapport_predictions_rows(
        filiere_id=request.args.get("filiere_id", type=int),
        niveau=request.args.get("niveau"),
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Matricule", "Nom", "Prenom", "Filiere", "Niveau", "Classe", "Niveau de risque", "Probabilite de reussite", "Taux assiduite moyen"])
    for row in rows:
        writer.writerow(
            [row["matricule"], row["nom"], row["prenom"], row["filiere"], row["niveau"], row["classe"], row["niveau_risque"], row["probabilite_reussite"], row["taux_assiduite_moyen"]]
        )

    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=rapport_predictions.csv"},
    )


@admin_bp.get("/rapports/predictions.pdf")
@jwt_required()
@role_required("admin")
def rapport_predictions_pdf():
    rows = _rapport_predictions_rows(
        filiere_id=request.args.get("filiere_id", type=int),
        niveau=request.args.get("niveau"),
    )
    pdf_bytes = build_predictions_pdf(rows)
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": "attachment; filename=rapport_predictions.pdf"},
    )


def _rapport_predictions_rows(filiere_id=None, niveau=None):
    latest = _latest_predictions_map()
    query = Student.query
    if filiere_id or niveau:
        query = query.join(Classe, Student.classe_id == Classe.id)
        if filiere_id:
            query = query.filter(Classe.filiere_id == filiere_id)
        if niveau:
            query = query.filter(Classe.niveau == niveau)

    rows = []
    for student in query.order_by(Student.nom).all():
        pred = latest.get(student.id)
        classe = student.classe
        rows.append(
            {
                "matricule": student.matricule,
                "nom": student.nom,
                "prenom": student.prenom,
                "filiere": classe.filiere.nom if classe and classe.filiere else "-",
                "niveau": classe.niveau if classe else "-",
                "classe": classe.nom if classe else "-",
                "niveau_risque": pred.niveau_risque if pred else "inconnu",
                "probabilite_reussite": f"{float(pred.probabilite_reussite):.2%}" if pred else "-",
                "taux_assiduite_moyen": f"{float(pred.taux_assiduite_moyen):.1f}%" if pred and pred.taux_assiduite_moyen is not None else "-",
            }
        )
    return rows


@admin_bp.get("/rapports/assiduite.csv")
@jwt_required()
@role_required("admin")
def rapport_assiduite_csv():
    classe_id = request.args.get("classe_id", type=int)
    query = Student.query
    if classe_id:
        query = query.filter_by(classe_id=classe_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Matricule", "Nom", "Prenom", "Classe", "Semestre", "Taux de presence (%)"])
    for student in query.order_by(Student.nom).all():
        rates = attendance_rates_by_semestre(student)
        for semestre in ALL_SEMESTRES:
            if semestre in rates:
                writer.writerow(
                    [student.matricule, student.nom, student.prenom, student.classe.nom if student.classe else "-", semestre, round(rates[semestre], 2)]
                )

    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=rapport_assiduite.csv"},
    )


@admin_bp.get("/rapports/comptes-desactives.csv")
@jwt_required()
@role_required("admin")
def rapport_comptes_desactives_csv():
    date_debut = request.args.get("date_debut")
    date_fin = request.args.get("date_fin")

    query = AccountStatusHistory.query.filter_by(nouveau_statut="inactif")
    if date_debut:
        query = query.filter(AccountStatusHistory.date_changement >= date_debut)
    if date_fin:
        query = query.filter(AccountStatusHistory.date_changement <= date_fin)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Etudiant", "Motif", "Date de desactivation"])
    for h in query.order_by(AccountStatusHistory.date_changement.desc()).all():
        writer.writerow([h.to_dict()["etudiant"], h.motif or "-", h.date_changement.strftime("%Y-%m-%d %H:%M")])

    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=rapport_comptes_desactives.csv"},
    )
