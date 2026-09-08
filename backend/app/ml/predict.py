"""
Moteur d'inference : produit une prediction complete et exploitable.

Une prediction retournee par ce module contient quatre blocs :

  1. LES SCORES        probabilite de reussite, score de risque, niveau
  2. LA CONFIANCE      a quel point ce resultat est fiable, et pourquoi
  3. L'EXPLICATION     quels facteurs poussent le score vers le haut/bas
  4. LES ACTIONS       le plan d'accompagnement propose

--------------------------------------------------------------------------
L'INDICE DE CONFIANCE
--------------------------------------------------------------------------
Distinction essentielle et souvent negligee : la PROBABILITE et la CONFIANCE
mesurent deux choses differentes.

  Probabilite 50 %  ->  "cet etudiant a une chance sur deux de reussir"
  Confiance   50 %  ->  "je ne suis pas sur de mon estimation de 50 %"

Un etudiant peut avoir une probabilite de 50 % annoncee avec une confiance
tres elevee (son profil est reellement a la frontiere, le modele en est
certain) ou avec une confiance faible (le modele manque d'information).
Les deux situations appellent des reactions opposees : la premiere justifie
d'agir, la seconde de collecter plus de donnees avant de decider.

La confiance combine trois signaux independants :

  A. VOLUME DE DONNEES (poids 45 %)
     Predire sur 2 notes et 4 seances n'a pas la meme valeur que sur
     15 notes et 30 seances. C'est l'incertitude la plus determinante en
     pratique, d'ou son poids dominant.

  B. ACCORD DU MODELE (poids 35 %)
     La foret aleatoire contient 400 arbres qui votent. S'ils convergent,
     le profil ressemble a ceux vus a l'entrainement. S'ils divergent, le
     cas est atypique. On mesure l'ecart-type de leurs votes.

  C. DISTANCE AUX SEUILS (poids 20 %)
     Une probabilite de 0.44 classee "risque eleve" alors que le seuil est
     a 0.45 est fragile : un point de moyenne en plus change la
     categorie. Une probabilite de 0.10 est robuste.
"""
from __future__ import annotations

import os
import threading

import joblib
import numpy as np
import pandas as pd

from app.ml.explain import expliquer_prediction, resumer_explication
from app.ml.features import FEATURE_COLUMNS, build_features
from app.ml.recommendations import generer_recommandations

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")

# Volumes au-dela desquels le volume de donnees n'ameliore plus la confiance.
VOLUME_NOTES_SATURATION = 10
VOLUME_SEANCES_SATURATION = 25

_modele = None
_meta = None
_verrou = threading.Lock()


def _charger_modele():
    """Chargement paresseux et thread-safe du modele.

    Le verrou evite que deux requetes HTTP simultanees ne declenchent deux
    entrainements concurrents au premier demarrage du serveur.
    """
    global _modele, _meta
    if _modele is not None:
        return _modele, _meta

    with _verrou:
        if _modele is not None:
            return _modele, _meta

        if not os.path.exists(MODEL_PATH):
            from app.ml.train_model import train_and_evaluate

            train_and_evaluate(verbeux=False)

        artefact = joblib.load(MODEL_PATH)
        if isinstance(artefact, dict) and "modele" in artefact:
            _modele = artefact["modele"]
            _meta = artefact.get("meta", {})
        else:
            # Compatibilite avec un modele enregistre par l'ancienne version.
            _modele = artefact
            _meta = {}

    return _modele, _meta


def recharger_modele():
    """Force le rechargement apres un reentrainement (appele par l'API admin)."""
    global _modele, _meta
    with _verrou:
        _modele, _meta = None, None
    return _charger_modele()


def niveau_risque_depuis_probabilite(probabilite: float, seuil_eleve: float, seuil_moyen: float) -> str:
    if probabilite < seuil_eleve:
        return "eleve"
    if probabilite < seuil_moyen:
        return "moyen"
    return "faible"


def _accord_des_arbres(modele, vecteur: pd.DataFrame) -> float | None:
    """Ecart-type des votes des arbres, ramene sur [0, 1] (1 = accord total).

    Le modele est encapsule dans un CalibratedClassifierCV : il faut
    descendre jusqu'aux estimateurs de base pour acceder aux arbres.
    """
    try:
        # Les arbres individuels ont ete entraines sur un tableau numpy et
        # n'ont pas de noms de colonnes : passer le DataFrame directement
        # declencherait un avertissement sklearn a chaque appel.
        valeurs = vecteur.to_numpy()

        votes = []
        calibrateurs = getattr(modele, "calibrated_classifiers_", [])
        for calibrateur in calibrateurs:
            base = getattr(calibrateur, "estimator", None)
            arbres = getattr(base, "estimators_", None)
            if not arbres:
                continue
            for arbre in arbres:
                votes.append(float(arbre.predict_proba(valeurs)[0][1]))

        if len(votes) < 10:
            return None

        # Ecart-type maximal d'une variable bornee sur [0,1] : 0.5
        return float(np.clip(1.0 - (np.std(votes) / 0.5), 0.0, 1.0))
    except Exception:
        return None


def calculer_confiance(modele, vecteur: pd.DataFrame, features: dict, probabilite: float,
                       seuil_eleve: float, seuil_moyen: float) -> dict:
    """Combine les trois signaux d'incertitude en un indice unique 0-100."""

    # --- A. Volume de donnees --------------------------------------------
    nb_notes = features.get("nb_evaluations", 0)
    nb_seances = features.get("nb_seances", 0)
    score_notes = min(1.0, nb_notes / VOLUME_NOTES_SATURATION)
    score_seances = min(1.0, nb_seances / VOLUME_SEANCES_SATURATION)
    score_volume = 0.65 * score_notes + 0.35 * score_seances

    # --- B. Accord du modele ---------------------------------------------
    score_accord = _accord_des_arbres(modele, vecteur)
    accord_disponible = score_accord is not None
    if not accord_disponible:
        score_accord = 0.75  # valeur neutre si le modele n'est pas un ensemble

    # --- C. Distance aux seuils de decision ------------------------------
    distance = min(abs(probabilite - seuil_eleve), abs(probabilite - seuil_moyen))
    score_distance = min(1.0, distance / 0.15)

    confiance = 0.45 * score_volume + 0.35 * score_accord + 0.20 * score_distance
    confiance_pct = round(float(np.clip(confiance, 0.0, 1.0)) * 100, 1)

    if confiance_pct >= 70:
        niveau, message = "elevee", "La prediction repose sur des donnees suffisantes et un profil bien identifie."
    elif confiance_pct >= 45:
        niveau, message = "moyenne", "La prediction est indicative : elle doit etre croisee avec l'avis de l'equipe pedagogique."
    else:
        niveau, message = "faible", "Donnees insuffisantes ou profil atypique : ce resultat ne doit pas fonder de decision individuelle."

    facteurs = []
    if score_volume < 0.5:
        facteurs.append(
            f"Volume de donnees limite ({int(nb_notes)} note(s), {int(nb_seances)} seance(s) d'appel)"
        )
    if accord_disponible and score_accord < 0.6:
        facteurs.append("Profil atypique : les arbres du modele ne convergent pas")
    if score_distance < 0.4:
        facteurs.append("Score situe pres d'un seuil de decision : classement fragile")
    if not facteurs:
        facteurs.append("Donnees suffisantes et profil clairement identifie")

    return {
        "indice": confiance_pct,
        "niveau": niveau,
        "message": message,
        "facteurs": facteurs,
        "detail": {
            "volume_donnees": round(score_volume * 100, 1),
            "accord_modele": round(score_accord * 100, 1),
            "distance_seuil": round(score_distance * 100, 1),
        },
    }


def predire(
    notes_chronologiques: list,
    notes_recentes: list | None = None,
    seances_totales: int = 0,
    seances_presentes: int = 0,
    matieres_faibles: list | None = None,
    seuil_eleve: float = 0.45,
    seuil_moyen: float = 0.65,
    avec_explication: bool = True,
) -> dict:
    """Produit la prediction complete d'un etudiant.

    Returns:
        dict pret a etre serialise en JSON pour le frontend.
    """
    modele, meta = _charger_modele()

    features = build_features(
        notes_chronologiques=notes_chronologiques,
        notes_recentes=notes_recentes,
        seances_totales=seances_totales,
        seances_presentes=seances_presentes,
    )
    vecteur = pd.DataFrame([[features[c] for c in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)

    probabilite = float(modele.predict_proba(vecteur)[0][1])
    niveau_risque = niveau_risque_depuis_probabilite(probabilite, seuil_eleve, seuil_moyen)

    confiance = calculer_confiance(modele, vecteur, features, probabilite, seuil_eleve, seuil_moyen)

    resultat = {
        "probabilite_reussite": round(probabilite, 4),
        "score_reussite": round(probabilite * 100, 1),
        "score_risque": round((1 - probabilite) * 100, 1),
        "niveau_risque": niveau_risque,
        "confiance": confiance,
        "variables": {
            cle: features[cle]
            for cle in FEATURE_COLUMNS + ["nb_evaluations", "nb_seances"]
        },
        # Champs conserves pour la compatibilite avec l'existant
        "moyenne_generale": features["moyenne_generale"],
        "taux_assiduite_moyen": features["taux_assiduite"],
        "modele": {
            "algorithme": meta.get("algorithme_retenu", "Foret aleatoire"),
            "date_entrainement": meta.get("date_entrainement"),
            "source_donnees": meta.get("source_donnees"),
        },
    }

    if avec_explication:
        contributions = expliquer_prediction(modele, features, probabilite)
        resultat["explication"] = {
            "synthese": resumer_explication(contributions, probabilite),
            "contributions": contributions,
            "facteurs_positifs": [c for c in contributions if c["sens"] == "positif"],
            "facteurs_negatifs": [c for c in contributions if c["sens"] == "negatif"],
        }
        resultat["recommandations"] = generer_recommandations(
            features, probabilite, niveau_risque, matieres_faibles
        )

    # Positionnement de l'etudiant dans la distribution de reference.
    reference = meta.get("distribution_reference")
    if reference:
        rangs = [
            ("p10", 10), ("p25", 25), ("mediane", 50), ("p75", 75), ("p90", 90),
        ]
        percentile = 5
        for cle, valeur in rangs:
            if probabilite >= reference.get(cle, 1.0):
                percentile = valeur
        resultat["positionnement"] = {
            "percentile_estime": percentile,
            "mediane_promotion": reference.get("mediane"),
        }

    return resultat


def obtenir_metriques_modele() -> dict:
    """Metriques du modele en service, exposees a l'ecran administrateur."""
    import json

    chemin = os.path.join(MODEL_DIR, "metrics.json")
    if not os.path.exists(chemin):
        return {}
    with open(chemin, encoding="utf-8") as fichier:
        return json.load(fichier)


# --------------------------------------------------------------------------
# Compatibilite avec l'API de l'ancienne version (app/services.py)
# --------------------------------------------------------------------------
def predict_for_student(notes, taux_assiduite_list, seuil_eleve, seuil_moyen):
    """Signature historique. Conservee pour ne rien casser pendant la
    migration ; le nouveau code doit appeler `predire`."""
    taux_moyen = (
        sum(float(t) for t in taux_assiduite_list) / len(taux_assiduite_list)
        if taux_assiduite_list
        else 78.0
    )
    seances_totales = 20
    seances_presentes = int(round(seances_totales * taux_moyen / 100))

    resultat = predire(
        notes_chronologiques=notes,
        seances_totales=seances_totales,
        seances_presentes=seances_presentes,
        seuil_eleve=seuil_eleve,
        seuil_moyen=seuil_moyen,
        avec_explication=False,
    )
    return {
        "probabilite_reussite": resultat["probabilite_reussite"],
        "niveau_risque": resultat["niveau_risque"],
        "moyenne_generale": resultat["moyenne_generale"],
        "taux_assiduite_moyen": resultat["taux_assiduite_moyen"],
    }
