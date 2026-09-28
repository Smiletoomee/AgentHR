import os
import io
import wave
import re
from datetime import datetime
from google import genai
from google.genai import types
from config import GOOGLE_API_KEY, GEMINI_TRANSCRIPTION_MODEL

async def process_session_audio(audio_data: bytes, candidate_name: str = "Kandydat_Nieznany") -> str:
    if len(audio_data) == 0:
        return ""

    # Zapis lokalny na dysku z unikalną nazwą (data_godzina_kandydat.wav)
    try:
        recordings_dir = os.path.join(os.getcwd(), "recordings")
        os.makedirs(recordings_dir, exist_ok=True)
        
        # Bezpieczne oczyszczenie nazwy kandydata do celów zapisu w systemie plików
        sanitized_name = re.sub(r'[^a-zA-Z0-9_-]', '_', candidate_name)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{sanitized_name}.wav"
        
        audio_file_path = os.path.join(recordings_dir, filename)
        
        with wave.open(audio_file_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(24000)
            wav_file.writeframes(audio_data)
        print(f"Nagranie audio zapisane: {audio_file_path}")
    except Exception as save_err:
        print(f"Nie udało się zapisać nagrania: {save_err}")

    # Transkrypcja chmurowa lub do własnego lokalnego agenta po API 
    try:
        wav_io = io.BytesIO()
        with wave.open(wav_io, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(24000)
            wav_file.writeframes(audio_data)

        print(f"Generowanie transkrypcji ({GEMINI_TRANSCRIPTION_MODEL})...")
        std_client = genai.Client(api_key=GOOGLE_API_KEY)
        transcription_response = await std_client.aio.models.generate_content(
            model=GEMINI_TRANSCRIPTION_MODEL,
            contents=[
                types.Part.from_bytes(data=wav_io.getvalue(), mime_type="audio/wav"),
                "Dokonaj dokładnej, dosłownej transkrypcji obu wypowiedzi użytkownika i transkrypcji z tekstu wygenerowanego modelu agenta live z tego nagrania. Zwróć wyłącznie tekst transkrypcji."
            ]
        )
        if transcription_response and transcription_response.text:
            return transcription_response.text.strip()
    except Exception as e:
        print(f"Błąd transkrypcji audio: {e}")

    return ""