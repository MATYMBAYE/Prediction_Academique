"""Generation de rapports PDF (§3.5) a partir de fpdf2 (pas de dependance
native, compatible avec toute version de Python)."""
from datetime import datetime

from fpdf import FPDF

ENCRE_NOCTURNE = (27, 42, 74)
BRUME = (238, 241, 246)


def build_predictions_pdf(rows: list) -> bytes:
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*ENCRE_NOCTURNE)
    pdf.cell(0, 10, "ISI-SUPETCH - Rapport de predictions academiques", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 6, f"Genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')}", ln=True)
    pdf.ln(4)

    headers = ["Matricule", "Nom", "Prenom", "Filiere", "Niveau", "Classe", "Risque", "Prob. reussite", "Assiduite"]
    widths = [25, 30, 30, 35, 18, 35, 25, 28, 25]

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*ENCRE_NOCTURNE)
    pdf.set_text_color(255, 255, 255)
    for header, width in zip(headers, widths):
        pdf.cell(width, 8, header, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(30, 30, 30)
    fill = False
    for row in rows:
        values = [
            row["matricule"], row["nom"], row["prenom"], row["filiere"], row["niveau"],
            row["classe"], row["niveau_risque"], row["probabilite_reussite"], row["taux_assiduite_moyen"],
        ]
        if fill:
            pdf.set_fill_color(*BRUME)
        else:
            pdf.set_fill_color(255, 255, 255)
        for value, width in zip(values, widths):
            pdf.cell(width, 7, str(value), border=1, fill=True)
        pdf.ln()
        fill = not fill

    return bytes(pdf.output())
