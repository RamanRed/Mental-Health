'use client';

import styles from './RoleSelector.module.css';
import { GUARDIAN_TYPES } from '@/lib/constants';

const ROLE_OPTIONS = [
  {
    value: 'patient',
    label: 'Patient',
    icon: '🧑‍⚕️',
    description: 'I am seeking mental health support',
    color: 'patient',
  },
  {
    value: 'guardian',
    label: 'Guardian',
    icon: '🛡️',
    description: 'I support or care for a patient',
    color: 'guardian',
  },
  {
    value: 'doctor',
    label: 'Doctor',
    icon: '⚕️',
    description: 'I am a healthcare professional',
    color: 'doctor',
  },
];

export default function RoleSelector({ selected, onSelect, guardianType, onGuardianTypeSelect }) {
  const isGuardianSelected = selected === 'guardian' || (selected && selected.startsWith('guardian_'));

  return (
    <div className={styles.wrapper}>
      <div className={styles.roleGrid}>
        {ROLE_OPTIONS.map((role) => {
          const isActive =
            role.value === selected ||
            (role.value === 'guardian' && isGuardianSelected);

          return (
            <button
              key={role.value}
              className={`${styles.roleCard} ${styles[role.color]} ${isActive ? styles.active : ''}`}
              onClick={() => onSelect(role.value)}
              type="button"
            >
              <div className={styles.checkMark}>{isActive ? '✓' : ''}</div>
              <span className={styles.icon}>{role.icon}</span>
              <h3 className={styles.label}>{role.label}</h3>
              <p className={styles.description}>{role.description}</p>
            </button>
          );
        })}
      </div>

      {isGuardianSelected && (
        <div className={styles.guardianSubTypes}>
          <p className={styles.subTypeLabel}>Select Guardian Type</p>
          <div className={styles.subTypeGrid}>
            {GUARDIAN_TYPES.map((type) => (
              <button
                key={type.value}
                className={`${styles.subTypeCard} ${guardianType === type.value ? styles.subTypeActive : ''}`}
                onClick={() => onGuardianTypeSelect(type.value)}
                type="button"
              >
                <span className={styles.subTypeIcon}>{type.icon}</span>
                <span className={styles.subTypeLabel2}>{type.label}</span>
                <span className={styles.subTypeDesc}>{type.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
