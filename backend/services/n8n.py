import httpx
from config import N8N_WEBHOOK_URL, AI_PROMPT

async def send_to_n8n(
    transcript_text: str, 
    candidate_id: str, 
    candidate_display_name: str
) -> dict | None:
    """
    Wysyła transkrypt i dane kandydata do n8n.
    
    Args:
        transcript_text: Tekst transkryptu
        candidate_id: ID kandydata z bazy danych
        candidate_display_name: Imię i nazwisko kandydata
    """
    if not N8N_WEBHOOK_URL:
        print("Zmienna N8N_WEBHOOK_URL jest pusta, pomijam wysyłkę do n8n.")
        return None

    try:
        async with httpx.AsyncClient() as http_client:
            payload = {
                "UserMessage": AI_PROMPT,
                "transcript": transcript_text,
                "candidate_id": candidate_id,  # ID z bazy dla mapowania w tabeli wyników
                "candidate_display_name": candidate_display_name  # Imię z CV
            }
            response = await http_client.post(N8N_WEBHOOK_URL, json=payload)
            print(f"Wysyłka do n8n zakończona (Status: {response.status_code})")
            return response.json()
    except Exception as err:
        print(f"Błąd wysyłania danych do n8n: {err}")
        raise
