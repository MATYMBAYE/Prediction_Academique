import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { TEACHER_NAV_ITEMS } from "./teacherNav.js";

export default function TeacherDashboard() {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    client.get("/teacher/me/classes").then(({ data }) => setAssignments(data));
  }, []);

  return (
    <DashboardLayout title="Espace Enseignant" navItems={TEACHER_NAV_ITEMS}>
      <h1 className="font-display text-xl font-semibold text-encre-nocturne">Mes classes</h1>
      <p className="mt-1 text-sm text-encre-nocturne/60">
        Faites l'appel de presence ou saisissez des notes pour vos matieres affectees.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((a) => (
          <Card key={a.id} title={a.classe}>
            <p className="text-sm text-encre-nocturne/70">{a.matiere}</p>
            <p className="text-xs text-encre-nocturne/50">Niveau {a.niveau}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link to={`/enseignant/appel?classe=${a.classe_id}&matiere=${encodeURIComponent(a.matiere)}&niveau=${a.niveau}`}>
                <Button variant="secondary" className="w-full">Faire l'appel</Button>
              </Link>
              <Link to={`/enseignant/notes?classe=${a.classe_id}&matiere=${encodeURIComponent(a.matiere)}&niveau=${a.niveau}`}>
                <Button variant="secondary" className="w-full">Saisir des notes</Button>
              </Link>
            </div>
          </Card>
        ))}
        {assignments.length === 0 && (
          <p className="text-encre-nocturne/50">Aucune classe ne vous est affectee pour le moment.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
