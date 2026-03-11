import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Captures local camera frames and broadcasts them via socket.io,
 * and receives frames from remote peers.
 * Key = userId (Supabase UUID), Value = data URL (JPEG)
 */
export function useVideoFrames(
  socket: Socket | null,
  roomId: string | null,
  userId: string | null,
  localStream: MediaStream | null
): Map<string, string> {
  const [frames, setFrames] = useState<Map<string, string>>(new Map());
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Receive frames from other players
  useEffect(() => {
    if (!socket) return;
    console.log('[VideoFrames] Listener registered — socket.id:', socket.id, 'connected:', socket.connected);
    const onFrame = ({ userId: uid, frame }: { userId: string; frame: string }) => {
      console.log('[VideoFrames] Received frame from userId:', uid?.slice(-6), 'size:', frame.length);
      setFrames(prev => {
        const next = new Map(prev);
        next.set(uid, frame);
        return next;
      });
    };
    socket.on('video-frame', onFrame);
    return () => { socket.off('video-frame', onFrame); };
  }, [socket]);

  // Send own frames when local camera is active
  useEffect(() => {
    if (!socket || !roomId || !userId || !localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (!videoTracks.length) return; // audio-only, nothing to send

    // Create hidden video element to read frames from
    if (!videoElRef.current) {
      videoElRef.current = document.createElement('video');
      videoElRef.current.playsInline = true;
      videoElRef.current.muted = true;
    }
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 96;
      canvasRef.current.height = 96;
    }

    const video = videoElRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    video.srcObject = localStream;
    video.play().catch(() => {});

    let sent = 0;
    const interval = setInterval(() => {
      if (video.readyState < 2) return; // not ready yet
      ctx.drawImage(video, 0, 0, 96, 96);
      const frame = canvas.toDataURL('image/jpeg', 0.55);
      socket.emit('video-frame', { roomId, userId, frame });
      if (sent++ === 0) console.log('[VideoFrames] Sending frames — roomId:', roomId, 'userId:', userId?.slice(-6));
      // Update own avatar locally too
      setFrames(prev => {
        const next = new Map(prev);
        next.set(userId, frame);
        return next;
      });
    }, 400); // ~2.5 fps — enough for an avatar

    return () => {
      clearInterval(interval);
      video.srcObject = null;
    };
  }, [socket, roomId, userId, localStream]);

  // Clear own frame when camera is turned off
  useEffect(() => {
    if (!localStream && userId) {
      setFrames(prev => {
        if (!prev.has(userId)) return prev; // already absent — bail out, no re-render
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [localStream, userId]);

  return frames;
}
