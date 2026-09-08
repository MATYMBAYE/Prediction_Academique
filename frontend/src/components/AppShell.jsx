/**
 * Coque applicative : barre laterale + en-tete + zone de contenu.
 *
 * Remplace `DashboardLayout`. Ameliorations par rapport a l'existant :
 *   - barre laterale repliable, dont l'etat survit au rechargement
 *   - navigation groupee par sections plutot qu'une liste plate
 *   - pastilles de comptage sur les entrees (alertes, reclamations)
 *   - en-tete avec fil d'ariane et menu utilisateur
 *   - tiroir mobile avec fond assombri et fermeture au clavier
 */
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client.js";
import Logo from "./Logo.jsx";
import filigraneSuptech from "../assets/filigrane-suptech.png";
import Icone from "./ui/Icons.jsx";
import { Badge, Bouton } from "./ui/Primitives.jsx";
import ModaleMiseAJourEmail from "./ModaleMiseAJourEmail.jsx";
import {
  navigationAdmin,
  navigationAssistante,
  navigationEnseignant,
  navigationEtudiant,
  navigationTechnicien,
} from "./navigation.js";

const CLE_STOCKAGE_BARRE = "barre_laterale_reduite";

export default function CoqueApplication({
  titre,
  sousTitre,
  sectionsNavigation,
  actions,
  children,
}) {
  const { user, logout } = useAuth();
  const emplacement = useLocation();

  const [modaleEmailOuverte, setModaleEmailOuverte] = useState(false);

  const emailValide = Boolean(
    user?.email && user.email.toLowerCase().endsWith("@groupeisi.com") && user.email_verifie
  );

  // Les pastilles de comptage (alertes non lues, reclamations en attente
  // d'une reponse ou d'un traitement...) doivent rester exactes quel que
  // soit l'ecran ouvert, pas seulement le tableau de bord : rechargees a
  // chaque changement de page. Cle par chemin de menu plutot qu'un champ
  // par pastille : ajouter une source ne demande qu'une ligne ci-dessous.
  const [compteurs, setCompteurs] = useState({});

  useEffect(() => {
    const sources = {
      etudiant: [
        { vers: "/etudiant/alertes", url: "/student/alertes/compteur", champ: "non_lues" },
        { vers: "/etudiant/reclamations", url: "/student/reclamations/compteur", champ: "non_lues" },
        { vers: "/etudiant/rattrapages", url: "/student/rattrapages/compteur", champ: "mises_a_jour" },
      ],
      enseignant: [
        { vers: "/enseignant/reclamations", url: "/teacher/reclamations/compteur", champ: "nouvelles" },
        { vers: "/enseignant/rattrapages", url: "/teacher/rattrapages/compteur", champ: "en_attente" },
      ],
    }[user?.role];

    if (!sources) return;
    let annule = false;

    Promise.allSettled(sources.map((source) => client.get(source.url))).then((resultats) => {
      if (annule) return;
      const suivant = {};
      resultats.forEach((resultat, index) => {
        if (resultat.status === "fulfilled") {
          suivant[sources[index].vers] = resultat.value.data[sources[index].champ] ?? 0;
        }
      });
      setCompteurs(suivant);
    });

    return () => {
      annule = true;
    };
  }, [user?.role, emplacement.pathname]);

  const sectionsSource = (() => {
    // Si l'utilisateur est admin ou navigue dans l'espace /admin, forcer la navigation Admin
    if (user?.role === "admin" || emplacement.pathname.startsWith("/admin")) {
      return navigationAdmin(compteurs);
    }
    if (sectionsNavigation && sectionsNavigation.length > 0) {
      return sectionsNavigation;
    }
    if (user?.role === "assistante_pedagogique" || emplacement.pathname.startsWith("/assistante")) {
      return navigationAssistante(compteurs);
    }
    if (user?.role === "technicien" || emplacement.pathname.startsWith("/technicien")) {
      return navigationTechnicien(compteurs);
    }
    if (user?.role === "enseignant" || emplacement.pathname.startsWith("/enseignant")) {
      return navigationEnseignant(compteurs);
    }
    return navigationEtudiant(compteurs);
  })();

  const sectionsAffichees = sectionsSource.map((section) => ({
    ...section,
    entrees: section.entrees.map((entree) =>
      entree.vers in compteurs ? { ...entree, compteur: compteurs[entree.vers] } : entree
    ),
  }));

  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const [reduite, setReduite] = useState(() => {
    // La preference de repli est conservee : un utilisateur qui travaille sur
    // un petit ecran ne doit pas la redefinir a chaque connexion.
    try {
      return localStorage.getItem(CLE_STOCKAGE_BARRE) === "1";
    } catch {
      return false;
    }
  });
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE_BARRE, reduite ? "1" : "0");
    } catch {
      /* mode navigation privee : on ignore silencieusement */
    }
  }, [reduite]);

  // Le tiroir mobile se referme a chaque changement de page, sinon il reste
  // ouvert par-dessus l'ecran que l'on vient d'ouvrir.
  useEffect(() => {
    setTiroirOuvert(false);
    setMenuOuvert(false);
  }, [emplacement.pathname]);

  useEffect(() => {
    function surTouche(evenement) {
      if (evenement.key === "Escape") {
        setTiroirOuvert(false);
        setMenuOuvert(false);
      }
    }
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, []);

  const nomAffiche =
    user?.role === "admin"
      ? "Administration"
      : user?.role === "assistante_pedagogique"
      ? "Assistante pédagogique"
      : user?.role === "technicien"
      ? "Technicien"
      : `${user?.student?.prenom ?? user?.teacher?.prenom ?? ""} ${
          user?.student?.nom ?? user?.teacher?.nom ?? ""
        }`.trim() || user?.identifiant;

  const roleAffiche = {
    admin: "Administrateur",
    enseignant: "Enseignant",
    etudiant: "Étudiant",
    assistante_pedagogique: "Assistante pédagogique",
    technicien: "Technicien",
  }[user?.role] || user?.role;

  const initiales = (nomAffiche ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="min-h-screen bg-ardoise-100"
      style={{
        // Filigrane pose en CSS background-image plutot qu'en <img> superpose :
        // un background peint TOUJOURS derriere le contenu de son propre
        // element, sans le moindre jonglage de z-index ou de contexte
        // d'empilement (contrairement a la tentative precedente, qui
        // dependait d'un `isolate` + z-index negatif fragiles).
        // L'opacite est deja integree dans le PNG (§assets), donc aucune
        // classe opacity- n'est necessaire ici.
        backgroundImage: `url(${filigraneSuptech})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right bottom",
        backgroundSize: "clamp(220px, 26vw, 420px)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ================================================== Barre laterale */}
      <aside
        className={`sans-impression fixed inset-y-0 left-0 z-40 flex flex-col
          bg-degrade-encre text-white transition-all duration-300 ease-douce
          ${reduite ? "w-[76px]" : "w-[264px]"}
          ${tiroirOuvert ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
          {reduite ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 backdrop-blur">
              <Icone.Etablissement className="h-5 w-5 text-white" />
            </span>
          ) : (
            <div className="flex min-w-0 items-center gap-3 animate-fondu-simple">
              {/* Fond clair indispensable : le logo (bleu/or) est illisible
                  directement sur le degrade sombre de la barre laterale. */}
              <span className="shrink-0 rounded-lg bg-white px-2 py-1.5 shadow-subtile">
                <Logo size={22} />
              </span>
              <div className="min-w-0 truncate text-2xs text-white/55">Prediction academique</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="defilement-fin flex-1 overflow-y-auto px-3 py-4">
          {sectionsAffichees.map((section) => (
            <div key={section.titre} className="mb-5 last:mb-0">
              {!reduite && section.titre && (
                <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-white/40">
                  {section.titre}
                </p>
              )}

              <ul className="space-y-0.5">
                {section.entrees.map((entree) => {
                  const IconeEntree = entree.icone;
                  return (
                    <li key={entree.vers}>
                      <NavLink
                        to={entree.vers}
                        end={entree.exact}
                        title={reduite ? entree.libelle : undefined}
                        className={({ isActive }) =>
                          `anneau-focus group relative flex items-center gap-3 rounded-lg
                          px-3 py-2.5 text-sm font-medium transition-all duration-150
                          ${
                            isActive
                              ? "bg-white/15 text-white shadow-subtile"
                              : "text-white/65 hover:bg-white/8 hover:text-white"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Repere vertical de la page active */}
                            {isActive && (
                              <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                            )}
                            <IconeEntree className="h-[18px] w-[18px] shrink-0" />

                            {!reduite && (
                              <>
                                <span className="flex-1 truncate">{entree.libelle}</span>
                                {entree.compteur > 0 && (
                                  <span
                                    className="tabulaire grid h-5 min-w-[20px] place-items-center rounded-full
                                      bg-brique-500 px-1.5 text-2xs font-semibold text-white"
                                  >
                                    {entree.compteur > 99 ? "99+" : entree.compteur}
                                  </span>
                                )}
                              </>
                            )}

                            {/* En mode reduit, la pastille devient un point */}
                            {reduite && entree.compteur > 0 && (
                              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brique-500 ring-2 ring-encre-800" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bouton de repli (masque sur mobile ou le tiroir remplace le repli) */}
        <div className="hidden shrink-0 border-t border-white/10 p-3 lg:block">
          <button
            onClick={() => setReduite((precedent) => !precedent)}
            className="anneau-focus flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm
              text-white/55 transition-colors hover:bg-white/8 hover:text-white"
            aria-label={reduite ? "Deplier le menu" : "Replier le menu"}
          >
            <Icone.ChevronGauche
              className={`h-[18px] w-[18px] shrink-0 transition-transform duration-300
                ${reduite ? "rotate-180" : ""}`}
            />
            {!reduite && <span>Replier le menu</span>}
          </button>
        </div>
      </aside>

      {/* Fond assombri du tiroir mobile */}
      {tiroirOuvert && (
        <button
          onClick={() => setTiroirOuvert(false)}
          aria-label="Fermer le menu"
          className="sans-impression fixed inset-0 z-30 animate-fondu-simple bg-encre-950/45 lg:hidden"
        />
      )}

      {/* ====================================================== Zone droite */}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-douce
          ${reduite ? "lg:pl-[76px]" : "lg:pl-[264px]"}`}
      >
        {/* En-tete */}
        <header className="sans-impression sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-ardoise-200 bg-white/85 px-4 backdrop-blur-md md:px-6">
          <button
            onClick={() => setTiroirOuvert(true)}
            aria-label="Ouvrir le menu"
            className="anneau-focus grid h-10 w-10 shrink-0 place-items-center rounded-lg
              text-encre-700 transition-colors hover:bg-ardoise-100 lg:hidden"
          >
            <Icone.Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Bouton de retour rapide vers le pilotage principal pour l'Administrateur */}
            {(user?.role === "admin" || emplacement.pathname.startsWith("/admin")) &&
              emplacement.pathname !== "/admin" && (
                <Link
                  to="/admin"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ardoise-200 bg-ardoise-50/90 px-2.5 py-1.5 text-xs font-semibold text-ardoise-700 shadow-sm transition hover:border-isi-bleu hover:bg-white hover:text-isi-bleu"
                  title="Revenir au tableau de bord / pilotage principal de l'Administrateur"
                >
                  <Icone.ChevronGauche className="h-3.5 w-3.5 text-isi-bleu" />
                  <span className="hidden sm:inline">Pilotage principal</span>
                  <span className="sm:hidden">Pilotage</span>
                </Link>
              )}

            {/* Bouton retour pour Assistante Pédagogique */}
            {user?.role === "assistante_pedagogique" &&
              emplacement.pathname.startsWith("/assistante") &&
              emplacement.pathname !== "/assistante" && (
                <Link
                  to="/assistante"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ardoise-200 bg-ardoise-50/90 px-2.5 py-1.5 text-xs font-semibold text-ardoise-700 shadow-sm transition hover:border-isi-bleu hover:bg-white hover:text-isi-bleu"
                  title="Revenir au tableau de bord pédagogique"
                >
                  <Icone.ChevronGauche className="h-3.5 w-3.5 text-isi-bleu" />
                  <span className="hidden sm:inline">Pilotage pédagogique</span>
                </Link>
              )}

            {/* Bouton retour pour Technicien */}
            {user?.role === "technicien" &&
              emplacement.pathname.startsWith("/technicien") &&
              emplacement.pathname !== "/technicien" && (
                <Link
                  to="/technicien"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ardoise-200 bg-ardoise-50/90 px-2.5 py-1.5 text-xs font-semibold text-ardoise-700 shadow-sm transition hover:border-isi-bleu hover:bg-white hover:text-isi-bleu"
                  title="Revenir au tableau de bord technique"
                >
                  <Icone.ChevronGauche className="h-3.5 w-3.5 text-isi-bleu" />
                  <span className="hidden sm:inline">Gestion technique</span>
                </Link>
              )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-base font-semibold text-encre-900">
                {titre}
              </h1>
              {sousTitre && (
                <p className="truncate text-xs text-ardoise-500">{sousTitre}</p>
              )}
            </div>
          </div>

          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}

          {/* Menu utilisateur */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOuvert((precedent) => !precedent)}
              aria-expanded={menuOuvert}
              aria-haspopup="menu"
              className="anneau-focus flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2
                transition-colors hover:bg-ardoise-100"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-encre-800 text-xs font-semibold text-white">
                {initiales}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[140px] truncate text-xs font-medium text-encre-900">
                  {nomAffiche}
                </span>
                <span className="block text-2xs text-ardoise-500">{roleAffiche}</span>
              </span>
              <Icone.ChevronBas
                className={`hidden h-4 w-4 text-ardoise-400 transition-transform duration-200 sm:block
                  ${menuOuvert ? "rotate-180" : ""}`}
              />
            </button>

            {menuOuvert && (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOuvert(false)}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-2 w-60 animate-fondu-montant
                    overflow-hidden rounded-xl border border-ardoise-200 bg-white shadow-elevee"
                >
                  <div className="border-b border-ardoise-200 px-4 py-3">
                    <p className="truncate text-sm font-medium text-encre-900">{nomAffiche}</p>
                    <p className="truncate text-xs text-ardoise-500">{user?.email || user?.identifiant}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge ton="encre">{roleAffiche}</Badge>
                      {!emailValide && (
                        <Badge ton="vigilance">E-mail non vérifié</Badge>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOuvert(false);
                      setModaleEmailOuverte(true);
                    }}
                    role="menuitem"
                    className="anneau-focus flex w-full items-center gap-2.5 px-4 py-2.5 text-sm
                      font-medium text-encre-800 transition-colors hover:bg-ardoise-100"
                  >
                    <Icone.Mail className="h-4 w-4 text-indigo-600" />
                    Changer d'adresse e-mail
                  </button>

                  <button
                    onClick={logout}
                    role="menuitem"
                    className="anneau-focus flex w-full items-center gap-2.5 border-t border-ardoise-100 px-4 py-3 text-sm
                      font-medium text-brique-600 transition-colors hover:bg-brique-50"
                  >
                    <Icone.Deconnexion className="h-4 w-4" />
                    Se deconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Bandeau d'avertissement e-mail non institutionnel */}
        {!emailValide && (
          <div className="sans-impression border-b border-vigilance-300 bg-vigilance-50 px-4 py-3.5 shadow-subtile sm:px-6">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 text-sm text-vigilance-900">
                <Icone.Alerte className="h-5 w-5 shrink-0 text-vigilance-600 mt-0.5" />
                <span>
                  Votre adresse e-mail n'est pas une adresse institutionnelle ISI-SUPTECH. Veuillez la mettre à jour avec une adresse se terminant par <strong>@groupeisi.com</strong> afin de continuer à utiliser les fonctionnalités nécessitant une vérification e-mail.
                </span>
              </div>
              <button
                onClick={() => setModaleEmailOuverte(true)}
                className="shrink-0 self-start sm:self-auto rounded-lg bg-vigilance-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-subtile hover:bg-vigilance-700 transition-colors"
              >
                Mettre à jour mon e-mail
              </button>
            </div>
          </div>
        )}

        {/* Contenu */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>

      <ModaleMiseAJourEmail
        ouverte={modaleEmailOuverte}
        onFermer={() => setModaleEmailOuverte(false)}
      />
    </div>
  );

}
