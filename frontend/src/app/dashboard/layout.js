'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import VideoCallModal from '@/components/VideoCallModal';
import { getIncomingCalls } from '@/lib/api';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  // Global video call state
  const [activeCall, setActiveCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Global poll for incoming calls — works on ALL dashboard sub-pages
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const pollCalls = async () => {
      try {
        const incoming = await getIncomingCalls();
        if (incoming && incoming.length > 0) {
          if (!activeCall) {
            setActiveCall(incoming[0]);
            setShowCallModal(true);
          }
        }
      } catch (err) {
        // Silently ignore — user may not have call permissions (e.g. guardian)
      }
    };

    pollCalls();
    const interval = setInterval(pollCalls, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loading, activeCall]);

  if (loading) {
    return (
      <div className="dashboard-loading flex-col flex-center">
        <div className="spinner animate-spin spinner-lg"></div>
        <p className="loading-txt animate-pulse">Loading Dashboard...</p>
        <style jsx>{`
          .dashboard-loading {
            min-height: 100vh;
            background: var(--bg-primary);
            color: var(--text-secondary);
            gap: var(--space-md);
          }
          .loading-txt {
            font-size: var(--font-sm);
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard-layout-root">
      <Navbar />
      <div className="page-layout">
        <Sidebar />
        <main className="page-content">{children}</main>
      </div>

      {/* Global Video Call Modal — rings on any dashboard sub-page */}
      {showCallModal && activeCall && user && (
        <VideoCallModal
          call={activeCall}
          currentUser={user}
          onClose={() => {
            setShowCallModal(false);
            setActiveCall(null);
          }}
          onCallEnded={() => {
            setShowCallModal(false);
            setActiveCall(null);
          }}
        />
      )}

      <style jsx>{`
        .dashboard-layout-root {
          min-height: 100vh;
          background: var(--bg-primary);
          position: relative;
        }
      `}</style>
    </div>
  );
}
