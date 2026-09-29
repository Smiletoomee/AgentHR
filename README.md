# AgentHR 

**AgentHR** to inteligentny system wspierający procesy rekrutacji, wykorzystujący sztuczną inteligencję i architekturę agentową. Projekt automatyzuje kluczowe obszary rekrutacji, analizy aplikacji oraz obsługi zapytań pracowniczych, pozwalając zespołom HR oszczędzić czas i podejmować trafniejsze decyzje.

---

##  Kluczowe Funkcje

* **Analiza i Selekcja CV**: Automatyczne przetwarzanie dokumentów application/CV oraz ekstrakcja kluczowych umiejętności i doświadczenia.
* **Dopasowanie Kandydatów**: Inteligentna ocena zgodności profilu kandydata z wymaganiami stanowiska.
* W realizacji**Asystent HR**: Agent odpowiadający na pytania pracowników dotyczące procedur, urlopów i wewnętrznych polityk firmy.
* W realizacji**Automatyzacja Komunikacji**: Wsparcie w generowaniu spersonalizowanych wiadomości do kandydatów oraz harmonogramowaniu spotkań.

---

## Stos Technologiczny

* **Konteneryzacja**: Docker Compose
* **Język / Środowisko**: Python 3.11+ / Node.js
* **Frameworki / Agentic AI**: LangChain / CrewAI / FastAPI / Streamlit
* **Model AI**: Gemini / OpenAI GPT-4 / Claude / Llama

---

## Wymagania Wstępne

Przed uruchomieniem projektu upewnij się, że masz zainstalowane:

* [Git] https://git-scm.com/
* [Docker] zawierający docker compose
* [Klucz_API] modelu językowego

---

## Szybki Start : Instrukcja Uruchomienia

### 1. Klonowanie Repozytorium

```bash
git clone https://github.com/Smiletoomee/AgentHR.git
cd AgentHR
```

### 2. Konfiguracja Zmiennych Środowiskowych

Utwórz plik `.env` w głównym katalogu projektu na podstawie szablonu i uzupełnij wymagane klucze API:

Przykładowana zawartość pliku `.env`:

```env
#Database
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
POSTGRES_HOST=
POSTGRES_PORT=
DATABASE_URL=

#pgAdmin
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=

#Frontend
NEXT_PUBLIC_WS_URL=
NEXT_DOMAIN=

#Cloudflare
TUNNEL_TOKEN=

#Backend
BACKEND_PORT=
BACKEND_HOST=

N8N_WEBHOOK_URL_G=
N8N_DOMAIN=
N8N_HOST=

#Better-auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BETTER_AUTH_URL=

# Google
GOOGLE_CLIENT_ID=twoj_identyfikator_client_id_z_google
GOOGLE_CLIENT_SECRET=twoj_tajny_klucz_secret_z_google
GOOGLE_API_KEY=
GEMINI_TRANSCRIPTION_MODEL=
GEMINI_MODEL=

# GitHub
GITHUB_CLIENT_ID=twoj_client_id_z_github
GITHUB_CLIENT_SECRET=twoj_client_secret_z_github

# Facebook
FACEBOOK_CLIENT_ID=twoj_client_id_z_facebooka
FACEBOOK_CLIENT_SECRET=twoj_client_secret_z_facebooka

# LinkedIn
LINKEDIN_CLIENT_ID=twoj_client_id_z_linkedin
LINKEDIN_CLIENT_SECRET=twoj_client_secret_z_linkedin
```

### 3. Uruchomienie Projektu

Uruchom wszystkie usługi w kontenerach za pomocą jednej komendy:

```
docker compose up -d --build

```

I gotowe! Aplikacja jest automatycznie budowana i uruchamiana.

Aplikacja będzie dostępna w przeglądarce pod adresem wskazanym w konfiguracji.

### 4. Zatrzymanie Aplikacji

Aby zatrzymać działające kontenery, wykonaj:

```
docker compose down

```

## Wkład w Projekt

Chcesz pomóc w rozwoju **AgentHR**? 
1. Sklonuj repozytorium (Fork).
2. Stwórz nową gałąź (`git checkout -b feature/nowa-funkcja`).
3. Zaznacz zmiany (`git commit -m 'Dodano nową funkcję'`).
4. Wyślij zmiany na gałąź (`git push origin feature/nowa-funkcja`).
5. Otwórz Pull Request.

---

## Licencja

Projekt oparty na licencji BSL 1.1
