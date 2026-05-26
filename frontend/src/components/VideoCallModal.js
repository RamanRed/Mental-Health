'use client';

import React, { useState, useEffect, useRef } from 'react';
import { acceptVideoCall, rejectVideoCall, endVideoCall, sendCallSignal, saveCallTranscript } from '../lib/api';

export default function VideoCallModal({ call, currentUser, onClose, onCallEnded }) {
  const [callStatus, setCallStatus] = useState(call.status); // ringing, in_progress, ended, rejected
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('Initializing...');

  // Live Transcript State
  const [liveTranscript, setLiveTranscript] = useState([]); // [{speaker, text, timestamp}]
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptSaving, setTranscriptSaving] = useState(false);
  const recognitionRef = useRef(null);
  const callStartTimeRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const sseRef = useRef(null);
  const candidatesQueueRef = useRef([]);

  const isCaller = call.caller_id === currentUser.id;

  // Start live speech-to-text transcript (Web Speech API)
  const startLiveTranscript = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript.trim();
      if (!text) return;
      const seg = {
        speaker: isCaller ? 'doctor' : 'patient',
        text,
        timestamp: callStartTimeRef.current ? (Date.now() - callStartTimeRef.current) / 1000 : 0,
      };
      setLiveTranscript((prev) => [...prev, seg]);
    };
    recognition.onerror = () => {};
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopLiveTranscript = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
  };

  const persistTranscript = async (segments, consultationId = null) => {
    if (!segments || segments.length === 0) return;
    setTranscriptSaving(true);
    try {
      const raw = segments.map((s) => `[${s.speaker}]: ${s.text}`).join('\n');
      await saveCallTranscript({
        call_id: call.id,
        consultation_id: consultationId || call.session_id || null,
        raw_transcript: raw,
        segments,
        duration_seconds: callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : null,
        source: 'live',
      });
    } catch (err) {
      console.error('Failed to save transcript:', err);
    } finally {
      setTranscriptSaving(false);
    }
  };

  // Configuration for RTCPeerConnection
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // 1. Acquire Local Camera and Microphone
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // If Caller: Automatically initialize WebRTC connection & signaling
        if (isCaller) {
          initializeWebRTC(stream);
        } else if (callStatus === 'in_progress') {
          // If Callee and already in progress (after accepting)
          initializeWebRTC(stream);
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setConnectionState('Camera/Mic permission denied');
      }
    }

    startMedia();

    // 2. Subscribe to Signaling Stream via SSE
    const token = localStorage.getItem('manas_token');
    const sseUrl = `http://localhost:8000/api/calls/${call.id}/signal/stream?token=${token}`;
    const sse = new EventSource(sseUrl);
    sseRef.current = sse;

    sse.addEventListener('signal', async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received signal event:', data);

      if (data.type === 'offer') {
        await handleOffer(data.payload);
      } else if (data.type === 'answer') {
        await handleAnswer(data.payload);
      } else if (data.type === 'candidate') {
        await handleCandidate(data.payload);
      } else if (data.type === 'accept') {
        setCallStatus('in_progress');
        setConnectionState('Connecting...');
        // Start WebRTC if local stream is ready
        if (localStream) {
          initializeWebRTC(localStream);
        }
      } else if (data.type === 'reject') {
        setCallStatus('rejected');
        setConnectionState('Call declined');
        cleanUp();
      } else if (data.type === 'hangup') {
        setCallStatus('ended');
        setConnectionState('Call ended');
        cleanUp();
      }
    });

    sse.addEventListener('connect', (event) => {
      console.log('Signaling stream connected successfully');
    });

    sse.onerror = (err) => {
      console.error('Signaling stream connection error:', err);
    };

    return () => {
      cleanUp();
    };
  }, [callStatus]);

  // Clean up streams & peer connection
  const cleanUp = (segments = []) => {
    stopLiveTranscript();
    if (segments.length > 0) {
      persistTranscript(segments);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  };

  // Initialize RTCPeerConnection
  const initializeWebRTC = (stream) => {
    if (pcRef.current) return;

    setConnectionState('Connecting peer...');
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // Add local tracks to connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote media track reception
    pc.ontrack = (event) => {
      console.log('Received remote stream track:', event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setConnectionState('Connected');
      }
    };

    // Gather ICE candidates and send to signaling channel
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(call.id, {
          type: 'candidate',
          payload: event.candidate.toJSON()
        }).catch(err => console.error('Error sending ICE candidate:', err));
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionState('Connected');
        // Start live transcript when truly connected
        callStartTimeRef.current = Date.now();
        startLiveTranscript();
      } else if (pc.connectionState === 'failed') {
        setConnectionState('Connection failed, retrying...');
      } else if (pc.connectionState === 'disconnected') {
        setConnectionState('Peer disconnected');
      }
    };

    // If caller: Generate and send SDP Offer
    if (isCaller) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          return sendCallSignal(call.id, {
            type: 'offer',
            payload: pc.localDescription
          });
        })
        .catch((err) => console.error('Error creating offer:', err));
    }
  };

  // Handle incoming SDP Offer
  const handleOffer = async (offer) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer
      await sendCallSignal(call.id, {
        type: 'answer',
        payload: answer
      });

      // Process any queued candidates
      while (candidatesQueueRef.current.length > 0) {
        const candidate = candidatesQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error handling SDP offer:', err);
    }
  };

  // Handle incoming SDP Answer
  const handleAnswer = async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling SDP answer:', err);
    }
  };

  // Handle incoming ICE Candidate
  const handleCandidate = async (candidate) => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    } else {
      // Queue candidate if connection not fully established
      candidatesQueueRef.current.push(candidate);
    }
  };

  // User Actions: Answer
  const handleAccept = async () => {
    try {
      await acceptVideoCall(call.id);
      setCallStatus('in_progress');
      if (localStream) {
        initializeWebRTC(localStream);
      }
    } catch (err) {
      console.error('Failed to accept call:', err);
    }
  };

  // User Actions: Reject/Decline
  const handleReject = async () => {
    try {
      await rejectVideoCall(call.id);
      setCallStatus('rejected');
      cleanUp();
      if (onCallEnded) onCallEnded();
      onClose();
    } catch (err) {
      console.error('Failed to reject call:', err);
    }
  };

  // User Actions: Hang up
  const handleHangup = async () => {
    try {
      await endVideoCall(call.id);
      setCallStatus('ended');
      cleanUp(liveTranscript);
      if (onCallEnded) onCallEnded();
      onClose();
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Screen Share toggle
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        if (pcRef.current) {
          const senders = pcRef.current.getSenders();
          const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        }

        // Replace local stream view
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        videoTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
    setIsScreenSharing(false);
  };

  return (
    <div className="vcall-overlay">
      <div className="vcall-container">
        
        {/* Top Header info */}
        <div className="vcall-header">
          <div className="vcall-header-left">
            {call.call_type === 'emergency' && (
              <span className="emergency-indicator">
                <span className="emergency-indicator-wave"></span>
                <span className="emergency-indicator-dot"></span>
              </span>
            )}
            <h3 className="vcall-title">
              {call.call_type === 'emergency' ? (
                <span className="emergency-label">
                  Emergency Call
                </span>
              ) : (
                <span className="non-emergency-label">Video Consultation</span>
              )}
              <span className="peer-name">
                {isCaller ? call.callee_name : call.caller_name}
              </span>
            </h3>
          </div>
          <div>
            <span className="connection-state-badge">
              Connection: {connectionState}
            </span>
          </div>
        </div>

        {/* Video stream panels container */}
        <div className="vcall-body">
          {callStatus === 'ringing' && !isCaller ? (
            /* Callee incoming ringing panel */
            <div className="ringing-panel">
              <div className="ringing-icon-wrapper callee">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="ringing-icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
              <h2 className="ringing-title">Incoming Video Call</h2>
              <p className="ringing-desc">
                {call.caller_name} is initiating a video consultation. Click accept to join the session.
              </p>
              <div className="ringing-actions">
                <button
                  onClick={handleReject}
                  className="decline-btn"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="accept-btn"
                >
                  Accept & Join
                </button>
              </div>
            </div>
          ) : callStatus === 'ringing' && isCaller ? (
            /* Caller ringing panel */
            <div className="ringing-panel">
              <div className="ringing-icon-wrapper caller">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="ringing-icon pulse"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0 6-6m-3 18c-3.866 0-7-3.134-7-7s3.134-7 7-7 7 3.134 7 7-3.134 7-7 7ZM10.5 7.062a7.011 7.011 0 0 0-6.938 6.938c0 3.866 3.134 7 7 7a7.011 7.011 0 0 0 6.938-6.938h-7V7.062Z"
                  />
                </svg>
              </div>
              <h2 className="ringing-title">Ringing...</h2>
              <p className="ringing-desc">
                Waiting for {call.callee_name} to answer. Please keep your browser open.
              </p>
              <button
                onClick={handleHangup}
                className="cancel-call-btn"
              >
                Cancel Call
              </button>
            </div>
          ) : (
            /* Call in progress - video layout */
            <div className="active-call-layout">
              {/* Remote Video Stream (Main window) */}
              <div className="remote-video-container">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="remote-video"
                  />
                ) : (
                  <div className="remote-video-placeholder">
                    <div className="placeholder-icon-wrapper">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="placeholder-icon"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    </div>
                    <span className="placeholder-text">Connecting {isCaller ? call.callee_name : call.caller_name}...</span>
                  </div>
                )}
              </div>

              {/* Local Video Stream (Picture-in-Picture window) */}
              <div className="local-video-container">
                {isCameraOff ? (
                  <div className="local-video-off-label">
                    Camera Off
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="local-video"
                  />
                )}
              </div>

              {/* Live Transcript Overlay Panel */}
              {showTranscript && (
                <div className="live-transcript-panel">
                  <div className="live-transcript-header">
                    <span className="live-transcript-title">📝 Live Transcript</span>
                    {transcriptSaving && <span className="live-transcript-saving">Saving...</span>}
                  </div>
                  <div className="live-transcript-body">
                    {liveTranscript.length === 0 ? (
                      <p className="live-transcript-empty">Transcript will appear here when connected...</p>
                    ) : (
                      liveTranscript.map((seg, idx) => (
                        <div key={idx} className={`transcript-segment ${seg.speaker}`}>
                          <span className="transcript-speaker">[{seg.speaker}]</span>
                          <span className="transcript-text">{seg.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        {(callStatus === 'in_progress' || isCaller) && (
          <div className="vcall-footer">
            <div className="vcall-footer-status">
              Status: {connectionState}
            </div>

            {/* Core Controls */}
            <div className="control-buttons-wrapper">
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`control-btn ${isMuted ? 'muted' : ''}`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM18.57 6.66a.75.75 0 0 0-1.06 1.06 8.25 8.25 0 0 1 0 11.66.75.75 0 1 0 1.06 1.06 9.75 9.75 0 0 0 0-13.78ZM16.03 9.2a.75.75 0 0 0-1.06 1.06 4.75 4.75 0 0 1 0 6.66.75.75 0 0 0 1.06 1.06 6.25 6.25 0 0 0 0-8.78Z" />
                  </svg>
                )}
              </button>

              {/* Camera toggle */}
              <button
                onClick={toggleCamera}
                className={`control-btn ${isCameraOff ? 'muted' : ''}`}
                title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isCameraOff ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9ZM22.54 6.42a.75.75 0 0 0-.8.04l-4.5 3a.75.75 0 0 0-.34.62v3.84c0 .243.118.47.317.608l4.5 3.1a.75.75 0 0 0 1.203-.61v-9.94c0-.284-.16-.543-.44-.64a.75.75 0 0 0-.34-.02Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9ZM22.54 6.42a.75.75 0 0 0-.8.04l-4.5 3a.75.75 0 0 0-.34.62v3.84c0 .243.118.47.317.608l4.5 3.1a.75.75 0 0 0 1.203-.61v-9.94c0-.284-.16-.543-.44-.64a.75.75 0 0 0-.34-.02Z" />
                  </svg>
                )}
              </button>

              {/* Transcript toggle button */}
              <button
                onClick={() => setShowTranscript((p) => !p)}
                className={`control-btn ${showTranscript ? 'active-violet' : ''}`}
                title="Toggle live transcript"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Screen share toggle */}
              <button
                onClick={toggleScreenShare}
                disabled={callStatus !== 'in_progress'}
                className={`control-btn ${isScreenSharing ? 'active-teal' : ''}`}
                title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M2.25 5.25a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v10.5a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V5.25Zm3.75 8.25v-3H9v3H6Zm0 1.5v1.5a.75.75 0 0 0 .75.75h3v-2.25H6Zm5.25-1.5h1.5v-3h-1.5v3Zm0 1.5v2.25h1.5v-2.25h-1.5Zm3-1.5h2.25v-3h-2.25v3Zm0 1.5v2.25h2.25a.75.75 0 0 0 .75-.75v-1.5h-3ZM18 9v-1.5H6V9h12Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* End Call / Hangup */}
              <button
                onClick={handleHangup}
                className="hangup-btn"
                title="Hang up call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c1.358 2.735 3.57 4.947 6.306 6.307l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
                </svg>
                <span>End Call</span>
              </button>
            </div>

            <div className="vcall-footer-status-mobile">
              Status: {connectionState}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .vcall-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(12px);
          padding: 16px;
          color: white;
        }
        .vcall-container {
          position: relative;
          width: 100%;
          max-width: 896px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .vcall-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: rgba(2, 6, 23, 0.5);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 10;
        }
        .vcall-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .emergency-indicator {
          display: flex;
          height: 12px;
          width: 12px;
          position: relative;
        }
        .emergency-indicator-wave {
          position: absolute;
          display: inline-flex;
          height: 100%;
          width: 100%;
          border-radius: 9999px;
          background: #f87171;
          opacity: 0.75;
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .emergency-indicator-dot {
          position: relative;
          display: inline-flex;
          border-radius: 9999px;
          height: 12px;
          width: 12px;
          background: #ef4444;
        }
        .vcall-title {
          font-weight: 700;
          font-size: var(--font-base);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .emergency-label {
          color: #ef4444;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: var(--font-xs);
          background: rgba(239, 68, 68, 0.1);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .non-emergency-label {
          color: var(--text-muted);
          font-weight: 400;
        }
        .peer-name {
          color: white;
        }
        .connection-state-badge {
          font-size: var(--font-xs);
          padding: 4px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }
        .vcall-body {
          flex: 1;
          position: relative;
          width: 100%;
          background: #020617;
        }
        .ringing-panel {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }
        .ringing-icon-wrapper {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .ringing-icon-wrapper.callee {
          background: rgba(13, 148, 136, 0.2);
          color: #2dd4bf;
          border: 1px solid rgba(13, 148, 136, 0.3);
          animation: pulse 2s infinite;
        }
        .ringing-icon-wrapper.caller {
          background: rgba(30, 41, 59, 0.8);
          color: #2dd4bf;
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: bounce 1s infinite;
        }
        .ringing-icon {
          width: 48px;
          height: 48px;
        }
        .ringing-icon.pulse {
          animation: pulse 2s infinite;
        }
        .ringing-title {
          font-size: var(--font-2xl);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .ringing-desc {
          color: var(--text-muted);
          font-size: var(--font-sm);
          max-width: 448px;
          margin-bottom: 32px;
        }
        .ringing-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .decline-btn {
          padding: 12px 24px;
          border-radius: 9999px;
          background: #dc2626;
          color: white;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.2);
        }
        .decline-btn:hover {
          background: #b91c1c;
        }
        .accept-btn {
          padding: 12px 32px;
          border-radius: 9999px;
          background: #059669;
          color: white;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.2);
        }
        .accept-btn:hover {
          background: #047857;
        }
        .cancel-call-btn {
          padding: 12px 24px;
          border-radius: 9999px;
          background: #dc2626;
          color: white;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.2);
        }
        .cancel-call-btn:hover {
          background: #b91c1c;
        }
        .active-call-layout {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .remote-video-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #0f172a;
        }
        .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .remote-video-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #020617;
          color: var(--text-muted);
        }
        .placeholder-icon-wrapper {
          padding: 16px;
          border-radius: 50%;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          animation: pulse 2s infinite;
          margin-bottom: 16px;
        }
        .placeholder-icon {
          width: 40px;
          height: 40px;
        }
        .placeholder-text {
          font-size: var(--font-sm);
        }
        .local-video-container {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 160px;
          height: 112px;
          border-radius: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: #020617;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          z-index: 20;
        }
        @media (min-width: 768px) {
          .local-video-container {
            width: 224px;
            height: 144px;
          }
        }
        .local-video-off-label {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          background: #0f172a;
          font-weight: 600;
        }
        .local-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .live-transcript-panel {
          position: absolute;
          left: 16px;
          bottom: 16px;
          width: 320px;
          max-height: 256px;
          z-index: 30;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          background: rgba(2, 6, 23, 0.9);
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .live-transcript-header {
          padding: 8px 12px;
          background: rgba(139, 92, 246, 0.2);
          border-bottom: 1px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .live-transcript-title {
          font-size: 11px;
          font-weight: 700;
          color: #c084fc;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .live-transcript-saving {
          font-size: 10px;
          color: #a78bfa;
          animation: pulse 2s infinite;
        }
        .live-transcript-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
        }
        .live-transcript-empty {
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          padding: 16px 0;
        }
        .transcript-segment {
          display: flex;
          gap: 6px;
        }
        .transcript-segment.doctor {
          color: #67e8f9;
        }
        .transcript-segment.patient {
          color: #fde047;
        }
        .transcript-speaker {
          font-weight: 700;
          text-transform: capitalize;
          flex-shrink: 0;
        }
        .transcript-text {
          color: #e2e8f0;
        }
        .vcall-footer {
          padding: 20px;
          background: rgba(2, 6, 23, 0.9);
          border-top: 1px solid #0f172a;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .vcall-footer {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .vcall-footer-status {
          display: none;
          color: var(--text-muted);
          font-size: var(--font-xs);
          font-family: monospace;
        }
        @media (min-width: 640px) {
          .vcall-footer-status {
            display: block;
          }
        }
        .vcall-footer-status-mobile {
          color: var(--text-muted);
          font-size: 10px;
          font-family: monospace;
        }
        @media (min-width: 640px) {
          .vcall-footer-status-mobile {
            display: none;
          }
        }
        .control-buttons-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .control-btn {
          padding: 14px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #1e293b;
          color: white;
          transition: all 0.2s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .control-btn:hover {
          background: #334155;
        }
        .control-btn.muted {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }
        .control-btn.muted:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        .control-btn.active-violet {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
          color: #c084fc;
        }
        .control-btn.active-teal {
          background: rgba(13, 148, 136, 0.2);
          border-color: rgba(13, 148, 136, 0.4);
          color: #2dd4bf;
        }
        .control-btn.active-teal:hover {
          background: rgba(13, 148, 136, 0.3);
        }
        .control-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .control-btn svg {
          width: 20px;
          height: 20px;
        }
        .hangup-btn {
          padding: 12px 24px;
          border-radius: 9999px;
          background: #dc2626;
          color: white;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.25);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hangup-btn:hover {
          background: #b91c1c;
        }
        .hangup-btn svg {
          width: 20px;
          height: 20px;
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `}</style>
    </div>
  );
}
