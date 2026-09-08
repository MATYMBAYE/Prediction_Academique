import { useState, useRef } from "react";
import client from "../../api/client.js";
import { Modale } from "../ui/Feedback.jsx";
import { Bouton, Badge } from "../ui/Primitives.jsx";
import Icone from "../ui/Icons.jsx";

export default function GradeExcelImportModal({
  ouverte,
  onFermer,
  onSucces,
  classeId = "",
  classeNom = "",
  matiere = "",
  typeEvaluation = "examen",
  semestre = "S1",
  anneeAcademique = "",
}) {
  const [fichier, setFichier] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const inputRef = useRef(null);

  const handleTelechargerModeleClasse = async () => {
    try {
      const response = await client.get("/grades/template-classe", {
        params: {
          classe_id: classeId,
          matiere,
          type_evaluation: typeEvaluation,
          semestre,
        },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `modele_notes_${classeNom || "classe"}_${matiere || "matiere"}_${semestre}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Erreur téléchargement modèle classe", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFichier(file);
      setErreur("");
      setResultat(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFichier(file);
      setErreur("");
      setResultat(null);
    }
  };

  const handleImporter = async (e) => {
    e.preventDefault();
    if (!fichier) {
      setErreur("Veuillez sélectionner un fichier Excel (.xlsx) ou CSV.");
      return;
    }

    setChargement(true);
    setErreur("");
    setResultat(null);

    const formData = new FormData();
    formData.append("file", fichier);
    if (classeId) formData.append("classe_id", String(classeId));
    if (matiere) formData.append("matiere", matiere);
    if (typeEvaluation) formData.append("type_evaluation", typeEvaluation);
    if (semestre) formData.append("semestre", semestre);

    try {
      const { data } = await client.post("/grades/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResultat(data);
      if (onSucces) onSucces(data);
    } catch (err) {
      setErreur(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Une erreur est survenue lors de l'importation."
      );
    } finally {
      setChargement(false);
    }
  };

  const reinitialiser = () => {
    setFichier(null);
    setResultat(null);
    setErreur("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={() => {
        reinitialiser();
        onFermer();
      }}
      titre={`Importer les notes — ${classeNom || "Classe"}`}
      sousTitre={`Matière : ${matiere || "—"} · Évaluation : ${typeEvaluation} · Semestre : ${semestre}`}
      taille="lg"
    >
      <div className="space-y-5">
        {/* Rappel du contexte & téléchargement du modèle pré-rempli */}
        <div className="rounded-xl border border-isi-bleu/20 bg-isi-bleu/5 p-4 text-xs text-ardoise-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-isi-bleu-fonce">
                Modèle Excel / CSV pré-rempli pour la classe :
              </p>
              <p className="mt-1 text-2xs text-ardoise-600">
                Le modèle contient déjà les <strong>matricules</strong>, <strong>noms</strong> et <strong>prénoms</strong> de tous les étudiants de <strong>{classeNom}</strong>.
                Il vous suffit de compléter la colonne <strong>Note</strong> (entre 0 et 20).
              </p>
            </div>
            {classeId && (
              <Bouton
                variante="secondaire"
                taille="sm"
                icone={Icone.Telecharger}
                onClick={handleTelechargerModeleClasse}
                className="shrink-0 text-xs shadow-sm bg-white"
              >
                Télécharger modèle de la classe
              </Bouton>
            )}
          </div>
        </div>

        {/* Zone de glisser-déposer */}
        {!resultat && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              fichier
                ? "border-isi-bleu bg-isi-bleu/5"
                : "border-ardoise-300 hover:border-isi-bleu hover:bg-ardoise-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="grid h-12 w-12 place-items-center rounded-full bg-isi-bleu/10 text-isi-bleu mb-2">
              <Icone.Notes className="h-6 w-6" />
            </div>
            {fichier ? (
              <div>
                <p className="text-sm font-semibold text-encre-900">{fichier.name}</p>
                <p className="text-xs text-ardoise-500">
                  {(fichier.size / 1024).toFixed(1)} Ko — Cliquez pour changer de fichier
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-encre-900">
                  Glissez-déposez le fichier complété ici (.xlsx ou .csv)
                </p>
                <p className="text-xs text-ardoise-500 mt-1">
                  Le système vérifiera les matricules, l'appartenance à la classe et les doublons
                </p>
              </div>
            )}
          </div>
        )}

        {/* Erreurs éventuelles */}
        {erreur && (
          <div className="rounded-lg border border-brique-300 bg-brique-50 p-3 text-xs text-brique-700">
            <div className="flex items-center gap-2 font-semibold">
              <Icone.Alerte className="h-4 w-4 shrink-0" />
              <span>Erreur lors du traitement</span>
            </div>
            <p className="mt-1">{erreur}</p>
          </div>
        )}

        {/* Résultat de l'importation */}
        {resultat && (
          <div className="space-y-3 animate-fondu-simple">
            <div className="rounded-lg border border-emeraude-300 bg-emeraude-50 p-3.5 text-xs text-emeraude-800">
              <div className="flex items-center gap-2 font-semibold text-sm text-emeraude-900">
                <Icone.Valide className="h-4 w-4 shrink-0 text-emeraude-600" />
                <span>{resultat.message}</span>
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <span>
                  <strong>{resultat.total_enregistres ?? resultat.total_importes}</strong> note(s) enregistrée(s)
                </span>
                {resultat.total_erreurs > 0 && (
                  <span className="text-brique-700 font-semibold">
                    <strong>{resultat.total_erreurs}</strong> erreur(s)
                  </span>
                )}
              </div>
            </div>

            {resultat.erreurs?.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-brique-200 bg-white p-3 text-xs">
                <p className="font-semibold text-brique-700 mb-2">Détail des erreurs détectées :</p>
                <ul className="space-y-1 divide-y divide-ardoise-100">
                  {resultat.erreurs.map((err, idx) => (
                    <li key={idx} className="pt-1 text-ardoise-700 flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="font-medium text-encre-900">
                        Ligne {err.ligne} ({err.matricule || "—"}) :
                      </span>
                      <span className="text-brique-600">{err.erreur}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={reinitialiser}
              >
                Importer un autre fichier
              </Bouton>
              <Bouton
                variante="primaire"
                taille="sm"
                onClick={() => {
                  reinitialiser();
                  onFermer();
                }}
              >
                Fermer & Actualiser
              </Bouton>
            </div>
          </div>
        )}

        {/* Actions principales avant importation */}
        {!resultat && (
          <div className="flex justify-end gap-2 border-t border-ardoise-200 pt-4">
            <Bouton
              variante="secondaire"
              onClick={() => {
                reinitialiser();
                onFermer();
              }}
              disabled={chargement}
            >
              Annuler
            </Bouton>
            <Bouton
              variante="primaire"
              icone={Icone.Notes}
              chargement={chargement}
              disabled={!fichier}
              onClick={handleImporter}
            >
              Valider et Importer les notes
            </Bouton>
          </div>
        )}
      </div>
    </Modale>
  );
}
