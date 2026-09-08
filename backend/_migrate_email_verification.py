from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    columns = [
        ("email_verifie", "TINYINT(1) NOT NULL DEFAULT 0"),
        ("otp_code", "VARCHAR(10) NULL"),
        ("otp_expires_at", "DATETIME NULL"),
        ("pending_email", "VARCHAR(150) NULL"),
    ]

    for col_name, col_def in columns:
        try:
            db.session.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
            print(f"Added column {col_name} to users table.")
        except Exception as e:
            if "Duplicate column name" in str(e) or "1060" in str(e):
                print(f"Column {col_name} already exists.")
            else:
                print(f"Error adding {col_name}: {e}")

    # Preserver les comptes existants : marquer email_verifie = 1 uniquement s'il finit par @groupeisi.com
    res = db.session.execute(text("UPDATE users SET email_verifie = 1 WHERE LOWER(email) LIKE '%@groupeisi.com'"))
    db.session.commit()
    print(f"Updated email_verifie for existing @groupeisi.com users.")
