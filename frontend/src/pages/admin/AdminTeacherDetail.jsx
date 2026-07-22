import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import { AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";

export default function AdminTeacherDetail() {
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => client.get(`/admin/teachers/${id}`).then(({ data }) => setTeacher(data));

  const toggleStatus = async (motif) => {
    const nouveauStatut = teacher.statut_compte === "actif" ? "inactif" : "actif";
    await client.post(`/admin/accounts/${teacher.user_id}/toggle-status`, {
      statut: nouveauStatut,
      motif,
    });
    setModalOpen(false);
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!teacher) {
    return (
      <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
        <p className="text-encre-nocturne/60">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <Link to="/admin/enseignants" className="text-sm text-indigo-trajectoire hover:underline">
        &larr; Retour a la liste
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-encre-nocturne">
            {teacher.prenom} {teacher.nom}
          </h1>
          <p className="text-sm text-encre-nocturne/60">
            Identifiant : {teacher.identifiant} {teacher.email && `· Email : ${teacher.email}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AccountStatusBadge status={teacher.statut_compte} />
          <Button
            variant={teacher.statut_compte === "actif" ? "destructive" : "primary"}
            onClick={() => setModalOpen(true)}
          >
            {teacher.statut_compte === "actif" ? "Desactiver le compte" : "Activer le compte"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <Card title="Affectations">
          {teacher.affectations && teacher.affectations.length > 0 ? (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                    <th className="py-2 font-medium">Classe</th>
                    <th className="py-2 font-medium">Matiere</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-encre-nocturne/10">
                  {teacher.affectations.map((a, i) => (
                    <tr key={i}>
                      <td className="py-2">{a.classe}</td>
                      <td className="py-2">{a.matiere}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-encre-nocturne/60">Aucune affectation pour cet enseignant.</p>
          )}
        </Card>
      </div>

      <ConfirmModal
        open={modalOpen}
        title={teacher.statut_compte === "actif" ? "Desactiver ce compte ?" : "Activer ce compte ?"}
        description={
          teacher.statut_compte === "actif"
            ? "L'enseignant ne pourra plus se connecter a l'application tant que le compte reste desactive."
            : "L'enseignant retrouvera l'acces a son tableau de bord."
        }
        requireMotif={teacher.statut_compte === "actif"}
        motifOptions={["Fin de contrat / Depart", "Suspension disciplinaire", "Autre motif"]}
        confirmLabel={teacher.statut_compte === "actif" ? "Desactiver" : "Activer"}
        variant={teacher.statut_compte === "actif" ? "destructive" : "primary"}
        onConfirm={toggleStatus}
        onCancel={() => setModalOpen(false)}
      />
    </DashboardLayout>
  );
}
