import os
import asyncpg

def get_db_url() -> str:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_user = os.getenv("POSTGRES_USER", "postgres")
        db_pass = os.getenv("POSTGRES_PASSWORD", "")
        db_host = os.getenv("POSTGRES_HOST", "postgres")
        db_name = os.getenv("POSTGRES_DB", "ai_recruiter")
        db_url = f"postgresql://{db_user}:{db_pass}@{db_host}:5432/{db_name}"
    
    # Obsługa lokalnego przemapowania portu container vs host
    if ":5434" in db_url:
        db_url = db_url.replace(":5434", ":5432")
    return db_url

async def fetch_candidate_cv(candidate_id: str):
    db_url = get_db_url()
    conn = await asyncpg.connect(db_url)
    try:
        return await conn.fetchrow(
            "SELECT applied_position, parsed_cv_text, resume_text, full_name FROM candidates WHERE id = $1",
            candidate_id
        )
    finally:
        await conn.close()

async def upsert_candidate(candidate_id: str, applied_position: str, resume_text: str):
    db_url = get_db_url()
    conn = await asyncpg.connect(db_url)
    try:
        await conn.execute(
            """
            INSERT INTO candidates (id, applied_position, resume_text, interview_status)
            VALUES ($1, $2, $3, 'Pending')
            ON CONFLICT (id) DO UPDATE 
            SET resume_text = EXCLUDED.resume_text, 
                applied_position = EXCLUDED.applied_position;
            """,
            candidate_id, applied_position, resume_text
        )
    finally:
        await conn.close()