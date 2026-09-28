import uuid
import base64
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import asyncpg

from db import get_db_url
from services.pdf_parser import (
    extract_candidate_name_pure_code,
    extract_text_from_pdf_bytes,
    extract_text_from_base64_pdf,
    extract_candidate_name_ai
)

router = APIRouter()


class CandidateSyncPayload(BaseModel):
    id: str
    sessionNumber: str
    score: str
    filesCount: int
    fileNames: Optional[str] = None
    extractedTextContent: Optional[str] = None
    fileBase64Data: Optional[str] = None
    fileMimeType: Optional[str] = None


# --- 1. ENDPOINT SYNCHRONIZACJI BACKEND-TO-BACKEND ---
@router.post("/api/sync-candidate")
async def sync_candidate(payload: CandidateSyncPayload):
    try:
        if payload.fileBase64Data and payload.fileMimeType:
            db_resume_value = f"data:{payload.fileMimeType};base64,{payload.fileBase64Data}"
            parsed_cv_text = extract_text_from_base64_pdf(payload.fileBase64Data)
        else:
            db_resume_value = payload.extractedTextContent or ""
            parsed_cv_text = payload.extractedTextContent or ""

        candidate_name = extract_candidate_name_pure_code(parsed_cv_text)
        applied_position = f"Stanowisko - Sesja {payload.sessionNumber} ({payload.score})"

        conn = await asyncpg.connect(get_db_url())
        try:
            # 1. Zapis/aktualizacja rekordu w tabeli candidates
            await conn.execute(
                """
                INSERT INTO candidates (id, full_name, applied_position, resume_text, parsed_cv_text, interview_status)
                VALUES ($1, $2, $3, $4, $5, 'Pending')
                ON CONFLICT (id) DO UPDATE 
                SET full_name = EXCLUDED.full_name,
                    applied_position = EXCLUDED.applied_position,
                    resume_text = EXCLUDED.resume_text,
                    parsed_cv_text = EXCLUDED.parsed_cv_text;
                """,
                payload.id,
                candidate_name,
                applied_position,
                db_resume_value,
                parsed_cv_text
            )

            # 2. Automatyczne dodanie powiązanego rekordu oceny do candidate_evaluations
            evaluation_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO candidate_evaluations (
                    id, candidate_id, interviewer_name, job_position, evaluation_type, 
                    skill_category, score, max_score, recommendation, is_passed, interview_summary
                )
                SELECT $1, $2, 'Rekruter AI', $3, 'technical', 'General', 0, 100, 'no_hire', FALSE, 'Oczekiwanie na ocenę'
                WHERE NOT EXISTS (
                    SELECT 1 FROM candidate_evaluations WHERE candidate_id = $2
                );
                """,
                evaluation_id,
                payload.id,
                applied_position
            )
        finally:
            await conn.close()

        return {"success": True, "message": "Pomyślnie zsynchronizowano dane kandydata i utworzono arkusz ocen."}

    except Exception as e:
        print(f"❌ Błąd synchronizacji kandydata: {e}")
        raise HTTPException(status_code=500, detail="Błąd zapisu zsynchronizowanych danych.")



# --- 2. ENDPOINT POBIERANIA DOKUMENTU DLA WEBSOCKETU ---
@router.get("/api/documents/{doc_id}")
async def get_document(doc_id: str):
    try:
        conn = await asyncpg.connect(get_db_url())
        try:
            row = await conn.fetchrow(
                """
                SELECT id, applied_position AS title, resume_text AS content 
                FROM candidates 
                WHERE id = $1
                """,
                doc_id
            )
        finally:
            await conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Nie znaleziono dokumentu o podanym ID")

        resume_content = row["content"] or ""
        mime_type = "application/pdf"
        base64_data = ""

        if resume_content.startswith("data:"):
            try:
                header, base64_data = resume_content.split(",", 1)
                mime_type = header.split(";")[0].split(":")[1]
            except Exception:
                base64_data = base64.b64encode(resume_content.encode("utf-8")).decode("utf-8")
                mime_type = "text/plain"
        else:
            base64_data = base64.b64encode(resume_content.encode("utf-8")).decode("utf-8")
            mime_type = "text/plain"

        return {
            "id": str(row["id"]),
            "title": row["title"] or "Stanowisko nieokreślone",
            "content": resume_content if not resume_content.startswith("data:") else "Plik binarny (Base64)",
            "fileName": "PDF" if "pdf" in mime_type else "OTHER",
            "mimeType": mime_type,
            "base64Data": base64_data
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Błąd bazy danych podczas pobierania dokumentu: {e}")
        raise HTTPException(status_code=500, detail="Błąd serwera podczas pobierania dokumentu.")


# --- 3. ENDPOINT POBIERANIA EVALUACJI ---
@router.get("/api/candidates/evaluations")
async def get_evaluations():
    try:
        conn = await asyncpg.connect(get_db_url())
        try:
            rows = await conn.fetch("""
                SELECT
                    id,
                    candidate_id AS "candidateId",
                    interviewer_name AS "interviewerName",
                    job_position AS "jobPosition",
                    evaluation_type AS "evaluationType",
                    skill_category AS "skillCategory",
                    score,
                    max_score AS "maxScore",
                    cultural_fit_score AS "culturalFitScore",
                    recommendation,
                    is_passed AS "isPassed",
                    interview_summary AS "interviewSummary",
                    key_strengths AS "keyStrengths",
                    key_weaknesses AS "keyWeaknesses"
                FROM candidate_evaluations
            """)
        finally:
            await conn.close()

        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Błąd bazy danych: {e}")
        raise HTTPException(status_code=500, detail="Błąd serwera podczas pobierania wyników.")


# --- 4. ENDPOINT ZAPISU Z STRONY/FEDERACJI ZEWNĘTRZNEJ ---
@router.post("/api/federation/upload")
async def track_federation_upload(
    targetUrl: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        candidate_id = str(uuid.uuid4())

        if files:
            main_file = files[0]
            file_bytes = await main_file.read()
            mime_type = main_file.content_type or "application/pdf"
            parsed_cv_text = extract_text_from_pdf_bytes(file_bytes)
            candidate_name = extract_candidate_name_pure_code(parsed_cv_text)
            base64_encoded = base64.b64encode(file_bytes).decode("utf-8")
            db_resume_value = f"data:{mime_type};base64,{base64_encoded}"
        else:
            db_resume_value = "Brak dołączonych dokumentów aplikacyjnych."
            parsed_cv_text = "Brak dołączonych dokumentów aplikacyjnych."
            candidate_name = "Kandydat Rekrutacyjny"

        conn = await asyncpg.connect(get_db_url())
        try:
            await conn.execute(
                """
                INSERT INTO candidates (id, full_name, applied_position, resume_text, parsed_cv_text, interview_status)
                VALUES ($1, $2, $3, $4, $5, 'Pending')
                """,
                candidate_id, candidate_name, "Stanowisko rekrutacyjne", db_resume_value, parsed_cv_text
            )
        finally:
            await conn.close()

        separator = "&" if "?" in targetUrl else "?"
        final_target_url = f"{targetUrl}{separator}uploadedFileId={candidate_id}&autoStart=true"

        return {"targetUrl": final_target_url}

    except Exception as e:
        print(f"❌ Błąd podczas zapisu dokumentów federacyjnych: {e}")
        raise HTTPException(status_code=500, detail="Nie udało się zapisać dokumentów w bazie.")


# --- 5. ENDPOINT FORMULARZA STANDARDOWEGO CV ---
@router.post("/api/candidates/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    applied_position: str = Form("Senior Python Developer")
):
    try:
        file_bytes = await file.read()
        mime_type = file.content_type or "application/pdf"

        parsed_text = extract_text_from_pdf_bytes(file_bytes)
        base64_encoded = base64.b64encode(file_bytes).decode("utf-8")
        db_resume_value = f"data:{mime_type};base64,{base64_encoded}"

        candidate_uuid = uuid.uuid4()
        candidate_id = str(candidate_uuid)

        candidate_name = extract_candidate_name_pure_code(parsed_text)

        # 2. Fallback do AI wyłącznie, gdy kod nie rozpoznał kandydata
        if not candidate_name or candidate_name == "Kandydat Rekrutacyjny":
            try:
                print("ℹCzysty kod nie wykrył imienia, uruchamianie fallbacku Gemini AI...")
                candidate_name = await extract_candidate_name_ai(parsed_text)
            except Exception as name_err:
                print(f"Nie udało się wyciągnąć imienia AI: {name_err}")
                candidate_name = "Kandydat Rekrutacyjny"

        conn = await asyncpg.connect(get_db_url())
        try:
            await conn.execute(
                """
                INSERT INTO candidates (id, full_name, applied_position, resume_text, parsed_cv_text, interview_status)
                VALUES ($1::uuid, $2, $3, $4, $5, 'Pending')
                ON CONFLICT (id) DO UPDATE 
                SET full_name = EXCLUDED.full_name,
                    resume_text = EXCLUDED.resume_text,
                    parsed_cv_text = EXCLUDED.parsed_cv_text,
                    applied_position = EXCLUDED.applied_position;
                """,
                candidate_uuid, candidate_name, applied_position, db_resume_value, parsed_text
            )
        finally:
            await conn.close()

        target_url = f"https://smiletoomee.com{candidate_id}&autoStart=true"

        return {
            "success": True,
            "candidate_id": candidate_uuid,
            "targetUrl": target_url
        }

    except Exception as e:
        print(f"Błąd podczas zapisu CV z formularza: {e}")
        raise HTTPException(status_code=500, detail="Nie udało się zapisać dokumentu w bazie.")