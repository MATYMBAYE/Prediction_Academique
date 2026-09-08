"""
Moteur de recommandations pedagogiques.

Une prediction seule ne sert a rien : un enseignant qui lit "risque eleve"
a besoin de savoir QUOI FAIRE. Ce module transforme le diagnostic en plan
d'action concret.

--------------------------------------------------------------------------
POURQUOI DES REGLES ET NON UN MODELE ?
--------------------------------------------------------------------------
Choix assume. Apprendre les recommandations demanderait un historique
"intervention -> resultat obtenu" que l'etablissement ne possede pas : on ne
sait pas aujourd'hui si les etudiants places en tutorat s'en sont mieux
sortis. Inventer un modele sur des donnees inexistantes produirait des
recommandations arbitraires habillees d'une caution scientifique trompeuse.

Les regles ci-dessous sont en revanche tracees sur des criteres explicites,
verifiables et modifiables par l'equipe pedagogique. Chaque recommandation
indique le facteur declencheur, ce qui la rend contestable - donc utile.

Quand l'etablissement disposera d'un historique d'interventions, ce module
pourra etre remplace par un modele d'uplift sans toucher au reste du code :
seule la fonction `generer_recommandations` est appelee de l'exterieur.
"""
from __future__ import annotations

# Priorites : 1 = urgent (agir sous 48 h), 2 = important (sous 2 semaines),
# 3 = preventif (a surveiller)
URGENT, IMPORTANT, PREVENTIF = 1, 2, 3

CATEGORIES = {
    "assiduite": "Assiduite",
    "academique": "Accompagnement academique",
    "methodologie": "Methodologie de travail",
    "suivi": "Suivi individuel",
    "orientation": "Orientation",
    "valorisation": "Valorisation",
}


def _reco(titre, description, categorie, priorite, declencheur, acteur):
    return {
        "titre": titre,
        "description": description,
        "categorie": CATEGORIES[categorie],
        "priorite": priorite,
        "declencheur": declencheur,
        "acteur": acteur,
    }


def generer_recommandations(
    features: dict,
    probabilite: float,
    niveau_risque: str,
    matieres_faibles: list | None = None,
) -> list:
    """Construit le plan d'action adapte au profil de l'etudiant.

    Args:
        features: les 7 variables calculees.
        probabilite: probabilite de reussite (0-1).
        niveau_risque: 'faible' | 'moyen' | 'eleve'.
        matieres_faibles: liste de dicts {matiere, moyenne} sous 10/20.

    Returns:
        Liste de recommandations triee par priorite puis par categorie.
    """
    matieres_faibles = matieres_faibles or []
    recommandations = []

    assiduite = features.get("taux_assiduite", 100.0)
    absences = features.get("nb_absences", 0)
    moyenne = features.get("moyenne_generale", 20.0)
    moyenne_recente = features.get("moyenne_recente", moyenne)
    ecart_type = features.get("ecart_type_notes", 0.0)
    tendance = features.get("tendance", 0.0)
    nb_evaluations = features.get("nb_evaluations", 0)

    # --- Axe assiduite ----------------------------------------------------
    if assiduite < 50:
        recommandations.append(
            _reco(
                "Convocation immediate pour absenteisme critique",
                f"Le taux de presence est de {assiduite:.0f}%, soit {int(absences)} seance(s) manquee(s). "
                "Un entretien doit etre programme sans delai pour identifier la cause "
                "(sante, situation familiale, emploi, desengagement) avant toute mesure disciplinaire.",
                "assiduite",
                URGENT,
                f"Assiduite {assiduite:.0f}% (seuil critique : 50%)",
                "Responsable pedagogique",
            )
        )
    elif assiduite < 65:
        recommandations.append(
            _reco(
                "Suivi hebdomadaire de la presence",
                f"Avec {assiduite:.0f}% de presence, l'etudiant manque une part significative des "
                "enseignements. Mettre en place un pointage hebdomadaire et un rappel systematique "
                "apres deux absences consecutives.",
                "assiduite",
                IMPORTANT,
                f"Assiduite {assiduite:.0f}% (seuil de vigilance : 65%)",
                "Enseignant referent",
            )
        )
    elif assiduite < 80 and niveau_risque != "faible":
        recommandations.append(
            _reco(
                "Rappel sur l'importance de la presence",
                f"L'assiduite ({assiduite:.0f}%) reste perfectible et constitue un levier simple "
                "d'amelioration, sans effort academique supplementaire.",
                "assiduite",
                PREVENTIF,
                f"Assiduite {assiduite:.0f}%",
                "Enseignant referent",
            )
        )

    # --- Axe academique ---------------------------------------------------
    if moyenne < 8:
        recommandations.append(
            _reco(
                "Tutorat renforce et plan de rattrapage",
                f"La moyenne generale ({moyenne:.2f}/20) se situe tres en dessous du seuil de "
                "validation. Un tutorat individuel de 2 h par semaine, assure par un etudiant "
                "de niveau superieur, doit etre mis en place avec un point d'etape mensuel.",
                "academique",
                URGENT,
                f"Moyenne generale {moyenne:.2f}/20 (seuil critique : 8/20)",
                "Responsable pedagogique",
            )
        )
    elif moyenne < 10:
        recommandations.append(
            _reco(
                "Tutorat par les pairs",
                f"La moyenne ({moyenne:.2f}/20) est sous le seuil de validation. Un binome avec un "
                "etudiant de la meme promotion ayant de bons resultats permet un rattrapage "
                "progressif a cout organisationnel faible.",
                "academique",
                IMPORTANT,
                f"Moyenne generale {moyenne:.2f}/20 (seuil de validation : 10/20)",
                "Enseignant referent",
            )
        )
    elif moyenne < 11.5 and niveau_risque == "moyen":
        recommandations.append(
            _reco(
                "Consolidation des acquis",
                f"La moyenne ({moyenne:.2f}/20) valide de justesse et laisse peu de marge en cas "
                "d'echec ponctuel. Proposer des exercices de consolidation sur les chapitres les "
                "moins maitrises.",
                "academique",
                PREVENTIF,
                f"Moyenne generale {moyenne:.2f}/20, marge faible",
                "Enseignant de la matiere",
            )
        )

    # --- Matieres specifiques --------------------------------------------
    for matiere in sorted(matieres_faibles, key=lambda m: m.get("moyenne", 20))[:3]:
        nom = matiere.get("matiere", "?")
        note = matiere.get("moyenne", 0)
        recommandations.append(
            _reco(
                f"Renforcement en {nom}",
                f"La moyenne en {nom} est de {note:.2f}/20. Prevoir des seances de soutien ciblees "
                "sur cette matiere et verifier si la difficulte porte sur les prerequis ou sur le "
                "programme de l'annee en cours.",
                "academique",
                URGENT if note < 7 else IMPORTANT,
                f"{nom} : {note:.2f}/20",
                "Enseignant de la matiere",
            )
        )

    # --- Axe methodologie -------------------------------------------------
    if ecart_type > 4.5:
        recommandations.append(
            _reco(
                "Accompagnement methodologique",
                f"Les resultats sont tres irreguliers (ecart-type {ecart_type:.2f}). Ce profil traduit "
                "generalement un travail par a-coups plutot qu'un manque de capacites : l'enjeu est "
                "l'organisation et la planification des revisions, pas le niveau.",
                "methodologie",
                IMPORTANT,
                f"Ecart-type des notes {ecart_type:.2f} (seuil : 4.5)",
                "Referent methodologie",
            )
        )

    # --- Axe dynamique ----------------------------------------------------
    if tendance < -0.6:
        recommandations.append(
            _reco(
                "Entretien de prevention du decrochage",
                f"Les notes baissent regulierement ({tendance:.2f} point par evaluation). Une "
                "degradation continue precede souvent un abandon. Un entretien individuel doit "
                "identifier l'element declencheur avant que l'ecart ne devienne irrattrapable.",
                "suivi",
                URGENT,
                f"Tendance {tendance:.2f} pt/evaluation",
                "Responsable pedagogique",
            )
        )
    elif tendance < -0.25:
        recommandations.append(
            _reco(
                "Point de situation individuel",
                f"Une legere degradation est observee ({tendance:.2f} point par evaluation). Un "
                "echange court permet de verifier qu'il ne s'agit pas du debut d'un desengagement.",
                "suivi",
                IMPORTANT,
                f"Tendance {tendance:.2f} pt/evaluation",
                "Enseignant referent",
            )
        )
    elif tendance > 0.5 and moyenne < 11:
        recommandations.append(
            _reco(
                "Encourager la dynamique engagee",
                f"Malgre une moyenne encore fragile, la progression est nette ({tendance:+.2f} point "
                "par evaluation). Signaler explicitement cette amelioration a l'etudiant : la "
                "reconnaissance du progres est un facteur de persistance documente.",
                "valorisation",
                PREVENTIF,
                f"Tendance {tendance:+.2f} pt/evaluation",
                "Enseignant referent",
            )
        )

    # --- Chute recente ----------------------------------------------------
    if moyenne_recente < moyenne - 2.5:
        recommandations.append(
            _reco(
                "Verifier un evenement recent",
                f"Le dernier semestre ({moyenne_recente:.2f}/20) est nettement en dessous de la moyenne "
                f"historique ({moyenne:.2f}/20). Une rupture aussi marquee est rarement academique : "
                "verifier la situation personnelle, sanitaire ou financiere de l'etudiant.",
                "suivi",
                URGENT,
                f"Ecart de {moyenne - moyenne_recente:.2f} points avec l'historique",
                "Service social / Responsable pedagogique",
            )
        )

    # --- Fiabilite de la prediction ---------------------------------------
    if nb_evaluations < 3:
        recommandations.append(
            _reco(
                "Completer le dossier d'evaluation",
                f"Seulement {int(nb_evaluations)} note(s) enregistree(s). La prediction reste indicative "
                "tant que le dossier n'est pas plus fourni : elle ne doit pas fonder de decision "
                "individuelle a ce stade.",
                "orientation",
                PREVENTIF,
                f"{int(nb_evaluations)} evaluation(s) disponible(s)",
                "Enseignants de la classe",
            )
        )

    # --- Cas favorable ----------------------------------------------------
    if not recommandations and niveau_risque == "faible":
        recommandations.append(
            _reco(
                "Aucune action corrective necessaire",
                f"Le profil est solide (probabilite de reussite {probabilite:.0%}). L'etudiant peut "
                "etre sollicite comme tuteur aupres de camarades en difficulte : le tutorat par les "
                "pairs beneficie aussi au tuteur.",
                "valorisation",
                PREVENTIF,
                "Aucun facteur de risque detecte",
                "Responsable pedagogique",
            )
        )

    ordre_categories = list(CATEGORIES.values())
    return sorted(
        recommandations,
        key=lambda r: (r["priorite"], ordre_categories.index(r["categorie"])),
    )


def libelle_priorite(priorite: int) -> str:
    return {URGENT: "Urgent", IMPORTANT: "Important", PREVENTIF: "Preventif"}.get(priorite, "Preventif")
