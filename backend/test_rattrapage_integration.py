import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models import User, Student, Teacher, TeacherAssignment, DemandeRattrapage

app = create_app()

with app.app_context():
    print("Testing Rattrapage Backend Flow...")
    student = Student.query.first()
    teacher = Teacher.query.first()
    
    if not student or not teacher:
        print("No student or teacher found for test.")
        sys.exit(0)
        
    print(f"Testing with Student: {student.prenom} {student.nom} (classe_id={student.classe_id})")
    print(f"Testing with Teacher: {teacher.prenom} {teacher.nom} (id={teacher.id})")
    
    # Ensure an assignment exists
    assignment = TeacherAssignment.query.filter_by(classe_id=student.classe_id).first()
    if not assignment:
        assignment = TeacherAssignment(teacher_id=teacher.id, classe_id=student.classe_id, matiere="Algorithmique")
        db.session.add(assignment)
        db.session.commit()
        print(f"Created test assignment: {assignment.matiere}")
    else:
        print(f"Using assignment: {assignment.matiere} with teacher_id={assignment.teacher_id}")

    # Create test demande
    demande = DemandeRattrapage(
        student_id=student.id,
        teacher_id=assignment.teacher_id,
        matiere=assignment.matiere,
        motif="Difficultés de compréhension sur les pointeurs",
        message="Bonjour, je souhaiterais une séance pour revoir les exercices du TD3.",
        statut="en_attente"
    )
    db.session.add(demande)
    db.session.commit()
    print(f"Created test DemandeRattrapage ID={demande.id}, statut={demande.statut}")

    # Teacher processes and plans
    demande.statut = "planifiee"
    demande.reponse_enseignant = "Séance acceptée. Rendez-vous en salle 102."
    demande.salle_planifiee = "Salle 102"
    demande.a_nouvelle_reponse = True
    db.session.commit()
    
    # Verify to_dict()
    d_dict = demande.to_dict()
    assert d_dict["statut"] == "planifiee"
    assert d_dict["etudiant"] is not None
    assert d_dict["enseignant"] is not None
    assert d_dict["salle_planifiee"] == "Salle 102"
    assert d_dict["a_nouvelle_reponse"] is True
    print("Demande to_dict() verified successfully:", d_dict)

    # Clean up test record
    db.session.delete(demande)
    db.session.commit()
    print("Cleaned up test record. All backend checks PASSED!")
