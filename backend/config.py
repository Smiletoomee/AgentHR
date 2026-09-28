import os
from dotenv import load_dotenv

load_dotenv()

def load_prompt(file_path: str = "./prompts/prompt5.txt") -> str:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Nie znaleziono pliku {file_path}, stosuję fallback.")
        return "Jesteś rekruterem technicznym."

SYSTEM_PROMPT = load_prompt("./prompts/prompt5.txt")
AI_PROMPT = load_prompt("./prompts/prompt4.txt")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")
GEMINI_TRANSCRIPTION_MODEL = os.getenv("GEMINI_TRANSCRIPTION_MODEL")
N8N_WEBHOOK_URL_B = os.getenv("N8N_WEBHOOK_URL_B")

if not GOOGLE_API_KEY:
    raise ValueError("BRAK KLUCZA GOOGLE_API_KEY w pliku .env!")