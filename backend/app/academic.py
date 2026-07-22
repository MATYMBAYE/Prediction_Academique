"""Constantes du cursus academique : cycle Licence + Master, 10 semestres.

Decoupage retenu (cf. demande utilisateur) : L1(S1-S2), L2(S3-S4), L3(S5-S6),
M1(S7-S8), M2(S9-S10).
"""

NIVEAUX = ["L1", "L2", "L3", "M1", "M2"]

SEMESTRES_PAR_NIVEAU = {
    "L1": ["S1", "S2"],
    "L2": ["S3", "S4"],
    "L3": ["S5", "S6"],
    "M1": ["S7", "S8"],
    "M2": ["S9", "S10"],
}

ALL_SEMESTRES = [s for niveau in NIVEAUX for s in SEMESTRES_PAR_NIVEAU[niveau]]

NIVEAU_PAR_SEMESTRE = {s: niveau for niveau, semestres in SEMESTRES_PAR_NIVEAU.items() for s in semestres}


def semestres_valides(niveau: str) -> list:
    return SEMESTRES_PAR_NIVEAU.get(niveau, [])
