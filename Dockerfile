# ========================================================
# Image de Production ISI-SUPTECH (Python Flask + IA + React)
# ========================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    FLASK_ENV=production

WORKDIR /app

# Outils système essentiels
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copie du backend complet et du build React
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

WORKDIR /app/backend

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120", "run:app"]
