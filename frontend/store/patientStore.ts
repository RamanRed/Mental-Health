"use client";

import { create } from "zustand";

type MoodLog = {
  date: string;
  mood_score: number;
};

type PatientState = {
  profile: Record<string, unknown> | null;
  moodLogs: MoodLog[];
  riskScore: number;
  setProfile: (profile: Record<string, unknown>) => void;
  setMoodLogs: (moodLogs: MoodLog[]) => void;
  setRiskScore: (riskScore: number) => void;
};

export const usePatientStore = create<PatientState>((set) => ({
  profile: null,
  moodLogs: [],
  riskScore: 18,
  setProfile: (profile) => set({ profile }),
  setMoodLogs: (moodLogs) => set({ moodLogs }),
  setRiskScore: (riskScore) => set({ riskScore }),
}));
