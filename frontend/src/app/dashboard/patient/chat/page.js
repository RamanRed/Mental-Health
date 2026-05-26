'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getChatProfile, updateChatProfile, getChatHistory, sendChatMessage } from '@/lib/api';

const TOTAL_STEPS = 3;

const REASON_OPTIONS = [
  "Stress & Anxiety",
  "Low Mood / Depression",
  "Relationship & Family Issues",
  "Work / Academic Pressure",
  "Sleep Problems",
  "Just Want to Talk"
];

const THERAPIST_OPTIONS = [
  "Yes, currently consulting one",
  "Yes, spoke to one in the past",
  "No, never spoken to one"
];

export default function SaathiChatPage() {
  const router = useRouter();
  
  // Dashboard & Onboarding States
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isOnboarded, setIsOnboarded] = useState(false);
  
  // Onboarding Form States
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [openText, setOpenText] = useState('');
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);

  // Chat Interface States
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [showApptReminder, setShowApptReminder] = useState(false);
  const [chatError, setChatError] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load profile onboarding status and chat logs on mount
  useEffect(() => {
    async function init() {
      try {
        const data = await getChatProfile();
        setProfile(data);
        
        // If reasons and therapist history are already populated, skip onboarding
        if (data.reasons && data.reasons.length > 0 && data.therapist_history) {
          setIsOnboarded(true);
          setSelectedReasons(data.reasons);
          setSelectedTherapist(data.therapist_history);
          setOpenText(data.open_text || '');
          
          // Load chat history
          const history = await getChatHistory();
          if (history && history.length > 0) {
            setMessages(history);
          } else {
            addWelcomeMessage();
          }
        }
      } catch (err) {
        console.error("Failed to load Saathi chatbot details", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isOnboarded]);

  const addWelcomeMessage = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hello! I am Saathi, your supportive mental health companion. I am here to listen, offer guidance, and keep you company. How are you feeling today?",
        created_at: new Date().toISOString()
      }
    ]);
  };

  // Onboarding handlers
  const handleToggleReason = (reason) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleNextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      submitOnboarding();
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const submitOnboarding = async () => {
    setSubmittingOnboarding(true);
    try {
      await updateChatProfile({
        reasons: selectedReasons,
        therapist_history: selectedTherapist,
        open_text: openText
      });
      setIsOnboarded(true);
    } catch (err) {
      console.error("Failed to submit chatbot onboarding", err);
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  // Chat message handlers
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text || isTyping) return;

    // Crisis detection
    const lowerText = text.toLowerCase();
    const isCrisis = ["suicide", "kill myself", "end my life", "want to die", "mar jaana"].some(kw => lowerText.includes(kw));
    if (isCrisis) {
      setShowCrisis(true);
    }

    // Appointment mention check
    const isApptQuery = ["appointment", "doctor", "dr", "consult", "clinic", "checkup", "physician"].some(kw => lowerText.includes(kw));
    if (isApptQuery) {
      setShowApptReminder(true);
    }

    const userMsg = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setChatError('');

    try {
      const response = await sendChatMessage(text);
      const assistantMsg = {
        role: 'assistant',
        content: response.reply,
        created_at: response.created_at || new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      // Auto-trigger reminder if LLM suggests booking a doctor
      const lowerReply = response.reply.toLowerCase();
      if (lowerReply.includes("appointment") || lowerReply.includes("doctor")) {
        setShowApptReminder(true);
      }
    } catch (err) {
      console.error(err);
      setChatError("Failed to deliver message. Please check connection and retry.");
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="chat-loading-container flex-center">
        <div className="spinner animate-spin"></div>
        <p>Connecting to Saathi...</p>
        <style jsx>{`
          .chat-loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 12px;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  // --- Onboarding Flow Render ---
  if (!isOnboarded) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container glass-card-static">
          <div className="onboarding-header">
            <div className="logo-wrapper">
              <span className="logo-emoji">🌿🤖</span>
              <h2 className="logo-title">Meet Saathi</h2>
            </div>
            <span className="step-counter">Step {step} of {TOTAL_STEPS}</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
          </div>

          <div className="question-content">
            {step === 1 && (
              <div className="question-wrapper">
                <h3>What brings you to Saathi today?</h3>
                <p className="question-desc">Select all that apply to help Saathi personalize its companionship.</p>
                <div className="choices-grid">
                  {REASON_OPTIONS.map((opt) => {
                    const isSelected = selectedReasons.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => handleToggleReason(opt)}
                        className={`choice-button ${isSelected ? 'active' : ''}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="question-wrapper">
                <h3>Have you ever spoken to a professional counselor or therapist?</h3>
                <p className="question-desc">This helps Saathi understand how to guide you.</p>
                <div className="choices-list">
                  {THERAPIST_OPTIONS.map((opt) => {
                    const isSelected = selectedTherapist === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setSelectedTherapist(opt)}
                        className={`choice-button ${isSelected ? 'active' : ''}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="question-wrapper">
                <h3>Tell Saathi: What is on your mind today?</h3>
                <p className="question-desc">A brief sentence about your thoughts or current challenges today.</p>
                <textarea
                  value={openText}
                  onChange={(e) => setOpenText(e.target.value)}
                  className="open-textarea"
                  placeholder="I've been feeling slightly anxious about my examinations lately..."
                  maxLength={500}
                />
              </div>
            )}
          </div>

          <div className="nav-row">
            {step > 1 ? (
              <button onClick={handleBackStep} className="btn-back">
                ← Back
              </button>
            ) : <div />}
            
            <button
              onClick={handleNextStep}
              disabled={
                submittingOnboarding ||
                (step === 1 && selectedReasons.length === 0) ||
                (step === 2 && !selectedTherapist)
              }
              className="btn-next"
            >
              {submittingOnboarding ? 'Starting...' : step === TOTAL_STEPS ? 'Start Chatting 🌿' : 'Next →'}
            </button>
          </div>
        </div>

        <style jsx>{`
          .onboarding-page {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - var(--navbar-height) - 40px);
            padding: 20px;
          }
          .onboarding-container {
            width: 100%;
            max-width: 500px;
            background: var(--bg-primary);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          .onboarding-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .logo-emoji {
            font-size: 1.5rem;
          }
          .logo-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #34d399;
          }
          .step-counter {
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-weight: 500;
          }
          .progress-track {
            height: 4px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 2px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: #10b981;
            transition: width 0.3s ease;
          }
          .question-wrapper h3 {
            font-size: 1.15rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-primary);
          }
          .question-desc {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: 20px;
          }
          .choices-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .choices-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .choice-button {
            padding: 14px;
            border-radius: 12px;
            background: var(--bg-input);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: var(--text-secondary);
            text-align: left;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .choice-button:hover {
            border-color: rgba(16, 185, 129, 0.3);
            background: rgba(16, 185, 129, 0.05);
            color: var(--text-primary);
          }
          .choice-button.active {
            background: rgba(16, 185, 129, 0.15);
            border-color: #10b981;
            color: #34d399;
            font-weight: 600;
          }
          .open-textarea {
            width: 100%;
            height: 120px;
            padding: 14px;
            border-radius: 12px;
            background: var(--bg-input);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: var(--text-primary);
            font-size: 0.85rem;
            resize: none;
            outline: none;
          }
          .open-textarea:focus {
            border-color: #10b981;
          }
          .nav-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
          }
          .btn-back {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
          }
          .btn-back:hover {
            color: var(--text-primary);
          }
          .btn-next {
            padding: 12px 24px;
            border-radius: 12px;
            background: #10b981;
            color: white;
            border: none;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-next:hover {
            background: #059669;
          }
          .btn-next:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  // --- Persistent Chat Interface Render ---
  return (
    <div className="chat-layout">
      {/* Messages Window */}
      <div className="messages-window glass-card-static">
        <div className="chat-header">
          <div className="chat-header-info">
            <span className="saathi-avatar">🌱</span>
            <div>
              <h3>Saathi</h3>
              <p className="saathi-sub">Your Mental Health Companion</p>
            </div>
          </div>
          <div className="chat-security-tag">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="lock-icon">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
            </svg>
            <span>Fully Secure</span>
          </div>
        </div>

        {/* Crisis Warning Banner */}
        {showCrisis && (
          <div className="crisis-warning-banner">
            <div className="crisis-content">
              <strong>🚨 Safety Support Call Center</strong>
              <p>If you or someone you know is going through a crisis, please call iCall helpline at <strong>9152987821</strong> (free, confidential, and available in multiple languages).</p>
            </div>
            <button onClick={() => setShowCrisis(false)} className="close-crisis">✕</button>
          </div>
        )}

        {/* Messages List */}
        <div className="messages-list calm-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble-wrapper ${msg.role}`}>
              <div className="message-bubble">
                <p className="msg-content">{msg.content}</p>
                <span className="msg-time">
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message-bubble-wrapper assistant typing">
              <div className="message-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {chatError && (
            <div className="chat-error-message">
              <span>⚠️ {chatError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Row */}
        <form onSubmit={handleSend} className="input-row">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message to Saathi..."
            disabled={isTyping}
            className="chat-input"
          />
          <button type="submit" className="btn-send" disabled={isTyping || !inputValue.trim()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="send-icon">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Booking Reminder Panel */}
      {showApptReminder && (
        <div className="booking-reminder-panel glass-card-static animate-fade-in">
          <div className="reminder-header">
            <h4>💡 Recommended Action</h4>
            <button onClick={() => setShowApptReminder(false)} className="close-reminder">✕</button>
          </div>
          <p>Saathi recommends consulting a professional medical practitioner for clinical evaluation.</p>
          <Link href="/dashboard/patient/appointments" className="btn-book-action">
            Book Doctor Appointment ➔
          </Link>
        </div>
      )}

      <style jsx>{`
        .chat-layout {
          max-width: 800px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: var(--text-primary);
        }
        .messages-window {
          height: calc(100vh - var(--navbar-height) - 100px);
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }
        .chat-header {
          padding: 16px var(--space-xl);
          background: rgba(255, 255, 255, 0.01);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .saathi-avatar {
          font-size: 1.6rem;
          background: rgba(16, 185, 129, 0.15);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .chat-header-info h3 {
          font-size: var(--font-base);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .saathi-sub {
          font-size: 10px;
          color: #10b981;
          font-weight: 600;
          margin: 0;
        }
        .chat-security-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }
        .lock-icon {
          width: 12px;
          height: 12px;
        }
        .crisis-warning-banner {
          background: rgba(239, 68, 68, 0.1);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          font-size: var(--font-xs);
        }
        .crisis-content strong {
          color: #f87171;
          display: block;
          margin-bottom: 2px;
        }
        .crisis-content p {
          color: #f87171;
          line-height: 1.4;
          margin: 0;
        }
        .close-crisis {
          background: transparent;
          border: none;
          color: #f87171;
          cursor: pointer;
          font-size: 1rem;
        }
        .messages-list {
          flex: 1;
          padding: 24px var(--space-xl);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .message-bubble-wrapper {
          display: flex;
          width: 100%;
        }
        .message-bubble-wrapper.user {
          justify-content: flex-end;
        }
        .message-bubble-wrapper.assistant {
          justify-content: flex-start;
        }
        .message-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
        }
        .user .message-bubble {
          background: var(--color-primary);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .assistant .message-bubble {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .msg-content {
          margin: 0;
          font-size: var(--font-sm);
          line-height: 1.4;
          white-space: pre-line;
        }
        .msg-time {
          display: block;
          text-align: right;
          font-size: 9px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }
        .typing-dots {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: dot-pulse 1.4s infinite ease-in-out both;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        .chat-error-message {
          text-align: center;
          color: #f87171;
          font-size: var(--font-xs);
          padding: 8px;
        }
        .input-row {
          padding: 16px var(--space-xl) 24px;
          background: rgba(255, 255, 255, 0.01);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .chat-input {
          flex: 1;
          padding: 14px 18px;
          border-radius: var(--radius-lg);
          background: var(--bg-input);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
          outline: none;
          font-size: var(--font-sm);
          transition: border-color 0.2s ease;
        }
        .chat-input:focus {
          border-color: #10b981;
        }
        .btn-send {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: #10b981;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-send:hover:not(:disabled) {
          background: #059669;
          transform: scale(1.03);
        }
        .btn-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .send-icon {
          width: 20px;
          height: 20px;
        }
        .booking-reminder-panel {
          padding: 16px 20px;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
        }
        .reminder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .reminder-header h4 {
          font-size: var(--font-sm);
          color: #34d399;
          font-weight: 700;
          margin: 0;
        }
        .close-reminder {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.85rem;
        }
        .booking-reminder-panel p {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }
        .btn-book-action {
          padding: 10px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 8px;
          font-size: var(--font-xs);
          font-weight: 600;
          text-decoration: none;
          text-align: center;
          transition: all 0.2s ease;
        }
        .btn-book-action:hover {
          background: #10b981;
          color: white;
        }
      `}</style>
    </div>
  );
}
