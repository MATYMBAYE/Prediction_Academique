"""
Entrainement du modele de Machine Learning supervise (PRD FR-05).
Algorithme : RandomForestClassifier (robuste, peu sensible a l'echelle des
variables, donne de bonnes performances sur des jeux de donnees de taille
moyenne comme celui d'un etablissement).

Usage :
    python -m app.ml.train_model
Genere :
    app/ml/model.joblib               -> modele entraine
    app/ml/metrics.json               -> accuracy / precision / rappel / F1
"""
import json
import os

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

from app.ml.dataset import FEATURE_COLUMNS, generate_synthetic_dataset

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")


def train_and_evaluate():
    df = generate_synthetic_dataset(n_samples=1500)
    X = df[FEATURE_COLUMNS]
    y = df["reussite"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        min_samples_leaf=5,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred), 4),
        "recall": round(recall_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred), 4),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "features": FEATURE_COLUMNS,
    }

    joblib.dump(model, MODEL_PATH)
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    print("Modele entraine et sauvegarde dans", MODEL_PATH)
    print("Metriques d'evaluation :", json.dumps(metrics, indent=2, ensure_ascii=False))
    return model, metrics


if __name__ == "__main__":
    train_and_evaluate()
