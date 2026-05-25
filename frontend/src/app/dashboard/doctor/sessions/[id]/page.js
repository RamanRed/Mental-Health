'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getSessionDetails,
  updateSession,
  validateSessionForm,
  updateSessionSummary,
  updateSessionAccess,
  uploadAudio,
  transcribeAudio,
  autoFillForm,
  generateSummary,
  listClinicalForms,
  getClinicalForm,
  initiateVideoCall
} from '@/lib/api';
import ConsentToggle from '@/components/ConsentToggle';

export default function SessionManagement() {
  const router = useRouter();
  const { id: sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Clinical Form Templates State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Post Session Pipeline State
  const [pipelineStep, setPipelineStep] = useState(0); // 0: Idle, 1: Audio Uploaded, 2: Transcribing, 3: Auto-filling, 4: Complete
  const [pipelineProgress, setPipelineProgress] = useState(0);

  // Form Validation State
  const [formFields, setFormFields] = useState({});
  const [isFormValidated, setIsFormValidated] = useState(false);

  // Summary Note State
  const [summaryText, setSummaryText] = useState('');
  const [summaryFields, setSummaryFields] = useState({
    summary: '',
    verdict: '',
    notes: ''
  });

  // Voice Dictation (Speech-to-Text) State
  const [activeDictationField, setActiveDictationField] = useState(null); // 'summary' | 'verdict' | 'notes'
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const isSpeechSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition);

  // Access Control State
  const [guardian1Access, setGuardian1Access] = useState(true);
  const [guardian2Access, setGuardian2Access] = useState(true);
  const [accessExpiry, setAccessExpiry] = useState('90_days');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // WebRTC Video Call state
  const [callingPatient, setCallingPatient] = useState(false);

  // Telehealth / Video Camera and Microphone state
  const [localStream, setLocalStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  // MediaRecorder state
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const localVideoRef = React.useRef(null);

  // Effect to manage recording timer
  useEffect(() => {
    let interval;
    if (recordingActive) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recordingActive]);

  // Clean up streams when component unmounts
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      // Stop dictation when page changes
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [localStream, recognitionInstance]);

  const loadSession = async () => {
    try {
      const data = await getSessionDetails(sessionId);
      setSession(data);
      if (data.consultation_summary) {
        setSummaryText(data.consultation_summary);
        try {
          const parsed = JSON.parse(data.consultation_summary);
          if (parsed && typeof parsed === 'object' && (parsed.summary !== undefined || parsed.verdict !== undefined || parsed.notes !== undefined)) {
            setSummaryFields({
              summary: parsed.summary || '',
              verdict: parsed.verdict || '',
              notes: parsed.notes || ''
            });
          } else {
            setSummaryFields({
              summary: data.consultation_summary,
              verdict: '',
              notes: ''
            });
          }
        } catch (e) {
          setSummaryFields({
            summary: data.consultation_summary,
            verdict: '',
            notes: ''
          });
        }
      }

      // Fetch clinical form templates
      let forms = [];
      try {
        forms = await listClinicalForms();
        setTemplates(forms);
      } catch (e) {
        console.error("Failed to load clinical forms list", e);
      }

      let currentTemplate = null;
      if (data.clinical_form_id && forms.length > 0) {
        currentTemplate = forms.find(t => t.id === data.clinical_form_id);
        if (currentTemplate) {
          setSelectedTemplate(currentTemplate);
        }
      }

      // Initialize dynamic form fields matching chosen template schema
      const initialFields = {};
      if (currentTemplate) {
        currentTemplate.schema_definition.fields.forEach(field => {
          if (field.type === 'checkbox_group') {
            initialFields[field.name] = [];
          } else {
            initialFields[field.name] = '';
          }
        });
      }

      if (data.doctor_validated_form) {
        setFormFields({ ...initialFields, ...data.doctor_validated_form });
        setIsFormValidated(true);
        setPipelineStep(4);
      } else if (data.ai_form_output) {
        setFormFields({ ...initialFields, ...data.ai_form_output });
        setPipelineStep(4);
      } else {
        setFormFields(initialFields);
      }

      setGuardian1Access(data.guardian1_access);
      setGuardian2Access(data.guardian2_access);
      if (data.access_expiry) {
        setAccessExpiry(data.access_expiry);
      }

      // Try to load doctor user info from localStorage
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('manas_user');
        if (storedUser) {
          setProfile(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load session details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const handleSelectTemplate = async (templateId) => {
    try {
      setError('');
      const updated = await updateSession(sessionId, { clinical_form_id: templateId });
      setSession(updated);
      
      const template = templates.find(t => t.id === templateId);
      setSelectedTemplate(template);
      
      const initialFields = {};
      if (template) {
        template.schema_definition.fields.forEach(field => {
          if (field.type === 'checkbox_group') {
            initialFields[field.name] = [];
          } else {
            initialFields[field.name] = '';
          }
        });
      }
      setFormFields(initialFields);
      setIsFormValidated(false);
      setPipelineStep(0);
      setPipelineProgress(0);
      setMessage(`Clinical Form Template set to "${template.form_name}".`);
    } catch (err) {
      console.error(err);
      setError('Failed to update clinical form template.');
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      setLocalStream(stream);
      setCameraActive(true);
      
      // Delay slightly to ensure video element is mounted and ref is linked
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 200);

      // Initialize MediaRecorder for audio recording
      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for browsers with limited webm codec support
        recorder = new MediaRecorder(stream);
      }

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        await processRecordedAudio(audioBlob);
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
    } catch (err) {
      console.error("Failed to access camera/microphone:", err);
      setError("Failed to access camera/microphone. Live streaming and recording disabled.");
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setCameraActive(false);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // Start Audio Recording
  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      // Clear previous chunks
      setRecordedChunks([]);
      mediaRecorder.start();
      setRecordingActive(true);
      setMessage("Audio recording started... Speak clearly into your microphone.");
    } else {
      setError("Recording interface not ready. Make sure camera and microphone permissions are granted.");
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecordingActive(false);
    }
  };

  // Toggle mic mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setSubmitting(true);
    try {
      const updated = await updateSession(sessionId, { status: newStatus });
      setSession(updated);
      setMessage(`Session status updated to ${newStatus}.`);

      // Automatically manage camera streams based on session status
      if (newStatus === 'in_progress') {
        await startCamera();
      } else if (newStatus === 'completed' || newStatus === 'cancelled') {
        if (recordingActive) {
          stopRecording();
        }
        stopCamera();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update session status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Real AI Pipeline Execution via File Upload
  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setPipelineStep(1);
    setPipelineProgress(15);
    setError('');
    setMessage('');

    try {
      // Step 1: Upload Audio File
      const uploadRes = await uploadAudio(file);
      setPipelineProgress(35);
      const audioPath = uploadRes.audio_path;

      // Update session audio path in DB
      await updateSession(sessionId, { audio_path: audioPath });

      // Step 2: Speech to Text (Transcription)
      setPipelineStep(2);
      setPipelineProgress(55);
      const transcribeRes = await transcribeAudio(audioPath);
      const transcriptText = transcribeRes.transcript;
      setPipelineProgress(70);

      // Update session transcript in DB
      await updateSession(sessionId, { transcript: transcriptText });

      // Step 3: LLM Auto-fill Form
      setPipelineStep(3);
      setPipelineProgress(85);
      const autoFillRes = await autoFillForm(transcriptText, selectedTemplate ? selectedTemplate.schema_definition : null);
      const filledFields = autoFillRes.form_data;
      setFormFields(filledFields);

      // Save AI auto-fill results to database
      await updateSession(sessionId, { ai_form_output: filledFields });

      // Step 4: Complete and Summarize
      setPipelineStep(4);
      setPipelineProgress(95);
      const summaryRes = await generateSummary(filledFields, transcriptText);
      setSummaryText(summaryRes.summary);
      setPipelineProgress(100);

      // Save summary to database
      await updateSession(sessionId, { consultation_summary: summaryRes.summary });

      // Reload to ensure state is synchronized
      await loadSession();
      setMessage('Consultation audio analyzed and form auto-filled successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete AI processing pipeline.');
      setPipelineStep(0);
      setPipelineProgress(0);
    }
  };

  const processRecordedAudio = async (audioBlob) => {
    setPipelineStep(1);
    setPipelineProgress(15);
    setError('');
    setMessage('');

    try {
      // Create a file object from the blob
      const file = new File([audioBlob], "consultation_recording.webm", {
        type: audioBlob.type || "audio/webm",
      });

      // Step 1: Upload Audio File
      const uploadRes = await uploadAudio(file);
      setPipelineProgress(35);
      const audioPath = uploadRes.audio_path;

      // Update session audio path in DB
      await updateSession(sessionId, { audio_path: audioPath });

      // Step 2: Speech to Text (Transcription)
      setPipelineStep(2);
      setPipelineProgress(55);
      const transcribeRes = await transcribeAudio(audioPath);
      const transcriptText = transcribeRes.transcript;
      setPipelineProgress(70);

      // Update session transcript in DB
      await updateSession(sessionId, { transcript: transcriptText });

      // Step 3: LLM Auto-fill Form
      setPipelineStep(3);
      setPipelineProgress(85);
      const autoFillRes = await autoFillForm(transcriptText, selectedTemplate ? selectedTemplate.schema_definition : null);
      const filledFields = autoFillRes.form_data;
      setFormFields(filledFields);

      // Save AI auto-fill results to database
      await updateSession(sessionId, { ai_form_output: filledFields });

      // Step 4: Complete and Summarize
      setPipelineStep(4);
      setPipelineProgress(95);
      const summaryRes = await generateSummary(filledFields, transcriptText);
      setSummaryText(summaryRes.summary);
      setPipelineProgress(100);

      // Save summary to database
      await updateSession(sessionId, { consultation_summary: summaryRes.summary });

      // Reload to ensure state is synchronized
      await loadSession();
      setMessage('Consultation audio recorded and analyzed successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete AI processing on recorded audio.');
      setPipelineStep(0);
      setPipelineProgress(0);
    }
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      await validateSessionForm(sessionId, formFields);
      setIsFormValidated(true);
      setMessage('Clinical form validated and saved successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to validate clinical form.');
    } finally {
      setSubmitting(false);
    }
  };

  const startDictation = (fieldName) => {
    if (!isSpeechSupported) {
      setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (recognitionInstance) {
      recognitionInstance.stop();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setActiveDictationField(fieldName);
      setMessage(`Voice dictation active for ${fieldName}... Speak into your microphone.`);
      setError('');
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === 'not-allowed') {
        setError("Microphone permission denied. Please allow mic access in your browser settings.");
      } else {
        setError(`Dictation error: ${e.error}`);
      }
      setActiveDictationField(null);
    };

    rec.onend = () => {
      setActiveDictationField(null);
    };

    rec.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setSummaryFields(prev => ({
          ...prev,
          [fieldName]: (prev[fieldName] + ' ' + finalTranscript).trim()
        }));
      }
    };

    rec.start();
    setRecognitionInstance(rec);
  };

  const stopDictation = () => {
    if (recognitionInstance) {
      recognitionInstance.stop();
      setRecognitionInstance(null);
      setActiveDictationField(null);
      setMessage("Voice dictation stopped.");
    }
  };

  const handleSaveSummary = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const serialized = JSON.stringify(summaryFields);
      await updateSessionSummary(sessionId, serialized);
      // Synchronize local session state
      setSession(prev => prev ? { ...prev, consultation_summary: serialized } : prev);
      setMessage('Record of consultation updated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update consultation record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAccess = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    const payload = {
      guardian1_access: guardian1Access,
      guardian2_access: guardian2Access,
      access_expiry: accessExpiry,
    };

    try {
      await updateSessionAccess(sessionId, payload);
      setMessage('Guardian sharing access permissions updated!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update access settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="session-loading flex-center">
        <div className="spinner animate-spin"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-error glass-card-static flex-col flex-center">
        <p>⚠️ {error || 'Failed to load consultation session.'}</p>
        <button onClick={() => router.push('/dashboard/doctor')} className="btn btn-secondary btn-sm">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="session-management-page flex-col">
      <div className="session-header-box glass-card-static flex-between">
        <div className="session-main-meta flex-col">
          <span className="sess-id-tag">Session ID: {session.id}</span>
          <h2>Consultation Management</h2>
          <span className="sess-type-tag">{session.session_type?.replace('_', ' ').toUpperCase()}</span>
        </div>

        <div className="session-controls flex-row">
          <span className="current-status-lbl">
            Status: <strong>{session.status?.toUpperCase()}</strong>
          </span>
          {session.status === 'scheduled' && (
            <button onClick={() => handleUpdateStatus('in_progress')} className="btn btn-primary" disabled={submitting}>
              Start Session ➔
            </button>
          )}
          {session.status === 'in_progress' && (
            <button onClick={() => handleUpdateStatus('completed')} className="btn btn-primary completed-btn" disabled={submitting}>
              Mark Completed Check-in
            </button>
          )}
          {session.status !== 'cancelled' && (
            <button onClick={() => handleUpdateStatus('cancelled')} className="btn btn-danger btn-sm" disabled={submitting}>
              Cancel Session
            </button>
          )}
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="session-grid">
        {/* Left Column: AI Pipeline and Clinical Form */}
        <div className="clinical-work-panel flex-col">
          {/* Telehealth Live Video Call Panel */}
          {session.status === 'in_progress' && (
            <div className="telehealth-video-panel glass-card-static flex-col">
              <div className="panel-header flex-between">
                <h3>Live Video Consultation</h3>
                <div className="rec-status-indicator flex-row align-center">
                  {recordingActive ? (
                    <div className="rec-pulse-wrapper flex-row align-center">
                      <span className="dot dot-red animate-pulse"></span>
                      <span className="rec-time">REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                    </div>
                  ) : (
                    <span className="lbl-inactive">Not Recording</span>
                  )}
                </div>
              </div>

              <div className="video-viewport-container grid-2">
                {/* Doctor's Video feed */}
                <div className="video-feed-box local-feed flex-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="video-element"
                  />
                  <span className="video-tag">Dr. {profile?.full_name || 'You'} (Local)</span>
                </div>

                {/* Patient's Remote Video feed / WebRTC Call Button */}
                <div className="video-feed-box remote-feed flex-center">
                  {cameraActive ? (
                    <div className="avatar-video flex-col flex-center animate-fade-in">
                      <span className="remote-avatar-icon">🧑</span>
                      <span className="remote-status-msg">{session.patient_name || 'Patient'}</span>
                      {!callingPatient ? (
                        <button
                          type="button"
                          className="btn btn-primary webrtc-call-btn"
                          onClick={async () => {
                            try {
                              setCallingPatient(true);
                              setMessage('Initiating WebRTC video call to patient...');
                              await initiateVideoCall({
                                callee_id: session.patient_user_id,
                                session_id: sessionId,
                                call_type: 'consultation'
                              });
                              setMessage('Video call initiated! The patient will receive a call notification.');
                            } catch (err) {
                              console.error('Failed to initiate call:', err);
                              setError(err.message || 'Failed to initiate video call.');
                              setCallingPatient(false);
                            }
                          }}
                        >
                          Connect Live WebRTC Video Call 📹
                        </button>
                      ) : (
                        <span className="remote-status-msg animate-pulse" style={{ color: 'var(--color-success)', marginTop: '8px' }}>
                          📞 Ringing patient...
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="camera-connecting flex-center">
                      <div className="spinner animate-spin"></div>
                    </div>
                  )}
                  <span className="video-tag">Patient feed</span>
                </div>
              </div>

              <div className="call-controls flex-row flex-center">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`btn-icon ${micMuted ? 'muted' : ''}`}
                  title={micMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {micMuted ? '🎙️ ❌' : '🎙️'}
                </button>
                
                {!recordingActive ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="btn btn-danger record-btn"
                  >
                    Start Recording Session 🔴
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="btn btn-success stop-btn animate-pulse"
                  >
                    Stop & Analyze ⏹️
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('completed')}
                  className="btn btn-secondary end-call-btn"
                >
                  End Session 📞
                </button>
              </div>
            </div>
          )}

          {/* Clinical Form Template Selector */}
          {!isFormValidated && pipelineStep === 0 && (
            <div className="template-selector-card glass-card-static flex-col" style={{ padding: 'var(--space-xl)', gap: 'var(--space-md)' }}>
              <h3>Clinical Form Template Selection</h3>
              <p className="subtitle">Select a clinical template to guide form filling and AI diagnostics.</p>
              <div className="form-group">
                <label className="form-label" htmlFor="template-select">Choose Template</label>
                <select
                  id="template-select"
                  className="form-select"
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                >
                  <option value="" disabled>-- Select clinical form template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.form_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Post-Session Diagnostics Pipeline */}
          {session.status !== 'in_progress' && (
            <div className="pipeline-card glass-card-static flex-col">
              <h3>Post-Session Diagnostics Pipeline</h3>
              {selectedTemplate ? (
                <p className="subtitle">Using template: <strong>{selectedTemplate.form_name}</strong>. Upload session audio to trigger auto-fill.</p>
              ) : (
                <p className="subtitle">Please select a clinical form template above to begin.</p>
              )}

              {pipelineStep === 0 ? (
                <div className="audio-upload-container">
                  <input
                    type="file"
                    id="audio-file-input"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    style={{ display: 'none' }}
                    disabled={session.status !== 'completed' || !selectedTemplate}
                  />
                  <button
                    onClick={() => document.getElementById('audio-file-input').click()}
                    className="btn btn-primary btn-doctor"
                    disabled={session.status !== 'completed' || !selectedTemplate}
                  >
                    Upload Consultation Audio 🎙️
                  </button>
                </div>
              ) : (
                <div className="pipeline-status flex-col">
                  <div className="progress-bar flex-row">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pipelineProgress}%` }}></div>
                    </div>
                    <span className="progress-lbl">{pipelineProgress}%</span>
                  </div>

                  <ul className="pipeline-steps-list flex-col">
                    <li className={pipelineStep >= 1 ? 'step-completed' : 'step-pending'}>
                      📤 Consultation Audio Uploaded
                    </li>
                    <li className={pipelineStep >= 2 ? 'step-completed' : 'step-pending'}>
                      🔤 Speech-to-Text Transcription Completed
                    </li>
                    <li className={pipelineStep >= 3 ? 'step-completed' : 'step-pending'}>
                      ⚙️ AI Auto-fill Clinical Diagnostics Form
                    </li>
                    <li className={pipelineStep >= 4 ? 'step-completed animate-pulse' : 'step-pending'}>
                      ✅ Ready for Doctor Validation
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Clinical Form Validation */}
          {pipelineStep === 4 && selectedTemplate && (
            <div className="clinical-form-card glass-card-static flex-col">
              <div className="form-header flex-between">
                <h3>Clinical Form Verification ({selectedTemplate.form_name})</h3>
                <span className={`form-status-tag ${isFormValidated ? 'validated' : 'pending'}`}>
                  {isFormValidated ? 'Validated' : 'Requires Review'}
                </span>
              </div>

              <form onSubmit={handleSaveForm} className="clinical-inputs flex-col">
                {selectedTemplate.schema_definition.fields.map((field) => {
                  const isSafety = field.name === 'suicidal_risk';
                  return (
                    <div 
                      key={field.name} 
                      className={`form-group ${isSafety ? 'safety-critical-field' : ''}`}
                    >
                      <label className={`form-label ${isSafety ? 'safety-label' : ''}`} htmlFor={`input-${field.name}`}>
                        {isSafety ? '⚠️ Safety-Critical: ' : ''}{field.label} {field.required ? '*' : ''}
                      </label>
                      
                      {field.type === 'numeric_rating' ? (
                        <input
                          id={`input-${field.name}`}
                          type="text"
                          className={`form-input ${isSafety ? 'safety-input' : ''}`}
                          value={formFields[field.name] || ''}
                          onChange={(e) => setFormFields({ ...formFields, [field.name]: e.target.value })}
                          required={field.required}
                          disabled={isFormValidated}
                          placeholder={`Enter score (${field.min}-${field.max})...`}
                        />
                      ) : field.type === 'checkbox_group' ? (
                        <div className="checkbox-options-grid flex-col" style={{ gap: '6px', marginTop: '6px' }}>
                          {field.options?.map(opt => {
                            const currentList = Array.isArray(formFields[field.name]) ? formFields[field.name] : [];
                            const isChecked = currentList.includes(opt);
                            return (
                              <label key={opt} className="flex-row align-center checkbox-label" style={{ gap: '8px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isFormValidated}
                                  onChange={(e) => {
                                    const newList = e.target.checked
                                      ? [...currentList, opt]
                                      : currentList.filter(item => item !== opt);
                                    setFormFields({ ...formFields, [field.name]: newList });
                                  }}
                                />
                                <span className="checkbox-text-lbl" style={{ fontSize: '0.875rem' }}>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          id={`input-${field.name}`}
                          type="text"
                          className={`form-input ${isSafety ? 'safety-input' : ''}`}
                          value={formFields[field.name] || ''}
                          onChange={(e) => setFormFields({ ...formFields, [field.name]: e.target.value })}
                          required={field.required}
                          disabled={isFormValidated}
                          placeholder={`Enter details...`}
                        />
                      )}
                      
                      {field.hint && <span className="safety-hint-text" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{field.hint}</span>}
                    </div>
                  );
                })}

                {!isFormValidated && (
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    Validate & Save Form ➔
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Summaries & Guardian Access */}
        <div className="summary-access-panel flex-col">
          {/* Record of Consultation Editor */}
          <div className="summary-card glass-card-static flex-col">
            <h3>Record of Consultation</h3>
            <p className="subtitle">Record clinical notes, diagnostic verdicts, and summaries. Click 'Dictate' to speak in real-time.</p>

            <form onSubmit={handleSaveSummary} className="summary-form flex-col">
              <div className="form-group flex-col">
                <div className="flex-row flex-between align-center label-row">
                  <label className="form-label" htmlFor="summary-field">Patient-Facing Summary Note *</label>
                  {isSpeechSupported && (
                    activeDictationField === 'summary' ? (
                      <button
                        type="button"
                        onClick={stopDictation}
                        className="btn-dictate active animate-pulse"
                      >
                        Listening... 🔴 Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startDictation('summary')}
                        className="btn-dictate"
                      >
                        Dictate 🎙️
                      </button>
                    )
                  )}
                </div>
                <textarea
                  id="summary-field"
                  className="form-textarea"
                  value={summaryFields.summary}
                  onChange={(e) => setSummaryFields({ ...summaryFields, summary: e.target.value })}
                  placeholder="Summarize the consultation in simple, clear terms for patient/caregiver visibility..."
                  required
                />
              </div>

              <div className="form-group flex-col">
                <div className="flex-row flex-between align-center label-row">
                  <label className="form-label" htmlFor="verdict-field">Final Verdict / Diagnosis *</label>
                  {isSpeechSupported && (
                    activeDictationField === 'verdict' ? (
                      <button
                        type="button"
                        onClick={stopDictation}
                        className="btn-dictate active animate-pulse"
                      >
                        Listening... 🔴 Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startDictation('verdict')}
                        className="btn-dictate"
                      >
                        Dictate 🎙️
                      </button>
                    )
                  )}
                </div>
                <input
                  id="verdict-field"
                  className="form-input"
                  value={summaryFields.verdict}
                  onChange={(e) => setSummaryFields({ ...summaryFields, verdict: e.target.value })}
                  placeholder="Clinical final verdict/diagnostic summary (e.g. Mild Clinical Anxiety)..."
                  required
                />
              </div>

              <div className="form-group flex-col">
                <div className="flex-row flex-between align-center label-row">
                  <label className="form-label" htmlFor="notes-field">Doctor Notes & Observations</label>
                  {isSpeechSupported && (
                    activeDictationField === 'notes' ? (
                      <button
                        type="button"
                        onClick={stopDictation}
                        className="btn-dictate active animate-pulse"
                      >
                        Listening... 🔴 Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startDictation('notes')}
                        className="btn-dictate"
                      >
                        Dictate 🎙️
                      </button>
                    )
                  )}
                </div>
                <textarea
                  id="notes-field"
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  value={summaryFields.notes}
                  onChange={(e) => setSummaryFields({ ...summaryFields, notes: e.target.value })}
                  placeholder="Detailed observations, diagnostic details, session annotations..."
                />
              </div>

              <button type="submit" className="btn btn-secondary btn-full" disabled={submitting}>
                Save Consultation Record
              </button>
            </form>
          </div>

          {/* Access Control */}
          <div className="access-card glass-card-static flex-col">
            <h3>Guardian Sharing Permissions</h3>
            <p className="subtitle">Configure which linked guardians are allowed to view this summary note.</p>

            <form onSubmit={handleSaveAccess} className="access-form flex-col">
              <ConsentToggle
                label="Primary Family Guardian Access"
                description="Allow patient's family caregiver to see this session note."
                checked={guardian1Access}
                onChange={setGuardian1Access}
              />

              <ConsentToggle
                label="Secondary Health Worker Access"
                description="Allow regional health worker (ASHA/NGO) to see this session note."
                checked={guardian2Access}
                onChange={setGuardian2Access}
              />

              <div className="form-group">
                <label className="form-label" htmlFor="expiry-select">Permission Expiry Duration</label>
                <select
                  id="expiry-select"
                  className="form-select"
                  value={accessExpiry}
                  onChange={(e) => setAccessExpiry(e.target.value)}
                >
                  <option value="30_days">30 Days</option>
                  <option value="90_days">90 Days</option>
                  <option value="180_days">180 Days</option>
                  <option value="permanent">Permanent Access</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-doctor" disabled={submitting}>
                Save Access Rules ➔
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .session-management-page {
          gap: var(--space-xl);
        }

        .session-loading {
          min-height: 400px;
        }

        .session-header-box {
          padding: var(--space-xl);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .sess-id-tag {
          font-size: var(--font-xs);
          color: var(--text-tertiary);
          font-family: monospace;
        }

        .sess-type-tag {
          font-size: var(--font-xs);
          font-weight: 700;
          color: var(--color-doctor-light);
          background: var(--color-doctor-bg);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          width: fit-content;
          margin-top: 4px;
        }

        .session-controls {
          gap: var(--space-md);
          align-items: center;
        }

        .current-status-lbl {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .completed-btn {
          background: linear-gradient(135deg, #10B981, #059669);
        }

        .session-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-xl);
          align-items: start;
        }

        .clinical-work-panel {
          gap: var(--space-xl);
        }

        .pipeline-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .subtitle {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          margin-top: -10px;
        }

        .pipeline-status {
          gap: var(--space-lg);
        }

        .progress-bar {
          align-items: center;
          gap: var(--space-md);
        }

        .progress-track {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--gradient-doctor);
          border-radius: var(--radius-full);
          transition: width var(--transition-base);
        }

        .progress-lbl {
          font-size: var(--font-xs);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .pipeline-steps-list {
          gap: var(--space-sm);
          font-size: var(--font-sm);
        }

        .step-completed {
          color: var(--color-success);
          font-weight: 500;
        }

        .step-pending {
          color: var(--text-muted);
        }

        .clinical-form-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .form-status-tag {
          font-size: var(--font-xs);
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .form-status-tag.pending {
          background: rgba(245, 158, 11, 0.1);
          color: #F59E0B;
        }

        .form-status-tag.validated {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
        }

        .clinical-inputs {
          gap: var(--space-md);
        }

        .safety-critical-field {
          background: rgba(239, 68, 68, 0.02);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          padding: var(--space-md);
          border-radius: var(--radius-md);
        }

        .safety-label {
          color: #EF4444 !important;
          font-weight: 600;
        }

        .safety-input {
          border-color: rgba(239, 68, 68, 0.2);
        }

        .safety-input:focus {
          border-color: #EF4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }

        .safety-hint-text {
          font-size: var(--font-xs);
          color: var(--text-muted);
          margin-top: 2px;
        }

        .summary-access-panel {
          gap: var(--space-xl);
        }

        .summary-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .summary-form {
          gap: var(--space-md);
        }

        .summary-form .form-textarea {
          min-height: 120px;
        }

        .access-card {
          gap: var(--space-md);
          padding: var(--space-xl);
        }

        .access-form {
          gap: var(--space-md);
        }

        .success-banner {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: var(--font-sm);
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #EF4444;
          padding: var(--space-md);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: var(--font-sm);
        }

        .telehealth-video-panel {
          padding: var(--space-xl);
          gap: var(--space-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
        }

        .panel-header h3 {
          font-size: var(--font-lg);
          font-weight: 600;
        }

        .rec-pulse-wrapper {
          gap: 6px;
        }

        .dot-red {
          width: 8px;
          height: 8px;
          background-color: #EF4444;
          border-radius: 50%;
        }

        .rec-time {
          font-size: var(--font-xs);
          font-weight: 700;
          color: #EF4444;
          font-family: monospace;
        }

        .lbl-inactive {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }

        .video-viewport-container {
          gap: var(--space-md);
          min-height: 240px;
        }

        .video-feed-box {
          position: relative;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          overflow: hidden;
          aspect-ratio: 4/3;
        }

        .video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-tag {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          font-size: var(--font-xs);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          backdrop-filter: blur(4px);
        }

        .remote-avatar-icon {
          font-size: 3rem;
        }

        .remote-status-msg {
          font-size: var(--font-xs);
          color: var(--text-muted);
          margin-top: 4px;
        }

        .call-controls {
          gap: var(--space-md);
          padding-top: var(--space-sm);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          align-items: center;
        }

        .btn-icon {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all var(--transition-fast);
        }

        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-icon.muted {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .record-btn {
          font-weight: 600;
        }

        .stop-btn {
          background: linear-gradient(135deg, #10B981, #059669);
          border-color: #10B981;
          font-weight: 600;
        }

        .label-row {
          width: 100%;
          margin-bottom: 4px;
        }

        .btn-dictate {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: var(--color-doctor-light);
          font-size: var(--font-xs);
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-dictate:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .btn-dictate.active {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #EF4444;
        }
      `}</style>
    </div>
  );
}
