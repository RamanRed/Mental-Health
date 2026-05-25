'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { registerPatient } from '@/lib/api';
import { GENDERS, LANGUAGES, LITERACY_LEVELS } from '@/lib/constants';
import ConsentToggle from '@/components/ConsentToggle';

function RegisterPatientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: saveLoginSession } = useAuth();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [abhaId, setAbhaId] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [village, setVillage] = useState('');
  const [block, setBlock] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [householdMembers, setHouseholdMembers] = useState(4);
  const [languagePreference, setLanguagePreference] = useState('english');
  const [literacyLevel, setLiteracyLevel] = useState('literate');

  // Consent Toggles
  const [consentToggles, setConsentToggles] = useState({
    guardian1_view_profile: true,
    guardian1_view_consultations: true,
    guardian2_view_basic: true,
    doctor_use_ai: true,
    research_opt_in: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = searchParams.get('phone');
    if (p) setPhone(p);
  }, [searchParams]);

  const handleToggleChange = (key) => (val) => {
    setConsentToggles((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!abhaId.trim()) {
      setError('ABHA ID is required for patient identification.');
      return;
    }

    setLoading(true);

    const payload = {
      phone,
      full_name: fullName,
      abha_id: abhaId.trim(),
      age: parseInt(age) || 0,
      date_of_birth: dob,
      gender,
      village,
      block,
      district,
      state,
      contact_number: phone,
      household_members: parseInt(householdMembers) || 0,
      language_preference: languagePreference,
      literacy_level: literacyLevel,
      consent_toggles: consentToggles,
    };

    try {
      const response = await registerPatient(payload);
      saveLoginSession(response.access_token, {
        id: response.user_id,
        phone,
        role: 'patient',
        verification_status: 'verified',
      });
      router.push('/dashboard/patient');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please verify if ABHA ID is unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container glass-card-static flex-col animate-fade-in-up">
        <div className="register-header flex-col flex-center">
          <span className="logo-emoji">🧑‍⚕️</span>
          <h2>Patient Identity Registration</h2>
          <p className="register-desc">Create your MANAS patient account linked to your phone and ABHA ID</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form flex-col">
          {/* Section 1: Phone */}
          <div className="form-section-title">Core Information</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number (Pre-filled)</label>
              <input className="form-input" type="tel" value={phone} disabled />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="abha-id-input">
                ABHA ID (Ayushman Bharat Health Account) *
              </label>
              <input
                id="abha-id-input"
                className="form-input"
                type="text"
                placeholder="14-digit ABHA Number"
                value={abhaId}
                onChange={(e) => setAbhaId(e.target.value)}
                required
                disabled={loading}
              />
              <span className="form-hint">Used for secure, unique healthcare linkage.</span>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="full-name-input">Full Name</label>
              <input
                id="full-name-input"
                className="form-input"
                type="text"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="gender-select">Gender</label>
              <select
                id="gender-select"
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={loading}
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="age-input">Age</label>
              <input
                id="age-input"
                className="form-input"
                type="number"
                placeholder="Age in years"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dob-input">Date of Birth</label>
              <input
                id="dob-input"
                className="form-input"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Section 2: Location */}
          <div className="form-section-title">Location & Demographics</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="village-input">Village</label>
              <input
                id="village-input"
                className="form-input"
                type="text"
                placeholder="Village name"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="block-input">Block</label>
              <input
                id="block-input"
                className="form-input"
                type="text"
                placeholder="Block/Taluk"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="district-input">District</label>
              <input
                id="district-input"
                className="form-input"
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="state-input">State</label>
              <input
                id="state-input"
                className="form-input"
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="members-input">Household Members</label>
              <input
                id="members-input"
                className="form-input"
                type="number"
                value={householdMembers}
                onChange={(e) => setHouseholdMembers(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="lang-select">Language Preference</label>
              <select
                id="lang-select"
                className="form-select"
                value={languagePreference}
                onChange={(e) => setLanguagePreference(e.target.value)}
                disabled={loading}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="literacy-select">Literacy Level</label>
              <select
                id="literacy-select"
                className="form-select"
                value={literacyLevel}
                onChange={(e) => setLiteracyLevel(e.target.value)}
                disabled={loading}
              >
                {LITERACY_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Consent */}
          <div className="form-section-title">Data Sharing & Consent Settings</div>
          <p className="consent-help-text">You can change these permissions at any time from your settings panel.</p>

          <div className="consent-toggles-box flex-col">
            <ConsentToggle
              label="Primary Guardian Access"
              description="Allow your designated primary family guardian to check your wellness scores, streak, and notifications."
              checked={consentToggles.guardian1_view_profile}
              onChange={handleToggleChange('guardian1_view_profile')}
              disabled={loading}
            />

            <ConsentToggle
              label="Consultation Summary Sharing"
              description="Allow your primary guardian to see summary notes of doctor consultations."
              checked={consentToggles.guardian1_view_consultations}
              onChange={handleToggleChange('guardian1_view_consultations')}
              disabled={loading}
            />

            <ConsentToggle
              label="Secondary Guardian Basic Access"
              description="Allow regional health workers (ASHA, Anganwadi, NGO) to view basic mood check-in activity."
              checked={consentToggles.guardian2_view_basic}
              onChange={handleToggleChange('guardian2_view_basic')}
              disabled={loading}
            />

            <ConsentToggle
              label="AI-driven Consultation Diagnostics"
              description="Allow doctor dashboard to run transcription, summarizing, and clinical form auto-fill on consultation sessions."
              checked={consentToggles.doctor_use_ai}
              onChange={handleToggleChange('doctor_use_ai')}
              disabled={loading}
            />

            <ConsentToggle
              label="Anonymised Research Sharing"
              description="Opt-in to share anonymised wellbeing trends for mental health research studies."
              checked={consentToggles.research_opt_in}
              onChange={handleToggleChange('research_opt_in')}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg register-btn" disabled={loading}>
            {loading ? 'Registering Patient...' : 'Complete Patient Registration'}
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
          color: var(--color-patient-light);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: var(--space-sm);
          margin-top: var(--space-md);
        }

        .consent-help-text {
          font-size: var(--font-xs);
          color: var(--text-muted);
          margin-top: -10px;
        }

        .consent-toggles-box {
          gap: 0;
        }

        .register-btn {
          background: var(--gradient-patient);
          margin-top: var(--space-md);
        }
      `}</style>
    </div>
  );
}

export default function RegisterPatient() {
  return (
    <Suspense fallback={
      <div className="register-page flex-center">
        <div className="spinner animate-spin spinner-lg"></div>
      </div>
    }>
      <RegisterPatientForm />
    </Suspense>
  );
}
