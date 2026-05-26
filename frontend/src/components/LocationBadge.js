'use client';

import React, { useState, useEffect } from 'react';

export default function LocationBadge({ onLocationCapture, initialLatitude, initialLongitude }) {
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setCoords({ latitude: initialLatitude, longitude: initialLongitude });
      reverseGeocode(initialLatitude, initialLongitude);
    } else {
      captureLocation();
    }
  }, [initialLatitude, initialLongitude]);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        
        // Callback to save to profile
        if (onLocationCapture) {
          onLocationCapture(latitude, longitude);
        }

        await reverseGeocode(latitude, longitude);
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Location access denied');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
        {
          headers: {
            'User-Agent': 'MANAS-Mental-Health-Platform-v1',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const display_name = data.address.suburb || data.address.village || data.address.town || data.address.city || data.address.county || data.display_name;
        const state = data.address.state || '';
        setAddress(display_name ? `${display_name}, ${state}` : 'Rural Community');
      } else {
        setAddress('Rural Community');
      }
    } catch (e) {
      console.error('Reverse geocode error:', e);
      setAddress('Rural Community');
    }
  };

  return (
    <div className="location-badge-container">
      <div className="location-content">
        <div className={`location-icon-wrapper ${loading ? 'pulse' : ''}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="icon-medium"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
        </div>
        <div className="location-info">
          <span className="location-label">Your Geographic Location</span>
          <span className="location-value">
            {loading ? 'Detecting Location...' : error ? error : address ? address : 'Detecting...'}
          </span>
          {coords && (
            <span className="location-coords">
              Lat: {coords.latitude.toFixed(5)}, Lng: {coords.longitude.toFixed(5)}
            </span>
          )}
        </div>
      </div>
      {!loading && (
        <button
          onClick={captureLocation}
          className="location-refresh-btn"
          title="Refresh Location"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="icon-small"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      )}

      <style jsx>{`
        .location-badge-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .location-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .location-icon-wrapper {
          padding: 8px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pulse {
          animation: pulse-animation 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-animation {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
        .location-info {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .location-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }
        .location-value {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        .location-coords {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
          margin-top: 2px;
        }
        .location-refresh-btn {
          padding: 6px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .location-refresh-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        .icon-medium {
          width: 20px;
          height: 20px;
        }
        .icon-small {
          width: 16px;
          height: 16px;
        }
      `}</style>
    </div>
  );
}
