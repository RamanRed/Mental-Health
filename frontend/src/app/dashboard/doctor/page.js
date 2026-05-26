'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDoctorProfile, getPatientQueue, getPatientBrief, createSession, listDoctorSessions, updateDoctorProfile, initiateVideoCall, getDoctorPendingAppointments, acceptAppointment, rejectAppointment, listClinicalForms, sendFollowRequest, getDoctorFollowRequests, getDoctorPatientAnalytics, getPatientPastConsultations, getPatientGuardianNotes } from '@/lib/api';
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

  // Past consultations and guardian notes
  const [patientConsultations, setPatientConsultations] = useState([]);
  const [patientGuardianNotes, setPatientGuardianNotes] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('consultations');
  const [activeQueueTab, setActiveQueueTab] = useState('active');



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
      if (err.message && err.message.toLowerCase().includes('profile not found')) {
        setError('Doctor profile not found. Your session may be stale or the database was reset. Please click Logout and register a new doctor profile.');
      } else {
        setError('Failed to load doctor dashboard data.');
      }
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
    setPatientConsultations([]);
    setPatientGuardianNotes([]);
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
    }

    try {
      const consultations = await getPatientPastConsultations(patient.id);
      setPatientConsultations(consultations);
    } catch (e) {
      console.error('Failed to load past consultations:', e);
    }

    try {
      const notes = await getPatientGuardianNotes(patient.id);
      setPatientGuardianNotes(notes);
    } catch (e) {
      console.error('Failed to load guardian notes:', e);
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

  const activePatients = patients.filter((p) => !p.is_treated);
  const treatedPatients = patients.filter((p) => p.is_treated);

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
          <div className="queue-tabs flex-row">
            <button 
              type="button"
              onClick={() => setActiveQueueTab('active')} 
              className={`queue-tab-btn ${activeQueueTab === 'active' ? 'active' : ''}`}
            >
              Active Queue ({activePatients.length})
            </button>
            <button 
              type="button"
              onClick={() => setActiveQueueTab('treated')} 
              className={`queue-tab-btn ${activeQueueTab === 'treated' ? 'active' : ''}`}
            >
              Treated Patients ({treatedPatients.length})
            </button>
          </div>
          
          {(activeQueueTab === 'active' ? activePatients.length : treatedPatients.length) === 0 ? (
            <div className="no-patients glass-card flex-col flex-center">
              <span className="no-patients-icon">🧑‍🤝‍🧑</span>
              <p>No {activeQueueTab} patients found.</p>
            </div>
          ) : (
            <div className="patients-grid flex-col">
              {(activeQueueTab === 'active' ? activePatients : treatedPatients).map((patient) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleInitiateCall(selectedPatient)}
                      className="doctor-call-btn"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Start Call 📹
                    </button>
                    <button
                      onClick={() => setShowFollowModal(true)}
                      className="doctor-follow-btn"
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
                  <div className="analytics-panel">
                    <h5 className="analytics-title">Patient Data Analytics (Last 30 Days)</h5>
                    <div className="analytics-grid">
                      <div className="analytics-stat">
                        <span className="analytics-stat-value teal">{patientAnalytics.current_streak}</span>
                        <span className="analytics-stat-label">Day Streak</span>
                      </div>
                      <div className="analytics-stat">
                        <span className="analytics-stat-value amber">{patientAnalytics.avg_mood_score ?? '—'}</span>
                        <span className="analytics-stat-label">Avg Mood</span>
                      </div>
                      <div className="analytics-stat">
                        <span className="analytics-stat-value emerald">{patientAnalytics.session_stats?.completed}</span>
                        <span className="analytics-stat-label">Sessions Done</span>
                      </div>
                    </div>
                    {/* Mood trend sparkline bar chart */}
                    {patientAnalytics.mood_trend?.length > 0 && (
                      <div className="mood-trend-section">
                        <span className="mood-trend-label">Mood Trend</span>
                        <div className="mood-trend-bars">
                          {patientAnalytics.mood_trend.slice(-14).map((t, i) => (
                            <div
                              key={i}
                              title={`${t.date}: ${t.avg_score}`}
                              className="mood-trend-bar"
                              style={{
                                height: `${(t.avg_score / 10) * 100}%`,
                                background: t.avg_score >= 7 ? '#10b981' : t.avg_score >= 4 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Risk trend badges */}
                    {patientAnalytics.risk_trend?.length > 0 && (
                      <div className="risk-trend-section">
                        <span className="mood-trend-label">Risk History</span>
                        <div className="risk-trend-badges">
                          {patientAnalytics.risk_trend.slice(-8).map((r, i) => (
                            <span key={i} className={`risk-trend-badge ${
                              r.risk_level === 'high' ? 'high'
                              : r.risk_level === 'medium' ? 'medium'
                              : 'low'
                            }`}>{r.risk_level}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="analytics-footer">
                      <span>📝 {patientAnalytics.total_mood_entries} mood logs</span>
                      <span>📋 {patientAnalytics.questionnaire_count} questionnaires</span>
                      <span>🏥 {patientAnalytics.guardian_notes_count} guardian notes</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Patient History & Logs Card */}
              <div className="history-logs-card glass-card-static flex-col animate-fade-in">
                <div className="history-tabs flex-row">
                  <button 
                    type="button"
                    onClick={() => setActiveHistoryTab('consultations')} 
                    className={`history-tab-btn ${activeHistoryTab === 'consultations' ? 'active' : ''}`}
                  >
                    Past Consultations ({patientConsultations.length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveHistoryTab('guardian_notes')} 
                    className={`history-tab-btn ${activeHistoryTab === 'guardian_notes' ? 'active' : ''}`}
                  >
                    Guardian Logs ({patientGuardianNotes.length})
                  </button>
                </div>

                <div className="history-tab-content">
                  {activeHistoryTab === 'consultations' ? (
                    <div className="history-list flex-col">
                      {patientConsultations.length === 0 ? (
                        <p className="history-empty">No past consultations recorded for this patient.</p>
                      ) : (
                        patientConsultations.map((c) => {
                          const cDate = new Date(c.scheduled_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          });

                          let parsedSummary = null;
                          try {
                            parsedSummary = JSON.parse(c.consultation_summary);
                          } catch (e) {
                            parsedSummary = { summary: c.consultation_summary };
                          }

                          return (
                            <div key={c.id} className="history-item-card">
                              <div className="history-item-header flex-between">
                                <strong className="history-item-title">Session #{c.session_number} ({c.session_type?.replace('_', ' ')})</strong>
                                <span className="history-item-date">{cDate}</span>
                              </div>
                              <div className="history-item-meta font-xs text-secondary" style={{ marginTop: '2px', fontSize: '11px' }}>
                                Format: <strong style={{ color: 'var(--text-primary)' }}>{c.format?.replace('_', ' ')}</strong> | Doctor: <strong style={{ color: 'var(--text-primary)' }}>{c.doctor_name || 'Dr. ' + profile.full_name}</strong>
                              </div>
                              {parsedSummary && typeof parsedSummary === 'object' ? (
                                <div className="history-item-body">
                                  {parsedSummary.summary && (
                                    <div className="history-item-summary-block">
                                      <span className="summary-block-label">Clinical Summary</span>
                                      <p className="summary-block-text">"{parsedSummary.summary}"</p>
                                    </div>
                                  )}
                                  {parsedSummary.verdict && (
                                    <div className="history-item-summary-block">
                                      <span className="summary-block-label">Doctor Verdict</span>
                                      <p className="summary-block-text summary-verdict-text">"{parsedSummary.verdict}"</p>
                                    </div>
                                  )}
                                  {parsedSummary.notes && (
                                    <div className="history-item-summary-block">
                                      <span className="summary-block-label">Caregiver Instructions</span>
                                      <p className="summary-block-text" style={{ fontStyle: 'italic' }}>"{parsedSummary.notes}"</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="summary-block-text font-sm" style={{ fontStyle: 'italic', marginTop: '6px' }}>
                                  "{c.consultation_summary || 'No summary recorded.'}"
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="history-list flex-col">
                      {patientGuardianNotes.length === 0 ? (
                        <p className="history-empty">No guardian observation logs recorded for this patient.</p>
                      ) : (
                        patientGuardianNotes.map((note) => {
                          const nDate = new Date(note.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <div key={note.id} className="history-item-card note-card">
                              <div className="history-item-header flex-between">
                                <span className={`note-type-badge ${note.note_type}`}>
                                  {note.note_type}
                                </span>
                                <span className="history-item-date">{nDate}</span>
                              </div>
                              <p className="note-text font-sm">"{note.note_text}"</p>
                              <div className="note-attribution font-xs text-muted" style={{ marginTop: '4px', fontSize: '10px' }}>
                                Logged by: <strong style={{ color: 'var(--text-secondary)' }}>{note.guardian_name || 'ASHA / Guardian'}</strong>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
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
            <div className="sessions-vertical-list flex-col" style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
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
          <div className="pending-requests-section">
            <h3 className="pending-requests-title">Appointment Requests ({pendingAppointments.length})</h3>
            {pendingAppointments.length === 0 ? (
              <p className="pending-requests-empty">No pending patient appointment requests.</p>
            ) : (
              <div className="pending-requests-list">
                {pendingAppointments.map((appt) => (
                  <div key={appt.id} className="pending-appt-card">
                    <div className="pending-appt-header">
                      <div className="pending-appt-patient">
                        <strong className="pending-appt-name">Patient: {appt.patient_name}</strong>
                        <span className="pending-appt-date">
                          Date: {new Date(appt.preferred_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <span className={`urgency-badge ${appt.urgency}`}>
                        {appt.urgency}
                      </span>
                    </div>
                    {appt.patient_notes && (
                      <p className="pending-appt-notes">
                        "{appt.patient_notes}"
                      </p>
                    )}
                    <div className="pending-appt-actions">
                      <button
                        onClick={() => handleOpenRejectModal(appt.id)}
                        className="appt-decline-btn"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleOpenAcceptModal(appt.id)}
                        className="appt-accept-btn"
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
        <div className="follow-modal-overlay">
          <form
            onSubmit={handleSendFollowRequest}
            className="follow-modal-form"
          >
            <div className="follow-modal-header">
              <h3 className="follow-modal-title">📨 Send Follow-Up Request</h3>
              <button type="button" onClick={() => setShowFollowModal(false)}
                className="modal-close-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="modal-close-icon">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="follow-modal-recipient">Sending follow-up request to: <strong style={{ color: 'var(--text-primary)' }}>{selectedPatient.full_name}</strong></p>

            <div className="modal-field-group">
              <label className="modal-field-label">Urgency Level</label>
              <select value={followUrgency} onChange={(e) => setFollowUrgency(e.target.value)}
                className="modal-field-select">
                <option value="routine">Routine Follow-Up</option>
                <option value="urgent">Urgent Follow-Up</option>
                <option value="emergency">Emergency Review</option>
              </select>
            </div>

            <div className="modal-field-group">
              <label className="modal-field-label">Suggested Date (optional)</label>
              <input type="datetime-local" value={followDate} onChange={(e) => setFollowDate(e.target.value)}
                className="modal-field-input" />
            </div>

            <div className="modal-field-group">
              <label className="modal-field-label">Message to Patient</label>
              <textarea value={followMessage} onChange={(e) => setFollowMessage(e.target.value)}
                rows={3} placeholder="Describe reason for follow-up, instructions or concerns..."
                className="modal-field-textarea" />
            </div>

            <button type="submit" disabled={sendingFollow}
              className="follow-submit-btn">
              {sendingFollow ? 'Sending Request...' : 'Send Follow-Up Request 📨'}
            </button>

            {/* My sent follow requests list */}
            {myFollowRequests.length > 0 && (
              <div className="follow-history-section">
                <h4 className="follow-history-title">Previously Sent Requests</h4>
                <div className="follow-history-list">
                  {myFollowRequests.slice(0, 5).map((r) => (
                    <div key={r.id} className="follow-history-item">
                      <span>{r.doctor_name || 'You'} → {r.patient_id.slice(0,8)}...</span>
                      <span className={`follow-status-badge ${r.status}`}>{r.status}</span>
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
        <div className="accept-modal-overlay">
          <form
            onSubmit={handleAcceptAppointmentSubmit}
            className="accept-modal-form"
          >
            <div className="follow-modal-header">
              <h3 className="accept-modal-title">Accept Appointment Request</h3>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="modal-close-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="modal-close-icon">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <p className="accept-modal-desc">
              Configure session parameters to finalize scheduling this consultation in the database.
            </p>

            <div className="modal-field-group">
              <label className="modal-field-label">Session Type</label>
              <select
                value={acceptSessionType}
                onChange={(e) => setAcceptSessionType(e.target.value)}
                className="modal-field-select"
              >
                <option value="early_screening">Initial Diagnostic Screening</option>
                <option value="follow_up_1">Clinical Follow-up 1</option>
                <option value="follow_up_2">Clinical Follow-up 2</option>
              </select>
            </div>

            <div className="modal-field-group">
              <label className="modal-field-label">Format</label>
              <select
                value={acceptFormat}
                onChange={(e) => setAcceptFormat(e.target.value)}
                className="modal-field-select"
              >
                <option value="online_video">Online Video Call</option>
                <option value="online_audio">Online Audio Call</option>
                <option value="in_person">In Person Clinic Visit</option>
              </select>
            </div>

            <div className="modal-field-group">
              <label className="modal-field-label">Clinical Form Template</label>
              <select
                value={acceptFormId}
                onChange={(e) => setAcceptFormId(e.target.value)}
                className="modal-field-select"
              >
                {clinicalForms.map((f) => (
                  <option key={f.id} value={f.id}>{f.form_name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="accept-submit-btn"
            >
              Approve & Schedule Session ➔
            </button>
          </form>
        </div>
      )}

      {/* Doctor Reject Request Modal */}
      {showRejectModal && (
        <div className="accept-modal-overlay">
          <form
            onSubmit={handleRejectAppointmentSubmit}
            className="accept-modal-form"
          >
            <div className="follow-modal-header">
              <h3 className="reject-modal-title">Decline Appointment Request</h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="modal-close-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="modal-close-icon">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="modal-field-group">
              <label className="modal-field-label">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Provide a clinical or scheduling reason for decline (e.g. out of clinic hours, referring to another specialist)..."
                className="modal-field-textarea"
                required
              />
            </div>

            <button
              type="submit"
              className="reject-submit-btn"
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

        .queue-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: var(--space-xs);
        }

        .queue-tab-btn {
          flex: 1;
          padding: var(--space-sm) var(--space-xs);
          font-size: 11px;
          font-weight: 600;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          outline: none;
        }

        .queue-tab-btn:hover {
          color: var(--text-primary);
        }

        .queue-tab-btn.active {
          border-bottom-color: var(--color-doctor-light);
          color: var(--color-doctor-light);
          font-weight: 700;
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

        .history-logs-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .history-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: var(--space-xs);
        }

        .history-tab-btn {
          flex: 1;
          padding: var(--space-sm) var(--space-md);
          font-size: var(--font-sm);
          font-weight: 600;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          text-align: center;
          outline: none;
        }

        .history-tab-btn:hover {
          color: var(--text-primary);
        }

        .history-tab-btn.active {
          border-bottom-color: var(--color-doctor-light);
          color: var(--color-doctor-light);
          font-weight: 700;
        }

        .history-tab-content {
          margin-top: var(--space-xs);
        }

        .history-list {
          gap: var(--space-md);
          max-height: 40vh;
          overflow-y: auto;
          padding-right: var(--space-xs);
          display: flex;
          flex-direction: column;
        }

        .history-empty {
          font-size: var(--font-xs);
          color: var(--text-muted);
          font-style: italic;
          padding: var(--space-lg) 0;
          text-align: center;
        }

        .history-item-card {
          padding: var(--space-md);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          text-align: left;
        }

        .history-item-card.note-card {
          border-left: 3px solid #f59e0b;
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-sm);
        }

        .history-item-title {
          font-size: var(--font-sm);
          font-weight: 700;
          color: var(--text-primary);
        }

        .history-item-date {
          font-size: 10px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .history-item-body {
          margin-top: var(--space-xs);
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .history-item-summary-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-block-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .summary-block-text {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          margin: 0;
        }

        .summary-verdict-text {
          color: #2dd4bf;
          font-weight: 600;
        }

        .note-type-badge {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          width: fit-content;
        }

        .note-type-badge.observation {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        .note-type-badge.check_in {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
        }

        .note-type-badge.concern {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }

        .note-text {
          color: var(--text-secondary);
          margin: 0;
          font-style: italic;
        }

        .note-attribution {
          color: var(--text-muted);
          font-size: 10px;
          text-align: right;
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

        .doctor-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0d9488, #10b981);
          color: white;
          font-weight: 700;
          font-size: var(--font-xs);
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.1);
          border: none;
          cursor: pointer;
        }
        .doctor-call-btn:hover {
          background: linear-gradient(135deg, #0f766e, #059669);
        }
        .doctor-follow-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          font-weight: 700;
          font-size: var(--font-xs);
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.1);
          border: none;
          cursor: pointer;
        }
        .doctor-follow-btn:hover {
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }
        .analytics-panel {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(30, 41, 59, 0.8);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .analytics-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .analytics-stat {
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: center;
        }
        .analytics-stat-value {
          font-size: var(--font-lg);
          font-weight: 700;
        }
        .analytics-stat-value.teal { color: #2dd4bf; }
        .analytics-stat-value.amber { color: #fbbf24; }
        .analytics-stat-value.emerald { color: #34d399; }
        .analytics-stat-label {
          font-size: 10px;
          color: var(--text-muted);
        }
        .mood-trend-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mood-trend-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .mood-trend-bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 40px;
        }
        .mood-trend-bar {
          flex: 1;
          border-radius: 2px;
          transition: all 0.3s ease;
          min-height: 4px;
        }
        .risk-trend-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .risk-trend-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .risk-trend-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }
        .risk-trend-badge.high {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .risk-trend-badge.medium {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .risk-trend-badge.low {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .analytics-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 10px;
          color: var(--text-muted);
        }
        .pending-requests-section {
          border-top: 1px solid rgba(30, 41, 59, 0.8);
          margin-top: 24px;
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pending-requests-title {
          font-size: var(--font-base);
          font-weight: 700;
          color: var(--text-secondary);
          padding-left: 4px;
        }
        .pending-requests-empty {
          font-size: var(--font-xs);
          color: var(--text-muted);
          font-style: italic;
          padding: 16px 8px;
          text-align: center;
        }
        .pending-requests-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 40vh;
          overflow-y: auto;
          padding-right: 4px;
        }
        .pending-appt-card {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: var(--font-xs);
          color: var(--text-secondary);
          text-align: left;
          transition: all 0.3s ease;
        }
        .pending-appt-card:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .pending-appt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pending-appt-patient {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pending-appt-name {
          color: var(--text-primary);
          font-size: var(--font-sm);
          font-weight: 700;
        }
        .pending-appt-date {
          font-size: 10px;
          color: var(--text-secondary);
        }
        .urgency-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .urgency-badge.emergency {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
          animation: pulse 2s infinite;
        }
        .urgency-badge.urgent {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .urgency-badge.normal {
          background: rgba(13, 148, 136, 0.2);
          color: #2dd4bf;
          border: 1px solid rgba(13, 148, 136, 0.3);
        }
        .pending-appt-notes {
          padding: 10px;
          border-radius: 12px;
          background: rgba(2, 6, 23, 0.4);
          border: 1px solid rgba(30, 41, 59, 0.8);
          font-size: 11px;
          font-style: italic;
        }
        .pending-appt-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .appt-decline-btn {
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
        .appt-decline-btn:hover {
          background: #dc2626;
          color: white;
        }
        .appt-accept-btn {
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
        .appt-accept-btn:hover {
          background: #059669;
          color: white;
        }
        .follow-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(12px);
          padding: 16px;
        }
        .follow-modal-form {
          width: 100%;
          max-width: 448px;
          padding: 24px;
          border-radius: 24px;
          background: var(--bg-primary);
          border: 1px solid rgba(91, 33, 182, 0.4);
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          color: var(--text-primary);
        }
        .follow-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .follow-modal-title {
          font-size: var(--font-lg);
          font-weight: 700;
          color: #a78bfa;
        }
        .modal-close-btn {
          padding: 4px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .modal-close-icon {
          width: 20px;
          height: 20px;
        }
        .follow-modal-recipient {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }
        .modal-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .modal-field-label {
          font-size: var(--font-xs);
          font-weight: 600;
          color: var(--text-secondary);
        }
        .modal-field-select,
        .modal-field-input,
        .modal-field-textarea {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          background: var(--bg-input);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: var(--font-sm);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.3s ease;
        }
        .modal-field-select:focus,
        .modal-field-input:focus,
        .modal-field-textarea:focus {
          border-color: #7c3aed;
        }
        .modal-field-textarea {
          resize: none;
        }
        .follow-submit-btn {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border-radius: 12px;
          background: #7c3aed;
          color: white;
          font-weight: 600;
          font-size: var(--font-sm);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        .follow-submit-btn:hover {
          background: #6d28d9;
        }
        .follow-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .follow-history-section {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .follow-history-title {
          font-size: var(--font-xs);
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .follow-history-list {
          max-height: 160px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .follow-history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: var(--font-xs);
        }
        .follow-status-badge {
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 10px;
          text-transform: uppercase;
        }
        .follow-status-badge.accepted {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        .follow-status-badge.declined {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        .follow-status-badge.pending {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }
        .follow-status-badge.sent {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }
        .accept-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(12px);
          padding: 16px;
        }
        .accept-modal-form {
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
          color: var(--text-primary);
        }
        .accept-modal-title {
          font-size: var(--font-lg);
          font-weight: 700;
          color: #34d399;
        }
        .accept-modal-desc {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }
        .accept-submit-btn {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border-radius: 12px;
          background: #059669;
          color: white;
          font-weight: 600;
          font-size: var(--font-sm);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        .accept-submit-btn:hover {
          background: #047857;
        }
        .reject-modal-title {
          font-size: var(--font-lg);
          font-weight: 700;
          color: var(--color-danger);
        }
        .reject-submit-btn {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border-radius: 12px;
          background: #dc2626;
          color: white;
          font-weight: 600;
          font-size: var(--font-sm);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        .reject-submit-btn:hover {
          background: #b91c1c;
        }
      `}</style>
    </div>
  );
}
