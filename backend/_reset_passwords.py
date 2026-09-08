"""
Réinitialise les mots de passe par défaut pour tous les comptes
dont le hash est vide ou invalide.

  admin       → Admin@1234
  enseignant  → Enseignant@1234
  etudiant    → Etudiant@1234
"""
from app import create_app
from app.models import User, db
from werkzeug.security import generate_password_hash, check_password_hash

DEFAULT_PASSWORDS = {
    "admin": "Admin@1234",
    "enseignant": "Enseignant@1234",
    "etudiant": "Etudiant@1234",
}

app = create_app()
with app.app_context():
    users = User.query.all()
    fixed = 0
    for u in users:
        # Determine si le hash est absent/invalide
        needs_fix = False
        if not u.mot_de_passe_hash:
            needs_fix = True
        else:
            try:
                check_password_hash(u.mot_de_passe_hash, "test")
            except (ValueError, Exception):
                needs_fix = True

        if needs_fix:
            pwd = DEFAULT_PASSWORDS.get(u.role, "Changez@1234")
            u.mot_de_passe_hash = generate_password_hash(pwd)
            print(f"[FIX] {u.identifiant} ({u.role}) -> mot de passe reinitialise")

            fixed += 1

    db.session.commit()
    print(f"\nTotal corrige : {fixed} utilisateur(s)")

    # Verification finale
    admin = User.query.filter_by(identifiant="admin").first()
    if admin:
        ok = check_password_hash(admin.mot_de_passe_hash, "Admin@1234")
        print(f"Verification admin (Admin@1234) : {'OK' if ok else 'ECHEC'}")
