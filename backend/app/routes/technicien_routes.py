"""
Routes de l'espace Technicien (/api/technicien).

Périmètre :
- Gestion académique technique (classes, filières, niveaux, matières, enseignants).
- Gestion complète des affectations (création, modification, suppression).
- Vérification d'unicité et audit anti-doublons (Enseignant + Matière + Classe).
- Catalogue centralisé des matières.
- Pas de gestion des comptes utilisateurs ni d'accès aux prédictions/dossiers confidentiels.
"""
from collections import defaultdict
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.academic import ALL_SEMESTRES, NIVEAUX, SEMESTRES_PAR_NIVEAU
from app.auth import role_required
from app.extensions import db
from app.models import Classe, Filiere, Matiere, Teacher, TeacherAssignment
from app.utils.pagination import paginate_list

technicien_bp = Blueprint("technicien", __name__, url_prefix="/api/technicien")


# ==========================================================================
# 1. TABLEAU DE BORD TECHNICIEN
# ==========================================================================
@technicien_bp.get("/dashboard")
@jwt_required()
@role_required("technicien", "admin")
def dashboard():
    """Synthèse des indicateurs d'affectation et de gestion technique."""
    total_classes = Classe.query.count()
    total_filieres = Filiere.query.count()
    total_matieres = Matiere.query.count()
    total_teachers = Teacher.query.count()
    total_assignments = TeacherAssignment.query.count()

    # Enseignants sans affectation
    assigned_teacher_ids = {a.teacher_id for a in TeacherAssignment.query.all()}
    teachers_sans_affectation = [
        t.to_dict() for t in Teacher.query.all() if t.id not in assigned_teacher_ids
    ]

    # Classes sans affectation
    assigned_class_ids = {a.classe_id for a in TeacherAssignment.query.all()}
    classes_sans_affectation = [
        c.to_dict() for c in Classe.query.all() if c.id not in assigned_class_ids
    ]

    # Répartition par matière
    affectations_par_matiere = defaultdict(int)
    for a in TeacherAssignment.query.all():
        affectations_par_matiere[a.matiere] += 1

    return (
        jsonify(
            {
                "statistiques": {
                    "total_classes": total_classes,
                    "total_filieres": total_filieres,
                    "total_matieres": total_matieres,
                    "total_enseignants": total_teachers,
                    "total_affectations": total_assignments,
                    "enseignants_non_affectes": len(teachers_sans_affectation),
                    "classes_non_couvertes": len(classes_sans_affectation),
                },
                "repartition_matieres": [
                    {"matiere": m, "nombre_classes": count}
                    for m, count in sorted(affectations_par_matiere.items(), key=lambda x: x[1], reverse=True)
                ],
                "alertes_techniques": {
                    "enseignants_sans_affectation": teachers_sans_affectation[:10],
                    "classes_sans_affectation": classes_sans_affectation[:10],
                },
            }
        ),
        200,
    )


# ==========================================================================
# 2. GESTION DES AFFECTATIONS (AVEC VÉRIFICATION D'UNICITÉ STRICTE)
# ==========================================================================
@technicien_bp.get("/assignments")
@jwt_required()
@role_required("technicien", "admin")
def list_assignments():
    """Liste complète et filtrable des affectations Enseignant <-> Classe <-> Matière."""
    query = TeacherAssignment.query
    classe_id = request.args.get("classe_id", type=int)
    teacher_id = request.args.get("teacher_id", type=int)
    matiere = request.args.get("matiere")

    if classe_id:
        query = query.filter_by(classe_id=classe_id)
    if teacher_id:
        query = query.filter_by(teacher_id=teacher_id)
    if matiere:
        query = query.filter(TeacherAssignment.matiere.ilike(f"%{matiere}%"))

    assignments = query.all()
    data = []
    for a in assignments:
        item = a.to_dict()
        item["enseignant"] = f"{a.teacher.prenom} {a.teacher.nom}" if a.teacher else None
        item["enseignant_id"] = a.teacher_id
        item["filiere"] = a.classe.filiere.nom if a.classe and a.classe.filiere else None
        data.append(item)

    return jsonify(paginate_list(data)), 200


@technicien_bp.post("/assignments")
@jwt_required()
@role_required("technicien", "admin")
def create_assignment():
    """Création d'une affectation avec contrôle d'intégrité et anti-doublon."""
    data = request.get_json(silent=True) or {}
    teacher_id = data.get("teacher_id")
    classe_id = data.get("classe_id")
    matiere = (data.get("matiere") or "").strip()

    if not teacher_id or not classe_id or not matiere:
        return jsonify({"error": "teacher_id, classe_id et matiere sont requis."}), 400

    teacher = Teacher.query.get(teacher_id)
    if teacher is None:
        return jsonify({"error": "Enseignant introuvable."}), 404

    classe = Classe.query.get(classe_id)
    if classe is None:
        return jsonify({"error": "Classe introuvable."}), 404

    # 1. Vérifier si l'affectation exacte existe déjà
    exact_duplicate = TeacherAssignment.query.filter_by(
        teacher_id=teacher_id, classe_id=classe_id, matiere=matiere
    ).first()
    if exact_duplicate:
        return (
            jsonify(
                {
                    "error": (
                        f"L'affectation existe déjà : {teacher.prenom} {teacher.nom} est déjà affecté à "
                        f"{matiere} pour la classe {classe.nom}."
                    )
                }
            ),
            409,
        )

    # 2. Vérifier si la matière est déjà enseignée par un autre enseignant dans cette classe
    existing_subject = TeacherAssignment.query.filter_by(classe_id=classe_id, matiere=matiere).first()
    if existing_subject:
        current_teacher = existing_subject.teacher
        nom_actuel = f"{current_teacher.prenom} {current_teacher.nom}" if current_teacher else "un autre enseignant"
        return (
            jsonify(
                {
                    "error": (
                        f"Conflit d'affectation : La matière '{matiere}' est déjà attribuée à {nom_actuel} "
                        f"pour la classe {classe.nom}. Une seule affectation par matière est autorisée par classe."
                    )
                }
            ),
            409,
        )

    assignment = TeacherAssignment(teacher_id=teacher_id, classe_id=classe_id, matiere=matiere)
    db.session.add(assignment)
    db.session.commit()

    res = assignment.to_dict()
    res["enseignant"] = f"{teacher.prenom} {teacher.nom}"
    return jsonify(res), 201


@technicien_bp.put("/assignments/<int:assignment_id>")
@jwt_required()
@role_required("technicien", "admin")
def update_assignment(assignment_id):
    """Modification d'une affectation existante avec contrôle d'unicité."""
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    data = request.get_json(silent=True) or {}

    new_teacher_id = data.get("teacher_id", assignment.teacher_id)
    new_classe_id = data.get("classe_id", assignment.classe_id)
    new_matiere = (data.get("matiere") or assignment.matiere).strip()

    teacher = Teacher.query.get(new_teacher_id)
    if teacher is None:
        return jsonify({"error": "Enseignant introuvable."}), 404

    classe = Classe.query.get(new_classe_id)
    if classe is None:
        return jsonify({"error": "Classe introuvable."}), 404

    # Vérification de doublon sur un autre enregistrement
    conflict = (
        TeacherAssignment.query.filter(
            TeacherAssignment.id != assignment_id,
            TeacherAssignment.classe_id == new_classe_id,
            TeacherAssignment.matiere == new_matiere,
        ).first()
    )
    if conflict:
        t_conflict = conflict.teacher
        nom_conflict = f"{t_conflict.prenom} {t_conflict.nom}" if t_conflict else "un autre enseignant"
        return (
            jsonify(
                {
                    "error": (
                        f"Conflit : La matière '{new_matiere}' est déjà attribuée à {nom_conflict} "
                        f"dans la classe {classe.nom}."
                    )
                }
            ),
            409,
        )

    assignment.teacher_id = new_teacher_id
    assignment.classe_id = new_classe_id
    assignment.matiere = new_matiere
    db.session.commit()

    res = assignment.to_dict()
    res["enseignant"] = f"{teacher.prenom} {teacher.nom}"
    return jsonify(res), 200


@technicien_bp.delete("/assignments/<int:assignment_id>")
@jwt_required()
@role_required("technicien", "admin")
def delete_assignment(assignment_id):
    """Suppression d'une affectation."""
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"message": "Affectation supprimée avec succès."}), 200


# ==========================================================================
# 3. AUDIT & VÉRIFICATION DES AFFECTATIONS
# ==========================================================================
@technicien_bp.get("/assignments/audit")
@jwt_required()
@role_required("technicien", "admin")
def audit_assignments():
    """Analyse de complétude, détection d'incohérences et vérification d'unicité."""
    classes = Classe.query.all()
    teachers = Teacher.query.all()
    assignments = TeacherAssignment.query.all()
    matieres = Matiere.query.all()

    # 1. Vérification d'unicité globale (recherche de doublons dans la table)
    paires_vues = {}
    doublons_detectes = []
    for a in assignments:
        cle = (a.classe_id, a.matiere.strip().lower())
        if cle in paires_vues:
            doublons_detectes.append(
                {
                    "classe": a.classe.nom if a.classe else None,
                    "matiere": a.matiere,
                    "affectation_1_id": paires_vues[cle],
                    "affectation_2_id": a.id,
                }
            )
        else:
            paires_vues[cle] = a.id

    # 2. Classes avec nombre de matières affectées
    classes_audit = []
    for c in classes:
        mats = [a.matiere for a in c.assignments]
        classes_audit.append(
            {
                "id": c.id,
                "nom": c.nom,
                "niveau": c.niveau,
                "filiere": c.filiere.nom if c.filiere else None,
                "nb_affectations": len(mats),
                "matieres": mats,
                "statut": "couverte" if len(mats) >= 3 else ("partielle" if len(mats) > 0 else "vide"),
            }
        )

    # 3. Enseignants et charge d'affectation
    teachers_audit = []
    for t in teachers:
        t_assigns = t.assignments
        teachers_audit.append(
            {
                "id": t.id,
                "nom": t.nom,
                "prenom": t.prenom,
                "nb_affectations": len(t_assigns),
                "affectations": [
                    {"classe": a.classe.nom if a.classe else None, "matiere": a.matiere}
                    for a in t_assigns
                ],
                "statut": "actif" if len(t_assigns) > 0 else "inactif",
            }
        )

    return (
        jsonify(
            {
                "integrite_parfaite": len(doublons_detectes) == 0,
                "doublons_detectes": doublons_detectes,
                "classes_audit": classes_audit,
                "teachers_audit": teachers_audit,
                "total_matieres_catalogue": len(matieres),
            }
        ),
        200,
    )


# ==========================================================================
# 4. GESTION DU CATALOGUE DES MATIÈRES & STRUCTURE ACADÉMIQUE
# ==========================================================================
@technicien_bp.get("/structure-academique")
@jwt_required()
@role_required("technicien", "admin", "assistante_pedagogique", "enseignant")
def get_structure_academique():
    """Retourne l'arborescence complète Domaine -> Filière -> Niveaux -> Matières."""
    from app.academic_structure import DOMAINS_STRUCTURE
    return jsonify(DOMAINS_STRUCTURE), 200


@technicien_bp.get("/matieres")
@jwt_required()
@role_required("technicien", "admin", "assistante_pedagogique")
def list_matieres():
    query = Matiere.query
    filiere_id = request.args.get("filiere_id", type=int)
    niveau = request.args.get("niveau")
    search = request.args.get("q")
    domaine = request.args.get("domaine")

    if filiere_id:
        query = query.filter_by(filiere_id=filiere_id)
    if niveau:
        query = query.filter_by(niveau=niveau)
    if search:
        query = query.filter(
            db.or_(Matiere.nom.ilike(f"%{search}%"), Matiere.code.ilike(f"%{search}%"))
        )
    if domaine:
        query = query.join(Filiere).filter(Filiere.domaine == domaine)

    matieres = query.order_by(Matiere.nom).all()
    return jsonify([m.to_dict() for m in matieres]), 200


@technicien_bp.post("/matieres")
@jwt_required()
@role_required("technicien", "admin")
def create_matiere():
    data = request.get_json(silent=True) or {}
    nom = (data.get("nom") or "").strip()
    code = (data.get("code") or "").strip().upper()
    description = (data.get("description") or "").strip()
    filiere_id = data.get("filiere_id")
    niveau = data.get("niveau")
    coefficient = data.get("coefficient", 1.0)
    credit = data.get("credit")
    type_matiere = data.get("type_matiere", "fondamentale")

    if not nom or not code:
        return jsonify({"error": "Le nom et le code de la matière sont requis."}), 400

    if Matiere.query.filter_by(code=code).first():
        return jsonify({"error": "Ce code de matière existe déjà."}), 409

    if filiere_id and not Filiere.query.get(filiere_id):
        return jsonify({"error": "Filière introuvable."}), 404

    if niveau and niveau not in NIVEAUX:
        return jsonify({"error": "Niveau invalide (attendu: L1..M2)."}), 400

    try:
        coefficient = float(coefficient)
    except (ValueError, TypeError):
        coefficient = 1.0

    credit_val = None
    if credit is not None and str(credit).strip() != "":
        try:
            credit_val = int(credit)
        except (ValueError, TypeError):
            credit_val = None

    if type_matiere not in ("fondamentale", "transversale", "optionnelle"):
        type_matiere = "fondamentale"

    matiere = Matiere(
        nom=nom,
        code=code,
        description=description or None,
        filiere_id=filiere_id or None,
        niveau=niveau or None,
        coefficient=coefficient,
        credit=credit_val,
        type_matiere=type_matiere,
    )
    db.session.add(matiere)
    db.session.commit()
    return jsonify(matiere.to_dict()), 201


@technicien_bp.put("/matieres/<int:matiere_id>")
@jwt_required()
@role_required("technicien", "admin")
def update_matiere(matiere_id):
    matiere = Matiere.query.get_or_404(matiere_id)
    data = request.get_json(silent=True) or {}

    if data.get("nom"):
        matiere.nom = data["nom"].strip()
    if data.get("code"):
        code = data["code"].strip().upper()
        conflict = Matiere.query.filter(Matiere.id != matiere_id, Matiere.code == code).first()
        if conflict:
            return jsonify({"error": "Ce code de matière existe déjà."}), 409
        matiere.code = code
    if "description" in data:
        matiere.description = data["description"].strip() or None
    if "filiere_id" in data:
        f_id = data["filiere_id"]
        if f_id and not Filiere.query.get(f_id):
            return jsonify({"error": "Filière introuvable."}), 404
        matiere.filiere_id = f_id or None
    if "niveau" in data:
        niv = data["niveau"]
        if niv and niv not in NIVEAUX:
            return jsonify({"error": "Niveau invalide."}), 400
        matiere.niveau = niv or None
    if "coefficient" in data:
        try:
            matiere.coefficient = float(data["coefficient"])
        except (ValueError, TypeError):
            pass
    if "credit" in data:
        c_raw = data["credit"]
        if c_raw is None or str(c_raw).strip() == "":
            matiere.credit = None
        else:
            try:
                matiere.credit = int(c_raw)
            except (ValueError, TypeError):
                pass
    if "type_matiere" in data and data["type_matiere"] in ("fondamentale", "transversale", "optionnelle"):
        matiere.type_matiere = data["type_matiere"]

    db.session.commit()
    return jsonify(matiere.to_dict()), 200


@technicien_bp.delete("/matieres/<int:matiere_id>")
@jwt_required()
@role_required("technicien", "admin")
def delete_matiere(matiere_id):
    matiere = Matiere.query.get_or_404(matiere_id)
    db.session.delete(matiere)
    db.session.commit()
    return jsonify({"message": "Matière supprimée avec succès."}), 200


# ==========================================================================
# 5. CONSULTATION RÉFÉRENTIELS (CLASSES, FILIÈRES, NIVEAUX, ENSEIGNANTS)
# ==========================================================================
@technicien_bp.get("/classes")
@jwt_required()
@role_required("technicien", "admin")
def list_classes():
    return jsonify([c.to_dict(include_stats=True) for c in Classe.query.all()]), 200


@technicien_bp.get("/filieres")
@jwt_required()
@role_required("technicien", "admin")
def list_filieres():
    return jsonify([f.to_dict() for f in Filiere.query.order_by(Filiere.nom).all()]), 200


@technicien_bp.get("/niveaux")
@jwt_required()
@role_required("technicien", "admin")
def list_niveaux():
    return (
        jsonify(
            [
                {"niveau": n, "semestres": SEMESTRES_PAR_NIVEAU.get(n, [])}
                for n in NIVEAUX
            ]
        ),
        200,
    )


@technicien_bp.get("/teachers")
@jwt_required()
@role_required("technicien", "admin")
def list_teachers():
    teachers = Teacher.query.order_by(Teacher.nom).all()
    return jsonify([t.to_dict(include_user=True) for t in teachers]), 200
