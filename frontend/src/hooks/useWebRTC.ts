import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface PeerState {
  userId: string;
  username: string;
  avatar: string;
  stream: MediaStream | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  ts: number;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free public TURN relay — needed when players are on different networks
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export function useWebRTC(
  socket: Socket | null,
  roomId: string | null,
  currentUser: { id: string; username: string; avatar: string } | null
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isInMedia, setIsInMedia] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Refs for mutable state that shouldn't trigger re-renders
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerInfoRef = useRef<Map<string, { userId: string; username: string; avatar: string }>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  // Accumulate remote tracks per peer so we don't rely on event.streams
  const peerTracksRef = useRef<Map<string, MediaStreamTrack[]>>(new Map());
  // Keep refs in sync for use inside closures
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const createPC = useCallback((socketId: string, userId: string, username: string, avatar: string): RTCPeerConnection => {
    console.log('[WebRTC] createPC for', username, '(userId:', userId, ', socketId:', socketId, ')');
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    const localTracks = localStreamRef.current?.getTracks() ?? [];
    console.log('[WebRTC] Adding', localTracks.length, 'local tracks to PC for', username);
    localTracks.forEach(track => pc.addTrack(track, localStreamRef.current!));

    // Send ICE candidates to the remote peer via signaling
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current?.emit('webrtc-ice', { to: socketId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state with', username, ':', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state with', username, ':', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        pcsRef.current.delete(socketId);
        peerTracksRef.current.delete(socketId);
        setPeers(prev => {
          const next = new Map<string, PeerState>(prev);
          next.delete(socketId);
          return next;
        });
      }
    };

    // Accumulate remote tracks and build a fresh MediaStream on each arrival.
    // Using a fresh object per update ensures React detects the change even
    // when the same peer sends multiple tracks (audio + video).
    pc.ontrack = ({ track }) => {
      console.log('[WebRTC] ontrack from', username, '- kind:', track.kind, 'readyState:', track.readyState);
      if (!peerTracksRef.current.has(socketId)) {
        peerTracksRef.current.set(socketId, []);
      }
      const tracks = peerTracksRef.current.get(socketId)!;
      if (!tracks.find(t => t.id === track.id)) tracks.push(track);

      // New MediaStream instance → forces React / useEffect in VideoTile to run
      const stream = new MediaStream(tracks);
      console.log('[WebRTC] Stream for', username, 'now has', tracks.length, 'tracks');
      setPeers(prev => {
        const next = new Map<string, PeerState>(prev);
        const existing = next.get(socketId);
        next.set(socketId, existing
          ? { userId: existing.userId, username: existing.username, avatar: existing.avatar, stream }
          : { userId, username, avatar, stream }
        );
        return next;
      });
    };

    pcsRef.current.set(socketId, pc);
    peerInfoRef.current.set(socketId, { userId, username, avatar });

    // Add placeholder so UI shows the peer immediately
    setPeers(prev => {
      const next = new Map<string, PeerState>(prev);
      if (!next.has(socketId)) next.set(socketId, { userId, username, avatar, stream: null });
      return next;
    });

    return pc;
  }, []);

  const applyPendingIce = async (socketId: string, pc: RTCPeerConnection) => {
    const candidates = pendingIceRef.current.get(socketId) ?? [];
    for (const c of candidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingIceRef.current.delete(socketId);
  };

  // Setup all socket listeners
  useEffect(() => {
    if (!socket) return;

    // Server returns existing media peers when we join
    const onMediaPeers = async (existingPeers: { socketId: string; userId: string; username: string; avatar: string }[]) => {
      console.log('[WebRTC] media-peers received, count:', existingPeers.length);
      for (const peer of existingPeers) {
        console.log('[WebRTC] Creating offer for existing peer:', peer.username);
        const pc = createPC(peer.socketId, peer.userId, peer.username, peer.avatar);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { to: peer.socketId, offer });
        console.log('[WebRTC] Offer sent to', peer.username);
      }
    };

    // A new peer joined while we're already in — they'll send us an offer, just cache their info
    const onPeerJoinedMedia = ({ socketId, userId, username, avatar }: {
      socketId: string; userId: string; username: string; avatar: string;
    }) => {
      console.log('[WebRTC] peer-joined-media:', username, '(userId:', userId, ')');
      peerInfoRef.current.set(socketId, { userId, username, avatar });
      setPeers(prev => {
        const next = new Map<string, PeerState>(prev);
        if (!next.has(socketId)) next.set(socketId, { userId, username, avatar, stream: null });
        return next;
      });
    };

    // Peer left media — close their connection
    const onPeerLeftMedia = ({ socketId }: { socketId: string }) => {
      pcsRef.current.get(socketId)?.close();
      pcsRef.current.delete(socketId);
      peerInfoRef.current.delete(socketId);
      peerTracksRef.current.delete(socketId);
      setPeers(prev => {
        const next = new Map<string, PeerState>(prev);
        next.delete(socketId);
        return next;
      });
    };

    // We received an offer — create answer
    const onOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const info = peerInfoRef.current.get(from) ?? { userId: '', username: 'Unknown', avatar: '' };
      console.log('[WebRTC] Received offer from', info.username, '(socketId:', from, ')');
      let pc = pcsRef.current.get(from);
      if (!pc) {
        pc = createPC(from, info.userId, info.username, info.avatar);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await applyPendingIce(from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { to: from, answer });
      console.log('[WebRTC] Answer sent to', info.username);
    };

    // We received an answer to our offer
    const onAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const info = peerInfoRef.current.get(from);
      console.log('[WebRTC] Received answer from', info?.username ?? from);
      const pc = pcsRef.current.get(from);
      if (!pc) { console.warn('[WebRTC] No PC found for', from); return; }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await applyPendingIce(from, pc);
    };

    // ICE candidate from a peer
    const onIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcsRef.current.get(from);
      if (pc?.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        // Buffer until remote description is set
        if (!pendingIceRef.current.has(from)) pendingIceRef.current.set(from, []);
        pendingIceRef.current.get(from)!.push(candidate);
      }
    };

    // Incoming chat message
    const onChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on('media-peers', onMediaPeers);
    socket.on('peer-joined-media', onPeerJoinedMedia);
    socket.on('peer-left-media', onPeerLeftMedia);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice', onIce);
    socket.on('chat-message', onChatMessage);

    return () => {
      socket.off('media-peers', onMediaPeers);
      socket.off('peer-joined-media', onPeerJoinedMedia);
      socket.off('peer-left-media', onPeerLeftMedia);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice', onIce);
      socket.off('chat-message', onChatMessage);
    };
  }, [socket, createPC]);

  // Cleanup all connections on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcsRef.current.forEach(pc => pc.close());
    };
  }, []);

  const joinMedia = useCallback(async (withVideo: boolean) => {
    if (!socket || !roomId || !currentUser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(withVideo);
      setIsInMedia(true);
      socket.emit('join-media', {
        roomId,
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
      });
    } catch {
      // Fallback: audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setAudioEnabled(true);
        setVideoEnabled(false);
        setIsInMedia(true);
        socket.emit('join-media', {
          roomId,
          userId: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
        });
      } catch (e) {
        console.error('Could not access microphone:', e);
      }
    }
  }, [socket, roomId, currentUser]);

  const leaveMedia = useCallback(() => {
    if (!socket || !roomId) return;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    peerInfoRef.current.clear();
    peerTracksRef.current.clear();
    setPeers(new Map());
    setIsInMedia(false);
    socket.emit('leave-media', { roomId });
  }, [socket, roomId]);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioEnabled(track.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!socket || !roomId || !currentUser || !text.trim()) return;
    socket.emit('chat-message', {
      roomId,
      text: text.trim(),
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
    });
  }, [socket, roomId, currentUser]);

  return {
    localStream,
    peers,
    audioEnabled,
    videoEnabled,
    isInMedia,
    messages,
    joinMedia,
    leaveMedia,
    toggleAudio,
    toggleVideo,
    sendMessage,
  };
}
