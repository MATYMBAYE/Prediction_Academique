import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "Prediction_db")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # pool_pre_ping : vérifie la connexion avant chaque requête
    # évite l'erreur "MySQL server has gone away" après inactivité
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,  # Renouvelle les connexions toutes les 30 min
    }

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)

    SEUIL_RISQUE_ELEVE = float(os.getenv("SEUIL_RISQUE_ELEVE", 0.45))
    SEUIL_RISQUE_MOYEN = float(os.getenv("SEUIL_RISQUE_MOYEN", 0.65))

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # Configuration du domaine e-mail et SMTP
    INSTITUTIONAL_EMAIL_DOMAIN = os.getenv("INSTITUTIONAL_EMAIL_DOMAIN", "groupeisi.com")
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() in ("true", "1")
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "matymbayeisidp@groupeisi.com")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER_ADDR = os.getenv(
        "MAIL_DEFAULT_SENDER_ADDR", os.getenv("MAIL_FROM_ADDRESS", "admin@groupeisi.com")
    )
    MAIL_DEFAULT_SENDER_NAME = os.getenv("MAIL_DEFAULT_SENDER_NAME", "ISI-SUPTECH")

