/**
 * shared/constants/index.ts
 * MindBridge AI — Shared Constants
 * All domain constants used across the platform
 */

import type { UserRole, RiskLevel, Language, RiskFlag, AssessmentType } from '../types';

// ─── User Roles ───────────────────────────────────────────────────────────────

export const ROLES: Record<string, UserRole> = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ASHA: 'asha_worker',
  ADMIN: 'admin',
} as const;

// ─── Risk Levels ──────────────────────────────────────────────────────────────

export const RISK_LEVELS: Record<
  RiskLevel,
  { color: string; minScore: number; maxScore: number; label: string }
> = {
  green: {
    color: '#22C55E',
    minScore: 0,
    maxScore: 30,
    label: 'Stable',
  },
  yellow: {
    color: '#EAB308',
    minScore: 31,
    maxScore: 55,
    label: 'Mild Concern',
  },
  orange: {
    color: '#F97316',
    minScore: 56,
    maxScore: 75,
    label: 'Moderate Risk',
  },
  red: {
    color: '#EF4444',
    minScore: 76,
    maxScore: 100,
    label: 'High Risk / Crisis',
  },
} as const;

/**
 * Determine risk level from a numeric score
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score <= 30) return 'green';
  if (score <= 55) return 'yellow';
  if (score <= 75) return 'orange';
  return 'red';
}

// ─── Languages ────────────────────────────────────────────────────────────────

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  whatsapp: boolean;
  voice: boolean;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    whatsapp: true,
    voice: true,
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    whatsapp: true,
    voice: true,
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    whatsapp: true,
    voice: true,
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    whatsapp: true,
    voice: true,
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    whatsapp: true,
    voice: true,
  },
] as const;

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

// ─── Risk Flags ───────────────────────────────────────────────────────────────

export const RISK_FLAGS: Record<RiskFlag, RiskFlag> = {
  SUICIDAL_IDEATION: 'SUICIDAL_IDEATION',
  SELF_HARM: 'SELF_HARM',
  SEVERE_DEPRESSION: 'SEVERE_DEPRESSION',
  SEVERE_ANXIETY: 'SEVERE_ANXIETY',
  SOCIAL_ISOLATION: 'SOCIAL_ISOLATION',
  SUBSTANCE_ABUSE: 'SUBSTANCE_ABUSE',
} as const;

// ─── Assessment Types ─────────────────────────────────────────────────────────

export const ASSESSMENT_TYPES: AssessmentType[] = [
  'PHQ9',
  'GAD7',
  'MDQ',
  'ASRS',
  'PCL5',
  'CSSRS',
  'AQ10',
];

/** Human-readable names and descriptions for assessment tools */
export const ASSESSMENT_INFO: Record<
  AssessmentType,
  { name: string; description: string; maxScore: number }
> = {
  PHQ9: {
    name: 'Patient Health Questionnaire-9',
    description: 'Depression screening tool',
    maxScore: 27,
  },
  GAD7: {
    name: 'Generalized Anxiety Disorder-7',
    description: 'Anxiety screening tool',
    maxScore: 21,
  },
  MDQ: {
    name: 'Mood Disorder Questionnaire',
    description: 'Bipolar disorder screening',
    maxScore: 13,
  },
  ASRS: {
    name: 'Adult ADHD Self-Report Scale',
    description: 'ADHD screening tool',
    maxScore: 24,
  },
  PCL5: {
    name: 'PTSD Checklist for DSM-5',
    description: 'PTSD symptom screening',
    maxScore: 80,
  },
  CSSRS: {
    name: 'Columbia Suicide Severity Rating Scale',
    description: 'Suicide risk assessment',
    maxScore: 25,
  },
  AQ10: {
    name: 'Autism Spectrum Quotient-10',
    description: 'Autism spectrum screening',
    maxScore: 10,
  },
};

// ─── Risk Score Weights ───────────────────────────────────────────────────────

/**
 * Weights for computing the composite risk score
 * Must sum to 1.0
 */
export const RISK_SCORE_WEIGHTS = {
  mood: 0.40,         // 40% weight from mood logs
  assessment: 0.35,   // 35% weight from clinical assessments
  ai_flags: 0.25,     // 25% weight from AI-detected flags
} as const;

/** Score contributions from each AI risk flag (0–25 points each) */
export const FLAG_SCORES: Record<RiskFlag, number> = {
  SUICIDAL_IDEATION: 25,   // Critical — forces RED level
  SELF_HARM: 20,
  SEVERE_DEPRESSION: 15,
  SEVERE_ANXIETY: 12,
  SOCIAL_ISOLATION: 8,
  SUBSTANCE_ABUSE: 8,
} as const;

// ─── Streak Milestones ────────────────────────────────────────────────────────

export const STREAK_BADGES: Record<number, string> = {
  1: 'first_step',
  7: 'one_week',
  14: 'two_weeks',
  30: 'one_month',
} as const;

export const STREAK_MILESTONES = [1, 7, 14, 30] as const;

// ─── Misc Constants ───────────────────────────────────────────────────────────

export const OTP_LENGTH = 6;
export const ANONYMOUS_ID_RETRY_LIMIT = 10;
export const MOOD_LOG_WINDOW_DAYS = 7;   // days of mood logs used for risk score
export const MAX_MOOD_SCORE = 10;
export const MIN_MOOD_SCORE = 1;
export const MAX_RISK_SCORE = 100;

/** Redis key prefixes */
export const REDIS_KEYS = {
  OTP: (phone: string) => `otp:${phone}`,
  REFRESH_TOKEN: (userId: string) => `refresh:${userId}`,
  STREAK: (userId: string) => `streak:${userId}`,
  RATE_LIMIT: (ip: string) => `rl:${ip}`,
} as const;
