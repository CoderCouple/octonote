import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/api/client';
import './meeting.css';

interface MeetingRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

type Phase = 'idle' | 'requesting' | 'recording' | 'uploading' | 'transcribing' | 'error';

/**
 * Modal recorder. Captures the mic + (optionally) the user's tab audio, mixes
 * them via Web Audio, and uploads the recorded blob to /api/meetings/transcribe.
 * On success, navigates to the created meeting note.
 */
export function MeetingRecorder({ open, onOpenChange, projectId }: MeetingRecorderProps) {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [captureTab, setCaptureTab] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setSeconds(0);
    setAudioLevel(0);
  }, []);

  // Reset state whenever the modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setPhase('idle');
      setError(null);
    }
  }, [open, reset]);

  const startRecording = useCallback(async () => {
    setError(null);
    setPhase('requesting');
    try {
      // Mic
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamsRef.current.push(micStream);

      // Optional: tab audio (system audio not available without an Electron helper)
      let tabStream: MediaStream | null = null;
      if (captureTab) {
        try {
          const display = await navigator.mediaDevices.getDisplayMedia({
            video: true, // required by spec; we drop the video track immediately
            audio: true,
          });
          // Drop the video track — we only want the audio
          display.getVideoTracks().forEach((t) => t.stop());
          if (display.getAudioTracks().length > 0) {
            tabStream = new MediaStream(display.getAudioTracks());
            streamsRef.current.push(tabStream);
          } else {
            display.getTracks().forEach((t) => t.stop());
            console.warn('Tab share did not include audio — recording mic only.');
          }
        } catch {
          // User cancelled or denied — fall back to mic only.
        }
      }

      // Mix mic + tab into one stream via Web Audio
      const ac = new AudioContext();
      audioContextRef.current = ac;
      const destination = ac.createMediaStreamDestination();

      ac.createMediaStreamSource(micStream).connect(destination);
      if (tabStream) {
        ac.createMediaStreamSource(tabStream).connect(destination);
      }

      // Audio-level meter taps the mixed signal
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      ac.createMediaStreamSource(destination.stream).connect(analyser);
      analyserRef.current = analyser;
      const meterBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      const tick = () => {
        analyser.getByteFrequencyData(meterBuf);
        let sum = 0;
        for (let i = 0; i < meterBuf.length; i++) sum += meterBuf[i];
        setAudioLevel((sum / meterBuf.length) / 255);
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Recorder
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000); // emit chunks every 1s
      recorderRef.current = recorder;

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
      reset();
    }
  }, [captureTab, reset]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setPhase('uploading');

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    chunksRef.current = [];

    // Free the mic and any tab streams now that we have the blob.
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }

    try {
      setPhase('transcribing');
      const note = await api.meetings.transcribe(blob, { projectId });
      onOpenChange(false);
      navigate(`/notes/${note.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [navigate, onOpenChange, projectId]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="meeting-recorder">
        <DialogTitle className="meeting-recorder-title">
          {phase === 'recording' ? 'Recording…' : 'New meeting'}
        </DialogTitle>
        <DialogDescription className="meeting-recorder-description">
          {phase === 'idle' || phase === 'error'
            ? 'Captures your microphone plus the browser tab you select. Stop to transcribe.'
            : phase === 'requesting'
              ? 'Waiting for microphone / tab permission…'
              : phase === 'recording'
                ? 'Talk away — the audio is being captured locally and uploaded only when you stop.'
                : phase === 'uploading'
                  ? 'Uploading audio…'
                  : 'Transcribing with Whisper and summarising with Claude…'}
        </DialogDescription>

        <div className="meeting-recorder-body">
          {(phase === 'idle' || phase === 'error') && (
            <>
              <label className="meeting-recorder-toggle">
                <input
                  type="checkbox"
                  checked={captureTab}
                  onChange={(e) => setCaptureTab(e.target.checked)}
                />
                <span>Also capture audio from a browser tab (Zoom Web / Google Meet / etc.)</span>
              </label>
              {error && <div className="meeting-recorder-error">{error}</div>}
              <Button onClick={startRecording} className="meeting-recorder-start">
                <Mic size={16} /> Start recording
              </Button>
            </>
          )}

          {phase === 'requesting' && (
            <div className="meeting-recorder-status">
              <Loader2 className="spin" size={20} /> Requesting permission…
            </div>
          )}

          {phase === 'recording' && (
            <>
              <div className="meeting-recorder-timer">{formatTime(seconds)}</div>
              <div className="meeting-recorder-meter">
                <div
                  className="meeting-recorder-meter-fill"
                  style={{ width: `${Math.min(100, audioLevel * 200)}%` }}
                />
              </div>
              <Button variant="destructive" onClick={stopRecording} className="meeting-recorder-stop">
                <Square size={14} /> Stop and transcribe
              </Button>
            </>
          )}

          {(phase === 'uploading' || phase === 'transcribing') && (
            <div className="meeting-recorder-status">
              <Loader2 className="spin" size={20} />{' '}
              {phase === 'uploading' ? 'Uploading audio…' : 'Generating summary…'}
            </div>
          )}
        </div>

        <button
          className="meeting-recorder-close"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X size={16} />
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Pick a MediaRecorder MIME type that the current browser actually supports. */
function pickSupportedMimeType(): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}
