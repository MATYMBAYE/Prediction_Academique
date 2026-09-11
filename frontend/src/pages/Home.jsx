import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import TrajectoryCurve from "../components/TrajectoryCurve.jsx";
import Icone from "../components/ui/Icons.jsx";
import photoGroupeEtudiants from "../assets/photo-groupe-etudiants.jpg";
import photoFacade from "../assets/photo-facade.jpg";
import photoRemiseDiplomes from "../assets/photo-remise-diplomes.jpg";

const FONCTIONNALITES = [
  {
    titre: "Gestion des etudiants",
    desc: "Fiches etudiants, filieres, niveaux (L1 a M2), historique par classe.",
    icone: Icone.Etudiants,
  },
  {
    titre: "Appel & assiduite",
    desc: "Appel de presence par cours, taux d'assiduite calcule automatiquement.",
    icone: Icone.Presence,
  },
  {
    titre: "Prediction academique",
    desc: "Modele de Machine Learning identifiant les etudiants a risque.",
    icone: Icone.Prediction,
  },
  {
    titre: "Alertes precoces",
    desc: "Notification automatique des qu'un seuil de risque est atteint.",
    icone: Icone.Alerte,
  },
  {
    titre: "Reclamations",
    desc: "Suivi des reclamations etudiantes jusqu'a leur resolution.",
    icone: Icone.Reclamations,
  },
  {
    titre: "Rapports & statistiques",
    desc: "Statistiques par filiere/niveau, exports PDF et CSV.",
    icone: Icone.Rapports,
  },
];

const ETAPES = [

  { n: 1, titre: "Saisie des donnees", desc: "Notes et assiduite enregistrees par l'etablissement." },
  { n: 2, titre: "Calcul de la prediction", desc: "Le modele ML evalue le niveau de risque de chaque etudiant." },
  { n: 3, titre: "Alerte & accompagnement", desc: "L'administration et l'etudiant (compte actif) sont informes, une intervention peut etre organisee." },
];

const demoTrajectoire = [
  { periode: "P1", note: 9 },
  { periode: "P2", note: 11 },
  { periode: "P3", note: 10.5 },
  { periode: "P4", note: 13 },
  { periode: "P5", note: 14.5 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-brume-academique">
      <header className="sticky top-0 z-20 border-b border-encre-nocturne/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <nav className="hidden gap-6 text-sm font-medium text-encre-nocturne md:flex">
            <a href="#fonctionnalites" className="hover:text-indigo-trajectoire">Fonctionnalites</a>
            <a href="#comment-ca-marche" className="hover:text-indigo-trajectoire">Comment ca marche</a>
            <a href="#contact" className="hover:text-indigo-trajectoire">Contact</a>
          </nav>
          <Link to="/connexion">
            <Button>Connexion</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-8">
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight text-encre-nocturne md:text-[40px]">
            Anticipez les difficultes academiques avant qu'il ne soit trop tard
          </h1>
          <p className="mt-4 text-base text-encre-nocturne/80">
            Notes et assiduite analysees par un modele de Machine Learning pour predire le risque
            d'echec et declencher une alerte precoce, au benefice de l'etudiant comme de l'etablissement.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/connexion">
              <Button>Accéder à la plateforme</Button>
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 tabular">
            <div>
              <dt className="text-xs uppercase tracking-wide text-encre-nocturne/60">Etudiants suivis</dt>
              <dd className="font-display text-xl font-semibold">40+</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-encre-nocturne/60">Precision du modele</dt>
              <dd className="font-display text-xl font-semibold">≈ 70 %</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-encre-nocturne/60">Alertes generees</dt>
              <dd className="font-display text-xl font-semibold">Automatiques</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Apercu
              </p>
              <h2 className="font-display text-base font-semibold text-encre-nocturne">
                Resultat de prediction
              </h2>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-trajectoire">
              <Icone.Prediction className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-ardoise-200 pt-5">
            <div>
              <p className="font-display text-4xl font-semibold text-encre-nocturne">
                82<span className="text-lg font-medium text-encre-nocturne/50">%</span>
              </p>
              <p className="mt-0.5 text-xs text-ardoise-500">Probabilite de reussite</p>
            </div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-sauge-reussite/10 px-3 py-1 text-sm font-medium text-sauge-reussite">
              <span className="h-2 w-2 rounded-full bg-sauge-reussite" /> Risque faible
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-ardoise-500">
              Evolution des notes sur le semestre
            </p>
            <TrajectoryCurve data={demoTrajectoire} dataKey="note" />
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="bg-degrade-encre py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Ce que propose la plateforme
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">
              Fonctionnalites
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Tout le necessaire pour suivre, comprendre et accompagner chaque etudiant, du
              premier cours jusqu'a la remise du diplome.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FONCTIONNALITES.map((f) => {
              const IconeFonctionnalite = f.icone;
              return (
                <div
                  key={f.titre}
                  className="group rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-subtile
                    transition-all duration-300 ease-douce hover:border-indigo-trajectoire hover:shadow-elevee"
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-trajectoire
                      transition-colors duration-300 group-hover:bg-indigo-trajectoire group-hover:text-white"
                  >
                    <IconeFonctionnalite className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-encre-nocturne">
                    {f.titre}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-encre-nocturne/70">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="font-display text-xl font-semibold text-encre-nocturne">Comment ca marche</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {ETAPES.map((e) => (
              <div key={e.n} className="rounded-card bg-white p-5 shadow-card">
                <span className="font-display text-xl font-semibold text-indigo-trajectoire">{e.n}</span>
                <h3 className="mt-2 font-display text-base font-semibold text-encre-nocturne">{e.titre}</h3>
                <p className="mt-1 text-sm text-encre-nocturne/70">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-encre-nocturne/10 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-semibold text-encre-nocturne">
              Former, accompagner, faire reussir
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-encre-nocturne/70">
              ISI SUPTECH forme ses etudiants en Genie Logiciel, Reseaux Informatiques et
              Finance &amp; Comptabilite, du L1 au M2. Cette plateforme prolonge cet
              accompagnement pedagogique en detectant tot les difficultes academiques, pour que
              chaque promotion puisse, elle aussi, celebrer sa reussite.
            </p>
          </div>

          {/* Mosaique : la photo de groupe (la plus nette et la plus vivante)
              domine l'espace ; la facade et la remise des diplomes viennent
              en complement, en plus petit format ou leur resolution plus
              modeste ne se remarque pas. */}
          <div className="mt-8 grid gap-3 sm:gap-4 md:h-[420px] md:grid-cols-3 md:grid-rows-2">
            <div className="aspect-video overflow-hidden rounded-card shadow-card md:aspect-auto md:col-span-2 md:row-span-2 md:h-full">
              <img
                src={photoGroupeEtudiants}
                alt="Etudiants de ISI SUPTECH devant l'etablissement"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="aspect-video overflow-hidden rounded-card shadow-card md:aspect-auto md:h-full">
              <img
                src={photoFacade}
                alt="Facade de l'etablissement ISI SUPTECH"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="aspect-video overflow-hidden rounded-card shadow-card md:aspect-auto md:h-full">
              <img
                src={photoRemiseDiplomes}
                alt="Remise des diplomes a ISI SUPTECH"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ Section Expérience Mobile / Smartphone */}
      <section className="bg-gradient-to-b from-white via-indigo-50/30 to-brume-academique py-20 border-t border-encre-nocturne/10 overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Colonne Texte & Arguments */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3.5 py-1 text-xs font-semibold text-indigo-800 border border-indigo-200">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                Accessible sur Smartphone & Ordinateur
              </div>

              <h2 className="font-display text-2xl font-bold text-encre-nocturne sm:text-3xl md:text-4xl leading-tight">
                Votre suivi académique, accessible partout et <span className="text-indigo-trajectoire">directement dans votre poche</span>
              </h2>

              <p className="text-base text-encre-nocturne/80 leading-relaxed">
                L'application a été entièrement optimisée pour offrir une expérience mobile fluide et intuitive.
                Chaque étudiant peut désormais suivre son parcours, anticiper ses difficultés et interagir avec ses enseignants en toute simplicité, où qu'il soit.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                    📱
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-encre-nocturne">Consultation nomade</h4>
                    <p className="text-xs text-encre-nocturne/70 mt-0.5">Accès instantané aux notes, absences et moyennes 24h/24.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                    🎯
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-encre-nocturne">Prédictions IA en direct</h4>
                    <p className="text-xs text-encre-nocturne/70 mt-0.5">Calcul immédiat du risque et probabilité de réussite en continu.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ambre-50 text-ambre-600 font-bold">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-encre-nocturne">Rattrapages & Soutien</h4>
                    <p className="text-xs text-encre-nocturne/70 mt-0.5">Formulez vos demandes et suivez les réponses en 1 clic.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                    🔒
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-encre-nocturne">Sécurité & Confidentialité</h4>
                    <p className="text-xs text-encre-nocturne/70 mt-0.5">Accès personnel chiffré et protection totale des données.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/connexion">
                  <Button className="flex items-center gap-2 shadow-card hover:shadow-elevee">
                    <span>Tester sur votre mobile</span>
                    <Icone.ChevronDroite className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Colonne Mockup Smartphone Réaliste */}
            <div className="lg:col-span-6 flex justify-center items-center">
              <div className="relative w-full max-w-[320px] rounded-[48px] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-2xl ring-1 ring-black/20">
                {/* Dynamic Island / Notch */}
                <div className="absolute left-1/2 top-4 h-4 w-28 -translate-x-1/2 rounded-full bg-black z-30 flex items-center justify-end pr-2">
                  <span className="h-2 w-2 rounded-full bg-slate-800/80" />
                </div>

                {/* Écran du smartphone avec Dashboard Étudiant */}
                <div className="relative h-[620px] w-full overflow-hidden rounded-[38px] bg-slate-900 text-white font-sans flex flex-col">
                  {/* Orbes décoratifs Liquid Glass */}
                  <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />
                  <div className="pointer-events-none absolute -right-10 top-40 h-40 w-40 rounded-full bg-sky-500/20 blur-2xl" />

                  {/* Barre d'état mobile */}
                  <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-white/70">
                    <span>09:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">5G</span>
                      <span className="h-2.5 w-4 rounded-sm border border-white/70 bg-white/90 inline-block" />
                    </div>
                  </div>

                  {/* Header de l'application dans le mobile */}
                  <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 font-black text-xs text-white shadow-sm">
                        ISI
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight text-white">ISI SUPTECH</div>
                        <div className="text-[10px] text-white/50">Espace Étudiant</div>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  </div>

                  {/* Contenu scrollable du Dashboard Étudiant */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {/* Profil rapide */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/60">Bonjour,</div>
                        <div className="text-sm font-bold text-white">Awa Diop 👋</div>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-200 border border-white/10">
                        GL - L1
                      </span>
                    </div>

                    {/* Carte Liquid Glass : Résultat de Prédiction Random Forest */}
                    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-3.5 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-white/70">Prédiction IA</span>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                          Risque Faible
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold text-white">88%</span>
                        <span className="text-[10px] text-white/60">probabilité de succès</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full w-[88%]" />
                      </div>
                    </div>

                    {/* Mini Cartes Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-md p-2.5">
                        <div className="text-[10px] text-white/60">Moyenne générale</div>
                        <div className="text-base font-bold text-white mt-0.5">14.8 <span className="text-[10px] text-white/50">/20</span></div>
                      </div>
                      <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-md p-2.5">
                        <div className="text-[10px] text-white/60">Assiduité</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">95%</div>
                      </div>
                    </div>

                    {/* Section Mes Rattrapages */}
                    <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-white">Mes Rattrapages</span>
                        <span className="text-[10px] text-indigo-300 font-medium">1 en cours</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 text-[11px]">
                        <div>
                          <div className="font-semibold text-white">Algorithmique</div>
                          <div className="text-[9px] text-white/50">Mercredi • Salle B204</div>
                        </div>
                        <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[9px] font-bold text-indigo-200">
                          Planifié
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barre de navigation basse du smartphone */}
                  <div className="border-t border-white/10 bg-slate-900/90 px-6 py-2 flex items-center justify-between text-white/50 text-[10px]">
                    <div className="flex flex-col items-center text-indigo-400 font-semibold">
                      <span>📊</span>
                      <span>Accueil</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>📝</span>
                      <span>Notes</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>📅</span>
                      <span>Rattrapages</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>👤</span>
                      <span>Profil</span>
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="pb-1 pt-0.5 flex justify-center">
                    <div className="h-1 w-24 rounded-full bg-white/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-encre-nocturne/10 bg-encre-nocturne py-10 text-white">

        <div className="mx-auto max-w-6xl px-4 md:px-8">

          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <Logo />
            <div className="text-sm text-white/70">
              <p>ISI DIEUPPEUL — Contact : contact@isi-supetch.sn</p>
              <p className="mt-1">© {new Date().getFullYear()} ISI-SUPETCH. Tous droits reserves.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
