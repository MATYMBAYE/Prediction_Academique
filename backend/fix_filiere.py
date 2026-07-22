"""
Script pour corriger le nom de la filiere RT en base de donnees.
Remplace "Reseaux et Telecoms" / "Reseau Telecom" par "Reseaux Informatiques".
"""
from app import create_app
from app.extensions import db
from app.models import Filiere, Classe

def fix_filiere():
    app = create_app()
    with app.app_context():
        # Chercher la filiere avec code "RT" ou contenant "Telecom"
        filiere = Filiere.query.filter(
            (Filiere.code == "RT") |
            (Filiere.nom.ilike("%Telecom%")) |
            (Filiere.nom.ilike("%Reseau Telecom%"))
        ).first()

        if filiere:
            ancien_nom = filiere.nom
            ancien_code = filiere.code
            print(f"Filiere trouvee : {filiere.nom} ({filiere.code}) [id={filiere.id}]")

            filiere.nom = "Reseaux Informatiques"
            filiere.code = "RI"

            # Mettre a jour le nom des classes associees (ex: "RT - L1" -> "RI - L1")
            classes = Classe.query.filter_by(filiere_id=filiere.id).all()
            for classe in classes:
                if classe.nom:
                    classe.nom = classe.nom.replace(ancien_code, "RI")
                    print(f"  Classe mise a jour : {classe.nom}")

            db.session.commit()
            print(f"\nFiliere mise a jour avec succes :")
            print(f"  Nom  : {ancien_nom} -> {filiere.nom}")
            print(f"  Code : {ancien_code} -> {filiere.code}")
        else:
            print("Aucune filiere 'Reseau Telecom' / 'RT' trouvee.")
            print("Filieres existantes :")
            for f in Filiere.query.all():
                print(f"  - {f.nom} ({f.code}) [id={f.id}]")

if __name__ == "__main__":
    fix_filiere()
