"""
Module de prediction (PRD FR-05, FR-06). Charge le modele entraine et
calcule, a partir des notes et de l'assiduite d'un etudiant, la probabilite
de reussite ainsi qu'un niveau de risque (faible / moyen / eleve).
"""
import os
import statistics

import joblib
import pandas as pd

from app.ml.dataset import FEATURE_COLUMNS
from app.ml.train_model import train_and_evaluate, MODEL_PATH

_model = None


def _get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            _model, _ = train_and_evaluate()
        else:
            _model = joblib.load(MODEL_PATH)
    return _model


def niveau_risque_depuis_probabilite(probabilite_reussite: float, seuil_eleve: float, seuil_moyen: float) -> str:
    if probabilite_reussite < seuil_eleve:
        return "eleve"
    if probabilite_reussite < seuil_moyen:
        return "moyen"
    return "faible"


def build_features_from_history(notes: list, taux_assiduite_list: list) -> dict:
    """Construit les variables d'entree du modele a partir de l'historique brut."""
    notes = [float(n) for n in notes] if notes else [0.0]
    taux_list = [float(t) for t in taux_assiduite_list] if taux_assiduite_list else [0.0]

    moyenne_generale = round(statistics.mean(notes), 2)
    taux_assiduite = round(statistics.mean(taux_list), 2)
    nb_absences_non_justifiees = round((100 - taux_assiduite) / 100 * 20)
    ecart_type_notes = round(statistics.pstdev(notes), 2) if len(notes) > 1 else 1.5

    return {
        "moyenne_generale": moyenne_generale,
        "taux_assiduite": taux_assiduite,
        "nb_absences_non_justifiees": nb_absences_non_justifiees,
        "ecart_type_notes": ecart_type_notes,
    }


def predict_for_student(notes: list, taux_assiduite_list: list, seuil_eleve: float, seuil_moyen: float) -> dict:
    model = _get_model()
    features = build_features_from_history(notes, taux_assiduite_list)
    X = pd.DataFrame([[features[col] for col in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)

    probabilite_reussite = float(model.predict_proba(X)[0][1])
    niveau_risque = niveau_risque_depuis_probabilite(probabilite_reussite, seuil_eleve, seuil_moyen)

    return {
        "probabilite_reussite": round(probabilite_reussite, 4),
        "niveau_risque": niveau_risque,
        "moyenne_generale": features["moyenne_generale"],
        "taux_assiduite_moyen": features["taux_assiduite"],
    }
