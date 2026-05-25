'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getLinkedPatients,
  getGuardianProfile,
  updateGuardianProfile,
  getNearbyPatients,
  getPatientConsultationsForGuardian,
  addGuardianNote
} from '@/lib/api';
import PatientCard from '@/components/PatientCard';
import LocationBadge from '@/components/LocationBadge';

export default function GuardianDashboard() {
  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [nearbyPatients, setNearbyPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('linked'); // 'linked' | 'nearby'
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [error, setError] = useState('');

  // Geolocation
  const [coords, setCoords] = useState({ latitude: null, longitude: null });

  // Observation Note form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('observation'); // observation, check_in, concern
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState('');
  const [noteError, setNoteError] = useState('');

  // Selected Patient Details Modal State
  const [viewingPatient, setViewingPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [consultationsLoading, setConsultationsLoading] = useState(false);
  const [consultationsError, setConsultationsError] = useState('');

  const loadData = async () => {
    try {
      const prof = await getGuardianProfile();
      setProfile(prof);
      setCoords({ latitude: prof.latitude, longitude: prof.longitude });

      const list = await getLinkedPatients();
      setPatients(list);
      if (list.length > 0) {
        setSelectedPatientId(list[0].id);
      }

      // If guardian already has location, load nearby patients
      if (prof.latitude && prof.longitude) {
        setNearbyLoading(true);
        const nearby = await getNearbyPatients(prof.latitude, prof.longitude);
        setNearbyPatients(nearby);
        setNearbyLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load guardian dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLocationCapture = async (latitude, longitude) => {
    try {
      setCoords({ latitude, longitude });
      await updateGuardianProfile({ latitude, longitude });
      console.log('Guardian location saved successfully');
      
      // Load nearby patients dynamically
      setNearbyLoading(true);
      const nearby = await getNearbyPatients(latitude, longitude);
      setNearbyPatients(nearby);
      setNearbyLoading(false);
    } catch (err) {
      console.error('Failed to save guardian location:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    setNoteError('');
    setNoteMessage('');

    if (!selectedPatientId) {
      setNoteError('Please select a patient to record note.');
      return;
    }
    if (!noteText.trim()) {
      setNoteError('Please enter the observation note text.');
      return;
    }

    setSubmittingNote(true);

    try {
      await addGuardianNote(selectedPatientId, noteText, noteType);
      setNoteMessage('Observation note recorded successfully!');
      setNoteText('');
    } catch (err) {
      console.error(err);
      setNoteError(err.message || 'Failed to submit observation note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleOpenPatientDetails = async (patient) => {
    setViewingPatient(patient);
    setConsultations([]);
    setConsultationsError('');
    setConsultationsLoading(true);

    try {
      const data = await getPatientConsultationsForGuardian(patient.id);
      setConsultations(data);
    } catch (err) {
      console.warn('Consultations access restricted:', err.message);
      setConsultationsError(err.message || 'Access Denied: Consultation summaries are not shared.');
    } finally {
      setConsultationsLoading(false);
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
        <p className="error-msg">⚠️ {error || 'Failed to load guardian dashboard profile.'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="guardian-dashboard flex-col">
      {/* Geolocation Badge at the very top */}
      <LocationBadge
        onLocationCapture={handleLocationCapture}
        initialLatitude={profile.latitude}
        initialLongitude={profile.longitude}
      />

      <div className="dashboard-header flex-between">
        <div className="greeting-wrapper">
          <h1 className="welcome-title">Namaste, {profile.full_name} 👋</h1>
          <p className="welcome-subtitle">
            Role: <span className="guardian-type-badge">{profile.guardian_type?.replace('_', ' ').toUpperCase()}</span> |
            Association ID: <strong>{profile.association_id}</strong>
          </p>
        </div>
        <div className="quick-actions-row">
          <Link href="/dashboard/guardian/register-patient" className="btn btn-primary register-patient-btn">
            Register New Patient ➕
          </Link>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="tabs-row flex-row border-b border-slate-800">
        <button
          onClick={() => setActiveTab('linked')}
          className={`tab-btn py-3 px-6 font-semibold text-sm transition ${
            activeTab === 'linked'
              ? 'border-b-2 border-teal-500 text-teal-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          My Linked Patients ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className={`tab-btn py-3 px-6 font-semibold text-sm transition ${
            activeTab === 'nearby'
              ? 'border-b-2 border-teal-500 text-teal-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Nearby Patients (10 km Radius) ({nearbyPatients.length})
        </button>
      </div>

      <div className="grid-2 main-layout-grid">
        {/* Left Column: Patient List based on active tab */}
        <div className="patients-list-section flex-col">
          {activeTab === 'linked' ? (
            <>
              <h3>Your Linked Patients</h3>
              {patients.length === 0 ? (
                <div className="no-patients glass-card flex-col flex-center">
                  <span className="no-patients-icon">🧑‍🤝‍🧑</span>
                  <p>You do not have any patients linked to your account.</p>
                  <Link href="/dashboard/guardian/register-patient" className="btn btn-secondary btn-sm">
                    Register First Patient
                  </Link>
                </div>
              ) : (
                <div className="patients-grid flex-col">
                  {patients.map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onClick={() => handleOpenPatientDetails(patient)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3>Patients Detected in System (Within 10km)</h3>
              {nearbyLoading ? (
                <div className="flex-center py-12"><div className="spinner animate-spin"></div></div>
              ) : nearbyPatients.length === 0 ? (
                <div className="no-patients glass-card flex-col flex-center py-12 text-center text-slate-500">
                  <span>📍</span>
                  <p>No patients detected in system within 10 km of your current coordinates.</p>
                  <p className="text-xs text-slate-600 mt-1">Make sure you have captured your coordinates using the badge above.</p>
                </div>
              ) : (
                <div className="patients-grid flex-col">
                  {nearbyPatients.map((patient) => (
                    <div key={patient.id} className="relative">
                      <PatientCard
                        patient={patient}
                        onClick={() => handleOpenPatientDetails(patient)}
                      />
                      {patient.distance_km !== undefined && (
                        <span className="absolute top-4 right-4 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                          📍 {patient.distance_km} km away
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Add Observation note */}
        <div className="guardian-actions-section flex-col">
          <div className="add-note-card glass-card-static flex-col">
            <h3>Record Observation Log</h3>
            <p className="section-subtitle">Record daily check-ins, behaviors, or health concerns for patient diagnostics.</p>

            {noteMessage && <div className="success-banner">{noteMessage}</div>}
            {noteError && <div className="error-banner">{noteError}</div>}

            <form onSubmit={handleAddNote} className="note-form flex-col">
              <div className="form-group">
                <label className="form-label" htmlFor="patient-select">Select Patient</label>
                <select
                  id="patient-select"
                  className="form-select"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={submittingNote}
                >
                  <option value="" disabled>-- Choose a Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note-type-select">Observation Severity</label>
                <select
                  id="note-type-select"
                  className="form-select"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  disabled={submittingNote}
                >
                  <option value="observation">Routine Observation</option>
                  <option value="check_in">Daily Check-in Log</option>
                  <option value="concern">Medical Concern / Crisis Alert</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note-text-textarea">Observation Note Details</label>
                <textarea
                  id="note-text-textarea"
                  className="form-textarea"
                  placeholder="Describe patient mood, behaviors, sleep habits, or other specific concerns..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  disabled={submittingNote}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={submittingNote}>
                {submittingNote ? 'Saving note...' : 'Submit Log Note ➔'}
              </button>
            </form>
          </div>

          {profile.organization && (
            <div className="region-meta-card glass-card flex-col">
              <h4>Organization Details</h4>
              <p className="text-secondary font-sm">Affiliated Organization: <strong>{profile.organization}</strong></p>
              <p className="text-secondary font-sm">Region: <strong>{profile.region_village}, {profile.region_block}, {profile.region_district}</strong></p>
            </div>
          )}
        </div>
      </div>

      {/* Patient Details & Consultation Summaries Modal */}
      {viewingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white">
          <div className="w-full max-w-2xl p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-5 text-left max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-teal-400">{viewingPatient.full_name}</h3>
                <span className="text-xs text-slate-400">ABHA ID: {viewingPatient.abha_id || 'Not Linked'}</span>
              </div>
              <button
                onClick={() => setViewingPatient(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Demographics Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-2 gap-4 text-sm text-slate-300">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Age / Gender</span>
                <strong className="text-white text-base">{viewingPatient.age} yrs / {viewingPatient.gender}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Location</span>
                <strong className="text-white text-base">{viewingPatient.village}, {viewingPatient.district}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Literacy Level</span>
                <strong className="text-white text-base capitalize">{viewingPatient.literacy_level?.replace('_', ' ') || 'Literate'}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Language Preference</span>
                <strong className="text-white text-base capitalize">{viewingPatient.language_preference || 'English'}</strong>
              </div>
            </div>

            {/* Shared Consultations Section */}
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">Shared Doctor Consultations</h4>
              
              {consultationsLoading ? (
                <div className="flex-center py-6"><div className="spinner animate-spin"></div></div>
              ) : consultationsError ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex flex-col gap-1">
                  <strong>🔒 Access Restricted</strong>
                  <p>{consultationsError}</p>
                </div>
              ) : consultations.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No clinical consultation summaries shared with you yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {consultations.map((c) => {
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
                      <div key={c.id} className="p-4.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs border-b border-slate-800/80 pb-2">
                          <strong className="text-teal-400 uppercase tracking-wider">{c.session_type?.replace('_', ' ')}</strong>
                          <span className="text-slate-400">Date: {cDate}</span>
                        </div>
                        
                        {parsedSummary && typeof parsedSummary === 'object' ? (
                          <div className="flex flex-col gap-2.5 text-xs text-slate-300">
                            {parsedSummary.summary && (
                              <div>
                                <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Clinical Summary</span>
                                <p className="mt-0.5 text-[13px] leading-relaxed">"{parsedSummary.summary}"</p>
                              </div>
                            )}
                            {parsedSummary.verdict && (
                              <div>
                                <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Doctor Verdict</span>
                                <p className="mt-0.5 text-[13px] leading-relaxed font-semibold text-emerald-400">"{parsedSummary.verdict}"</p>
                              </div>
                            )}
                            {parsedSummary.notes && (
                              <div>
                                <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Caregiver Instructions</span>
                                <p className="mt-0.5 text-[13px] leading-relaxed italic">"{parsedSummary.notes}"</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 leading-relaxed">"{c.consultation_summary}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .guardian-dashboard {
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

        .guardian-type-badge {
          background: var(--color-guardian-bg);
          color: var(--color-guardian-light);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: var(--font-xs);
        }

        .main-layout-grid {
          gap: var(--space-xl);
          align-items: start;
        }

        .patients-list-section {
          gap: var(--space-md);
        }

        .patients-list-section h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .no-patients {
          padding: var(--space-3xl) var(--space-xl);
          text-align: center;
          gap: var(--space-md);
        }

        .no-patients-icon {
          font-size: 3rem;
          opacity: 0.2;
        }

        .patients-grid {
          gap: var(--space-md);
        }

        .guardian-actions-section {
          gap: var(--space-xl);
        }

        .add-note-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .add-note-card h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .section-subtitle {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          margin-top: -10px;
        }

        .note-form {
          gap: var(--space-md);
          margin-top: var(--space-sm);
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

        .region-meta-card {
          gap: var(--space-xs);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .region-meta-card h4 {
          font-size: var(--font-sm);
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-guardian-light);
          margin-bottom: var(--space-xs);
        }
      `}</style>
    </div>
  );
}
