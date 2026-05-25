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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 text-white flex flex-col gap-6">
      
      {/* Back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/patient" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Appointments Desk</h1>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          ✨ {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Booking Form */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col gap-4 text-left">
          <h2 className="text-lg font-bold text-emerald-400">Request New Slot</h2>
          <p className="text-xs text-slate-400">
            Book a counseling session. Choose a therapist, date, and describe how you are feeling.
          </p>

          <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4 mt-2">
            
            {/* Select Doctor */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Choose Specialist *</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Preferred Date *</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Select Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Preferred Time *</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Urgency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="normal">Normal Wellness Check-in</option>
                <option value="urgent">Urgent Counseling Required</option>
                <option value="emergency">🚨 High Distress Crisis Action</option>
              </select>
            </div>

            {/* Patient Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Describe what's on your mind (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Share any mood trends, concerns, or special notes for your doctor..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={bookingLoading || doctors.length === 0}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:cursor-not-allowed font-semibold text-sm transition shadow-lg shadow-emerald-500/10 flex justify-center items-center gap-2"
            >
              {bookingLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                'Submit Booking Request 📅'
              )}
            </button>

          </form>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col gap-4 text-left">
          <h2 className="text-lg font-bold">Your Requested Slots</h2>
          
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
            {appointments.length > 0 ? (
              appointments.map((appt) => {
                const isPending = appt.status === 'pending';
                const isAccepted = appt.status === 'accepted';
                const isRejected = appt.status === 'rejected';
                
                return (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-white/10"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Dr. {appt.doctor_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          appt.urgency === 'emergency'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : appt.urgency === 'urgent'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        }`}>
                          {appt.urgency}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          📅 {new Date(appt.preferred_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          ⏰ {new Date(appt.preferred_date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {appt.patient_notes && (
                        <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50 mt-2 italic">
                          " {appt.patient_notes} "
                        </p>
                      )}

                      {isRejected && appt.rejection_reason && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                          <strong>Rejection Reason:</strong> {appt.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        isAccepted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isPending
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {appt.status}
                      </span>

                      {isPending && (
                        <button
                          onClick={() => handleCancelRequest(appt.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                No appointment requests yet. Fill in the form on the left to start.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
