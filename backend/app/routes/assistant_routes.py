"""
Routes de l'espace Assistante pédagogique (/api/assistant).

Périmètre :
- Gestion académique (classes, filières, années académiques, consultation des affectations).
- Suivi pédagogique des étudiants (tableau de bord, alertes, fiches individuelles,
  saisie/import de notes, identification des étudiants à risque, prédictions ML).
- Pas de gestion des comptes ni des rôles utilisateurs.
"""
from collections import defaultdict
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.academic import ALL_SEMESTRES, NIVEAUX
from app.auth import role_required
from app.extensions import db
from app.models import (
    Alert,
    AnneeAcademique,
    Classe,
    CourseSession,
    Filiere,
    Grade,
    Prediction,
    Student,
    TeacherAssignment,
)
from app.services import (
    attendance_rates_by_semestre,
    compute_and_store_prediction,
    dernieres_predictions_par_etudiant,
    evolution_du_risque,
    repartition_du_risque,
    situation_par_filiere,
    statistiques_globales,
)
from app.utils.pagination import paginate_list
from app.utils.student_import_export import (
    parse_student_file_to_rows,
    validate_student_data,
    execute_student_import_batch,
    generate_template_response,
    export_students_dataset,
)

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/assistant")


def _latest_predictions_map():
    latest = {}
    predictions = Prediction.query.order_by(Prediction.date_prediction.desc()).all()
    for p in predictions:
        if p.student_id not in latest:
            latest[p.student_id] = p
    return latest


# ==========================================================================
# 1. TABLEAU DE BORD PÉDAGOGIQUE
# ==========================================================================
@assistant_bp.get("/dashboard")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def dashboard():
    """Données synthétiques pour le pilotage pédagogique de l'assistante."""
    dernieres = dernieres_predictions_par_etudiant()

    etudiants_a_risque = []
    for etudiant in Student.query.all():
        pred = dernieres.get(etudiant.id)
        if pred is None or pred.niveau_risque not in ("eleve", "moyen"):
            continue

        donnees = etudiant.to_dict()
        donnees.update(
            {
                "niveau_risque": pred.niveau_risque,
                "probabilite_reussite": float(pred.probabilite_reussite),
                "moyenne_generale": float(pred.moyenne_generale) if pred.moyenne_generale is not None else None,
                "taux_assiduite": float(pred.taux_assiduite_moyen) if pred.taux_assiduite_moyen is not None else None,
                "date_prediction": pred.date_prediction.isoformat() if pred.date_prediction else None,
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

    annees = AnneeAcademique.query.order_by(AnneeAcademique.annee_debut.desc()).all()
    annee_active = next((a.to_dict() for a in annees if a.statut == "active"), None)

    # Transformation repartition_du_risque (liste) → dict {faible, moyen, eleve}
    # pour compatibilité avec le frontend
    repartition_liste = repartition_du_risque()
    repartition_dict = {item["niveau"]: item["valeur"] for item in repartition_liste}

    # Calcul par_filiere avec les clés faible/moyen/eleve attendues par le frontend
    agregats_filiere = defaultdict(lambda: {"faible": 0, "moyen": 0, "eleve": 0, "filiere": ""})
    etudiants_avec_classe = (
        Student.query.join(Classe, Student.classe_id == Classe.id)
        .join(Filiere, Classe.filiere_id == Filiere.id)
        .all()
    )
    for etudiant in etudiants_avec_classe:
        if not (etudiant.classe and etudiant.classe.filiere):
            continue
        code = etudiant.classe.filiere.code
        agregats_filiere[code]["filiere"] = code
        pred = dernieres.get(etudiant.id)
        if pred and pred.niveau_risque in ("faible", "moyen", "eleve"):
            agregats_filiere[code][pred.niveau_risque] += 1

    par_filiere = sorted(
        list(agregats_filiere.values()),
        key=lambda x: x["filiere"]
    )

    return (
        jsonify(
            {
                "statistiques": statistiques_globales(),
                "repartition_risque": repartition_dict,
                "evolution": evolution_du_risque(),
                "par_filiere": par_filiere,
                "alertes_recentes": [a.to_dict() for a in alertes],
                "etudiants_a_risque": etudiants_a_risque[:30],
                "annee_active": annee_active,
                "total_classes": Classe.query.count(),
                "total_filieres": Filiere.query.count(),
            }
        ),
        200,
    )


# ==========================================================================
# 2. SUIVI DES ÉTUDIANTS & ÉVOLUTION ACADÉMIQUE
# ==========================================================================
@assistant_bp.get("/students/template")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def download_students_template():
    """Télécharge un modèle CSV ou Excel sans colonne mot de passe."""
    file_format = request.args.get("format", "csv").lower()
    return generate_template_response(file_format=file_format)


@assistant_bp.post("/students/import-preview")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def preview_students_import():
    """Prévisualise et valide les lignes du fichier d'importation avant enregistrement."""
    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier téléversé."}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Nom de fichier invalide."}), 400

    try:
        raw_rows, headers = parse_student_file_to_rows(file)
        validation_result = validate_student_data(raw_rows)
        validation_result["headers_detected"] = headers
        return jsonify(validation_result), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as e:
        return jsonify({"error": f"Erreur lors de l'analyse du fichier : {str(e)}"}), 500


@assistant_bp.post("/students/import")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def execute_students_import():
    """Exécute l'importation définitive des lignes validées, crée les comptes et expédie les accès par email."""
    data = request.get_json(silent=True) or {}
    valid_rows = data.get("valid_rows", [])
    send_emails = data.get("send_emails", True)

    if not valid_rows or not isinstance(valid_rows, list):
        return jsonify({"error": "Aucune ligne valide fournie pour l'importation."}), 400

    result = execute_student_import_batch(valid_rows, send_emails=send_emails)
    return jsonify(result), 200


@assistant_bp.get("/students/export")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def export_students():
    """Exporte la liste des étudiants au format CSV ou Excel selon les filtres actifs."""
    query = Student.query
    filiere_id = request.args.get("filiere_id", type=int)
    niveau = request.args.get("niveau")
    classe_id = request.args.get("classe_id", type=int)
    search = request.args.get("q")
    file_format = request.args.get("format", "csv").lower()

    if filiere_id or niveau or classe_id:
        query = query.join(Classe, Student.classe_id == Classe.id)
        if filiere_id:
            query = query.filter(Classe.filiere_id == filiere_id)
        if niveau:
            query = query.filter(Classe.niveau == niveau)
        if classe_id:
            query = query.filter(Student.classe_id == classe_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                Student.nom.ilike(like),
                Student.prenom.ilike(like),
                Student.matricule.ilike(like),
            )
        )

    return export_students_dataset(query, file_format=file_format)


@assistant_bp.get("/students")

@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_students():
    """Liste filtrable et paginée des étudiants pour le suivi pédagogique."""
    query = Student.query
    filiere_id = request.args.get("filiere_id", type=int)
    niveau = request.args.get("niveau")
    classe_id = request.args.get("classe_id", type=int)
    search = request.args.get("q")
    risque = request.args.get("risque")

    if filiere_id or niveau or classe_id:
        query = query.join(Classe, Student.classe_id == Classe.id)
        if filiere_id:
            query = query.filter(Classe.filiere_id == filiere_id)
        if niveau:
            query = query.filter(Classe.niveau == niveau)
        if classe_id:
            query = query.filter(Student.classe_id == classe_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                Student.nom.ilike(like),
                Student.prenom.ilike(like),
                Student.matricule.ilike(like),
            )
        )

    students = query.order_by(Student.nom).all()
    latest = _latest_predictions_map()

    data = []
    for s in students:
        pred = latest.get(s.id)
        niveau_risque = pred.niveau_risque if pred else "inconnu"
        if risque and niveau_risque != risque:
            continue
        item = s.to_dict()
        item["niveau_risque"] = niveau_risque
        item["probabilite_reussite"] = float(pred.probabilite_reussite) if pred else None
        item["moyenne_generale"] = float(pred.moyenne_generale) if pred and pred.moyenne_generale is not None else None
        item["taux_assiduite"] = (
            float(pred.taux_assiduite_moyen) if pred and pred.taux_assiduite_moyen is not None else None
        )
        data.append(item)

    return jsonify(paginate_list(data)), 200


@assistant_bp.get("/students/<int:student_id>")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def get_student(student_id):
    """Fiche détaillée de l'étudiant avec notes, assiduité et prédictions."""
    student = Student.query.get_or_404(student_id)
    data = student.to_dict()
    data["notes"] = [g.to_dict() for g in student.grades]
    data["assiduite"] = [
        {"semestre": sem, "taux_presence": round(taux, 2)}
        for sem, taux in sorted(
            attendance_rates_by_semestre(student).items(),
            key=lambda kv: ALL_SEMESTRES.index(kv[0]) if kv[0] in ALL_SEMESTRES else 99,
        )
    ]
    data["predictions"] = [p.to_dict() for p in student.predictions]
    data["alertes"] = [a.to_dict() for a in student.alerts]
    return jsonify(data), 200


@assistant_bp.post("/students/<int:student_id>/grades")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def add_grade(student_id):
    """Saisie de note par l'assistante pédagogique avec recalcul ML immédiat."""
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
        return jsonify({"error": "La note doit être un nombre."}), 400
    if not 0 <= note <= 20:
        return jsonify({"error": "La note doit être comprise entre 0 et 20."}), 400

    type_evaluation = data.get("type_evaluation", "examen")
    if type_evaluation not in ("devoir", "examen"):
        return jsonify({"error": "type_evaluation doit être 'devoir' ou 'examen'."}), 400

    grade = Grade(
        student_id=student.id,
        matiere=data["matiere"].strip(),
        note=note,
        semestre=data["semestre"],
        type_evaluation=type_evaluation,
    )
    db.session.add(grade)
    db.session.commit()

    prediction = compute_and_store_prediction(student)

    return (
        jsonify(
            {
                "grade": grade.to_dict(),
                "prediction": prediction.to_dict() if prediction else None,
                "message": "Note enregistrée et prédiction actualisée avec succès.",
            }
        ),
        201,
    )


# ==========================================================================
# 3. ÉTUDIANTS À RISQUE & PRÉDICTIONS
# ==========================================================================
@assistant_bp.get("/students-at-risk")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_students_at_risk():
    """Liste priorisée des étudiants à risque d'échec (élevé et moyen)."""
    dernieres = dernieres_predictions_par_etudiant()
    niveau_filtre = request.args.get("niveau_risque")

    result = []
    for student in Student.query.all():
        pred = dernieres.get(student.id)
        if pred is None:
            continue
        if pred.niveau_risque not in ("eleve", "moyen"):
            continue
        if niveau_filtre and pred.niveau_risque != niveau_filtre:
            continue

        item = student.to_dict()
        item.update(
            {
                "prediction_id": pred.id,
                "niveau_risque": pred.niveau_risque,
                "probabilite_reussite": float(pred.probabilite_reussite),
                "moyenne_generale": float(pred.moyenne_generale) if pred.moyenne_generale is not None else None,
                "taux_assiduite": float(pred.taux_assiduite_moyen) if pred.taux_assiduite_moyen is not None else None,
                "date_prediction": pred.date_prediction.isoformat() if pred.date_prediction else None,
            }
        )
        result.append(item)

    result.sort(key=lambda x: x["probabilite_reussite"])
    return jsonify(paginate_list(result)), 200


# ==========================================================================
# 4. ALERTES PÉDAGOGIQUES
# ==========================================================================
@assistant_bp.get("/alerts")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_alerts():
    """Consultation et filtrage des alertes pédagogiques."""
    query = Alert.query
    statut = request.args.get("statut")
    if statut:
        query = query.filter_by(statut_traitement=statut)
    alerts = query.order_by(Alert.date_declenchement.desc()).all()
    return jsonify(paginate_list([a.to_dict() for a in alerts])), 200


@assistant_bp.put("/alerts/<int:alert_id>")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def update_alert(alert_id):
    """Mise à jour du statut de traitement d'une alerte."""
    alert = Alert.query.get_or_404(alert_id)
    data = request.get_json(silent=True) or {}
    statut = data.get("statut_traitement")
    if statut not in ("nouvelle", "en_cours", "traitee"):
        return jsonify({"error": "Statut de traitement invalide."}), 400
    alert.statut_traitement = statut
    db.session.commit()
    return jsonify(alert.to_dict()), 200


# ==========================================================================
# 5. GESTION ACADÉMIQUE (CLASSES, FILIÈRES, ANNÉES, AFFECTATIONS)
# ==========================================================================
@assistant_bp.get("/classes")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_classes():
    return jsonify([c.to_dict(include_stats=True) for c in Classe.query.all()]), 200


@assistant_bp.post("/classes")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
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
        return jsonify({"error": "Cette classe existe déjà pour cette filière."}), 409

    classe = Classe(filiere_id=filiere_id, niveau=niveau, nom=f"{filiere.code} - {niveau}")
    db.session.add(classe)
    db.session.commit()
    return jsonify(classe.to_dict(include_stats=True)), 201


@assistant_bp.get("/filieres")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_filieres():
    return jsonify([f.to_dict() for f in Filiere.query.order_by(Filiere.nom).all()]), 200


@assistant_bp.post("/filieres")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def create_filiere():
    data = request.get_json(silent=True) or {}
    nom = (data.get("nom") or "").strip()
    code = (data.get("code") or "").strip().upper()
    if not nom or not code:
        return jsonify({"error": "nom et code sont requis."}), 400
    if Filiere.query.filter_by(code=code).first():
        return jsonify({"error": "Ce code de filiere existe déjà."}), 409

    filiere = Filiere(nom=nom, code=code)
    db.session.add(filiere)
    db.session.commit()
    return jsonify(filiere.to_dict()), 201


@assistant_bp.put("/filieres/<int:filiere_id>")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def update_filiere(filiere_id):
    filiere = Filiere.query.get_or_404(filiere_id)
    data = request.get_json(silent=True) or {}
    if data.get("nom"):
        filiere.nom = data["nom"].strip()
    if data.get("code"):
        code = data["code"].strip().upper()
        existing = Filiere.query.filter_by(code=code).first()
        if existing and existing.id != filiere_id:
            return jsonify({"error": "Ce code de filiere existe déjà."}), 409
        filiere.code = code
    db.session.commit()
    return jsonify(filiere.to_dict()), 200


@assistant_bp.get("/affectations")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_affectations():
    """Consultation des affectations par l'assistante pédagogique."""
    assignments = TeacherAssignment.query.all()
    return jsonify([a.to_dict() for a in assignments]), 200


@assistant_bp.get("/annees-academiques")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def list_annees_academiques():
    annees = AnneeAcademique.query.order_by(AnneeAcademique.annee_debut.desc()).all()
    return jsonify([a.to_dict() for a in annees]), 200


@assistant_bp.post("/annees-academiques")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def create_annee_academique():
    data = request.get_json(silent=True) or {}
    libelle = (data.get("libelle") or "").strip()
    annee_debut = data.get("annee_debut")
    annee_fin = data.get("annee_fin")
    statut = data.get("statut", "active")

    if not libelle or not annee_debut or not annee_fin:
        return jsonify({"error": "libelle, annee_debut et annee_fin sont requis."}), 400

    if AnneeAcademique.query.filter_by(libelle=libelle).first():
        return jsonify({"error": "Cette année académique existe déjà."}), 409

    if statut == "active":
        # Si la nouvelle année est active, passer les autres à clôturée/à venir
        AnneeAcademique.query.filter_by(statut="active").update({"statut": "cloturee"})

    annee = AnneeAcademique(
        libelle=libelle,
        annee_debut=int(annee_debut),
        annee_fin=int(annee_fin),
        statut=statut,
    )
    db.session.add(annee)
    db.session.commit()
    return jsonify(annee.to_dict()), 201


@assistant_bp.put("/annees-academiques/<int:annee_id>")
@jwt_required()
@role_required("assistante_pedagogique", "admin")
def update_annee_academique(annee_id):
    annee = AnneeAcademique.query.get_or_404(annee_id)
    data = request.get_json(silent=True) or {}
    if data.get("statut"):
        nouveau_statut = data["statut"]
        if nouveau_statut not in ("active", "cloturee", "a_venir"):
            return jsonify({"error": "Statut invalide."}), 400
        if nouveau_statut == "active":
            AnneeAcademique.query.filter(AnneeAcademique.id != annee_id, AnneeAcademique.statut == "active").update(
                {"statut": "cloturee"}
            )
        annee.statut = nouveau_statut

    if data.get("libelle"):
        annee.libelle = data["libelle"].strip()

    db.session.commit()
    return jsonify(annee.to_dict()), 200
