// ============================================
// MANAS Constants & Configuration
// ============================================

export const API_BASE_URL = 'http://localhost:8000';

// User Roles
export const ROLES = {
  PATIENT: 'patient',
  GUARDIAN_FAMILY: 'guardian_family',
  GUARDIAN_ASHA: 'guardian_asha',
  GUARDIAN_NGO: 'guardian_ngo',
  GUARDIAN_ANGANWADI: 'guardian_anganwadi',
  DOCTOR: 'doctor',
};

export const ROLE_LABELS = {
  [ROLES.PATIENT]: 'Patient',
  [ROLES.GUARDIAN_FAMILY]: 'Family Guardian',
  [ROLES.GUARDIAN_ASHA]: 'ASHA Worker',
  [ROLES.GUARDIAN_NGO]: 'NGO Volunteer',
  [ROLES.GUARDIAN_ANGANWADI]: 'Anganwadi Worker',
  [ROLES.DOCTOR]: 'Doctor',
};

export const ROLE_COLORS = {
  [ROLES.PATIENT]: { primary: '#0D9488', light: '#14B8A6', bg: 'rgba(13,148,136,0.1)' },
  [ROLES.GUARDIAN_FAMILY]: { primary: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.1)' },
  [ROLES.GUARDIAN_ASHA]: { primary: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.1)' },
  [ROLES.GUARDIAN_NGO]: { primary: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.1)' },
  [ROLES.GUARDIAN_ANGANWADI]: { primary: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.1)' },
  [ROLES.DOCTOR]: { primary: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.1)' },
};

export const GUARDIAN_TYPES = [
  { value: 'guardian_family', label: 'Family Member', icon: '👨‍👩‍👧', desc: 'Parent, spouse, or relative' },
  { value: 'guardian_asha', label: 'ASHA Worker', icon: '🏥', desc: 'Accredited Social Health Activist' },
  { value: 'guardian_ngo', label: 'NGO Volunteer', icon: '🤝', desc: 'Non-Government Organization volunteer' },
  { value: 'guardian_anganwadi', label: 'Anganwadi Worker', icon: '🏫', desc: 'Government childcare center worker' },
];

export const ROLE_BASE_TYPE = (role) => {
  if (role === ROLES.PATIENT) return 'patient';
  if (role === ROLES.DOCTOR) return 'doctor';
  return 'guardian';
};

// Mood Emojis
export const MOOD_EMOJIS = [
  { emoji: '😊', label: 'Happy', value: 5, color: '#10B981' },
  { emoji: '🙂', label: 'Good', value: 4, color: '#34D399' },
  { emoji: '😐', label: 'Neutral', value: 3, color: '#FBBF24' },
  { emoji: '😢', label: 'Sad', value: 2, color: '#F97316' },
  { emoji: '😰', label: 'Anxious', value: 1, color: '#EF4444' },
  { emoji: '😡', label: 'Angry', value: 0, color: '#DC2626' },
];

// Questionnaire Domains (WHO-inspired)
export const QUESTIONNAIRE_DOMAINS = [
  {
    id: 'overall_wellbeing',
    title: 'Overall Wellbeing',
    icon: '🌟',
    description: 'General assessment of your quality of life and satisfaction',
    questions: [
      { id: 'q1_1', text: 'How would you rate your overall quality of life?', type: 'scale', options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Very Good'] },
      { id: 'q1_2', text: 'How satisfied are you with your health?', type: 'scale', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'] },
      { id: 'q1_3', text: 'Do you feel your life has meaning and purpose?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
    ],
  },
  {
    id: 'psychological_health',
    title: 'Psychological Health',
    icon: '🧠',
    description: 'Your mental and emotional state',
    questions: [
      { id: 'q2_1', text: 'How often do you experience negative feelings such as anxiety or sadness?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
      { id: 'q2_2', text: 'How well are you able to concentrate?', type: 'scale', options: ['Not at All', 'Slightly', 'Moderately', 'Very Well', 'Extremely Well'] },
      { id: 'q2_3', text: 'How often do you feel hopeful about the future?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
    ],
  },
  {
    id: 'trauma_experiences',
    title: 'Trauma & Past Experiences',
    icon: '💔',
    description: 'Understanding past difficult experiences',
    questions: [
      { id: 'q3_1', text: 'Have you experienced a traumatic event that still affects you?', type: 'yesno', sensitive: true },
      { id: 'q3_2', text: 'Do you have recurring distressing memories or flashbacks?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'], sensitive: true },
      { id: 'q3_3', text: 'Do you avoid situations that remind you of past painful events?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
      { id: 'q3_4', text: 'Have you ever experienced domestic violence or abuse?', type: 'yesno', sensitive: true },
    ],
  },
  {
    id: 'insecurities_self_perception',
    title: 'Insecurities & Self-Perception',
    icon: '🪞',
    description: 'How you see and feel about yourself',
    questions: [
      { id: 'q4_1', text: 'How satisfied are you with yourself?', type: 'scale', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'] },
      { id: 'q4_2', text: 'How often do you feel inadequate or not good enough?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
    ],
  },
  {
    id: 'physical_health',
    title: 'Physical Health',
    icon: '💪',
    description: 'Your physical wellbeing and daily functioning',
    questions: [
      { id: 'q5_1', text: 'How satisfied are you with your sleep?', type: 'scale', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'] },
      { id: 'q5_2', text: 'How well are you able to perform daily activities?', type: 'scale', options: ['Not at All', 'Slightly', 'Moderately', 'Mostly', 'Completely'] },
    ],
  },
  {
    id: 'social_relationships',
    title: 'Social Relationships & Trust',
    icon: '🤝',
    description: 'Your connections with others and social support',
    questions: [
      { id: 'q6_1', text: 'How satisfied are you with your personal relationships?', type: 'scale', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'] },
      { id: 'q6_2', text: 'Do you feel you have someone you can trust and confide in?', type: 'scale', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
      { id: 'q6_3', text: 'How supported do you feel by the people around you?', type: 'scale', options: ['Not at All', 'Slightly', 'Moderately', 'Very', 'Extremely'] },
    ],
  },
  {
    id: 'environment_safety',
    title: 'Environment & Safety',
    icon: '🏠',
    description: 'Your living conditions and sense of safety',
    questions: [
      { id: 'q7_1', text: 'How safe do you feel in your daily life?', type: 'scale', options: ['Not at All', 'Slightly', 'Moderately', 'Very', 'Extremely'] },
      { id: 'q7_2', text: 'How satisfied are you with the conditions of your living place?', type: 'scale', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'] },
    ],
  },
  {
    id: 'coping_regulation',
    title: 'Coping & Emotional Regulation',
    icon: '🧘',
    description: 'How you manage stress and difficult emotions',
    questions: [
      { id: 'q8_1', text: 'How well do you manage stress in your life?', type: 'scale', options: ['Not at All', 'Slightly', 'Moderately', 'Well', 'Very Well'] },
      { id: 'q8_2', text: 'Have you had thoughts of harming yourself?', type: 'yesno', sensitive: true, critical: true },
    ],
  },
];

// Language Options
export const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi / हिन्दी' },
  { value: 'marathi', label: 'Marathi / मराठी' },
  { value: 'tamil', label: 'Tamil / தமிழ்' },
  { value: 'telugu', label: 'Telugu / తెలుగు' },
  { value: 'kannada', label: 'Kannada / ಕನ್ನಡ' },
  { value: 'bengali', label: 'Bengali / বাংলা' },
  { value: 'gujarati', label: 'Gujarati / ગુજરાતી' },
];

// Literacy Levels
export const LITERACY_LEVELS = [
  { value: 'literate', label: 'Literate' },
  { value: 'semi_literate', label: 'Semi-literate' },
  { value: 'illiterate', label: 'Illiterate' },
];

// Gender Options
export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Risk Levels
export const RISK_LEVELS = {
  LOW: { label: 'Low Risk', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  MODERATE: { label: 'Moderate Risk', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  HIGH: { label: 'High Risk', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

// Session Types
export const SESSION_TYPES = [
  { value: 'early_screening', label: 'Initial Screening' },
  { value: 'follow_up_1', label: 'Clinical Follow-up 1' },
  { value: 'follow_up_2', label: 'Clinical Follow-up 2' },
];

// Session Statuses
export const SESSION_STATUSES = {
  SCHEDULED: { label: 'Scheduled', color: '#3B82F6' },
  IN_PROGRESS: { label: 'In Progress', color: '#F59E0B' },
  COMPLETED: { label: 'Completed', color: '#10B981' },
  CANCELLED: { label: 'Cancelled', color: '#EF4444' },
};
