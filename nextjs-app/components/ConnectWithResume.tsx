'use client';

import { useState, ChangeEvent } from 'react';

interface ConnectWithResumeProps {
    onStartConnection: (candidateId?: string) => void;
    status: 'idle' | 'connecting' | 'active' | 'completed';
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function ConnectWithResume({ onStartConnection, status }: ConnectWithResumeProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [appliedPosition, setAppliedPosition] = useState<string>('Senior Python Developer');

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setErrorMessage(null);
        const file = e.target.files?.[0];

        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (file.type !== 'application/pdf') {
            setErrorMessage('Dozwolone są wyłącznie pliki w formacie PDF.');
            setSelectedFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            setErrorMessage('Rozmiar pliku nie może przekraczać 5 MB.');
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    };

    const handleStartSession = async () => {
        setErrorMessage(null);

        // Jeśli użytkownik dołączył plik, wysyłamy go najpierw na backend
        if (selectedFile) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('applied_position', appliedPosition);

                const response = await fetch('/api/candidates/upload-resume', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Nie udało się przesłać pliku CV.');
                }

                const data = await response.json();
                setIsUploading(false);
                // Nawiązanie połączenia WebSocket z identyfikatorem nowo utworzonego kandydata
                onStartConnection(data.candidate_id);
            } catch (err) {
                setIsUploading(false);
                setErrorMessage(err instanceof Error ? err.message : 'Wystąpił błąd podczas wysyłania pliku.');
            }
        } else {
            // Rozpoczęcie połączenia bez nowego pliku (np. na bazie istniejącego kontekstu w URL)
            onStartConnection();
        }
    };

    const isConnecting = status === 'connecting' || isUploading;

    return (
        <div className="resume-connect-wrapper">
            {/* Sekcja wyboru pliku PDF */}
            <div className="resume-upload-card">
                <label className="resume-upload-label">
                    Dodaj tu swoje CV, plik PDF max 5MB.:
                </label>

                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={isConnecting || status === 'active'}
                    className="resume-file-input"
                />

                {selectedFile && (
                    <p className="resume-file-success-info">
                        Wybrano plik: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                )}

                {errorMessage && (
                    <p className="resume-error-notice">
                        Błąd : {errorMessage}
                    </p>
                )}
            </div>

            {/* Opcjonalne pole stanowiska */}
            <div className="resume-upload-card">
                <label className="auth-label mb-1 block">
                    Aplikowane stanowisko:
                </label>
                <input
                    type="text"
                    value={appliedPosition}
                    onChange={(e) => setAppliedPosition(e.target.value)}
                    disabled={isConnecting || status === 'active'}
                    className="resume-position-input"
                />
            </div>

            {/* Przycisk nawiązania połączenia WebSocket */}
            <button
                onClick={handleStartSession}
                disabled={isConnecting || status === 'active'}
                className="resume-connect-submit-button"
            >
                {isConnecting ? (
                    <>
                        <span className="resume-button-spinner" />
                        {isUploading ? 'Przesyłanie CV...' : 'Łączenie z Agentem AI...'}
                    </>
                ) : (
                    'Nawiąż połączenie z AI Recruiterem'
                )}
            </button>
        </div>
    );
}