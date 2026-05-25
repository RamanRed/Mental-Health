'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDoctorProfile, getPatientQueue, getPatientBrief, createSession, listDoctorSessions, updateDoctorProfile, initiateVideoCall, getDoctorPendingAppointments, acceptAppointment, rejectAppointment, listClinicalForms, sendFollowRequest, getDoctorFollowRequests, getDoctorPatientAnalytics } from '@/lib/api';
import RiskBadge from '@/components/RiskBadge';
import PatientCard from '@/components/PatientCard';
import LocationBadge from '@/components/LocationBadge';

import VideoCallModal from '@/components/VideoCallModal';
import { useAuth } from '@/lib/AuthContext';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Patient for Brief
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [patientBrief, setPatientBrief] = useState(null);

  // Scheduling Form
  const [sessionNumber, setSessionNumber] = useState(1);
  const [sessionType, setSessionType] = useState('early_screening');
  const [sessionFormat, setSessionFormat] = useState('online_audio');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [schedError, setSchedError] = useState('');
  const [schedMsg, setSchedMsg] = useState('');



  // Appointment management
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [clinicalForms, setClinicalForms] = useState([]);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingApptId, setAcceptingApptId] = useState('');
  const [acceptSessionType, setAcceptSessionType] = useState('early_screening');
  const [acceptFormat, setAcceptFormat] = useState('online_video');
  const [acceptFormId, setAcceptFormId] = useState('');
  const [rejectingApptId, setRejectingApptId] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Video call state
  const [activeCall, setActiveCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Follow requests state
  const [myFollowRequests, setMyFollowRequests] = useState([]);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followMessage, setFollowMessage] = useState('');
  const [followUrgency, setFollowUrgency] = useState('routine');
  const [followDate, setFollowDate] = useState('');
  const [sendingFollow, setSendingFollow] = useState(false);

  // Analytics panel
  const [patientAnalytics, setPatientAnalytics] = useState(null);

  const loadDashboardData = async () => {
    try {
      const prof = await getDoctorProfile();
      setProfile(prof);

      const queue = await getPatientQueue();
      setPatients(queue);
      if (queue.length > 0) {
        handleSelectPatient(queue[0]);
      }

      const activeSessions = await listDoctorSessions();
      setSessions(activeSessions);

      const pending = await getDoctorPendingAppointments();
      setPendingAppointments(pending);

      const forms = await listClinicalForms();
      setClinicalForms(forms);
      if (forms.length > 0) {
        setAcceptFormId(forms[0].id);
      }

      // Load my sent follow requests
      try {
        const followReqs = await getDoctorFollowRequests();
        setMyFollowRequests(followReqs);
      } catch (e) {
        console.warn('Failed to load follow requests:', e);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load doctor dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);



  const handleLocationCapture = async (latitude, longitude) => {
    try {
      await updateDoctorProfile({ latitude, longitude });
      console.log('Location saved successfully');
    } catch (err) {
      console.error('Failed to save location', err);
    }
  };

  const handleInitiateCall = async (patient) => {
    try {
      const newCall = await initiateVideoCall({
        callee_id: patient.user_id,
        call_type: 'scheduled'
      });
      setActiveCall(newCall);
      setShowCallModal(true);
    } catch (err) {
      alert('Failed to start video call: ' + err.message);
    }
  };

  const handleOpenAcceptModal = (apptId) => {
    setAcceptingApptId(apptId);
    setShowAcceptModal(true);
  };

  const handleAcceptAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await acceptAppointment(acceptingApptId, {
        session_type: acceptSessionType,
        format: acceptFormat,
        clinical_form_id: acceptFormId
      });
      setShowAcceptModal(false);
      
      // Reload pending and sessions lists
      const pending = await getDoctorPendingAppointments();
      setPendingAppointments(pending);
      const activeSessions = await listDoctorSessions();
      setSessions(activeSessions);
    } catch (err) {
      alert('Failed to accept appointment: ' + err.message);
    }
  };

  const handleOpenRejectModal = (apptId) => {
    setRejectingApptId(apptId);
    setShowRejectModal(true);
  };

  const handleRejectAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await rejectAppointment(rejectingApptId, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      
      // Reload pending
      const pending = await getDoctorPendingAppointments();
      setPendingAppointments(pending);
    } catch (err) {
      alert('Failed to reject appointment: ' + err.message);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setBriefLoading(true);
    setPatientBrief(null);
    setPatientAnalytics(null);
    setSchedMsg('');
    setSchedError('');

    try {
      const brief = await getPatientBrief(patient.id);
      setPatientBrief(brief.screening);
    } catch (e) {
      console.error(e);
    }

    try {
      const analytics = await getDoctorPatientAnalytics(patient.id);
      setPatientAnalytics(analytics);
    } catch (e) {
      console.warn('Analytics unavailable:', e);
    } finally {
      setBriefLoading(false);
    }
  };

  const handleSendFollowRequest = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSendingFollow(true);
    try {
      await sendFollowRequest({
        patient_id: selectedPatient.user_id,
        message: followMessage,
        urgency: followUrgency,
        suggested_date: followDate ? new Date(followDate).toISOString() : null,
      });
      setShowFollowModal(false);
      setFollowMessage('');
      setFollowDate('');
      const updated = await getDoctorFollowRequests();
      setMyFollowRequests(updated);
    } catch (err) {
      alert('Failed to send follow request: ' + err.message);
    } finally {
      setSendingFollow(false);
    }
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    setSchedError('');
    setSchedMsg('');

    if (!selectedPatient) {
      setSchedError('Please select a patient to schedule.');
      return;
    }
    if (!scheduledAt) {
      setSchedError('Please select a scheduled date and time.');
      return;
    }

    setScheduling(true);

    const payload = {
      patient_id: selectedPatient.id,
      session_number: Number(sessionNumber),
      session_type: sessionType,
      format: sessionFormat,
      scheduled_at: new Date(scheduledAt).toISOString(),
    };

    try {
      await createSession(payload);
      setSchedMsg('Consultation session scheduled successfully!');
      
      // Reload sessions list
      const activeSessions = await listDoctorSessions();
      setSessions(activeSessions);
    } catch (err) {
      console.error(err);
      setSchedError(err.message || 'Failed to schedule session.');
    } finally {
      setScheduling(false);
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
        <p className="error-msg">⚠️ {error || 'Failed to load doctor profile dashboard.'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard flex-col">
      {/* Geolocation Badge at the very top */}
      <LocationBadge
        onLocationCapture={handleLocationCapture}
        initialLatitude={profile.latitude}
        initialLongitude={profile.longitude}
      />

      <div className="dashboard-header flex-between">
        <div className="greeting-wrapper">
          <h1 className="welcome-title">Welcome, Dr. {profile.full_name} ⚕️</h1>
          <p className="welcome-subtitle">Specialization: <strong>{profile.specialization}</strong> | Affiliated Clinic: <strong>{profile.hospital_affiliation}</strong></p>
        </div>
      </div>

      <div className="dashboard-grid-layout">
        {/* Left Column: Patient Queue */}
        <div className="patient-queue-section flex-col">
          <h3>Your Patient Queue ({patients.length})</h3>
          
          {patients.length === 0 ? (
            <div className="no-patients glass-card flex-col flex-center">
              <span className="no-patients-icon">🧑‍🤝‍🧑</span>
              <p>No patients are currently assigned to you.</p>
            </div>
          ) : (
            <div className="patients-grid flex-col">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`patient-card-wrapper ${selectedPatient?.id === patient.id ? 'active-selection' : ''}`}
                >
                  <PatientCard
                    patient={patient}
                    onClick={() => handleSelectPatient(patient)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Middle Column: Pre-consultation Brief & Scheduler */}
        <div className="middle-column flex-col">
          {selectedPatient && (
            <>
              {/* Pre-consultation Brief Card */}
              <div className="brief-card glass-card-static flex-col">
                <div className="brief-header flex-between">
                  <h4>Pre-Consultation Brief</h4>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleInitiateCall(selectedPatient)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all duration-200 shadow-md shadow-teal-500/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Start Call 📹
                    </button>
                    <button
                      onClick={() => setShowFollowModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all duration-200 shadow-md shadow-violet-500/10"
                    >
                      📨 Send Follow-Up
                    </button>
                    <span className="p-badge">{selectedPatient.full_name}</span>
                  </div>
                </div>

                {briefLoading ? (
                  <div className="brief-loader flex-center"><div className="spinner animate-spin"></div></div>
                ) : patientBrief ? (
                  <div className="brief-content flex-col animate-fade-in">
                    <div className="risk-score-box flex-between">
                      <span className="lbl">Risk Assessment Classification:</span>
                      <RiskBadge riskLevel={patientBrief.risk_level} />
                    </div>

                    <div className="brief-section">
                      <h5>Contributing Factors:</h5>
                      <ul className="factors-list">
                        {patientBrief.contributing_factors &&
                          Object.entries(patientBrief.contributing_factors).map(([factor, desc]) => (
                            <li key={factor}>
                              <strong>{factor.replace('_', ' ')}:</strong> {desc}
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="brief-section">
                      <h5>Plain Language Clinical Summary:</h5>
                      <p className="summary-text">"{patientBrief.plain_language_summary}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="no-brief-details text-secondary font-sm">No screening history details available for this patient.</div>
                )}

                {/* Patient Analytics Mini-Panel */}
                {patientAnalytics && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-3">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient Data Analytics (Last 30 Days)</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-0.5 text-center">
                        <span className="text-lg font-bold text-teal-400">{patientAnalytics.current_streak}</span>
                        <span className="text-[10px] text-slate-500">Day Streak</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-0.5 text-center">
                        <span className="text-lg font-bold text-amber-400">{patientAnalytics.avg_mood_score ?? '—'}</span>
                        <span className="text-[10px] text-slate-500">Avg Mood</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-0.5 text-center">
                        <span className="text-lg font-bold text-emerald-400">{patientAnalytics.session_stats?.completed}</span>
                        <span className="text-[10px] text-slate-500">Sessions Done</span>
                      </div>
                    </div>
                    {/* Mood trend sparkline bar chart */}
                    {patientAnalytics.mood_trend?.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 uppercase">Mood Trend</span>
                        <div className="flex items-end gap-0.5 h-10">
                          {patientAnalytics.mood_trend.slice(-14).map((t, i) => (
                            <div
                              key={i}
                              title={`${t.date}: ${t.avg_score}`}
                              className="flex-1 rounded-sm transition-all"
                              style={{
                                height: `${(t.avg_score / 10) * 100}%`,
                                background: t.avg_score >= 7 ? '#10b981' : t.avg_score >= 4 ? '#f59e0b' : '#ef4444',
                                minHeight: '4px',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Risk trend badges */}
                    {patientAnalytics.risk_trend?.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 uppercase">Risk History</span>
                        <div className="flex flex-wrap gap-1">
                          {patientAnalytics.risk_trend.slice(-8).map((r, i) => (
                            <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              r.risk_level === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : r.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>{r.risk_level}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>📝 {patientAnalytics.total_mood_entries} mood logs</span>
                      <span>📋 {patientAnalytics.questionnaire_count} questionnaires</span>
                      <span>🏥 {patientAnalytics.guardian_notes_count} guardian notes</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Form Card */}
              <div className="schedule-card glass-card-static flex-col">
                <h4>Schedule Consultation Session</h4>
                {schedMsg && <div className="success-banner">{schedMsg}</div>}
                {schedError && <div className="error-banner">{schedError}</div>}

                <form onSubmit={handleScheduleSession} className="schedule-form flex-col">
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="sess-num">Session Number</label>
                      <input
                        id="sess-num"
                        className="form-input"
                        type="number"
                        min={1}
                        value={sessionNumber}
                        onChange={(e) => setSessionNumber(e.target.value)}
                        required
                        disabled={scheduling}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sess-type">Session Type</label>
                      <select
                        id="sess-type"
                        className="form-select"
                        value={sessionType}
                        onChange={(e) => setSessionType(e.target.value)}
                        disabled={scheduling}
                      >
                        <option value="early_screening">Initial Diagnostic Screening</option>
                        <option value="follow_up_1">Clinical Follow-up 1</option>
                        <option value="follow_up_2">Clinical Follow-up 2</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="sess-format">Format</label>
                      <select
                        id="sess-format"
                        className="form-select"
                        value={sessionFormat}
                        onChange={(e) => setSessionFormat(e.target.value)}
                        disabled={scheduling}
                      >
                        <option value="online_audio">Online Audio Call</option>
                        <option value="online_video">Online Video Call</option>
                        <option value="in_person">In Person Clinic Visit</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sess-date">Scheduled Date & Time *</label>
                      <input
                        id="sess-date"
                        className="form-input"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        required
                        disabled={scheduling}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-full btn-doctor" disabled={scheduling}>
                    {scheduling ? 'Scheduling Session...' : 'Schedule Appointment Session ➔'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Upcoming Sessions + Pending Appointment Requests */}
        <div className="sessions-list-section glass-card-static flex-col">
          <h3>Upcoming Appointments</h3>
          
          {sessions.length === 0 ? (
            <div className="no-sessions flex-col flex-center text-secondary font-sm">
              <span>📅</span>
              <p>No active sessions scheduled yet.</p>
            </div>
          ) : (
            <div className="sessions-vertical-list flex-col max-h-[40vh] overflow-y-auto pr-1">
              {sessions.map((s) => {
                const sDate = new Date(s.scheduled_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div key={s.id} className="session-appointment-item flex-between">
                    <div className="app-info flex-col">
                      <span className="app-patient-id">Session #{s.session_number}</span>
                      <strong className="app-type">{s.session_type?.replace('_', ' ').toUpperCase()}</strong>
                      <span className="app-time">⏰ {sDate} | {s.format?.replace('_', ' ')}</span>
                      <span className="app-status">Status: <strong>{s.status}</strong></span>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/doctor/sessions/${s.id}`)}
                      className="btn btn-secondary btn-sm manage-session-btn"
                    >
                      Manage Session ➔
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Appointment Requests inside Doctor Dashboard */}
          <div className="border-t border-slate-800/80 mt-6 pt-4 flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-300 px-1">Appointment Requests ({pendingAppointments.length})</h3>
            {pendingAppointments.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2 py-4 text-center">No pending patient appointment requests.</p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
                {pendingAppointments.map((appt) => (
                  <div key={appt.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2.5 text-xs text-slate-300 text-left transition hover:bg-white/10">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <strong className="text-white text-sm">Patient: {appt.patient_name}</strong>
                        <span className="text-[10px] text-slate-400">
                          Date: {new Date(appt.preferred_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        appt.urgency === 'emergency'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                          : appt.urgency === 'urgent'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      }`}>
                        {appt.urgency}
                      </span>
                    </div>
                    {appt.patient_notes && (
                      <p className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] italic">
                        "{appt.patient_notes}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleOpenRejectModal(appt.id)}
                        className="flex-1 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 transition text-xs font-semibold"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleOpenAcceptModal(appt.id)}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 transition text-xs font-semibold"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Send Follow-Up Request Modal */}
      {showFollowModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white">
          <form
            onSubmit={handleSendFollowRequest}
            className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-violet-800/40 shadow-2xl flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-violet-400">📨 Send Follow-Up Request</h3>
              <button type="button" onClick={() => setShowFollowModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-400">Sending follow-up request to: <strong className="text-white">{selectedPatient.full_name}</strong></p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Urgency Level</label>
              <select value={followUrgency} onChange={(e) => setFollowUrgency(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500 transition">
                <option value="routine">Routine Follow-Up</option>
                <option value="urgent">Urgent Follow-Up</option>
                <option value="emergency">Emergency Review</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Suggested Date (optional)</label>
              <input type="datetime-local" value={followDate} onChange={(e) => setFollowDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500 transition" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Message to Patient</label>
              <textarea value={followMessage} onChange={(e) => setFollowMessage(e.target.value)}
                rows={3} placeholder="Describe reason for follow-up, instructions or concerns..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500 transition resize-none" />
            </div>

            <button type="submit" disabled={sendingFollow}
              className="w-full mt-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition disabled:opacity-60">
              {sendingFollow ? 'Sending Request...' : 'Send Follow-Up Request 📨'}
            </button>

            {/* My sent follow requests list */}
            {myFollowRequests.length > 0 && (
              <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Previously Sent Requests</h4>
                <div className="max-h-40 overflow-y-auto flex flex-col gap-2">
                  {myFollowRequests.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <span className="text-slate-300">{r.doctor_name || 'You'} → {r.patient_id.slice(0,8)}...</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                        r.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400'
                        : r.status === 'declined' ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                      }`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Doctor Accept Request Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white">
          <form
            onSubmit={handleAcceptAppointmentSubmit}
            className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-emerald-400">Accept Appointment Request</h3>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <p className="text-xs text-slate-400">
              Configure session parameters to finalize scheduling this consultation in the database.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Session Type</label>
              <select
                value={acceptSessionType}
                onChange={(e) => setAcceptSessionType(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="early_screening">Initial Diagnostic Screening</option>
                <option value="follow_up_1">Clinical Follow-up 1</option>
                <option value="follow_up_2">Clinical Follow-up 2</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Format</label>
              <select
                value={acceptFormat}
                onChange={(e) => setAcceptFormat(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="online_video">Online Video Call</option>
                <option value="online_audio">Online Audio Call</option>
                <option value="in_person">In Person Clinic Visit</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Clinical Form Template</label>
              <select
                value={acceptFormId}
                onChange={(e) => setAcceptFormId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {clinicalForms.map((f) => (
                  <option key={f.id} value={f.id}>{f.form_name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition"
            >
              Approve & Schedule Session ➔
            </button>
          </form>
        </div>
      )}

      {/* Doctor Reject Request Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white">
          <form
            onSubmit={handleRejectAppointmentSubmit}
            className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-500">Decline Appointment Request</h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Provide a clinical or scheduling reason for decline (e.g. out of clinic hours, referring to another specialist)..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition"
            >
              Submit Decline ➔
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .doctor-dashboard {
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

        .dashboard-grid-layout {
          display: grid;
          grid-template-columns: 320px 1fr 340px;
          gap: var(--space-xl);
          align-items: start;
        }

        .patient-queue-section {
          gap: var(--space-md);
        }

        .patient-queue-section h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .patients-grid {
          gap: var(--space-md);
        }

        .patient-card-wrapper {
          border: 2px solid transparent;
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
        }

        .patient-card-wrapper.active-selection {
          border-color: var(--color-doctor-light);
          box-shadow: var(--shadow-glow-doctor);
        }

        .middle-column {
          gap: var(--space-xl);
        }

        .brief-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .brief-header h4 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .p-badge {
          font-size: var(--font-xs);
          font-weight: 700;
          color: var(--color-doctor-light);
          background: var(--color-doctor-bg);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .brief-loader {
          min-height: 150px;
        }

        .brief-content {
          gap: var(--space-md);
        }

        .risk-score-box {
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .brief-section {
          gap: var(--space-xs);
        }

        .brief-section h5 {
          font-size: var(--font-xs);
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .factors-list {
          list-style-type: square;
          padding-left: var(--space-lg);
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .summary-text {
          font-size: var(--font-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          font-style: italic;
        }

        .schedule-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .schedule-card h4 {
          font-size: var(--font-md);
          font-weight: 600;
        }

        .schedule-form {
          gap: var(--space-md);
        }

        .sessions-list-section {
          padding: var(--space-md);
          gap: var(--space-md);
        }

        .sessions-list-section h3 {
          font-size: var(--font-lg);
          font-weight: 600;
          padding-left: var(--space-xs);
        }

        .no-sessions {
          padding: var(--space-2xl);
          text-align: center;
          gap: var(--space-xs);
        }

        .no-sessions span {
          font-size: 2rem;
          opacity: 0.2;
        }

        .sessions-vertical-list {
          gap: var(--space-md);
        }

        .session-appointment-item {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          align-items: center;
          gap: var(--space-md);
        }

        .app-info {
          gap: 2px;
        }

        .app-patient-id {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }

        .app-type {
          font-size: var(--font-sm);
          color: var(--text-primary);
        }

        .app-time {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }

        .app-status {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }

        .manage-session-btn {
          font-size: var(--font-xs);
          padding: 6px 12px;
          border-color: rgba(255, 255, 255, 0.12);
        }

        .manage-session-btn:hover {
          border-color: var(--color-doctor-light);
          color: var(--color-doctor-light);
        }

        .success-banner {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: var(--font-sm);
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
