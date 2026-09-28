# 1. ETAP BUDOWANIA
FROM python:3.14-slim-trixie AS builder

WORKDIR /app

# Instalacja zależności systemowych do kompilacji pakietów
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Tworzenie wirtualnego środowiska 
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Instalacja zależności Pythona wewnątrz venv
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 2. ETAP PRODUKCYJNY
FROM python:3.14-slim-trixie AS runner

WORKDIR /app

# Optymalizacje Pythona dla kontenerów
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Tworzenie bezpiecznego użytkownika nieuprzywilejowanego
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser

# Kopiowanie czystego środowiska venv z etapu builder
COPY --from=builder /opt/venv /opt/venv

# Kopiowanie kodu źródłowego backendu z nadaniem uprawnień dla appuser
COPY --chown=appuser:appgroup . .

# Przełączenie kontekstu bezpieczeństwa na nowego użytkownika
USER appuser

EXPOSE 8000

# Uruchomienie aplikacji za pomocą produkcyjnego serwera ASGI (Uvicorn)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
