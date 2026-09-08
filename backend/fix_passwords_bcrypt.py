"""
Script de correction des mots de passe invalides.

PROBLEME DETECTE :
  _reset_passwords.py utilisait werkzeug.security (hash pbkdf2:sha256:...)
  mais models.py attend des hashes bcrypt ($2b$...).
  Ces deux formats sont INCOMPATIBLES => ValueError: Invalid salt au login.

CE SCRIPT :
  1. Detecte chaque hash invalide (absent, tronque, werkzeug, ou autre)
  2. Reinitialise avec bcrypt (coherent avec models.py)
  3. Affiche un rapport complet

Mots de passe par defaut apres correction :
  admin       -> Admin@1234
  enseignant  -> Enseignant@1234
  etudiant    -> Etudiant@1234
"""
import bcrypt
from app import create_app
from app.models import User, db

DEFAULT_PASSWORDS = {
    "admin": "Admin@1234",
    "enseignant": "Enseignant@1234",
    "etudiant": "Etudiant@1234",
}

FALLBACK_PASSWORD = "Changez@1234"


def is_valid_bcrypt_hash(hash_str: str) -> bool:
    """Verifie si hash_str est un vrai hash bcrypt ($2a$, $2b$ ou $2y$)."""
    if not hash_str:
        return False
    try:
        # bcrypt.checkpw lève ValueError si le sel est invalide
        bcrypt.checkpw(b"test", hash_str.encode("utf-8"))
        return True
    except ValueError:
        return False
    except Exception:
        # Toute autre exception = hash potentiellement invalide
        return False


def make_bcrypt_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


app = create_app()

with app.app_context():
    users = User.query.all()
    print(f"Utilisateurs trouves : {len(users)}\n")

    fixed = []
    ok_list = []

    for u in users:
        if is_valid_bcrypt_hash(u.mot_de_passe_hash):
            ok_list.append(u.identifiant)
        else:
            pwd = DEFAULT_PASSWORDS.get(u.role, FALLBACK_PASSWORD)
            u.mot_de_passe_hash = make_bcrypt_hash(pwd)
            fixed.append((u.identifiant, u.role, pwd))
            print(f"  [FIX] {u.identifiant} ({u.role}) -> mot de passe reinitialise : {pwd}")

    db.session.commit()

    print(f"\n{'='*55}")
    print(f"  Hashes valides (non modifies) : {len(ok_list)}")
    if ok_list:
        for ident in ok_list:
            print(f"    OK: {ident}")

    print(f"\n  Hashes corriges : {len(fixed)}")
    for ident, role, pwd in fixed:
        print(f"    FIXE: {ident} ({role}) -> {pwd}")

    print(f"{'='*55}\n")

    # Verification finale
    print("Verification bcrypt post-correction :")
    for ident, role, pwd in fixed:
        u = User.query.filter_by(identifiant=ident).first()
        if u:
            ok = bcrypt.checkpw(pwd.encode("utf-8"), u.mot_de_passe_hash.encode("utf-8"))
            print(f"  {ident} ({pwd}) : {'OK' if ok else 'ECHEC'}")

    if not fixed:
        print("  Aucun utilisateur a corriger. Tous les hashes sont valides.")
