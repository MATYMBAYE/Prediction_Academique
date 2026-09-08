"""
Script de migration : ajoute les colonnes manquantes dans la table users.
Colonnes : email_verifie, otp_code, otp_expires_at, pending_email
"""
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

conn = pymysql.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "Prediction_db"),
    charset="utf8mb4",
)
cur = conn.cursor()

# Colonnes actuelles
cur.execute("DESCRIBE users")
cols = {row[0] for row in cur.fetchall()}
print("Colonnes existantes :", sorted(cols))

needed = {
    "email_verifie": "TINYINT(1) NOT NULL DEFAULT 0",
    "otp_code": "VARCHAR(10) NULL",
    "otp_expires_at": "DATETIME NULL",
    "pending_email": "VARCHAR(255) NULL",
}

for col, definition in needed.items():
    if col not in cols:
        sql = f"ALTER TABLE users ADD COLUMN `{col}` {definition}"
        print(f"Ajout : {sql}")
        cur.execute(sql)
    else:
        print(f"Deja present : {col}")

# Marquer les comptes @groupeisi.com comme verifies
cur.execute("UPDATE users SET email_verifie = 1 WHERE email LIKE '%@groupeisi.com'")
print(f"email_verifie=1 pour {cur.rowcount} utilisateur(s).")

conn.commit()
cur.close()
conn.close()
print("Migration terminee avec succes.")
