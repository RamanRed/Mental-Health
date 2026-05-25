"use client";

import { create } from "zustand";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type ChatState = {
  messages: ChatMessage[];
  sessionId: string | null;
  isTyping: boolean;
  riskFlag: boolean;
  addMessage: (message: ChatMessage) => void;
  setSessionId: (sessionId: string) => void;
  setTyping: (isTyping: boolean) => void;
  setRiskFlag: (riskFlag: boolean) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionId: null,
  isTyping: false,
  riskFlag: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setSessionId: (sessionId) => set({ sessionId }),
  setTyping: (isTyping) => set({ isTyping }),
  setRiskFlag: (riskFlag) => set({ riskFlag }),
  reset: () => set({ messages: [], sessionId: null, isTyping: false, riskFlag: false }),
}));
