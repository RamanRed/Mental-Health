'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPatientProfile, getStreak, getMoodEntries, getPatientConsultations, updatePatientProfile, listAvailableDoctors, initiateVideoCall, getPatientFollowRequests, respondFollowRequest } from '@/lib/api';
import StreakCalendar from '@/components/StreakCalendar';
import RiskBadge from '@/components/RiskBadge';
import LocationBadge from '@/components/LocationBadge';
import VideoCallModal from '@/components/VideoCallModal';

import { useAuth } from '@/lib/AuthContext';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0 });
  const [moods, setMoods] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const [doctorsList, setDoctorsList] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Video call state
  const [activeCall, setActiveCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Follow requests from doctors
  const [followRequests, setFollowRequests] = useState([]);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const profileData = await getPatientProfile();
        setProfile(profileData);

        try {
          const streakData = await getStreak();
          setStreak(streakData);
        } catch (e) {
          console.warn('Failed to load streak details', e);
        }

        try {
          const moodData = await getMoodEntries(30);
          setMoods(moodData);
        } catch (e) {
          console.warn('Failed to load mood entries', e);
        }

        try {
          const consults = await getPatientConsultations();
          setConsultations(consults);
        } catch (e) {
          console.warn('Failed to load consultations', e);
        }

        try {
          const followReqs = await getPatientFollowRequests();
          setFollowRequests(followReqs);
        } catch (e) {
          console.warn('Failed to load follow requests', e);
        }

      } catch (err) {
        console.error(err);
        if (err.message && err.message.includes('profile not found')) {
          setError('Patient profile not found. Your session may be stale or the database was reset. Please click Logout and register a new patient profile.');
        } else {
          setError('Could not load patient profile dashboard.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);



  const handleLocationCapture = async (latitude, longitude) => {
    try {
      await updatePatientProfile({ latitude, longitude });
      console.log('Location saved successfully');
    } catch (err) {
      console.error('Failed to save location', err);
    }
  };

  const openEmergencyModal = async () => {
    try {
      const docs = await listAvailableDoctors();
      setDoctorsList(docs);
      setShowEmergencyModal(true);
    } catch (err) {
      alert('Failed to fetch available doctors: ' + err.message);
    }
  };

  const handleEmergencyCall = async (doctorId) => {
    try {
      const doc = doctorsList.find(d => d.id === doctorId);
      if (!doc) return;

      const newCall = await initiateVideoCall({
        callee_id: doc.user_id,
        call_type: 'emergency'
      });
      setActiveCall(newCall);
      setShowCallModal(true);
      setShowEmergencyModal(false);
    } catch (err) {
      alert('Failed to initiate emergency call: ' + err.message);
    }
  };

  const handleRespondFollow = async (requestId, status) => {
    setRespondingId(requestId);
    try {
      await respondFollowRequest(requestId, status);
      const updated = await getPatientFollowRequests();
      setFollowRequests(updated);
    } catch (err) {
      alert('Failed to respond: ' + err.message);
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-sub-loading flex-center">
        <div className="spinner animate-spin"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="dashboard-error glass-card-static flex-col flex-center">
        <p className="error-msg">⚠️ {error || 'Failed to load patient dashboard profile.'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">Retry</button>
      </div>
    );
  }

  const latestMood = moods[0];
  const upcomingConsultation = consultations.find(c => c.status === 'scheduled');

  return (
    <div className="patient-dashboard flex-col">
      {/* Geolocation Badge at the very top */}
      <LocationBadge
        onLocationCapture={handleLocationCapture}
        initialLatitude={profile.latitude}
        initialLongitude={profile.longitude}
      />

      <div className="dashboard-header flex-between">
        <div className="greeting-wrapper">
          <h1 className="welcome-title">Namaste, {profile.full_name} 👋</h1>
          <p className="welcome-subtitle">Welcome back to your health space. Let's track your wellness together.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={openEmergencyModal}
            className="emergency-call-btn"
          >
            <span className="emergency-ping">
              <span className="emergency-ping-wave"></span>
              <span className="emergency-ping-dot"></span>
            </span>
            Emergency Call 🚨
          </button>
          <div className="risk-level-box flex-row">
            <span className="risk-label">Diagnostic Status:</span>
            <RiskBadge riskLevel={profile.risk_level || 'low'} />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid-3 stats-row">
        <div className="stat-card glass-card flex-between">
          <div className="stat-info">
            <span className="stat-label">Mood Log Status</span>
            <h3 className="stat-value">{latestMood ? `Feeling ${latestMood.mood_emoji}` : 'Not Logged Today'}</h3>
          </div>
          <span className="stat-icon">📈</span>
        </div>

        <div className="stat-card glass-card flex-between">
          <div className="stat-info">
            <span className="stat-label">Current Streak</span>
            <h3 className="stat-value">{streak.current_streak} Days</h3>
          </div>
          <span className="stat-icon">🔥</span>
        </div>

        <div className="stat-card glass-card flex-between">
          <div className="stat-info">
            <span className="stat-label">Consultation Sessions</span>
            <h3 className="stat-value">{consultations.length} Attended</h3>
          </div>
          <span className="stat-icon">🤝</span>
        </div>
      </div>

      <div className="grid-2 dashboard-main-grid">
        {/* Left Column: Streak Calendar */}
        <div className="streak-calendar-section glass-card-static flex-col">
          <div className="section-header flex-between">
            <h4>Mood Check-in Calendar</h4>
            <span className="text-secondary font-xs">Last 30 Days</span>
          </div>
          <div className="calendar-box">
            <StreakCalendar entries={moods} currentStreak={streak.current_streak} days={30} />
          </div>
          <Link href="/dashboard/patient/mood" className="btn btn-primary log-mood-link btn-full">
            Log Your Mood Today ✍️
          </Link>
        </div>

        {/* Right Column: Next Session + Quick Actions */}
        <div className="sidebar-section flex-col">
          <div className="upcoming-session-card glass-card flex-col">
            <h4>Upcoming Consultation</h4>
            {upcomingConsultation ? (
              <div className="session-info-details flex-col">
                <div className="flex-row">
                  <span className="session-icon-small">📅</span>
                  <span className="session-time">
                    {new Date(upcomingConsultation.scheduled_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex-row">
                  <span className="session-icon-small">💻</span>
                  <span className="session-format" style={{ textTransform: 'capitalize' }}>
                    {upcomingConsultation.format?.replace('_', ' ')}
                  </span>
                </div>
                <span className="session-note">Please ensure you are online 5 mins prior.</span>
              </div>
            ) : (
              <div className="no-session-details flex-col flex-center">
                <span className="no-session-icon">📅</span>
                <p>No upcoming consultation scheduled.</p>
                <Link href="/dashboard/patient/appointments" className="btn btn-secondary btn-sm">
                  Book Appointment
                </Link>
              </div>
            )}
          </div>

          <div className="quick-actions-card glass-card-static flex-col">
            <h4>Quick Actions</h4>
            <div className="quick-actions-grid grid-2">
              <Link href="/dashboard/patient/mood" className="action-button flex-col flex-center">
                <span className="action-icon">📝</span>
                <span className="action-lbl">Mood Journal</span>
              </Link>
              <Link href="/dashboard/patient/questionnaire" className="action-button flex-col flex-center">
                <span className="action-icon">📋</span>
                <span className="action-lbl">Take Test</span>
              </Link>
              <Link href="/dashboard/patient/appointments" className="action-button flex-col flex-center">
                <span className="action-icon">📅</span>
                <span className="action-lbl">Appointments</span>
              </Link>
              <Link href="/settings" className="action-button flex-col flex-center">
                <span className="action-icon">⚙️</span>
                <span className="action-lbl">Privacy Consent</span>
              </Link>
            </div>
          </div>
        </div>
      </div>



      {/* Video Call Modal */}
      {showCallModal && activeCall && user && (
        <VideoCallModal
          call={activeCall}
          currentUser={user}
          onClose={() => { setShowCallModal(false); setActiveCall(null); }}
          onCallEnded={() => { setShowCallModal(false); setActiveCall(null); }}
        />
      )}

      {/* Doctor Follow-Up Requests Panel */}
      {followRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="follow-notification-panel">
          {followRequests.filter(r => r.status === 'pending').map((req) => (
            <div key={req.id} className="follow-notification-card">
              <div className="follow-notif-header">
                <div className="follow-notif-info">
                  <span className="follow-notif-type">
                    {req.urgency === 'emergency' ? '🚨 Emergency' : req.urgency === 'urgent' ? '⚠️ Urgent' : '📋 Routine'} Follow-Up
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>Dr. {req.doctor_name}</strong>
                </div>
                {req.suggested_date && (
                  <span className="follow-notif-date">
                    {new Date(req.suggested_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
              {req.message && (
                <p className="follow-notif-message">"{req.message}"</p>
              )}
              <div className="follow-notif-actions">
                <button
                  disabled={respondingId === req.id}
                  onClick={() => handleRespondFollow(req.id, 'declined')}
                  className="follow-decline-btn"
                >Decline</button>
                <button
                  disabled={respondingId === req.id}
                  onClick={() => handleRespondFollow(req.id, 'accepted')}
                  className="follow-accept-btn"
                >{respondingId === req.id ? 'Responding...' : 'Accept'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emergency Doctor Selector Modal */}
      {showEmergencyModal && (
        <div className="emergency-modal-overlay">
          <div className="emergency-modal-content">
            <div className="emergency-modal-header">
              <h3 className="emergency-modal-title">
                <span>🚨 Emergency Call</span>
              </h3>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="emergency-modal-close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="emergency-modal-desc">
              Select an available doctor to initiate an emergency psychiatric counseling session right now.
            </p>
            <div className="emergency-doctor-list">
              {doctorsList.length > 0 ? (
                doctorsList.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleEmergencyCall(doc.id)}
                    className="emergency-doctor-item"
                  >
                    <div className="emergency-doctor-info">
                      <span className="emergency-doctor-name">Dr. {doc.full_name}</span>
                      <span className="emergency-doctor-spec">{doc.specialization || 'General Therapist'}</span>
                      <span className="emergency-doctor-hospital">{doc.hospital_affiliation || 'MANAS Network'}</span>
                    </div>
                    <span className="emergency-call-now-badge">
                      Call Now
                    </span>
                  </button>
                ))
              ) : (
                <div className="emergency-no-doctors">
                  No doctors currently online.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .patient-dashboard {
          gap: var(--space-xl);
        }

        .dashboard-sub-loading {
          min-height: 400px;
        }

        .welcome-title {
          font-size: var(--font-3xl);
          font-weight: 700;
          color: var(--text-primary);
        }

        .welcome-subtitle {
          font-size: var(--font-sm);
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .risk-level-box {
          gap: var(--space-sm);
          align-items: center;
        }

        .risk-label {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .stats-row {
          gap: var(--space-lg);
        }

        .stat-card {
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .stat-label {
          font-size: var(--font-xs);
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .stat-value {
          font-size: var(--font-xl);
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 4px;
        }

        .stat-icon {
          font-size: 1.75rem;
        }

        .dashboard-main-grid {
          gap: var(--space-xl);
          align-items: start;
        }

        .streak-calendar-section {
          gap: var(--space-lg);
        }

        .streak-calendar-section h4 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .sidebar-section {
          gap: var(--space-xl);
        }

        .upcoming-session-card {
          gap: var(--space-md);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .upcoming-session-card h4 {
          font-size: var(--font-md);
          font-weight: 600;
          color: var(--text-primary);
        }

        .session-info-details {
          gap: var(--space-sm);
          background: rgba(15, 23, 42, 0.3);
          padding: var(--space-md);
          border-radius: var(--radius-md);
        }

        .session-icon-small {
          font-size: 1.1rem;
        }

        .session-time {
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--color-patient-light);
        }

        .session-format {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .session-note {
          font-size: var(--font-xs);
          color: var(--text-muted);
          font-style: italic;
        }

        .no-session-details {
          padding: var(--space-lg);
          gap: var(--space-sm);
          text-align: center;
        }

        .no-session-icon {
          font-size: 2rem;
          opacity: 0.3;
        }

        .no-session-details p {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .quick-actions-card {
          gap: var(--space-md);
        }

        .quick-actions-card h4 {
          font-size: var(--font-md);
          font-weight: 600;
        }

        .quick-actions-grid {
          gap: var(--space-md);
        }

        .action-button {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
          gap: var(--space-xs);
        }

        .action-button:hover {
          background: rgba(13, 148, 136, 0.1);
          border-color: rgba(13, 148, 136, 0.3);
          transform: translateY(-2px);
        }

        .action-icon {
          font-size: 1.5rem;
        }

        .action-lbl {
          font-size: var(--font-xs);
          font-weight: 500;
          color: var(--text-secondary);
        }

        .action-button:hover .action-lbl {
          color: var(--text-primary);
        }

        .log-mood-link {
          margin-top: var(--space-md);
        }

        .emergency-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #dc2626, #f43f5e);
          color: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.25);
          font-weight: 700;
          font-size: var(--font-sm);
          transition: all 0.2s ease;
          animation: pulse 2s infinite;
          border: none;
          cursor: pointer;
        }
        .emergency-call-btn:hover {
          background: linear-gradient(135deg, #b91c1c, #e11d48);
        }
        .emergency-ping {
          display: flex;
          height: 8px;
          width: 8px;
          position: relative;
        }
        .emergency-ping-wave {
          position: absolute;
          display: inline-flex;
          height: 100%;
          width: 100%;
          border-radius: 9999px;
          background: white;
          opacity: 0.75;
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .emergency-ping-dot {
          position: relative;
          display: inline-flex;
          border-radius: 9999px;
          height: 8px;
          width: 8px;
          background: white;
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .follow-notification-panel {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 40;
          width: 320px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .follow-notification-card {
          padding: 16px;
          border-radius: 16px;
          background: var(--bg-primary);
          border: 1px solid rgba(139, 92, 246, 0.4);
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: var(--text-primary);
          font-size: var(--font-sm);
          animation: fadeIn 0.5s ease forwards;
        }
        .follow-notif-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .follow-notif-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .follow-notif-type {
          font-size: var(--font-xs);
          font-weight: 700;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .follow-notif-date {
          font-size: 10px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .follow-notif-message {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          font-style: italic;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 10px;
        }
        .follow-notif-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .follow-decline-btn {
          flex: 1;
          padding: 6px 0;
          border-radius: 12px;
          background: rgba(220, 38, 38, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          transition: all 0.3s ease;
          font-size: var(--font-xs);
          font-weight: 600;
          cursor: pointer;
        }
        .follow-decline-btn:hover {
          background: #dc2626;
          color: white;
        }
        .follow-decline-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .follow-accept-btn {
          flex: 1;
          padding: 6px 0;
          border-radius: 12px;
          background: rgba(5, 150, 105, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
          transition: all 0.3s ease;
          font-size: var(--font-xs);
          font-weight: 600;
          cursor: pointer;
        }
        .follow-accept-btn:hover {
          background: #059669;
          color: white;
        }
        .follow-accept-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .emergency-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(12px);
          padding: 16px;
          color: var(--text-primary);
        }
        .emergency-modal-content {
          width: 100%;
          max-width: 448px;
          padding: 24px;
          border-radius: 24px;
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }
        .emergency-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .emergency-modal-title {
          font-size: var(--font-xl);
          font-weight: 700;
          color: var(--color-danger);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .emergency-modal-close {
          padding: 4px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
        }
        .emergency-modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .emergency-modal-close svg {
          width: 20px;
          height: 20px;
        }
        .emergency-modal-desc {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }
        .emergency-doctor-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 40vh;
          overflow-y: auto;
          padding-right: 4px;
        }
        .emergency-doctor-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: left;
          transition: all 0.2s ease;
          cursor: pointer;
          width: 100%;
          color: var(--text-primary);
        }
        .emergency-doctor-item:hover {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(239, 68, 68, 0.05);
        }
        .emergency-doctor-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .emergency-doctor-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .emergency-doctor-spec {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }
        .emergency-doctor-hospital {
          font-size: 10px;
          color: var(--text-muted);
        }
        .emergency-call-now-badge {
          font-size: var(--font-xs);
          color: #f87171;
          font-weight: 700;
          background: rgba(248, 113, 113, 0.1);
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(248, 113, 113, 0.2);
        }
        .emergency-no-doctors {
          text-align: center;
          padding: 24px 0;
          color: var(--text-muted);
          font-size: var(--font-sm);
        }
      `}</style>
    </div>
  );
}
