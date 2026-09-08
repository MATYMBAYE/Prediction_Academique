from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models import DemandeRattrapage, DisponibilitePredefinie, DemandeDisponibilite, SeanceRattrapage, EtudiantSeance, Student, Teacher, Classe, Prediction
from datetime import datetime, time, date

bp = Blueprint("rattrapage", __name__, url_prefix="/rattrapage")

# --- ETUDIANT ---

@bp.route("/student/demandes", methods=["POST"])
def submit_demande():
    data = request.json
    student_id = data.get("student_id")
    matiere = data.get("matiere")
    
    if not student_id or not matiere:
        return jsonify({"error": "student_id et matiere sont requis."}), 400
        
    # Check if already requested
    existing = DemandeRattrapage.query.filter_by(student_id=student_id, matiere=matiere, statut="en_attente").first()
    if existing:
        return jsonify({"error": "Vous avez déjà une demande en attente pour ce module."}), 400
        
    demande = DemandeRattrapage(student_id=student_id, matiere=matiere)
    db.session.add(demande)
    db.session.commit()
    
    return jsonify({"message": "Demande de rattrapage envoyée avec succès.", "demande": demande.to_dict()}), 201

@bp.route("/student/seances/<int:student_id>", methods=["GET"])
def get_student_seances(student_id):
    seances_etudiant = EtudiantSeance.query.filter_by(student_id=student_id).all()
    seances = []
    for es in seances_etudiant:
        if es.seance.statut != "annulee":
            seances.append(es.seance.to_dict())
    return jsonify(seances)

# --- ADMIN ---

@bp.route("/admin/recommandations", methods=["GET"])
def get_recommandations():
    # Agrégation des demandes et prédictions
    # 1. Regrouper les étudiants à risque par matière
    predictions_eleve = Prediction.query.filter(Prediction.niveau_risque.in_(["eleve", "moyen"])).all()
    
    modules = {}
    for p in predictions_eleve:
        # TODO: Here matiere is not directly in prediction (prediction is general per student/semestre)
        # Assuming predictions affect global risk. But we need to know WHICH module.
        # For simplicity, if we don't have module-level risk, we assume 'Base de données' for testing
        # Let's mock or use the student's current grades to find weak modules?
        pass
        
    # As a simple implementation for now: we count DemandeRattrapage by matiere
    demandes = DemandeRattrapage.query.filter_by(statut="en_attente").all()
    
    for d in demandes:
        if d.matiere not in modules:
            modules[d.matiere] = {"matiere": d.matiere, "demandes": 0, "etudiants_a_risque": 0}
        modules[d.matiere]["demandes"] += 1
        
    # Simulate risk (ideally join with Grades/Predictions)
    for m in modules.values():
        m["etudiants_a_risque"] = m["demandes"] + 2 # Mock formula for demo
        # Calculate priority
        if m["etudiants_a_risque"] > 10:
            m["priorite"] = "elevee"
        elif m["etudiants_a_risque"] > 5:
            m["priorite"] = "moyenne"
        else:
            m["priorite"] = "faible"
            
        m["statut"] = "a_programmer"
        
    return jsonify(list(modules.values()))

@bp.route("/admin/disponibilite/demander", methods=["POST"])
def demander_disponibilite():
    data = request.json
    teacher_id = data.get("teacher_id")
    matiere = data.get("matiere")
    classe_id = data.get("classe_id")
    date_prop_str = data.get("date_proposee")
    heure_debut_str = data.get("heure_debut")
    heure_fin_str = data.get("heure_fin")
    
    demande = DemandeDisponibilite(
        teacher_id=teacher_id,
        matiere=matiere,
        classe_id=classe_id,
        date_proposee=datetime.strptime(date_prop_str, "%Y-%m-%d").date() if date_prop_str else None,
        heure_debut=datetime.strptime(heure_debut_str, "%H:%M").time() if heure_debut_str else None,
        heure_fin=datetime.strptime(heure_fin_str, "%H:%M").time() if heure_fin_str else None,
    )
    db.session.add(demande)
    db.session.commit()
    
    return jsonify({"message": "Demande envoyée", "demande": demande.to_dict()}), 201

@bp.route("/admin/programmer", methods=["POST"])
def programmer_seance():
    data = request.json
    
    seance = SeanceRattrapage(
        matiere=data["matiere"],
        classe_id=data["classe_id"],
        teacher_id=data["teacher_id"],
        date_seance=datetime.strptime(data["date_seance"], "%Y-%m-%d").date(),
        heure_debut=datetime.strptime(data["heure_debut"], "%H:%M").time(),
        heure_fin=datetime.strptime(data["heure_fin"], "%H:%M").time(),
        salle=data["salle"],
        capacite=data.get("capacite", 30)
    )
    
    # Simple Conflict Check
    conflit = SeanceRattrapage.query.filter_by(
        date_seance=seance.date_seance,
        salle=seance.salle,
        statut="programmee"
    ).filter(
        (SeanceRattrapage.heure_debut < seance.heure_fin) &
        (SeanceRattrapage.heure_fin > seance.heure_debut)
    ).first()
    
    if conflit:
        return jsonify({"error": "La salle est déjà réservée à cet horaire."}), 409
        
    db.session.add(seance)
    db.session.commit()
    
    # Mark student requests as programmed
    if "student_ids" in data:
        for sid in data["student_ids"]:
            es = EtudiantSeance(student_id=sid, seance_id=seance.id)
            db.session.add(es)
            
            # Update their demande
            d = DemandeRattrapage.query.filter_by(student_id=sid, matiere=data["matiere"]).first()
            if d:
                d.statut = "programmee"
                
    db.session.commit()
    
    return jsonify({"message": "Séance programmée avec succès", "seance": seance.to_dict()}), 201


# --- TEACHER ---

@bp.route("/teacher/demandes/<int:teacher_id>", methods=["GET"])
def get_teacher_demandes(teacher_id):
    demandes = DemandeDisponibilite.query.filter_by(teacher_id=teacher_id).all()
    return jsonify([d.to_dict() for d in demandes])

@bp.route("/teacher/demandes/<int:demande_id>/repondre", methods=["POST"])
def repondre_demande(demande_id):
    data = request.json
    demande = DemandeDisponibilite.query.get_or_404(demande_id)
    
    reponse = data.get("reponse") # 'acceptee', 'refusee', 'proposition'
    
    if reponse == "acceptee":
        demande.statut = "acceptee"
    elif reponse == "refusee":
        demande.statut = "refusee"
        demande.motif_refus = data.get("motif_refus")
    elif reponse == "proposition":
        demande.statut = "proposition"
        demande.proposition_date = datetime.strptime(data["proposition_date"], "%Y-%m-%d").date()
        demande.proposition_heure_debut = datetime.strptime(data["proposition_heure_debut"], "%H:%M").time()
        demande.proposition_heure_fin = datetime.strptime(data["proposition_heure_fin"], "%H:%M").time()
        
    db.session.commit()
    return jsonify(demande.to_dict())
