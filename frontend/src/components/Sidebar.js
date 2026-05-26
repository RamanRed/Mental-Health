'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_BASE_TYPE, ROLE_COLORS } from '@/lib/constants';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  const roleBase = ROLE_BASE_TYPE(user.role);
  const roleColor = ROLE_COLORS[user.role] || { primary: '#6366F1' };

  // Define navigation items based on user role base type
  const getNavItems = () => {
    switch (roleBase) {
      case 'patient':
        return [
          { label: 'Dashboard', path: '/dashboard/patient', icon: '📊' },
          { label: 'Mood Journal', path: '/dashboard/patient/mood', icon: '📝' },
          { label: 'Questionnaire', path: '/dashboard/patient/questionnaire', icon: '📋' },
          { label: 'Consultations', path: '/dashboard/patient/consultations', icon: '🤝' },
          { label: 'Saathi Chat', path: '/dashboard/patient/chat', icon: '🤖' },
          { label: 'Settings', path: '/settings', icon: '⚙️' },
        ];
      case 'guardian':
        return [
          { label: 'Dashboard', path: '/dashboard/guardian', icon: '📊' },
          { label: 'Register Patient', path: '/dashboard/guardian/register-patient', icon: '➕' },
          { label: 'Settings', path: '/settings', icon: '⚙️' },
        ];
      case 'doctor':
        return [
          { label: 'Dashboard', path: '/dashboard/doctor', icon: '📊' },
          { label: 'Settings', path: '/settings', icon: '⚙️' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="sidebar">
      <ul className="nav-list flex-col">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <li key={item.path} className="nav-item">
              <Link
                href={item.path}
                className={`nav-link flex-row ${isActive ? 'active' : ''}`}
                style={{
                  '--accent-color': roleColor.primary,
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: var(--navbar-height);
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          padding: var(--space-lg) var(--space-md);
          z-index: 900;
        }

        .nav-list {
          gap: var(--space-sm);
        }

        .nav-link {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          font-weight: 500;
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(4px);
        }

        .nav-link.active {
          color: white;
          background: var(--accent-color);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .nav-icon {
          font-size: 1.25rem;
        }

        .nav-label {
          font-size: var(--font-sm);
        }

        @media (max-width: 768px) {
          .sidebar {
            width: var(--sidebar-collapsed);
          }
          .nav-label {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
