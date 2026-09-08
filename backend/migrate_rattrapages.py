import sys
import os
from sqlalchemy import text, inspect

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    print("Migrating rattrapage schema...")
    db.create_all()
    
    inspector = inspect(db.engine)
    existing_columns = [col["name"] for col in inspector.get_columns("demandes_rattrapage")]
    print(f"Existing columns in 'demandes_rattrapage': {existing_columns}")
    
    columns_to_add = [
        ("teacher_id", "INT NULL"),
        ("motif", "VARCHAR(255) NULL"),
        ("date_souhaitee", "DATE NULL"),
        ("heure_souhaitee", "VARCHAR(50) NULL"),
        ("message", "TEXT NULL"),
        ("reponse_enseignant", "TEXT NULL"),
        ("date_planifiee", "DATE NULL"),
        ("heure_debut_planifiee", "TIME NULL"),
        ("heure_fin_planifiee", "TIME NULL"),
        ("salle_planifiee", "VARCHAR(100) NULL"),
        ("a_nouvelle_reponse", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("date_maj", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    ]
    
    with db.engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                print(f"Adding column '{col_name}'...")
                conn.execute(text(f"ALTER TABLE demandes_rattrapage ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"Added '{col_name}'.")
            else:
                print(f"Column '{col_name}' already exists.")
                
        # Also ensure statut enum / varchar can take all values:
        try:
            conn.execute(text("ALTER TABLE demandes_rattrapage MODIFY COLUMN statut VARCHAR(50) NOT NULL DEFAULT 'en_attente'"))
            conn.commit()
            print("Updated 'statut' column to VARCHAR(50).")
        except Exception as e:
            print("Note on statut modification:", e)

    print("Migration finished successfully.")
