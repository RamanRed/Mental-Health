"use client";

import axios from "axios";
import { useAuthStore, type Locale, type UserRole } from "@/store/authStore";

type ApiResponse<T> = { success: boolean; data: T; message: string };

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") window.location.href = "/en/auth/login";
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  sendOtp: (phone: string) => api.post<ApiResponse<null>>("/auth/send-otp", { phone }),
  verifyOtp: (payload: { phone: string; otp: string; role?: UserRole; language?: Locale }) =>
    api.post<ApiResponse<{ user: { id: string; role: UserRole; anonymous_id: string; language: Locale }; accessToken: string; refreshToken?: string }>>(
      "/auth/verify-otp",
      payload,
    ),
  register: (payload: { phone: string; role: Exclude<UserRole, "admin">; language: Locale }) =>
    api.post<ApiResponse<{ user: { id: string; role: UserRole; anonymous_id: string; language: Locale }; accessToken: string }>>("/auth/register", payload),
  anonymous: (language: Locale) => api.post<ApiResponse<{ anonymous_id: string; accessToken: string; language: Locale }>>("/auth/anonymous", { language }),
  logout: () => api.post<ApiResponse<null>>("/auth/logout"),
};

export const patientApi = {
  onboard: (payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>("/patient/onboard", payload),
  profile: () => api.get<ApiResponse<Record<string, unknown>>>("/patient/profile"),
  updateProfile: (payload: Record<string, unknown>) => api.put<ApiResponse<Record<string, unknown>>>("/patient/profile", payload),
  logMood: (payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>("/patient/mood", payload),
  moodHistory: () => api.get<ApiResponse<Record<string, unknown>[]>>("/patient/mood/history"),
  journal: (payload: Record<string, unknown>) => api.post<ApiResponse<{ id: string }>>("/patient/journal", payload),
  assessments: () => api.get<ApiResponse<Record<string, unknown>[]>>("/patient/assessments"),
  submitAssessment: (type: string, payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>(`/patient/assessments/${type}`, payload),
  appointments: () => api.get<ApiResponse<Record<string, unknown>[]>>("/patient/appointments"),
  createAppointment: (payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>("/patient/appointments", payload),
  wellnessReport: () => api.get<ApiResponse<Record<string, unknown>>>("/patient/wellness-report"),
};

export const chatApi = {
  sendMessage: (payload: { session_id?: string; content: string; language: Locale }) =>
    api.post<ApiResponse<{ session_id: string; reply: string; risk_flags?: string[] }>>("/chat/message", payload),
  sessions: () => api.get<ApiResponse<Record<string, unknown>[]>>("/chat/sessions"),
  history: (sessionId: string) => api.get<ApiResponse<Record<string, unknown>>>(`/chat/history/${sessionId}`),
  voice: (payload: FormData) => api.post<ApiResponse<{ transcript: string; session_id: string }>>("/chat/voice", payload),
};

export const doctorApi = {
  dashboard: () => api.get<ApiResponse<Record<string, unknown>>>("/doctor/appointments"),
  patients: () => api.get<ApiResponse<Record<string, unknown>[]>>("/doctor/patients"),
  patient: (id: string) => api.get<ApiResponse<Record<string, unknown>>>(`/doctor/patients/${id}`),
  clinicalNotes: (payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>(`/doctor/appointments/${payload.appointment_id}/notes`, payload),
};

export const ashaApi = {
  dashboard: () => api.get<ApiResponse<Record<string, unknown>>>("/asha/analytics"),
  registerPatient: (payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>("/asha/patients/register", payload),
  screening: (id: string, payload: Record<string, unknown>) => api.post<ApiResponse<Record<string, unknown>>>(`/asha/patients/${id}/screening`, payload),
};
