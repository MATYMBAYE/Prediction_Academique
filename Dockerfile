# ========================================================
# ÉTAPE 1 : Compilation du Frontend React (Vite)
# ========================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ========================================================
# ÉTAPE 2 : Serveur de Production Flask + IA + Base de données
# ========================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    FLASK_ENV=production

WORKDIR /app

# Dépendances système pour compiler et exécuter les bibliothèques C/Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python (Flask, Scikit-Learn, PyMySQL, Gunicorn, etc.)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copie du backend complet (code, modèles IA sérialisés, structure)
COPY backend/ ./backend/

# Copie du build React optimisé généré à l'étape 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 5000

# Lancement avec Gunicorn (Serveur WSGI Haute Performance de Production)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120", "run:app"]
