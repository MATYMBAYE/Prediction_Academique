"""
Explicabilite des predictions (XAI - eXplainable AI).

--------------------------------------------------------------------------
LE PROBLEME
--------------------------------------------------------------------------
Une foret aleatoire de 400 arbres est une boite noire. Annoncer a un
enseignant "cet etudiant a 31 % de chances de reussir" sans justification
est inutilisable en pratique : personne ne convoque un etudiant sur la foi
d'un nombre qu'il ne comprend pas. Pire, un systeme opaque qui se trompe
detruit la confiance dans l'outil entier.

--------------------------------------------------------------------------
LA METHODE : ABLATION CONTREFACTUELLE
--------------------------------------------------------------------------
Pour chaque variable j, on pose la question :

    "Quelle serait la probabilite de reussite de cet etudiant si, TOUTES
     CHOSES EGALES PAR AILLEURS, sa variable j etait celle d'un etudiant
     median de l'etablissement ?"

La contribution de la variable j est l'ecart :

    contribution_j = P(reussite | profil reel)
                   - P(reussite | profil reel, variable j remplacee par la reference)

  contribution_j > 0 : cette variable POUSSE le score vers le haut
  contribution_j < 0 : cette variable TIRE le score vers le bas

C'est le principe des valeurs de Shapley, restreint aux contributions
individuelles (sans les coalitions). Ce choix est assume :

  + calcul exact et immediat (7 appels au modele, pas d'echantillonnage)
  + aucune dependance externe (pas de bibliotheque shap a installer)
  + directement traduisible en francais pour un utilisateur non technique
  - les effets d'interaction ne sont pas decomposes : si moyenne faible ET
    assiduite faible se renforcent mutuellement, l'effet conjoint est
    reparti entre les deux plutot qu'isole.

Cette limite est acceptable ici : l'objectif est d'orienter une action
pedagogique, pas de produire une attribution causale exacte.
"""
from __future__ import annotations

from app.ml.features import (
    FEATURE_COLUMNS,
    FEATURE_LABELS,
    REFERENCE_PROFILE,
    format_feature_value,
)

# En dessous de ce seuil, l'ecart n'est pas significatif et n'est pas montre :
# afficher "cette variable change le score de 0,3 %" ajoute du bruit.
SEUIL_CONTRIBUTION_SIGNIFICATIVE = 0.015

# --------------------------------------------------------------------------
# SENS DE LECTURE DE CHAQUE VARIABLE
# --------------------------------------------------------------------------
# Point d'attention important : le SIGNE DE LA CONTRIBUTION et la QUALITE DE
# LA VALEUR sont deux choses distinctes. Une foret aleatoire peut attribuer
# une contribution legerement negative a une excellente valeur (effet de
# seuil dans les arbres, interaction avec une autre variable).
#
# Rediger la phrase a partir du signe de la contribution produit alors des
# absurdites du type "les resultats sont irreguliers (ecart-type 0.99)" alors
# que 0.99 est au contraire tres regulier.
#
# La phrase est donc choisie en comparant la VALEUR au profil de reference,
# tandis que la contribution reste affichee separement comme impact chiffre.
#
# True  = une valeur elevee est favorable (moyenne, assiduite, progression)
# False = une valeur elevee est defavorable (absences, irregularite, echecs)
PLUS_EST_MIEUX = {
    "moyenne_generale": True,
    "moyenne_recente": True,
    "taux_assiduite": True,
    "tendance": True,
    "ecart_type_notes": False,
    "taux_notes_faibles": False,
    "nb_absences": False,
}

# Ecart relatif en deca duquel la valeur est consideree conforme a la moyenne
# de l'etablissement (ni bonne ni mauvaise).
TOLERANCE_NEUTRE = 0.12

# Formulations neutres, utilisees quand la valeur est proche de la reference.
PHRASES_NEUTRES = {
    "moyenne_generale": "La moyenne generale ({valeur}) se situe dans la moyenne de l'etablissement.",
    "moyenne_recente": "Les resultats du dernier semestre ({valeur}) sont conformes a la moyenne.",
    "taux_assiduite": "L'assiduite ({valeur}) correspond a la moyenne de l'etablissement.",
    "ecart_type_notes": "La regularite des resultats ({valeur}) est dans la norme.",
    "taux_notes_faibles": "La part de notes sous la moyenne ({valeur}) est dans la norme.",
    "tendance": "Les resultats sont stables ({valeur}), sans progression ni degradation marquee.",
    "nb_absences": "Le nombre d'absences ({valeur}) correspond a la moyenne observee.",
}

# Formulations metier. Le premier element decrit une valeur favorable, le
# second une valeur defavorable.
PHRASES = {
    "moyenne_generale": (
        "La moyenne generale ({valeur}) est superieure au niveau attendu et soutient la reussite.",
        "La moyenne generale ({valeur}) est inferieure au niveau attendu et fragilise le dossier.",
    ),
    "moyenne_recente": (
        "Les resultats du dernier semestre ({valeur}) sont solides et confirment la dynamique.",
        "Les resultats du dernier semestre ({valeur}) sont en retrait, signe d'une difficulte actuelle.",
    ),
    "taux_assiduite": (
        "L'assiduite ({valeur}) est bonne : la presence en cours est un facteur de reussite majeur.",
        "L'assiduite ({valeur}) est insuffisante, ce qui pese lourdement sur les chances de reussite.",
    ),
    "ecart_type_notes": (
        "Les resultats sont reguliers ({valeur}), signe d'un travail constant.",
        "Les resultats sont irreguliers ({valeur}) : de fortes variations entre les evaluations.",
    ),
    "taux_notes_faibles": (
        "Peu de notes sous la moyenne ({valeur} des evaluations).",
        "Une part importante des notes est sous la moyenne ({valeur} des evaluations).",
    ),
    "tendance": (
        "La progression est positive ({valeur}) : l'etudiant s'ameliore au fil des evaluations.",
        "La tendance est a la baisse ({valeur}) : signal possible de decrochage.",
    ),
    "nb_absences": (
        "Le nombre d'absences reste contenu ({valeur}).",
        "Le nombre d'absences est eleve ({valeur}) et compromet le suivi des enseignements.",
    ),
}


def _qualifier_valeur(colonne: str, valeur: float) -> str:
    """Compare la valeur au profil de reference et retourne son appreciation.

    Returns: 'favorable' | 'defavorable' | 'neutre'
    """
    reference = REFERENCE_PROFILE[colonne]

    # Ecart relatif a la reference. Le denominateur protege des divisions par
    # zero pour les variables dont la reference vaut 0 (la tendance).
    denominateur = abs(reference) if abs(reference) > 1e-6 else 1.0
    ecart_relatif = (valeur - reference) / denominateur

    if abs(ecart_relatif) < TOLERANCE_NEUTRE:
        return "neutre"

    valeur_superieure = ecart_relatif > 0
    if PLUS_EST_MIEUX[colonne]:
        return "favorable" if valeur_superieure else "defavorable"
    return "defavorable" if valeur_superieure else "favorable"


def expliquer_prediction(modele, features: dict, probabilite: float) -> list:
    """Calcule et redige les contributions de chaque variable.

    Args:
        modele: modele calibre exposant predict_proba.
        features: dict des 7 variables de l'etudiant.
        probabilite: probabilite de reussite deja calculee (evite un recalcul).

    Returns:
        Liste de dicts triee par impact decroissant :
            variable, libelle, valeur, valeur_formatee, valeur_reference,
            contribution, impact_points, sens, appreciation, texte
    """
    import pandas as pd

    vecteur_reel = [float(features[col]) for col in FEATURE_COLUMNS]

    # Un seul appel groupe au modele : 7 profils contrefactuels d'un coup.
    profils = []
    for index in range(len(FEATURE_COLUMNS)):
        profil = list(vecteur_reel)
        profil[index] = REFERENCE_PROFILE[FEATURE_COLUMNS[index]]
        profils.append(profil)

    matrice = pd.DataFrame(profils, columns=FEATURE_COLUMNS)
    probabilites_contrefactuelles = modele.predict_proba(matrice)[:, 1]

    contributions = []
    for index, colonne in enumerate(FEATURE_COLUMNS):
        ecart = float(probabilite) - float(probabilites_contrefactuelles[index])
        if abs(ecart) < SEUIL_CONTRIBUTION_SIGNIFICATIVE:
            continue

        valeur = features[colonne]
        valeur_formatee = format_feature_value(colonne, valeur)

        # La phrase decrit la VALEUR (est-elle bonne ?), la contribution
        # chiffre l'IMPACT sur le score. Les deux peuvent diverger, et c'est
        # une information utile : elle signale un effet d'interaction.
        appreciation = _qualifier_valeur(colonne, valeur)
        if appreciation == "neutre":
            texte = PHRASES_NEUTRES[colonne].format(valeur=valeur_formatee)
        else:
            texte = PHRASES[colonne][0 if appreciation == "favorable" else 1].format(
                valeur=valeur_formatee
            )

        contributions.append(
            {
                "variable": colonne,
                "libelle": FEATURE_LABELS[colonne],
                "valeur": round(float(valeur), 3),
                "valeur_formatee": valeur_formatee,
                "valeur_reference": REFERENCE_PROFILE[colonne],
                "contribution": round(ecart, 4),
                "impact_points": round(ecart * 100, 1),
                # `sens` decrit l'effet sur le score calcule par le modele
                "sens": "positif" if ecart > 0 else "negatif",
                # `appreciation` decrit la qualite de la valeur elle-meme
                "appreciation": appreciation,
                "texte": texte,
            }
        )

    return sorted(contributions, key=lambda c: abs(c["contribution"]), reverse=True)


def resumer_explication(contributions: list, probabilite: float) -> str:
    """Redige une synthese d'une a deux phrases pour l'en-tete de la fiche.

    La synthese s'appuie sur l'APPRECIATION des valeurs (favorable /
    defavorable) plutot que sur le signe des contributions : elle doit
    decrire la situation de l'etudiant, pas la mecanique interne du modele.
    """
    defavorables = [c for c in contributions if c["appreciation"] == "defavorable"]
    favorables = [c for c in contributions if c["appreciation"] == "favorable"]

    if not contributions:
        return (
            "Le profil de cet etudiant est proche de la moyenne de l'etablissement : "
            "aucun facteur ne se demarque nettement."
        )

    if probabilite >= 0.65:
        if favorables:
            moteurs = " et ".join(c["libelle"].lower() for c in favorables[:2])
            phrase = f"Situation favorable, portee principalement par {moteurs}."
            if defavorables:
                phrase += f" Point de vigilance : {defavorables[0]['libelle'].lower()}."
            return phrase
        return "Situation favorable, sans facteur de risque marquant."

    if probabilite >= 0.45:
        if defavorables:
            freins = " et ".join(c["libelle"].lower() for c in defavorables[:2])
            phrase = f"Situation intermediaire. Les freins identifies sont {freins}."
            if favorables:
                phrase += f" Appui possible sur : {favorables[0]['libelle'].lower()}."
            return phrase
        return "Situation intermediaire, sans facteur dominant."

    if defavorables:
        freins = ", ".join(c["libelle"].lower() for c in defavorables[:3])
        phrase = f"Situation preoccupante. Facteurs determinants : {freins}."
        if favorables:
            phrase += f" Levier a mobiliser : {favorables[0]['libelle'].lower()}."
        return phrase
    return "Situation preoccupante, sans facteur unique clairement dominant."
