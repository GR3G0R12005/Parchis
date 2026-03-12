import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useFrameRegistry } from './useVideoFrameRegistry';

/**
 * Captures local camera frames and broadcasts them via socket.io,
 * and receives frames from remote peers.
 * Uses direct DOM ref updates via FrameRegistry to avoid React re-renders.
 */
export function useVideoFrames(
  socket: Socket | null,
  roomId: string | null,
  userId: string | null,
  localStream: MediaStream | null
): void {
  const registry = useFrameRegistry();
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Receive frames from other players
  useEffect(() => {
    if (!socket) return;
    console.log('[VideoFrames] Listener registered — socket.id:', socket.id, 'connected:', socket.connected);
    const onFrame = ({ userId: uid, frame }: { userId: string; frame: string }) => {
      console.log('[VideoFrames] Received frame from userId:', uid?.slice(-6), 'size:', frame.length);
      // Direct DOM update via registry — no React state
      registry.updateFrame(uid, frame);
    };
    socket.on('video-frame', onFrame);
    return () => { socket.off('video-frame', onFrame); };
  }, [socket, registry]);

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
      // Use async toBlob to avoid blocking main thread with JPEG encoding
      canvas.toBlob((blob) => {
        if (!blob) return;
        const frame = URL.createObjectURL(blob);
        socket.emit('video-frame', { roomId, userId, frame });
        if (sent++ === 0) console.log('[VideoFrames] Sending frames — roomId:', roomId, 'userId:', userId?.slice(-6));
        // Update own avatar locally via registry — no React state update
        registry.updateFrame(userId, frame);
      }, 'image/jpeg', 0.55);
    }, 400); // ~2.5 fps — enough for an avatar

    return () => {
      clearInterval(interval);
      video.srcObject = null;
    };
  }, [socket, roomId, userId, localStream, registry]);

  // Clear own frame when camera is turned off
  useEffect(() => {
    if (!localStream && userId) {
      registry.setVideoActive(userId, false);
    }
  }, [localStream, userId, registry]);
}
