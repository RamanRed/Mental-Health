'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { checkUser, requestOTP, verifyOTP } from '@/lib/api';
import RoleSelector from '@/components/RoleSelector';
import OTPInput from '@/components/OTPInput';

export default function Login() {
  const router = useRouter();
  const { login: saveLoginSession } = useAuth();

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('patient'); // patient, guardian, doctor
  const [guardianType, setGuardianType] = useState('guardian_family'); // guardian_family, guardian_asha, etc.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const getExactRoleString = () => {
    if (role === 'guardian') {
      return guardianType;
    }
    return role;
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');

    // Phone validation
    const cleanPhone = phone.trim();
    if (!/^\+?[1-9]\d{9,14}$/.test(cleanPhone)) {
      setError('Please enter a valid phone number (e.g. +919876543210)');
      return;
    }

    setLoading(true);
    const exactRole = getExactRoleString();

    try {
      // 1. Check if user exists
      const userStatus = await checkUser(cleanPhone, exactRole);

      if (userStatus.exists) {
        // 2. Request OTP
        await requestOTP(cleanPhone);
        setOtpSent(true);
        setShowOtp(true);
      } else {
        // 3. User does not exist, redirect to registration
        if (role === 'patient') {
          router.push(`/register/patient?phone=${encodeURIComponent(cleanPhone)}`);
        } else if (role === 'doctor') {
          router.push(`/register/doctor?phone=${encodeURIComponent(cleanPhone)}`);
        } else {
          router.push(`/register/guardian?phone=${encodeURIComponent(cleanPhone)}&type=${guardianType.replace('guardian_', '')}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (otpValue) => {
    setError('');
    setLoading(true);
    const cleanPhone = phone.trim();
    const exactRole = getExactRoleString();

    try {
      const response = await verifyOTP(cleanPhone, otpValue, exactRole);
      // Save token and session details
      saveLoginSession(response.access_token, {
        id: response.user_id,
        phone: cleanPhone,
        role: response.role,
        verification_status: response.verification_status,
      });

      // Redirect to correct dashboard
      const roleBase = exactRole.startsWith('guardian') ? 'guardian' : exactRole;
      router.push(`/dashboard/${roleBase}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page flex-center">
      <div className="login-card glass-card-static flex-col animate-fade-in-up">
        <div className="login-header flex-col flex-center">
          <span className="logo-emoji animate-float">🧠💚</span>
          <h1 className="logo-title">MANAS</h1>
          <p className="logo-subtitle">Access, Nurture & Assistance System</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {!showOtp ? (
          <form onSubmit={handleContinue} className="login-form flex-col">
            <div className="form-group">
              <label className="form-label" htmlFor="phone-input">Phone Number</label>
              <input
                id="phone-input"
                className="form-input"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select Your Role</label>
              <RoleSelector
                selected={role}
                onSelect={(val) => setRole(val)}
                guardianType={guardianType}
                onGuardianTypeSelect={(val) => setGuardianType(val)}
              />
            </div>

            <button type="submit" className={`btn btn-primary btn-full ${role}-btn`} disabled={loading}>
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="otp-verification-flow flex-col flex-center">
            <h3>Enter OTP Code</h3>
            <p className="otp-sent-text">An OTP has been simulated for {phone}. Use code <strong>123456</strong>.</p>
            
            <div className="otp-input-wrapper">
              <OTPInput onComplete={handleOtpSubmit} disabled={loading} />
            </div>

            {loading && <div className="spinner animate-spin"></div>}

            <button
              onClick={() => {
                setShowOtp(false);
                setError('');
              }}
              className="btn btn-secondary btn-full"
              disabled={loading}
            >
              Go Back
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          width: 100vw;
          background: var(--gradient-bg);
          padding: var(--space-xl) var(--space-md);
        }

        .login-card {
          width: 100%;
          max-width: 520px;
          padding: var(--space-2xl);
          gap: var(--space-xl);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-xl);
        }

        .login-header {
          gap: var(--space-xs);
          text-align: center;
        }

        .logo-emoji {
          font-size: 3rem;
        }

        .logo-title {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          background: linear-gradient(135deg, #14B8A6, #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-subtitle {
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

        .login-form {
          gap: var(--space-lg);
        }

        .otp-verification-flow {
          gap: var(--space-lg);
          text-align: center;
        }

        .otp-verification-flow h3 {
          font-size: var(--font-xl);
          color: var(--text-primary);
        }

        .otp-sent-text {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .otp-input-wrapper {
          margin: var(--space-md) 0;
        }

        .patient-btn {
          background: var(--gradient-patient);
        }

        .doctor-btn {
          background: var(--gradient-doctor);
        }

        .guardian-btn {
          background: var(--gradient-guardian);
          color: #0F172A !important;
        }
      `}</style>
    </div>
  );
}
