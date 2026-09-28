'use client';

import React, { useState } from 'react';
import { X, Save, AlertCircle, Briefcase, Award } from 'lucide-react';
import { CandidateEvaluation } from '@/app/hr/dashboard/page';

interface EditEvaluationModalProps {
    evaluation: CandidateEvaluation;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updated: CandidateEvaluation) => Promise<void>;
}

export function EditEvaluationModal({
    evaluation,
    isOpen,
    onClose,
    onSave,
}: EditEvaluationModalProps) {
    const [formData, setFormData] = useState<CandidateEvaluation>({ ...evaluation });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="eval-modal-backdrop">
            <div className="eval-modal-panel">

                {/* NAGŁÓWEK DRAWERA */}
                <div className="eval-modal-header">
                    <div>
                        <h2 className="eval-modal-title">
                            Edycja Profilu Oceny
                        </h2>
                        <p className="eval-modal-subtitle">
                            Kandydat ID: {formData.candidateId}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="eval-modal-close-button"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* FORMULARZ Z PŁYNNYM SCROLLEM */}
                <div className="eval-modal-body">
                    {errorMessage && (
                        <div className="eval-modal-error-banner">
                            <AlertCircle size={16} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form id="evaluation-edit-form" onSubmit={handleSubmit} className="eval-modal-form">

                        {/* SEKCJA 1: STANOWISKO I ETAP */}
                        <div className="eval-modal-section-card">
                            <h3 className="eval-modal-section-heading-blue">
                                <Briefcase size={14} /> Stanowisko & Etap
                            </h3>

                            <div className="eval-modal-grid-two-cols">
                                <div>
                                    <label className="eval-modal-field-label">
                                        Aplikowane Stanowisko
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.jobPosition}
                                        onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                                        className="eval-modal-field-input"
                                    />
                                </div>

                                <div>
                                    <label className="eval-modal-field-label">
                                        Kategoria / Umiejętność
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.skillCategory}
                                        onChange={(e) => setFormData({ ...formData, skillCategory: e.target.value })}
                                        className="eval-modal-field-input"
                                    />
                                </div>

                                <div>
                                    <label className="eval-modal-field-label">
                                        Typ Etapu
                                    </label>
                                    <select
                                        value={formData.evaluationType}
                                        onChange={(e) => setFormData({ ...formData, evaluationType: e.target.value })}
                                        className="eval-modal-field-input"
                                    >
                                        <option value="technical">Techniczny</option>
                                        <option value="cultural">Kulturowy / Soft skills</option>
                                        <option value="hr">Wstępny HR</option>
                                        <option value="language">Językowy</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="eval-modal-field-label">
                                        Osoba Oceniająca
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.interviewerName}
                                        onChange={(e) => setFormData({ ...formData, interviewerName: e.target.value })}
                                        className="eval-modal-field-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SEKCJA 2: PUNKTY I OCENA */}
                        <div className="eval-modal-section-card">
                            <h3 className="eval-modal-section-heading-emerald">
                                <Award size={14} /> Wyniki & Oceny
                            </h3>

                            <div className="eval-modal-grid-three-cols">
                                <div>
                                    <label className="eval-modal-field-label">
                                        Wynik Tech
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={formData.maxScore}
                                        value={formData.score}
                                        onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                                        className="eval-modal-field-input"
                                    />
                                </div>

                                <div>
                                    <label className="eval-modal-field-label">
                                        Maksymalna Liczba Pkt
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.maxScore}
                                        onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                                        className="eval-modal-field-input"
                                    />
                                </div>

                                <div>
                                    <label className="eval-modal-field-label">
                                        Fit Kulturowy (1-10)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        placeholder="Brak"
                                        value={formData.culturalFitScore ?? ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            culturalFitScore: e.target.value ? Number(e.target.value) : null
                                        })}
                                        className="eval-modal-field-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SEKCJA 3: DECYZJA REKRUTACYJNA */}
                        <div className="eval-modal-section-card">
                            <h3 className="eval-modal-section-heading-purple">
                                Decyzja Rekrutacyjna
                            </h3>

                            <div className="eval-modal-grid-two-cols">
                                <div>
                                    <label className="eval-modal-field-label">
                                        Rekomendacja
                                    </label>
                                    <select
                                        value={formData.recommendation}
                                        onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                                        className="eval-modal-field-input"
                                    >
                                        <option value="strong_hire">🚀 Strong Hire</option>
                                        <option value="hire">✅ Hire</option>
                                        <option value="no_hire">⚠️ No Hire</option>
                                        <option value="strong_no_hire">🛑 Strong No Hire</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="eval-modal-field-label">
                                        Kwalifikacja do Kolejnego Etapu
                                    </label>
                                    <div className="eval-modal-toggle-wrapper">
                                        <label className="eval-modal-toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.isPassed}
                                                onChange={(e) => setFormData({ ...formData, isPassed: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="eval-modal-toggle-track"></div>
                                            <span className="eval-modal-toggle-status-text">
                                                {formData.isPassed ? 'Etap Zaliczony' : 'Odrzucony'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEKCJA 4: ANALIZA JAKOŚCIOWA */}
                        <div className="eval-modal-qualitative-section">
                            <div>
                                <label className="eval-modal-field-label">
                                    Podsumowanie Wywiadu (Interview Summary)
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.interviewSummary}
                                    onChange={(e) => setFormData({ ...formData, interviewSummary: e.target.value })}
                                    className="eval-modal-textarea"
                                />
                            </div>

                            <div>
                                <label className="eval-modal-field-label">
                                    Kluczowe Mocne Strony (Key Strengths)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Wypunktuj mocne strony..."
                                    value={formData.keyStrengths ?? ''}
                                    onChange={(e) => setFormData({ ...formData, keyStrengths: e.target.value })}
                                    className="eval-modal-textarea"
                                />
                            </div>

                            <div>
                                <label className="eval-modal-field-label">
                                    Obszary do Poprawy / Ryzyka (Key Weaknesses)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Wypunktuj wątpliwości lub braki techniczne..."
                                    value={formData.keyWeaknesses ?? ''}
                                    onChange={(e) => setFormData({ ...formData, keyWeaknesses: e.target.value })}
                                    className="eval-modal-textarea"
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* STOPKA Z PRZYCISKAMI */}
                <div className="eval-modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="eval-modal-cancel-button"
                    >
                        Anuluj
                    </button>
                    <button
                        type="submit"
                        form="evaluation-edit-form"
                        disabled={isSubmitting}
                        className="eval-modal-submit-button"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="eval-modal-button-spinner" />
                                Zapisywanie...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Zapisz Zmiany
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
