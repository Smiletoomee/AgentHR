import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/index';
import { candidates } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, sessionNumber, score, fileNames, extractedTextContent, fileBase64Data, fileMimeType } = body;

    if (!id) {
      return NextResponse.json({ error: 'Brak ID kandydata' }, { status: 400 });
    }

    // Jeśli przekazano plik binarny w Base64, zapisujemy go w formacie Data URL
    const dbResumeValue = (fileBase64Data && fileMimeType)
      ? `data:${fileMimeType};base64,${fileBase64Data}`
      : (extractedTextContent || 'Brak treści dokumentu.');

    // Zapisujemy dane bezpośrednio w tabeli 'candidates' w bazie ai_recruiter
    await db.insert(candidates).values({
      id, // Używamy tego samego UUID przekazanego z Serwisu A
      fullName: fileNames ? `Kandydat (${fileNames})` : `Kandydat ${sessionNumber}`,
      appliedPosition: `Sesja rekrutacyjna ${sessionNumber}`,
      resumeText: dbResumeValue,
      parsedCvText: extractedTextContent || null,
      interviewStatus: 'Pending',
    }).onConflictDoUpdate({
      target: candidates.id,
      set: {
        resumeText: dbResumeValue,
        parsedCvText: extractedTextContent || null,
      }
    });

    return NextResponse.json({ success: true, message: 'Kandydat został zsynchronizowany do tabeli candidates.' });

  } catch (error) {
    console.error('Błąd zapisu synchronizacji w Serwisie B:', error);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 });
  }
}