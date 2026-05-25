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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white">
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Top Header info */}
        <div className="flex items-center justify-between p-4 bg-slate-950/50 border-b border-slate-800 z-10">
          <div className="flex items-center gap-3">
            {call.call_type === 'emergency' && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <h3 className="font-bold text-base flex items-center gap-2">
              {call.call_type === 'emergency' ? (
                <span className="text-red-500 font-extrabold uppercase tracking-widest text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  Emergency Call
                </span>
              ) : (
                <span className="text-slate-400 font-normal">Video Consultation</span>
              )}
              <span className="text-white">
                {isCaller ? call.callee_name : call.caller_name}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
              Connection: {connectionState}
            </span>
          </div>
        </div>

        {/* Video stream panels container */}
        <div className="flex-1 relative w-full bg-slate-950">
          {callStatus === 'ringing' && !isCaller ? (
            /* Callee incoming ringing panel */
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 mb-6 animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Incoming Video Call</h2>
              <p className="text-slate-400 text-sm max-w-md mb-8">
                {call.caller_name} is initiating a video consultation. Click accept to join the session.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleReject}
                  className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-600/20 flex items-center gap-2"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 transition-all font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  Accept & Join
                </button>
              </div>
            </div>
          ) : callStatus === 'ringing' && isCaller ? (
            /* Caller ringing panel */
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center border border-slate-700 mb-6 animate-bounce">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12 animate-pulse"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0 6-6m-3 18c-3.866 0-7-3.134-7-7s3.134-7 7-7 7 3.134 7 7-3.134 7-7 7ZM10.5 7.062a7.011 7.011 0 0 0-6.938 6.938c0 3.866 3.134 7 7 7a7.011 7.011 0 0 0 6.938-6.938h-7V7.062Z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Ringing...</h2>
              <p className="text-slate-400 text-sm max-w-md mb-8">
                Waiting for {call.callee_name} to answer. Please keep your browser open.
              </p>
              <button
                onClick={handleHangup}
                className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-600/20 flex items-center gap-2"
              >
                Cancel Call
              </button>
            </div>
          ) : (
            /* Call in progress - video layout */
            <div className="relative w-full h-full">
              {/* Remote Video Stream (Main window) */}
              <div className="absolute inset-0 w-full h-full bg-slate-900">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500">
                    <div className="p-4 rounded-full bg-slate-900 border border-slate-800 animate-pulse mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-10 h-10"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm">Connecting {isCaller ? call.callee_name : call.caller_name}...</span>
                  </div>
                )}
              </div>

              {/* Local Video Stream (Picture-in-Picture window) */}
              <div className="absolute top-4 right-4 w-40 h-28 md:w-56 md:h-36 rounded-2xl border-2 border-white/20 bg-slate-950 shadow-2xl overflow-hidden z-20">
                {isCameraOff ? (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50 bg-slate-900 font-semibold">
                    Camera Off
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}
              </div>

              {/* Live Transcript Overlay Panel */}
              {showTranscript && (
                <div className="absolute left-4 bottom-4 w-80 max-h-64 z-30 flex flex-col rounded-2xl bg-slate-950/90 border border-violet-500/30 shadow-xl overflow-hidden">
                  <div className="px-3 py-2 bg-violet-600/20 border-b border-violet-500/30 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">📝 Live Transcript</span>
                    {transcriptSaving && <span className="text-[10px] text-violet-400 animate-pulse">Saving...</span>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 text-[11px]">
                    {liveTranscript.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-4">Transcript will appear here when connected...</p>
                    ) : (
                      liveTranscript.map((seg, idx) => (
                        <div key={idx} className={`flex gap-1.5 ${
                          seg.speaker === 'doctor' ? 'text-teal-300' : 'text-amber-300'
                        }`}>
                          <span className="font-bold capitalize shrink-0">[{seg.speaker}]</span>
                          <span className="text-slate-200">{seg.text}</span>
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
          <div className="p-5 bg-slate-950/90 border-t border-slate-900 z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="hidden sm:block text-slate-400 text-xs font-mono">
              Status: {connectionState}
            </div>

            {/* Core Controls */}
            <div className="flex items-center gap-3">
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-full border transition-all duration-200 ${
                  isMuted
                    ? 'bg-red-500/20 border-red-500/40 text-red-500 hover:bg-red-500/30'
                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM18.57 6.66a.75.75 0 0 0-1.06 1.06 8.25 8.25 0 0 1 0 11.66.75.75 0 1 0 1.06 1.06 9.75 9.75 0 0 0 0-13.78ZM16.03 9.2a.75.75 0 0 0-1.06 1.06 4.75 4.75 0 0 1 0 6.66.75.75 0 0 0 1.06 1.06 6.25 6.25 0 0 0 0-8.78Z" />
                  </svg>
                )}
              </button>

              {/* Camera toggle */}
              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-full border transition-all duration-200 ${
                  isCameraOff
                    ? 'bg-red-500/20 border-red-500/40 text-red-500 hover:bg-red-500/30'
                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                }`}
                title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isCameraOff ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9ZM22.54 6.42a.75.75 0 0 0-.8.04l-4.5 3a.75.75 0 0 0-.34.62v3.84c0 .243.118.47.317.608l4.5 3.1a.75.75 0 0 0 1.203-.61v-9.94c0-.284-.16-.543-.44-.64a.75.75 0 0 0-.34-.02Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9ZM22.54 6.42a.75.75 0 0 0-.8.04l-4.5 3a.75.75 0 0 0-.34.62v3.84c0 .243.118.47.317.608l4.5 3.1a.75.75 0 0 0 1.203-.61v-9.94c0-.284-.16-.543-.44-.64a.75.75 0 0 0-.34-.02Z" />
                  </svg>
                )}
              </button>

              {/* Transcript toggle button */}
              <button
                onClick={() => setShowTranscript((p) => !p)}
                className={`p-3.5 rounded-full border transition-all duration-200 ${
                  showTranscript
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                }`}
                title="Toggle live transcript"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Screen share toggle */}
              <button
                onClick={toggleScreenShare}
                disabled={callStatus !== 'in_progress'}
                className={`p-3.5 rounded-full border transition-all duration-200 ${
                  isScreenSharing
                    ? 'bg-teal-500/20 border-teal-500/40 text-teal-400 hover:bg-teal-500/30'
                    : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M2.25 5.25a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v10.5a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V5.25Zm3.75 8.25v-3H9v3H6Zm0 1.5v1.5a.75.75 0 0 0 .75.75h3v-2.25H6Zm5.25-1.5h1.5v-3h-1.5v3Zm0 1.5v2.25h1.5v-2.25h-1.5Zm3-1.5h2.25v-3h-2.25v3Zm0 1.5v2.25h2.25a.75.75 0 0 0 .75-.75v-1.5h-3ZM18 9v-1.5H6V9h12Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* End Call / Hangup */}
              <button
                onClick={handleHangup}
                className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-600/25 flex items-center gap-2"
                title="Hang up call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c1.358 2.735 3.57 4.947 6.306 6.307l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
                </svg>
                <span>End Call</span>
              </button>
            </div>

            <div className="sm:hidden text-slate-400 text-[10px] font-mono">
              Status: {connectionState}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
