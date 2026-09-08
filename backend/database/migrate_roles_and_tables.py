"""
Script de migration non destructive pour ajouter les rôles
'assistante_pedagogique' et 'technicien', ainsi que les tables
'annees_academiques' et 'matieres'.
"""
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "Prediction_db")


def run_migration():
    print(f"Connexion à la base de données {DB_NAME} sur {DB_HOST}:{DB_PORT}...")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    try:
        with conn.cursor() as cursor:
            # 1. Mise à jour de l'enum 'role' dans la table 'users'
            print("1. Mise à jour de l'ENUM role dans la table users...")
            cursor.execute(
                """
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('etudiant', 'enseignant', 'admin', 'assistante_pedagogique', 'technicien') 
                NOT NULL DEFAULT 'etudiant'
                """
            )

            # 2. Création de la table annees_academiques si elle n'existe pas
            print("2. Création de la table annees_academiques si inexistante...")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS annees_academiques (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    libelle VARCHAR(50) NOT NULL UNIQUE,
                    annee_debut INT NOT NULL,
                    annee_fin INT NOT NULL,
                    statut ENUM('active', 'cloturee', 'a_venir') NOT NULL DEFAULT 'active',
                    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB;
                """
            )

            # 3. Création de la table matieres si elle n'existe pas
            print("3. Création de la table matieres si inexistante...")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS matieres (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(30) NOT NULL UNIQUE,
                    nom VARCHAR(100) NOT NULL,
                    description TEXT NULL,
                    filiere_id INT NULL,
                    niveau ENUM('L1', 'L2', 'L3', 'M1', 'M2') NULL,
                    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE SET NULL
                ) ENGINE=InnoDB;
                """
            )

            # 4. Insérer des années académiques par défaut si la table est vide
            cursor.execute("SELECT COUNT(*) as cnt FROM annees_academiques")
            res_annee = cursor.fetchone()
            if res_annee["cnt"] == 0:
                print("   -> Insertion des années académiques par défaut...")
                cursor.execute(
                    """
                    INSERT INTO annees_academiques (libelle, annee_debut, annee_fin, statut)
                    VALUES 
                        ('2024-2025', 2024, 2025, 'cloturee'),
                        ('2025-2026', 2025, 2026, 'active'),
                        ('2026-2027', 2026, 2027, 'a_venir')
                    """
                )

            # 5. Remplir le référentiel des matières à partir des matières existantes si vide
            cursor.execute("SELECT COUNT(*) as cnt FROM matieres")
            res_mat = cursor.fetchone()
            if res_mat["cnt"] == 0:
                print("   -> Initialisation du catalogue des matières...")
                matieres_defaut = [
                    ("ALGO", "Algorithmique", "Bases de l'algorithmique et structures de données"),
                    ("BDD", "Base de donnees", "Modélisation relationnelle et langage SQL"),
                    ("RES", "Reseaux", "Protocoles TCP/IP, routage et architecture réseau"),
                    ("MATH", "Mathematiques", "Algèbre linéaire, analyse et probabilités"),
                    ("ANG", "Anglais", "Anglais technique et communication professionnelle"),
                    ("GL", "Genie logiciel", "Méthodes agiles, UML et conception logicielle"),
                    ("COMPTA", "Comptabilite generale", "Principes comptables et états financiers"),
                    ("FINANCE", "Analyse financiere", "Ratios financiers, trésorerie et rentabilité"),
                    ("FISCALITE", "Fiscalite des entreprises", "TVA, impôt sur les sociétés et régimes fiscaux"),
                    ("DROIT", "Droit des affaires", "Contrats commerciaux et droit des sociétés"),
                    ("CONTROLE", "Controle de gestion", "Budgets, coûts et tableaux de bord"),
                ]
                for code, nom, desc in matieres_defaut:
                    cursor.execute(
                        """
                        INSERT IGNORE INTO matieres (code, nom, description)
                        VALUES (%s, %s, %s)
                        """,
                        (code, nom, desc),
                    )

            conn.commit()
            print("Migration terminée avec succès !")

    except Exception as e:
        conn.rollback()
        print(f"Erreur durant la migration : {e}")
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
