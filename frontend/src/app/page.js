'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_BASE_TYPE } from '@/lib/constants';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        const roleBase = ROLE_BASE_TYPE(user.role);
        router.push(`/dashboard/${roleBase}`);
      } else {
        router.push('/login');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  return (
    <div className="splash-screen flex-col flex-center">
      <div className="loader-container flex-col flex-center">
        <span className="logo-emoji animate-float">🧠💚</span>
        <h1 className="logo-title animate-pulse">MANAS</h1>
        <p className="logo-tagline">Access, Nurture & Assistance System</p>
        <div className="spinner animate-spin"></div>
      </div>

      <style jsx>{`
        .splash-screen {
          min-height: 100vh;
          width: 100vw;
          background: var(--bg-primary);
          color: white;
          overflow: hidden;
        }

        .loader-container {
          gap: var(--space-md);
          text-align: center;
        }

        .logo-emoji {
          font-size: var(--font-5xl);
        }

        .logo-title {
          font-size: var(--font-3xl);
          font-weight: 800;
          letter-spacing: 0.1em;
          background: linear-gradient(135deg, #14B8A6, #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-tagline {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .spinner {
          margin-top: var(--space-lg);
        }
      `}</style>
    </div>
  );
}
