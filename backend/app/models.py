import bcrypt
import secrets
from datetime import datetime, timedelta
from app.extensions import db


class Filiere(db.Model):
    __tablename__ = "filieres"

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    domaine = db.Column(db.String(100), nullable=False, default="Génie Informatique")

    classes = db.relationship("Classe", backref="filiere", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "nom": self.nom,
            "code": self.code,
            "domaine": self.domaine,
        }


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
            "domaine": self.filiere.domaine if self.filiere else None,
        }
        if include_stats:
            data["effectif"] = len(self.students)
            data["enseignants"] = [
                {"id": a.id, "teacher_id": a.teacher_id, "enseignant": f"{a.teacher.prenom} {a.teacher.nom}", "matiere": a.matiere}
                for a in self.assignments
            ]
        return data


class AnneeAcademique(db.Model):
    __tablename__ = "annees_academiques"

    id = db.Column(db.Integer, primary_key=True)
    libelle = db.Column(db.String(50), nullable=False, unique=True)
    annee_debut = db.Column(db.Integer, nullable=False)
    annee_fin = db.Column(db.Integer, nullable=False)
    statut = db.Column(
        db.Enum("active", "cloturee", "a_venir", name="annee_statut_enum"),
        nullable=False,
        default="active",
    )
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "libelle": self.libelle,
            "annee_debut": self.annee_debut,
            "annee_fin": self.annee_fin,
            "statut": self.statut,
            "date_creation": self.date_creation.isoformat() if self.date_creation else None,
        }


class Matiere(db.Model):
    __tablename__ = "matieres"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), nullable=False, unique=True)
    nom = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    filiere_id = db.Column(db.Integer, db.ForeignKey("filieres.id", ondelete="SET NULL"), nullable=True)
    niveau = db.Column(db.Enum("L1", "L2", "L3", "M1", "M2", name="matiere_niveau_enum"), nullable=True)
    coefficient = db.Column(db.Float, nullable=False, default=1.0)
    credit = db.Column(db.Integer, nullable=True)
    type_matiere = db.Column(
        db.Enum("fondamentale", "transversale", "optionnelle", name="type_matiere_enum"),
        nullable=False,
        default="fondamentale",
    )
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    filiere = db.relationship("Filiere", backref="matieres_specifiques", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "nom": self.nom,
            "description": self.description,
            "filiere_id": self.filiere_id,
            "filiere": self.filiere.nom if self.filiere else None,
            "domaine": self.filiere.domaine if self.filiere else None,
            "niveau": self.niveau,
            "coefficient": float(self.coefficient) if self.coefficient is not None else 1.0,
            "credit": self.credit,
            "type_matiere": self.type_matiere or "fondamentale",
            "date_creation": self.date_creation.isoformat() if self.date_creation else None,
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    identifiant = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(150), unique=True)
    mot_de_passe_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum("etudiant", "enseignant", "admin", "assistante_pedagogique", "technicien", name="role_enum"),
        nullable=False,
        default="etudiant",
    )
    statut = db.Column(db.Enum("actif", "inactif", name="statut_enum"), nullable=False, default="actif")
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    derniere_modification_statut = db.Column(db.DateTime, nullable=True)

    # Verification e-mail et OTP
    email_verifie = db.Column(db.Boolean, nullable=False, default=False)
    otp_code = db.Column(db.String(10), nullable=True)
    otp_expires_at = db.Column(db.DateTime, nullable=True)
    pending_email = db.Column(db.String(150), nullable=True)

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
        """Hash le mot de passe avec bcrypt et le stocke."""
        hashed = bcrypt.hashpw(
            raw_password.encode("utf-8"), bcrypt.gensalt()
        )
        self.mot_de_passe_hash = hashed.decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        """Vérifie le mot de passe contre le hash bcrypt stocké.

        Retourne False (au lieu de lever une exception) si le hash stocké
        est absent, tronqué, ou généré avec un autre algorithme (werkzeug,
        MD5, SHA1…). Cela évite une erreur 500 et permet à l'utilisateur
        de recevoir le message générique d'identifiant incorrect.
        """
        if not self.mot_de_passe_hash:
            return False
        try:
            return bcrypt.checkpw(
                raw_password.encode("utf-8"),
                self.mot_de_passe_hash.encode("utf-8"),
            )
        except (ValueError, Exception):
            # ValueError: Invalid salt → hash non-bcrypt ou corrompu
            return False

    def to_dict(self):
        email_valide = bool(self.email and self.email.lower().endswith("@groupeisi.com"))
        return {
            "id": self.id,
            "identifiant": self.identifiant,
            "email": self.email,
            "role": self.role,
            "statut": self.statut,
            "email_verifie": bool(self.email_verifie),
            "email_institutionnel_valide": email_valide,
            "pending_email": self.pending_email,
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


class PresenceHistory(db.Model):
    """Trace chaque correction d'une presence (ex. absence contestee et
    justifiee a posteriori par l'etudiant) : ancien statut, nouveau statut,
    motif et enseignant a l'origine du changement.
    """

    __tablename__ = "presence_history"

    id = db.Column(db.Integer, primary_key=True)
    presence_id = db.Column(db.Integer, db.ForeignKey("presences.id", ondelete="CASCADE"), nullable=False)
    ancien_statut = db.Column(db.Enum("present", "absent", name="presence_hist_ancien_enum"), nullable=False)
    nouveau_statut = db.Column(db.Enum("present", "absent", name="presence_hist_nouveau_enum"), nullable=False)
    motif = db.Column(db.String(255), nullable=True)
    modifie_par_teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    date_changement = db.Column(db.DateTime, default=datetime.utcnow)

    presence = db.relationship("Presence", backref=db.backref("historique", lazy=True, cascade="all, delete-orphan"))
    modifie_par = db.relationship("Teacher", lazy=True)

    def to_dict(self):
        etudiant = self.presence.student if self.presence else None
        return {
            "id": self.id,
            "student_id": self.presence.student_id if self.presence else None,
            "etudiant": f"{etudiant.prenom} {etudiant.nom}" if etudiant else None,
            "ancien_statut": self.ancien_statut,
            "nouveau_statut": self.nouveau_statut,
            "motif": self.motif,
            "modifie_par": f"{self.modifie_par.prenom} {self.modifie_par.nom}" if self.modifie_par else None,
            "date_changement": self.date_changement.isoformat() if self.date_changement else None,
        }


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


LIBELLES_TYPE_ALERTE = {
    "risque_echec": "Risque d'echec academique",
    "notes_faibles": "Notes faibles",
    "absences_repetees": "Absences repetees",
}


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    prediction_id = db.Column(db.Integer, db.ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    type_alerte = db.Column(
        db.Enum("risque_echec", "notes_faibles", "absences_repetees", name="type_alerte_enum"),
        nullable=False,
        default="risque_echec",
    )
    niveau_risque = db.Column(db.Enum("faible", "moyen", "eleve", name="risque_enum_alert"), nullable=False)
    date_declenchement = db.Column(db.DateTime, default=datetime.utcnow)
    statut_traitement = db.Column(
        db.Enum("nouvelle", "en_cours", "traitee", name="traitement_enum"),
        nullable=False,
        default="nouvelle",
    )
    vue_par_etudiant = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "etudiant": f"{self.student.prenom} {self.student.nom}" if self.student else None,
            "classe": self.student.classe.nom if self.student and self.student.classe else None,
            "type_alerte": self.type_alerte,
            "libelle_type": LIBELLES_TYPE_ALERTE.get(self.type_alerte, self.type_alerte),
            "niveau_risque": self.niveau_risque,
            "date_declenchement": self.date_declenchement.isoformat() if self.date_declenchement else None,
            "statut_traitement": self.statut_traitement,
            "vue_par_etudiant": bool(self.vue_par_etudiant),
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
    # Nullable : les reclamations creees avant l'introduction du routage par
    # enseignant restent lisibles (cote admin) sans enseignant assigne.
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    # Matiere ayant servi a router la reclamation vers l'enseignant : gardee
    # en clair (plutot que rededuite de l'affectation) pour rester correcte
    # meme si l'affectation change ensuite.
    matiere = db.Column(db.String(100), nullable=True)
    sujet = db.Column(db.String(150), nullable=False)
    statut = db.Column(
        db.Enum("nouvelle", "en_cours", "resolue", name="reclamation_statut_enum"),
        nullable=False,
        default="nouvelle",
    )
    # Repasse a True a chaque reponse de l'enseignant, repasse a False des
    # que l'etudiant consulte le detail : alimente la pastille de
    # notification sur "Mes reclamations", sur le meme principe que les
    # alertes non lues.
    a_nouvelle_reponse = db.Column(db.Boolean, nullable=False, default=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    date_maj = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher = db.relationship("Teacher", backref="reclamations", lazy=True)
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
            "classe": self.student.classe.nom if self.student and self.student.classe else None,
            "teacher_id": self.teacher_id,
            "enseignant": f"{self.teacher.prenom} {self.teacher.nom}" if self.teacher else None,
            "matiere": self.matiere,
            "sujet": self.sujet,
            "statut": self.statut,
            "a_nouvelle_reponse": bool(self.a_nouvelle_reponse),
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
    auteur_role = db.Column(
        db.Enum("etudiant", "admin", "enseignant", name="auteur_role_enum"), nullable=False
    )
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

class DemandeRattrapage(db.Model):
    __tablename__ = "demandes_rattrapage"
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    matiere = db.Column(db.String(100), nullable=False)
    motif = db.Column(db.String(255), nullable=True)
    date_souhaitee = db.Column(db.Date, nullable=True)
    heure_souhaitee = db.Column(db.String(50), nullable=True)
    message = db.Column(db.Text, nullable=True)
    statut = db.Column(
        db.Enum("en_attente", "acceptee", "refusee", "planifiee", "terminee", "programmee", name="demande_rat_statut_enum"),
        nullable=False,
        default="en_attente"
    )
    reponse_enseignant = db.Column(db.Text, nullable=True)
    date_planifiee = db.Column(db.Date, nullable=True)
    heure_debut_planifiee = db.Column(db.Time, nullable=True)
    heure_fin_planifiee = db.Column(db.Time, nullable=True)
    salle_planifiee = db.Column(db.String(100), nullable=True)
    observation_admin = db.Column(db.Text, nullable=True)
    date_observation_admin = db.Column(db.DateTime, nullable=True)
    auteur_observation_admin = db.Column(db.String(100), nullable=True)
    a_nouvelle_reponse = db.Column(db.Boolean, nullable=False, default=False)
    date_demande = db.Column(db.DateTime, default=datetime.utcnow)
    date_maj = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("Student", backref="demandes_rattrapage", lazy=True)
    teacher = db.relationship("Teacher", backref="demandes_rattrapage", lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "etudiant": f"{self.student.prenom} {self.student.nom}" if self.student else None,
            "matricule": self.student.matricule if self.student else None,
            "classe": self.student.classe.nom if self.student and self.student.classe else None,
            "classe_id": self.student.classe_id if self.student else None,
            "niveau": self.student.classe.niveau if self.student and self.student.classe else None,
            "filiere": (
                self.student.classe.filiere.nom
                if self.student and self.student.classe and self.student.classe.filiere
                else None
            ),
            "filiere_code": (
                self.student.classe.filiere.code
                if self.student and self.student.classe and self.student.classe.filiere
                else None
            ),
            "teacher_id": self.teacher_id,
            "enseignant": f"{self.teacher.prenom} {self.teacher.nom}" if self.teacher else None,
            "matiere": self.matiere,
            "motif": self.motif,
            "date_souhaitee": self.date_souhaitee.isoformat() if self.date_souhaitee else None,
            "heure_souhaitee": self.heure_souhaitee,
            "message": self.message,
            "statut": self.statut,
            "reponse_enseignant": self.reponse_enseignant,
            "date_planifiee": self.date_planifiee.isoformat() if self.date_planifiee else None,
            "heure_debut_planifiee": self.heure_debut_planifiee.isoformat() if self.heure_debut_planifiee else None,
            "heure_fin_planifiee": self.heure_fin_planifiee.isoformat() if self.heure_fin_planifiee else None,
            "salle_planifiee": self.salle_planifiee,
            "observation_admin": self.observation_admin,
            "date_observation_admin": self.date_observation_admin.isoformat() if self.date_observation_admin else None,
            "auteur_observation_admin": self.auteur_observation_admin,
            "a_nouvelle_reponse": bool(self.a_nouvelle_reponse),
            "date_demande": self.date_demande.isoformat() if self.date_demande else None,
            "date_maj": self.date_maj.isoformat() if self.date_maj else None,
        }

class DisponibilitePredefinie(db.Model):
    __tablename__ = "disponibilites_predefinies"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    jour_semaine = db.Column(db.Enum("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", name="jour_sem_enum"), nullable=False)
    heure_debut = db.Column(db.Time, nullable=False)
    heure_fin = db.Column(db.Time, nullable=False)
    
    teacher = db.relationship("Teacher", backref="disponibilites_predefinies", lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "jour_semaine": self.jour_semaine,
            "heure_debut": self.heure_debut.isoformat() if self.heure_debut else None,
            "heure_fin": self.heure_fin.isoformat() if self.heure_fin else None,
        }

class DemandeDisponibilite(db.Model):
    __tablename__ = "demandes_disponibilite"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    matiere = db.Column(db.String(100), nullable=False)
    classe_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    date_proposee = db.Column(db.Date, nullable=False)
    heure_debut = db.Column(db.Time, nullable=False)
    heure_fin = db.Column(db.Time, nullable=False)
    statut = db.Column(db.Enum("en_attente", "acceptee", "refusee", "proposition", name="demande_disp_statut_enum"), nullable=False, default="en_attente")
    motif_refus = db.Column(db.String(255), nullable=True)
    proposition_date = db.Column(db.Date, nullable=True)
    proposition_heure_debut = db.Column(db.Time, nullable=True)
    proposition_heure_fin = db.Column(db.Time, nullable=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    teacher = db.relationship("Teacher", backref="demandes_disponibilite", lazy=True)
    classe = db.relationship("Classe", lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "enseignant": f"{self.teacher.prenom} {self.teacher.nom}" if self.teacher else None,
            "matiere": self.matiere,
            "classe_id": self.classe_id,
            "classe": self.classe.nom if self.classe else None,
            "date_proposee": self.date_proposee.isoformat() if self.date_proposee else None,
            "heure_debut": self.heure_debut.isoformat() if self.heure_debut else None,
            "heure_fin": self.heure_fin.isoformat() if self.heure_fin else None,
            "statut": self.statut,
            "motif_refus": self.motif_refus,
            "proposition_date": self.proposition_date.isoformat() if self.proposition_date else None,
            "proposition_heure_debut": self.proposition_heure_debut.isoformat() if self.proposition_heure_debut else None,
            "proposition_heure_fin": self.proposition_heure_fin.isoformat() if self.proposition_heure_fin else None,
            "date_creation": self.date_creation.isoformat() if self.date_creation else None,
        }

class SeanceRattrapage(db.Model):
    __tablename__ = "seances_rattrapage"

    id = db.Column(db.Integer, primary_key=True)
    matiere = db.Column(db.String(100), nullable=False)
    classe_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    date_seance = db.Column(db.Date, nullable=False)
    heure_debut = db.Column(db.Time, nullable=False)
    heure_fin = db.Column(db.Time, nullable=False)
    salle = db.Column(db.String(50), nullable=False)
    capacite = db.Column(db.Integer, nullable=True)
    statut = db.Column(db.Enum("programmee", "annulee", "terminee", name="seance_rat_statut_enum"), nullable=False, default="programmee")
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    classe = db.relationship("Classe", lazy=True)
    teacher = db.relationship("Teacher", lazy=True)
    etudiants = db.relationship("EtudiantSeance", backref="seance", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_students=False):
        data = {
            "id": self.id,
            "matiere": self.matiere,
            "classe_id": self.classe_id,
            "classe": self.classe.nom if self.classe else None,
            "teacher_id": self.teacher_id,
            "enseignant": f"{self.teacher.prenom} {self.teacher.nom}" if self.teacher else None,
            "date_seance": self.date_seance.isoformat() if self.date_seance else None,
            "heure_debut": self.heure_debut.isoformat() if self.heure_debut else None,
            "heure_fin": self.heure_fin.isoformat() if self.heure_fin else None,
            "salle": self.salle,
            "capacite": self.capacite,
            "statut": self.statut,
            "date_creation": self.date_creation.isoformat() if self.date_creation else None,
        }
        if include_students:
            data["etudiants"] = [es.to_dict() for es in self.etudiants]
        return data

class EtudiantSeance(db.Model):
    __tablename__ = "etudiant_seances"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    seance_id = db.Column(db.Integer, db.ForeignKey("seances_rattrapage.id", ondelete="CASCADE"), nullable=False)
    date_inscription = db.Column(db.DateTime, default=datetime.utcnow)
    
    student = db.relationship("Student", lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "etudiant": f"{self.student.prenom} {self.student.nom}" if self.student else None,
            "seance_id": self.seance_id,
        }
