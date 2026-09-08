"""
Logique metier partagee : calcul des predictions, alertes, agregats.

Ce module fait le pont entre le modele de donnees (SQLAlchemy) et le moteur
de prediction (app/ml). C'est le seul endroit ou l'on traduit des lignes de
base de donnees en variables de modele, ce qui garantit que la definition des
variables reste unique (cf. app/ml/features.py).
"""
from collections import defaultdict

from flask import current_app
from sqlalchemy import func

from app.academic import ALL_SEMESTRES
from app.extensions import db
from app.ml.predict import predire
from app.models import Alert, CourseSession, Grade, Prediction, Presence, Student


# --------------------------------------------------------------------------
# EXTRACTION DES DONNEES D'UN ETUDIANT
# --------------------------------------------------------------------------

def notes_chronologiques(student):
    """Notes triees de la plus ancienne a la plus recente.

    L'ordre chronologique porte l'information de tendance : une liste
    desordonnee produirait une pente aleatoire, donc une variable de
    progression sans aucun sens.
    """
    grades = sorted(
        student.grades,
        key=lambda g: (
            ALL_SEMESTRES.index(g.semestre) if g.semestre in ALL_SEMESTRES else 99,
            g.date_saisie or 0,
        ),
    )
    return [float(g.note) for g in grades], grades


def notes_du_dernier_semestre(grades):
    """Notes du semestre le plus avance parmi ceux ou l'etudiant a des notes."""
    if not grades:
        return []

    semestres = {g.semestre for g in grades if g.semestre}
    if not semestres:
        return [float(g.note) for g in grades]

    dernier = max(
        semestres,
        key=lambda s: ALL_SEMESTRES.index(s) if s in ALL_SEMESTRES else -1,
    )
    return [float(g.note) for g in grades if g.semestre == dernier]


def comptage_presences(student):
    """(seances_totales, seances_presentes) pour l'etudiant."""
    total = len(student.presences)
    presents = sum(1 for p in student.presences if p.statut == "present")
    return total, presents


def attendance_rates_by_semestre(student):
    """Taux de presence (%) par semestre.

    Conserve depuis la version precedente : encore utilise par les fiches
    detaillees et les exports.
    """
    totaux = defaultdict(lambda: [0, 0])  # semestre -> [presents, total]
    for presence in student.presences:
        if not presence.session:
            continue
        semestre = presence.session.semestre
        totaux[semestre][1] += 1
        if presence.statut == "present":
            totaux[semestre][0] += 1

    return {
        semestre: (presents / total * 100)
        for semestre, (presents, total) in totaux.items()
        if total > 0
    }


def matieres_en_difficulte(student, seuil=10.0):
    """Matieres dont la moyenne est sous le seuil de validation.

    Alimente les recommandations ciblees ("renforcement en Mathematiques")
    plutot que des conseils generiques.
    """
    par_matiere = defaultdict(list)
    for grade in student.grades:
        par_matiere[grade.matiere].append(float(grade.note))

    resultat = [
        {"matiere": matiere, "moyenne": sum(notes) / len(notes), "nb_notes": len(notes)}
        for matiere, notes in par_matiere.items()
        if notes and (sum(notes) / len(notes)) < seuil
    ]
    return sorted(resultat, key=lambda m: m["moyenne"])


def latest_semestre(semestres):
    if not semestres:
        return None
    return max(
        semestres,
        key=lambda s: ALL_SEMESTRES.index(s) if s in ALL_SEMESTRES else -1,
    )


# --------------------------------------------------------------------------
# PREDICTION
# --------------------------------------------------------------------------

def calculer_prediction(student, avec_explication=True):
    """Calcule la prediction d'un etudiant SANS l'enregistrer.

    Utile pour l'affichage a la demande (fiche etudiant, simulateur) sans
    polluer l'historique avec une ligne a chaque consultation.
    """
    notes, grades = notes_chronologiques(student)
    recentes = notes_du_dernier_semestre(grades)
    total_seances, presentes = comptage_presences(student)

    # Sans aucune donnee, toute prediction serait une invention.
    if not notes and total_seances == 0:
        return None

    return predire(
        notes_chronologiques=notes,
        notes_recentes=recentes,
        seances_totales=total_seances,
        seances_presentes=presentes,
        matieres_faibles=matieres_en_difficulte(student) if avec_explication else None,
        seuil_eleve=current_app.config["SEUIL_RISQUE_ELEVE"],
        seuil_moyen=current_app.config["SEUIL_RISQUE_MOYEN"],
        avec_explication=avec_explication,
    )


def compute_and_store_prediction(student, commit=True):
    """Calcule, enregistre la prediction et declenche l'alerte si necessaire.

    Appelee automatiquement apres chaque saisie de note ou d'appel de
    presence (reevaluation continue), et manuellement depuis l'interface
    d'administration.

    Args:
        commit: mettre a False pour un traitement par lot, afin de ne
            declencher qu'une seule transaction a la fin plutot qu'une par
            etudiant.
    """
    resultat = calculer_prediction(student, avec_explication=False)
    if resultat is None:
        return None

    _, grades = notes_chronologiques(student)
    semestres_connus = {g.semestre for g in grades if g.semestre}
    semestres_connus |= set(attendance_rates_by_semestre(student).keys())

    prediction = Prediction(
        student_id=student.id,
        probabilite_reussite=resultat["probabilite_reussite"],
        niveau_risque=resultat["niveau_risque"],
        moyenne_generale=resultat["moyenne_generale"],
        taux_assiduite_moyen=resultat["taux_assiduite_moyen"],
        semestre=latest_semestre(semestres_connus),
    )
    db.session.add(prediction)
    db.session.flush()

    _gerer_alertes(student, prediction, resultat)

    if commit:
        db.session.commit()
    return prediction


# Seuils de detection precoce par type d'alerte specifique (independants du
# seuil global de risque ML, qui alimente le type "risque_echec"). Alignes
# sur les paliers deja utilises a l'affichage (tableaux de bord admin et
# enseignant) pour que le sens d'une couleur reste constant dans toute
# l'application.
SEUIL_NOTES_FAIBLES_ELEVE = 8.0
SEUIL_NOTES_FAIBLES_MOYEN = 10.0
SEUIL_ABSENCES_ELEVE = 45.0
SEUIL_ABSENCES_MOYEN = 60.0


def _gravite_notes_faibles(moyenne_generale):
    if moyenne_generale is None:
        return None
    if moyenne_generale < SEUIL_NOTES_FAIBLES_ELEVE:
        return "eleve"
    if moyenne_generale < SEUIL_NOTES_FAIBLES_MOYEN:
        return "moyen"
    return None


def _gravite_absences(taux_assiduite_moyen):
    if taux_assiduite_moyen is None:
        return None
    if taux_assiduite_moyen < SEUIL_ABSENCES_ELEVE:
        return "eleve"
    if taux_assiduite_moyen < SEUIL_ABSENCES_MOYEN:
        return "moyen"
    return None


def _ouvrir_ou_cloturer_alerte(student, prediction, type_alerte, gravite):
    """Ouvre, met a jour ou cloture l'alerte d'un type donne pour un etudiant.

    Point important : on evite d'empiler les doublons. Une seule alerte
    ouverte par (etudiant, type) a la fois, mise a jour en place tant que le
    facteur declencheur persiste ; elle se cloture d'elle-meme des que la
    situation repasse sous le seuil. Une aggravation (ex. moyen -> eleve)
    redevient une alerte non lue : l'etudiant doit etre reinforme du
    changement meme s'il avait deja pris connaissance de la precedente.
    """
    alerte_ouverte = (
        Alert.query.filter(
            Alert.student_id == student.id,
            Alert.type_alerte == type_alerte,
            Alert.statut_traitement.in_(["nouvelle", "en_cours"]),
        )
        .order_by(Alert.date_declenchement.desc())
        .first()
    )

    if gravite:
        if alerte_ouverte:
            alerte_ouverte.prediction_id = prediction.id
            if alerte_ouverte.niveau_risque != gravite:
                alerte_ouverte.niveau_risque = gravite
                alerte_ouverte.vue_par_etudiant = False
        else:
            db.session.add(
                Alert(
                    student_id=student.id,
                    prediction_id=prediction.id,
                    type_alerte=type_alerte,
                    niveau_risque=gravite,
                )
            )
    elif alerte_ouverte:
        # La situation s'est redressee : l'alerte n'a plus lieu d'etre.
        alerte_ouverte.statut_traitement = "traitee"


def _gerer_alertes(student, prediction, resultat):
    """Genere les alertes precoces de l'etudiant, une par facteur de risque.

    Trois types independants plutot qu'une alerte globale unique : un
    etudiant peut cumuler un risque d'echec, des notes faibles et un
    probleme d'assiduite sans que l'un masque les autres a l'ecran.
    """
    niveau_risque = resultat["niveau_risque"]
    gravite_risque_echec = niveau_risque if niveau_risque in ("moyen", "eleve") else None

    _ouvrir_ou_cloturer_alerte(student, prediction, "risque_echec", gravite_risque_echec)
    _ouvrir_ou_cloturer_alerte(
        student, prediction, "notes_faibles", _gravite_notes_faibles(resultat.get("moyenne_generale"))
    )
    _ouvrir_ou_cloturer_alerte(
        student, prediction, "absences_repetees", _gravite_absences(resultat.get("taux_assiduite_moyen"))
    )


def recalculer_toutes_les_predictions():
    """Recalcule la prediction de tous les etudiants en une transaction.

    Un seul commit final : avec un commit par etudiant, un etablissement de
    600 etudiants declencherait 600 transactions et l'operation prendrait
    plusieurs minutes.
    """
    etudiants = Student.query.all()
    compteur = 0

    for etudiant in etudiants:
        if compute_and_store_prediction(etudiant, commit=False) is not None:
            compteur += 1

    db.session.commit()
    return compteur


# --------------------------------------------------------------------------
# AGREGATS POUR LES TABLEAUX DE BORD
# --------------------------------------------------------------------------

def dernieres_predictions_par_etudiant():
    """{student_id: Prediction} a partir de la derniere prediction de chacun.

    Optimisation par rapport a la version precedente : celle-ci chargeait
    l'integralite de la table `predictions` en memoire a chaque appel, puis
    la parcourait en Python. Sur un historique de plusieurs milliers de
    lignes, l'operation se repetait a chaque affichage de liste.

    On demande ici a la base de ne renvoyer que la ligne la plus recente par
    etudiant, via une sous-requete sur le maximum de date.
    """
    sous_requete = (
        db.session.query(
            Prediction.student_id.label("student_id"),
            func.max(Prediction.date_prediction).label("date_max"),
        )
        .group_by(Prediction.student_id)
        .subquery()
    )

    lignes = (
        db.session.query(Prediction)
        .join(
            sous_requete,
            db.and_(
                Prediction.student_id == sous_requete.c.student_id,
                Prediction.date_prediction == sous_requete.c.date_max,
            ),
        )
        .all()
    )

    # En cas d'egalite parfaite de date (recalcul en lot), on conserve la
    # ligne dont l'identifiant est le plus eleve, donc la plus recente.
    resultat = {}
    for prediction in lignes:
        existante = resultat.get(prediction.student_id)
        if existante is None or prediction.id > existante.id:
            resultat[prediction.student_id] = prediction
    return resultat


def statistiques_globales():
    """Indicateurs cles de l'etablissement."""
    from app.models import Classe, Reclamation, User

    total_etudiants = Student.query.count()
    dernieres = dernieres_predictions_par_etudiant()

    a_risque = sum(
        1 for p in dernieres.values() if p.niveau_risque in ("eleve", "moyen")
    )
    risque_eleve = sum(1 for p in dernieres.values() if p.niveau_risque == "eleve")

    moyenne_generale = db.session.query(func.avg(Grade.note)).scalar()
    total_presences = Presence.query.count()
    presences_ok = Presence.query.filter_by(statut="present").count()

    return {
        "total_etudiants": total_etudiants,
        "total_classes": Classe.query.count(),
        "total_enseignants": db.session.query(func.count(User.id))
        .filter(User.role == "enseignant")
        .scalar(),
        "etudiants_a_risque": a_risque,
        "etudiants_risque_eleve": risque_eleve,
        "etudiants_evalues": len(dernieres),
        "moyenne_generale": round(float(moyenne_generale), 2) if moyenne_generale else 0.0,
        "assiduite_moyenne": (
            round(presences_ok / total_presences * 100, 2) if total_presences else 0.0
        ),
        "seances_enregistrees": CourseSession.query.count(),
        "comptes_desactives": User.query.filter_by(statut="inactif").count(),
        "alertes_nouvelles": Alert.query.filter_by(statut_traitement="nouvelle").count(),
        "reclamations_ouvertes": Reclamation.query.filter(
            Reclamation.statut.in_(["nouvelle", "en_cours"])
        ).count(),
    }


def repartition_du_risque():
    """Nombre et part d'etudiants par niveau de risque."""
    dernieres = dernieres_predictions_par_etudiant()
    total_etudiants = Student.query.count()

    compteurs = {"faible": 0, "moyen": 0, "eleve": 0}
    for prediction in dernieres.values():
        if prediction.niveau_risque in compteurs:
            compteurs[prediction.niveau_risque] += 1

    non_evalues = max(0, total_etudiants - len(dernieres))
    libelles = {
        "faible": "Risque faible",
        "moyen": "Risque modere",
        "eleve": "Risque eleve",
        "inconnu": "Non evalue",
    }

    lignes = [
        {"niveau": niveau, "libelle": libelles[niveau], "valeur": valeur}
        for niveau, valeur in compteurs.items()
    ]
    if non_evalues:
        lignes.append(
            {"niveau": "inconnu", "libelle": libelles["inconnu"], "valeur": non_evalues}
        )

    total = sum(ligne["valeur"] for ligne in lignes) or 1
    for ligne in lignes:
        ligne["pourcentage"] = round(ligne["valeur"] / total * 100, 1)
    return lignes


def evolution_du_risque(nb_semaines=8):
    """Nombre d'etudiants a risque par semaine, sur les N dernieres semaines.

    On compte les PREDICTIONS emises dans la semaine, pas les etudiants
    distincts : l'objectif est de montrer la dynamique de detection.
    """
    from datetime import datetime, timedelta

    maintenant = datetime.utcnow()
    debut = maintenant - timedelta(weeks=nb_semaines)

    predictions = (
        Prediction.query.filter(Prediction.date_prediction >= debut)
        .order_by(Prediction.date_prediction)
        .all()
    )

    seaux = defaultdict(lambda: {"eleve": set(), "moyen": set()})
    for prediction in predictions:
        if not prediction.date_prediction:
            continue
        # Cle ISO annee-semaine, pour un regroupement hebdomadaire fiable
        # meme a cheval sur un changement d'annee.
        annee, semaine, _ = prediction.date_prediction.isocalendar()
        cle = (annee, semaine)
        if prediction.niveau_risque in seaux[cle]:
            seaux[cle][prediction.niveau_risque].add(prediction.student_id)

    lignes = []
    for (annee, semaine), valeurs in sorted(seaux.items()):
        lignes.append(
            {
                "periode": f"S{semaine}",
                "risque_eleve": len(valeurs["eleve"]),
                "risque_moyen": len(valeurs["moyen"]),
            }
        )
    return lignes[-nb_semaines:]


def situation_par_filiere():
    """Moyenne et taux d'etudiants a risque, par filiere."""
    from app.models import Classe, Filiere

    dernieres = dernieres_predictions_par_etudiant()
    agregats = defaultdict(lambda: {"notes": [], "total": 0, "a_risque": 0})

    etudiants = (
        Student.query.join(Classe, Student.classe_id == Classe.id)
        .join(Filiere, Classe.filiere_id == Filiere.id)
        .all()
    )

    for etudiant in etudiants:
        if not (etudiant.classe and etudiant.classe.filiere):
            continue
        code = etudiant.classe.filiere.code
        agregat = agregats[code]
        agregat["total"] += 1

        prediction = dernieres.get(etudiant.id)
        if prediction:
            if prediction.niveau_risque in ("eleve", "moyen"):
                agregat["a_risque"] += 1
            if prediction.moyenne_generale is not None:
                agregat["notes"].append(float(prediction.moyenne_generale))

    lignes = []
    for code, agregat in sorted(agregats.items()):
        lignes.append(
            {
                "filiere": code,
                "effectif": agregat["total"],
                "moyenne": (
                    round(sum(agregat["notes"]) / len(agregat["notes"]), 2)
                    if agregat["notes"]
                    else 0
                ),
                "taux_risque": (
                    round(agregat["a_risque"] / agregat["total"] * 100, 1)
                    if agregat["total"]
                    else 0
                ),
            }
        )
    return lignes
