import bcrypt
import secrets
from datetime import datetime, timedelta
from app.extensions import db


class Filiere(db.Model):
    __tablename__ = "filieres"

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)

    classes = db.relationship("Classe", backref="filiere", lazy=True)

    def to_dict(self):
        return {"id": self.id, "nom": self.nom, "code": self.code}


class Classe(db.Model):
    __tablename__ = "classes"

    id = db.Column(db.Integer, primary_key=True)
    filiere_id = db.Column(db.Integer, db.ForeignKey("filieres.id", ondelete="CASCADE"), nullable=False)
    niveau = db.Column(db.Enum("L1", "L2", "L3", "M1", "M2", name="niveau_enum"), nullable=False)
    nom = db.Column(db.String(50), nullable=False)

    students = db.relationship("Student", backref="classe", lazy=True)
    assignments = db.relationship("TeacherAssignment", backref="classe", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_stats=False):
        data = {
            "id": self.id,
            "nom": self.nom,
            "niveau": self.niveau,
            "filiere_id": self.filiere_id,
            "filiere": self.filiere.nom if self.filiere else None,
            "filiere_code": self.filiere.code if self.filiere else None,
        }
        if include_stats:
            data["effectif"] = len(self.students)
            data["enseignants"] = [
                {"id": a.id, "teacher_id": a.teacher_id, "enseignant": f"{a.teacher.prenom} {a.teacher.nom}", "matiere": a.matiere}
                for a in self.assignments
            ]
        return data


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    identifiant = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(150), unique=True)
    mot_de_passe_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("etudiant", "enseignant", "admin", name="role_enum"), nullable=False, default="etudiant")
    statut = db.Column(db.Enum("actif", "inactif", name="statut_enum"), nullable=False, default="actif")
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    derniere_modification_statut = db.Column(db.DateTime, nullable=True)

    student = db.relationship("Student", backref="user", uselist=False, lazy=True)
    teacher = db.relationship("Teacher", backref="user", uselist=False, lazy=True)
    status_history = db.relationship(
        "AccountStatusHistory",
        foreign_keys="AccountStatusHistory.user_id",
        backref="user",
        lazy=True,
        order_by="desc(AccountStatusHistory.date_changement)",
    )

    def set_password(self, raw_password: str):
        self.mot_de_passe_hash = bcrypt.hashpw(
            raw_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        return bcrypt.checkpw(
            raw_password.encode("utf-8"), self.mot_de_passe_hash.encode("utf-8")
        )

    def to_dict(self):
        return {
            "id": self.id,
            "identifiant": self.identifiant,
            "email": self.email,
            "role": self.role,
            "statut": self.statut,
            "date_creation": self.date_creation.isoformat() if self.date_creation else None,
            "derniere_modification_statut": (
                self.derniere_modification_statut.isoformat()
                if self.derniere_modification_statut
                else None
            ),
        }


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    matricule = db.Column(db.String(30), nullable=False, unique=True)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    classe_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    date_naissance = db.Column(db.Date, nullable=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    grades = db.relationship("Grade", backref="student", lazy=True, cascade="all, delete-orphan")
    presences = db.relationship("Presence", backref="student", lazy=True, cascade="all, delete-orphan")
    predictions = db.relationship(
        "Prediction",
        backref="student",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="desc(Prediction.date_prediction)",
    )
    alerts = db.relationship("Alert", backref="student", lazy=True, cascade="all, delete-orphan")
    reclamations = db.relationship("Reclamation", backref="student", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_user=False):
        data = {
            "id": self.id,
            "matricule": self.matricule,
            "nom": self.nom,
            "prenom": self.prenom,
            "classe": self.classe.nom if self.classe else None,
            "classe_id": self.classe_id,
            "niveau": self.classe.niveau if self.classe else None,
            "filiere": self.classe.filiere.nom if self.classe and self.classe.filiere else None,
            "date_naissance": self.date_naissance.isoformat() if self.date_naissance else None,
        }
        if include_user and self.user:
            data["user_id"] = self.user.id
            data["statut_compte"] = self.user.statut
            data["identifiant"] = self.user.identifiant
        return data


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    assignments = db.relationship("TeacherAssignment", backref="teacher", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_user=False):
        data = {
            "id": self.id,
            "nom": self.nom,
            "prenom": self.prenom,
            "affectations": [
                {"classe_id": a.classe_id, "classe": a.classe.nom, "matiere": a.matiere}
                for a in self.assignments
            ],
        }
        if include_user and self.user:
            data["user_id"] = self.user.id
            data["identifiant"] = self.user.identifiant
            data["statut_compte"] = self.user.statut
            data["email"] = self.user.email
        return data


class TeacherAssignment(db.Model):
    __tablename__ = "teacher_assignments"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    classe_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    matiere = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "classe_id": self.classe_id,
            "classe": self.classe.nom if self.classe else None,
            "niveau": self.classe.niveau if self.classe else None,
            "matiere": self.matiere,
        }


class Grade(db.Model):
    __tablename__ = "grades"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    matiere = db.Column(db.String(100), nullable=False)
    note = db.Column(db.Numeric(4, 2), nullable=False)
    semestre = db.Column(
        db.Enum("S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", name="semestre_enum_grade"),
        nullable=False,
    )
    type_evaluation = db.Column(db.Enum("devoir", "examen", name="type_eval_enum"), nullable=False, default="examen")
    saisi_par_teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    date_saisie = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "matiere": self.matiere,
            "note": float(self.note),
            "semestre": self.semestre,
            "type_evaluation": self.type_evaluation,
            "date_saisie": self.date_saisie.isoformat() if self.date_saisie else None,
        }


class CourseSession(db.Model):
    __tablename__ = "course_sessions"

    id = db.Column(db.Integer, primary_key=True)
    classe_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    matiere = db.Column(db.String(100), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    semestre = db.Column(
        db.Enum("S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", name="semestre_enum_session"),
        nullable=False,
    )
    date_cours = db.Column(db.Date, nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    classe = db.relationship("Classe", backref="sessions", lazy=True)
    presences = db.relationship("Presence", backref="session", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        presents = sum(1 for p in self.presences if p.statut == "present")
        return {
            "id": self.id,
            "classe_id": self.classe_id,
            "classe": self.classe.nom if self.classe else None,
            "matiere": self.matiere,
            "semestre": self.semestre,
            "date_cours": self.date_cours.isoformat() if self.date_cours else None,
            "effectif": len(self.presences),
            "presents": presents,
        }


class Presence(db.Model):
    __tablename__ = "presences"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("course_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    statut = db.Column(db.Enum("present", "absent", name="presence_statut_enum"), nullable=False)

    def to_dict(self):
        return {"id": self.id, "student_id": self.student_id, "statut": self.statut}


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    probabilite_reussite = db.Column(db.Numeric(5, 4), nullable=False)
    niveau_risque = db.Column(db.Enum("faible", "moyen", "eleve", name="risque_enum"), nullable=False)
    moyenne_generale = db.Column(db.Numeric(4, 2), nullable=True)
    taux_assiduite_moyen = db.Column(db.Numeric(5, 2), nullable=True)
    semestre = db.Column(
        db.Enum("S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", name="semestre_enum_prediction"),
        nullable=True,
    )
    date_prediction = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "probabilite_reussite": float(self.probabilite_reussite),
            "niveau_risque": self.niveau_risque,
            "moyenne_generale": float(self.moyenne_generale) if self.moyenne_generale is not None else None,
            "taux_assiduite_moyen": (
                float(self.taux_assiduite_moyen) if self.taux_assiduite_moyen is not None else None
            ),
            "semestre": self.semestre,
            "date_prediction": self.date_prediction.isoformat() if self.date_prediction else None,
        }


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    prediction_id = db.Column(db.Integer, db.ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    niveau_risque = db.Column(db.Enum("faible", "moyen", "eleve", name="risque_enum_alert"), nullable=False)
    date_declenchement = db.Column(db.DateTime, default=datetime.utcnow)
    statut_traitement = db.Column(
        db.Enum("nouvelle", "en_cours", "traitee", name="traitement_enum"),
        nullable=False,
        default="nouvelle",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "etudiant": f"{self.student.prenom} {self.student.nom}" if self.student else None,
            "classe": self.student.classe.nom if self.student and self.student.classe else None,
            "niveau_risque": self.niveau_risque,
            "date_declenchement": self.date_declenchement.isoformat() if self.date_declenchement else None,
            "statut_traitement": self.statut_traitement,
        }


class AccountStatusHistory(db.Model):
    __tablename__ = "account_status_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ancien_statut = db.Column(db.Enum("actif", "inactif", name="ancien_statut_enum"), nullable=False)
    nouveau_statut = db.Column(db.Enum("actif", "inactif", name="nouveau_statut_enum"), nullable=False)
    motif = db.Column(db.String(255), nullable=True)
    modifie_par_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    date_changement = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "etudiant": (
                f"{self.user.student.prenom} {self.user.student.nom}" if self.user and self.user.student
                else (f"{self.user.teacher.prenom} {self.user.teacher.nom}" if self.user and self.user.teacher else (self.user.identifiant if self.user else None))
            ),
            "ancien_statut": self.ancien_statut,
            "nouveau_statut": self.nouveau_statut,
            "motif": self.motif,
            "date_changement": self.date_changement.isoformat() if self.date_changement else None,
        }


class Reclamation(db.Model):
    __tablename__ = "reclamations"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    sujet = db.Column(db.String(150), nullable=False)
    statut = db.Column(
        db.Enum("nouvelle", "en_cours", "resolue", name="reclamation_statut_enum"),
        nullable=False,
        default="nouvelle",
    )
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    date_maj = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship(
        "ReclamationMessage",
        backref="reclamation",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ReclamationMessage.date_envoi",
    )

    def to_dict(self, include_messages=False):
        data = {
            "id": self.id,
            "student_id": self.student_id,
            "etudiant": f"{self.student.prenom} {self.student.nom}" if self.student else None,
            "sujet": self.sujet,
            "statut": self.statut,
            "date_creation": self.date_creation.isoformat() if self.date_creation else None,
            "date_maj": self.date_maj.isoformat() if self.date_maj else None,
            "nb_messages": len(self.messages),
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages]
        return data


class ReclamationMessage(db.Model):
    __tablename__ = "reclamation_messages"

    id = db.Column(db.Integer, primary_key=True)
    reclamation_id = db.Column(db.Integer, db.ForeignKey("reclamations.id", ondelete="CASCADE"), nullable=False)
    auteur_role = db.Column(db.Enum("etudiant", "admin", name="auteur_role_enum"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    date_envoi = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "auteur_role": self.auteur_role,
            "message": self.message,
            "date_envoi": self.date_envoi.isoformat() if self.date_envoi else None,
        }


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = db.Column(db.String(100), nullable=False, unique=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    date_expiration = db.Column(db.DateTime, nullable=False)
    utilise = db.Column(db.Boolean, nullable=False, default=False)

    @staticmethod
    def generate_for(user, validity_minutes=30):
        token = secrets.token_urlsafe(32)
        return PasswordResetToken(
            user_id=user.id,
            token=token,
            date_expiration=datetime.utcnow() + timedelta(minutes=validity_minutes),
        )

    def is_valid(self):
        return not self.utilise and datetime.utcnow() < self.date_expiration
