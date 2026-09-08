from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import PasswordResetToken, User
from app.utils.validators import validate_password

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    """Connexion par adresse e-mail + mot de passe (cahier des charges §3.1).
    Ne revele jamais si un compte existe ou non : message d'erreur generique.
    """
    data = request.get_json(silent=True) or {}
    identifiant_ou_email = (data.get("email") or data.get("identifiant") or "").strip().lower()
    mot_de_passe = data.get("mot_de_passe") or ""

    if not identifiant_ou_email or not mot_de_passe:
        return jsonify({"error": "Adresse e-mail ou identifiant et mot de passe requis."}), 400

    user = User.query.filter(
        db.or_(User.email == identifiant_ou_email, User.identifiant == identifiant_ou_email)
    ).first()

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
    """Demande de reinitialisation par e-mail (§3.1). Message identique que
    le compte existe ou non, pour ne jamais reveler son existence.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    generic_response = {
        "message": (
            "Si un compte correspond a cette adresse e-mail, un lien de "
            "reinitialisation vient d'etre genere."
        )
    }

    user = User.query.filter_by(email=email).first() if email else None
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


@auth_bp.post("/demander-verification-email")
@jwt_required()
def demander_verification_email():
    """
    Exige une adresse e-mail institutionnelle (@groupeisi.com)
    et genere un code OTP expedie par e-mail.
    """
    import random
    from datetime import timedelta
    from app.utils.validators import validate_institutional_email
    from app.utils.email import send_otp_email

    user = User.query.get(get_jwt_identity())
    if user is None:
        return jsonify({"error": "Compte introuvable."}), 404

    data = request.get_json(silent=True) or {}
    nouvelle_email = (data.get("nouvelle_email") or "").strip()

    if not nouvelle_email:
        return jsonify({"error": "Adresse e-mail requise."}), 400

    is_valid, err_msg = validate_institutional_email(nouvelle_email)
    if not is_valid:
        return jsonify({"error": err_msg}), 400

    existing_user = User.query.filter(User.email == nouvelle_email.lower(), User.id != user.id).first()
    if existing_user:
        return jsonify({"error": "Cette adresse e-mail est deja utilisee par un autre compte."}), 400

    otp_code = f"{random.randint(100000, 999999)}"
    user.pending_email = nouvelle_email.lower()
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    nom_utilisateur = (
        f"{user.student.prenom} {user.student.nom}"
        if user.student
        else (f"{user.teacher.prenom} {user.teacher.nom}" if user.teacher else user.identifiant)
    )

    send_otp_email(user.pending_email, otp_code, nom_utilisateur)

    return jsonify({
        "message": f"Un code de vérification à 6 chiffres a été envoyé à l'adresse {user.pending_email}.",
        "pending_email": user.pending_email
    }), 200


@auth_bp.post("/verifier-otp-email")
@jwt_required()
def verifier_otp_email():
    """
    Valide le code OTP saisi par l'utilisateur pour confirmer son adresse e-mail @groupeisi.com.
    """
    user = User.query.get(get_jwt_identity())
    if user is None:
        return jsonify({"error": "Compte introuvable."}), 404

    data = request.get_json(silent=True) or {}
    otp_code_saisi = (data.get("otp") or "").strip()

    if not otp_code_saisi:
        return jsonify({"error": "Code de vérification requis."}), 400

    if not user.otp_code or user.otp_code != otp_code_saisi:
        return jsonify({"error": "Code de vérification invalide."}), 400

    if not user.otp_expires_at or datetime.utcnow() > user.otp_expires_at:
        return jsonify({"error": "Code de vérification expiré. Veuillez demander un nouveau code."}), 400

    # Validation et mise a jour de l'adresse e-mail
    adresse_finale = user.pending_email or user.email
    user.email = adresse_finale
    user.email_verifie = True
    user.otp_code = None
    user.otp_expires_at = None
    user.pending_email = None

    db.session.commit()

    return jsonify({
        "message": "Adresse e-mail vérifiée avec succès !",
        "user": user.to_dict()
    }), 200


@auth_bp.post("/renvoyer-otp-email")
@jwt_required()
def renvoyer_otp_email():
    """
    Regenere et renvoie un code OTP pour l'adresse e-mail en attente de verification.
    """
    import random
    from datetime import timedelta
    from app.utils.email import send_otp_email

    user = User.query.get(get_jwt_identity())
    if user is None:
        return jsonify({"error": "Compte introuvable."}), 404

    cible_email = user.pending_email or user.email
    if not cible_email:
        return jsonify({"error": "Aucune adresse e-mail a verifier."}), 400

    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    nom_utilisateur = (
        f"{user.student.prenom} {user.student.nom}"
        if user.student
        else (f"{user.teacher.prenom} {user.teacher.nom}" if user.teacher else user.identifiant)
    )

    send_otp_email(cible_email, otp_code, nom_utilisateur)

    return jsonify({
        "message": f"Un nouveau code de vérification a été envoyé à {cible_email}."
    }), 200

