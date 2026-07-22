import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import TrajectoryCurve from "../components/TrajectoryCurve.jsx";

const FONCTIONNALITES = [
  { titre: "Gestion des etudiants", desc: "Fiches etudiants, filieres, niveaux (L1 a M2), historique par classe." },
  { titre: "Appel & assiduite", desc: "Appel de presence par cours, taux d'assiduite calcule automatiquement." },
  { titre: "Prediction academique", desc: "Modele de Machine Learning identifiant les etudiants a risque." },
  { titre: "Alertes precoces", desc: "Notification automatique des qu'un seuil de risque est atteint." },
  { titre: "Reclamations", desc: "Suivi des reclamations etudiantes jusqu'a leur resolution." },
  { titre: "Rapports & statistiques", desc: "Statistiques par filiere/niveau, exports PDF et CSV." },
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
              <Button>Acceder a mon espace</Button>
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

        <Card title="Apercu — Resultat de prediction">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sauge-reussite/10 px-3 py-1 text-sm font-medium text-sauge-reussite">
            <span className="h-2 w-2 rounded-full bg-sauge-reussite" /> Risque faible
          </div>
          <TrajectoryCurve data={demoTrajectoire} dataKey="note" />
          <p className="mt-2 text-xs text-encre-nocturne/60">Donnees fictives, a titre d'illustration.</p>
        </Card>
      </section>

      <section id="fonctionnalites" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="font-display text-xl font-semibold text-encre-nocturne">Fonctionnalites</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FONCTIONNALITES.map((f) => (
              <Card key={f.titre}>
                <h3 className="font-display text-base font-semibold text-encre-nocturne">{f.titre}</h3>
                <p className="mt-1 text-sm text-encre-nocturne/70">{f.desc}</p>
              </Card>
            ))}
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

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="font-display text-xl font-semibold text-encre-nocturne">Accedez a votre espace</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Card title="Etudiant">
              <p className="text-sm text-encre-nocturne/70">
                Consultez vos notes, votre assiduite et le resultat de votre prediction.
              </p>
              <Link to="/connexion" className="mt-4 inline-block">
                <Button variant="secondary">Connexion etudiant</Button>
              </Link>
            </Card>
            <Card title="Enseignant">
              <p className="text-sm text-encre-nocturne/70">
                Faites l'appel de vos classes et saisissez les notes de vos matieres.
              </p>
              <Link to="/connexion" className="mt-4 inline-block">
                <Button variant="secondary">Connexion enseignant</Button>
              </Link>
            </Card>
            <Card title="Administrateur">
              <p className="text-sm text-encre-nocturne/70">
                Gerez les etudiants, les classes, les comptes et suivez les alertes de risque.
              </p>
              <Link to="/connexion" className="mt-4 inline-block">
                <Button variant="secondary">Connexion administrateur</Button>
              </Link>
            </Card>
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
