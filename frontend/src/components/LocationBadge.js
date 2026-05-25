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
    <div className="location-badge-container flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md">
      <div className="flex items-center gap-3">
        <div className={`location-icon-wrapper p-2 rounded-lg bg-emerald-500/20 text-emerald-400 ${loading ? 'animate-pulse' : ''}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs text-white/50 font-medium">Your Geographic Location</span>
          <span className="text-sm font-semibold text-white">
            {loading ? 'Detecting Location...' : error ? error : address ? address : 'Detecting...'}
          </span>
          {coords && (
            <span className="text-[10px] text-white/40 font-mono mt-0.5">
              Lat: {coords.latitude.toFixed(5)}, Lng: {coords.longitude.toFixed(5)}
            </span>
          )}
        </div>
      </div>
      {!loading && (
        <button
          onClick={captureLocation}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200"
          title="Refresh Location"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
