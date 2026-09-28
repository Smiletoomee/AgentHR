import base64
import io
import json
import asyncio
from typing import List
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
from google import genai
from google.genai import types

from config import GOOGLE_API_KEY, GEMINI_MODEL, SYSTEM_PROMPT
from db import upsert_candidate, fetch_candidate_cv, get_db_url
from services.audio import process_session_audio
from services.n8n import send_to_n8n
from services.pdf_parser import extract_candidate_name_ai, extract_text_from_base64_pdf, extract_candidate_name_pure_code
from candidates import router as candidates_router, extract_text_from_base64_pdf

app = FastAPI()
app.include_router(candidates_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(
    api_key=GOOGLE_API_KEY
)


@app.post("/api/candidates/upload-resume-data")
async def upload_resume_data_endpoint(
    candidate_id: str = Form(...),
    applied_position: str = Form(...),
    resume_text: str = Form(...)
):
    try:
        await upsert_candidate(candidate_id, applied_position, resume_text)
        return {"status": "success", "message": "CV zapisane w bazie.", "candidate_id": candidate_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd bazy danych: {str(e)}")


@app.websocket("/api/interview-stream")
async def interview_stream(websocket: WebSocket):
    initial_candidate_id = websocket.query_params.get("candidate_id")
    await websocket.accept()
    print("Frontend połączony przez WebSocket")

    transcript_history: List[str] = []
    full_session_audio = io.BytesIO()
    cv_content_text = "Brak dołączonego CV."
    applied_position_title = "Stanowisko rekrutacyjne"
    candidate_display_name = "Kandydat Rekrutacyjny"
    raw_file_base64 = None
    file_mime_type = "application/pdf"

    if initial_candidate_id:
        try:
            row = await fetch_candidate_cv(initial_candidate_id)
            if row:
                applied_position_title = row["applied_position"] or applied_position_title
                candidate_display_name = row.get("full_name") or "Kandydat Rekrutacyjny"                
                raw_resume = row["resume_text"] or ""
                parsed_text = row.get("parsed_cv_text") or ""

                # Jeśli tekst nie jest sparsowany, wyciągamy go z Base64
                if not parsed_text and raw_resume.startswith("data:"):
                    try:
                        b64_data = raw_resume.split(",", 1)[1]
                        parsed_text = extract_text_from_base64_pdf(b64_data)
                    except Exception:
                        parsed_text = ""

                # Jeśli imię w bazie to "Kandydat Nieznany" lub "Kandydat Rekrutacyjny", uruchamiamy Gemini AI do ekstrakcji
                if not candidate_display_name or candidate_display_name in ["Kandydat Rekrutacyjny", "Kandydat Nieznany"]:
                    if parsed_text:
                        extracted_name = await extract_candidate_name_ai(parsed_text)
                        if extracted_name != "Kandydat Nieznany":
                            candidate_display_name = extracted_name
                            # Trwały zapis poprawnie odczytanego imienia w bazie PostgreSQL
                            try:
                                conn = await asyncpg.connect(get_db_url())
                                await conn.execute(
                                    "UPDATE candidates SET full_name = $1 WHERE id = $2::uuid",
                                    candidate_display_name, uuid.UUID(initial_candidate_id)
                                )
                                await conn.close()
                            except Exception as db_up_err:
                                print(f"Błąd aktualizacji full_name w DB: {db_up_err}")
                
                if raw_resume.startswith("data:"):
                    try:
                        header, raw_file_base64 = raw_resume.split(",", 1)
                        file_mime_type = header.split(";")[0].split(":")[1]
                        cv_content_text = f"[Dołączono dokument binarny typu {file_mime_type}]"
                    except Exception:
                        cv_content_text = raw_resume
                else:
                    cv_content_text = raw_resume or parsed_text
                print(f"Dociągnięto CV dla kandydata {initial_candidate_id} z bazy ({candidate_display_name}).")
        except Exception as db_err:
            print(f"Nie udało się pobrać CV z bazy na starcie: {db_err}")

    dynamic_system_prompt = f"""
{SYSTEM_PROMPT}

---
DANE REKRUTACYJNE KANDYDATA:
Stanowisko: {applied_position_title}
Treść / Podsumowanie CV:
{cv_content_text}
---
"""

    live_config = types.LiveConnectConfig(
        system_instruction=types.Content(parts=[types.Part(text=dynamic_system_prompt)]),
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
            )
        ),
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(
                disabled=False,
                start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_LOW,
                end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_HIGH,
                silence_duration_ms=600,
                prefix_padding_ms=100
            )
        )
    )

    try:
        async with client.aio.live.connect(model=GEMINI_MODEL, config=live_config) as session:
            print(f"Połączono z Gemini API ({GEMINI_MODEL})")

            # Automatyczne wysyłanie treści CV po 1 sekundzie od połączenia
            if raw_file_base64 or (initial_candidate_id and cv_content_text):
                async def send_cv_after_delay():
                    try:
                        await asyncio.sleep(2.0) # Opóźnienie 1 sekundy
                        extracted_text = ""
                        if raw_file_base64:
                            extracted_text = extract_text_from_base64_pdf(raw_file_base64)
                        
                        if not extracted_text or extracted_text.startswith("Błąd"):
                            extracted_text = cv_content_text

                        if extracted_text and extracted_text != "Brak dołączonego CV.":
                            print(f"Automatyczne wysyłanie treści CV po 1s ({len(extracted_text)} znaków)...")
                            prompt_message = (
                                f"Oto treść dokumentu aplikacyjnego (CV) kandydata:\n\n{extracted_text}\n\n"
                                "Zapoznaj się z nim dokładnie, przywitaj kandydata i rozpocznij rekrutację zgodnie z wytycznymi."
                            )
                            await session.send(input=prompt_message, end_of_turn=True)
                            print("Pomyślnie dostarczono treść CV do sesji Gemini Live po 1s.")
                    except Exception as auto_send_err:
                        print(f"Nie udało się automatycznie wysłać CV do sesji Gemini: {auto_send_err}")

                asyncio.create_task(send_cv_after_delay())

            async def receive_from_frontend():
                nonlocal full_session_audio, cv_content_text, applied_position_title
                try:
                    while True:
                        message = await websocket.receive()

                        if "text" in message:
                            text_data = message["text"]
                            try:
                                payload = json.loads(text_data)
                                event_type = payload.get("event")

                                if event_type == "setup_context":
                                    cv_id = payload.get("ciriVicuId") or payload.get("id") or payload.get("candidateId")
                                    cv_title = payload.get("ciriVicuTitle") or payload.get("title") or payload.get("appliedPosition")
                                    cv_content = payload.get("ciriVicuContent") or payload.get("content") or payload.get("resumeText")

                                    print("Otrzymano kontekst CV z frontendu!")
                                    if cv_id:
                                        await upsert_candidate(
                                            cv_id,
                                            cv_title or applied_position_title,
                                            cv_content or cv_content_text
                                        )
                                        print("Zaktualizowano kontekst kandydata w PostgreSQL.")

                                elif event_type == "send_file_context":
                                    candidate_id = payload.get("candidateId") or initial_candidate_id
                                    print(f"Żądanie przesłania pliku CV dla kandydata ID: {candidate_id}")

                                    if candidate_id:
                                        row = await fetch_candidate_cv(candidate_id)
                                        cv_text_content = row["parsed_cv_text"] if row and row["parsed_cv_text"] else ""

                                        if not cv_text_content and row and row["resume_text"]:
                                            raw_res = row["resume_text"]
                                            if raw_res.startswith("data:"):
                                                try:
                                                    b64_data = raw_res.split(",", 1)[1]
                                                    cv_text_content = extract_text_from_base64_pdf(b64_data)
                                                except Exception:
                                                    cv_text_content = raw_res

                                        if cv_text_content:
                                            # Próba aktualizacji nazwy wyświetlanej z przesyłanego pliku
                                            extracted_name = extract_candidate_name(cv_text_content)
                                            if extracted_name and extracted_name != "Kandydat Nieznany":
                                                candidate_display_name = extracted_name

                                            print(f"Wysyłanie sparsowanego tekstu CV do sesji Gemini Live ({len(cv_text_content)} znaków)...")
                                            prompt_message = (
                                                f"Here is the candidate's CV text:\n\n{cv_text_content}\n\n"
                                                "Please acknowledge receipt, greet the candidate, and start the interview now."
                                            )
                                            await session.send(input=prompt_message, end_of_turn=True)
                                            print("Pomyślnie dostarczono treść CV w formacie tekstowym do agenta Gemini.")
                                        else:
                                            print("Brak treści CV w kolumnie parsed_cv_text dla podanego ID.")

                            except json.JSONDecodeError:
                                print(f"Otrzymano tekst, ale to nie jest poprawny JSON: {text_data}")

                        elif "bytes" in message:
                            data = message["bytes"]
                            if data:
                                full_session_audio.write(data)
                                try:
                                    await session.send_realtime_input(
                                        audio=types.Blob(
                                            data=data,
                                            mime_type="audio/pcm;rate=24000"
                                        )
                                    )
                                except Exception as send_err:
                                    print(f"Pominięto wysyłkę audio do zamkniętej sesji Gemini: {send_err}")
                                    break
                except WebSocketDisconnect:
                    raise
                except RuntimeError as e:
                    if "disconnect" in str(e).lower() or "close" in str(e).lower():
                        raise WebSocketDisconnect()
                    raise
                except Exception as e:
                    print(f"Błąd w pętli odbioru z frontendu: {e}")

            async def send_to_frontend():
                try:
                    async for response in session.receive():
                        if response.server_content and response.server_content.interrupted:
                            print("Gemini przerwało wypowiedź (wykryto głos użytkownika)")
                            continue

                        if response.server_content and response.server_content.turn_complete:
                            print("Gemini zakończyło turę, nasłuchuje")
                            continue

                        if response.server_content and response.server_content.model_turn:
                            for part in response.server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    await websocket.send_bytes(part.inline_data.data)
                                if part.text:
                                    text = part.text.strip()
                                    if text:
                                        transcript_history.append(f"AI: {text}")
                                        print(f"AI: {text}")
                except Exception as e:
                    if "disconnect" in str(e).lower() or "close" in str(e).lower():
                        raise WebSocketDisconnect()
                    raise

            while True:
                if websocket.client_state.name == "DISCONNECTED":
                    break

                task_receive = asyncio.create_task(receive_from_frontend())
                task_send = asyncio.create_task(send_to_frontend())

                done, pending = await asyncio.wait(
                    [task_receive, task_send],
                    return_when=asyncio.FIRST_COMPLETED
                )

                for task in pending:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass

                should_break = False
                for task in done:
                    try:
                        task.result()
                    except (WebSocketDisconnect, RuntimeError) as e:
                        if "disconnect" in str(e).lower() or "close" in str(e).lower():
                            print("Połączenie WebSocket zamknięte standardowo.")
                        else:
                            print(f"Rozłączenie WebSocket: {e}")
                        should_break = True
                    except Exception as e:
                        print(f"Błąd pętli WebSocket: {e}")
                        should_break = True

                if should_break:
                    break

                await asyncio.sleep(0.001)

    except Exception as e:
        print(f"Błąd krytyczny połączenia z Gemini Live: {e}")

    finally:
        print("Przetwarzanie końcowe sesji (Nagrywanie i n8n)...")
        audio_bytes = full_session_audio.getvalue()
        full_user_text = await process_session_audio(audio_bytes, candidate_name=candidate_display_name)

        final_report = "\n".join(transcript_history)
        if full_user_text:
            final_report += f"\n\nPEŁNA TRANSKRYPCJA Z AUDIO:\n{full_user_text}"

        if transcript_history or full_user_text:
            await send_to_n8n(final_report, initial_candidate_id, candidate_display_name)

        if websocket.client_state.name != "DISCONNECTED":
            try:
                await websocket.close()
            except Exception:
                pass