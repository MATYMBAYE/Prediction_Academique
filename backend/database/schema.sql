-- ============================================================
-- Prediction_db - Schema MySQL
-- Application Web de Prediction de Performance Academique
-- ISI-SUPETCH
-- ============================================================

CREATE DATABASE IF NOT EXISTS Prediction_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE Prediction_db;

-- ------------------------------------------------------------
-- Table: filieres
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS filieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    domaine VARCHAR(100) NOT NULL DEFAULT 'Génie Informatique'
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: classes (filiere + niveau, cursus Licence/Master a 10 semestres)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filiere_id INT NOT NULL,
    niveau ENUM('L1', 'L2', 'L3', 'M1', 'M2') NOT NULL,
    nom VARCHAR(50) NOT NULL,
    UNIQUE KEY uq_classe (filiere_id, niveau),
    FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: annees_academiques
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS annees_academiques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL UNIQUE,
    annee_debut INT NOT NULL,
    annee_fin INT NOT NULL,
    statut ENUM('active', 'cloturee', 'a_venir') NOT NULL DEFAULT 'active',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: matieres (catalogue centralisé des matières)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    description TEXT NULL,
    filiere_id INT NULL,
    niveau ENUM('L1', 'L2', 'L3', 'M1', 'M2') NULL,
    coefficient DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    credit INT NULL DEFAULT NULL,
    type_matiere ENUM('fondamentale', 'transversale', 'optionnelle') NOT NULL DEFAULT 'fondamentale',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: users (comptes de connexion - etudiant, enseignant, admin, assistante_pedagogique, technicien)
-- FR-12, FR-19, FR-20
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifiant VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role ENUM('etudiant', 'enseignant', 'admin', 'assistante_pedagogique', 'technicien') NOT NULL DEFAULT 'etudiant',
    statut ENUM('actif', 'inactif') NOT NULL DEFAULT 'actif',
    email_verifie TINYINT(1) NOT NULL DEFAULT 0,
    otp_code VARCHAR(10) NULL,
    otp_expires_at DATETIME NULL,
    pending_email VARCHAR(150) NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    derniere_modification_statut DATETIME NULL
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- Table: students (fiche etudiant)
-- FR-01
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    matricule VARCHAR(30) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    classe_id INT,
    date_naissance DATE NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: teachers (fiche enseignant)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: teacher_assignments (affectation enseignant -> classe -> matiere)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    classe_id INT NOT NULL,
    matiere VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_affectation (teacher_id, classe_id, matiere),
    -- Une seule matiere par classe ne peut avoir qu'un seul enseignant :
    -- cette contrainte rend la regle infranchissable, meme en cas de bug
    -- applicatif ou d'ecriture concurrente.
    UNIQUE KEY uq_classe_matiere (classe_id, matiere),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: grades (notes) - FR-02, FR-04
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    matiere VARCHAR(100) NOT NULL,
    note DECIMAL(4,2) NOT NULL,
    semestre ENUM('S1','S2','S3','S4','S5','S6','S7','S8','S9','S10') NOT NULL,
    type_evaluation ENUM('devoir', 'examen') NOT NULL DEFAULT 'examen',
    saisi_par_teacher_id INT NULL,
    date_saisie DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (saisi_par_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: course_sessions (une session de cours datee = un appel)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    classe_id INT NOT NULL,
    matiere VARCHAR(100) NOT NULL,
    teacher_id INT NULL,
    semestre ENUM('S1','S2','S3','S4','S5','S6','S7','S8','S9','S10') NOT NULL,
    date_cours DATE NOT NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: presences (statut par etudiant pour une session de cours)
-- FR-03, FR-04 (assiduite desormais calculee a partir de l'appel)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    statut ENUM('present', 'absent') NOT NULL,
    UNIQUE KEY uq_presence (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: presence_history (correction d'une presence apres coup, avec motif)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presence_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    presence_id INT NOT NULL,
    ancien_statut ENUM('present', 'absent') NOT NULL,
    nouveau_statut ENUM('present', 'absent') NOT NULL,
    motif VARCHAR(255) NULL,
    modifie_par_teacher_id INT NULL,
    date_changement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (presence_id) REFERENCES presences(id) ON DELETE CASCADE,
    FOREIGN KEY (modifie_par_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: predictions - FR-05 a FR-08
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    probabilite_reussite DECIMAL(5,4) NOT NULL,
    niveau_risque ENUM('faible', 'moyen', 'eleve') NOT NULL,
    moyenne_generale DECIMAL(4,2) NULL,
    taux_assiduite_moyen DECIMAL(5,2) NULL,
    semestre ENUM('S1','S2','S3','S4','S5','S6','S7','S8','S9','S10') NULL,
    date_prediction DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: alerts - FR-09 a FR-11
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    prediction_id INT NULL,
    type_alerte ENUM('risque_echec', 'notes_faibles', 'absences_repetees') NOT NULL DEFAULT 'risque_echec',
    niveau_risque ENUM('faible', 'moyen', 'eleve') NOT NULL,
    date_declenchement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut_traitement ENUM('nouvelle', 'en_cours', 'traitee') NOT NULL DEFAULT 'nouvelle',
    vue_par_etudiant TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: account_status_history - FR-15, FR-17 (tracabilite)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ancien_statut ENUM('actif', 'inactif') NOT NULL,
    nouveau_statut ENUM('actif', 'inactif') NOT NULL,
    motif VARCHAR(255) NULL,
    modifie_par_user_id INT NULL,
    date_changement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (modifie_par_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: reclamations (etudiant -> enseignant de la matiere concernee ;
-- l'administration en garde une vue de lecture seule pour supervision)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclamations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    teacher_id INT NULL,
    matiere VARCHAR(100) NULL,
    sujet VARCHAR(150) NOT NULL,
    statut ENUM('nouvelle', 'en_cours', 'resolue') NOT NULL DEFAULT 'nouvelle',
    a_nouvelle_reponse TINYINT(1) NOT NULL DEFAULT 0,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_maj DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: reclamation_messages (fil de discussion)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclamation_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reclamation_id INT NOT NULL,
    auteur_role ENUM('etudiant', 'admin', 'enseignant') NOT NULL,
    message TEXT NOT NULL,
    date_envoi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reclamation_id) REFERENCES reclamations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: password_reset_tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expiration DATETIME NOT NULL,
    utilise TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: demandes_rattrapage
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demandes_rattrapage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    matiere VARCHAR(100) NOT NULL,
    statut ENUM('en_attente', 'programmee') NOT NULL DEFAULT 'en_attente',
    date_demande DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: disponibilites_predefinies
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disponibilites_predefinies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    jour_semaine ENUM('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche') NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: demandes_disponibilite
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demandes_disponibilite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    matiere VARCHAR(100) NOT NULL,
    classe_id INT NOT NULL,
    date_proposee DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    statut ENUM('en_attente', 'acceptee', 'refusee', 'proposition') NOT NULL DEFAULT 'en_attente',
    motif_refus VARCHAR(255) NULL,
    proposition_date DATE NULL,
    proposition_heure_debut TIME NULL,
    proposition_heure_fin TIME NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: seances_rattrapage
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seances_rattrapage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matiere VARCHAR(100) NOT NULL,
    classe_id INT NOT NULL,
    teacher_id INT NULL,
    date_seance DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    salle VARCHAR(50) NOT NULL,
    capacite INT NULL,
    statut ENUM('programmee', 'annulee', 'terminee') NOT NULL DEFAULT 'programmee',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: etudiant_seances
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etudiant_seances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    seance_id INT NOT NULL,
    date_inscription DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_etudiant_seance (student_id, seance_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (seance_id) REFERENCES seances_rattrapage(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Index utiles
-- ------------------------------------------------------------
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_semestre ON grades(semestre);
CREATE INDEX idx_presences_student ON presences(student_id);
CREATE INDEX idx_presence_history_presence ON presence_history(presence_id);
CREATE INDEX idx_sessions_classe ON course_sessions(classe_id, matiere);
CREATE INDEX idx_predictions_student ON predictions(student_id, date_prediction);
CREATE INDEX idx_alerts_student ON alerts(student_id);
CREATE INDEX idx_alerts_student_vue ON alerts(student_id, vue_par_etudiant);
CREATE INDEX idx_users_statut ON users(statut);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_classe ON students(classe_id);
CREATE INDEX idx_reclamations_student ON reclamations(student_id);
CREATE INDEX idx_reclamations_statut ON reclamations(statut);
CREATE INDEX idx_reclamations_teacher ON reclamations(teacher_id);
CREATE INDEX idx_matieres_filiere ON matieres(filiere_id);
CREATE INDEX idx_matieres_code ON matieres(code);
CREATE INDEX idx_annees_statut ON annees_academiques(statut);
