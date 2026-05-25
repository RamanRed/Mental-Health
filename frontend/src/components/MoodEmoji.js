'use client';

import styles from './MoodEmoji.module.css';
import { MOOD_EMOJIS } from '@/lib/constants';

export default function MoodEmoji({ selected, onSelect }) {
  return (
    <div className={styles.container}>
      {MOOD_EMOJIS.map((mood) => (
        <button
          key={mood.value}
          className={`${styles.emojiBtn} ${selected === mood.value ? styles.selected : ''}`}
          onClick={() => onSelect(mood.value)}
          type="button"
          style={{
            '--mood-color': mood.color,
          }}
          title={mood.label}
        >
          <span className={styles.emoji}>{mood.emoji}</span>
          <span className={styles.label}>{mood.label}</span>
        </button>
      ))}
    </div>
  );
}
