from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from app.models import User


def role_required(*roles):
    """Restreint l'acces a une route selon le role du compte (FR-20)."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Acces refuse : role insuffisant."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def active_account_required(fn):
    """Verifie que le compte est actif a chaque requete authentifiee (FR-13, cahier des charges §3.2)."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = User.query.get(get_jwt_identity())
        if user is None:
            return jsonify({"error": "Compte introuvable."}), 404
        if user.statut != "actif":
            return (
                jsonify(
                    {
                        "error": "compte_desactive",
                        "message": (
                            "Votre acces est actuellement desactive. "
                            "Veuillez contacter l'administration."
                        ),
                    }
                ),
                403,
            )
        return fn(*args, **kwargs)

    return wrapper
