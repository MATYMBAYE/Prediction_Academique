from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import PasswordResetToken, User
from app.utils.validators import validate_password

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    """Connexion unique etudiant/admin (cahier des charges §3.1).
    Ne revele jamais si un compte existe ou non : message d'erreur generique.
    """
    data = request.get_json(silent=True) or {}
    identifiant = (data.get("identifiant") or "").strip()
    mot_de_passe = data.get("mot_de_passe") or ""

    if not identifiant or not mot_de_passe:
        return jsonify({"error": "Identifiant et mot de passe requis."}), 400

    user = User.query.filter_by(identifiant=identifiant).first()

    if user is None or not user.check_password(mot_de_passe):
        return jsonify({"error": "Identifiant ou mot de passe incorrect."}), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "statut": user.statut},
    )

    response = {
        "access_token": access_token,
        "user": user.to_dict(),
    }

    if user.role == "etudiant" and user.student:
        response["student"] = user.student.to_dict()

    if user.statut != "actif":
        response["compte_desactive"] = True
        
        from app.models import AccountStatusHistory
        last_history = AccountStatusHistory.query.filter_by(user_id=user.id).order_by(AccountStatusHistory.date_changement.desc()).first()
        if last_history and last_history.motif:
            response["motif"] = last_history.motif

        response["message"] = (
            "Votre accès est actuellement désactivé. Veuillez contacter l'administration de l'établissement."
        )

    return jsonify(response), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if user is None:
        return jsonify({"error": "Compte introuvable."}), 404

    data = user.to_dict()
    if user.role == "etudiant" and user.student:
        data["student"] = user.student.to_dict()
    if user.role == "enseignant" and user.teacher:
        data["teacher"] = user.teacher.to_dict()
    return jsonify(data), 200


@auth_bp.post("/mot-de-passe-oublie")
def request_password_reset():
    """Demande de reinitialisation (§3.1). Message identique que le compte
    existe ou non, pour ne jamais reveler son existence.
    """
    data = request.get_json(silent=True) or {}
    identifiant = (data.get("identifiant") or "").strip()
    generic_response = {
        "message": (
            "Si un compte correspond a cet identifiant, un lien de "
            "reinitialisation vient d'etre genere."
        )
    }

    user = User.query.filter_by(identifiant=identifiant).first() if identifiant else None
    if user is None:
        return jsonify(generic_response), 200

    reset_token = PasswordResetToken.generate_for(user)
    db.session.add(reset_token)
    db.session.commit()

    # Pas de service SMTP configure pour ce projet local : en environnement
    # de dev/demo, le token est renvoye directement pour permettre le test
    # du parcours de bout en bout. En production, il faudrait l'envoyer par
    # email et ne jamais l'exposer via l'API.
    if current_app.debug:
        generic_response["dev_reset_token"] = reset_token.token

    return jsonify(generic_response), 200


@auth_bp.post("/reinitialiser-mot-de-passe")
def reset_password():
    data = request.get_json(silent=True) or {}
    token_value = data.get("token") or ""
    nouveau_mot_de_passe = data.get("nouveau_mot_de_passe") or ""

    if not token_value or not nouveau_mot_de_passe:
        return jsonify({"error": "Token et nouveau mot de passe requis."}), 400
    
    is_valid, err_msg = validate_password(nouveau_mot_de_passe)
    if not is_valid:
        return jsonify({"error": err_msg}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token_value).first()
    if reset_token is None or not reset_token.is_valid():
        return jsonify({"error": "Ce lien de reinitialisation est invalide ou a expire."}), 400

    user = User.query.get(reset_token.user_id)
    user.set_password(nouveau_mot_de_passe)
    reset_token.utilise = True
    reset_token.date_expiration = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Mot de passe reinitialise avec succes."}), 200
