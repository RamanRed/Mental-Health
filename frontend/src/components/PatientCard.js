'use client';

import React from 'react';
import RiskBadge from './RiskBadge';

export default function PatientCard({ patient, onClick }) {
  if (!patient) return null;

  return (
    <div className="patient-card glass-card" onClick={onClick}>
      <div className="card-header flex-between">
        <div className="patient-meta">
          <h3 className="patient-name">{patient.full_name}</h3>
          <span className="abha-id-badge">ABHA: {patient.abha_id || 'Not Linked'}</span>
        </div>
        {/* Mock risk level for representation, default to 'low' if not provided */}
        <RiskBadge riskLevel={patient.risk_level || 'low'} />
      </div>

      <div className="card-body grid-2">
        <div className="meta-item flex-col">
          <span className="meta-label">Age / Gender</span>
          <span className="meta-val">{patient.age} yrs / {patient.gender}</span>
        </div>
        <div className="meta-item flex-col">
          <span className="meta-label">Location</span>
          <span className="meta-val">{patient.village}, {patient.district}</span>
        </div>
        <div className="meta-item flex-col">
          <span className="meta-label">Language Preference</span>
          <span className="meta-val">{patient.language_preference || 'English'}</span>
        </div>
        <div className="meta-item flex-col">
          <span className="meta-label">Literacy Level</span>
          <span className="meta-val" style={{ textTransform: 'capitalize' }}>
            {patient.literacy_level ? patient.literacy_level.replace('_', ' ') : 'Literate'}
          </span>
        </div>
      </div>

      <div className="card-footer flex-between">
        <span className="last-checkin">Last check-in: 1 day ago</span>
        <button className="view-detail-btn">View Profile ➔</button>
      </div>

      <style jsx>{`
        .patient-card {
          cursor: pointer;
          transition: all var(--transition-base);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .patient-card:hover {
          transform: translateY(-4px);
          border-color: rgba(13, 148, 136, 0.2);
          box-shadow: 0 8px 24px rgba(13, 148, 136, 0.1);
        }

        .patient-name {
          font-size: var(--font-lg);
          font-weight: 600;
          color: var(--text-primary);
        }

        .abha-id-badge {
          display: inline-block;
          font-size: var(--font-xs);
          color: var(--text-tertiary);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }

        .card-body {
          margin: var(--space-md) 0;
          row-gap: var(--space-md);
          column-gap: var(--space-lg);
        }

        .meta-item {
          gap: 2px;
        }

        .meta-label {
          font-size: var(--font-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .meta-val {
          font-size: var(--font-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .card-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: var(--space-md);
          margin-top: var(--space-md);
        }

        .last-checkin {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }

        .view-detail-btn {
          background: transparent;
          color: var(--color-patient-light);
          font-size: var(--font-xs);
          font-weight: 600;
          transition: transform var(--transition-fast);
        }

        .patient-card:hover .view-detail-btn {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
