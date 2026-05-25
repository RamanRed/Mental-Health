'use client';

import React, { useState, useEffect } from 'react';
import { getQuestionnaireDomains, saveQuestionnaire, getPatientProfile } from '@/lib/api';
import { QUESTIONNAIRE_DOMAINS } from '@/lib/constants';

export default function QuestionnairePage() {
  const [profile, setProfile] = useState(null);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: { answerText, score } }
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInfo() {
      try {
        const p = await getPatientProfile();
        setProfile(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, []);

  const currentDomain = QUESTIONNAIRE_DOMAINS[currentDomainIndex];

  const handleSelectOption = (questionId, questionText, optionText, score) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question: questionText,
        answer: optionText,
        score,
      },
    }));
  };

  const isDomainAnswered = (domain) => {
    return domain.questions.every((q) => !!answers[q.id]);
  };

  const handleSaveProgress = async (completed = false) => {
    setError('');
    setMessage('');
    setSubmitting(true);

    // Format current domain answers into the API list payload
    const domainQuestions = currentDomain.questions.map((q) => {
      const ansObj = answers[q.id] || { question: q.text, answer: 'Not Answered', score: 0 };
      return {
        question: q.text,
        answer: ansObj.answer,
        score: ansObj.score,
      };
    });

    const payload = {
      patient_id: profile.id,
      domain: currentDomain.id,
      questions: domainQuestions,
      completed,
    };

    try {
      await saveQuestionnaire(payload);
      setMessage(completed ? 'Questionnaire submitted successfully!' : 'Domain progress saved!');
      
      if (!completed && currentDomainIndex < QUESTIONNAIRE_DOMAINS.length - 1) {
        // Go to next domain after brief delay
        setTimeout(() => {
          setCurrentDomainIndex(currentDomainIndex + 1);
          setMessage('');
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save questionnaire progress.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    // Check if ALL domains answered
    const allAnswered = QUESTIONNAIRE_DOMAINS.every((d) => isDomainAnswered(d));
    if (!allAnswered) {
      setError('Please answer all questions in all domains before final submission.');
      return;
    }
    handleSaveProgress(true);
  };

  if (loading) {
    return (
      <div className="questionnaire-loading flex-center">
        <div className="spinner animate-spin"></div>
      </div>
    );
  }

  const progressPct = Math.round((Object.keys(answers).length / QUESTIONNAIRE_DOMAINS.reduce((acc, d) => acc + d.questions.length, 0)) * 100);

  return (
    <div className="questionnaire-page flex-col">
      <div className="questionnaire-header flex-col">
        <h2>Wellness Assessment</h2>
        <p className="welcome-subtitle">Complete this diagnostic questionnaire. The answers help configure your wellness diagnostics.</p>
        
        {/* Progress bar */}
        <div className="progress-bar-wrapper flex-row">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
          </div>
          <span className="progress-text">{progressPct}% Answered</span>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="questionnaire-grid">
        {/* Left Sidebar: Domains */}
        <div className="domains-sidebar glass-card-static flex-col">
          <h3>Domains</h3>
          <ul className="domains-list flex-col">
            {QUESTIONNAIRE_DOMAINS.map((domain, index) => {
              const isActive = index === currentDomainIndex;
              const isAnswered = isDomainAnswered(domain);

              return (
                <li key={domain.id} className="domain-item">
                  <button
                    onClick={() => setCurrentDomainIndex(index)}
                    className={`domain-btn flex-row ${isActive ? 'active' : ''}`}
                  >
                    <span className="domain-icon-lbl">{domain.icon}</span>
                    <span className="domain-title-lbl">{domain.title}</span>
                    <span className="domain-check-lbl">{isAnswered ? '✓' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Main Content Area */}
        <div className="questions-card glass-card-static flex-col">
          <div className="domain-header flex-col">
            <div className="domain-title-meta flex-row">
              <span className="domain-icon-large">{currentDomain.icon}</span>
              <h4>{currentDomain.title}</h4>
            </div>
            <p className="domain-desc-text">{currentDomain.description}</p>
          </div>

          <div className="questions-list flex-col">
            {currentDomain.questions.map((q) => {
              const currentAnswerObj = answers[q.id];
              const isSensitive = q.sensitive;

              return (
                <div key={q.id} className={`question-item flex-col ${isSensitive ? 'sensitive-question' : ''}`}>
                  <span className="question-text">{q.text} {isSensitive && <span className="sensitive-tag">(Sensitive)</span>}</span>
                  
                  {q.type === 'yesno' ? (
                    <div className="options-row flex-row">
                      {['Yes', 'No'].map((option, idx) => {
                        const isSelected = currentAnswerObj?.answer === option;
                        // Score calculation for Yes/No (Yes = 0, No = 5 by default, except reverse cases)
                        const score = option === 'No' ? 5 : 0;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSelectOption(q.id, q.text, option, score)}
                            className={`option-btn ${isSelected ? 'selected' : ''}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="options-row flex-row">
                      {q.options.map((option, idx) => {
                        const isSelected = currentAnswerObj?.answer === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSelectOption(q.id, q.text, option, idx + 1)}
                            className={`option-btn ${isSelected ? 'selected' : ''}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="navigation-actions-row flex-between">
            <button
              onClick={() => setCurrentDomainIndex(currentDomainIndex - 1)}
              className="btn btn-secondary"
              disabled={currentDomainIndex === 0 || submitting}
            >
              Previous Domain
            </button>

            {currentDomainIndex < QUESTIONNAIRE_DOMAINS.length - 1 ? (
              <button
                onClick={() => handleSaveProgress(false)}
                className="btn btn-primary"
                disabled={submitting}
              >
                Save & Next Domain
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                className="btn btn-primary finalize-btn"
                disabled={submitting}
              >
                Finalize & Submit Test
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .questionnaire-page {
          gap: var(--space-xl);
        }

        .questionnaire-loading {
          min-height: 400px;
        }

        .questionnaire-header {
          gap: var(--space-md);
        }

        .progress-bar-wrapper {
          gap: var(--space-md);
          align-items: center;
        }

        .progress-bar-track {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--gradient-patient);
          border-radius: var(--radius-full);
          transition: width var(--transition-base);
        }

        .progress-text {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .questionnaire-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: var(--space-xl);
          align-items: start;
        }

        .domains-sidebar {
          padding: var(--space-md);
          gap: var(--space-md);
        }

        .domains-sidebar h3 {
          font-size: var(--font-md);
          font-weight: 600;
          color: var(--text-primary);
          padding-left: var(--space-xs);
        }

        .domains-list {
          gap: var(--space-xs);
        }

        .domain-btn {
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          text-align: left;
          font-size: var(--font-sm);
          font-weight: 500;
          transition: all var(--transition-fast);
          align-items: center;
        }

        .domain-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .domain-btn.active {
          background: var(--color-patient-bg);
          color: var(--color-patient-light);
          border: 1px solid rgba(13, 148, 136, 0.15);
        }

        .domain-icon-lbl {
          font-size: 1.1rem;
          margin-right: 6px;
        }

        .domain-title-lbl {
          flex: 1;
        }

        .domain-check-lbl {
          font-weight: 700;
          color: var(--color-success);
        }

        .questions-card {
          gap: var(--space-xl);
          padding: var(--space-xl);
        }

        .domain-header {
          gap: var(--space-xs);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: var(--space-md);
        }

        .domain-title-meta {
          align-items: center;
          gap: var(--space-sm);
        }

        .domain-icon-large {
          font-size: 2rem;
        }

        .domain-header h4 {
          font-size: var(--font-xl);
          font-weight: 600;
        }

        .domain-desc-text {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .questions-list {
          gap: var(--space-xl);
        }

        .question-item {
          gap: var(--space-md);
        }

        .question-text {
          font-size: var(--font-base);
          color: var(--text-primary);
          font-weight: 500;
        }

        .sensitive-question {
          background: rgba(239, 68, 68, 0.02);
          border: 1px dashed rgba(239, 68, 68, 0.15);
          padding: var(--space-md);
          border-radius: var(--radius-md);
        }

        .sensitive-tag {
          font-size: var(--font-xs);
          color: #EF4444;
          font-weight: 600;
          margin-left: var(--space-xs);
        }

        .options-row {
          gap: var(--space-sm);
          flex-wrap: wrap;
        }

        .option-btn {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 10px 18px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: var(--font-sm);
          transition: all var(--transition-fast);
        }

        .option-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
        }

        .option-btn.selected {
          background: var(--gradient-patient);
          color: white;
          border-color: transparent;
        }

        .navigation-actions-row {
          margin-top: var(--space-lg);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: var(--space-lg);
        }

        .finalize-btn {
          background: linear-gradient(135deg, #10B981, #059669);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
        }

        .success-banner {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: var(--font-sm);
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #EF4444;
          padding: var(--space-md);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: var(--font-sm);
        }
      `}</style>
    </div>
  );
}
