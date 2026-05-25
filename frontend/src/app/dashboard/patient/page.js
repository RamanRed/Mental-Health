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
        setError('Could not load patient profile dashboard.');
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
        <div className="flex items-center gap-3">
          <button
            onClick={openEmergencyModal}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white rounded-xl shadow-lg shadow-red-500/25 flex items-center gap-2 font-bold text-sm transition-all duration-200 animate-pulse"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
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
        <div className="fixed bottom-6 right-6 z-40 w-80 flex flex-col gap-2">
          {followRequests.filter(r => r.status === 'pending').map((req) => (
            <div key={req.id} className="p-4 rounded-2xl bg-slate-900 border border-violet-500/40 shadow-2xl flex flex-col gap-3 text-white text-sm animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                    {req.urgency === 'emergency' ? '🚨 Emergency' : req.urgency === 'urgent' ? '⚠️ Urgent' : '📋 Routine'} Follow-Up Request
                  </span>
                  <strong className="text-white">Dr. {req.doctor_name}</strong>
                </div>
                {req.suggested_date && (
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(req.suggested_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
              {req.message && (
                <p className="text-xs text-slate-300 italic bg-white/5 rounded-xl p-2.5">"{req.message}"</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  disabled={respondingId === req.id}
                  onClick={() => handleRespondFollow(req.id, 'declined')}
                  className="flex-1 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 transition text-xs font-semibold disabled:opacity-50"
                >Decline</button>
                <button
                  disabled={respondingId === req.id}
                  onClick={() => handleRespondFollow(req.id, 'accepted')}
                  className="flex-1 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 transition text-xs font-semibold disabled:opacity-50"
                >{respondingId === req.id ? 'Responding...' : 'Accept'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emergency Doctor Selector Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                <span>🚨 Emergency Call</span>
              </h3>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Select an available doctor to initiate an emergency psychiatric counseling session right now.
            </p>
            <div className="flex flex-col gap-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {doctorsList.length > 0 ? (
                doctorsList.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleEmergencyCall(doc.id)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 text-left transition-all duration-200"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-white">Dr. {doc.full_name}</span>
                      <span className="text-xs text-slate-400">{doc.specialization || 'General Therapist'}</span>
                      <span className="text-[10px] text-slate-500">{doc.hospital_affiliation || 'MANAS Network'}</span>
                    </div>
                    <span className="text-xs text-red-400 font-bold bg-red-400/10 px-2.5 py-1 rounded-lg border border-red-400/20">
                      Call Now
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
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
      `}</style>
    </div>
  );
}
