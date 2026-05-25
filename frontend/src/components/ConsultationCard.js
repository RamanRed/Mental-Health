'use client';

import React, { useState } from 'react';
import { SESSION_STATUSES } from '@/lib/constants';

export default function ConsultationCard({ consultation }) {
  const [expanded, setExpanded] = useState(false);

  if (!consultation) return null;

  const dateStr = consultation.scheduled_at
    ? new Date(consultation.scheduled_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(consultation.created_at).toLocaleDateString('en-IN');

  const statusInfo = SESSION_STATUSES[consultation.status?.toUpperCase()] || { label: consultation.status || 'Scheduled', color: '#3B82F6' };

  return (
    <div className="consultation-card glass-card-static flex-col">
      <div className="card-header flex-between">
        <div className="session-meta">
          <span className="session-number">Session #{consultation.session_number || 1}</span>
          <h4 className="session-type">{consultation.session_type?.replace('_', ' ').toUpperCase()}</h4>
        </div>
        <span className="status-badge" style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
          {statusInfo.label}
        </span>
      </div>

      <div className="card-details flex-between">
        <span className="session-date">📅 {dateStr}</span>
        <span className="session-format">💻 {consultation.format?.replace('_', ' ')}</span>
      </div>

      {consultation.consultation_summary && (() => {
        let parsed = null;
        try {
          parsed = JSON.parse(consultation.consultation_summary);
        } catch (e) {
          // fallback to plain text
        }
        
        return (
          <div className="summary-section">
            <button className="expand-btn flex-row" onClick={() => setExpanded(!expanded)}>
              <span>{expanded ? 'Hide Record' : 'View Record of Consultation'}</span>
              <span>{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
              <div className="summary-content animate-fade-in flex-col" style={{ gap: '12px' }}>
                {parsed && typeof parsed === 'object' && (parsed.summary !== undefined || parsed.verdict !== undefined || parsed.notes !== undefined) ? (
                  <>
                    {parsed.summary && (
                      <div className="record-part">
                        <h5>Doctor's Summary Note:</h5>
                        <p>{parsed.summary}</p>
                      </div>
                    )}
                    {parsed.verdict && (
                      <div className="record-part" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
                        <h5>Final Diagnosis / Verdict:</h5>
                        <p style={{ fontWeight: '600', color: 'var(--color-doctor-light)' }}>{parsed.verdict}</p>
                      </div>
                    )}
                    {parsed.notes && (
                      <div className="record-part" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
                        <h5>Clinical Notes & Observations:</h5>
                        <p style={{ fontStyle: 'italic', fontSize: '13px' }}>{parsed.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="record-part">
                    <h5>Doctor's Summary Note:</h5>
                    <p>{consultation.consultation_summary}</p>
                  </div>
                )}
                {consultation.doctor_validated_form && (
                  <div className="form-data-details">
                    <h5>Validated Clinical Form Data:</h5>
                    <pre>{JSON.stringify(consultation.doctor_validated_form, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <style jsx>{`
        .consultation-card {
          border: 1px solid rgba(255, 255, 255, 0.05);
          gap: var(--space-md);
        }

        .session-number {
          font-size: var(--font-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .session-type {
          font-size: var(--font-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 2px;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: var(--font-xs);
          font-weight: 600;
        }

        .card-details {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .summary-section {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: var(--space-md);
          margin-top: var(--space-xs);
        }

        .expand-btn {
          background: transparent;
          color: var(--color-patient-light);
          font-size: var(--font-xs);
          font-weight: 600;
          gap: var(--space-sm);
          cursor: pointer;
        }

        .summary-content {
          margin-top: var(--space-md);
          background: rgba(15, 23, 42, 0.3);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .summary-content h5 {
          font-size: var(--font-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: var(--space-sm);
        }

        .summary-content p {
          font-size: var(--font-sm);
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .form-data-details {
          margin-top: var(--space-md);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: var(--space-md);
        }

        .form-data-details pre {
          font-family: monospace;
          font-size: var(--font-xs);
          color: var(--text-tertiary);
          overflow-x: auto;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}
