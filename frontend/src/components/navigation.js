/**
 * Definition de la navigation, regroupee par role.
 */
import Icone from "./ui/Icons.jsx";

export function navigationAdmin(compteurs = {}) {
  return [
    {
      titre: "Pilotage",
      entrees: [
        { vers: "/admin", libelle: "Vue d'ensemble", icone: Icone.TableauBord, exact: true },
        { vers: "/admin/predictions", libelle: "Predictions", icone: Icone.Prediction },
        { vers: "/admin/modele", libelle: "Performance du modele", icone: Icone.Cible },
        {
          vers: "/admin/alertes",
          libelle: "Alertes",
          icone: Icone.Alerte,
          compteur: compteurs.alertes,
        },
        { vers: "/admin/rattrapages", libelle: "Rattrapages", icone: Icone.Presence },
        { vers: "/admin/rapports", libelle: "Rapports", icone: Icone.Rapports },
      ],
    },
    {
      titre: "Vie scolaire & Pédagogie",
      entrees: [
        { vers: "/admin/etudiants", libelle: "Etudiants", icone: Icone.Etudiants },
        { vers: "/admin/etudiants-risque", libelle: "Étudiants à risque", icone: Icone.Cible },
        { vers: "/admin/notes", libelle: "Saisie & Import des notes", icone: Icone.Notes },
        { vers: "/admin/enseignants", libelle: "Enseignants", icone: Icone.Enseignants },
        { vers: "/admin/classes", libelle: "Classes & filieres", icone: Icone.Classes },
      ],
    },
    {
      titre: "Structure & Gestion technique",
      entrees: [
        { vers: "/admin/affectations", libelle: "Affectations", icone: Icone.Presence },
        { vers: "/admin/audit-affectations", libelle: "Vérification & Audit", icone: Icone.Validation },
        { vers: "/admin/matieres", libelle: "Catalogue Matières", icone: Icone.Notes },
        { vers: "/admin/annees-academiques", libelle: "Années académiques", icone: Icone.Horloge },
      ],
    },
    {
      titre: "Administration système",
      entrees: [
        { vers: "/admin/comptes", libelle: "Comptes utilisateurs", icone: Icone.Comptes },
      ],
    },
  ];
}

export function navigationEnseignant(compteurs = {}) {
  return [
    {
      titre: "Mon espace",
      entrees: [
        {
          vers: "/enseignant",
          libelle: "Tableau de bord",
          icone: Icone.TableauBord,
          exact: true,
          compteur: compteurs.alertes,
        },
        {
          vers: "/enseignant/rattrapages",
          libelle: "Mes Rattrapages",
          icone: Icone.Presence,
          compteur: compteurs.rattrapages,
        },
      ],
    },
    {
      titre: "Saisie",
      entrees: [
        { vers: "/enseignant/appel", libelle: "Appel de presence", icone: Icone.Presence },
        { vers: "/enseignant/notes", libelle: "Saisie des notes", icone: Icone.Notes },
      ],
    },
    {
      titre: "Suivi",
      entrees: [
        {
          vers: "/enseignant/reclamations",
          libelle: "Reclamations",
          icone: Icone.Reclamations,
          compteur: compteurs.reclamations,
        },
      ],
    },
  ];
}

export function navigationEtudiant(compteurs = {}) {
  return [
    {
      titre: "Mon parcours",
      entrees: [
        { vers: "/etudiant", libelle: "Tableau de bord", icone: Icone.TableauBord, exact: true },
        {
          vers: "/etudiant/rattrapages",
          libelle: "Mes Rattrapages",
          icone: Icone.Presence,
          compteur: compteurs.rattrapages,
        },
      ],
    },
    {
      titre: "Suivi",
      entrees: [
        {
          vers: "/etudiant/alertes",
          libelle: "Alertes",
          icone: Icone.Alerte,
          compteur: compteurs.alertes,
        },
        {
          vers: "/etudiant/reclamations",
          libelle: "Mes reclamations",
          icone: Icone.Reclamations,
          compteur: compteurs.reclamations,
        },
      ],
    },
  ];
}

export function navigationAssistante(compteurs = {}) {
  return [
    {
      titre: "Pilotage pédagogique",
      entrees: [
        { vers: "/assistante", libelle: "Tableau de bord", icone: Icone.TableauBord, exact: true },
        { vers: "/assistante/etudiants-risque", libelle: "Étudiants à risque", icone: Icone.Cible },
        { vers: "/assistante/predictions", libelle: "Prédictions", icone: Icone.Prediction },
        {
          vers: "/assistante/alertes",
          libelle: "Alertes",
          icone: Icone.Alerte,
          compteur: compteurs.alertes,
        },
      ],
    },
    {
      titre: "Suivi des étudiants",
      entrees: [
        { vers: "/assistante/etudiants", libelle: "Suivi des étudiants", icone: Icone.Etudiants },
        { vers: "/assistante/notes", libelle: "Saisie des notes", icone: Icone.Notes },
      ],
    },
    {
      titre: "Structure académique",
      entrees: [
        { vers: "/assistante/classes", libelle: "Classes", icone: Icone.Classes },
        { vers: "/assistante/filieres", libelle: "Filières", icone: Icone.Classes },
        { vers: "/assistante/annees-academiques", libelle: "Années académiques", icone: Icone.Presence },
      ],
    },
  ];
}

export function navigationTechnicien(compteurs = {}) {
  return [
    {
      titre: "Gestion technique",
      entrees: [
        { vers: "/technicien", libelle: "Tableau de bord", icone: Icone.TableauBord, exact: true },
        { vers: "/technicien/affectations", libelle: "Affectations", icone: Icone.Presence },
        { vers: "/technicien/audit-affectations", libelle: "Vérification & Audit", icone: Icone.Cible },
      ],
    },
    {
      titre: "Référentiels académiques",
      entrees: [
        { vers: "/technicien/classes", libelle: "Classes", icone: Icone.Classes },
        { vers: "/technicien/filieres", libelle: "Filières", icone: Icone.Classes },
        { vers: "/technicien/niveaux", libelle: "Niveaux", icone: Icone.TableauBord },
        { vers: "/technicien/matieres", libelle: "Matières", icone: Icone.Notes },
        { vers: "/technicien/enseignants", libelle: "Enseignants", icone: Icone.Enseignants },
      ],
    },
  ];
}
