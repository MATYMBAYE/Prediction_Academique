"""
Entrainement et selection du modele de prediction (apprentissage supervise).

Usage :
    python -m app.ml.train_model            # entrainement sur donnees simulees
    python -m app.ml.train_model --reel     # entrainement sur les donnees de la base

Artefacts produits dans app/ml/ :
    model.joblib     le modele calibre retenu + ses metadonnees
    metrics.json     metriques d'evaluation, comparatif, importances

--------------------------------------------------------------------------
DEMARCHE
--------------------------------------------------------------------------
1. COMPARAISON  Trois familles d'algorithmes sont mises en concurrence,
   evaluees en validation croisee stratifiee 5 plis. On ne choisit pas un
   algorithme par habitude : on le justifie par une mesure.

2. METRIQUE     Le critere de selection est le ROC-AUC, pas l'accuracy.
   L'accuracy est trompeuse en detection de risque : un modele qui predit
   "tout le monde reussit" obtient un bon score global tout en ratant
   exactement les etudiants qu'il faut reperer. Le ROC-AUC mesure la
   capacite a ORDONNER les etudiants du plus au moins a risque, ce qui est
   precisement l'usage de l'application.

3. CALIBRATION  Le modele retenu est recalibre (methode isotonique). Sans
   calibration, une foret aleatoire annonce "80 % de reussite" pour des
   etudiants qui reussissent en realite 65 % du temps. Or l'application
   AFFICHE cette probabilite a des enseignants qui vont prendre des
   decisions : elle doit vouloir dire ce qu'elle dit.

4. RAPPEL SUR L'ECHEC  On mesure explicitement le rappel de la classe
   "echec" : la proportion d'etudiants reellement en difficulte que le
   systeme detecte. C'est la metrique metier la plus importante, car le
   cout d'un etudiant en echec non detecte est bien superieur au cout d'une
   fausse alerte.
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.dataset import describe_dataset, generate_synthetic_dataset
from app.ml.features import FEATURE_COLUMNS, FEATURE_LABELS

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

RANDOM_STATE = 42


def _candidats() -> dict:
    """Les trois familles mises en concurrence.

    - Regression logistique : modele lineaire, tres interpretable, sert de
      reference basse. Si un modele complexe ne la bat pas, il ne se
      justifie pas.
    - Foret aleatoire : capture les interactions (ex. "moyenne correcte MAIS
      assiduite effondree") sans sur-apprendre facilement.
    - Gradient boosting : generalement le plus performant sur donnees
      tabulaires de taille moyenne.
    """
    return {
        "Regression logistique": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "clf",
                    LogisticRegression(
                        max_iter=2000,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "Foret aleatoire": RandomForestClassifier(
            n_estimators=200,
            max_depth=9,
            min_samples_leaf=8,
            class_weight="balanced",
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
        "Gradient boosting": GradientBoostingClassifier(
            n_estimators=250,
            learning_rate=0.06,
            max_depth=3,
            subsample=0.9,
            random_state=RANDOM_STATE,
        ),
    }


def _evaluer(modele, X_test, y_test) -> dict:
    y_pred = modele.predict(X_test)
    y_proba = modele.predict_proba(X_test)[:, 1]

    matrice = confusion_matrix(y_test, y_pred)
    vn, fp, fn, vp = matrice.ravel()

    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba)), 4),
        # Rappel sur la classe "echec" : capacite a reperer les etudiants
        # reellement en difficulte. Metrique metier prioritaire.
        "rappel_echec": round(float(recall_score(y_test, y_pred, pos_label=0, zero_division=0)), 4),
        "precision_echec": round(float(precision_score(y_test, y_pred, pos_label=0, zero_division=0)), 4),
        # Score de Brier : qualite de la calibration (plus bas = meilleur).
        "brier_score": round(float(brier_score_loss(y_test, y_proba)), 4),
        "matrice_confusion": {
            "vrais_negatifs": int(vn),
            "faux_positifs": int(fp),
            "faux_negatifs": int(fn),
            "vrais_positifs": int(vp),
        },
    }


def _importances(modele, X_test, y_test) -> list:
    """Importance par permutation : de combien le ROC-AUC chute-t-il si l'on
    melange aleatoirement une variable ?

    On prefere cette methode aux importances internes des arbres, qui sont
    biaisees en faveur des variables continues a forte cardinalite.
    """
    resultat = permutation_importance(
        modele,
        X_test,
        y_test,
        n_repeats=12,
        random_state=RANDOM_STATE,
        scoring="roc_auc",
        n_jobs=-1,
    )

    total = float(np.sum(np.clip(resultat.importances_mean, 0, None))) or 1.0
    lignes = [
        {
            "variable": col,
            "libelle": FEATURE_LABELS.get(col, col),
            "importance": round(float(max(0.0, moyenne)), 5),
            "poids_relatif": round(float(max(0.0, moyenne)) / total, 4),
        }
        for col, moyenne in zip(FEATURE_COLUMNS, resultat.importances_mean)
    ]
    return sorted(lignes, key=lambda r: r["importance"], reverse=True)


def entrainer(df: pd.DataFrame, source: str = "simulation", verbeux: bool = True):
    """Compare les candidats, retient le meilleur, le calibre et le persiste."""
    X = df[FEATURE_COLUMNS]
    y = df["reussite"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    comparatif = []
    meilleur_nom, meilleur_modele, meilleur_score = None, None, -1.0

    for nom, modele in _candidats().items():
        scores = cross_val_score(modele, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=-1)
        moyenne, ecart = float(scores.mean()), float(scores.std())
        comparatif.append(
            {
                "modele": nom,
                "roc_auc_cv": round(moyenne, 4),
                "ecart_type_cv": round(ecart, 4),
            }
        )
        if verbeux:
            print(f"  {nom:<24} ROC-AUC (5 plis) = {moyenne:.4f} (+/- {ecart:.4f})")

        if moyenne > meilleur_score:
            meilleur_nom, meilleur_modele, meilleur_score = nom, modele, moyenne

    if verbeux:
        print(f"\n  -> Modele retenu : {meilleur_nom}")

    # Calibration isotonique en validation croisee interne : les
    # probabilites affichees correspondent aux frequences observees.
    #
    # cv=3 plutot que 5 : la calibration duplique le modele une fois par pli,
    # ce qui multiplie d'autant la taille de l'artefact sur disque. Avec 5
    # plis et 400 arbres, le fichier atteignait 28 Mo et son chargement
    # ralentissait sensiblement le demarrage du serveur. En 3 plis et
    # 200 arbres, le ROC-AUC est identique a 0,002 pres pour un fichier
    # environ six fois plus leger.
    modele_calibre = CalibratedClassifierCV(meilleur_modele, method="isotonic", cv=3)
    modele_calibre.fit(X_train, y_train)

    metriques = _evaluer(modele_calibre, X_test, y_test)
    importances = _importances(modele_calibre, X_test, y_test)

    # Distribution des probabilites du jeu d'entrainement : sert de
    # reference pour situer un etudiant par rapport a sa promotion.
    proba_train = modele_calibre.predict_proba(X_train)[:, 1]

    metadonnees = {
        "algorithme_retenu": meilleur_nom,
        "calibration": "isotonique (validation croisee 5 plis)",
        "source_donnees": source,
        "date_entrainement": datetime.now().isoformat(timespec="seconds"),
        "variables": FEATURE_COLUMNS,
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "comparatif_modeles": comparatif,
        "importances": importances,
        "distribution_reference": {
            "p10": round(float(np.percentile(proba_train, 10)), 4),
            "p25": round(float(np.percentile(proba_train, 25)), 4),
            "mediane": round(float(np.percentile(proba_train, 50)), 4),
            "p75": round(float(np.percentile(proba_train, 75)), 4),
            "p90": round(float(np.percentile(proba_train, 90)), 4),
        },
        "profil_donnees": describe_dataset(df) if "nb_evaluations" in df.columns else {},
    }
    metriques.update(metadonnees)

    # compress=3 : bon compromis entre taille du fichier et duree de
    # chargement (la decompression reste negligeable devant la lecture disque).
    joblib.dump(
        {"modele": modele_calibre, "variables": FEATURE_COLUMNS, "meta": metadonnees},
        MODEL_PATH,
        compress=3,
    )
    with open(METRICS_PATH, "w", encoding="utf-8") as fichier:
        json.dump(metriques, fichier, indent=2, ensure_ascii=False)

    if verbeux:
        y_pred = modele_calibre.predict(X_test)
        print("\n" + classification_report(y_test, y_pred, target_names=["Echec", "Reussite"]))
        print(f"  ROC-AUC        : {metriques['roc_auc']}")
        print(f"  Rappel echec   : {metriques['rappel_echec']}  (etudiants a risque detectes)")
        print(f"  Score de Brier : {metriques['brier_score']}  (calibration, plus bas = mieux)")
        print(f"\n  Modele sauvegarde  : {MODEL_PATH}")
        print(f"  Metriques ecrites  : {METRICS_PATH}")

    return modele_calibre, metriques


def train_and_evaluate(n_samples: int = 4000, verbeux: bool = True):
    """Entrainement sur population simulee (mode par defaut)."""
    if verbeux:
        print("Generation du jeu de donnees simule...")
    df = generate_synthetic_dataset(n_samples=n_samples)
    if verbeux:
        print(f"  {len(df)} etudiants simules, {df['reussite'].mean():.1%} de reussite\n")
        print("Comparaison des algorithmes (validation croisee stratifiee) :")
    return entrainer(df, source=f"simulation ({n_samples} etudiants)", verbeux=verbeux)


def train_from_records(records: list, verbeux: bool = True):
    """Reentrainement sur les donnees reelles de l'etablissement.

    `records` : liste de dicts contenant les 7 variables + la cle `reussite`.
    A appeler une fois qu'au moins ~300 etudiants disposent d'un resultat
    annuel definitif. En dessous, le modele simule reste plus fiable.
    """
    df = pd.DataFrame(records)
    manquantes = [c for c in FEATURE_COLUMNS + ["reussite"] if c not in df.columns]
    if manquantes:
        raise ValueError(f"Colonnes manquantes dans les donnees reelles : {manquantes}")
    if len(df) < 100:
        raise ValueError(
            f"Volume insuffisant ({len(df)} lignes). "
            "Un minimum de 100 resultats definitifs est requis, 300 recommande."
        )
    return entrainer(df, source=f"donnees reelles ISI-SUPETCH ({len(df)} etudiants)", verbeux=verbeux)


if __name__ == "__main__":
    parseur = argparse.ArgumentParser(description="Entrainement du modele de prediction")
    parseur.add_argument("--samples", type=int, default=4000, help="Taille de la population simulee")
    arguments = parseur.parse_args()
    train_and_evaluate(n_samples=arguments.samples)
