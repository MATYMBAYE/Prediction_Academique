import csv
import io
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime
from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.auth import role_required
from app.extensions import db
from app.models import (
    AnneeAcademique,
    Classe,
    Grade,
    Matiere,
    Student,
    Teacher,
    TeacherAssignment,
    User,
)
from app.services import compute_and_store_prediction

grade_bp = Blueprint("grade_bp", __name__, url_prefix="/api/grades")


def _get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id) if user_id else None


def _check_teacher_authorization(user, teacher, classe_id, matiere_nom):
    """Vérifie si l'enseignant est autorisé pour la classe et la matière données."""
    if user.role != "enseignant":
        return True  # Admin et Assistante ont accès global
    if not teacher:
        return False

    matiere_nom_clean = (matiere_nom or "").strip().lower()
    # 1. Via TeacherAssignment
    assignment = TeacherAssignment.query.filter(
        TeacherAssignment.teacher_id == teacher.id,
        TeacherAssignment.classe_id == classe_id,
    ).all()
    for a in assignment:
        if a.matiere.strip().lower() == matiere_nom_clean:
            return True

    # 2. Via teacher.classes et teacher.matiere
    for c in teacher.classes:
        if c.id == classe_id and teacher.matiere and teacher.matiere.strip().lower() == matiere_nom_clean:
            return True

    return False


def parse_xlsx_data(file_bytes):
    """Extrait les lignes d'un fichier .xlsx sans dépendance externe."""
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
            for si in tree.findall(f".//{ns}si"):
                t = si.find(f"{ns}t")
                if t is not None and t.text:
                    shared_strings.append(t.text)
                else:
                    text_pieces = [elem.text for elem in si.findall(f".//{ns}t") if elem.text]
                    shared_strings.append("".join(text_pieces) if text_pieces else "")

        sheet_name = None
        for name in z.namelist():
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml"):
                sheet_name = name
                break
        if not sheet_name:
            raise ValueError("Aucune feuille de calcul valide trouvée dans le fichier Excel.")

        sheet_tree = ET.fromstring(z.read(sheet_name))
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        rows_data = []
        for row_elem in sheet_tree.findall(f".//{ns}row"):
            row = []
            for cell in row_elem.findall(f"{ns}c"):
                val_elem = cell.find(f"{ns}v")
                t_attr = cell.get("t")
                val = val_elem.text if val_elem is not None else ""
                if t_attr == "s" and val.isdigit():
                    idx = int(val)
                    val = shared_strings[idx] if idx < len(shared_strings) else val
                elif t_attr == "inlineStr":
                    is_elem = cell.find(f".//{ns}t")
                    val = is_elem.text if is_elem is not None else ""
                row.append(str(val).strip())
            if any(row):
                rows_data.append(row)
        return rows_data


def parse_csv_data(file_bytes):
    """Extrait les lignes d'un fichier CSV (UTF-8 ou Latin-1)."""
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1", errors="replace")

    sample = text[:2048]
    delimiter = ";" if sample.count(";") > sample.count(",") else ","
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    return [[col.strip() for col in row] for row in reader if any(c.strip() for c in row)]


def extract_rows_from_file(file_storage):
    filename = file_storage.filename.lower()
    content = file_storage.read()
    if filename.endswith(".xlsx") or filename.endswith(".xlsm"):
        return parse_xlsx_data(content)
    elif filename.endswith(".csv") or filename.endswith(".txt"):
        return parse_csv_data(content)
    else:
        try:
            return parse_xlsx_data(content)
        except Exception:
            return parse_csv_data(content)


# --------------------------------------------------------------------------
# 1. ÉTUDIANTS DE LA CLASSE & ÉVALUATION EN COURS
# --------------------------------------------------------------------------

@grade_bp.get("/class-students")
@role_required("enseignant", "assistante_pedagogique", "admin")
def get_class_students():
    """
    Récupère automatiquement la liste des étudiants de la classe sélectionnée
    avec leurs matricules et leurs notes existantes pour l'évaluation demandée.
    Flux : Classe -> Matière -> Type d'évaluation -> Semestre.
    """
    user = _get_current_user()
    classe_id = request.args.get("classe_id", type=int)
    matiere = request.args.get("matiere", type=str, default="").strip()
    type_eval = request.args.get("type_evaluation", type=str, default="examen").strip().lower()
    semestre = request.args.get("semestre", type=str, default="S1").strip().upper()

    if not classe_id:
        return jsonify({"error": "Veuillez sélectionner une classe."}), 400

    classe = Classe.query.get(classe_id)
    if not classe:
        return jsonify({"error": "Classe introuvable."}), 404

    # Vérification des autorisations enseignant
    if user.role == "enseignant" and not _check_teacher_authorization(user, user.teacher, classe_id, matiere):
        return jsonify({"error": "Vous n'êtes pas affecté à cette classe et matière."}), 403

    # Récupérer tous les étudiants de la classe triés par nom, prénom
    students = Student.query.filter_by(classe_id=classe_id).order_by(Student.nom.asc(), Student.prenom.asc()).all()

    # Récupérer les notes existantes pour ce contexte
    grades_map = {}
    if matiere and semestre:
        existing_grades = Grade.query.filter(
            Grade.student_id.in_([s.id for s in students]) if students else False,
            Grade.matiere == matiere,
            Grade.type_evaluation == type_eval,
            Grade.semestre == semestre,
        ).all()
        for g in existing_grades:
            grades_map[g.student_id] = g

    result_students = []
    for s in students:
        g = grades_map.get(s.id)
        result_students.append({
            "id": s.id,
            "matricule": s.matricule,
            "nom": s.nom,
            "prenom": s.prenom,
            "grade_id": g.id if g else None,
            "note": float(g.note) if g else None,
            "date_saisie": g.date_saisie.isoformat() if g and g.date_saisie else None,
        })

    return jsonify({
        "classe": {
            "id": classe.id,
            "nom": classe.nom,
            "niveau": classe.niveau,
            "filiere": classe.filiere.nom if hasattr(classe.filiere, "nom") else (str(classe.filiere) if classe.filiere else None),
            "filiere_id": classe.filiere_id,
        },
        "matiere": matiere,
        "type_evaluation": type_eval,
        "semestre": semestre,
        "total_etudiants": len(students),
        "students": result_students,
    }), 200


@grade_bp.get("/matieres-classe/<int:classe_id>")
@role_required("enseignant", "assistante_pedagogique", "admin")
def get_matieres_for_classe(classe_id):
    """
    Retourne strictement les matières autorisées pour la filière et le niveau de la classe spécifiée.
    """
    classe = Classe.query.get_or_404(classe_id)
    # Récupérer les matières correspondant exactement à la filière et au niveau de la classe
    matieres = Matiere.query.filter(
        Matiere.filiere_id == classe.filiere_id,
        Matiere.niveau == classe.niveau,
    ).order_by(Matiere.nom.asc()).all()

    # Si aucune matière spécifique n'est trouvée (rare), chercher les matières tronc commun ou de la filière
    if not matieres:
        matieres = Matiere.query.filter(
            db.or_(
                db.and_(Matiere.filiere_id == classe.filiere_id),
                Matiere.filiere_id.is_(None)
            ),
            db.or_(Matiere.niveau == classe.niveau, Matiere.niveau.is_(None))
        ).order_by(Matiere.nom.asc()).all()

    return jsonify([m.to_dict() for m in matieres]), 200


# --------------------------------------------------------------------------
# 2. MODÈLE EXCEL PRÉ-REMPLI PAR CLASSE
# --------------------------------------------------------------------------

@grade_bp.get("/template-classe")
@role_required("enseignant", "assistante_pedagogique", "admin")
def download_class_template():
    """
    Génère un modèle CSV/Excel pré-rempli avec la liste des étudiants de la classe
    sélectionnée (Matricule | Nom | Prénom | Note).
    L'enseignant n'a plus qu'à renseigner la colonne note.
    """
    user = _get_current_user()
    classe_id = request.args.get("classe_id", type=int)
    matiere = request.args.get("matiere", type=str, default="Matiere").strip()
    type_eval = request.args.get("type_evaluation", type=str, default="examen").strip()
    semestre = request.args.get("semestre", type=str, default="S1").strip()

    if not classe_id:
        return jsonify({"error": "Veuillez spécifier une classe pour générer le modèle."}), 400

    classe = Classe.query.get(classe_id)
    if not classe:
        return jsonify({"error": "Classe introuvable."}), 404

    if user.role == "enseignant" and not _check_teacher_authorization(user, user.teacher, classe_id, matiere):
        return jsonify({"error": "Non autorisé pour cette classe et matière."}), 403

    students = Student.query.filter_by(classe_id=classe_id).order_by(Student.nom.asc(), Student.prenom.asc()).all()

    # Récupérer les notes existantes éventuelles pour pré-remplir
    existing_notes = {}
    if matiere and semestre:
        grades = Grade.query.filter(
            Grade.student_id.in_([s.id for s in students]) if students else False,
            Grade.matiere == matiere,
            Grade.type_evaluation == type_eval,
            Grade.semestre == semestre,
        ).all()
        for g in grades:
            existing_notes[g.student_id] = float(g.note)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    # En-têtes clairs
    writer.writerow(["matricule", "nom", "prenom", "note"])

    for s in students:
        current_note = existing_notes.get(s.id, "")
        writer.writerow([s.matricule, s.nom, s.prenom, str(current_note) if current_note != "" else ""])

    safe_classe = re.sub(r"[^\w\-]", "_", classe.nom)
    safe_matiere = re.sub(r"[^\w\-]", "_", matiere)
    filename = f"notes_{safe_classe}_{safe_matiere}_{semestre}.csv"

    csv_data = output.getvalue().encode("utf-8-sig")
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------------------------------------------------------------------
# 3. ENREGISTREMENT EN LOT DEPUIS LA SAISIE DIRECTE
# --------------------------------------------------------------------------

@grade_bp.post("/batch-save")
@role_required("enseignant", "assistante_pedagogique", "admin")
def batch_save_grades():
    """
    Enregistre ou met à jour en direct la grille de notes d'une classe entière.
    """
    user = _get_current_user()
    data = request.get_json() or {}

    classe_id = data.get("classe_id")
    matiere = (data.get("matiere") or "").strip()
    type_eval = (data.get("type_evaluation") or "examen").strip().lower()
    semestre = (data.get("semestre") or "S1").strip().upper()
    notes_list = data.get("notes") or []

    if not classe_id or not matiere or not semestre:
        return jsonify({"error": "Classe, matière et semestre obligatoires."}), 400

    classe = Classe.query.get(classe_id)
    if not classe:
        return jsonify({"error": "Classe introuvable."}), 404

    teacher = user.teacher if user.role == "enseignant" else None
    if user.role == "enseignant" and not _check_teacher_authorization(user, teacher, classe_id, matiere):
        return jsonify({"error": "Vous n'êtes pas autorisé à saisir des notes pour cette classe et matière."}), 403

    saved_count = 0
    updated_count = 0
    students_to_recalculate = set()

    for item in notes_list:
        student_id = item.get("student_id")
        note_val_raw = item.get("note")

        if note_val_raw is None or str(note_val_raw).strip() == "":
            continue

        try:
            note_val = float(str(note_val_raw).replace(",", "."))
            if not (0.0 <= note_val <= 20.0):
                continue
        except (ValueError, TypeError):
            continue

        student = Student.query.get(student_id)
        if not student or student.classe_id != classe_id:
            continue

        # Vérifier si une note existe déjà pour cette évaluation
        existing_grade = Grade.query.filter_by(
            student_id=student.id,
            matiere=matiere,
            type_evaluation=type_eval,
            semestre=semestre,
        ).first()

        if existing_grade:
            existing_grade.note = note_val
            existing_grade.date_saisie = datetime.utcnow()
            if teacher:
                existing_grade.saisi_par_teacher_id = teacher.id
            updated_count += 1
        else:
            new_grade = Grade(
                student_id=student.id,
                matiere=matiere,
                note=note_val,
                semestre=semestre,
                type_evaluation=type_eval,
                saisi_par_teacher_id=teacher.id if teacher else None,
                date_saisie=datetime.utcnow(),
            )
            db.session.add(new_grade)
            saved_count += 1

        students_to_recalculate.add(student)

    db.session.commit()

    # Recalculer les prédictions ML des étudiants impactés
    for s in students_to_recalculate:
        try:
            compute_and_store_prediction(s)
        except Exception:
            pass
    db.session.commit()

    return jsonify({
        "success": True,
        "saved_count": saved_count,
        "updated_count": updated_count,
        "total": saved_count + updated_count,
        "message": f"Enregistrement réussi : {saved_count} nouvelle(s) note(s), {updated_count} note(s) mise(s) à jour.",
    }), 200


# --------------------------------------------------------------------------
# 4. IMPORTATION DU FICHIER EXCEL / CSV DE LA CLASSE
# --------------------------------------------------------------------------

@grade_bp.post("/import")
@role_required("enseignant", "assistante_pedagogique", "admin")
def import_grades():
    """
    Importe les notes à partir d'un fichier Excel (.xlsx) ou CSV.
    Prend en compte la classe, matière, type d'évaluation et semestre sélectionnés.
    Vérifie l'appartenance à la classe, les bornes (0-20), les doublons et les habilitations.
    """
    user = _get_current_user()
    teacher = user.teacher if user.role == "enseignant" else None

    classe_id = request.form.get("classe_id", type=int)
    default_matiere = request.form.get("matiere", "").strip()
    default_type_eval = request.form.get("type_evaluation", "examen").strip().lower()
    default_semestre = request.form.get("semestre", "S1").strip().upper()

    if "file" not in request.files:
        return jsonify({"error": "Veuillez sélectionner un fichier Excel (.xlsx) ou CSV."}), 400

    file_storage = request.files["file"]
    if not file_storage.filename:
        return jsonify({"error": "Nom de fichier invalide."}), 400

    try:
        raw_rows = extract_rows_from_file(file_storage)
    except Exception as e:
        return jsonify({"error": f"Erreur lors de la lecture du fichier : {str(e)}"}), 400

    if not raw_rows:
        return jsonify({"error": "Le fichier sélectionné est vide."}), 400

    classe = Classe.query.get(classe_id) if classe_id else None

    # Vérification des autorisations
    if user.role == "enseignant":
        if not classe_id or not default_matiere:
            return jsonify({"error": "Veuillez sélectionner la classe et la matière concernées."}), 400
        if not _check_teacher_authorization(user, teacher, classe_id, default_matiere):
            return jsonify({"error": "Non autorisé : vous n'êtes pas affecté à cette classe et matière."}), 403

    # Détecter la position des colonnes
    header_indices = {}
    first_row = [str(c).lower().strip() for c in raw_rows[0]]
    start_index = 0

    if any(k in first_row for k in ["matricule", "note", "nom", "matiere"]):
        for i, col in enumerate(first_row):
            if "matricule" in col:
                header_indices["matricule"] = i
            elif "note" in col or "valeur" in col or "grade" in col:
                header_indices["note"] = i
            elif "nom" in col and "prenom" not in col:
                header_indices["nom"] = i
            elif "prenom" in col:
                header_indices["prenom"] = i
            elif "matiere" in col:
                header_indices["matiere"] = i
            elif "eval" in col or "type" in col:
                header_indices["type_evaluation"] = i
            elif "semestre" in col:
                header_indices["semestre"] = i
        start_index = 1
    else:
        # Ordre par défaut : matricule, nom, prenom, note
        header_indices = {"matricule": 0, "nom": 1, "prenom": 2, "note": 3}

    imported = []
    updated = []
    errors = []
    seen_matricules_in_file = set()
    students_to_recalculate = set()

    for line_num, row in enumerate(raw_rows[start_index:], start=start_index + 1):
        if not row or not any(row):
            continue

        def get_val(key, default=""):
            idx = header_indices.get(key)
            if idx is not None and idx < len(row):
                return str(row[idx]).strip()
            return default

        matricule = get_val("matricule")
        note_str = get_val("note")
        matiere = get_val("matiere") or default_matiere
        type_eval = (get_val("type_evaluation") or default_type_eval or "examen").lower()
        semestre = (get_val("semestre") or default_semestre or "S1").upper()

        if not matricule:
            errors.append({"ligne": line_num, "erreur": "Matricule manquant sur cette ligne."})
            continue

        # 1. Vérification anti-doublon dans le même fichier
        matricule_upper = matricule.upper()
        if matricule_upper in seen_matricules_in_file:
            errors.append({
                "ligne": line_num,
                "matricule": matricule,
                "erreur": f"Matricule en double dans le fichier : '{matricule}' apparaît plusieurs fois.",
            })
            continue
        seen_matricules_in_file.add(matricule_upper)

        # 2. Vérification existence étudiant
        student = Student.query.filter(
            (Student.matricule == matricule) | (Student.matricule == matricule_upper)
        ).first()
        if not student:
            errors.append({
                "ligne": line_num,
                "matricule": matricule,
                "erreur": f"Étudiant avec le matricule '{matricule}' introuvable dans la base de données.",
            })
            continue

        # 3. Vérification de l'appartenance à la classe sélectionnée
        if classe_id and student.classe_id != classe_id:
            nom_classe_etu = student.classe.nom if student.classe else "Sans classe"
            errors.append({
                "ligne": line_num,
                "matricule": matricule,
                "erreur": f"L'étudiant {student.prenom} {student.nom} ({matricule}) appartient à la classe '{nom_classe_etu}', et non à la classe sélectionnée.",
            })
            continue

        # 4. Vérification et parsing de la note
        if not note_str or note_str == "":
            # Ligne laissée vide intentionnellement dans le modèle
            continue

        try:
            note_val = float(note_str.replace(",", "."))
            if not (0.0 <= note_val <= 20.0):
                errors.append({
                    "ligne": line_num,
                    "matricule": matricule,
                    "erreur": f"Note hors bornes ({note_val} n'est pas comprise entre 0 et 20).",
                })
                continue
        except (ValueError, TypeError):
            errors.append({
                "ligne": line_num,
                "matricule": matricule,
                "erreur": f"Valeur de note invalide : '{note_str}'.",
            })
            continue

        if not matiere:
            errors.append({"ligne": line_num, "matricule": matricule, "erreur": "Matière non renseignée."})
            continue

        if type_eval not in ["devoir", "examen"]:
            type_eval = "examen"
        if semestre not in [f"S{i}" for i in range(1, 11)]:
            semestre = "S1"

        # 5. Enregistrement ou mise à jour sans doublon
        existing_grade = Grade.query.filter_by(
            student_id=student.id,
            matiere=matiere,
            type_evaluation=type_eval,
            semestre=semestre,
        ).first()

        if existing_grade:
            existing_grade.note = note_val
            existing_grade.date_saisie = datetime.utcnow()
            if teacher:
                existing_grade.saisi_par_teacher_id = teacher.id
            updated.append({
                "ligne": line_num,
                "matricule": student.matricule,
                "etudiant": f"{student.prenom} {student.nom}",
                "note": note_val,
            })
        else:
            grade = Grade(
                student_id=student.id,
                matiere=matiere,
                note=note_val,
                semestre=semestre,
                type_evaluation=type_eval,
                saisi_par_teacher_id=teacher.id if teacher else None,
                date_saisie=datetime.utcnow(),
            )
            db.session.add(grade)
            imported.append({
                "ligne": line_num,
                "matricule": student.matricule,
                "etudiant": f"{student.prenom} {student.nom}",
                "note": note_val,
            })

        students_to_recalculate.add(student)

    # Validation globale
    if imported or updated:
        db.session.commit()
        for s in students_to_recalculate:
            try:
                compute_and_store_prediction(s)
            except Exception:
                pass
        db.session.commit()

    total_traites = len(imported) + len(updated)
    return jsonify({
        "success": total_traites > 0 or len(errors) == 0,
        "total_importes": len(imported),
        "total_mis_a_jour": len(updated),
        "total_enregistres": total_traites,
        "total_erreurs": len(errors),
        "notes_importees": imported,
        "notes_mises_a_jour": updated,
        "erreurs": errors,
        "message": f"Importation réussie : {len(imported)} note(s) créée(s), {len(updated)} note(s) mise(s) à jour."
        + (f" ({len(errors)} erreur(s) détectée(s))" if errors else ""),
    }), (200 if total_traites > 0 or not errors else 400)


# --------------------------------------------------------------------------
# 5. MODIFICATION & SUPPRESSION INDIVIDUELLE (CRUD COMPLET)
# --------------------------------------------------------------------------

@grade_bp.put("/<int:grade_id>")
@role_required("enseignant", "assistante_pedagogique", "admin")
def update_single_grade(grade_id):
    """Permet de modifier directement une note en cas d'erreur."""
    user = _get_current_user()
    grade = Grade.query.get(grade_id)
    if not grade:
        return jsonify({"error": "Note introuvable."}), 404

    student = grade.student
    teacher = user.teacher if user.role == "enseignant" else None

    if user.role == "enseignant" and not _check_teacher_authorization(user, teacher, student.classe_id, grade.matiere):
        return jsonify({"error": "Vous n'êtes pas autorisé à modifier cette note."}), 403

    data = request.get_json() or {}
    note_val_raw = data.get("note")
    if note_val_raw is None:
        return jsonify({"error": "La note est requise."}), 400

    try:
        note_val = float(str(note_val_raw).replace(",", "."))
        if not (0.0 <= note_val <= 20.0):
            return jsonify({"error": "La note doit être comprise entre 0 et 20."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Valeur de note invalide."}), 400

    grade.note = note_val
    grade.date_saisie = datetime.utcnow()
    if teacher:
        grade.saisi_par_teacher_id = teacher.id

    db.session.commit()

    # Recalcul de la prédiction ML
    try:
        compute_and_store_prediction(student)
        db.session.commit()
    except Exception:
        pass

    return jsonify({
        "success": True,
        "message": "Note modifiée avec succès.",
        "grade": grade.to_dict(),
    }), 200


@grade_bp.delete("/<int:grade_id>")
@role_required("enseignant", "assistante_pedagogique", "admin")
def delete_single_grade(grade_id):
    """Permet de supprimer une note erronée."""
    user = _get_current_user()
    grade = Grade.query.get(grade_id)
    if not grade:
        return jsonify({"error": "Note introuvable."}), 404

    student = grade.student
    teacher = user.teacher if user.role == "enseignant" else None

    if user.role == "enseignant" and not _check_teacher_authorization(user, teacher, student.classe_id, grade.matiere):
        return jsonify({"error": "Vous n'êtes pas autorisé à supprimer cette note."}), 403

    db.session.delete(grade)
    db.session.commit()

    # Recalcul de la prédiction ML
    try:
        compute_and_store_prediction(student)
        db.session.commit()
    except Exception:
        pass

    return jsonify({
        "success": True,
        "message": "Note supprimée avec succès.",
    }), 200


# --------------------------------------------------------------------------
# 6. HISTORIQUE GLOBAL DES NOTES
# --------------------------------------------------------------------------

@grade_bp.get("")
@role_required("enseignant", "assistante_pedagogique", "admin")
def list_grades():
    """Liste les notes avec filtres par classe, matière, semestre."""
    user = _get_current_user()
    classe_id = request.args.get("classe_id", type=int)
    matiere = request.args.get("matiere", type=str)
    semestre = request.args.get("semestre", type=str)
    student_id = request.args.get("student_id", type=int)

    query = Grade.query.join(Student)

    if user.role == "enseignant" and user.teacher:
        # Restreindre aux classes affectées
        assigned_classe_ids = [a.classe_id for a in user.teacher.assignments]
        assigned_classe_ids += [c.id for c in user.teacher.classes]
        if assigned_classe_ids:
            query = query.filter(Student.classe_id.in_(assigned_classe_ids))
        else:
            return jsonify([]), 200

    if classe_id:
        query = query.filter(Student.classe_id == classe_id)
    if matiere:
        query = query.filter(Grade.matiere == matiere)
    if semestre:
        query = query.filter(Grade.semestre == semestre)
    if student_id:
        query = query.filter(Grade.student_id == student_id)

    grades = query.order_by(Grade.date_saisie.desc()).limit(150).all()
    return jsonify([
        {
            **g.to_dict(),
            "matricule": g.student.matricule if g.student else None,
            "etudiant": f"{g.student.prenom} {g.student.nom}" if g.student else None,
            "classe": g.student.classe.nom if g.student and g.student.classe else None,
            "classe_id": g.student.classe_id if g.student else None,
        }
        for g in grades
    ]), 200
