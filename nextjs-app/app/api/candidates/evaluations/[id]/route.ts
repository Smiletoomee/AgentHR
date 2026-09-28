import { NextResponse } from 'next/server';
import { db } from '@/lib/index';
import { candidateEvaluations } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; 
    const body = await request.json();

    if (!id || id.startsWith('eval-')) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy identyfikator rekordu' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [updated] = await db
      .update(candidateEvaluations)
      .set({
        // obsługa camelCase oraz snake_case
        interviewerName: (body.interviewerName ?? body.interviewer_name) !== undefined 
          ? String(body.interviewerName ?? body.interviewer_name) 
          : undefined,
        jobPosition: (body.jobPosition ?? body.job_position) !== undefined 
          ? String(body.jobPosition ?? body.job_position) 
          : undefined,
        evaluationType: (body.evaluationType ?? body.evaluation_type) !== undefined 
          ? String(body.evaluationType ?? body.evaluation_type) 
          : undefined,
        skillCategory: (body.skillCategory ?? body.skill_category) !== undefined 
          ? String(body.skillCategory ?? body.skill_category) 
          : undefined,

        // Bezpieczne mapowanie pozostałych pól zgodnie z typami w tabeli
        score: body.score !== undefined ? Number(body.score) : undefined,
        maxScore: (body.maxScore ?? body.max_score) !== undefined 
          ? Number(body.maxScore ?? body.max_score) 
          : undefined,
        culturalFitScore: body.culturalFitScore !== undefined && body.culturalFitScore !== null 
          ? Number(body.culturalFitScore) 
          : (body.culturalFitScore === null ? null : undefined), // Pozwalamy na zapisanie null, jeśli pole nie jest wymagane
        recommendation: body.recommendation !== undefined ? String(body.recommendation) : undefined,
        isPassed: body.isPassed !== undefined ? Boolean(body.isPassed) : undefined,
        interviewSummary: body.interviewSummary !== undefined ? String(body.interviewSummary) : undefined,
        keyStrengths: body.keyStrengths !== undefined ? body.keyStrengths : undefined,
        keyWeaknesses: body.keyWeaknesses !== undefined ? body.keyWeaknesses : undefined,
      })
      // Upewniamy się, że id przekazywane do klauzuli eq() jest traktowane jako czysty ciąg UUID
      .where(eq(candidateEvaluations.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Nie znaleziono oceny o podanym ID' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Błąd aktualizacji oceny kandydata:', error);
    return NextResponse.json({ error: 'Błąd podczas zapisu zmian' }, { status: 500 });
  }
}