'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listAvailableDoctors, requestAppointment, getMyAppointments, cancelAppointment } from '@/lib/api';

export default function PatientAppointmentsPage() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const docs = await listAvailableDoctors();
      setDoctors(docs);

      const appts = await getMyAppointments();
      setAppointments(appts);
      
      if (docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load appointments data. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !preferredDate || !preferredTime) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setBookingLoading(true);
      setError('');
      setSuccessMsg('');

      // Combine date and time
      const dateTimeString = `${preferredDate}T${preferredTime}:00`;
      const dateObj = new Date(dateTimeString);

      await requestAppointment({
        doctor_id: selectedDoctorId,
        preferred_date: dateObj.toISOString(),
        urgency,
        patient_notes: notes
      });

      setSuccessMsg('Appointment requested successfully! You will be notified when the doctor accepts.');
      setNotes('');
      setPreferredDate('');
      setPreferredTime('');
      setUrgency('normal');
      
      // Reload appointment requests
      const appts = await getMyAppointments();
      setAppointments(appts);
    } catch (err) {
      setError(err.message || 'Failed to submit appointment request.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment request?')) {
      return;
    }

    try {
      await cancelAppointment(id);
      setSuccessMsg('Appointment cancelled successfully.');
      
      // Reload list
      const appts = await getMyAppointments();
      setAppointments(appts);
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="appointments-page">
      
      {/* Back button */}
      <div className="appointments-top-bar">
        <div className="appointments-top-bar-left">
          <Link href="/dashboard/patient" className="back-btn">
            ← Dashboard
          </Link>
          <h1 className="appointments-title">Appointments Desk</h1>
        </div>
      </div>

      {error && (
        <div className="alert-banner error">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="alert-banner success">
          ✨ {successMsg}
        </div>
      )}

      <div className="appointments-grid">
        
        {/* Booking Form */}
        <div className="booking-form-card">
          <h2 className="booking-form-title">Request New Slot</h2>
          <p className="booking-form-desc">
            Book a counseling session. Choose a therapist, date, and describe how you are feeling.
          </p>

          <form onSubmit={handleBookingSubmit} className="booking-form">
            
            {/* Select Doctor */}
            <div className="field-group">
              <label className="field-label">Choose Specialist *</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="field-select"
                required
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.full_name} ({doc.specialization || 'Therapist'})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Date */}
            <div className="field-group">
              <label className="field-label">Preferred Date *</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="field-input"
                required
              />
            </div>

            {/* Select Time */}
            <div className="field-group">
              <label className="field-label">Preferred Time *</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="field-input"
                required
              />
            </div>

            {/* Urgency */}
            <div className="field-group">
              <label className="field-label">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="field-select"
              >
                <option value="normal">Normal Wellness Check-in</option>
                <option value="urgent">Urgent Counseling Required</option>
                <option value="emergency">🚨 High Distress Crisis Action</option>
              </select>
            </div>

            {/* Patient Notes */}
            <div className="field-group">
              <label className="field-label">Describe what's on your mind (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Share any mood trends, concerns, or special notes for your doctor..."
                className="field-textarea"
              />
            </div>

            <button
              type="submit"
              disabled={bookingLoading || doctors.length === 0}
              className="booking-submit-btn"
            >
              {bookingLoading ? (
                <div className="booking-spinner"></div>
              ) : (
                'Submit Booking Request 📅'
              )}
            </button>

          </form>
        </div>

        {/* Appointments List */}
        <div className="appointments-list-card">
          <h2 className="appointments-list-title">Your Requested Slots</h2>
          
          <div className="appointments-list">
            {appointments.length > 0 ? (
              appointments.map((appt) => {
                const isPending = appt.status === 'pending';
                const isAccepted = appt.status === 'accepted';
                const isRejected = appt.status === 'rejected';
                
                return (
                  <div key={appt.id} className="appointment-item">
                    <div className="appointment-info">
                      <div className="appointment-doctor-row">
                        <span className="appointment-doctor-name">Dr. {appt.doctor_name}</span>
                        <span className={`urgency-pill ${appt.urgency}`}>
                          {appt.urgency}
                        </span>
                      </div>
                      
                      <div className="appointment-meta">
                        <span className="appointment-meta-item">
                          📅 {new Date(appt.preferred_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="appointment-meta-item">
                          ⏰ {new Date(appt.preferred_date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {appt.patient_notes && (
                        <p className="appointment-notes">
                          " {appt.patient_notes} "
                        </p>
                      )}

                      {isRejected && appt.rejection_reason && (
                        <div className="rejection-reason">
                          <strong>Rejection Reason:</strong> {appt.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div className="appointment-actions">
                      <span className={`status-pill ${isAccepted ? 'accepted' : isRejected ? 'rejected' : isPending ? 'pending' : 'default'}`}>
                        {appt.status}
                      </span>

                      {isPending && (
                        <button
                          onClick={() => handleCancelRequest(appt.id)}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-appointments">
                No appointment requests yet. Fill in the form on the left to start.
              </div>
            )}
          </div>
        </div>

      </div>

      <style jsx>{`
        .appointments-page {
          max-width: 1152px;
          margin: 0 auto;
          padding: 16px;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .appointments-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .appointments-top-bar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .back-btn {
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          transition: all 0.3s ease;
          font-size: var(--font-xs);
          font-weight: 600;
          text-decoration: none;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }
        .appointments-title {
          font-size: var(--font-2xl);
          font-weight: 700;
        }
        .alert-banner {
          padding: 16px;
          border-radius: 16px;
          font-size: var(--font-sm);
        }
        .alert-banner.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        .alert-banner.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }
        .appointments-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .appointments-grid {
            grid-template-columns: 1fr 2fr;
          }
        }
        .booking-form-card {
          padding: 24px;
          border-radius: 24px;
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }
        .booking-form-title {
          font-size: var(--font-lg);
          font-weight: 700;
          color: #34d399;
        }
        .booking-form-desc {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }
        .booking-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 8px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: var(--font-xs);
          font-weight: 600;
          color: var(--text-secondary);
        }
        .field-input,
        .field-select,
        .field-textarea {
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
        .field-input:focus,
        .field-select:focus,
        .field-textarea:focus {
          border-color: #10b981;
        }
        .field-textarea {
          resize: none;
        }
        .booking-submit-btn {
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
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
        .booking-submit-btn:hover {
          background: #047857;
        }
        .booking-submit-btn:disabled {
          background: var(--bg-tertiary);
          cursor: not-allowed;
          box-shadow: none;
        }
        .booking-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .appointments-list-card {
          padding: 24px;
          border-radius: 24px;
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }
        .appointments-list-title {
          font-size: var(--font-lg);
          font-weight: 700;
        }
        .appointments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 70vh;
          overflow-y: auto;
          padding-right: 4px;
        }
        .appointment-item {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.3s ease;
        }
        @media (min-width: 768px) {
          .appointment-item {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .appointment-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .appointment-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .appointment-doctor-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .appointment-doctor-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .urgency-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .urgency-pill.emergency {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .urgency-pill.urgent {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .urgency-pill.normal {
          background: rgba(13, 148, 136, 0.2);
          color: #2dd4bf;
          border: 1px solid rgba(13, 148, 136, 0.3);
        }
        .appointment-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          column-gap: 16px;
          row-gap: 4px;
          font-size: var(--font-xs);
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .appointment-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .appointment-notes {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          background: rgba(2, 6, 23, 0.4);
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(30, 41, 59, 0.5);
          margin-top: 8px;
          font-style: italic;
        }
        .rejection-reason {
          margin-top: 8px;
          font-size: var(--font-xs);
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 10px;
          border-radius: 12px;
        }
        .appointment-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: flex-end;
        }
        .status-pill {
          font-size: var(--font-xs);
          font-weight: 600;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          text-transform: capitalize;
        }
        .status-pill.accepted {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-pill.rejected {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .status-pill.pending {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .status-pill.default {
          background: rgba(100, 116, 139, 0.2);
          color: var(--text-secondary);
          border: 1px solid rgba(100, 116, 139, 0.3);
        }
        .cancel-btn {
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(220, 38, 38, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          font-size: var(--font-xs);
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .cancel-btn:hover {
          background: #dc2626;
          color: white;
        }
        .empty-appointments {
          text-align: center;
          padding: 48px 0;
          color: var(--text-muted);
          font-size: var(--font-sm);
        }
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid transparent;
          border-top-color: #10b981;
          border-bottom-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
