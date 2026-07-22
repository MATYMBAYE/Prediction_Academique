import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import AccountDisabled from "./pages/AccountDisabled.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentReclamations from "./pages/student/StudentReclamations.jsx";
import TeacherDashboard from "./pages/teacher/TeacherDashboard.jsx";
import TeacherAttendance from "./pages/teacher/TeacherAttendance.jsx";
import TeacherGrades from "./pages/teacher/TeacherGrades.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminStudents from "./pages/admin/AdminStudents.jsx";
import AdminStudentDetail from "./pages/admin/AdminStudentDetail.jsx";
import AdminClasses from "./pages/admin/AdminClasses.jsx";
import AdminClassDetail from "./pages/admin/AdminClassDetail.jsx";
import AdminTeachers from "./pages/admin/AdminTeachers.jsx";
import AdminTeacherDetail from "./pages/admin/AdminTeacherDetail.jsx";
import AdminPredictionsStats from "./pages/admin/AdminPredictionsStats.jsx";
import AdminAccounts from "./pages/admin/AdminAccounts.jsx";
import AdminAlerts from "./pages/admin/AdminAlerts.jsx";
import AdminReclamations from "./pages/admin/AdminReclamations.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
      <Route path="/compte-desactive" element={<AccountDisabled />} />

      {/* Etudiant */}
      <Route path="/etudiant" element={<ProtectedRoute roles={["etudiant"]}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/etudiant/reclamations" element={<ProtectedRoute roles={["etudiant"]}><StudentReclamations /></ProtectedRoute>} />

      {/* Enseignant */}
      <Route path="/enseignant" element={<ProtectedRoute roles={["enseignant"]}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/enseignant/appel" element={<ProtectedRoute roles={["enseignant"]}><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/enseignant/notes" element={<ProtectedRoute roles={["enseignant"]}><TeacherGrades /></ProtectedRoute>} />

      {/* Administrateur */}
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminOverview /></ProtectedRoute>} />
      <Route path="/admin/etudiants" element={<ProtectedRoute roles={["admin"]}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/etudiants/:id" element={<ProtectedRoute roles={["admin"]}><AdminStudentDetail /></ProtectedRoute>} />
      <Route path="/admin/classes" element={<ProtectedRoute roles={["admin"]}><AdminClasses /></ProtectedRoute>} />
      <Route path="/admin/classes/:id" element={<ProtectedRoute roles={["admin"]}><AdminClassDetail /></ProtectedRoute>} />
      <Route path="/admin/enseignants" element={<ProtectedRoute roles={["admin"]}><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/enseignants/:id" element={<ProtectedRoute roles={["admin"]}><AdminTeacherDetail /></ProtectedRoute>} />
      <Route path="/admin/predictions" element={<ProtectedRoute roles={["admin"]}><AdminPredictionsStats /></ProtectedRoute>} />
      <Route path="/admin/comptes" element={<ProtectedRoute roles={["admin"]}><AdminAccounts /></ProtectedRoute>} />
      <Route path="/admin/alertes" element={<ProtectedRoute roles={["admin"]}><AdminAlerts /></ProtectedRoute>} />
      <Route path="/admin/reclamations" element={<ProtectedRoute roles={["admin"]}><AdminReclamations /></ProtectedRoute>} />
      <Route path="/admin/rapports" element={<ProtectedRoute roles={["admin"]}><AdminReports /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
