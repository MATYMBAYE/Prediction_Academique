import logging
import smtplib
import socket
import threading
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app

logger = logging.getLogger(__name__)


def send_async_email(app, msg, to_email, server_config):
    """
    Tente d'envoyer un e-mail via le serveur SMTP configure.
    Si le serveur n'est pas joignable ou les identifiants incomplets,
    capture l'exception sans bloquer ni faire crasher l'application.
    """
    with app.app_context():
        mail_password = server_config.get("MAIL_PASSWORD", "")
        if not mail_password:
            logger.warning(
                f"[SIMULATION E-MAIL SMTP] Mot de passe SMTP non renseigne. Message a destination de {to_email} non transmis sur le reseau."
            )
            return

        try:
            server = smtplib.SMTP(
                server_config["MAIL_SERVER"], server_config["MAIL_PORT"], timeout=10
            )
            if server_config.get("MAIL_USE_TLS", True):
                server.starttls()
            server.login(server_config["MAIL_USERNAME"], mail_password)
            server.sendmail(server_config["MAIL_USERNAME"], [to_email], msg.as_string())
            server.quit()
            logger.info(f"E-mail transmis avec succes a {to_email}")
        except Exception as e:
            logger.error(f"Echec d'envoi SMTP vers {to_email}: {e}")


def send_otp_email(to_email: str, otp_code: str, user_name: str = "Utilisateur") -> bool:
    """
    Genere et declenche l'envoi de l'e-mail contenant le code OTP de verification.
    """
    app = current_app._get_current_object()

    sender_name = app.config.get("MAIL_DEFAULT_SENDER_NAME", "ISI-SUPTECH")
    sender_addr = app.config.get("MAIL_DEFAULT_SENDER_ADDR", "admin@groupeisi.com")

    subject = f"[{sender_name}] Code de vérification de votre adresse e-mail"

    text_body = (
        f"Bonjour {user_name},\n\n"
        f"Voici votre code de vérification pour valider votre adresse e-mail institutionnelle ISI-SUPTECH :\n\n"
        f"CODE : {otp_code}\n\n"
        f"Ce code expire dans 15 minutes.\n\n"
        f"Si vous n'avez pas demande cette verification, veuillez ignorer ce message.\n\n"
        f"Cordialement,\nL'equipe {sender_name}"
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }}
        .logo-title {{ font-size: 20px; font-weight: 700; color: #1e3a8a; }}
        .otp-box {{ background-color: #f1f5f9; border: 2px dashed #2563eb; border-radius: 8px; text-align: center; padding: 16px; margin: 24px 0; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8; }}
        .footer {{ font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-title">🎓 ISI-SUPTECH</div>
        </div>
        <p>Bonjour <strong>{user_name}</strong>,</p>
        <p>Veuillez utiliser le code de vérification ci-dessous pour valider votre adresse e-mail institutionnelle <code>@groupeisi.com</code> :</p>
        <div class="otp-box">{otp_code}</div>
        <p>Ce code est à usage unique et expire dans <strong>15 minutes</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        <div class="footer">
          Expédié par <strong>{sender_name}</strong> (&lt;{sender_addr}&gt;)<br>
          Institut Supérieur de Technologie - ISI SUPTECH
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{sender_name} <{sender_addr}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    server_config = {
        "MAIL_SERVER": app.config.get("MAIL_SERVER", "smtp.gmail.com"),
        "MAIL_PORT": app.config.get("MAIL_PORT", 587),
        "MAIL_USE_TLS": app.config.get("MAIL_USE_TLS", True),
        "MAIL_USERNAME": app.config.get("MAIL_USERNAME", "matymbayeisidp@groupeisi.com"),
        "MAIL_PASSWORD": app.config.get("MAIL_PASSWORD", ""),
    }

    print(f"=== [SEND_OTP_EMAIL] Destination: {to_email} | Code OTP: {otp_code} | Expéditeur: {sender_name} <{sender_addr}> ===")

    thread = threading.Thread(
        target=send_async_email, args=(app, msg, to_email, server_config)
    )
    thread.start()

    return True


def send_student_credentials_email(
    to_email: str,
    student_name: str,
    matricule: str,
    identifiant: str,
    temp_password: str,
    login_url: str = None,
    synchronous: bool = False,
) -> tuple[bool, str]:
    """
    Envoie un e-mail à l'étudiant avec ses identifiants de première connexion :
    - Matricule officiel conservé
    - Identifiant de connexion généré
    - Mot de passe temporaire sécurisé
    - Lien vers la page de connexion
    - Recommandation de changer le mot de passe dès la 1ère connexion
    """
    app = current_app._get_current_object()

    sender_name = app.config.get("MAIL_DEFAULT_SENDER_NAME", "ISI-SUPTECH")
    sender_addr = app.config.get("MAIL_DEFAULT_SENDER_ADDR", "admin@groupeisi.com")
    frontend_origin = app.config.get("FRONTEND_ORIGIN", "http://localhost:5173")
    resolved_login_url = login_url or f"{frontend_origin}/login"

    subject = f"[{sender_name}] Vos identifiants d'accès à la plateforme académique"

    text_body = (
        f"Bonjour {student_name},\n\n"
        f"Votre compte étudiant sur la plateforme ISI-SUPTECH a été créé avec succès.\n\n"
        f"Voici vos informations de première connexion :\n"
        f"--------------------------------------------------\n"
        f"• Matricule officiel : {matricule}\n"
        f"• Identifiant        : {identifiant}\n"
        f"• Mot de passe temp. : {temp_password}\n"
        f"• Page de connexion  : {resolved_login_url}\n"
        f"--------------------------------------------------\n\n"
        f"IMPORTANT : Pour des raisons de sécurité, nous vous demandons de modifier votre mot de passe "
        f"temporaire dès votre première connexion dans les paramètres de votre profil.\n\n"
        f"Cordialement,\n"
        f"L'équipe Pédagogique & Administrative\n"
        f"{sender_name} ({sender_addr})\n"
    )

    html_body = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }}
        .header {{ text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }}
        .logo-title {{ font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; }}
        .sub-title {{ font-size: 14px; color: #64748b; margin-top: 4px; }}
        .welcome {{ font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 20px; }}
        .creds-box {{ background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 5px solid #2563eb; border-radius: 10px; padding: 20px; margin: 24px 0; }}
        .cred-row {{ display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }}
        .cred-row:last-child {{ margin-bottom: 0; }}
        .cred-label {{ font-weight: 600; color: #475569; }}
        .cred-val {{ font-family: 'Courier New', monospace; font-weight: 700; color: #1e293b; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; }}
        .badge-matricule {{ background: #dbeafe; color: #1e40af; font-family: monospace; font-weight: 700; padding: 2px 8px; border-radius: 4px; }}
        .alert-warning {{ background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 14px 16px; font-size: 13.5px; color: #92400e; margin: 24px 0; }}
        .btn-container {{ text-align: center; margin: 30px 0 20px 0; }}
        .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2); }}
        .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 18px; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-title">🎓 ISI-SUPTECH</div>
          <div class="sub-title">Système d'Information et de Suivi Académique</div>
        </div>
        
        <p class="welcome">Bonjour <strong>{student_name}</strong>,</p>
        <p class="welcome">Votre compte étudiant sur la plateforme <strong>ISI-SUPTECH</strong> a été créé. Vous trouverez ci-dessous vos identifiants pour votre première connexion :</p>
        
        <div class="creds-box">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #475569; font-weight: 600;">Matricule officiel :</td>
              <td style="padding: 8px 0; text-align: right;"><span class="badge-matricule">{matricule}</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #475569; font-weight: 600;">Identifiant de connexion :</td>
              <td style="padding: 8px 0; text-align: right;"><span class="cred-val">{identifiant}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #475569; font-weight: 600;">Mot de passe temporaire :</td>
              <td style="padding: 8px 0; text-align: right;"><span class="cred-val">{temp_password}</span></td>
            </tr>
          </table>
        </div>

        <div class="btn-container">
          <a href="{resolved_login_url}" class="btn" target="_blank">Accéder à la plateforme</a>
        </div>

        <div class="alert-warning">
          ⚠️ <strong>Consigne de sécurité importante :</strong><br>
          Pour protéger votre compte, vous devez obligatoirement modifier ce mot de passe temporaire dès votre première connexion via l'espace Mon Profil.
        </div>

        <div class="footer">
          Expédié par <strong>{sender_name}</strong> (&lt;{sender_addr}&gt;)<br>
          Institut Supérieur de Technologie - ISI SUPTECH<br>
          Ce message automatique contient des informations confidentielles. Ne le partagez pas.
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{sender_name} <{sender_addr}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    server_config = {
        "MAIL_SERVER": app.config.get("MAIL_SERVER", "smtp.gmail.com"),
        "MAIL_PORT": app.config.get("MAIL_PORT", 587),
        "MAIL_USE_TLS": app.config.get("MAIL_USE_TLS", True),
        "MAIL_USERNAME": app.config.get("MAIL_USERNAME", "matymbayeisidp@groupeisi.com"),
        "MAIL_PASSWORD": app.config.get("MAIL_PASSWORD", ""),
    }

    print(
        f"=== [SEND_CREDENTIALS_EMAIL] Destinataire: {to_email} | Matricule: {matricule} | Identifiant: {identifiant} | Expéditeur: {sender_name} <{sender_addr}> ==="
    )

    if synchronous:
        mail_password = server_config.get("MAIL_PASSWORD", "")
        if not mail_password:
            msg_warn = f"Mot de passe SMTP non configuré dans .env. Simulation locale réussie pour {to_email}."
            logger.warning(msg_warn)
            return True, msg_warn
        try:
            server = smtplib.SMTP(
                server_config["MAIL_SERVER"], server_config["MAIL_PORT"], timeout=12
            )
            if server_config.get("MAIL_USE_TLS", True):
                server.starttls()
            server.login(server_config["MAIL_USERNAME"], mail_password)
            server.sendmail(server_config["MAIL_USERNAME"], [to_email], msg.as_string())
            server.quit()
            logger.info(f"E-mail d'identifiants envoyé avec succès à {to_email}")
            return True, f"E-mail d'identifiants envoyé avec succès à {to_email}"
        except Exception as e:
            err_msg = f"Échec d'envoi SMTP vers {to_email}: {str(e)}"
            logger.error(err_msg)
            return False, err_msg
    else:
        thread = threading.Thread(
            target=send_async_email, args=(app, msg, to_email, server_config)
        )
        thread.start()
        return True, "Envoi asynchrone initié."


def test_smtp_diagnostic(target_email: str = "matymbaye6618@gmail.com") -> dict:
    """
    Effectue un diagnostic complet de la configuration et de la connectivité SMTP,
    avec test de transmission vers l'adresse cible.
    """
    app = current_app._get_current_object()

    server_host = app.config.get("MAIL_SERVER", "smtp.gmail.com")
    server_port = int(app.config.get("MAIL_PORT", 587))
    use_tls = app.config.get("MAIL_USE_TLS", True)
    mail_username = app.config.get("MAIL_USERNAME", "matymbayeisidp@groupeisi.com")
    mail_password = app.config.get("MAIL_PASSWORD", "")
    sender_addr = app.config.get("MAIL_DEFAULT_SENDER_ADDR", "admin@groupeisi.com")
    sender_name = app.config.get("MAIL_DEFAULT_SENDER_NAME", "ISI-SUPTECH")

    diag = {
        "serveur_smtp": server_host,
        "port_smtp": server_port,
        "chiffrement": "STARTTLS" if use_tls else "Aucun",
        "compte_auth": mail_username,
        "mot_de_passe_configure": bool(mail_password),
        "adresse_expedition": f"{sender_name} <{sender_addr}>",
        "destinataire_test": target_email,
        "dns_ok": False,
        "socket_ok": False,
        "starttls_ok": False,
        "auth_ok": False,
        "envoi_ok": False,
        "details": [],
    }

    # 1. Résolution DNS & Socket
    try:
        ip = socket.gethostbyname(server_host)
        diag["dns_ok"] = True
        diag["ip_resolue"] = ip
        diag["details"].append(f"DNS résolu : {server_host} -> {ip}")

        sock = socket.create_connection((server_host, server_port), timeout=6)
        sock.close()
        diag["socket_ok"] = True
        diag["details"].append(f"Connexion TCP établie sur {server_host}:{server_port}")
    except Exception as e:
        diag["details"].append(f"Erreur de connectivité réseau: {e}")
        return diag

    # 2. Handshake SMTP & TLS
    try:
        server = smtplib.SMTP(server_host, server_port, timeout=10)
        server.ehlo()
        if use_tls:
            server.starttls()
            server.ehlo()
        diag["starttls_ok"] = True
        diag["details"].append("Handshake SMTP & STARTTLS validés.")

        if not mail_password:
            diag["details"].append(
                "Variable MAIL_PASSWORD non définie ou vide dans backend/.env. Pour envoyer des e-mails réels via Gmail SMTP, ajoutez votre mot de passe d'application dans le fichier .env."
            )
            server.quit()
            return diag

        # 3. Authentification
        try:
            server.login(mail_username, mail_password)
            diag["auth_ok"] = True
            diag["details"].append("Authentification SMTP réussie.")

            # 4. Envoi réel
            success, msg_result = send_student_credentials_email(
                to_email=target_email,
                student_name="Étudiant Test ISI",
                matricule="ISI2026-TEST01",
                identifiant="test.etudiant",
                temp_password="TempPass2026!#",
                synchronous=True,
            )
            diag["envoi_ok"] = success
            diag["details"].append(f"Résultat d'envoi réel vers {target_email} : {msg_result}")
        except Exception as auth_err:
            diag["details"].append(f"Erreur d'authentification SMTP / Envoi : {auth_err}")

        server.quit()
    except Exception as e:
        diag["details"].append(f"Erreur protocole SMTP : {e}")

    return diag
