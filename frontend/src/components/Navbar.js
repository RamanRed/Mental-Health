'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '@/lib/api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [trayOpen, setTrayOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getUserNotifications();
      setNotifications(data);
      const countData = await getUnreadNotificationsCount();
      setUnreadCount(countData.unread_count);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      // Poll notifications count every 30 seconds
      const interval = setInterval(async () => {
        try {
          const countData = await getUnreadNotificationsCount();
          setUnreadCount(countData.unread_count);
        } catch (err) {
          // ignore error silently
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const handleToggleTray = () => {
    setTrayOpen(!trayOpen);
    if (!trayOpen) {
      fetchNotifications();
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated || !user) return null;

  const roleColor = ROLE_COLORS[user.role] || { primary: '#64748B', light: '#94A3B8', bg: 'rgba(100,116,139,0.1)' };

  return (
    <nav className="fixed-nav flex-between">
      <div className="nav-logo">
        <Link href="/" className="flex-row">
          <span className="logo-emoji">🧠💚</span>
          <span className="logo-text">MANAS</span>
        </Link>
      </div>

      <div className="nav-actions flex-row">
        <div className="user-badge" style={{ backgroundColor: roleColor.bg, color: roleColor.light, border: `1px solid rgba(255,255,255,0.06)` }}>
          <span className="badge-dot" style={{ backgroundColor: roleColor.light }}></span>
          {ROLE_LABELS[user.role] || 'User'}
        </div>

        <div className="user-profile flex-row">
          <span className="user-name">{user.phone}</span>
        </div>

        {/* Notification Bell & Dropdown Tray */}
        <div className="notification-tray-container">
          <button onClick={handleToggleTray} className="bell-button" title="Notifications">
            🔔
            {unreadCount > 0 && <span className="unread-badge animate-pulse">{unreadCount}</span>}
          </button>

          {trayOpen && (
            <div className="notifications-dropdown glass-card animate-fade-in flex-col">
              <div className="dropdown-header flex-between">
                <h4>System Alerts</h4>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="btn-text-action">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notifications-list-wrapper flex-col">
                {notifications.length === 0 ? (
                  <div className="no-notifications flex-col flex-center">
                    <span className="no-n-icon">🔕</span>
                    <p>No notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`notification-item flex-col ${!n.is_read ? 'unread' : ''}`}
                    >
                      <div className="n-header flex-between">
                        <strong className="n-title">{n.title}</strong>
                        {!n.is_read && <span className="n-dot"></span>}
                      </div>
                      <p className="n-content">{n.content}</p>
                      <span className="n-time">
                        {new Date(n.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) + ' - ' + new Date(n.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Link href="/settings" className="nav-settings-icon" title="Settings">
          ⚙️
        </Link>

        <button onClick={logout} className="logout-btn">
          Logout 🚪
        </button>
      </div>

      <style jsx>{`
        .fixed-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--navbar-height);
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0 var(--space-xl);
          z-index: 1000;
        }

        .logo-emoji {
          font-size: 1.5rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          background: linear-gradient(135deg, #14B8A6, #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-actions {
          gap: var(--space-lg);
        }

        .user-badge {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: var(--font-xs);
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .user-name {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .nav-settings-icon {
          font-size: 1.2rem;
          transition: transform var(--transition-fast);
        }

        .nav-settings-icon:hover {
          transform: rotate(30deg);
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 6px 14px;
          border-radius: var(--radius-md);
          font-size: var(--font-xs);
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .logout-btn:hover {
          background: #EF4444;
          color: white;
          transform: translateY(-1px);
        }

        .notification-tray-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .bell-button {
          position: relative;
          background: transparent;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }

        .bell-button:hover {
          transform: scale(1.1);
        }

        .unread-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #EF4444;
          color: white;
          font-size: 9px;
          font-weight: 700;
          height: 16px;
          min-width: 16px;
          border-radius: 8px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #0F172A;
        }

        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: -10px;
          width: 320px;
          max-height: 400px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          z-index: 1010;
        }

        .dropdown-header {
          padding: var(--space-md);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.01);
        }

        .dropdown-header h4 {
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--text-primary);
        }

        .btn-text-action {
          background: transparent;
          border: none;
          color: var(--color-patient-light);
          font-size: var(--font-xs);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-text-action:hover {
          text-decoration: underline;
        }

        .notifications-list-wrapper {
          overflow-y: auto;
          max-height: 340px;
        }

        .no-notifications {
          padding: var(--space-xl);
          text-align: center;
          color: var(--text-muted);
          gap: var(--space-xs);
        }

        .no-n-icon {
          font-size: 2rem;
          opacity: 0.2;
        }

        .no-notifications p {
          font-size: var(--font-xs);
        }

        .notification-item {
          padding: var(--space-md);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
          transition: background var(--transition-fast);
          gap: 4px;
        }

        .notification-item:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .notification-item.unread {
          background: rgba(59, 130, 246, 0.03);
        }

        .notification-item.unread:hover {
          background: rgba(59, 130, 246, 0.06);
        }

        .n-header {
          align-items: flex-start;
          gap: var(--space-md);
        }

        .n-title {
          font-size: var(--font-xs);
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .n-dot {
          width: 6px;
          height: 6px;
          background: #3B82F6;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .n-content {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .n-time {
          font-size: 9px;
          color: var(--text-muted);
          margin-top: 2px;
        }
      `}</style>
    </nav>
  );
}
