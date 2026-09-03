import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';

const ONLINE_WINDOW_MS = 2 * 60000;
function isOnline(iso: string | null | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < ONLINE_WINDOW_MS;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: diffDays < 7 ? 'long' : undefined, day: 'numeric', month: 'long' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const candidate of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return '';
}

function AudioBubble({ src, duration, mine }: { src: string; duration: number | null; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
      <button
        onClick={() => { const el = audioRef.current; if (!el) return; if (playing) el.pause(); else el.play(); }}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: mine ? 'rgba(255,255,255,0.25)' : 'var(--sakura-light)', color: mine ? 'white' : 'var(--sakura-deep)',
        }}
      >
        <Icon emoji={playing ? '⏸️' : '▶️'} size={13} />
      </button>
      <div style={{ flex: 1, height: 3, borderRadius: 99, background: mine ? 'rgba(255,255,255,0.35)' : 'var(--border)' }} />
      <span style={{ fontSize: 11, opacity: 0.85, flexShrink: 0 }}>{duration != null ? formatDuration(duration) : ''}</span>
      <audio ref={audioRef} src={src} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
    </div>
  );
}

interface Props { onBack: () => void; }

export default function Chat({ onBack }: Props) {
  const { state, partnerProfile, sendChatMessage, markChatRead, uploadChatMedia } = useApp();
  const messages = state.chatMessages;
  const partnerName = partnerProfile?.displayName ?? 'Partner';
  const [text, setText] = useState('');
  const [sendingMedia, setSendingMedia] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Real devices only — the desktop mockup frame has no on-screen keyboard to
  // make way for, and forcing this height there would blow past the phone
  // frame and fill the whole browser window instead.
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !window.matchMedia('(max-width: 480px)').matches) return;
    const update = () => setViewportHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  useEffect(() => { markChatRead(); }, [markChatRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, viewportHeight]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage({ text: trimmed });
    setText('');
    inputRef.current?.focus();
  };

  const sendHeart = () => sendChatMessage({ text: '❤️' });

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSendingMedia(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const url = await uploadChatMedia(file, ext);
    setSendingMedia(false);
    if (url) sendChatMessage({ imageUrl: url });
  };

  // Voice messages — tap the mic to start, tap again to stop and send (no
  // press-and-hold, which is unreliable across touch/mouse/desktop preview).
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      // Mic permission denied or unsupported — fail quietly, same as other
      // browser-permission features in this app.
    }
  };

  const stopRecording = (send: boolean) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const duration = recordSeconds;
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setIsRecording(false);
      mediaRecorderRef.current = null;
      if (!send || chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'm4a' : 'webm';
      setSendingMedia(true);
      const url = await uploadChatMedia(blob, ext);
      setSendingMedia(false);
      if (url) sendChatMessage({ audioUrl: url, audioDuration: duration });
    };
    recorder.stop();
  };

  useEffect(() => () => { if (mediaRecorderRef.current) stopRecording(false); }, []);

  const lastMineIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].mine) return i;
    return -1;
  })();

  return (
    <div style={{ height: viewportHeight != null ? `${viewportHeight}px` : '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header — reuses .app-header's real-device safe-area rule (padding-top
          clearing the status bar/notch) so it lines up with the main header. */}
      <div className="app-header" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink)', padding: 4, display: 'flex' }}>
          <Icon emoji="←" size={20} />
        </button>
        <div style={{ position: 'relative' }}>
          <Avatar user={partnerName} size={36} ring />
          {isOnline(partnerProfile?.lastActiveAt) && (
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#3EC46D', border: '2px solid var(--header-bg)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partnerName}</p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{isOnline(partnerProfile?.lastActiveAt) ? 'Active now' : 'Offline'}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: '0 30px' }}>
            <Avatar user={partnerName} size={64} ring />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>{partnerName}</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Say hi to start the conversation 💕</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const startOfGroup = newDay || !prev || prev.mine !== m.mine;
            const endOfGroup = !next || next.mine !== m.mine || dayLabel(next.createdAt) !== dayLabel(m.createdAt);
            const isMedia = !!m.imageUrl;
            return (
              <div key={m.id}>
                {newDay && (
                  <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '14px 0 10px' }}>{dayLabel(m.createdAt)}</p>
                )}
                <div style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6, marginTop: startOfGroup ? 10 : 2 }}>
                  {!m.mine && (
                    <div style={{ width: 24, flexShrink: 0 }}>
                      {endOfGroup && <Avatar user={partnerName} size={24} />}
                    </div>
                  )}
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt="" style={{ maxWidth: '65%', borderRadius: 16, display: 'block' }} />
                  ) : (
                    <div style={{
                      maxWidth: '72%', padding: m.audioUrl ? '8px 12px' : '9px 14px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word',
                      background: m.mine ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--card)',
                      color: m.mine ? 'white' : 'var(--ink)',
                      border: m.mine ? 'none' : '1px solid var(--border)',
                      borderRadius: m.mine
                        ? `18px 18px ${endOfGroup ? 4 : 18}px 18px`
                        : `18px 18px 18px ${endOfGroup ? 4 : 18}px`,
                    }}>
                      {m.audioUrl ? <AudioBubble src={m.audioUrl} duration={m.audioDuration} mine={m.mine} /> : m.text}
                    </div>
                  )}
                </div>
                {i === lastMineIdx && !isMedia && (
                  <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--ink-2)', marginTop: 3, marginRight: 2 }}>
                    {m.read ? 'Seen' : timeLabel(m.createdAt)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input bar — .chat-input-bar (index.css) carries its own real-device
          padding-bottom, independent from the main .app-bottom-nav's, so it
          can be tuned separately for how it sits above the keyboard. */}
      <div className="chat-input-bar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFilePicked} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFilePicked} />

        {isRecording ? (
          <>
            <button onClick={() => stopRecording(false)} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'var(--border)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="✕" size={15} />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="animate-heart-pop" style={{ width: 9, height: 9, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{formatDuration(recordSeconds)}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Recording...</span>
            </div>
            <button onClick={() => stopRecording(true)} style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => galleryInputRef.current?.click()} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="🖼️" size={20} />
            </button>
            <button onClick={() => cameraInputRef.current?.click()} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="📷" size={20} />
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={`Message ${partnerName}...`}
              style={{ flex: 1, minWidth: 0, padding: '9px 14px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none' }}
            />
            {text.trim() ? (
              <button onClick={handleSend} style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              </button>
            ) : (
              <button onClick={startRecording} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon emoji="🎤" size={20} />
              </button>
            )}
            {!text.trim() && (
              <button onClick={sendHeart} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon emoji="❤️" size={22} style={{ color: '#E8517A', fill: '#E8517A' }} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
