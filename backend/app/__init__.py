from flask import Flask, jsonify

from app.config import Config
from app.extensions import cors, db, jwt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
    )


    from app.routes.auth_routes import auth_bp
    from app.routes.student_routes import student_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.prediction_routes import prediction_bp
    from app.routes.teacher_routes import teacher_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.assistant_routes import assistant_bp
    from app.routes.technicien_routes import technicien_bp
    from app.routes.rattrapage import bp as rattrapage_bp
    from app.routes.grade_routes import grade_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(assistant_bp)
    app.register_blueprint(technicien_bp)
    app.register_blueprint(rattrapage_bp, url_prefix="/api/rattrapage")
    app.register_blueprint(grade_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "Prediction Academique API"}), 200

    # ----------------------------------------------------------------------
    # AUTHENTIFICATION
    # ----------------------------------------------------------------------
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Session expiree, veuillez vous reconnecter."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Jeton d'authentification invalide."}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authentification requise."}), 401

    # ----------------------------------------------------------------------
    # GESTION GLOBALE DES ERREURS
    #
    # Sans ces gestionnaires, une exception non interceptee renvoie une page
    # HTML de trace Flask. Le frontend, qui attend du JSON, echoue alors sur
    # l'analyse de la reponse et affiche un message inexploitable — tout en
    # exposant la structure interne du serveur au navigateur.
    # ----------------------------------------------------------------------
    @app.errorhandler(400)
    def erreur_requete(error):
        return jsonify({"error": "Requete invalide.", "detail": str(error)}), 400

    @app.errorhandler(403)
    def erreur_acces(error):
        return jsonify({"error": "Acces refuse."}), 403

    @app.errorhandler(404)
    def erreur_introuvable(error):
        return jsonify({"error": "Ressource introuvable."}), 404

    @app.errorhandler(500)
    def erreur_serveur(error):
        # La transaction en cours est annulee : sans ce rollback, la session
        # SQLAlchemy reste dans un etat invalide et toutes les requetes
        # suivantes echouent en cascade jusqu'au redemarrage du serveur.
        db.session.rollback()
        app.logger.exception("Erreur serveur non interceptee")
        return (
            jsonify(
                {
                    "error": "Une erreur interne est survenue.",
                    "message": "L'incident a ete enregistre. Contactez l'administrateur si le probleme persiste.",
                }
            ),
            500,
        )

    return app
