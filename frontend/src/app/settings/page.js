'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getPatientProfile, getGuardianProfile, getDoctorProfile, updatePatientProfile, updatePatientConsent, linkGuardian } from '@/lib/api';
import ConsentToggle from '@/components/ConsentToggle';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  // Patient details state
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  
  // Consent toggles state
  const [consentToggles, setConsentToggles] = useState({
    guardian1_view_profile: true,
    guardian1_view_consultations: true,
    guardian2_view_basic: true,
    doctor_use_ai: true,
    research_opt_in: false,
  });

  // Link Guardian state
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianSlot, setGuardianSlot] = useState('guardian1');
  const [linking, setLinking] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = async () => {
    if (!user) return;
    try {
      if (user.role === 'patient') {
        const p = await getPatientProfile();
        setProfile(p);
        setFullName(p.full_name);
        setAge(p.age);
        setGender(p.gender);
        if (p.consent_toggles) {
          setConsentToggles(p.consent_toggles);
        }
      } else if (user.role.startsWith('guardian')) {
        const g = await getGuardianProfile();
        setProfile(g);
      } else if (user.role === 'doctor') {
        const d = await getDoctorProfile();
        setProfile(d);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load profile settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleUpdatePatientProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updatePatientProfile({
        full_name: fullName,
        age: parseInt(age) || 0,
        gender,
      });
      setMessage('Profile details updated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConsent = async (key, val) => {
    const updatedToggles = { ...consentToggles, [key]: val };
    setConsentToggles(updatedToggles);
    setMessage('');
    setError('');

    try {
      await updatePatientConsent({ consent_toggles: updatedToggles });
      setMessage('Consent privacy preferences updated!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update consent settings.');
    }
  };

  const handleLinkGuardian = async (e) => {
    e.preventDefault();
    setLinking(true);
    setMessage('');
    setError('');

    try {
      await linkGuardian(guardianPhone, guardianSlot);
      setMessage(`Guardian linked successfully to ${guardianSlot === 'guardian1' ? 'Primary' : 'Secondary'} slot!`);
      setGuardianPhone('');
      // Reload profile
      await loadProfile();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to link guardian. Check if guardian phone is registered.');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading flex-center">
        <div className="spinner animate-spin"></div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="settings-error glass-card-static flex-col flex-center">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="settings-page flex-col">
      <div className="section-header">
        <h2>Account Settings</h2>
        <p className="welcome-subtitle">Manage your profile details, health worker linkages, and privacy consent rules.</p>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="settings-grid">
        {/* Profile Information Panel */}
        <div className="settings-main-card glass-card-static flex-col">
          <h3>Profile Credentials</h3>
          <p className="subtitle">Core registration info linked to your phone number.</p>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" type="text" value={user?.phone} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Active Role</label>
            <input className="form-input" type="text" value={user?.role?.replace('_', ' ').toUpperCase()} disabled />
          </div>

          {user?.role === 'patient' && (
            <form onSubmit={handleUpdatePatientProfile} className="patient-edit-form flex-col">
              <div className="form-group">
                <label className="form-label" htmlFor="name-input">Full Name</label>
                <input
                  id="name-input"
                  className="form-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="age-input">Age</label>
                  <input
                    id="age-input"
                    className="form-input"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gender-select">Gender</label>
                  <select
                    id="gender-select"
                    className="form-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={saving}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving changes...' : 'Save Profile Changes ➔'}
              </button>
            </form>
          )}

          {user?.role?.startsWith('guardian') && profile && (
            <div className="guardian-metadata-view flex-col">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" value={profile.full_name} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Association Identification</label>
                <input className="form-input" type="text" value={profile.association_id} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Region</label>
                <input className="form-input" type="text" value={`${profile.region_village}, ${profile.region_block}, ${profile.region_district}`} disabled />
              </div>
            </div>
          )}

          {user?.role === 'doctor' && profile && (
            <div className="doctor-metadata-view flex-col">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" value={`Dr. ${profile.full_name}`} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Medical Registration License</label>
                <input className="form-input" type="text" value={profile.registration_number} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Clinic Affiliation</label>
                <input className="form-input" type="text" value={profile.hospital_affiliation} disabled />
              </div>
            </div>
          )}

          <button onClick={logout} className="btn btn-danger logout-setting-btn">
            Log Out of Session 🚪
          </button>
        </div>

        {/* Patient Specific: Link Guardians & Privacy Consents */}
        {user?.role === 'patient' && (
          <div className="settings-sidebar-panel flex-col">
            {/* Link Guardian Card */}
            <div className="link-guardian-card glass-card-static flex-col">
              <h3>Link Care Guardian</h3>
              <p className="subtitle">Delegate healthcare assistance by linking care worker phone numbers.</p>

              <form onSubmit={handleLinkGuardian} className="link-form flex-col">
                <div className="form-group">
                  <label className="form-label" htmlFor="g-phone">Guardian Phone Number</label>
                  <input
                    id="g-phone"
                    className="form-input"
                    type="tel"
                    placeholder="Enter registered phone number"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    required
                    disabled={linking}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="g-slot">Assign Care Slot</label>
                  <select
                    id="g-slot"
                    className="form-select"
                    value={guardianSlot}
                    onChange={(e) => setGuardianSlot(e.target.value)}
                    disabled={linking}
                  >
                    <option value="guardian1">Primary Guardian (Family Member)</option>
                    <option value="guardian2">Secondary Guardian (ASHA/NGO/Anganwadi)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" disabled={linking}>
                  {linking ? 'Linking...' : 'Link Care Guardian ➔'}
                </button>
              </form>

              {profile && (
                <div className="currently-linked flex-col">
                  <h5>Active Guardian Links:</h5>
                  <div className="linked-item">
                    Primary: <strong>{profile.guardian1_id ? 'Linked ✅' : 'None Linked'}</strong>
                  </div>
                  <div className="linked-item">
                    Secondary: <strong>{profile.guardian2_id ? 'Linked ✅' : 'None Linked'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Consent Card */}
            <div className="privacy-consent-card glass-card-static flex-col">
              <h3>Privacy Consent Settings</h3>
              <p className="subtitle">Revoke or update third-party access settings.</p>

              <div className="consent-toggles-box flex-col">
                <ConsentToggle
                  label="Primary Guardian Access"
                  checked={consentToggles.guardian1_view_profile}
                  onChange={(val) => handleUpdateConsent('guardian1_view_profile', val)}
                />
                <ConsentToggle
                  label="Consultation Summary Sharing"
                  checked={consentToggles.guardian1_view_consultations}
                  onChange={(val) => handleUpdateConsent('guardian1_view_consultations', val)}
                />
                <ConsentToggle
                  label="Secondary Guardian Basic Access"
                  checked={consentToggles.guardian2_view_basic}
                  onChange={(val) => handleUpdateConsent('guardian2_view_basic', val)}
                />
                <ConsentToggle
                  label="AI Diagnostics Pipeline"
                  checked={consentToggles.doctor_use_ai}
                  onChange={(val) => handleUpdateConsent('doctor_use_ai', val)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .settings-page {
          gap: var(--space-xl);
        }

        .settings-loading {
          min-height: 400px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-xl);
          align-items: start;
        }

        .settings-main-card {
          padding: var(--space-xl);
          gap: var(--space-md);
        }

        .settings-main-card h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .subtitle {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          margin-top: -10px;
        }

        .patient-edit-form {
          gap: var(--space-md);
          margin-top: var(--space-xs);
        }

        .guardian-metadata-view,
        .doctor-metadata-view {
          gap: var(--space-md);
          margin-top: var(--space-xs);
        }

        .logout-setting-btn {
          margin-top: var(--space-md);
        }

        .settings-sidebar-panel {
          gap: var(--space-xl);
        }

        .link-guardian-card {
          padding: var(--space-xl);
          gap: var(--space-md);
        }

        .link-guardian-card h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .link-form {
          gap: var(--space-md);
        }

        .currently-linked {
          margin-top: var(--space-md);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: var(--space-md);
          gap: var(--space-xs);
        }

        .currently-linked h5 {
          font-size: var(--font-xs);
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .linked-item {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .privacy-consent-card {
          padding: var(--space-xl);
          gap: var(--space-md);
        }

        .privacy-consent-card h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .consent-toggles-box {
          gap: 0;
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
