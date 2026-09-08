"""Migration non-destructive de la structure académique ISI SUPTECH.

Met à jour les domaines, les filières, les niveaux et le catalogue des matières
sans supprimer les données préexistantes (étudiants, notes, présences, comptes).

Usage:
    python -m backend.database.migrate_academic_structure
    ou
    python database/migrate_academic_structure.py
"""
import os
import sys

# Permettre l'import depuis la racine backend
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from sqlalchemy import text
from app import create_app
from app.extensions import db
from app.academic_structure import DOMAINS_STRUCTURE
from app.models import Filiere, Classe, Matiere


def migrate():
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("MIGRATION NON-DESTRUCTIVE DE LA STRUCTURE ACADÉMIQUE")
        print("=" * 60)

        # 1. Vérification et ajout des colonnes manquantes
        engine = db.engine
        with engine.connect() as conn:
            # Colonne domaine dans filieres
            res = conn.execute(text("SHOW COLUMNS FROM filieres LIKE 'domaine'")).fetchall()
            if not res:
                print("-> Ajout de la colonne 'domaine' dans la table 'filieres'...")
                conn.execute(text("ALTER TABLE filieres ADD COLUMN domaine VARCHAR(100) NOT NULL DEFAULT 'Génie Informatique'"))
                conn.commit()
            else:
                print("-> Colonne 'domaine' déjà présente dans 'filieres'.")

            # Colonne coefficient dans matieres
            res = conn.execute(text("SHOW COLUMNS FROM matieres LIKE 'coefficient'")).fetchall()
            if not res:
                print("-> Ajout de la colonne 'coefficient' dans la table 'matieres'...")
                conn.execute(text("ALTER TABLE matieres ADD COLUMN coefficient DECIMAL(3,1) NOT NULL DEFAULT 1.0"))
                conn.commit()
            else:
                print("-> Colonne 'coefficient' déjà présente dans 'matieres'.")

            # Colonne type_matiere dans matieres
            res = conn.execute(text("SHOW COLUMNS FROM matieres LIKE 'type_matiere'")).fetchall()
            if not res:
                print("-> Ajout de la colonne 'type_matiere' dans la table 'matieres'...")
                conn.execute(text("ALTER TABLE matieres ADD COLUMN type_matiere ENUM('fondamentale', 'transversale', 'optionnelle') NOT NULL DEFAULT 'fondamentale'"))
                conn.commit()
            else:
                print("-> Colonne 'type_matiere' déjà présente dans 'matieres'.")

        # 2. Mise à jour / Création des Filières & Classes
        print("\n-> Synchronisation des Filières et Classes...")
        filieres_count = 0
        classes_count = 0

        for dom_key, dom_data in DOMAINS_STRUCTURE.items():
            dom_label = dom_data["label"]
            for f_code, f_info in dom_data["filieres"].items():
                f_nom = f_info["nom"]
                filiere = Filiere.query.filter_by(code=f_code).first()
                if not filiere:
                    filiere = Filiere(code=f_code, nom=f_nom, domaine=dom_label)
                    db.session.add(filiere)
                    db.session.flush()
                    print(f"   [+] Nouvelle filière créée: [{f_code}] {f_nom} ({dom_label})")
                else:
                    filiere.nom = f_nom
                    filiere.domaine = dom_label
                    print(f"   [*] Filière mise à jour: [{f_code}] {f_nom} ({dom_label})")
                filieres_count += 1

                # Génération des classes correspondantes
                for niveau in f_info["niveaux"].keys():
                    classe_nom = f"{f_code} - {niveau}"
                    classe = Classe.query.filter_by(filiere_id=filiere.id, niveau=niveau).first()
                    if not classe:
                        classe = Classe(filiere_id=filiere.id, niveau=niveau, nom=classe_nom)
                        db.session.add(classe)
                        print(f"       + Classe créée: {classe_nom}")
                    else:
                        classe.nom = classe_nom
                    classes_count += 1

        db.session.commit()
        print(f"-> {filieres_count} filières et {classes_count} classes synchronisées.")

        # 3. Synchronisation du Catalogue des Matières
        print("\n-> Synchronisation du Catalogue des Matières...")
        matieres_count = 0

        for dom_key, dom_data in DOMAINS_STRUCTURE.items():
            for f_code, f_info in dom_data["filieres"].items():
                filiere = Filiere.query.filter_by(code=f_code).first()
                for niveau, mat_list in f_info["niveaux"].items():
                    for mat in mat_list:
                        m_code = mat["code"]
                        m_nom = mat["nom"]
                        m_coeff = mat.get("coeff", 1.0)
                        m_type = mat.get("type", "fondamentale")

                        matiere = Matiere.query.filter_by(code=m_code).first()
                        if not matiere:
                            # Tentative de retrouver par nom + filiere_id + niveau pour éviter doublon
                            matiere = Matiere.query.filter_by(nom=m_nom, filiere_id=filiere.id, niveau=niveau).first()

                        if not matiere:
                            matiere = Matiere(
                                code=m_code,
                                nom=m_nom,
                                filiere_id=filiere.id if filiere else None,
                                niveau=niveau,
                                coefficient=m_coeff,
                                type_matiere=m_type,
                            )
                            db.session.add(matiere)
                        else:
                            matiere.code = m_code
                            matiere.nom = m_nom
                            matiere.filiere_id = filiere.id if filiere else None
                            matiere.niveau = niveau
                            matiere.coefficient = m_coeff
                            matiere.type_matiere = m_type
                        matieres_count += 1

        db.session.commit()
        print(f"-> {matieres_count} matières synchronisées dans le catalogue.")
        print("\n" + "=" * 60)
        print("MIGRATION RÉUSSIE AVEC SUCCÈS SANS PERTE DE DONNÉES !")
        print("=" * 60)


if __name__ == "__main__":
    migrate()
