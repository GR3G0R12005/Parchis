import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Video, VideoOff,
  Send, ChevronDown, Headphones,
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { useWebRTC, ChatMessage } from '../hooks/useWebRTC';
import { useVideoFrames } from '../hooks/useVideoFrames';
import { cn } from '../utils';

// ─── Chat bubble ─────────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMessage; isOwn: boolean }> = ({ msg, isOwn }) => (
  <div className={cn('flex gap-2 items-end', isOwn ? 'flex-row-reverse' : 'flex-row')}>
    <img src={msg.avatar} alt={msg.username} className="w-7 h-7 rounded-full object-cover shrink-0 mb-0.5" />
    <div className={cn(
      'max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-snug',
      isOwn ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white/10 text-white/90 rounded-bl-md'
    )}>
      {!isOwn && <p className="text-[10px] font-bold text-white/40 mb-0.5">{msg.username}</p>}
      {msg.text}
    </div>
  </div>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface GameCommsProps {
  socket: Socket | null;
  roomId: string | null;
  currentUser: { id: string; username: string; avatar: string } | null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const GameComms: React.FC<GameCommsProps> = ({ socket, roomId, currentUser }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<'chat' | 'voice'>('chat');
  const [inputText, setInputText] = useState('');
  const [unread, setUnread] = useState(0);

  // Camera stream managed independently from WebRTC (frames via socket.io)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const camPreviewRef = useRef<HTMLVideoElement>(null);

  // WebRTC — only used for audio/mic
  const {
    isInMedia,
    audioEnabled,
    messages,
    joinMedia,
    toggleAudio,
    sendMessage,
  } = useWebRTC(socket, roomId, currentUser);

  // Video frames via socket.io → registry updates avatar <img> elements directly
  useVideoFrames(socket, roomId, currentUser?.id ?? null, cameraStream);

  // Wire camera stream into the footer preview
  useEffect(() => {
    const video = camPreviewRef.current;
    if (!video) return;
    video.muted = true;
    video.srcObject = cameraStream;
    if (cameraStream) video.play().catch(() => {});
  }, [cameraStream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!sheetOpen || tab !== 'chat') setUnread(c => c + 1);
  }, [messages.length]); // eslint-disable-line

  useEffect(() => {
    if (sheetOpen && tab === 'chat') setUnread(0);
  }, [sheetOpen, tab, messages.length]);

  useEffect(() => {
    if (sheetOpen && tab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [sheetOpen, tab]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMicToggle = useCallback(() => {
    if (!isInMedia) {
      joinMedia(false); // First press: request mic and join
    } else {
      toggleAudio();    // Already in: mute/unmute
    }
  }, [isInMedia, joinMedia, toggleAudio]);

  const handleCamToggle = useCallback(async () => {
    if (!cameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setCameraOn(true);
      } catch {
        // Camera not available or permission denied
      }
    } else {
      cameraStream?.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setCameraOn(false);
    }
  }, [cameraOn, cameraStream]);

  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => { setSheetOpen(false); inputRef.current?.blur(); };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const lastMsg = messages[messages.length - 1];
  const micActive = isInMedia && audioEnabled;

  return (
    <>
      {/* ── BOTTOM SHEET ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0f172a] rounded-t-3xl shadow-2xl"
              style={{ maxHeight: '72dvh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Tabs */}
              <div className="flex items-center justify-between px-4 pb-2 shrink-0">
                <div className="flex gap-1">
                  <button
                    onClick={() => setTab('chat')}
                    className={cn(
                      'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                      tab === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'text-white/30 hover:text-white/60'
                    )}
                  >
                    Chat
                    {unread > 0 && tab !== 'chat' && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold">
                        {unread}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTab('voice')}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                      tab === 'voice' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30 hover:text-white/60'
                    )}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    Micrófono
                    {micActive && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                  </button>
                </div>
                <button onClick={closeSheet} className="p-2 rounded-xl hover:bg-white/10 text-white/30 hover:text-white/70 transition-all">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* ── CHAT TAB ────────────────────────────────────────────── */}
              {tab === 'chat' && (
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
                    {messages.length === 0 ? (
                      <p className="text-center text-white/20 text-xs py-8">Nadie ha escrito aún. ¡Rompe el hielo!</p>
                    ) : messages.map(msg => (
                      <Bubble key={msg.id} msg={msg} isOwn={msg.userId === currentUser?.id} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-3 border-t border-white/5 shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-800 border border-white/10">
                      <img src={currentUser?.avatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Escribe algo..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      className="w-9 h-9 flex items-center justify-center bg-blue-500 hover:bg-blue-400 disabled:opacity-30 rounded-xl transition-all active:scale-90 shrink-0"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </>
              )}

              {/* ── MIC TAB ─────────────────────────────────────────────── */}
              {tab === 'voice' && (
                <div className="flex flex-col items-center gap-4 p-6">
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">
                    {micActive ? 'Micrófono activo' : isInMedia ? 'Micrófono silenciado' : 'Micrófono apagado'}
                  </p>
                  <button
                    onClick={handleMicToggle}
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 border-2',
                      micActive
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-white/30'
                    )}
                  >
                    {micActive ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                  </button>
                  <p className="text-white/25 text-xs text-center max-w-[200px]">
                    {isInMedia
                      ? 'Los otros jugadores te escuchan'
                      : 'Toca para activar el micrófono'}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ALWAYS-VISIBLE FOOTER BAR ────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2.5 px-3 py-2.5 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        {/* Avatar / cam preview (shows own camera if active) */}
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-800 border border-white/10">
          {cameraOn
            ? <video ref={camPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            : <img src={currentUser?.avatar} alt="" className="w-full h-full object-cover" />
          }
        </div>

        {/* Fake input — opens chat sheet */}
        <button
          onClick={openSheet}
          className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 h-10 text-left transition-all hover:border-white/20 active:scale-[0.98]"
        >
          {lastMsg && !sheetOpen ? (
            <span className="text-white/35 text-sm truncate">
              <span className="text-white/55 font-medium">{lastMsg.username}: </span>
              {lastMsg.text}
            </span>
          ) : (
            <span className="text-white/25 text-sm">Escribe un mensaje...</span>
          )}
          {unread > 0 && (
            <span className="ml-auto shrink-0 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Mic toggle */}
        <button
          onClick={handleMicToggle}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 border',
            micActive
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-white/5 border-white/10 text-white/40'
          )}
          title={micActive ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
          {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={handleCamToggle}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 border',
            cameraOn
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
              : 'bg-white/5 border-white/10 text-white/40'
          )}
          title={cameraOn ? 'Apagar cámara' : 'Activar cámara'}
        >
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
};
