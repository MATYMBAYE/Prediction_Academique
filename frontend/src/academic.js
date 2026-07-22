export const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"];

export const SEMESTRES_PAR_NIVEAU = {
  L1: ["S1", "S2"],
  L2: ["S3", "S4"],
  L3: ["S5", "S6"],
  M1: ["S7", "S8"],
  M2: ["S9", "S10"],
};

export const ALL_SEMESTRES = NIVEAUX.flatMap((n) => SEMESTRES_PAR_NIVEAU[n]);
