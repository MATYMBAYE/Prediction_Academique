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
    code VARCHAR(20) NOT NULL UNIQUE
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
-- Table: users (comptes de connexion - etudiant, enseignant ou admin)
-- FR-12, FR-19, FR-20
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifiant VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role ENUM('etudiant', 'enseignant', 'admin') NOT NULL DEFAULT 'etudiant',
    statut ENUM('actif', 'inactif') NOT NULL DEFAULT 'actif',
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
    niveau_risque ENUM('faible', 'moyen', 'eleve') NOT NULL,
    date_declenchement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut_traitement ENUM('nouvelle', 'en_cours', 'traitee') NOT NULL DEFAULT 'nouvelle',
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
-- Table: reclamations (etudiant -> administration)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclamations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    sujet VARCHAR(150) NOT NULL,
    statut ENUM('nouvelle', 'en_cours', 'resolue') NOT NULL DEFAULT 'nouvelle',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_maj DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: reclamation_messages (fil de discussion)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclamation_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reclamation_id INT NOT NULL,
    auteur_role ENUM('etudiant', 'admin') NOT NULL,
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
-- Index utiles
-- ------------------------------------------------------------
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_semestre ON grades(semestre);
CREATE INDEX idx_presences_student ON presences(student_id);
CREATE INDEX idx_sessions_classe ON course_sessions(classe_id, matiere);
CREATE INDEX idx_predictions_student ON predictions(student_id, date_prediction);
CREATE INDEX idx_alerts_student ON alerts(student_id);
CREATE INDEX idx_users_statut ON users(statut);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_classe ON students(classe_id);
CREATE INDEX idx_reclamations_student ON reclamations(student_id);
CREATE INDEX idx_reclamations_statut ON reclamations(statut);
