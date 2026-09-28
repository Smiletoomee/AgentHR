import { NextResponse } from 'next/server';
import { db } from '@/lib/index';
import { candidateEvaluations } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const evaluations = await db
      .select()
      .from(candidateEvaluations)
      .orderBy(desc(candidateEvaluations.createdAt));

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Błąd pobierania ocen z bazy danych:', error);
    return NextResponse.json(
      { error: 'Błąd podczas pobierania ocen kandydatów.' },
      { status: 500 }
    );
  }
}