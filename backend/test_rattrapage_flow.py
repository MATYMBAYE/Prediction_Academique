import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models import Student, Teacher, Classe, DemandeRattrapage, DemandeDisponibilite, SeanceRattrapage, EtudiantSeance

app = create_app()

with app.app_context():
    print("=== DEBUT DU TEST DE FLUX RATTRAPAGE ===")
    
    # 1. Recuperation de donnees de test
    student = Student.query.first()
    teacher = Teacher.query.first()
    classe = Classe.query.first()
    
    if not student or not teacher or not classe:
        print("Erreur : La base de donnees ne contient pas d'etudiant, d'enseignant ou de classe pour tester.")
        sys.exit(1)
        
    print(f"Etudiant de test : {student.prenom} {student.nom} (ID: {student.id})")
    print(f"Enseignant de test : {teacher.prenom} {teacher.nom} (ID: {teacher.id})")
    
    # 2. L'etudiant soumet une demande de rattrapage
    print("\n1. ETUDIANT : Demande de rattrapage en Base de donnees")
    demande = DemandeRattrapage(student_id=student.id, matiere="Base de donnees")
    db.session.add(demande)
    db.session.commit()
    print("   -> Demande ajoutee avec succes.")
    
    # 3. L'admin recupere les demandes
    demandes_attente = DemandeRattrapage.query.filter_by(statut="en_attente").all()
    print(f"\n2. ADMIN : Nombre de demandes en attente = {len(demandes_attente)}")
    
    # 4. L'admin demande la disponibilite a l'enseignant
    from datetime import date, time
    print("\n3. ADMIN : Demande de disponibilite a l'enseignant")
    demande_disp = DemandeDisponibilite(
        teacher_id=teacher.id,
        matiere="Base de donnees",
        classe_id=classe.id,
        date_proposee=date(2026, 8, 20),
        heure_debut=time(10, 0),
        heure_fin=time(13, 0)
    )
    db.session.add(demande_disp)
    db.session.commit()
    print("   -> Demande de disponibilite envoyee.")
    
    # 5. L'enseignant repond avec une proposition
    print("\n4. ENSEIGNANT : Repond 'proposition' pour une autre date")
    demande_disp.statut = "proposition"
    demande_disp.proposition_date = date(2026, 8, 22)
    demande_disp.proposition_heure_debut = time(14, 0)
    demande_disp.proposition_heure_fin = time(17, 0)
    db.session.commit()
    print("   -> Proposition envoyee : 22 aout 2026, 14h00-17h00.")
    
    # 6. L'admin programme la seance
    print("\n5. ADMIN : Programme la seance finale")
    seance = SeanceRattrapage(
        matiere="Base de donnees",
        classe_id=classe.id,
        teacher_id=teacher.id,
        date_seance=demande_disp.proposition_date,
        heure_debut=demande_disp.proposition_heure_debut,
        heure_fin=demande_disp.proposition_heure_fin,
        salle="Salle B204",
        capacite=30
    )
    db.session.add(seance)
    db.session.commit()
    print("   -> Seance creee.")
    
    # Inscription de l'etudiant
    etudiant_seance = EtudiantSeance(student_id=student.id, seance_id=seance.id)
    db.session.add(etudiant_seance)
    
    # Mise a jour statut demande
    demande.statut = "programmee"
    db.session.commit()
    print("   -> Etudiant inscrit et demande passee au statut 'programmee'.")
    
    # 7. Verification finale
    seances_etudiant = EtudiantSeance.query.filter_by(student_id=student.id).all()
    print(f"\n6. VERIFICATION : L'etudiant a {len(seances_etudiant)} seance(s) de rattrapage prevue(s).")
    for es in seances_etudiant:
        print(f"   - {es.seance.matiere} le {es.seance.date_seance} en {es.seance.salle} avec {es.seance.teacher.nom}")
        
    print("\n=== TEST TERMINE AVEC SUCCES ===")
    
    # Nettoyage
    db.session.delete(etudiant_seance)
    db.session.delete(seance)
    db.session.delete(demande_disp)
    db.session.delete(demande)
    db.session.commit()
    print("\n[Nettoyage : Donnees de test supprimees de la base de donnees]")

