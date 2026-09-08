"""Migration non-destructive pour ajouter le champ 'credit' distinct de 'coefficient' dans la table 'matieres'.

Usage:
    python -m backend.database.migrate_add_credit_column
    ou
    python database/migrate_add_credit_column.py
"""
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from sqlalchemy import text
from app import create_app
from app.extensions import db


def migrate():
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("AJOUT DE LA COLONNE 'CREDIT' DISTINCTE DE 'COEFFICIENT'")
        print("=" * 60)

        engine = db.engine
        with engine.connect() as conn:
            res = conn.execute(text("SHOW COLUMNS FROM matieres LIKE 'credit'")).fetchall()
            if not res:
                print("-> Ajout de la colonne 'credit' dans 'matieres' (INT NULL DEFAULT NULL)...")
                conn.execute(text("ALTER TABLE matieres ADD COLUMN credit INT NULL DEFAULT NULL"))
                conn.commit()
                print("-> Colonne 'credit' ajoutée avec succès.")
            else:
                print("-> La colonne 'credit' existe déjà dans 'matieres'.")

        print("\n" + "=" * 60)
        print("MIGRATION TERMINÉE AVEC SUCCÈS SANS PERTE DE DONNÉES !")
        print("=" * 60)


if __name__ == "__main__":
    migrate()
