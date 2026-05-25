'use client';

import React from 'react';

export default function RiskBadge({ riskLevel }) {
  const getBadgeDetails = () => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return {
          label: 'Low Risk',
          className: 'badge-low',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.1)',
        };
      case 'moderate':
        return {
          label: 'Moderate Risk',
          className: 'badge-moderate',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.1)',
        };
      case 'high':
        return {
          label: 'High Risk',
          className: 'badge-high pulsing-border',
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.1)',
        };
      default:
        return {
          label: 'Unknown',
          className: 'badge-unknown',
          color: '#64748B',
          bg: 'rgba(100, 116, 139, 0.1)',
        };
    }
  };

  const badge = getBadgeDetails();

  return (
    <span
      className={`risk-badge flex-row flex-center ${badge.className}`}
      style={{
        backgroundColor: badge.bg,
        color: badge.color,
        border: `1px solid rgba(${riskLevel?.toLowerCase() === 'high' ? '239, 68, 68' : '255, 255, 255'}, 0.15)`,
      }}
    >
      <span className="badge-bullet" style={{ backgroundColor: badge.color }}></span>
      {badge.label}

      <style jsx>{`
        .risk-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: var(--font-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: fit-content;
        }

        .badge-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .badge-high {
          animation: highGlow 1.5s infinite ease-in-out;
        }

        @keyframes highGlow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.2);
          }
          50% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
            border-color: rgba(239, 68, 68, 0.6);
          }
        }
      `}</style>
    </span>
  );
}
