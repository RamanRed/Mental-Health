// ============================================
// MANAS API Helper Functions
// ============================================

import { getToken } from './auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

// Core fetch wrapper with auth
async function fetchAPI(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = { ...options, headers };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manas_token');
        localStorage.removeItem('manas_user');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    if (error.message === 'Unauthorized') throw error;
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================================
// AUTH & USER
// ============================================================

export async function checkUser(phone, role) {
  return fetchAPI('/auth/check-user', {
    method: 'POST',
    body: JSON.stringify({ phone, role }),
  });
}

export async function requestOTP(phone) {
  return fetchAPI('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOTP(phone, otp, role) {
  return fetchAPI('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, role }),
  });
}

export async function getMe() {
  return fetchAPI('/auth/me');
}

// ============================================================
// REGISTRATION
// ============================================================

export async function registerPatient(data) {
  return fetchAPI('/auth/register/patient', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerGuardian(data) {
  return fetchAPI('/auth/register/guardian', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerDoctor(data) {
  return fetchAPI('/auth/register/doctor', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// PATIENT PROFILE & ACTIONS
// ============================================================

export async function getPatientProfile() {
  return fetchAPI('/patients/profile');
}

export async function updatePatientProfile(data) {
  return fetchAPI('/patients/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getPatientConsultations() {
  return fetchAPI('/patients/consultations');
}

export async function updatePatientConsent(data) {
  return fetchAPI('/patients/consent', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function linkGuardian(guardianPhone, slot) {
  return fetchAPI('/patients/link-guardian', {
    method: 'POST',
    body: JSON.stringify({ guardian_phone: guardianPhone, slot }),
  });
}

// ============================================================
// MOOD JOURNAL
// ============================================================

export async function getMoodEntries(days = 7) {
  return fetchAPI(`/mood/entries?days=${days}`);
}

export async function createMoodEntry(data) {
  return fetchAPI('/mood/entry', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getStreak() {
  return fetchAPI('/mood/streak');
}

export async function getMoodTrends(days = 30) {
  return fetchAPI(`/mood/trends?days=${days}`);
}

// ============================================================
// QUESTIONNAIRE
// ============================================================

export async function getQuestionnaireDomains() {
  return fetchAPI('/questionnaire/domains');
}

export async function saveQuestionnaire(data) {
  return fetchAPI('/questionnaire/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getQuestionnaireResponses(patientId) {
  return fetchAPI(`/questionnaire/${patientId}`);
}

// ============================================================
// GUARDIAN
// ============================================================

export async function getLinkedPatients() {
  return fetchAPI('/guardians/patients');
}

export async function getGuardianProfile() {
  return fetchAPI('/guardians/profile');
}

export async function updateGuardianProfile(data) {
  return fetchAPI('/guardians/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function registerPatientByGuardian(data) {
  return fetchAPI('/guardians/register-patient', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addGuardianNote(patientId, noteText, noteType = 'observation') {
  const params = new URLSearchParams({
    patient_id: patientId,
    note_text: noteText,
    note_type: noteType,
  });
  return fetchAPI(`/guardians/notes?${params.toString()}`, { method: 'POST' });
}

export async function getNearbyPatients(latitude = null, longitude = null, radiusKm = 10.0) {
  const params = new URLSearchParams({ radius_km: radiusKm });
  if (latitude != null) params.set('latitude', latitude);
  if (longitude != null) params.set('longitude', longitude);
  return fetchAPI(`/guardians/nearby-patients?${params.toString()}`);
}

export async function getPatientConsultationsForGuardian(patientId) {
  return fetchAPI(`/guardians/patients/${patientId}/consultations`);
}

// ============================================================
// DOCTOR
// ============================================================

export async function getPatientQueue() {
  return fetchAPI('/doctors/patients');
}

export async function getPatientBrief(patientId) {
  return fetchAPI(`/doctors/patient/${patientId}/brief`);
}

export async function getDoctorProfile() {
  return fetchAPI('/doctors/profile');
}

export async function updateDoctorProfile(data) {
  return fetchAPI('/doctors/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function listDoctorSessions() {
  return fetchAPI('/doctors/sessions');
}

export async function getSessionDetails(sessionId) {
  return fetchAPI(`/doctors/sessions/${sessionId}`);
}

export async function createSession(data) {
  return fetchAPI('/doctors/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSession(sessionId, data) {
  return fetchAPI(`/doctors/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function validateSessionForm(sessionId, validatedForm) {
  return fetchAPI(`/doctors/sessions/${sessionId}/form`, {
    method: 'PUT',
    body: JSON.stringify({ doctor_validated_form: validatedForm }),
  });
}

export async function updateSessionSummary(sessionId, summaryText) {
  return fetchAPI(`/doctors/sessions/${sessionId}/summary`, {
    method: 'PUT',
    body: JSON.stringify({ consultation_summary: summaryText }),
  });
}

export async function updateSessionAccess(sessionId, accessData) {
  return fetchAPI(`/doctors/sessions/${sessionId}/access`, {
    method: 'PUT',
    body: JSON.stringify(accessData),
  });
}

export async function listClinicalForms() {
  return fetchAPI('/doctors/clinical-forms');
}

export async function getClinicalForm(formId) {
  return fetchAPI(`/doctors/clinical-forms/${formId}`);
}

// ============================================================
// AI PIPELINE
// ============================================================

export async function uploadAudio(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/ai/upload-audio`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('manas_token');
      localStorage.removeItem('manas_user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || 'Audio upload failed');
  return data;
}

export async function transcribeAudio(audioPath) {
  return fetchAPI('/ai/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audio_path: audioPath }),
  });
}

export async function autoFillForm(transcript, formSchema = null) {
  return fetchAPI('/ai/auto-fill', {
    method: 'POST',
    body: JSON.stringify({ transcript, form_schema: formSchema }),
  });
}

export async function generateSummary(formData = null, transcript = null) {
  return fetchAPI('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ form_data: formData, transcript }),
  });
}

export async function screenAllPatients() {
  return fetchAPI('/ai/screen-all', { method: 'POST' });
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getUserNotifications() {
  return fetchAPI('/notifications');
}

export async function getUnreadNotificationsCount() {
  return fetchAPI('/notifications/unread-count');
}

export async function markNotificationAsRead(notificationId) {
  return fetchAPI(`/notifications/${notificationId}/read`, { method: 'PUT' });
}

export async function markAllNotificationsAsRead() {
  return fetchAPI('/notifications/read-all', { method: 'PUT' });
}

// ============================================================
// APPOINTMENTS
// ============================================================

export async function listAvailableDoctors() {
  return fetchAPI('/appointments/available-doctors');
}

export async function requestAppointment(data) {
  return fetchAPI('/appointments/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyAppointments() {
  return fetchAPI('/appointments/my');
}

export async function getDoctorPendingAppointments() {
  return fetchAPI('/appointments/doctor/pending');
}

export async function cancelAppointment(appointmentId) {
  return fetchAPI(`/appointments/${appointmentId}/cancel`, { method: 'PUT' });
}

export async function acceptAppointment(appointmentId, data) {
  return fetchAPI(`/appointments/${appointmentId}/accept`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function rejectAppointment(appointmentId, rejectionReason) {
  return fetchAPI(`/appointments/${appointmentId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ rejection_reason: rejectionReason }),
  });
}

// ============================================================
// VIDEO CALLS
// ============================================================

export async function initiateVideoCall(data) {
  return fetchAPI('/calls/initiate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getIncomingCalls() {
  return fetchAPI('/calls/incoming');
}

export async function getVideoCallStatus(callId) {
  return fetchAPI(`/calls/status/${callId}`);
}

export async function acceptVideoCall(callId) {
  return fetchAPI(`/calls/${callId}/accept`, { method: 'PUT' });
}

export async function rejectVideoCall(callId) {
  return fetchAPI(`/calls/${callId}/reject`, { method: 'PUT' });
}

export async function endVideoCall(callId) {
  return fetchAPI(`/calls/${callId}/end`, { method: 'PUT' });
}

export async function sendCallSignal(callId, data) {
  return fetchAPI(`/calls/${callId}/signal`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// TRANSCRIPTS  (matches /api/transcripts/...)
// ============================================================

export async function saveCallTranscript(data) {
  // data: { call_id?, consultation_id?, patient_id, raw_transcript?, source? }
  return fetchAPI('/transcripts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTranscriptsByConsultation(consultationId) {
  return fetchAPI(`/transcripts/consultation/${consultationId}`);
}

export async function getTranscriptsByCall(callId) {
  return fetchAPI(`/transcripts/call/${callId}`);
}

export async function updateTranscript(transcriptId, data) {
  // data: { edited_transcript?, raw_transcript? }
  return fetchAPI(`/transcripts/${transcriptId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTranscript(transcriptId) {
  return fetchAPI(`/transcripts/${transcriptId}`, { method: 'DELETE' });
}

// ============================================================
// FOLLOW REQUESTS  (matches /api/follow-requests/...)
// ============================================================

export async function sendFollowRequest(data) {
  // data: { patient_id, consultation_id?, message?, due_date? }
  return fetchAPI('/follow-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSentFollowRequests() {
  return fetchAPI('/follow-requests/sent');
}

export async function getPatientFollowRequests() {
  return fetchAPI('/follow-requests/my');
}

export async function respondFollowRequest(requestId, responseText) {
  // patient responds with text
  return fetchAPI(`/follow-requests/${requestId}/respond`, {
    method: 'PUT',
    body: JSON.stringify({ patient_response: responseText }),
  });
}

export async function acknowledgeFollowRequest(requestId) {
  return fetchAPI(`/follow-requests/${requestId}/acknowledge`, { method: 'PUT' });
}

// ============================================================
// ANALYTICS  (matches /api/analytics/...)
// ============================================================

export async function getDoctorOverviewAnalytics() {
  return fetchAPI('/analytics/doctor/overview');
}

export async function getDoctorPatientMoodTrend(patientId, days = 30) {
  return fetchAPI(`/analytics/doctor/patient/${patientId}/mood-trend?days=${days}`);
}

export async function getDoctorPatientScreeningHistory(patientId) {
  return fetchAPI(`/analytics/doctor/patient/${patientId}/screening-history`);
}

export async function getPatientMoodInsights(days = 30) {
  return fetchAPI(`/analytics/patient/mood-insights?days=${days}`);
}

export async function getPatientSessionHistory() {
  return fetchAPI('/analytics/patient/session-history');
}

export async function getDoctorPatientAnalytics(patientId) {
  // Aggregate multiple analytics endpoints for patient overview
  const [moodTrend, screeningHistory] = await Promise.allSettled([
    getDoctorPatientMoodTrend(patientId, 30),
    getDoctorPatientScreeningHistory(patientId),
  ]);

  return {
    mood_trend: moodTrend.status === 'fulfilled' ? (moodTrend.value.trends || moodTrend.value) : [],
    risk_trend: screeningHistory.status === 'fulfilled' ? (screeningHistory.value.screenings || screeningHistory.value) : [],
    current_streak: moodTrend.status === 'fulfilled' ? (moodTrend.value.current_streak || 0) : 0,
    avg_mood_score: moodTrend.status === 'fulfilled' ? (moodTrend.value.avg_score || null) : null,
    total_mood_entries: moodTrend.status === 'fulfilled' ? (moodTrend.value.total_entries || 0) : 0,
    session_stats: { completed: 0 },
    questionnaire_count: 0,
    guardian_notes_count: 0,
  };
}

// ============================================================
// HEALTH CHECK
// ============================================================

export async function getHealth() {
  return fetchAPI('/health');
}

// Alias used by doctor dashboard
export { getSentFollowRequests as getDoctorFollowRequests };
