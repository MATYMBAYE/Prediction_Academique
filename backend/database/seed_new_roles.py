"""
Initialisation des comptes de démonstration pour les rôles
Assistante pédagogique et Technicien (sans modifier les comptes existants).
"""
import os
import pymysql
import bcrypt
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "Prediction_db")


def seed_new_accounts():
    print(f"Connexion à la base de données {DB_NAME}...")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    pwd_raw = "Passer123!"
    hashed = bcrypt.hashpw(pwd_raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    comptes = [
        {
            "identifiant": "assistante",
            "email": "assistante@groupeisi.com",
            "role": "assistante_pedagogique",
        },
        {
            "identifiant": "technicien",
            "email": "technicien@groupeisi.com",
            "role": "technicien",
        },
    ]

    try:
        with conn.cursor() as cursor:
            for c in comptes:
                cursor.execute(
                    "SELECT id, role, email FROM users WHERE identifiant = %s OR email = %s",
                    (c["identifiant"], c["email"]),
                )
                user = cursor.fetchone()
                if not user:
                    print(f"Création du compte {c['role']} : {c['email']}...")
                    cursor.execute(
                        """
                        INSERT INTO users (identifiant, email, mot_de_passe_hash, role, statut, email_verifie)
                        VALUES (%s, %s, %s, %s, 'actif', 1)
                        """,
                        (c["identifiant"], c["email"], hashed, c["role"]),
                    )
                else:
                    print(f"Compte {c['identifiant']} déjà existant (id={user['id']}, role={user['role']}).")

            conn.commit()
            print("Initialisation des nouveaux comptes terminée avec succès !")

    except Exception as e:
        conn.rollback()
        print(f"Erreur : {e}")
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    seed_new_accounts()
