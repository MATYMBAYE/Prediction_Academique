"""
Generation du jeu de donnees d'entrainement.

--------------------------------------------------------------------------
POURQUOI DES DONNEES SIMULEES ?
--------------------------------------------------------------------------
ISI-SUPETCH ne dispose pas encore d'un historique numerise exploitable
(plusieurs annees de notes + assiduite + resultat final par etudiant). Le
modele est donc amorce sur une population simulee, puis reentraine sur les
donnees reelles des qu'un volume suffisant est collecte (cf. train_model.py,
fonction `train_from_records`). C'est la demarche standard du "cold start".

--------------------------------------------------------------------------
CE QUI REND CETTE SIMULATION DEFENDABLE
--------------------------------------------------------------------------
Une erreur frequente est de simuler directement `reussite = f(moyenne)`. Le
modele apprend alors une regle triviale que l'on pourrait ecrire en une
ligne de code, et l'apprentissage automatique perd toute justification.

Ici la simulation reproduit le vrai probleme metier : PREDIRE TOT.

  1. Chaque etudiant possede deux traits latents non observables :
       - aptitude   : capacite academique
       - engagement : regularite, motivation

  2. Ces traits generent une ANNEE COMPLETE : 12 evaluations et 40 seances.
     L'engagement se degrade ou se renforce au fil de l'annee (derive), ce
     qui cree des decrocheurs tardifs et des redressements.

  3. Le resultat final suit le reglement pedagogique reel :
       moyenne annuelle >= 10  ET  assiduite annuelle >= 60 %
     avec une part d'alea (maladie, examen rate, jury bienveillant).

  4. MAIS le modele n'observe que les PREMIERES evaluations (entre 3 et 8
     sur 12) et les premieres seances. Il doit donc extrapoler une
     trajectoire a partir d'un signal partiel et bruite.

C'est exactement l'usage vise : detecter l'etudiant en difficulte en cours
de semestre, quand il est encore possible d'agir.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.ml.features import FEATURE_COLUMNS, build_features

RANDOM_SEED = 42

# Parametres du cursus simule
NB_EVALUATIONS_ANNEE = 12
NB_SEANCES_ANNEE = 40
MIN_EVAL_OBSERVEES = 3
MAX_EVAL_OBSERVEES = 8

# Reglement pedagogique applique au resultat final
SEUIL_MOYENNE_VALIDATION = 10.0
SEUIL_ASSIDUITE_VALIDATION = 60.0


def _simuler_un_etudiant(rng: np.random.Generator) -> dict:
    """Simule la trajectoire annuelle complete d'un etudiant, puis n'en
    revele qu'une partie au modele."""

    # --- Traits latents ---------------------------------------------------
    # Correles positivement : un etudiant engage travaille davantage et
    # progresse, ce qui est le cas dans les donnees reelles.
    aptitude = rng.beta(2.4, 2.4)
    engagement = np.clip(0.6 * aptitude + 0.4 * rng.beta(2.2, 2.2), 0.0, 1.0)

    # Derive d'engagement sur l'annee : positive = redressement,
    # negative = decrochage progressif.
    derive = rng.normal(0.0, 0.22)

    # --- Annee complete ---------------------------------------------------
    notes_annee = []
    for i in range(NB_EVALUATIONS_ANNEE):
        avancement = i / (NB_EVALUATIONS_ANNEE - 1)
        engagement_t = np.clip(engagement + derive * avancement, 0.05, 1.0)

        # La note depend de l'aptitude (socle) et de l'engagement du moment.
        # Le bruit individuel (2.2) reste important : une evaluation isolee
        # n'est jamais un verdict.
        niveau = 3.0 + 11.0 * aptitude + 5.0 * engagement_t
        note = np.clip(niveau + rng.normal(0.0, 2.2), 0.0, 20.0)
        notes_annee.append(float(note))

    presences_annee = []
    for i in range(NB_SEANCES_ANNEE):
        avancement = i / (NB_SEANCES_ANNEE - 1)
        engagement_t = np.clip(engagement + derive * avancement, 0.05, 1.0)
        proba_presence = np.clip(0.35 + 0.62 * engagement_t, 0.05, 0.99)
        presences_annee.append(int(rng.random() < proba_presence))

    # --- Resultat final (la verite terrain a predire) ---------------------
    moyenne_annuelle = float(np.mean(notes_annee))
    assiduite_annuelle = float(np.mean(presences_annee) * 100.0)

    valide = (
        moyenne_annuelle >= SEUIL_MOYENNE_VALIDATION
        and assiduite_annuelle >= SEUIL_ASSIDUITE_VALIDATION
    )

    # Alea de jury / circonstances : ~7 % des issues s'ecartent de la regle.
    # Sans ce bruit le probleme serait deterministe et le modele
    # sur-apprendrait une frontiere artificiellement nette.
    if rng.random() < 0.07:
        valide = not valide

    # --- Observation partielle (ce que voit le modele) --------------------
    nb_obs = int(rng.integers(MIN_EVAL_OBSERVEES, MAX_EVAL_OBSERVEES + 1))
    ratio_observe = nb_obs / NB_EVALUATIONS_ANNEE
    nb_seances_obs = max(4, int(NB_SEANCES_ANNEE * ratio_observe))

    notes_observees = notes_annee[:nb_obs]
    presences_observees = presences_annee[:nb_seances_obs]

    # Le "semestre recent" correspond aux 40 % de notes les plus fraiches.
    coupe = max(1, int(nb_obs * 0.6))
    notes_recentes = notes_observees[coupe:] or notes_observees[-1:]

    features = build_features(
        notes_chronologiques=notes_observees,
        notes_recentes=notes_recentes,
        seances_totales=len(presences_observees),
        seances_presentes=int(sum(presences_observees)),
    )
    features["reussite"] = int(valide)
    return features


def generate_synthetic_dataset(n_samples: int = 4000, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Genere `n_samples` etudiants simules avec leur issue annuelle."""
    rng = np.random.default_rng(seed)
    lignes = [_simuler_un_etudiant(rng) for _ in range(n_samples)]
    df = pd.DataFrame(lignes)
    return df[FEATURE_COLUMNS + ["nb_evaluations", "reussite"]]


def describe_dataset(df: pd.DataFrame) -> dict:
    """Statistiques descriptives utilisees dans le memoire et l'ecran
    'Performance du modele' de l'application."""
    return {
        "n_echantillons": int(len(df)),
        "taux_reussite": round(float(df["reussite"].mean()), 4),
        "taux_echec": round(float(1 - df["reussite"].mean()), 4),
        "moyenne_generale_moy": round(float(df["moyenne_generale"].mean()), 2),
        "taux_assiduite_moy": round(float(df["taux_assiduite"].mean()), 2),
        "nb_evaluations_moy": round(float(df["nb_evaluations"].mean()), 2),
    }


if __name__ == "__main__":
    import json

    data = generate_synthetic_dataset()
    print(json.dumps(describe_dataset(data), indent=2, ensure_ascii=False))
    print(data.head(10).to_string())
