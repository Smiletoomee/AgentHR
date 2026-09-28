'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, Award, CheckCircle2, XCircle, Search, Edit3,
  UserCheck, TrendingUp, Sparkles, MoreVertical, FileText
} from 'lucide-react';
import { EditEvaluationModal } from '@/components/EditEvaluationModal';

export interface CandidateEvaluation {
  id: string;
  candidateId: string;
  interviewerName: string;
  jobPosition: string;
  evaluationType: string;
  skillCategory: string;
  score: number;
  maxScore: number;
  culturalFitScore: number | null;
  recommendation: string;
  isPassed: boolean;
  interviewSummary: string;
  keyStrengths: string | null;
  keyWeaknesses: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="hr-tooltip-box">
        <p className="hr-tooltip-label">ID: {label}</p>
        <p className="hr-tooltip-text">Stanowisko: <span className="hr-tooltip-position">{data.jobPosition}</span></p>
        <p className="hr-tooltip-text">Wynik Tech: <span className="hr-tooltip-score">{data.score}</span> / {data.maxScore}</p>
      </div>
    );
  }
  return null;
};

export default function HRDashboard() {
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<CandidateEvaluation | null>(null);
  const [, setIsSaving] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const handleSaveEvaluation = async (updatedData: Partial<CandidateEvaluation>) => {
    if (!editingItem) return;
    try {
      setIsSaving(true);

      const mappedPayload: Record<string, any> = {};
      for (const [key, value] of Object.entries(updatedData)) {
        mappedPayload[key] = value;

        if (key === 'jobPosition') mappedPayload['job_position'] = value;
        if (key === 'evaluationType') mappedPayload['evaluation_type'] = value;
        if (key === 'skillCategory') mappedPayload['skill_category'] = value;
        if (key === 'interviewerName') mappedPayload['interviewer_name'] = value;
        if (key === 'candidateId') mappedPayload['candidate_id'] = value;
        if (key === 'maxScore') mappedPayload['max_score'] = value;
        if (key === 'culturalFitScore') mappedPayload['cultural_fit_score'] = value;
        if (key === 'isPassed') mappedPayload['is_passed'] = value;
        if (key === 'interviewSummary') mappedPayload['interview_summary'] = value;
        if (key === 'keyStrengths') mappedPayload['key_strengths'] = value;
        if (key === 'keyWeaknesses') mappedPayload['key_weaknesses'] = value;
      }

      const res = await fetch(`/api/candidates/evaluations/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedPayload),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        console.error('API Error Response:', errorBody);
        throw new Error('Błąd podczas zapisywania');
      }

      await fetchEvaluations();
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [evaluations, loading, searchTerm, selectedRole]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/candidates/evaluations');
      if (!res.ok) throw new Error('Błąd pobierania ocen');
      const rawData = await res.json();

      const normalizedData = rawData.map((item: any, index: number) => {
        const realId = item.id || item.evaluation_id || item.evaluationId || item.uuid || item._id;

        return {
          id: realId ? String(realId) : `eval-${index}-${Date.now()}`,
          candidateId: item.candidateId || item.candidate_id || 'NIEZNANY',
          interviewerName: item.interviewerName || item.interviewer_name || 'Rekruter AI',
          jobPosition: item.jobPosition || item.job_position || 'Nieokreślone',
          evaluationType: item.evaluationType || item.evaluation_type || 'technical',
          skillCategory: item.skillCategory || item.skill_category || 'General',
          score: Number(item.score || 0),
          maxScore: Number(item.maxScore || item.max_score || 100),
          culturalFitScore: item.culturalFitScore ?? item.cultural_fit_score ?? null,
          recommendation: item.recommendation || 'hire',
          isPassed: item.isPassed ?? item.is_passed ?? false,
          interviewSummary: item.interviewSummary || item.interview_summary || 'Brak',
          keyStrengths: item.keyStrengths || item.key_strengths || null,
          keyWeaknesses: item.keyWeaknesses || item.key_weaknesses || null,
        };
      });
      setEvaluations(normalizedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ... existing code ...
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      const matchesSearch =
        item.candidateId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jobPosition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.interviewerName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || item.jobPosition === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [evaluations, searchTerm, selectedRole]);

  const stats = useMemo(() => {
    const total = evaluations.length;
    if (total === 0) return { total: 0, avgScore: 0, passRate: 0, hiresCount: 0 };
    const avgScore = (evaluations.reduce((acc, curr) => acc + (curr.score || 0), 0) / total).toFixed(1);
    const passed = evaluations.filter(i => i.isPassed).length;
    const passRate = ((passed / total) * 100).toFixed(0);
    const hiresCount = evaluations.filter(i => i.recommendation === 'hire' || i.recommendation === 'strong_hire').length;
    return { total, avgScore, passRate, hiresCount };
  }, [evaluations]);

  const uniquePositions = useMemo(() => Array.from(new Set(evaluations.map(e => e.jobPosition).filter(Boolean))), [evaluations]);

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'strong_hire': return <span className="hr-badge-strong-hire">Strong Hire</span>;
      case 'hire': return <span className="hr-badge-hire">Hire</span>;
      case 'no_hire': return <span className="hr-badge-no-hire">No Hire</span>;
      case 'strong_no_hire': return <span className="hr-badge-strong-no-hire">Strong No Hire</span>;
      default: return <span className="hr-badge-default">{rec}</span>;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">

        {/* NAGŁÓWEK */}
        <div className="dashboard-header">
          <div>
            <div className="hr-header-title-row">
              <span className="header-icon-wrapper"><Sparkles size={22} /></span>
              <h1 className="header-title">Panel Decyzyjny Rekrutera</h1>
            </div>
            <p className="header-subtitle">Zarządzaj wynikami technologicznymi i rekomendacjami weryfikacji AI.</p>
          </div>
        </div>

        {/* METRYKI */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="hr-stat-icon-users"><Users size={24} /></div>
            <div>
              <p className="stat-label">Przeprowadzone rozmowy</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="hr-stat-icon-award"><Award size={24} /></div>
            <div>
              <p className="stat-label">Średni Wynik</p>
              <p className="stat-value">{stats.avgScore} <span className="hr-stat-unit-text">pkt</span></p>
            </div>
          </div>
          <div className="stat-card">
            <div className="hr-stat-icon-check"><UserCheck size={24} /></div>
            <div>
              <p className="stat-label">Rekomendacje Pozytywne</p>
              <p className="stat-value">{stats.hiresCount}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="hr-stat-icon-trending"><TrendingUp size={24} /></div>
            <div>
              <p className="stat-label">Zdawalność Etapu</p>
              <p className="stat-value">{stats.passRate}%</p>
            </div>
          </div>
        </div>

        {/* WYKRES */}
        {evaluations.length > 0 && (
          <div className="chart-container">
            <h2 className="hr-chart-heading-text">Wyniki Ostatnich Ocen Technicznych</h2>
            <div className="hr-chart-body-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredEvaluations.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="candidateId" stroke="#64748b" tickFormatter={(v) => String(v).slice(0, 8)} />
                  <YAxis stroke="#64748b" />
                  <Tooltip cursor={{ fill: '#1e293b' }} content={<CustomTooltip />} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {filteredEvaluations.slice(0, 10).map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.isPassed ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* FILTRY */}
        <div className="filters-container">
          <div className="hr-search-input-wrapper">
            <Search className="hr-search-icon-element" size={18} />
            <input
              type="text"
              placeholder="Szukaj kandydata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="role-select"
          >
            <option value="all">Wszystkie stanowiska</option>
            {uniquePositions.map((pos, index) => (
              <option key={index} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        {/* LISTA OCEN */}
        <div className="eval-list-container">
          {loading ? (
            <p className="hr-list-empty-message">Ładowanie profili kandydatów...</p>
          ) : filteredEvaluations.length === 0 ? (
            <p className="hr-list-empty-message">Brak rekordów spełniających kryteria.</p>
          ) : (
            filteredEvaluations.map((item) => (
              <div key={item.id} className="eval-card scroll-animate">
                <div className="eval-row">
                  <span className="eval-label">Kandydat / ID</span>
                  <span className="eval-value hr-candidate-id-display">{String(item.candidateId).slice(0, 8)}...</span>
                </div>

                <div className="eval-row">
                  <span className="eval-label">Stanowisko & Etap</span>
                  <span className="eval-value">
                    <span className="hr-position-title">{item.jobPosition}</span>
                    <span className="hr-position-subtitle">{item.skillCategory} • {item.evaluationType}</span>
                  </span>
                </div>

                <div className="eval-row">
                  <span className="eval-label">Oceniający</span>
                  <span className="eval-value hr-interviewer-display">{item.interviewerName}</span>
                </div>

                <div className="eval-row">
                  <span className="eval-label">Wynik Tech / Fit</span>
                  <span className="eval-value hr-score-display">
                    {item.score} <span className="hr-score-max-display">/ {item.maxScore}</span>
                    <span className="hr-score-pipe">|</span>
                    {item.culturalFitScore !== null ? <span className="hr-cultural-score-display">{item.culturalFitScore}/10</span> : '-'}
                  </span>
                </div>

                <div className="eval-row">
                  <span className="eval-label">Rekomendacja & Status</span>
                  <span className="eval-value hr-recommendation-group">
                    {getRecommendationBadge(item.recommendation)}
                    <span className="hr-status-pipe">|</span>
                    {item.isPassed ? (
                      <span className="hr-status-passed-badge"><CheckCircle2 size={14} /> Zdany</span>
                    ) : (
                      <span className="hr-status-rejected-badge"><XCircle size={14} /> Odrzucony</span>
                    )}
                  </span>
                </div>

                <div className="eval-row hr-action-row-border">
                  <span className="eval-label">Akcja</span>
                  <div className="eval-value hr-action-container">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                      className="action-btn"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openDropdownId === item.id && (
                      <div className="dropdown-menu">
                        <button
                          onClick={() => { setEditingItem(item); setOpenDropdownId(null); }}
                          className="dropdown-item"
                        >
                          <Edit3 size={14} className="hr-icon-blue" /> Modyfikuj ocenę
                        </button>
                        <button className="dropdown-item">
                          <FileText size={14} className="hr-icon-emerald" /> Generuj raport
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL EDYCJI INTEGRACJA */}
        {editingItem && (
          <EditEvaluationModal
            isOpen={!!editingItem}
            evaluation={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleSaveEvaluation}
          />
        )}

      </div>
    </div>
  );
}