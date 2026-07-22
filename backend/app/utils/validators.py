import re

def validate_password(password: str) -> tuple[bool, str]:
    """
    Verifie que le mot de passe respecte la politique de securite :
    - Au moins 8 caracteres
    - Au moins une majuscule
    - Au moins une minuscule
    - Au moins un chiffre
    - Au moins un caractere special
    """
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caracteres."
    if not re.search(r"[A-Z]", password):
        return False, "Le mot de passe doit contenir au moins une lettre majuscule."
    if not re.search(r"[a-z]", password):
        return False, "Le mot de passe doit contenir au moins une lettre minuscule."
    if not re.search(r"\d", password):
        return False, "Le mot de passe doit contenir au moins un chiffre."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Le mot de passe doit contenir au moins un caractere special."
    return True, ""
