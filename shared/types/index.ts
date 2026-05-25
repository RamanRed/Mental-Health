/**
 * shared/types/index.ts
 * MindBridge AI — Shared TypeScript Types & Interfaces
 * Used across backend, frontend, and AI chatbot
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

/** Platform roles in the MindBridge ecosystem */
export type UserRole = 'patient' | 'doctor' | 'asha_worker' | 'admin';

/** Mental health risk classification levels */
export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red';

/** Supported languages (Bharat-first) */
export type Language = 'en' | 'hi' | 'kn' | 'ta' | 'mr';

/** Platforms through which users can access MindBridge */
export type Platform = 'web' | 'whatsapp' | 'voice';

/** Clinical assessment tool types */
export type AssessmentType =
  | 'PHQ9'
  | 'GAD7'
  | 'MDQ'
  | 'ASRS'
  | 'PCL5'
  | 'CSSRS'
  | 'AQ10';

/** Risk flags that can be raised during AI analysis or clinical review */
export type RiskFlag =
  | 'SUICIDAL_IDEATION'
  | 'SELF_HARM'
  | 'SEVERE_DEPRESSION'
  | 'SEVERE_ANXIETY'
  | 'SOCIAL_ISOLATION'
  | 'SUBSTANCE_ABUSE';

/** Mood emoji descriptors */
export type MoodEmoji = 'awful' | 'sad' | 'neutral' | 'good' | 'great';

/** Gender options */
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/** Literacy level for ASHA worker patient registration */
export type LiteracyLevel = 'none' | 'basic' | 'functional' | 'literate';

/** Appointment modes */
export type AppointmentMode = 'video' | 'phone' | 'in_person';

/** Appointment status lifecycle */
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'done'
  | 'cancelled';

// ─── API Response Wrapper ─────────────────────────────────────────────────────

/**
 * Standard API response envelope for all MindBridge API endpoints
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  error?: Record<string, unknown>;
}

// ─── User Model ───────────────────────────────────────────────────────────────

/** Core user entity — represents any authenticated user in the system */
export interface IUser {
  id: string;                 // UUID, primary key
  phone: string;              // E.164 format, unique, indexed
  role: UserRole;
  language: Language;
  anonymous_id: string;       // adjective+Noun+2digit, unique
  abha_id?: string;           // Ayushman Bharat Health Account ID (optional)
  username?: string;          // Staff (doctor, ASHA) login with abha_id + username
  is_verified: boolean;
  otp_hash?: string;          // bcrypt hash of the OTP
  otp_expires_at?: Date;
  refresh_token?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Patient Profile ──────────────────────────────────────────────────────────

/** Extended profile for patient-role users */
export interface IPatientProfile {
  id: string;                 // UUID, primary key
  user_id: string;            // ref: User (UUID)
  age?: number;
  gender?: Gender;
  city?: string;
  state?: string;
  occupation?: string;
  sleep_hours_avg?: number;   // average sleep per night (hours)
  exercise_frequency?: string; // e.g. 'never', 'occasionally', 'regularly'
  substance_use?: boolean;
  chronic_conditions?: string[];
  current_medications?: string[];
  previous_therapy?: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  risk_score: number;         // 0–100 computed score
  risk_level: RiskLevel;
  onboarded_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Mood Log ─────────────────────────────────────────────────────────────────

/** Daily mood tracking entry */
export interface IMoodLog {
  id: string;                 // UUID, primary key
  user_id: string;            // ref: User (UUID)
  mood_score: number;         // 1–10
  mood_emoji: MoodEmoji;
  energy: number;             // 1–10
  anxiety_level: number;      // 1–10
  sleep_last_night: number;   // hours (1–12)
  note?: string;              // AES-256 encrypted, max 500 chars
  tags: string[];
  logged_at: Date;
  createdAt: Date;
}

// ─── Journal Entry ────────────────────────────────────────────────────────────

/** Encrypted private journal entry */
export interface IJournalEntry {
  id: string;                 // UUID, primary key
  user_id: string;            // ref: User (UUID)
  content: string;            // AES-256 encrypted
  sentiment_score: number;    // float -1.0 to 1.0 from AI analysis
  created_at: Date;
}

// ─── Chat Session ─────────────────────────────────────────────────────────────

/** A single message within a chat session */
export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sentiment?: number;         // float from BERT analysis
  tokens?: number;            // LLM token count
}

/** Full chat session with AI */
export interface IChatSession {
  id: string;                 // UUID, primary key
  user_id?: string;           // ref: User (nullable for anonymous)
  anonymous_id: string;       // always set for logging without PII
  language: Language;
  platform: Platform;
  messages: IChatMessage[];
  risk_flags: RiskFlag[];
  reveal_identity: boolean;   // Patient can opt-in to reveal real profile
  created_at: Date;
  updated_at: Date;
}

// ─── Assessment ───────────────────────────────────────────────────────────────

/** Single question response in an assessment */
export interface IAssessmentResponse {
  question_id: string;
  score: number;
}

/** Clinical assessment result (PHQ-9, GAD-7, etc.) */
export interface IAssessment {
  id: string;                 // UUID, primary key
  user_id: string;            // ref: User (UUID)
  type: AssessmentType;
  responses: IAssessmentResponse[];
  total_score: number;
  severity: string;           // e.g. 'Minimal', 'Mild', 'Moderate', 'Severe'
  administered_at: Date;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

/** Appointment between patient and doctor */
export interface IAppointment {
  id: string;                 // UUID, primary key
  patient_id: string;         // ref: User (UUID)
  doctor_id: string;          // ref: User (UUID)
  date: Date;
  time: string;               // HH:MM format
  mode: AppointmentMode;
  chief_complaint: string;    // max 500 chars
  status: AppointmentStatus;
  consent_share_history: boolean;
  reveal_identity: boolean;   // Anonymity toggle for doctor interaction
  notes_id?: string;          // ref: ClinicalNotes (UUID)
  created_at: Date;
}

// ─── Clinical Notes ───────────────────────────────────────────────────────────

/** Doctor's clinical notes for an appointment */
export interface IClinicalNotes {
  id: string;                 // UUID, primary key
  appointment_id: string;     // ref: Appointment (UUID)
  doctor_id: string;          // ref: User (UUID)
  patient_id: string;         // ref: User (UUID)
  chief_complaint: string;    // max 1000 chars, AES-256 encrypted
  mental_status_exam: string; // MSE findings, AES-256 encrypted
  diagnosis_provisional: string;  // AES-256 encrypted
  risk_assessment: RiskLevel;
  plan: string;                   // Treatment plan, AES-256 encrypted
  medication_prescribed?: string; // AES-256 encrypted
  followup_in_days?: number;
  emergency_escalation: boolean;
  share_with_guardian: boolean; // Default true: allows guardian to see log
  final_verdict?: string;       // AES-256/ECIES encrypted final verdict
  created_at: Date;
}

// ─── ASHA Patient ─────────────────────────────────────────────────────────────

/** Screening entry recorded by ASHA worker */
export interface IScreeningRecord {
  date: Date;
  tool_used: string;           // Assessment tool name
  score: number;
  flags: RiskFlag[];
  notes?: string;
}

/** Referral record to healthcare provider */
export interface IReferralRecord {
  date: Date;
  referred_to: string;         // Doctor name / facility
  reason: string;
  status: 'pending' | 'accepted' | 'completed';
}

/** Follow-up visit record */
export interface IFollowupRecord {
  scheduled_date: Date;
  completed: boolean;
  completed_date?: Date;
  notes?: string;
}

/** Patient registered by an ASHA worker in rural/semi-urban areas */
export interface IAshaPatient {
  id: string;                 // UUID, primary key
  asha_id: string;            // ref: User (ASHA worker, UUID)
  patient_user_id?: string;   // ref: User (if registered on platform, UUID)
  patient_name: string;       // AES-256 encrypted
  age: number;
  gender: Gender;
  village: string;
  district: string;
  state: string;
  literacy_level: LiteracyLevel;
  has_smartphone: boolean;
  screenings: IScreeningRecord[];
  referrals: IReferralRecord[];
  followups: IFollowupRecord[];
  registered_at: Date;
}

// ─── Streak & Gamification ────────────────────────────────────────────────────

/** Streak data stored in Redis */
export interface IStreakData {
  current: number;
  longest: number;
  last_logged_date: string;   // ISO date string YYYY-MM-DD
}

/** Badge earned by patient for streak milestones */
export interface IBadge {
  name: string;
  earned_at: Date;
}

/** Result returned by streak update */
export interface IStreakResult {
  current: number;
  longest: number;
  badges: string[];
}

// ─── Risk Score Result ────────────────────────────────────────────────────────

/** Result of the risk score computation */
export interface IRiskScoreResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
}
