'use client';

import React from 'react';

export default function TraitSlider({ label, value, onChange, min = 0, max = 10, step = 1, minLabel = 'Low', maxLabel = 'High', color = '#0D9488' }) {
  // Get percentage for background gradient of the slider track
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="trait-slider-container">
      <div className="slider-header flex-between">
        <span className="slider-label">{label}</span>
        <span className="slider-value" style={{ color }}>{value}</span>
      </div>

      <div className="slider-input-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="custom-slider"
          style={{
            '--slider-color': color,
            '--slider-percentage': `${percentage}%`,
          }}
        />
      </div>

      <div className="slider-labels flex-between">
        <span className="min-label">{minLabel}</span>
        <span className="max-label">{maxLabel}</span>
      </div>

      <style jsx>{`
        .trait-slider-container {
          margin-bottom: var(--space-md);
          width: 100%;
        }

        .slider-header {
          margin-bottom: var(--space-xs);
        }

        .slider-label {
          font-size: var(--font-sm);
          font-weight: 500;
          color: var(--text-primary);
        }

        .slider-value {
          font-size: var(--font-sm);
          font-weight: 700;
        }

        .slider-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .custom-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: var(--radius-full);
          background: linear-gradient(
            to right,
            var(--slider-color) var(--slider-percentage),
            rgba(255, 255, 255, 0.1) var(--slider-percentage)
          );
          outline: none;
          margin: 10px 0;
        }

        /* Webkit Browser Thumb */
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--slider-color);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
          transition: transform var(--transition-fast);
        }

        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px var(--slider-color);
        }

        /* Firefox Browser Thumb */
        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--slider-color);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
          transition: transform var(--transition-fast);
        }

        .custom-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px var(--slider-color);
        }

        .slider-labels {
          font-size: var(--font-xs);
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
