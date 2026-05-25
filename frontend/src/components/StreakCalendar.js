'use client';

import styles from './StreakCalendar.module.css';

export default function StreakCalendar({ entries = [], currentStreak = 0, days = 30 }) {
  // Generate last N days
  const today = new Date();
  const daysList = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    daysList.push({
      date: dateStr,
      dayOfMonth: date.getDate(),
      hasEntry: entries.some((e) => e.date === dateStr || (e.created_at && e.created_at.startsWith(dateStr))),
      isToday: i === 0,
    });
  }

  const milestones = [
    { days: 7, emoji: '🌟', label: '1 Week' },
    { days: 30, emoji: '⭐', label: '1 Month' },
    { days: 90, emoji: '🏆', label: '3 Months' },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.streakHeader}>
        <div className={styles.streakCount}>
          <span className={styles.fireEmoji}>🔥</span>
          <span className={styles.streakNumber}>{currentStreak}</span>
          <span className={styles.streakLabel}>day streak</span>
        </div>
        <div className={styles.milestones}>
          {milestones.map((m) => (
            <span
              key={m.days}
              className={`${styles.milestone} ${currentStreak >= m.days ? styles.milestoneAchieved : ''}`}
              title={m.label}
            >
              {m.emoji}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {daysList.map((day) => (
          <div
            key={day.date}
            className={`${styles.dayCircle} ${day.hasEntry ? styles.filled : ''} ${day.isToday ? styles.today : ''}`}
            title={`${day.date}${day.hasEntry ? ' ✓' : ''}`}
          >
            <span className={styles.dayNumber}>{day.dayOfMonth}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
