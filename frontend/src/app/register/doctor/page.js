'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { registerDoctor } from '@/lib/api';

function RegisterDoctorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: saveLoginSession } = useAuth();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('Psychiatrist');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = searchParams.get('phone');
    if (p) setPhone(p);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!registrationNumber.trim()) {
      setError('Medical registration license number is required.');
      return;
    }

    setLoading(true);

    const payload = {
      phone,
      full_name: fullName,
      specialization,
      registration_number: registrationNumber.trim(),
      hospital_affiliation: hospitalAffiliation,
    };

    try {
      const response = await registerDoctor(payload);
      saveLoginSession(response.access_token, {
        id: response.user_id,
        phone,
        role: 'doctor',
        verification_status: 'verified',
      });
      router.push('/dashboard/doctor');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Doctor registration failed. Verify that license registration is unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container glass-card-static flex-col animate-fade-in-up">
        <div className="register-header flex-col flex-center">
          <span className="logo-emoji">⚕️</span>
          <h2>Doctor Profile Registration</h2>
          <p className="register-desc">Create your clinician account with verified registration credentials</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form flex-col">
          <div className="form-section-title">Clinician Credentials</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number (Pre-filled)</label>
              <input className="form-input" type="tel" value={phone} disabled />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-input">Medical License Registration Number *</label>
              <input
                id="reg-input"
                className="form-input"
                type="text"
                placeholder="e.g. MCI-12345, State Board ID"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                required
                disabled={loading}
              />
              <span className="form-hint">Used for mandatory license verification.</span>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="full-name-input">Full Name</label>
              <input
                id="full-name-input"
                className="form-input"
                type="text"
                placeholder="Dr. Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="spec-select">Specialization / Expertise</label>
              <select
                id="spec-select"
                className="form-select"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                disabled={loading}
              >
                <option value="Psychiatrist">Psychiatrist (MD/DPM)</option>
                <option value="Clinical Psychologist">Clinical Psychologist (M.Phil)</option>
                <option value="Counsellor">Mental Health Counsellor</option>
                <option value="Medical Social Worker">Psychiatric Social Worker</option>
                <option value="General Practitioner">General Practitioner (MBBS)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="hospital-input">Primary Hospital / Clinic Affiliation</label>
            <input
              id="hospital-input"
              className="form-input"
              type="text"
              placeholder="e.g. District Hospital, Wellness Center"
              value={hospitalAffiliation}
              onChange={(e) => setHospitalAffiliation(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg register-btn" disabled={loading}>
            {loading ? 'Registering Doctor...' : 'Complete Doctor Registration'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          width: 100vw;
          background: var(--gradient-bg);
          padding: var(--space-2xl) var(--space-md);
        }

        .register-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: var(--space-2xl);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-xl);
          gap: var(--space-xl);
        }

        .register-header {
          gap: var(--space-xs);
          text-align: center;
        }

        .logo-emoji {
          font-size: 3rem;
        }

        .register-container h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .register-desc {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #EF4444;
          padding: var(--space-md);
          border-radius: var(--radius-md);
          font-size: var(--font-sm);
          text-align: center;
        }

        .register-form {
          gap: var(--space-lg);
        }

        .form-section-title {
          font-size: var(--font-lg);
          font-weight: 600;
          color: var(--color-doctor-light);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: var(--space-sm);
          margin-top: var(--space-md);
        }

        .register-btn {
          background: var(--gradient-doctor);
          margin-top: var(--space-md);
        }
      `}</style>
    </div>
  );
}

export default function RegisterDoctor() {
  return (
    <Suspense fallback={
      <div className="register-page flex-center">
        <div className="spinner animate-spin spinner-lg"></div>
      </div>
    }>
      <RegisterDoctorForm />
    </Suspense>
  );
}
