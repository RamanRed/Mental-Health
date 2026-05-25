'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerPatientByGuardian } from '@/lib/api';
import { GENDERS, LANGUAGES, LITERACY_LEVELS } from '@/lib/constants';
import ConsentToggle from '@/components/ConsentToggle';

export default function GuardianRegisterPatient() {
  const router = useRouter();

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
  const [languagePreference, setLanguagePreference] = useState('hindi'); // Default to Hindi for assisted rural registry
  const [literacyLevel, setLiteracyLevel] = useState('illiterate'); // Default to illiterate for assisted flow

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
  const [message, setMessage] = useState('');

  const handleToggleChange = (key) => (val) => {
    setConsentToggles((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!abhaId.trim()) {
      setError('ABHA ID is required for patient identification linkage.');
      return;
    }

    setLoading(true);

    const payload = {
      phone: phone.trim(),
      full_name: fullName,
      abha_id: abhaId.trim(),
      age: parseInt(age) || 0,
      date_of_birth: dob,
      gender,
      village,
      block,
      district,
      state,
      contact_number: phone.trim(),
      household_members: parseInt(householdMembers) || 0,
      language_preference: languagePreference,
      literacy_level: literacyLevel,
      consent_toggles: consentToggles,
    };

    try {
      await registerPatientByGuardian(payload);
      setMessage('Patient registered successfully and linked to your dashboard!');
      
      // Clear fields
      setPhone('');
      setFullName('');
      setAbhaId('');
      setAge('');
      setDob('');
      setVillage('');
      setBlock('');
      setDistrict('');
      setState('');

      // Redirect after 2s
      setTimeout(() => {
        router.push('/dashboard/guardian');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please verify that the phone number and ABHA ID are unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guardian-register-patient-page flex-col">
      <div className="section-header">
        <h2>Register Patient on Behalf</h2>
        <p className="welcome-subtitle">Register a patient who may not have access to a smartphone or requires literacy assistance.</p>
      </div>

      <div className="register-container-box glass-card-static flex-col">
        <div className="attribution-notice flex-row">
          <span className="notice-icon">🛡️</span>
          <div className="notice-text flex-col">
            <strong>Registration Attribution Notice</strong>
            <span>You are creating this profile on behalf of the patient. They will be automatically linked to your guardian dashboard.</span>
          </div>
        </div>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form flex-col">
          <div className="form-section-title">Patient Identity Details</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="phone-input">Patient Phone Number *</label>
              <input
                id="phone-input"
                className="form-input"
                type="tel"
                placeholder="Patient contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
              <span className="form-hint">Used for SMS/OTP notifications.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="abha-input">ABHA ID (Ayushman Bharat Health Account) *</label>
              <input
                id="abha-input"
                className="form-input"
                type="text"
                placeholder="14-digit ABHA Number"
                value={abhaId}
                onChange={(e) => setAbhaId(e.target.value)}
                required
                disabled={loading}
              />
              <span className="form-hint">Mandatory unique healthcare identity link.</span>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="name-input">Patient Full Name *</label>
              <input
                id="name-input"
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

          <div className="form-section-title">Locality & Demographics</div>

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
                placeholder="Block"
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
              <label className="form-label" htmlFor="household-input">Household Members</label>
              <input
                id="household-input"
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

          <div className="form-section-title">Standard Privacy Consent</div>
          <p className="consent-help-text">Assisted registry presets standard data permissions. Toggles can be updated anytime by the patient.</p>

          <div className="consent-toggles-box flex-col">
            <ConsentToggle
              label="Primary Guardian Access"
              description="Allow yourself (designate guardian) to view profile status details."
              checked={consentToggles.guardian1_view_profile}
              onChange={handleToggleChange('guardian1_view_profile')}
              disabled={loading}
            />

            <ConsentToggle
              label="Consultation Summary Sharing"
              description="Allow yourself to view session diagnostic consultation summaries."
              checked={consentToggles.guardian1_view_consultations}
              onChange={handleToggleChange('guardian1_view_consultations')}
              disabled={loading}
            />

            <ConsentToggle
              label="AI Consultation Diagnostics"
              description="Allow doctor dashboard to run speech processing and summarizing on consult sessions."
              checked={consentToggles.doctor_use_ai}
              onChange={handleToggleChange('doctor_use_ai')}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg register-btn" disabled={loading}>
            {loading ? 'Creating Patient Profile...' : 'Complete Patient Registry'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .guardian-register-patient-page {
          gap: var(--space-xl);
        }

        .register-container-box {
          padding: var(--space-2xl);
          gap: var(--space-xl);
        }

        .attribution-notice {
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          align-items: start;
          gap: var(--space-md);
        }

        .notice-icon {
          font-size: 1.5rem;
        }

        .notice-text {
          gap: 2px;
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }

        .notice-text strong {
          color: var(--color-guardian-light);
          font-size: var(--font-sm);
        }

        .form-section-title {
          font-size: var(--font-lg);
          font-weight: 600;
          color: var(--color-guardian-light);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: var(--space-sm);
          margin-top: var(--space-md);
        }

        .consent-help-text {
          font-size: var(--font-xs);
          color: var(--text-muted);
          margin-top: -10px;
        }

        .register-form {
          gap: var(--space-lg);
        }

        .register-btn {
          background: var(--gradient-guardian);
          color: #0F172A !important;
          margin-top: var(--space-md);
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
