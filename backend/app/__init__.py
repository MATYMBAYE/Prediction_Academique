from flask import Flask, jsonify

from app.config import Config
from app.extensions import cors, db, jwt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    from app.routes.auth_routes import auth_bp
    from app.routes.student_routes import student_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.prediction_routes import prediction_bp
    from app.routes.teacher_routes import teacher_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(teacher_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "Prediction Academique API"}), 200

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Session expiree, veuillez vous reconnecter."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Jeton d'authentification invalide."}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authentification requise."}), 401

    return app
