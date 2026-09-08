"""Mise a jour des emails vers @groupeisi.com et email_verifie=1."""
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

# Tous les roles : email = identifiant@groupeisi.com, email_verifie = 1
cur.execute(
    "UPDATE users SET email = CONCAT(identifiant, '@groupeisi.com'), email_verifie = 1"
)
print(f"Utilisateurs mis a jour : {cur.rowcount}")

conn.commit()

# Verification
cur.execute("SELECT identifiant, email, role, email_verifie FROM users ORDER BY role LIMIT 10")
for r in cur.fetchall():
    print(r)

cur.execute("SELECT COUNT(*) FROM users WHERE email_verifie = 1")
print(f"Total email_verifie=1 : {cur.fetchone()[0]}")

conn.close()
print("Termine.")
