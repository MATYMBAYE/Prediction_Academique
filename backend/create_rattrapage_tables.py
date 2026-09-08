import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models import DemandeRattrapage, DisponibilitePredefinie, DemandeDisponibilite, SeanceRattrapage, EtudiantSeance

app = create_app()

with app.app_context():
    print("Creating new rattrapage tables...")
    db.create_all()
    print("Tables created successfully.")
