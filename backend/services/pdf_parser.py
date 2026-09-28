import io
import base64
import re
from pypdf import PdfReader
from config import GOOGLE_API_KEY
from google import genai

def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """Konwertuje bajty pliku PDF na czysty tekst."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip() or "Brak wykrytego tekstu w dokumencie PDF."
    except Exception as e:
        print(f"Błąd parsowania PDF na tekst: {e}")
        return "Błąd ekstrakcji treści dokumentu."

def extract_text_from_base64_pdf(base64_str: str) -> str:
    """Dekoduje ciąg Base64 i wyciąga tekst z PDF."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        pdf_bytes = base64.b64decode(base64_str)
        return extract_text_from_pdf_bytes(pdf_bytes)
    except Exception as e:
        print(f"Błąd dekodowania Base64 do PDF: {e}")
        return "Błąd dekodowania"


def extract_candidate_name_pure_code(parsed_text: str) -> Optional[str]:
    """
    Ekstrakcja imienia i nazwiska przy użyciu czystego kodu Pythona.
    Czyści tekst ze śmieci PDF/Unicode i analizuje pierwsze linie pod kątem 2-3 członowego imienia.
    Zwraca string z imieniem i nazwiskiem lub None w przypadku trudnego układu.
    """
    if not parsed_text or len(parsed_text.strip()) < 5:
        return None

    # Czyszczenie linii ze śmieciowych znaków fontów i ikon Unicode
    lines = [
        re.sub(r'[\u2022\u25aa\u25cf\u25cb\ue000-\uf8ff]', '', line).strip()
        for line in parsed_text.splitlines()
        if line.strip()
    ]

    stop_words = {
        "curriculum", "vitae", "cv", "resume", "profil", "podsumowanie", "strona",
        "developer", "engineer", "programista", "senior", "junior", "mid", "lead",
        "python", "javascript", "typescript", "react", "fullstack", "backend", "frontend",
        "wykształcenie", "doświadczenie", "umiejętności", "kontakt", "edukacja",
        "projekty", "języki", "certyfikaty", "zainteresowania", "o", "mnie", "dane", "osobowe"
    }

    for line in lines[:15]:
        # 1. Ignorujemy linie z danymi kontaktowymi
        if any(char in line for char in ['@', 'http', 'www.', 'github.com', 'linkedin.com']):
            continue
        if re.search(r'\+?\d{2,}[\s-]?\d{3,}', line):  # Numer telefonu
            continue

        # 2. Usuwamy zbędne znaki interpunkcyjne
        clean = re.sub(r'[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]', '', line).strip()
        words = clean.split()

        # 3. Imię i nazwisko to zazwyczaj 2 lub 3 słowa (np. Jan Kowalski lub Anna Maria Nowak)
        if 2 <= len(words) <= 3 and len(clean) <= 40:
            # Upewniamy się, że żadne ze słów nie jest słowem kluczowym / technicznym
            if not any(w.lower() in stop_words for w in words):
                # Sprawdzamy czy zaczynają się z wielkiej litery (obsługuje też ALL CAPS)
                if all(w[0].isupper() for w in words if len(w) > 1):
                    # Formatujemy na czytelny Title Case
                    return " ".join(w.capitalize() for w in words)

    return None


async def extract_candidate_name_ai(text: str) -> str:
    """
    Niezawodna, asynchroniczna ekstrakcja imienia i nazwiska z użyciem Gemini API.
    """
    fast_name = extract_candidate_name_pure_code(text)
    # POPRAWIONY WARUNEK: Jeśli regex wyciągnął poprawne imię (różne od "Kandydat Nieznany"), zwracamy je od razu
    if fast_name and fast_name not in ["Kandydat Nieznany", "Kandydat Rekrutacyjny"]:
        return fast_name

    if not text or not GOOGLE_API_KEY or len(text) < 10:
        return "Kandydat Nieznany"

    try:
        client = genai.Client(api_key=GOOGLE_API_KEY)
        response = await client.aio.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=(
                "Wyciągnij wyłącznie imię i nazwisko kandydata z poniższego tekstu CV. "
                "Zwróć TYLKO IMIĘ I NAZWISKO (np. Jan Kowalski), nic więcej. "
                "Jeśli w tekście brak danych kandydata, zwróć 'Kandydat Nieznany'.\n\n"
                f"CV:\n{text[:3000]}"
            )
        )
        ai_name = response.text.strip() if response.text else ""
        ai_name = re.sub(r'["\'.]', '', ai_name).strip()

        if ai_name and len(ai_name) < 50 and "rekrutac" not in ai_name.lower() and "nieznan" not in ai_name.lower():
            return ai_name
    except Exception as e:
        print(f"Błąd AI podczas odczytywania imienia: {e}")

    return "Kandydat Nieznany"



