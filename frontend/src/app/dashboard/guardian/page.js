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
      if (err.message && err.message.toLowerCase().includes('profile not found')) {
        setError('Guardian profile not found. Your session may be stale or the database was reset. Please click Logout and register a new guardian profile.');
      } else {
        setError('Failed to load guardian dashboard records.');
      }
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
      <div className="tabs-row">
        <button
          onClick={() => setActiveTab('linked')}
          className={`tab-btn ${activeTab === 'linked' ? 'active' : ''}`}
        >
          My Linked Patients ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className={`tab-btn ${activeTab === 'nearby' ? 'active' : ''}`}
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
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Make sure you have captured your coordinates using the badge above.</p>
                </div>
              ) : (
                <div className="patients-grid flex-col">
                  {nearbyPatients.map((patient) => (
                    <div key={patient.id} className="distance-badge-container">
                      <PatientCard
                        patient={patient}
                        onClick={() => handleOpenPatientDetails(patient)}
                      />
                      {patient.distance_km !== undefined && (
                        <span className="distance-badge">
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
        <div className="details-modal-overlay">
          <div className="details-modal-container">
            <div className="details-modal-header">
              <div className="details-modal-title-wrapper">
                <h3 className="details-modal-title">{viewingPatient.full_name}</h3>
                <span className="details-modal-subtitle">ABHA ID: {viewingPatient.abha_id || 'Not Linked'}</span>
              </div>
              <button
                onClick={() => setViewingPatient(null)}
                className="details-modal-close-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="details-modal-close-icon">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Demographics Card */}
            <div className="demographics-card">
              <div className="demographics-item">
                <span className="demographics-label">Age / Gender</span>
                <strong className="demographics-value">{viewingPatient.age} yrs / {viewingPatient.gender}</strong>
              </div>
              <div className="demographics-item">
                <span className="demographics-label">Location</span>
                <strong className="demographics-value">{viewingPatient.village}, {viewingPatient.district}</strong>
              </div>
              <div className="demographics-item">
                <span className="demographics-label">Literacy Level</span>
                <strong className="demographics-value" style={{ textTransform: 'capitalize' }}>{viewingPatient.literacy_level?.replace('_', ' ') || 'Literate'}</strong>
              </div>
              <div className="demographics-item">
                <span className="demographics-label">Language Preference</span>
                <strong className="demographics-value" style={{ textTransform: 'capitalize' }}>{viewingPatient.language_preference || 'English'}</strong>
              </div>
            </div>

            {/* Contact Details */}
            <div className="contact-info-section">
              <h4 className="contact-info-title">Contact Information</h4>
              <div className="contact-grid-modal">
                <div className="contact-modal-card patient-card">
                  <div className="contact-modal-card-header">
                    <span className="contact-modal-card-label">Patient</span>
                  </div>
                  <strong className="contact-modal-card-value">
                    📞 {viewingPatient.contact_number || viewingPatient.phone || 'No phone number provided'}
                  </strong>
                </div>

                {viewingPatient.guardian1_name && (
                  <div className="contact-modal-card">
                    <div className="contact-modal-card-header">
                      <span className="contact-modal-card-relation">
                        {viewingPatient.guardian1_type?.replace('_', ' ') || 'Primary Guardian'}
                      </span>
                    </div>
                    <strong className="contact-modal-card-name">{viewingPatient.guardian1_name}</strong>
                    {viewingPatient.guardian1_phone && (
                      <span className="contact-modal-card-phone">📞 {viewingPatient.guardian1_phone}</span>
                    )}
                  </div>
                )}

                {viewingPatient.guardian2_name && (
                  <div className="contact-modal-card">
                    <div className="contact-modal-card-header">
                      <span className="contact-modal-card-relation">
                        {viewingPatient.guardian2_type?.replace('_', ' ') || 'Secondary Guardian'}
                      </span>
                    </div>
                    <strong className="contact-modal-card-name">{viewingPatient.guardian2_name}</strong>
                    {viewingPatient.guardian2_phone && (
                      <span className="contact-modal-card-phone">📞 {viewingPatient.guardian2_phone}</span>
                    )}
                  </div>
                )}

                {!viewingPatient.guardian1_name && !viewingPatient.guardian2_name && (
                  <div className="contact-modal-card no-guardian">
                    <div className="contact-modal-card-header">
                      <span className="contact-modal-card-label">Family Guardian</span>
                    </div>
                    <span className="contact-modal-card-muted">No family guardian linked to this patient.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shared Consultations Section */}
            <div className="consultations-section">
              <h4 className="consultations-title">Shared Doctor Consultations</h4>
              
              {consultationsLoading ? (
                <div className="flex-center py-6"><div className="spinner animate-spin"></div></div>
              ) : consultationsError ? (
                <div className="consultations-restricted">
                  <strong>🔒 Access Restricted</strong>
                  <p>{consultationsError}</p>
                </div>
              ) : consultations.length === 0 ? (
                <p className="consultations-empty">No clinical consultation summaries shared with you yet.</p>
              ) : (
                <div className="consultations-list">
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
                      <div key={c.id} className="consultation-item-card">
                        <div className="consultation-card-header">
                          <strong className="consultation-card-type">{c.session_type?.replace('_', ' ')}</strong>
                          <span className="consultation-card-date">Date: {cDate}</span>
                        </div>
                        
                        {parsedSummary && typeof parsedSummary === 'object' ? (
                          <div className="consultation-summary-body">
                            {parsedSummary.summary && (
                              <div>
                                <span className="summary-block-label">Clinical Summary</span>
                                <p className="summary-block-text">"{parsedSummary.summary}"</p>
                              </div>
                            )}
                            {parsedSummary.verdict && (
                              <div>
                                <span className="summary-block-label">Doctor Verdict</span>
                                <p className="summary-block-text summary-verdict-text">"{parsedSummary.verdict}"</p>
                              </div>
                            )}
                            {parsedSummary.notes && (
                              <div>
                                <span className="summary-block-label">Caregiver Instructions</span>
                                <p className="summary-block-text" style={{ fontStyle: 'italic' }}>"{parsedSummary.notes}"</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="summary-block-text" style={{ fontSize: '12px' }}>"{c.consultation_summary}"</p>
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

        .tabs-row {
          display: flex;
          flex-direction: row;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 16px;
        }

        .tab-btn {
          padding: 12px 24px;
          font-size: var(--font-sm);
          font-weight: 600;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn.active {
          border-bottom-color: #0d9488;
          color: #2dd4bf;
          font-weight: 700;
        }

        .distance-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(13, 148, 136, 0.1);
          color: #2dd4bf;
          border: 1px solid rgba(13, 148, 136, 0.2);
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          pointer-events: none;
        }

        .distance-badge-container {
          position: relative;
        }

        .details-modal-overlay {
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

        .details-modal-container {
          width: 100%;
          max-width: 672px; /* max-w-2xl */
          padding: 24px;
          border-radius: 24px;
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
          max-height: 85vh;
          overflow-y: auto;
        }

        .details-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .details-modal-title-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .details-modal-title {
          font-size: var(--font-xl);
          font-weight: 700;
          color: #2dd4bf;
          margin: 0;
        }

        .details-modal-subtitle {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }

        .details-modal-close-btn {
          padding: 4px;
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

        .details-modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .details-modal-close-icon {
          width: 20px;
          height: 20px;
        }

        .demographics-card {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .demographics-item {
          display: flex;
          flex-direction: column;
        }

        .demographics-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
        }

        .demographics-value {
          color: var(--text-primary);
          font-size: var(--font-base);
          font-weight: 700;
        }

        .contact-info-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-info-title {
          font-size: var(--font-base);
          font-weight: 700;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
          margin: 0;
        }

        .contact-grid-modal {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 600px) {
          .contact-grid-modal {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }

        .contact-modal-card {
          padding: 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .contact-modal-card.patient-card {
          background: rgba(45, 212, 191, 0.03);
          border: 1px solid rgba(45, 212, 191, 0.1);
        }

        .contact-modal-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .contact-modal-card-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .contact-modal-card-relation {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-guardian-light);
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .contact-modal-card-name {
          font-size: var(--font-base);
          font-weight: 700;
          color: var(--text-primary);
        }

        .contact-modal-card-value {
          font-size: var(--font-base);
          font-weight: 700;
          color: #2dd4bf;
        }

        .contact-modal-card-phone {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }

        .contact-modal-card-muted {
          font-size: var(--font-xs);
          color: var(--text-muted);
          font-style: italic;
        }

        .consultations-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .consultations-title {
          font-size: var(--font-base);
          font-weight: 700;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
          margin: 0;
        }

        .consultations-restricted {
          padding: 16px;
          border-radius: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          font-size: var(--font-xs);
          color: #f87171;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .consultations-empty {
          font-size: var(--font-xs);
          color: var(--text-muted);
          font-style: italic;
          padding: 16px 0;
          text-align: center;
        }

        .consultations-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .consultation-item-card {
          padding: 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .consultation-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--font-xs);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
        }

        .consultation-card-type {
          color: #2dd4bf;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .consultation-card-date {
          color: var(--text-muted);
        }

        .consultation-summary-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }

        .summary-block-label {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
        }

        .summary-block-text {
          margin-top: 2px;
          font-size: 13px;
          line-height: 1.5;
        }

        .summary-verdict-text {
          color: #34d399;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
