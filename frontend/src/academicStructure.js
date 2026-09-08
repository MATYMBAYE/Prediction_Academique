/**
 * Structure académique officielle ISI SUPTECH
 * Domaines -> Filières -> Niveaux -> Matières (avec coefficient et typologie)
 */

export const DOMAINS_STRUCTURE = {
  genie_informatique: {
    label: "Génie Informatique",
    icon: "💻",
    filieres: {
      GL: {
        nom: "Génie Logiciel",
        code: "GL",
        niveaux: {
          L1: [
            { nom: "Algorithmique", code: "GL-L1-ALGO", coeff: 3.0, type: "fondamentale" },
            { nom: "Merise", code: "GL-L1-MER", coeff: 2.0, type: "fondamentale" },
            { nom: "Langage C", code: "GL-L1-C", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données", code: "GL-L1-BDD", coeff: 3.0, type: "fondamentale" },
            { nom: "Mathématiques", code: "GL-L1-MATH", coeff: 2.0, type: "transversale" },
            { nom: "Architecture des Ordinateurs", code: "GL-L1-ARCHI", coeff: 2.0, type: "fondamentale" },
            { nom: "Systèmes d'Exploitation", code: "GL-L1-SE", coeff: 2.0, type: "fondamentale" },
            { nom: "Anglais", code: "GL-L1-ANG", coeff: 1.0, type: "transversale" },
            { nom: "Développement Web (HTML/CSS/JS)", code: "GL-L1-WEB", coeff: 3.0, type: "fondamentale" },
          ],
          L2: [
            { nom: "POO Avancée Java", code: "GL-L2-JAVA", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données Avancées", code: "GL-L2-BDDA", coeff: 3.0, type: "fondamentale" },
            { nom: "UML", code: "GL-L2-UML", coeff: 2.0, type: "fondamentale" },
            { nom: "Réseaux Informatiques", code: "GL-L2-RES", coeff: 2.0, type: "fondamentale" },
            { nom: "Probabilités et Statistiques", code: "GL-L2-PROBA", coeff: 2.0, type: "transversale" },
            { nom: "Anglais", code: "GL-L2-ANG", coeff: 1.0, type: "transversale" },
            { nom: "Oracle", code: "GL-L2-ORA", coeff: 2.0, type: "fondamentale" },
          ],
          L3: [
            { nom: "Atelier Génie Logiciel", code: "GL-L3-AGL", coeff: 3.0, type: "fondamentale" },
            { nom: "Programmation Mobile", code: "GL-L3-MOB", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion de Projet Informatique (GPI)", code: "GL-L3-GPI", coeff: 2.0, type: "transversale" },
            { nom: "POO Avancée Java", code: "GL-L3-JAVA2", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données Avancées (SQL/PL-SQL)", code: "GL-L3-PLSQL", coeff: 3.0, type: "fondamentale" },
          ],
          M1: [
            { nom: "Architecture Logicielle Avancée", code: "GL-M1-ARCH", coeff: 3.0, type: "fondamentale" },
            { nom: "Intelligence Artificielle Appliquée", code: "GL-M1-IA", coeff: 3.0, type: "fondamentale" },
            { nom: "DevOps et Intégration Continue", code: "GL-M1-DEVOPS", coeff: 3.0, type: "fondamentale" },
            { nom: "Cloud Computing", code: "GL-M1-CLOUD", coeff: 2.0, type: "fondamentale" },
            { nom: "Méthodologies Agiles", code: "GL-M1-AGILE", coeff: 2.0, type: "transversale" },
            { nom: "Sécurité des Applications", code: "GL-M1-SECU", coeff: 2.0, type: "fondamentale" },
          ],
          M2: [
            { nom: "Ingénierie Logicielle Avancée", code: "GL-M2-ING", coeff: 3.0, type: "fondamentale" },
            { nom: "Machine Learning", code: "GL-M2-ML", coeff: 3.0, type: "fondamentale" },
            { nom: "Architecture des Systèmes Distribués", code: "GL-M2-DIST", coeff: 3.0, type: "fondamentale" },
            { nom: "Management de Projets IT", code: "GL-M2-MGT", coeff: 2.0, type: "transversale" },
            { nom: "Sécurité des SI", code: "GL-M2-SSI", coeff: 2.0, type: "fondamentale" },
            { nom: "Mémoire de Fin d'Études", code: "GL-M2-MEM", coeff: 5.0, type: "fondamentale" },
          ],
        },
      },
      IM: {
        nom: "Infographie et Multimédia",
        code: "IM",
        niveaux: {
          L1: [
            { nom: "Algorithmique", code: "IM-L1-ALGO", coeff: 2.0, type: "fondamentale" },
            { nom: "Introduction à l'Infographie", code: "IM-L1-INFOG", coeff: 3.0, type: "fondamentale" },
            { nom: "Arts Graphiques Numériques", code: "IM-L1-AGN", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données", code: "IM-L1-BDD", coeff: 2.0, type: "fondamentale" },
            { nom: "Mathématiques", code: "IM-L1-MATH", coeff: 2.0, type: "transversale" },
            { nom: "Systèmes d'Exploitation", code: "IM-L1-SE", coeff: 2.0, type: "transversale" },
          ],
          L2: [
            { nom: "Modélisation 3D", code: "IM-L2-3D", coeff: 3.0, type: "fondamentale" },
            { nom: "Traitement d'Image", code: "IM-L2-IMG", coeff: 3.0, type: "fondamentale" },
            { nom: "Développement Web", code: "IM-L2-WEB", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données", code: "IM-L2-BDD", coeff: 2.0, type: "fondamentale" },
            { nom: "Théorie des Couleurs", code: "IM-L2-COUL", coeff: 2.0, type: "transversale" },
            { nom: "Montage Vidéo", code: "IM-L2-VIDEO", coeff: 3.0, type: "fondamentale" },
          ],
          L3: [
            { nom: "Animation 2D/3D", code: "IM-L3-ANIM", coeff: 3.0, type: "fondamentale" },
            { nom: "Réalité Virtuelle/Augmentée", code: "IM-L3-VR", coeff: 3.0, type: "fondamentale" },
            { nom: "Design UX/UI", code: "IM-L3-UXUI", coeff: 3.0, type: "fondamentale" },
            { nom: "Effets Spéciaux", code: "IM-L3-VFX", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion de Projet Créatif", code: "IM-L3-PROJ", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      IG: {
        nom: "Informatique de Gestion",
        code: "IG",
        niveaux: {
          L1: [
            { nom: "Algorithmique", code: "IG-L1-ALGO", coeff: 3.0, type: "fondamentale" },
            { nom: "Comptabilité Générale", code: "IG-L1-COMPTA", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données", code: "IG-L1-BDD", coeff: 3.0, type: "fondamentale" },
            { nom: "Mathématiques Financières", code: "IG-L1-MATHF", coeff: 2.0, type: "transversale" },
            { nom: "Bureautique Avancée", code: "IG-L1-BUR", coeff: 2.0, type: "transversale" },
            { nom: "Anglais des Affaires", code: "IG-L1-ANG", coeff: 1.0, type: "transversale" },
          ],
          L2: [
            { nom: "Analyse Financière", code: "IG-L2-AFIN", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données de Gestion", code: "IG-L2-BDDG", coeff: 3.0, type: "fondamentale" },
            { nom: "ERP/Progiciels de Gestion", code: "IG-L2-ERP", coeff: 3.0, type: "fondamentale" },
            { nom: "Développement Web", code: "IG-L2-WEB", coeff: 2.0, type: "fondamentale" },
            { nom: "Fiscalité", code: "IG-L2-FISC", coeff: 2.0, type: "transversale" },
          ],
          L3: [
            { nom: "Systèmes d'Information de Gestion", code: "IG-L3-SIG", coeff: 3.0, type: "fondamentale" },
            { nom: "Business Intelligence", code: "IG-L3-BI", coeff: 3.0, type: "fondamentale" },
            { nom: "ERP Avancé", code: "IG-L3-ERPA", coeff: 3.0, type: "fondamentale" },
            { nom: "Audit Informatique", code: "IG-L3-AUDIT", coeff: 2.0, type: "transversale" },
            { nom: "Gestion de Projet", code: "IG-L3-PROJ", coeff: 2.0, type: "transversale" },
          ],
          M1: [
            { nom: "Data Warehousing", code: "IG-M1-DWH", coeff: 3.0, type: "fondamentale" },
            { nom: "Aide à la Décision", code: "IG-M1-DECIS", coeff: 3.0, type: "fondamentale" },
            { nom: "ERP Avancé (SAP)", code: "IG-M1-SAP", coeff: 3.0, type: "fondamentale" },
            { nom: "Gouvernance des SI", code: "IG-M1-GOUV", coeff: 2.0, type: "transversale" },
            { nom: "Management de Projet SI", code: "IG-M1-MGTSI", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      GDA: {
        nom: "Géomatique et Développement d'Application",
        code: "GDA",
        niveaux: {
          L3: [
            { nom: "Systèmes d'Information Géographique (SIG)", code: "GDA-L3-SIG", coeff: 3.0, type: "fondamentale" },
            { nom: "Télédétection", code: "GDA-L3-TELE", coeff: 3.0, type: "fondamentale" },
            { nom: "Développement d'Applications Géospatiales", code: "GDA-L3-DEVGEO", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données Spatiales", code: "GDA-L3-BDDSPAT", coeff: 3.0, type: "fondamentale" },
            { nom: "Cartographie Numérique", code: "GDA-L3-CARTO", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      MCD: {
        nom: "Marketing et Communication Digitale",
        code: "MCD",
        niveaux: {
          L3: [
            { nom: "Marketing Digital", code: "MCD-L3-MDIG", coeff: 3.0, type: "fondamentale" },
            { nom: "Community Management", code: "MCD-L3-CM", coeff: 3.0, type: "fondamentale" },
            { nom: "Web Analytics et SEO", code: "MCD-L3-SEO", coeff: 3.0, type: "fondamentale" },
            { nom: "Communication Visuelle", code: "MCD-L3-COMVIS", coeff: 2.0, type: "transversale" },
            { nom: "Stratégie de Contenu", code: "MCD-L3-STRAT", coeff: 2.0, type: "fondamentale" },
          ],
        },
      },
    },
  },
  reseaux_systemes: {
    label: "Réseaux & Systèmes",
    icon: "🌐",
    filieres: {
      RI: {
        nom: "Réseaux Informatiques",
        code: "RI",
        niveaux: {
          L1: [
            { nom: "Notions de Réseaux", code: "RI-L1-NOTRES", coeff: 3.0, type: "fondamentale" },
            { nom: "Systèmes d'Exploitation", code: "RI-L1-SE", coeff: 2.0, type: "fondamentale" },
            { nom: "Algorithmique", code: "RI-L1-ALGO", coeff: 2.0, type: "fondamentale" },
            { nom: "Mathématiques", code: "RI-L1-MATH", coeff: 2.0, type: "transversale" },
            { nom: "Électronique de Base", code: "RI-L1-ELEC", coeff: 2.0, type: "transversale" },
          ],
          L2: [
            { nom: "Architecture Réseaux (OSI/TCP-IP)", code: "RI-L2-OSI", coeff: 3.0, type: "fondamentale" },
            { nom: "Administration Système (Linux/Windows)", code: "RI-L2-ADMIN", coeff: 3.0, type: "fondamentale" },
            { nom: "Câblage et Infrastructure Réseau", code: "RI-L2-CAB", coeff: 2.0, type: "fondamentale" },
            { nom: "Bases de Données", code: "RI-L2-BDD", coeff: 2.0, type: "fondamentale" },
            { nom: "Programmation Réseau", code: "RI-L2-PROGRES", coeff: 2.0, type: "fondamentale" },
          ],
          L3: [
            { nom: "Administration Réseaux Avancée", code: "RI-L3-ADMA", coeff: 3.0, type: "fondamentale" },
            { nom: "Virtualisation", code: "RI-L3-VIRT", coeff: 3.0, type: "fondamentale" },
            { nom: "Routage et Switching (CCNA)", code: "RI-L3-CCNA", coeff: 3.0, type: "fondamentale" },
            { nom: "Sécurité des Réseaux", code: "RI-L3-SECRES", coeff: 3.0, type: "fondamentale" },
            { nom: "Supervision et Monitoring", code: "RI-L3-MONIT", coeff: 2.0, type: "fondamentale" },
          ],
          M1: [
            { nom: "Administration Systèmes Avancée", code: "RI-M1-ADMSA", coeff: 3.0, type: "fondamentale" },
            { nom: "Cloud Computing", code: "RI-M1-CLOUD", coeff: 3.0, type: "fondamentale" },
            { nom: "Virtualisation Avancée", code: "RI-M1-VIRTA", coeff: 3.0, type: "fondamentale" },
            { nom: "Sécurité des SI", code: "RI-M1-SSI", coeff: 3.0, type: "fondamentale" },
            { nom: "Data Center", code: "RI-M1-DC", coeff: 2.0, type: "fondamentale" },
          ],
          M2: [
            { nom: "Ingénierie Réseaux Avancée", code: "RI-M2-INGR", coeff: 3.0, type: "fondamentale" },
            { nom: "Sécurité des Systèmes Distribués", code: "RI-M2-SECDIST", coeff: 3.0, type: "fondamentale" },
            { nom: "Cloud et Virtualisation Avancée", code: "RI-M2-CLOUDV", coeff: 3.0, type: "fondamentale" },
            { nom: "Management de Projets Réseaux", code: "RI-M2-MGTR", coeff: 2.0, type: "transversale" },
            { nom: "Mémoire de Fin d'Études", code: "RI-M2-MEM", coeff: 5.0, type: "fondamentale" },
          ],
        },
      },
      RT: {
        nom: "Réseaux Télécoms",
        code: "RT",
        niveaux: {
          L1: [
            { nom: "Notions de Télécommunications", code: "RT-L1-NOTTEL", coeff: 3.0, type: "fondamentale" },
            { nom: "Systèmes d'Exploitation", code: "RT-L1-SE", coeff: 2.0, type: "fondamentale" },
            { nom: "Algorithmique", code: "RT-L1-ALGO", coeff: 2.0, type: "fondamentale" },
            { nom: "Mathématiques", code: "RT-L1-MATH", coeff: 2.0, type: "transversale" },
            { nom: "Électronique", code: "RT-L1-ELEC", coeff: 2.0, type: "transversale" },
          ],
          L2: [
            { nom: "Transmission de Données", code: "RT-L2-TRANSM", coeff: 3.0, type: "fondamentale" },
            { nom: "Réseaux Mobiles (GSM/3G/4G)", code: "RT-L2-MOBIL", coeff: 3.0, type: "fondamentale" },
            { nom: "Systèmes de Télécommunication", code: "RT-L2-SYSTEL", coeff: 3.0, type: "fondamentale" },
            { nom: "Électronique Numérique", code: "RT-L2-ELECNUM", coeff: 2.0, type: "transversale" },
          ],
          L3: [
            { nom: "Réseaux Télécoms Avancés (4G/5G)", code: "RT-L3-4G5G", coeff: 3.0, type: "fondamentale" },
            { nom: "VoIP", code: "RT-L3-VOIP", coeff: 3.0, type: "fondamentale" },
            { nom: "Fibre Optique", code: "RT-L3-FO", coeff: 3.0, type: "fondamentale" },
            { nom: "Réglementation des Télécommunications", code: "RT-L3-REGLE", coeff: 2.0, type: "transversale" },
          ],
          M1: [
            { nom: "Réseaux de Nouvelle Génération (NGN)", code: "RT-M1-NGN", coeff: 3.0, type: "fondamentale" },
            { nom: "Ingénierie Télécoms", code: "RT-M1-INGTEL", coeff: 3.0, type: "fondamentale" },
            { nom: "Réseaux Mobiles Avancés", code: "RT-M1-MOBA", coeff: 3.0, type: "fondamentale" },
            { nom: "Qualité de Service (QoS)", code: "RT-M1-QOS", coeff: 2.0, type: "fondamentale" },
          ],
        },
      },
      CS: {
        nom: "Cyber Sécurité",
        code: "CS",
        niveaux: {
          L2: [
            { nom: "Introduction à la Cybersécurité", code: "CS-L2-INTROC", coeff: 3.0, type: "fondamentale" },
            { nom: "Cryptographie de Base", code: "CS-L2-CRYPTO", coeff: 3.0, type: "fondamentale" },
            { nom: "Sécurité des Systèmes", code: "CS-L2-SECSYS", coeff: 3.0, type: "fondamentale" },
            { nom: "Réseaux Informatiques", code: "CS-L2-RES", coeff: 2.0, type: "fondamentale" },
          ],
          L3: [
            { nom: "Sécurité Offensive/Pentest", code: "CS-L3-PENTEST", coeff: 3.0, type: "fondamentale" },
            { nom: "Cryptographie Avancée", code: "CS-L3-CRYPA", coeff: 3.0, type: "fondamentale" },
            { nom: "Sécurité des Réseaux", code: "CS-L3-SECRES", coeff: 3.0, type: "fondamentale" },
            { nom: "Forensique Numérique", code: "CS-L3-FORENS", coeff: 3.0, type: "fondamentale" },
            { nom: "Normes ISO 27001", code: "CS-L3-ISO", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      SEIOT: {
        nom: "Systèmes Embarqués et IoT",
        code: "SEIOT",
        niveaux: {
          L3: [
            { nom: "Programmation Embarquée (C/Microcontrôleurs)", code: "SEIOT-L3-PEMB", coeff: 3.0, type: "fondamentale" },
            { nom: "Architecture IoT", code: "SEIOT-L3-ARCHIOT", coeff: 3.0, type: "fondamentale" },
            { nom: "Capteurs et Actionneurs", code: "SEIOT-L3-CAPT", coeff: 3.0, type: "fondamentale" },
            { nom: "Protocoles IoT (MQTT/Zigbee)", code: "SEIOT-L3-PROT", coeff: 2.0, type: "fondamentale" },
            { nom: "Systèmes Temps Réel", code: "SEIOT-L3-STR", coeff: 3.0, type: "fondamentale" },
          ],
        },
      },
      ER: {
        nom: "Énergies Renouvelables",
        code: "ER",
        niveaux: {
          L3: [
            { nom: "Énergie Solaire Photovoltaïque", code: "ER-L3-SOLAR", coeff: 3.0, type: "fondamentale" },
            { nom: "Systèmes Éoliens", code: "ER-L3-EOL", coeff: 3.0, type: "fondamentale" },
            { nom: "Efficacité Énergétique", code: "ER-L3-EFF", coeff: 2.0, type: "fondamentale" },
            { nom: "Électrotechnique", code: "ER-L3-ELEC", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion de Projets Énergétiques", code: "ER-L3-MGT", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      SSIM: {
        nom: "Sécurité des Systèmes d'Informations et Monétiques",
        code: "SSIM",
        niveaux: {
          M1: [
            { nom: "Sécurité des Systèmes de Paiement", code: "SSIM-M1-PAY", coeff: 3.0, type: "fondamentale" },
            { nom: "Cryptographie Appliquée", code: "SSIM-M1-CRYPTO", coeff: 3.0, type: "fondamentale" },
            { nom: "Normes Bancaires et Monétiques", code: "SSIM-M1-NORM", coeff: 2.0, type: "transversale" },
            { nom: "Audit de Sécurité", code: "SSIM-M1-AUDIT", coeff: 3.0, type: "fondamentale" },
          ],
        },
      },
      VCC: {
        nom: "Virtualisation et Cloud Computing",
        code: "VCC",
        niveaux: {
          M1: [
            { nom: "Cloud Computing Avancé", code: "VCC-M1-CLOUDA", coeff: 3.0, type: "fondamentale" },
            { nom: "Virtualisation (VMware/Hyper-V)", code: "VCC-M1-VIRT", coeff: 3.0, type: "fondamentale" },
            { nom: "Conteneurisation (Docker/Kubernetes)", code: "VCC-M1-K8S", coeff: 3.0, type: "fondamentale" },
            { nom: "Architecture Cloud", code: "VCC-M1-ARCH", coeff: 3.0, type: "fondamentale" },
          ],
        },
      },
    },
  },
  ia_data: {
    label: "Intelligence Artificielle et Ingénierie de Données",
    icon: "🤖",
    filieres: {
      DSBD: {
        nom: "Data Science & Big Data",
        code: "DSBD",
        niveaux: {
          L2: [
            { nom: "Introduction au Big Data (Hadoop/Spark)", code: "DSBD-L2-BIGD", coeff: 3.0, type: "fondamentale" },
            { nom: "Statistiques et Probabilités", code: "DSBD-L2-STAT", coeff: 3.0, type: "fondamentale" },
            { nom: "Programmation Python", code: "DSBD-L2-PY", coeff: 3.0, type: "fondamentale" },
            { nom: "Bases de Données NoSQL", code: "DSBD-L2-NOSQL", coeff: 2.0, type: "fondamentale" },
            { nom: "Mathématiques pour la Data Science", code: "DSBD-L2-MATH", coeff: 2.0, type: "transversale" },
          ],
          L3: [
            { nom: "Machine Learning", code: "DSBD-L3-ML", coeff: 3.0, type: "fondamentale" },
            { nom: "Traitement du Big Data Avancé", code: "DSBD-L3-BIGDA", coeff: 3.0, type: "fondamentale" },
            { nom: "Visualisation de Données", code: "DSBD-L3-DATAVIZ", coeff: 2.0, type: "fondamentale" },
            { nom: "Bases de Données Distribuées", code: "DSBD-L3-BDDDIST", coeff: 3.0, type: "fondamentale" },
          ],
        },
      },
      IA: {
        nom: "Cycle Ingénieur en Intelligence Artificielle",
        code: "IA",
        niveaux: {
          M2: [
            { nom: "Deep Learning", code: "IA-M2-DL", coeff: 3.0, type: "fondamentale" },
            { nom: "Traitement du Langage Naturel (NLP)", code: "IA-M2-NLP", coeff: 3.0, type: "fondamentale" },
            { nom: "Vision par Ordinateur", code: "IA-M2-CV", coeff: 3.0, type: "fondamentale" },
            { nom: "Systèmes Multi-Agents", code: "IA-M2-SMA", coeff: 2.0, type: "fondamentale" },
            { nom: "Éthique de l'IA", code: "IA-M2-ETHIQ", coeff: 1.0, type: "transversale" },
            { nom: "Mémoire de Fin d'Études", code: "IA-M2-MEM", coeff: 5.0, type: "fondamentale" },
          ],
        },
      },
    },
  },
  gestion: {
    label: "Gestion",
    icon: "📊",
    filieres: {
      COMPTA: {
        nom: "Comptabilité",
        code: "COMPTA",
        niveaux: {
          L1: [
            { nom: "Comptabilité Générale", code: "COMPTA-L1-CG", coeff: 3.0, type: "fondamentale" },
            { nom: "Mathématiques Financières", code: "COMPTA-L1-MF", coeff: 3.0, type: "fondamentale" },
            { nom: "Droit des Affaires", code: "COMPTA-L1-DA", coeff: 2.0, type: "transversale" },
            { nom: "Économie Générale", code: "COMPTA-L1-ECO", coeff: 2.0, type: "transversale" },
            { nom: "Bureautique", code: "COMPTA-L1-BUR", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      CI: {
        nom: "Commerce International",
        code: "CI",
        niveaux: {
          L1: [
            { nom: "Techniques du Commerce International", code: "CI-L1-TCI", coeff: 3.0, type: "fondamentale" },
            { nom: "Économie Internationale", code: "CI-L1-ECOINT", coeff: 2.0, type: "fondamentale" },
            { nom: "Mathématiques Financières", code: "CI-L1-MF", coeff: 2.0, type: "transversale" },
            { nom: "Droit Commercial", code: "CI-L1-DC", coeff: 2.0, type: "transversale" },
          ],
          L2: [
            { nom: "Logistique Internationale", code: "CI-L2-LOG", coeff: 3.0, type: "fondamentale" },
            { nom: "Marketing International", code: "CI-L2-MKTINT", coeff: 3.0, type: "fondamentale" },
            { nom: "Techniques Douanières", code: "CI-L2-DOUANE", coeff: 3.0, type: "fondamentale" },
          ],
          L3: [
            { nom: "Négociation Commerciale Internationale", code: "CI-L3-NEGOC", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion des Opérations Import-Export", code: "CI-L3-IMPEXP", coeff: 3.0, type: "fondamentale" },
            { nom: "Droit du Commerce International", code: "CI-L3-DROITINT", coeff: 2.0, type: "transversale" },
          ],
        },
      },
      FC: {
        nom: "Finance & Comptabilité",
        code: "FC",
        niveaux: {
          L2: [
            { nom: "Comptabilité Analytique", code: "FC-L2-CA", coeff: 3.0, type: "fondamentale" },
            { nom: "Fiscalité", code: "FC-L2-FISC", coeff: 3.0, type: "fondamentale" },
            { nom: "Finance d'Entreprise", code: "FC-L2-FINENT", coeff: 3.0, type: "fondamentale" },
            { nom: "Analyse Financière", code: "FC-L2-AFIN", coeff: 3.0, type: "fondamentale" },
            { nom: "Droit Fiscal", code: "FC-L2-DFISC", coeff: 2.0, type: "transversale" },
          ],
          L3: [
            { nom: "Audit Comptable et Financier", code: "FC-L3-AUDIT", coeff: 3.0, type: "fondamentale" },
            { nom: "Contrôle de Gestion", code: "FC-L3-CG", coeff: 3.0, type: "fondamentale" },
            { nom: "Normes IFRS", code: "FC-L3-IFRS", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion de Trésorerie", code: "FC-L3-TRESOR", coeff: 3.0, type: "fondamentale" },
          ],
        },
      },
      BF: {
        nom: "Banque Finance",
        code: "BF",
        niveaux: {
          L2: [
            { nom: "Techniques Bancaires", code: "BF-L2-TBANK", coeff: 3.0, type: "fondamentale" },
            { nom: "Marchés Financiers", code: "BF-L2-MARCH", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion des Risques Bancaires", code: "BF-L2-RISKB", coeff: 3.0, type: "fondamentale" },
            { nom: "Comptabilité Bancaire", code: "BF-L2-CBANK", coeff: 2.0, type: "fondamentale" },
          ],
          L3: [
            { nom: "Ingénierie Financière", code: "BF-L3-INGFIN", coeff: 3.0, type: "fondamentale" },
            { nom: "Gestion de Portefeuille", code: "BF-L3-PORTF", coeff: 3.0, type: "fondamentale" },
            { nom: "Réglementation Bancaire (Bâle III)", code: "BF-L3-BALE3", coeff: 2.0, type: "transversale" },
            { nom: "Finance Internationale", code: "BF-L3-FININT", coeff: 3.0, type: "fondamentale" },
          ],
        },
      },
    },
  },
};

/**
 * Fonctions utilitaires de filtrage dynamique
 */

export function getDomainesOptions() {
  return Object.entries(DOMAINS_STRUCTURE).map(([key, value]) => ({
    value: key,
    label: value.label,
    icon: value.icon,
  }));
}

export function getFilieresForDomaine(domaineKey) {
  if (!domaineKey || !DOMAINS_STRUCTURE[domaineKey]) return [];
  const filieresObj = DOMAINS_STRUCTURE[domaineKey].filieres;
  return Object.entries(filieresObj).map(([code, data]) => ({
    code,
    value: code,
    nom: data.nom,
    label: `${data.nom} (${code})`,
    niveaux: Object.keys(data.niveaux),
  }));
}

export function getNiveauxForFiliere(filiereCode) {
  if (!filiereCode) return [];
  for (const dom of Object.values(DOMAINS_STRUCTURE)) {
    if (dom.filieres[filiereCode]) {
      return Object.keys(dom.filieres[filiereCode].niveaux);
    }
  }
  return [];
}

export function getMatieresForFiliereAndNiveau(filiereCode, niveau) {
  if (!filiereCode || !niveau) return [];
  for (const dom of Object.values(DOMAINS_STRUCTURE)) {
    if (dom.filieres[filiereCode] && dom.filieres[filiereCode].niveaux[niveau]) {
      return dom.filieres[filiereCode].niveaux[niveau];
    }
  }
  return [];
}
