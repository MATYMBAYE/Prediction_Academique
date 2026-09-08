import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import AccountDisabled from "./pages/AccountDisabled.jsx";
import NotFound from "./pages/NotFound.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// --- Etudiant -------------------------------------------------------------
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentAlerts from "./pages/student/StudentAlerts.jsx";
import StudentReclamations from "./pages/student/StudentReclamations.jsx";
import StudentRattrapages from "./pages/student/StudentRattrapages.jsx";

// --- Enseignant -----------------------------------------------------------
import TeacherDashboard from "./pages/teacher/TeacherDashboard.jsx";
import TeacherAttendance from "./pages/teacher/TeacherAttendance.jsx";
import TeacherGrades from "./pages/teacher/TeacherGrades.jsx";
import TeacherReclamations from "./pages/teacher/TeacherReclamations.jsx";
import TeacherRattrapages from "./pages/teacher/TeacherRattrapages.jsx";

// --- Administrateur -------------------------------------------------------
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminStudents from "./pages/admin/AdminStudents.jsx";
import AdminStudentDetail from "./pages/admin/AdminStudentDetail.jsx";
import AdminClasses from "./pages/admin/AdminClasses.jsx";
import AdminClassDetail from "./pages/admin/AdminClassDetail.jsx";
import AdminTeachers from "./pages/admin/AdminTeachers.jsx";
import AdminTeacherDetail from "./pages/admin/AdminTeacherDetail.jsx";
import AdminPredictionsStats from "./pages/admin/AdminPredictionsStats.jsx";
import AdminModelPerformance from "./pages/admin/AdminModelPerformance.jsx";
import AdminAccounts from "./pages/admin/AdminAccounts.jsx";
import AdminAlerts from "./pages/admin/AdminAlerts.jsx";
import AdminReclamations from "./pages/admin/AdminReclamations.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import AdminRattrapages from "./pages/admin/AdminRattrapages.jsx";
import GradesManagementPage from "./pages/admin/GradesManagementPage.jsx";

// --- Assistante pédagogique -----------------------------------------------
import AssistantDashboard from "./pages/assistant/AssistantDashboard.jsx";
import AssistantStudents from "./pages/assistant/AssistantStudents.jsx";
import AssistantStudentDetail from "./pages/assistant/AssistantStudentDetail.jsx";
import AssistantRiskTracking from "./pages/assistant/AssistantRiskTracking.jsx";
import AssistantAlerts from "./pages/assistant/AssistantAlerts.jsx";
import AssistantClasses from "./pages/assistant/AssistantClasses.jsx";
import AssistantAcademicYears from "./pages/assistant/AssistantAcademicYears.jsx";

// --- Technicien -----------------------------------------------------------
import TechnicienDashboard from "./pages/technicien/TechnicienDashboard.jsx";
import TechnicienAssignments from "./pages/technicien/TechnicienAssignments.jsx";
import TechnicienAudit from "./pages/technicien/TechnicienAudit.jsx";
import TechnicienClasses from "./pages/technicien/TechnicienClasses.jsx";
import TechnicienFilieres from "./pages/technicien/TechnicienFilieres.jsx";
import TechnicienNiveaux from "./pages/technicien/TechnicienNiveaux.jsx";
import TechnicienMatieres from "./pages/technicien/TechnicienMatieres.jsx";
import TechnicienTeachers from "./pages/technicien/TechnicienTeachers.jsx";

export default function App() {
  return (
    <Routes>
      {/* --------------------------------------------------------- Public */}
      <Route path="/" element={<Home />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
      <Route path="/compte-desactive" element={<AccountDisabled />} />

      {/* ------------------------------------------------------- Etudiant */}
      <Route
        path="/etudiant"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etudiant/prediction"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etudiant/notes"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etudiant/assiduite"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etudiant/alertes"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentAlerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etudiant/reclamations"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentReclamations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etudiant/rattrapages"
        element={
          <ProtectedRoute roles={["etudiant"]}>
            <StudentRattrapages />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------- Enseignant */}
      <Route
        path="/enseignant"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/classes"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/alertes"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/etudiants/:id"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <AdminStudentDetail role="enseignant" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/appel"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/notes"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherGrades />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/reclamations"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherReclamations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enseignant/rattrapages"
        element={
          <ProtectedRoute roles={["enseignant"]}>
            <TeacherRattrapages />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------- Assistante pédagogique */}
      <Route
        path="/assistante"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/dashboard"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/etudiants"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/etudiants/:id"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantStudentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/etudiants-risque"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantRiskTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/predictions"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantRiskTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/notes"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <GradesManagementPage role="assistante_pedagogique" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/alertes"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantAlerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/classes"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/filieres"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistante/annees-academiques"
        element={
          <ProtectedRoute roles={["assistante_pedagogique", "admin"]}>
            <AssistantAcademicYears />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------- Technicien */}
      <Route
        path="/technicien"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/dashboard"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/affectations"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/audit-affectations"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/audit"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/verification-audit"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/verification"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/classes"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/filieres"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienFilieres />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/niveaux"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienNiveaux />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/matieres"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienMatieres />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/enseignants"
        element={
          <ProtectedRoute roles={["technicien", "admin"]}>
            <TechnicienTeachers />
          </ProtectedRoute>
        }
      />

      {/* -------------------------------------------------- Administrateur */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/etudiants"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/etudiants/:id"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminStudentDetail role="admin" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/classes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/classes/:id"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminClassDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enseignants"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminTeachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enseignants/:id"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminTeacherDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/predictions"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminPredictionsStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/modele"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminModelPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/comptes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminAccounts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/alertes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminAlerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reclamations"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminReclamations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rapports"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rattrapages"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminRattrapages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/etudiants-risque"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AssistantRiskTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/affectations"
        element={
          <ProtectedRoute roles={["admin"]}>
            <TechnicienAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-affectations"
        element={
          <ProtectedRoute roles={["admin"]}>
            <TechnicienAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute roles={["admin"]}>
            <TechnicienAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/matieres"
        element={
          <ProtectedRoute roles={["admin"]}>
            <TechnicienMatieres />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/annees-academiques"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AssistantAcademicYears />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <GradesManagementPage role="admin" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
