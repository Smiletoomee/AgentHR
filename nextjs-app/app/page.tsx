'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCandidateData } from '@/hooks/useCandidateData';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import { ConnectWithResume } from '@/components/ConnectWithResume';

function CandidateInterviewContent() {
  const searchParams = useSearchParams();
  const { cvData, uploadedFile, isLoadingCv, isLoadingFile } = useCandidateData(searchParams);
  const { status, timeLeft, startInterview, endInterview } = useInterviewSession(cvData, uploadedFile);

  useEffect(() => {
    const shouldAutoStart = searchParams.get('autoStart') === 'true';
    const isCvLoaded = cvData !== null;
    const isFileLoadedIfRequired = searchParams.get('uploadedFileId') || searchParams.get('sessionId')
      ? uploadedFile !== null
      : true;

    if (shouldAutoStart && isCvLoaded && isFileLoadedIfRequired && status === 'idle') {
      startInterview();
    }
  }, [cvData, uploadedFile, searchParams, status, startInterview]);

  return (
    <div className="interview-page-container">
      <div className="interview-background-grid" />

      <div className="interview-card">
        {(isLoadingCv || isLoadingFile) && (
          <div className="interview-loading-notice">
            Inicjalizowanie plików sesji i pobieranie danych z bazy...
          </div>
        )}

        {/* STAN: IDLE - Wybór pliku PDF (max 5 MB) i Nawiązanie połączenia */}
        {status === 'idle' && !(isLoadingCv || isLoadingFile) && (
          <div className="interview-section-wrapper">
            <div>
              <h1 className="interview-main-title">Check Technical Language with HR Agent</h1>
              <p className="interview-main-subtitle">Zostanie zadane kilka pytań na podstawie Twojego życiorysu. Powodzenia! </p>
            </div>

            <ConnectWithResume
              status={status}
              onStartConnection={(candidateId) => startInterview(candidateId)}
            />
          </div>
        )}

        {/* STAN: CONNECTING */}
        {status === 'connecting' && (
          <div className="interview-section-wrapper">
            <h2 className="interview-status-heading-blue">Łączenie...</h2>
            <p className="interview-status-description">Autoryzacja mikrofonu i konfiguracja strumienia Live Agenta.</p>
          </div>
        )}

        {/* STAN: ACTIVE - Rozmowa trwa z wskaźnikiem nasłuchiwania Gemini */}
        {status === 'active' && (
          <div className="interview-section-wrapper">
            <div className="interview-live-bar">
              <span className="interview-live-badge">
                <span className="interview-live-indicator-dot" /> LIVE
              </span>
              <span className="interview-timer-display">Pozostało: {timeLeft}s</span>
            </div>

            {/* INTEGRACJA WIZUALNEGO STATUSU NASŁUCHIWANIA AGENTA GEMINI */}
            <div className="interview-listening-box">
              <div className="interview-equalizer-bars">
                <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-4" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-7" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-5" style={{ animationDelay: '300ms' }} />
                <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-8" style={{ animationDelay: '450ms' }} />
                <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-3" style={{ animationDelay: '600ms' }} />
              </div>
              <div className="text-center">
                <p className="interview-listening-label">
                  <span className="interview-listening-pulse-dot" />
                  Siena nasłuchuje non stop, nawet jak to Ona mówi.
                </p>
                <p className="interview-listening-hint">Twój mikrofon jest aktywny. Możesz teraz odpowiedzieć.</p>
              </div>
            </div>

            <button
              onClick={endInterview}
              className="interview-disconnect-button"
            >
              Rozłącz rozmowę
            </button>
          </div>
        )}

        {/* STAN: COMPLETED */}
        {status === 'completed' && (
          <div className="interview-section-wrapper">
            <h2 className="interview-status-heading-emerald">Rozmowa ukończona</h2>
            <p className="interview-status-description">Dziękujemy! Twój wywiad techniczny został zapisany i przekazany rekruterowi.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CandidateInterviewPage() {
  return (
    <Suspense fallback={<div className="interview-suspense-fallback">Ładowanie widoku...</div>}>
      <CandidateInterviewContent />
    </Suspense>
  );
}