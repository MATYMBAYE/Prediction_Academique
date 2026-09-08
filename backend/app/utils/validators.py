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


def validate_institutional_email(email: str, domain: str = "groupeisi.com") -> tuple[bool, str]:
    """
    Verifie que l'adresse e-mail appartient au domaine institutionnel autorise (@groupeisi.com).
    """
    if not email or not isinstance(email, str):
        return (
            False,
            "L'adresse e-mail doit utiliser le domaine @groupeisi.com.",
        )
    
    email_clean = email.strip().lower()
    suffix = f"@{domain.strip().lower()}"
    if not email_clean.endswith(suffix):
        return (
            False,
            "L'adresse e-mail doit utiliser le domaine @groupeisi.com.",
        )
    
    return True, ""


def validate_email_format(email: str) -> tuple[bool, str]:
    """
    Vérifie qu'une adresse e-mail a un format RFC valide.
    """
    if not email or not isinstance(email, str):
        return False, "L'adresse e-mail est obligatoire."
    
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(pattern, email.strip()):
        return False, "Format d'adresse e-mail invalide."
    
    return True, ""

