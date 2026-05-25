'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { registerGuardian } from '@/lib/api';

function RegisterGuardianForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: saveLoginSession } = useAuth();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [guardianType, setGuardianType] = useState('family'); // family, asha, ngo, anganwadi
  const [associationId, setAssociationId] = useState('');
  const [organization, setOrganization] = useState('');
  const [regionVillage, setRegionVillage] = useState('');
  const [regionBlock, setRegionBlock] = useState('');
  const [regionDistrict, setRegionDistrict] = useState('');
  const [regionState, setRegionState] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = searchParams.get('phone');
    const t = searchParams.get('type');
    if (p) setPhone(p);
    if (t) setGuardianType(t);
  }, [searchParams]);

  // Determine label for Association ID depending on guardian type
  const getAssociationIdLabel = () => {
    switch (guardianType) {
      case 'asha':
        return 'ASHA Worker Registration ID *';
      case 'ngo':
        return 'NGO Volunteer Reference ID *';
      case 'anganwadi':
        return 'Anganwadi Worker ID *';
      default:
        return 'Relationship to Patient (e.g. Spouse, Father) *';
    }
  };

  const getAssociationIdPlaceholder = () => {
    switch (guardianType) {
      case 'asha':
        return 'Enter ASHA Card ID';
      case 'ngo':
        return 'Enter Volunteer Badge ID';
      case 'anganwadi':
        return 'Enter Anganwadi Center ID';
      default:
        return 'e.g. Parent, Sibling, Spouse';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!associationId.trim()) {
      setError('This identification field is required to register as a guardian.');
      return;
    }

    setLoading(true);

    const payload = {
      phone,
      full_name: fullName,
      guardian_type: guardianType,
      association_id: associationId.trim(),
      organization: organization || null,
      region_village: regionVillage,
      region_block: regionBlock,
      region_district: regionDistrict,
      region_state: regionState,
      contact_number: phone,
    };

    try {
      const response = await registerGuardian(payload);
      saveLoginSession(response.access_token, {
        id: response.user_id,
        phone,
        role: response.role,
        verification_status: 'verified',
      });
      router.push('/dashboard/guardian');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Guardian registration failed. Ensure your Association ID is unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container glass-card-static flex-col animate-fade-in-up">
        <div className="register-header flex-col flex-center">
          <span className="logo-emoji">🛡️</span>
          <h2>Guardian Profile Registration</h2>
          <p className="register-desc">Create your guardian profile to assist and coordinate care for patients</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form flex-col">
          <div className="form-section-title">Identity & Role</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number (Pre-filled)</label>
              <input className="form-input" type="tel" value={phone} disabled />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="type-select">Guardian Category</label>
              <select
                id="type-select"
                className="form-select"
                value={guardianType}
                onChange={(e) => setGuardianType(e.target.value)}
                disabled={loading}
              >
                <option value="family">Family Member</option>
                <option value="asha">ASHA Health Worker</option>
                <option value="ngo">NGO Volunteer</option>
                <option value="anganwadi">Anganwadi Worker</option>
              </select>
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
              <label className="form-label" htmlFor="assoc-input">{getAssociationIdLabel()}</label>
              <input
                id="assoc-input"
                className="form-input"
                type="text"
                placeholder={getAssociationIdPlaceholder()}
                value={associationId}
                onChange={(e) => setAssociationId(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {(guardianType === 'asha' || guardianType === 'ngo') && (
            <div className="form-group">
              <label className="form-label" htmlFor="org-input">Organization / Affiliate Clinic Name (Optional)</label>
              <input
                id="org-input"
                className="form-input"
                type="text"
                placeholder="e.g. National Health Mission, Red Cross NGO"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-section-title">Assigned Health Region / Locality</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="village-input">Village / Locality</label>
              <input
                id="village-input"
                className="form-input"
                type="text"
                placeholder="Region village name"
                value={regionVillage}
                onChange={(e) => setRegionVillage(e.target.value)}
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
                placeholder="Region block/taluk"
                value={regionBlock}
                onChange={(e) => setRegionBlock(e.target.value)}
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
                placeholder="Region district"
                value={regionDistrict}
                onChange={(e) => setRegionDistrict(e.target.value)}
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
                placeholder="Region state"
                value={regionState}
                onChange={(e) => setRegionState(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg register-btn" disabled={loading}>
            {loading ? 'Registering Guardian...' : 'Complete Guardian Registration'}
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
          color: var(--color-guardian-light);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: var(--space-sm);
          margin-top: var(--space-md);
        }

        .register-btn {
          background: var(--gradient-guardian);
          color: #0F172A !important;
          margin-top: var(--space-md);
        }
      `}</style>
    </div>
  );
}

export default function RegisterGuardian() {
  return (
    <Suspense fallback={
      <div className="register-page flex-center">
        <div className="spinner animate-spin spinner-lg"></div>
      </div>
    }>
      <RegisterGuardianForm />
    </Suspense>
  );
}
