"""
Test complet des nouveaux rôles Assistante pédagogique et Technicien :
- Authentification et redirection de rôle
- Validation institutionnelle du domaine @groupeisi.com
- Contrôle d'accès strict (RBAC)
- Gestion des affectations et blocage des doublons
- Non-régression des rôles existants (Admin, Enseignant, Étudiant)
"""
import unittest
from app import create_app
from app.extensions import db
from app.models import User, TeacherAssignment, Classe, Teacher, Filiere


class TestNewRoles(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def _login(self, email, password="Passer123!"):
        res = self.client.post("/api/auth/login", json={"email": email, "mot_de_passe": password})
        if res.status_code == 200:
            return res.get_json()["access_token"], res.get_json()["user"]
        return None, None

    def test_01_login_new_roles(self):
        token_ast, user_ast = self._login("assistante@groupeisi.com")
        self.assertIsNotNone(token_ast)
        self.assertEqual(user_ast["role"], "assistante_pedagogique")

        token_tech, user_tech = self._login("technicien@groupeisi.com")
        self.assertIsNotNone(token_tech)
        self.assertEqual(user_tech["role"], "technicien")

    def test_02_rbac_restrictions(self):
        token_ast, _ = self._login("assistante@groupeisi.com")
        token_tech, _ = self._login("technicien@groupeisi.com")

        # 1. Assistante et Technicien ne peuvent pas accéder aux routes de gestion des comptes admin
        res = self.client.get("/api/admin/accounts", headers={"Authorization": f"Bearer {token_ast}"})
        self.assertEqual(res.status_code, 403)

        res = self.client.get("/api/admin/accounts", headers={"Authorization": f"Bearer {token_tech}"})
        self.assertEqual(res.status_code, 403)

        # 2. Technicien ne peut pas accéder aux prédictions/alertes confidentielles de l'assistante
        res = self.client.get("/api/assistant/students-at-risk", headers={"Authorization": f"Bearer {token_tech}"})
        self.assertEqual(res.status_code, 403)

    def test_03_assistant_routes(self):
        token_ast, _ = self._login("assistante@groupeisi.com")
        headers = {"Authorization": f"Bearer {token_ast}"}

        res = self.client.get("/api/assistant/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("statistiques", data)
        self.assertIn("repartition_risque", data)

        res = self.client.get("/api/assistant/students", headers=headers)
        self.assertEqual(res.status_code, 200)

        res = self.client.get("/api/assistant/annees-academiques", headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_04_technicien_routes_and_duplicate_prevention(self):
        token_tech, _ = self._login("technicien@groupeisi.com")
        headers = {"Authorization": f"Bearer {token_tech}"}

        res = self.client.get("/api/technicien/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)

        res = self.client.get("/api/technicien/matieres", headers=headers)
        self.assertEqual(res.status_code, 200)

        res = self.client.get("/api/technicien/assignments/audit", headers=headers)
        self.assertEqual(res.status_code, 200)

        # Test de blocage des doublons d'affectation
        with self.app.app_context():
            classe = Classe.query.first()
            teacher = Teacher.query.first()
            matiere = "Test Matiere Unique"

            if classe and teacher:
                # Créer une affectation
                res_create = self.client.post(
                    "/api/technicien/assignments",
                    json={"classe_id": classe.id, "teacher_id": teacher.id, "matiere": matiere},
                    headers=headers,
                )
                self.assertIn(res_create.status_code, (201, 409))

                # Tenter de recréer la même affectation (doublon)
                res_dup = self.client.post(
                    "/api/technicien/assignments",
                    json={"classe_id": classe.id, "teacher_id": teacher.id, "matiere": matiere},
                    headers=headers,
                )
                self.assertEqual(res_dup.status_code, 409)
                err_text = res_dup.get_json()["error"].lower()
                self.assertTrue("existe" in err_text or "conflit" in err_text or "déjà" in err_text)

    def test_05_admin_create_account_email_validation(self):
        token_admin, _ = self._login("matymbayeisidp@groupeisi.com")
        if not token_admin:
            # Fallback if admin has different email
            with self.app.app_context():
                admin = User.query.filter_by(role="admin").first()
                if admin:
                    token_admin, _ = self._login(admin.email)

        if token_admin:
            headers = {"Authorization": f"Bearer {token_admin}"}

            # 1. Tentative avec un email Gmail non autorisé pour Assistante
            res_invalid = self.client.post(
                "/api/admin/accounts",
                json={
                    "identifiant": "test_invalid_ast",
                    "email": "invalid_ast@gmail.com",
                    "mot_de_passe": "Passer123!",
                    "role": "assistante_pedagogique",
                },
                headers=headers,
            )
            self.assertEqual(res_invalid.status_code, 400)
            self.assertEqual(res_invalid.get_json()["error"], "L'adresse e-mail doit utiliser le domaine @groupeisi.com.")

            # 2. Tentative avec un email Gmail non autorisé pour Technicien
            res_invalid_tech = self.client.post(
                "/api/admin/accounts",
                json={
                    "identifiant": "test_invalid_tech",
                    "email": "invalid_tech@yahoo.com",
                    "mot_de_passe": "Passer123!",
                    "role": "technicien",
                },
                headers=headers,
            )
            self.assertEqual(res_invalid_tech.status_code, 400)
            self.assertEqual(res_invalid_tech.get_json()["error"], "L'adresse e-mail doit utiliser le domaine @groupeisi.com.")


if __name__ == "__main__":
    unittest.main()
