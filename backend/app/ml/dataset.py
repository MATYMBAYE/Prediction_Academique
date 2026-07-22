"""
Generation d'un jeu de donnees synthetique realiste pour entrainer le modele
de prediction de reussite/echec (PRD §12 - risque : donnees historiques
insuffisantes -> on simule un jeu de donnees plausible pour amorcer le modele,
a remplacer par de vraies donnees ISI-SUPETCH des que disponibles).

Logique de simulation : la reussite depend principalement de la moyenne
generale et du taux d'assiduite, avec un peu de bruit aleatoire pour rester
realiste (deux etudiants avec un profil proche peuvent avoir une issue
differente).
"""
import numpy as np
import pandas as pd

RANDOM_SEED = 42


def generate_synthetic_dataset(n_samples: int = 1500) -> pd.DataFrame:
    """Simule une population d'etudiants a partir d'une variable latente de
    reussite (profil academique global), dont derivent des notes, un taux
    d'assiduite et des absences correles - comme observe en pratique
    (un etudiant assidu et serieux a en general de meilleures notes, un
    peu de bruit individuel restant realiste).
    """
    rng = np.random.default_rng(RANDOM_SEED)

    # Profil latent de reussite (0 = grande difficulte, 1 = tres bon profil)
    latent = rng.beta(2.2, 2.2, n_samples)

    moyenne_generale = np.clip(3.5 + latent * 15 + rng.normal(0, 1.6, n_samples), 0, 20)
    taux_assiduite = np.clip(28 + latent * 68 + rng.normal(0, 7, n_samples), 0, 100)
    nb_absences_non_justifiees = np.clip(
        (1 - latent) * 26 + rng.normal(0, 3.5, n_samples), 0, 40
    ).round().astype(int)
    ecart_type_notes = np.clip(5.2 - latent * 3.4 + rng.normal(0, 0.9, n_samples), 0.2, 8)

    probabilite_reussite = np.clip(latent + rng.normal(0, 0.06, n_samples), 0.02, 0.98)
    reussite = (rng.random(n_samples) < probabilite_reussite).astype(int)

    df = pd.DataFrame(
        {
            "moyenne_generale": moyenne_generale.round(2),
            "taux_assiduite": taux_assiduite.round(2),
            "nb_absences_non_justifiees": nb_absences_non_justifiees,
            "ecart_type_notes": ecart_type_notes.round(2),
            "reussite": reussite,
        }
    )
    return df


FEATURE_COLUMNS = [
    "moyenne_generale",
    "taux_assiduite",
    "nb_absences_non_justifiees",
    "ecart_type_notes",
]
