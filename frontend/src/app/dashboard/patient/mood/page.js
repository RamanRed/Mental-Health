'use client';

import React, { useState, useEffect } from 'react';
import { createMoodEntry, getMoodEntries, getStreak } from '@/lib/api';
import { MOOD_EMOJIS } from '@/lib/constants';
import TraitSlider from '@/components/TraitSlider';

export default function MoodJournal() {
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [moodScore, setMoodScore] = useState(5);
  const [note, setNote] = useState('');
  
  // Trait Sliders
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [appetite, setAppetite] = useState(5);
  const [social, setSocial] = useState(5);
  const [activity, setActivity] = useState(5);
  const [stress, setStress] = useState(5);

  const [moods, setMoods] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const data = await getMoodEntries(7);
      setMoods(data);
      const streakData = await getStreak();
      setStreak(streakData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    const payload = {
      mood_emoji: selectedEmoji,
      mood_score: moodScore,
      text_note: note,
      traits: {
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        appetite,
        social,
        activity,
        stress,
      },
    };

    try {
      await createMoodEntry(payload);
      setMessage('Mood entry saved successfully!');
      setNote('');
      // Reload entries and streak
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit mood journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mood-journal-page grid-2">
      {/* Left side: Log form */}
      <div className="log-mood-section glass-card-static flex-col">
        <div className="section-header">
          <h2>Daily Mood Check-in</h2>
          <p className="welcome-subtitle">How are you feeling right now? Documenting your emotions helps monitor health trends.</p>
        </div>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="mood-form flex-col">
          {/* Emojis row */}
          <div className="form-group flex-col">
            <span className="form-label">Choose Emoji</span>
            <div className="emojis-row flex-row">
              {MOOD_EMOJIS.map((m) => (
                <button
                  key={m.emoji}
                  type="button"
                  onClick={() => {
                    setSelectedEmoji(m.emoji);
                    setMoodScore(m.value * 2 || 1); // Auto-scale mood score
                  }}
                  className={`emoji-btn ${selectedEmoji === m.emoji ? 'active' : ''}`}
                  style={{ '--btn-glow-color': m.color }}
                >
                  <span className="emoji-face">{m.emoji}</span>
                  <span className="emoji-lbl">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <TraitSlider
              label="Overall Mood Score"
              value={moodScore}
              onChange={setMoodScore}
              min={1}
              max={10}
              minLabel="Extremely Low"
              maxLabel="Excellent"
              color="#14B8A6"
            />
          </div>

          {/* Trait Sliders Section */}
          <div className="form-section-title">Log Sleep & Daily Habits</div>
          <div className="traits-grid">
            <TraitSlider
              label="Sleep Hours"
              value={sleepHours}
              onChange={setSleepHours}
              min={0}
              max={12}
              minLabel="0 Hrs"
              maxLabel="12 Hrs"
              color="#3B82F6"
            />
            <TraitSlider
              label="Sleep Quality"
              value={sleepQuality}
              onChange={setSleepQuality}
              min={1}
              max={10}
              color="#3B82F6"
            />
            <TraitSlider
              label="Appetite Level"
              value={appetite}
              onChange={setAppetite}
              min={1}
              max={10}
              minLabel="Poor"
              maxLabel="Great"
              color="#F59E0B"
            />
            <TraitSlider
              label="Social Interaction"
              value={social}
              onChange={setSocial}
              min={1}
              max={10}
              minLabel="Isolated"
              maxLabel="Highly Social"
              color="#EC4899"
            />
            <TraitSlider
              label="Physical Activity"
              value={activity}
              onChange={setActivity}
              min={1}
              max={10}
              minLabel="Sedentary"
              maxLabel="Highly Active"
              color="#10B981"
            />
            <TraitSlider
              label="Stress Level"
              value={stress}
              onChange={setStress}
              min={1}
              max={10}
              minLabel="Relaxed"
              maxLabel="Very Stressed"
              color="#EF4444"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note-textarea">Personal Observations / Notes</label>
            <textarea
              id="note-textarea"
              className="form-textarea"
              placeholder="Write down any thoughts, feelings, or details about your day..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting}>
            {submitting ? 'Saving entry...' : 'Save Check-in Entry ➔'}
          </button>
        </form>
      </div>

      {/* Right side: History timeline */}
      <div className="mood-history-section flex-col">
        <div className="streak-overview-card glass-card flex-between">
          <div className="flex-col">
            <span className="stat-label">Daily Logging Streak</span>
            <h3 className="streak-val">{streak.current_streak} Days Active</h3>
            <p className="milestone-sub">Milestones: 7🌟, 30⭐, 90🏆</p>
          </div>
          <span className="streak-flame">🔥</span>
        </div>

        <div className="history-timeline-card glass-card-static flex-col">
          <h3>Recent Log History</h3>
          
          {loading ? (
            <div className="timeline-loading flex-center"><div className="spinner animate-spin"></div></div>
          ) : moods.length === 0 ? (
            <div className="no-history flex-col flex-center">
              <span className="no-history-icon">📝</span>
              <p>No mood logs entries recorded yet. Begin logging your mood today!</p>
            </div>
          ) : (
            <div className="timeline-list flex-col">
              {moods.map((m) => {
                const itemDate = new Date(m.created_at || new Date()).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div key={m.id} className="timeline-item flex-row">
                    <div className="timeline-emoji-circle flex-center">{m.mood_emoji}</div>
                    <div className="timeline-info flex-col">
                      <div className="flex-between">
                        <span className="timeline-date">{itemDate}</span>
                        <span className="timeline-score" style={{ color: '#14B8A6' }}>Mood: {m.mood_score}/10</span>
                      </div>
                      {m.text_note && <p className="timeline-note">"{m.text_note}"</p>}
                      <div className="timeline-traits flex-row">
                        {m.traits && (
                          <>
                            <span className="trait-pill">💤 {m.traits.sleep_hours}h</span>
                            <span className="trait-pill">🍽️ {m.traits.appetite}/10</span>
                            <span className="trait-pill">⚡ {m.traits.stress}/10 stress</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .mood-journal-page {
          gap: var(--space-xl);
          align-items: start;
        }

        .log-mood-section {
          gap: var(--space-xl);
        }

        .mood-form {
          gap: var(--space-lg);
        }

        .emojis-row {
          gap: var(--space-sm);
          flex-wrap: wrap;
        }

        .emoji-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          padding: var(--space-sm) var(--space-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          flex: 1;
          min-width: 70px;
          transition: all var(--transition-fast);
        }

        .emoji-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        .emoji-btn.active {
          background: var(--color-patient-bg);
          border-color: var(--btn-glow-color);
          box-shadow: 0 0 15px rgba(20, 184, 166, 0.15);
        }

        .emoji-face {
          font-size: 1.75rem;
        }

        .emoji-lbl {
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }

        .emoji-btn.active .emoji-lbl {
          color: var(--text-primary);
          font-weight: 600;
        }

        .form-section-title {
          font-size: var(--font-base);
          font-weight: 600;
          color: var(--color-patient-light);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: var(--space-sm);
        }

        .traits-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          column-gap: var(--space-xl);
          row-gap: var(--space-md);
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

        .mood-history-section {
          gap: var(--space-xl);
        }

        .streak-overview-card {
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .streak-val {
          font-size: var(--font-2xl);
          font-weight: 700;
          color: var(--text-primary);
        }

        .milestone-sub {
          font-size: var(--font-xs);
          color: var(--text-muted);
          margin-top: 4px;
        }

        .streak-flame {
          font-size: 3rem;
        }

        .history-timeline-card h3 {
          font-size: var(--font-lg);
          font-weight: 600;
          margin-bottom: var(--space-lg);
        }

        .timeline-loading {
          min-height: 200px;
        }

        .no-history {
          padding: var(--space-2xl);
          gap: var(--space-md);
          text-align: center;
          color: var(--text-secondary);
        }

        .no-history-icon {
          font-size: 2.5rem;
          opacity: 0.2;
        }

        .timeline-list {
          gap: var(--space-lg);
          position: relative;
        }

        .timeline-list::before {
          content: '';
          position: absolute;
          top: 8px;
          bottom: 8px;
          left: 20px;
          width: 2px;
          background: rgba(255, 255, 255, 0.05);
        }

        .timeline-item {
          gap: var(--space-md);
          align-items: start;
        }

        .timeline-emoji-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 1.5rem;
          position: relative;
          z-index: 2;
          flex-shrink: 0;
        }

        .timeline-info {
          flex: 1;
          gap: var(--space-xs);
          background: rgba(255, 255, 255, 0.01);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .timeline-date {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }

        .timeline-score {
          font-size: var(--font-xs);
          font-weight: 700;
        }

        .timeline-note {
          font-size: var(--font-sm);
          color: var(--text-secondary);
          font-style: italic;
        }

        .timeline-traits {
          gap: var(--space-sm);
          margin-top: 4px;
        }

        .trait-pill {
          font-size: var(--font-xs);
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
}
