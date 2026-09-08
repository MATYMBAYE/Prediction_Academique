"""
Ingenierie des variables (feature engineering) du moteur de prediction.

Ce module est le SEUL endroit ou l'on definit ce que "voit" le modele.
Il est utilise a deux moments :

  1. A l'entrainement  -> sur les donnees simulees (app/ml/dataset.py)
  2. A l'inference     -> sur les donnees reelles d'un etudiant (app/services.py)

Garder une definition unique evite le "training/serving skew" : le decalage
silencieux entre les variables apprises et les variables calculees en
production, qui est la premiere cause de degradation des modeles deployes.

--------------------------------------------------------------------------
LES 7 VARIABLES PREDICTIVES
--------------------------------------------------------------------------
  moyenne_generale     Moyenne de toutes les notes connues (/20)
  moyenne_recente      Moyenne des notes du semestre le plus recent (/20)
  taux_assiduite       Pourcentage de presence aux seances (0-100)
  ecart_type_notes     Regularite des resultats (faible = regulier)
  taux_notes_faibles   Proportion de notes < 10 (0-1)
  tendance             Pente de la droite de regression des notes dans le
                       temps : > 0 progression, < 0 decrochage
  nb_absences          Nombre absolu de seances manquees

`nb_evaluations` n'est PAS une variable predictive : le volume de donnees ne
dit rien du niveau de l'etudiant. Il sert uniquement a moduler l'INDICE DE
CONFIANCE (cf. app/ml/predict.py) : predire sur 2 notes est moins fiable que
sur 20.
"""
from __future__ import annotations

import math
import statistics

# Ordre canonique des colonnes. Toute modification ici impose un
# reentrainement complet du modele (python -m app.ml.train_model).
FEATURE_COLUMNS = [
    "moyenne_generale",
    "moyenne_recente",
    "taux_assiduite",
    "ecart_type_notes",
    "taux_notes_faibles",
    "tendance",
    "nb_absences",
]

# Libelles lisibles utilises dans les explications rendues a l'utilisateur.
FEATURE_LABELS = {
    "moyenne_generale": "Moyenne generale",
    "moyenne_recente": "Moyenne du dernier semestre",
    "taux_assiduite": "Taux d'assiduite",
    "ecart_type_notes": "Regularite des notes",
    "taux_notes_faibles": "Part de notes sous la moyenne",
    "tendance": "Dynamique de progression",
    "nb_absences": "Nombre d'absences",
}

# Valeurs de reference d'un etudiant "median" de l'etablissement. Elles
# servent de point de comparaison pour l'explication locale (cf. explain.py) :
# "par rapport a un etudiant moyen, cette variable pousse le score vers le
# haut ou vers le bas".
REFERENCE_PROFILE = {
    "moyenne_generale": 11.0,
    "moyenne_recente": 11.0,
    "taux_assiduite": 78.0,
    "ecart_type_notes": 3.0,
    "taux_notes_faibles": 0.35,
    "tendance": 0.0,
    "nb_absences": 8.0,
}

# Bornes physiques de chaque variable : tout ce qui entre dans le modele est
# borne, ce qui protege des valeurs aberrantes issues d'une saisie erronee.
FEATURE_BOUNDS = {
    "moyenne_generale": (0.0, 20.0),
    "moyenne_recente": (0.0, 20.0),
    "taux_assiduite": (0.0, 100.0),
    "ecart_type_notes": (0.0, 10.0),
    "taux_notes_faibles": (0.0, 1.0),
    "tendance": (-5.0, 5.0),
    "nb_absences": (0.0, 60.0),
}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _linear_trend(values: list[float]) -> float:
    """Pente de la droite des moindres carres sur une serie de notes.

    Les notes sont indexees par leur rang chronologique (0, 1, 2, ...) plutot
    que par leur date reelle : cela evite qu'une longue pause entre deux
    evaluations n'ecrase artificiellement la pente, et rend la valeur
    directement lisible ("l'etudiant gagne X points par evaluation").

    Retourne 0.0 si moins de 3 notes : une tendance sur 2 points n'a aucune
    valeur statistique et produirait un signal purement bruite.
    """
    n = len(values)
    if n < 3:
        return 0.0

    mean_x = (n - 1) / 2
    mean_y = sum(values) / n

    numerator = sum((i - mean_x) * (v - mean_y) for i, v in enumerate(values))
    denominator = sum((i - mean_x) ** 2 for i in range(n))
    if denominator == 0:
        return 0.0

    return numerator / denominator


def build_features(
    notes_chronologiques: list[float],
    notes_recentes: list[float] | None = None,
    seances_totales: int = 0,
    seances_presentes: int = 0,
) -> dict:
    """Construit le vecteur de variables d'un etudiant.

    Args:
        notes_chronologiques: toutes les notes, TRIEES de la plus ancienne a
            la plus recente (l'ordre porte l'information de tendance).
        notes_recentes: notes du semestre le plus recent. Si None, on
            retombe sur l'ensemble des notes.
        seances_totales: nombre de seances ou l'etudiant etait attendu.
        seances_presentes: nombre de seances ou il etait present.

    Returns:
        dict {nom_variable: valeur} + la cle technique `nb_evaluations`.
    """
    notes = [float(n) for n in notes_chronologiques if n is not None]
    recentes = [float(n) for n in (notes_recentes or notes) if n is not None]

    if notes:
        moyenne_generale = statistics.fmean(notes)
        ecart_type = statistics.pstdev(notes) if len(notes) > 1 else 0.0
        taux_faibles = sum(1 for n in notes if n < 10) / len(notes)
        tendance = _linear_trend(notes)
    else:
        # Aucune note : on part du profil median plutot que de zeros, qui
        # seraient interpretes par le modele comme "0/20 partout".
        moyenne_generale = REFERENCE_PROFILE["moyenne_generale"]
        ecart_type = REFERENCE_PROFILE["ecart_type_notes"]
        taux_faibles = REFERENCE_PROFILE["taux_notes_faibles"]
        tendance = 0.0

    moyenne_recente = statistics.fmean(recentes) if recentes else moyenne_generale

    if seances_totales > 0:
        taux_assiduite = seances_presentes / seances_totales * 100.0
        nb_absences = float(seances_totales - seances_presentes)
    else:
        taux_assiduite = REFERENCE_PROFILE["taux_assiduite"]
        nb_absences = REFERENCE_PROFILE["nb_absences"]

    raw = {
        "moyenne_generale": moyenne_generale,
        "moyenne_recente": moyenne_recente,
        "taux_assiduite": taux_assiduite,
        "ecart_type_notes": ecart_type,
        "taux_notes_faibles": taux_faibles,
        "tendance": tendance,
        "nb_absences": nb_absences,
    }

    features = {
        name: round(clamp(value, *FEATURE_BOUNDS[name]), 4)
        for name, value in raw.items()
    }
    features["nb_evaluations"] = len(notes)
    features["nb_seances"] = seances_totales
    return features


def to_vector(features: dict) -> list[float]:
    """Projette un dict de variables sur le vecteur ordonne attendu par le modele."""
    return [float(features[col]) for col in FEATURE_COLUMNS]


def format_feature_value(name: str, value: float) -> str:
    """Rend une valeur lisible pour l'interface (unites, arrondis)."""
    if name in ("moyenne_generale", "moyenne_recente"):
        return f"{value:.2f}/20"
    if name == "taux_assiduite":
        return f"{value:.1f}%"
    if name == "taux_notes_faibles":
        return f"{value * 100:.0f}%"
    if name == "nb_absences":
        return f"{int(round(value))} seance(s)"
    if name == "tendance":
        signe = "+" if value >= 0 else ""
        return f"{signe}{value:.2f} pt/evaluation"
    if name == "ecart_type_notes":
        return f"ecart-type {value:.2f}"
    if isinstance(value, float) and not math.isnan(value):
        return f"{value:.2f}"
    return str(value)
