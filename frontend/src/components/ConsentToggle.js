'use client';

import React from 'react';

export default function ConsentToggle({ label, description, checked, onChange, disabled = false }) {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className="consent-toggle-wrapper flex-between" onClick={handleToggle}>
      <div className="toggle-text flex-col">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-desc">{description}</span>}
      </div>

      <div className={`custom-switch ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}>
        <div className="switch-thumb"></div>
      </div>

      <style jsx>{`
        .consent-toggle-wrapper {
          padding: var(--space-md);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          user-select: none;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
          width: 100%;
        }

        .consent-toggle-wrapper:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .toggle-text {
          gap: var(--space-xs);
          flex: 1;
        }

        .toggle-label {
          font-size: var(--font-base);
          font-weight: 500;
          color: var(--text-primary);
        }

        .toggle-desc {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .custom-switch {
          position: relative;
          width: 48px;
          height: 26px;
          border-radius: var(--radius-full);
          background: var(--bg-tertiary);
          transition: background-color var(--transition-base);
          flex-shrink: 0;
        }

        .custom-switch.active {
          background: var(--color-patient);
        }

        .custom-switch.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .switch-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-base);
        }

        .custom-switch.active .switch-thumb {
          transform: translateX(22px);
        }
      `}</style>
    </div>
  );
}
