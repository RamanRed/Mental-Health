'use client';

import React, { useState, useEffect } from 'react';
import { getPatientConsultations } from '@/lib/api';
import ConsultationCard from '@/components/ConsultationCard';

export default function PatientConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPatientConsultations();
        setConsultations(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch consultations history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="consultations-page flex-col">
      <div className="section-header">
        <h2>Your Consultations</h2>
        <p className="welcome-subtitle">Review all scheduled sessions, doctor validations, and clinical summary notes.</p>
      </div>

      {loading ? (
        <div className="page-loading flex-center"><div className="spinner animate-spin"></div></div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : consultations.length === 0 ? (
        <div className="no-consultations glass-card-static flex-col flex-center animate-fade-in">
          <span className="no-consult-icon">🤝</span>
          <h3>No Consultation Records Found</h3>
          <p className="text-secondary font-sm">When you have diagnostic sessions scheduled with doctors, they will be listed here.</p>
        </div>
      ) : (
        <div className="consultations-list flex-col">
          {consultations.map((c) => (
            <ConsultationCard key={c.id} consultation={c} />
          ))}
        </div>
      )}

      <style jsx>{`
        .consultations-page {
          gap: var(--space-xl);
        }

        .page-loading {
          min-height: 300px;
        }

        .no-consultations {
          padding: var(--space-3xl) var(--space-xl);
          text-align: center;
          gap: var(--space-sm);
        }

        .no-consult-icon {
          font-size: 3rem;
          opacity: 0.2;
        }

        .consultations-list {
          gap: var(--space-lg);
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
