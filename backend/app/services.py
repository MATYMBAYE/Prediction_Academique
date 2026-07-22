"""Logique metier partagee entre les routes (calcul de prediction + alertes)."""
from collections import defaultdict

from flask import current_app

from app.academic import ALL_SEMESTRES
from app.extensions import db
from app.ml.predict import predict_for_student
from app.models import Alert, Prediction


def attendance_rates_by_semestre(student):
    """Calcule le taux de presence (%) par semestre a partir des appels
    (course_sessions + presences) de l'etudiant (remplace la saisie manuelle
    d'un pourcentage global - FR-03).
    """
    totals = defaultdict(lambda: [0, 0])  # semestre -> [presents, total]
    for presence in student.presences:
        semestre = presence.session.semestre
        totals[semestre][1] += 1
        if presence.statut == "present":
            totals[semestre][0] += 1

    return {sem: (presents / total * 100) for sem, (presents, total) in totals.items() if total > 0}


def latest_semestre(semestres):
    if not semestres:
        return None
    return max(semestres, key=lambda s: ALL_SEMESTRES.index(s) if s in ALL_SEMESTRES else -1)


def compute_and_store_prediction(student):
    """Recalcule la prediction d'un etudiant a partir de son historique
    de notes/assiduite, l'enregistre (FR-08) et declenche une alerte si le
    niveau de risque depasse le seuil defini (FR-07, FR-09).
    """
    notes = [g.note for g in student.grades]
    taux_par_semestre = attendance_rates_by_semestre(student)
    taux_list = list(taux_par_semestre.values())

    if not notes and not taux_list:
        return None

    seuil_eleve = current_app.config["SEUIL_RISQUE_ELEVE"]
    seuil_moyen = current_app.config["SEUIL_RISQUE_MOYEN"]

    result = predict_for_student(notes, taux_list, seuil_eleve, seuil_moyen)

    semestres_connus = {g.semestre for g in student.grades} | set(taux_par_semestre.keys())

    prediction = Prediction(
        student_id=student.id,
        probabilite_reussite=result["probabilite_reussite"],
        niveau_risque=result["niveau_risque"],
        moyenne_generale=result["moyenne_generale"],
        taux_assiduite_moyen=result["taux_assiduite_moyen"],
        semestre=latest_semestre(semestres_connus),
    )
    db.session.add(prediction)
    db.session.flush()

    if result["niveau_risque"] == "eleve":
        alert = Alert(
            student_id=student.id,
            prediction_id=prediction.id,
            niveau_risque=result["niveau_risque"],
        )
        db.session.add(alert)

    db.session.commit()
    return prediction
