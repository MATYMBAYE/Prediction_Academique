import csv
import io
import logging
import re
import secrets
import string
import pandas as pd
from datetime import datetime
from flask import Response, current_app
from app.extensions import db
from app.models import Classe, Filiere, Student, User
from app.utils.email import send_student_credentials_email
from app.utils.validators import validate_email_format

logger = logging.getLogger(__name__)

# En-têtes attendus normalisés
HEADER_MAPPINGS = {
    "matricule": ["matricule", "mat", "id_etudiant", "student_id", "numero_etudiant", "code_etudiant"],
    "nom": ["nom", "last_name", "lastname", "nom_famille", "surname"],
    "prenom": ["prenom", "prénom", "first_name", "firstname", "prenoms", "prénoms"],
    "email": ["email", "e-mail", "mail", "courriel", "adresse_email", "email_etudiant"],
    "filiere": ["filiere", "filière", "filiere_code", "code_filiere", "departement", "programme"],
    "niveau": ["niveau", "level", "annee", "annee_etude"],
    "classe": ["classe", "class", "code_classe", "nom_classe", "groupe"],
}

VALID_NIVEAUX = ["L1", "L2", "L3", "M1", "M2"]


def generate_temp_password(length: int = 10) -> str:
    """
    Génère un mot de passe temporaire robuste et aléatoire respectant la politique de sécurité :
    - Au moins 1 majuscule
    - Au moins 1 minuscule
    - Au moins 1 chiffre
    - Au moins 1 caractère spécial
    """
    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$%&*?")
    remaining_length = max(length - 4, 4)
    all_chars = string.ascii_letters + string.digits + "!@#$%&*?"
    middle = "".join(secrets.choice(all_chars) for _ in range(remaining_length))
    
    pwd_list = list(upper + lower + digit + special + middle)
    secrets.SystemRandom().shuffle(pwd_list)
    return "".join(pwd_list)


def generate_unique_identifier(prenom: str, nom: str, matricule: str) -> str:
    """
    Génère un identifiant unique pour l'étudiant.
    Priorité : basé sur le prénom et nom ou le matricule, vérifié pour unicité en base.
    """
    # Nettoyage des caractères spéciaux et accents
    clean_prenom = re.sub(r"[^a-zA-Z0-9]", "", prenom.lower())
    clean_nom = re.sub(r"[^a-zA-Z0-9]", "", nom.lower())
    clean_matricule = re.sub(r"[^a-zA-Z0-9]", "", matricule.lower())

    base = f"{clean_prenom}.{clean_nom}" if clean_prenom and clean_nom else clean_matricule
    if not base:
        base = f"etudiant_{secrets.randbelow(10000)}"

    candidate = base
    counter = 1
    while User.query.filter_by(identifiant=candidate).first():
        candidate = f"{base}{counter:03d}"
        counter += 1

    return candidate


def normalize_header(header: str) -> str:
    """Normalise un libellé de colonne en supprimant espaces, accents et ponctuation."""
    if not header:
        return ""
    h = header.strip().lower()
    h = h.replace("é", "e").replace("è", "e").replace("ê", "e").replace("ë", "e")
    h = h.replace("à", "a").replace("â", "a").replace("ä", "a")
    h = h.replace("î", "i").replace("ï", "i").replace("ô", "o").replace("ö", "o")
    h = h.replace("ù", "u").replace("û", "u").replace("ü", "u")
    h = re.sub(r"[^a-z0-9]", "", h)
    return h


def map_columns(headers: list) -> dict:
    """Associe les colonnes du fichier aux champs obligatoires du système."""
    mapping = {}
    normalized_headers = [(idx, normalize_header(h), h) for idx, h in enumerate(headers)]

    for field, aliases in HEADER_MAPPINGS.items():
        matched_idx = None
        for alias in aliases:
            norm_alias = normalize_header(alias)
            for idx, norm_h, original_h in normalized_headers:
                if norm_h == norm_alias:
                    matched_idx = idx
                    break
            if matched_idx is not None:
                break
        mapping[field] = matched_idx

    return mapping


def parse_student_file_to_rows(file_storage) -> tuple[list[dict], list[str]]:
    """
    Lit un fichier téléversé (CSV ou Excel) et extrait les lignes brutes.
    Supporte différents encodages et séparateurs.
    """
    filename = (file_storage.filename or "").lower()
    file_bytes = file_storage.read()

    rows = []
    headers = []

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)
            df = df.fillna("")
            headers = [str(c).strip() for c in df.columns]
            for _, r in df.iterrows():
                rows.append([str(val).strip() for val in r.values])
        except Exception as e:
            logger.error(f"Erreur de lecture Excel avec pandas: {e}")
            raise ValueError(f"Impossible de lire le fichier Excel : {str(e)}")
    else:
        # Fichier texte / CSV
        decoded_text = None
        for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                decoded_text = file_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if not decoded_text:
            raise ValueError("Encodage du fichier non reconnu. Veuillez utiliser UTF-8.")

        # Détection du délimiteur
        sample = decoded_text[:2048]
        delimiter = ","
        try:
            dialect = csv.Sniffer().sniff(sample)
            delimiter = dialect.delimiter
        except Exception:
            for d in [";", ",", "\t", "|"]:
                if d in sample:
                    delimiter = d
                    break

        reader = csv.reader(io.StringIO(decoded_text), delimiter=delimiter)
        raw_list = list(reader)
        if not raw_list:
            raise ValueError("Le fichier téléversé est vide.")

        headers = [h.strip() for h in raw_list[0]]
        for r in raw_list[1:]:
            if any(cell.strip() for cell in r):  # Ignore les lignes entièrement vides
                rows.append([cell.strip() for cell in r])

    col_mapping = map_columns(headers)
    missing_required = [f for f, idx in col_mapping.items() if idx is None]

    if missing_required:
        formatted_missing = ", ".join(missing_required)
        raise ValueError(
            f"Colonnes obligatoires manquantes dans le fichier : {formatted_missing}. "
            f"Colonnes détectées : {', '.join(headers)}"
        )

    parsed_data = []
    for line_idx, r in enumerate(rows, start=2):  # start=2 car la ligne 1 est l'en-tête
        row_dict = {"_line_num": line_idx}
        for field, col_idx in col_mapping.items():
            val = r[col_idx] if col_idx < len(r) else ""
            row_dict[field] = val.strip()
        parsed_data.append(row_dict)

    return parsed_data, headers


def validate_student_data(raw_rows: list[dict]) -> dict:
    """
    Effectue les contrôles stricts avant importation :
    - Présence et unicité du matricule (dans le fichier et dans la BDD)
    - Validité et unicité de l'adresse e-mail
    - Existence et cohérence de la Filière, du Niveau et de la Classe
    - Détection de doublons internes au fichier
    """
    # Chargement du référentiel en cache
    filieres = Filiere.query.all()
    classes = Classe.query.all()
    existing_matricules = {s.matricule.lower(): s.matricule for s in Student.query.all()}
    existing_emails = {u.email.lower(): u.email for u in User.query.filter(User.email.isnot(None)).all()}

    # Indexation filières
    filiere_by_norm = {}
    for f in filieres:
        filiere_by_norm[normalize_header(f.code)] = f
        filiere_by_norm[normalize_header(f.nom)] = f

    # Indexation classes
    classe_by_key = {}
    classe_by_name = {}
    for c in classes:
        f_norm = normalize_header(c.filiere.nom) if c.filiere else ""
        f_code_norm = normalize_header(c.filiere.code) if c.filiere else ""
        c_norm = normalize_header(c.nom)
        niv_norm = (c.niveau or "").upper()

        classe_by_key[(f_norm, niv_norm, c_norm)] = c
        classe_by_key[(f_code_norm, niv_norm, c_norm)] = c
        classe_by_name[c_norm] = c

    seen_matricules_in_file = set()
    seen_emails_in_file = set()

    valid_rows = []
    error_rows = []

    for row in raw_rows:
        line_num = row.get("_line_num", 0)
        matricule = row.get("matricule", "").strip()
        nom = row.get("nom", "").strip()
        prenom = row.get("prenom", "").strip()
        email = row.get("email", "").strip()
        filiere_str = row.get("filiere", "").strip()
        niveau_str = (row.get("niveau", "") or "").strip().upper()
        classe_str = row.get("classe", "").strip()

        errors = []

        # 1. Vérification des champs obligatoires
        if not matricule:
            errors.append("Le matricule est obligatoire.")
        if not nom:
            errors.append("Le nom est obligatoire.")
        if not prenom:
            errors.append("Le prénom est obligatoire.")
        if not email:
            errors.append("L'adresse e-mail est obligatoire.")
        if not filiere_str:
            errors.append("La filière est obligatoire.")
        if not niveau_str:
            errors.append("Le niveau est obligatoire.")
        if not classe_str:
            errors.append("La classe est obligatoire.")

        # 2. Vérification unicité du matricule
        if matricule:
            mat_lower = matricule.lower()
            if mat_lower in seen_matricules_in_file:
                errors.append(f"Matricule en doublon dans le fichier : {matricule}")
            else:
                seen_matricules_in_file.add(mat_lower)

            if mat_lower in existing_matricules:
                errors.append(f"Un étudiant avec le matricule '{matricule}' existe déjà dans la base.")

        # 3. Vérification de l'adresse e-mail
        if email:
            email_lower = email.lower()
            is_valid_email, email_err = validate_email_format(email)
            if not is_valid_email:
                errors.append(email_err)
            else:
                if email_lower in seen_emails_in_file:
                    errors.append(f"Adresse e-mail en doublon dans le fichier : {email}")
                else:
                    seen_emails_in_file.add(email_lower)

                if email_lower in existing_emails:
                    errors.append(f"L'adresse e-mail '{email}' est déjà utilisée par un autre compte.")

        # 4. Vérification Niveau
        if niveau_str and niveau_str not in VALID_NIVEAUX:
            errors.append(f"Niveau invalide '{niveau_str}'. Valeurs acceptées : {', '.join(VALID_NIVEAUX)}")

        # 5. Vérification Filière
        matched_filiere = None
        if filiere_str:
            norm_fil = normalize_header(filiere_str)
            matched_filiere = filiere_by_norm.get(norm_fil)
            if not matched_filiere:
                # Recherche partielle
                for key, f_obj in filiere_by_norm.items():
                    if norm_fil in key or key in norm_fil:
                        matched_filiere = f_obj
                        break
            if not matched_filiere:
                errors.append(f"Filière introuvable : '{filiere_str}'")

        # 6. Vérification Classe
        matched_classe = None
        if classe_str:
            norm_cls = normalize_header(classe_str)
            # Essai 1 : recherche exacte avec filière et niveau
            if matched_filiere and niveau_str:
                key1 = (normalize_header(matched_filiere.nom), niveau_str, norm_cls)
                key2 = (normalize_header(matched_filiere.code), niveau_str, norm_cls)
                matched_classe = classe_by_key.get(key1) or classe_by_key.get(key2)

            # Essai 2 : recherche directe par nom de classe
            if not matched_classe:
                matched_classe = classe_by_name.get(norm_cls)

            # Essai 3 : recherche partielle
            if not matched_classe:
                for c_name_norm, c_obj in classe_by_name.items():
                    if norm_cls in c_name_norm or c_name_norm in norm_cls:
                        matched_classe = c_obj
                        break

            if not matched_classe:
                errors.append(f"Classe introuvable : '{classe_str}'")

        row_result = {
            "line_num": line_num,
            "matricule": matricule,
            "nom": nom,
            "prenom": prenom,
            "email": email,
            "filiere": filiere_str,
            "filiere_nom": matched_filiere.nom if matched_filiere else filiere_str,
            "niveau": niveau_str,
            "classe": classe_str,
            "classe_id": matched_classe.id if matched_classe else None,
            "classe_nom": matched_classe.nom if matched_classe else classe_str,
            "errors": errors,
            "is_valid": len(errors) == 0,
        }

        if errors:
            error_rows.append(row_result)
        else:
            valid_rows.append(row_result)

    return {
        "total_rows": len(raw_rows),
        "valid_count": len(valid_rows),
        "error_count": len(error_rows),
        "valid_rows": valid_rows,
        "error_rows": error_rows,
        "can_import": len(valid_rows) > 0,
    }


def execute_student_import_batch(valid_rows: list[dict], send_emails: bool = True) -> dict:
    """
    Crée les comptes User et les profils Student pour chaque ligne valide :
    - Conserve scrupuleusement le matricule officiel
    - Génère un identifiant unique
    - Génère un mot de passe temporaire sécurisé
    - Hache le mot de passe avec bcrypt en BDD
    - Envoie l'e-mail d'accès avec consignes de sécurité
    """
    imported_students = []
    failed_creations = []
    emails_sent_count = 0

    for row in valid_rows:
        matricule = row["matricule"].strip()
        nom = row["nom"].strip()
        prenom = row["prenom"].strip()
        email = row["email"].strip()
        classe_id = row["classe_id"]

        try:
            # 1. Vérification ultime d'intégrité avant insertion
            if Student.query.filter_by(matricule=matricule).first():
                failed_creations.append({
                    "matricule": matricule,
                    "nom": f"{prenom} {nom}",
                    "error": f"Matricule '{matricule}' déjà présent en base."
                })
                continue

            if email and User.query.filter_by(email=email).first():
                failed_creations.append({
                    "matricule": matricule,
                    "nom": f"{prenom} {nom}",
                    "error": f"E-mail '{email}' déjà associé à un compte."
                })
                continue

            # 2. Génération des accès
            identifiant = generate_unique_identifier(prenom, nom, matricule)
            temp_password = generate_temp_password(10)

            user = User(
                identifiant=identifiant,
                email=email,
                role="etudiant",
                statut="actif",
                email_verifie=True,
            )
            user.set_password(temp_password)
            db.session.add(user)
            db.session.flush()

            # 3. Création du profil étudiant avec matricule officiel STRICT
            student = Student(
                user_id=user.id,
                matricule=matricule,
                nom=nom,
                prenom=prenom,
                classe_id=classe_id,
            )
            db.session.add(student)
            db.session.flush()

            # 4. Envoi automatique de l'e-mail
            if send_emails and email:
                try:
                    send_student_credentials_email(
                        to_email=email,
                        student_name=f"{prenom} {nom}",
                        matricule=matricule,
                        identifiant=identifiant,
                        temp_password=temp_password,
                        synchronous=False,
                    )
                    emails_sent_count += 1
                except Exception as mail_err:
                    logger.error(f"Erreur lors du déclenchement de l'e-mail pour {email}: {mail_err}")

            imported_students.append({
                "student_id": student.id,
                "matricule": matricule,
                "nom": nom,
                "prenom": prenom,
                "email": email,
                "identifiant": identifiant,
                "classe": row.get("classe_nom"),
            })

        except Exception as err:
            db.session.rollback()
            logger.error(f"Erreur lors de l'import de l'étudiant {matricule}: {err}")
            failed_creations.append({
                "matricule": matricule,
                "nom": f"{prenom} {nom}",
                "error": str(err)
            })

    db.session.commit()

    return {
        "success": True,
        "total_imported": len(imported_students),
        "failed_count": len(failed_creations),
        "emails_sent": emails_sent_count,
        "imported_students": imported_students,
        "failed_creations": failed_creations,
    }


def generate_template_response(file_format: str = "csv") -> Response:
    """
    Génère le modèle téléchargeable (CSV ou Excel) avec les colonnes attendues :
    Matricule,Nom,Prénom,Email,Filière,Niveau,Classe
    (SANS colonne Mot de passe).
    """
    headers = ["Matricule", "Nom", "Prénom", "Email", "Filière", "Niveau", "Classe"]
    sample_rows = [
        ["ISI2026-0002", "Diop", "Awa", "awa.diop@example.com", "Génie Logiciel", "L1", "GL-L1"],
        ["ISI2026-0009", "Ndiaye", "Fatou", "fatou.ndiaye@example.com", "Génie Logiciel", "L1", "GL-L1"],
        ["ISI2026-0015", "Fall", "Mamadou", "mamadou.fall@example.com", "Réseaux et Télécoms", "L2", "RT-L2"],
        ["ISI2026-0028", "Sow", "Aminata", "aminata.sow@example.com", "Systèmes & Sécurité", "L3", "SRT-L3"],
    ]

    if file_format.lower() in ("xlsx", "excel"):
        output = io.BytesIO()
        df = pd.DataFrame(sample_rows, columns=headers)
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Modele_Etudiants")
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=modele_import_etudiants_isi.xlsx"},
        )
    else:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",")
        writer.writerow(headers)
        writer.writerows(sample_rows)
        csv_bytes = output.getvalue().encode("utf-8-sig")  # utf-8-sig pour compatibilité Excel
        return Response(
            csv_bytes,
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=modele_import_etudiants_isi.csv"},
        )


def export_students_dataset(students_query, file_format: str = "csv") -> Response:
    """
    Exporte la liste des étudiants filtrée au format CSV ou Excel.
    Colonnes : Matricule, Nom, Prénom, Email, Filière, Niveau, Classe.
    Ne contient AUCUNE donnée sensible liée à l'authentification (jamais de mot de passe).
    """
    headers = ["Matricule", "Nom", "Prénom", "Email", "Filière", "Niveau", "Classe"]
    data_rows = []

    for s in students_query.order_by(Student.nom, Student.prenom).all():
        data_rows.append([
            s.matricule,
            s.nom,
            s.prenom,
            s.user.email if s.user and s.user.email else "",
            s.classe.filiere.nom if s.classe and s.classe.filiere else "",
            s.classe.niveau if s.classe and s.classe.niveau else "",
            s.classe.nom if s.classe else "",
        ])

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if file_format.lower() in ("xlsx", "excel"):
        output = io.BytesIO()
        df = pd.DataFrame(data_rows, columns=headers)
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Etudiants_ISI")
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=export_etudiants_{timestamp}.xlsx"},
        )
    else:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",")
        writer.writerow(headers)
        writer.writerows(data_rows)
        csv_bytes = output.getvalue().encode("utf-8-sig")
        return Response(
            csv_bytes,
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=export_etudiants_{timestamp}.csv"},
        )
