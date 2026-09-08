import io
import unittest
from app import create_app
from app.models import Classe, Grade, Student, User


class TestGradeImportAndCRUD(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def _login(self, email_or_id, password):
        res = self.client.post("/api/auth/login", json={"email": email_or_id, "mot_de_passe": password})
        if res.status_code == 200:
            return {"Authorization": f"Bearer {res.get_json()['access_token']}"}
        return {}

    def test_01_get_class_students(self):
        headers = self._login("admin", "Admin@1234")
        with self.app.app_context():
            classe = Classe.query.first()
            self.assertIsNotNone(classe)
            classe_id = classe.id

        res = self.client.get(
            f"/api/grades/class-students?classe_id={classe_id}&matiere=Algorithmique&type_evaluation=examen&semestre=S1",
            headers=headers,
        )
        self.assertEqual(res.status_code, 200)
        json_data = res.get_json()
        self.assertIn("students", json_data)
        self.assertIn("classe", json_data)
        if json_data["students"]:
            self.assertIn("matricule", json_data["students"][0])
            self.assertIn("nom", json_data["students"][0])

    def test_02_template_classe_download(self):
        headers = self._login("admin", "Admin@1234")
        with self.app.app_context():
            classe = Classe.query.first()
            classe_id = classe.id

        res = self.client.get(
            f"/api/grades/template-classe?classe_id={classe_id}&matiere=Algorithmique&type_evaluation=examen&semestre=S1",
            headers=headers,
        )
        self.assertEqual(res.status_code, 200)
        content = res.get_data(as_text=True)
        self.assertIn("matricule", content)
        self.assertIn("note", content)

    def test_03_batch_save_and_crud(self):
        headers = self._login("admin", "Admin@1234")
        with self.app.app_context():
            classe = Classe.query.first()
            classe_id = classe.id
            student = Student.query.filter_by(classe_id=classe_id).first()
            self.assertIsNotNone(student)
            student_id = student.id

        # Batch save direct grid entry
        payload = {
            "classe_id": classe_id,
            "matiere": "Algorithmique",
            "type_evaluation": "examen",
            "semestre": "S1",
            "notes": [{"student_id": student_id, "note": 16.25}],
        }
        res = self.client.post("/api/grades/batch-save", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)

        # Verify grade exists in DB
        with self.app.app_context():
            g = Grade.query.filter_by(student_id=student_id, matiere="Algorithmique", type_evaluation="examen", semestre="S1").first()
            self.assertIsNotNone(g)
            self.assertEqual(float(g.note), 16.25)
            grade_id = g.id

        # Update note (PUT)
        res_put = self.client.put(f"/api/grades/{grade_id}", json={"note": 18.0}, headers=headers)
        self.assertEqual(res_put.status_code, 200)
        with self.app.app_context():
            g_updated = Grade.query.get(grade_id)
            self.assertEqual(float(g_updated.note), 18.0)

        # Delete note (DELETE)
        res_del = self.client.delete(f"/api/grades/{grade_id}", headers=headers)
        self.assertEqual(res_del.status_code, 200)
        with self.app.app_context():
            g_deleted = Grade.query.get(grade_id)
            self.assertIsNone(g_deleted)


if __name__ == "__main__":
    unittest.main()
