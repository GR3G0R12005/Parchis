import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { ParchisBoard } from './components/Board';
import { HUD, GamePlayerRow } from './components/HUD';
import { Navbar } from './components/Navbar';
import { GameState, Token, PlayerColor } from './types';
import { cn } from './utils';
import { authService, UserProfile } from './services/authService';
import { customizationService, CustomizationSettings } from './services/customizationService';
import { AuthView } from './components/AuthView';
import { CustomizationModal } from './components/CustomizationModal';
import { AdminPanel } from './components/AdminPanel';
import { Trophy, Users, Coins, X, ShoppingBag, Settings as SettingsIcon, Key, Flag, RotateCcw, Dice1, Check, LogOut, Gem, Palette, Shield, Package, Image, Sparkles } from 'lucide-react';

// --- Modal Component ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#1E293B] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-heading text-4xl text-white tracking-widest uppercase">{title}</h2>
            <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-2 rounded-2xl transition-all pointer-events-auto">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="p-8 overflow-y-auto no-scrollbar flex-1 pointer-events-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const SESSION_KEY = 'parchis_game_session';

interface GameSession {
  roomCode: string;
  myColor: PlayerColor;
  id: string;
}

interface GameResultModalState {
  winnerColor: string;
  didWin: boolean;
}

const saveSession = (session: GameSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const loadSession = (): GameSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

const TURN_DURATION_SECONDS = 30;

// --- Main App Component ---
export default function App() {
  // Auth & Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Game State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);

  // UI State
  const [view, setView] = useState<'lobby' | 'waiting-room' | 'game'>('lobby');
  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingRejoin, setPendingRejoin] = useState<GameSession | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(TURN_DURATION_SECONDS);
  const [gameResultModal, setGameResultModal] = useState<GameResultModalState | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [purchaseConfirm, setPurchaseConfirm] = useState<{ type: 'coins' | 'gems' | 'board' | 'token'; amount: number; packName: string; itemId?: string } | null>(null);
  const [storePackages, setStorePackages] = useState<{ id: string; type: 'coins' | 'gems'; name: string; amount: number; price_usd: number }[]>([]);
  const [storeBoards, setStoreBoards] = useState<{ id: string; name: string; display_name: string; description: string; image_url: string; price_gems: number }[]>([]);
  const [storeTokens, setStoreTokens] = useState<{ id: string; name: string; display_name: string; description: string; price_gems: number }[]>([]);
  const [myPurchases, setMyPurchases] = useState<{ item_type: string; item_id: string }[]>([]);
  const [shopTab, setShopTab] = useState<'packs' | 'boards' | 'tokens'>('packs');
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [customization, setCustomization] = useState<CustomizationSettings>(() => customizationService.getSettings());
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Music State
  const [musicEnabled, setMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('musicEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved !== null ? parseFloat(saved) : 0.3;
  });
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // Persist music settings
  useEffect(() => {
    localStorage.setItem('musicEnabled', JSON.stringify(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    localStorage.setItem('musicVolume', musicVolume.toString());
  }, [musicVolume]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const EXIT_POSITIONS: Record<PlayerColor, number> = {
    green: 1, yellow: 18, blue: 35, red: 52
  };

  // Token waiting for die selection (popup)
  const [pendingToken, setPendingToken] = useState<Token | null>(null);

  // Auth Listener (Restore JWT session)
  useEffect(() => {
    const initAuth = async () => {
      const user = authService.getCurrentUser();
      const token = authService.getToken();

      if (user && token) {
        // User data is available from localStorage
        setCurrentUser(user);

        // Check if user is admin
        try {
          const res = await fetch('/api/admin/is-admin', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            setIsAdmin(data.isAdmin || false);
          }
        } catch (e) {
          console.log('Admin check failed:', e);
          setIsAdmin(false);
        }
      }
      // Load store packages
      try {
        const pkgRes = await fetch('/api/admin/store-packages');
        const pkgText = await pkgRes.text();
        if (pkgText && pkgRes.ok) {
          const pkgs = JSON.parse(pkgText);
          if (Array.isArray(pkgs)) setStorePackages(pkgs);
        }
      } catch (e) {
        console.log('Store packages load failed:', e);
      }

      // Load store boards
      try {
        const boardRes = await fetch('/api/store/boards');
        const boardText = await boardRes.text();
        if (boardText && boardRes.ok) {
          const b = JSON.parse(boardText);
          if (Array.isArray(b)) setStoreBoards(b);
        }
      } catch (e) { console.log('Store boards load failed:', e); }

      // Load store tokens
      try {
        const tokenRes = await fetch('/api/store/tokens');
        const tokenText = await tokenRes.text();
        if (tokenText && tokenRes.ok) {
          const t = JSON.parse(tokenText);
          if (Array.isArray(t)) setStoreTokens(t);
        }
      } catch (e) { console.log('Store tokens load failed:', e); }

      // Load my purchases
      if (token) {
        try {
          const purchRes = await fetch('/api/store/my-purchases', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const purchText = await purchRes.text();
          if (purchText && purchRes.ok) {
            const p = JSON.parse(purchText);
            if (Array.isArray(p)) setMyPurchases(p);
          }
        } catch (e) { console.log('Purchases load failed:', e); }
      }

      setInitialLoading(false);
      setCheckingAdmin(false);
    };
    initAuth();
  }, []);

  // Orientation Lock (Portrait only)
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsLandscape(!isPortrait);
    };

    checkOrientation();

    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);

    // Try to lock orientation to portrait on mobile
    if (screen.orientation && (screen.orientation as any).lock) {
      (screen.orientation as any).lock('portrait').catch((e: any) => console.log('Orientation lock not supported'));
    }

    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Music Control with Autoplay
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicEnabled) {
      audio.volume = musicVolume;
      audio.muted = false; // Unmute when music is enabled

      // Try to play with autoplay
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .catch(error => {
            console.log('Autoplay blocked, waiting for user interaction...');
            // If autoplay is blocked, set up a one-time listener
            const playOnInteraction = () => {
              audio.muted = false;
              audio.play().catch(e => console.log('Play failed:', e));
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('touchstart', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('touchstart', playOnInteraction);
          });
      }
    } else {
      audio.pause();
      audio.muted = true;
    }
  }, [musicEnabled, musicVolume]);

  // Socket Connection (Mock/Local Server)
  useEffect(() => {
    if (!currentUser) return;

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('player-assigned', (color: PlayerColor) => {
      setMyColor(color);
      // Update session with correct color
      const session = loadSession();
      if (session) {
        saveSession({ ...session, myColor: color });
      }
    });

    newSocket.on('room-update', (data: GameState) => {
      setGameState(data);
      // Clear session when game finishes
      if (data.status === 'finished') {
        clearSession();
      }
    });

    newSocket.on('player-surrendered', ({ color, username }: { color: string; username?: string }) => {
      showToast(`${username || color.toUpperCase()} se rindió.`, 'error');
    });

    newSocket.on('game-won', ({
      winnerColor,
      winnerUid,
      coinChanges,
    }: {
      winnerColor: string;
      winnerUid?: string;
      coinChanges?: Record<string, { delta: number; coins: number }>;
    }) => {
      const didWin = winnerUid === currentUser?.id;
      const myCoinChange = coinChanges?.[currentUser?.id ?? ''];
      if (typeof myCoinChange?.coins === 'number') {
        setCurrentUser((prev) => prev ? { ...prev, coins: myCoinChange.coins } : prev);
      }
      showToast(didWin ? 'You Win!' : 'Game Over', didWin ? 'success' : 'error');
      setGameResultModal({
        winnerColor,
        didWin,
      });
      clearSession();
    });

    newSocket.on('check-room-result', (result: { exists: boolean; canRejoin: boolean; color?: PlayerColor; status?: string }) => {
      if (result.exists && result.canRejoin && result.status === 'playing') {
        const session = loadSession();
        if (session && result.color) {
          setPendingRejoin({ ...session, myColor: result.color });
        }
      } else {
        clearSession();
        setPendingRejoin(null);
      }
    });

    newSocket.on('rejoin-failed', () => {
      clearSession();
      setPendingRejoin(null);
      showToast('Could not rejoin game', 'error');
    });

    return () => {
      newSocket.close();
    };
  }, [currentUser]);

  // Rejoin detection on app load
  useEffect(() => {
    if (!socket || !currentUser) return;
    const session = loadSession();
    if (session && session.id === currentUser.id) {
      socket.emit('check-room', { roomId: session.roomCode, id: session.id });
    }
  }, [socket, currentUser]);

  // Auto rejoin if there's a pending rejoin
  useEffect(() => {
    if (pendingRejoin && socket && view === 'lobby') {
      const timer = setTimeout(() => {
        socket.emit('rejoin-room', { roomId: pendingRejoin.roomCode, id: pendingRejoin.id });
        setRoomCode(pendingRejoin.roomCode);
        setMyColor(pendingRejoin.myColor);
        setView('waiting-room');
        setPendingRejoin(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingRejoin, socket, view]);

  // Sync View with Game Status
  useEffect(() => {
    if (gameState?.status === 'playing' && view === 'waiting-room') {
      setView('game');
    }
  }, [gameState?.status, view]);

  // 30s timer per turn + auto-pass when time runs out
  useEffect(() => {
    if (view !== 'game' || gameState?.status !== 'playing' || !gameState?.currentTurn) {
      setTurnSecondsLeft(TURN_DURATION_SECONDS);
      return;
    }

    const startedAt = Date.now();
    let timedOut = false;
    setTurnSecondsLeft(TURN_DURATION_SECONDS);

    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, TURN_DURATION_SECONDS - elapsed);
      setTurnSecondsLeft(left);

      if (!timedOut && left <= 0.01) {
        timedOut = true;
        clearInterval(timer);
        if (gameState.currentTurn === myColor && roomCode) {
          socket?.emit('auto-play-turn', { roomId: roomCode });
          showToast('Tiempo agotado. Se hizo una jugada automática.', 'error');
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [view, gameState?.status, gameState?.currentTurn, gameState?.turnTimerVersion, myColor, roomCode, socket]);


  // Handlers
  const handleJoinGame = (mode?: string) => {
    if (!currentUser) return;

    // Direct sync when joining to be extra sure
    authService.updateAvatar(currentUser.id, currentUser.avatar);

    if (mode === 'private') {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
      setView('waiting-room');
      socket?.emit('join-room', { roomId: code, id: currentUser.id });
      saveSession({ roomCode: code, myColor: 'red', id: currentUser.id });
      return;
    }
    // Each public mode gets its own room
    const publicRoomId = `public-${mode || 'rookie'}`;
    setRoomCode(publicRoomId);
    socket?.emit('join-room', { roomId: publicRoomId, id: currentUser.id });
    saveSession({ roomCode: publicRoomId, myColor: 'red', id: currentUser.id });
    setView('waiting-room');
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput || !currentUser) return;

    try {
      const code = joinCodeInput.trim().toUpperCase();
      setRoomCode(code);
      setView('waiting-room');
      socket?.emit('join-room', { roomId: code, id: currentUser.id });
      saveSession({ roomCode: code, myColor: 'red', id: currentUser.id });
      setActiveModal(null);
      setJoinCodeInput('');
      showToast('Entered waiting room!');
    } catch (error: any) {
      showToast(error.message || 'Failed to join', 'error');
    }
  };

  const handleRollDice = (values: [number, number]) => {
    if (!roomCode) return;
    setPendingToken(null);
    socket?.emit('roll-dice', { roomId: roomCode, values });
  };

  const handleTokenClick = (token: Token) => {
    if (!roomCode || !gameState) return;
    const remaining = gameState.remainingDice || [];
    const bonus = gameState.bonusSteps || 0;
    const canExitBySumFive = remaining.length === 2 && (remaining[0] + remaining[1] === 5);

    // Close popup if clicking same token again
    if (pendingToken?.id === token.id) {
      setPendingToken(null);
      return;
    }

    // Bonus steps: move directly
    if (bonus > 0) {
      setPendingToken(null);
      socket?.emit('move-token', { roomId: roomCode, tokenId: token.id, dieValue: bonus });
      return;
    }

    // One die: move directly
    if (remaining.length === 1) {
      setPendingToken(null);
      socket?.emit('move-token', { roomId: roomCode, tokenId: token.id, dieValue: remaining[0] });
      return;
    }

    // Doubles: move directly
    if (remaining.length === 2 && remaining[0] === remaining[1]) {
      setPendingToken(null);
      socket?.emit('move-token', { roomId: roomCode, tokenId: token.id, dieValue: remaining[0] });
      return;
    }

    // Exit from home with sum 5: move directly
    if (remaining.length === 2 && token.position === -1 && canExitBySumFive) {
      setPendingToken(null);
      socket?.emit('move-token', { roomId: roomCode, tokenId: token.id, dieValue: 5 });
      return;
    }

    // Two different dice: show popup above token
    if (remaining.length === 2) {
      setPendingToken(token);
      return;
    }
  };

  const handleDieSelect = (die: number) => {
    if (!roomCode || !pendingToken) return;
    socket?.emit('move-token', { roomId: roomCode, tokenId: pendingToken.id, dieValue: die });
    setPendingToken(null);
  };

  const handlePassDie = (dieValue: number) => {
    if (!roomCode) return;
    socket?.emit('pass-die', { roomId: roomCode, dieValue });
  };

  const handleNavChange = (id: string) => {
    if (id === 'home') {
      setActiveModal(null);
      setActiveTab('home');
    } else {
      setActiveModal(id);
      setActiveTab(id);
    }
  };

  const handleLeaveRoom = () => {
    if (roomCode) {
      socket?.emit('leave-room', { roomId: roomCode, id: currentUser?.id });
    }
    clearSession();
    setRoomCode(null);
    setGameState(null);
    setMyColor(null);
    setView('lobby');
    setGameResultModal(null);
  };

  const handleLogout = () => {
    handleLeaveRoom();
    clearSession();
    authService.logout();
    setCurrentUser(null);
    setActiveModal(null);
    setActiveTab('home');
    setGameResultModal(null);
  };

  const handleSurrender = () => {
    setShowSurrenderConfirm(true);
  };

  const confirmSurrender = () => {
    if (roomCode && currentUser) {
      socket?.emit('surrender', { roomId: roomCode, id: currentUser.id });
    }
    clearSession();
    setRoomCode(null);
    setGameState(null);
    setMyColor(null);
    setView('lobby');
    setActiveModal(null);
    setActiveTab('home');
    setGameResultModal(null);
    setShowSurrenderConfirm(false);
  };

  const handleRejoinGame = () => {
    if (!pendingRejoin || !socket) return;
    socket.emit('rejoin-room', { roomId: pendingRejoin.roomCode, id: pendingRejoin.id });
    setRoomCode(pendingRejoin.roomCode);
    setMyColor(pendingRejoin.myColor);
    setView('game');
    setPendingRejoin(null);
  };

  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);

    // Check if user is admin
    const token = authService.getToken();
    if (token) {
      try {
        const res = await fetch('/api/admin/is-admin', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          setIsAdmin(data.isAdmin || false);
        }
      } catch (e) {
        console.log('Admin check failed:', e);
        setIsAdmin(false);
      }
    }
  };

  const handleBuyCoins = async (amount: number) => {
    if (!currentUser) return;
    try {
      const token = authService.getToken();
      const res = await fetch('/api/store/buy-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id: currentUser.id, amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state
      setCurrentUser({
        ...currentUser,
        coins: data.coins
      });

      // Update session storage
      localStorage.setItem('parchis_active_session', JSON.stringify({
        ...currentUser,
        coins: data.coins
      }));

      setPurchaseConfirm(null);
    } catch (err: any) {
      console.error('Failed to buy coins:', err);
      alert('Error: ' + (err.message || 'Failed to purchase coins'));
    }
  };

  const handleBuyGems = async (amount: number) => {
    if (!currentUser) return;
    try {
      const token = authService.getToken();
      const res = await fetch('/api/store/buy-gems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id: currentUser.id, amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state
      setCurrentUser({
        ...currentUser,
        gems: data.gems
      });

      // Update session storage
      localStorage.setItem('parchis_active_session', JSON.stringify({
        ...currentUser,
        gems: data.gems
      }));

      setPurchaseConfirm(null);
    } catch (err: any) {
      console.error('Failed to buy gems:', err);
      alert('Error: ' + (err.message || 'Failed to purchase gems'));
    }
  };


  const handleBuyItem = async (itemType: 'board' | 'token', itemId: string) => {
    if (!currentUser) return;
    try {
      const token = authService.getToken();
      const endpoint = itemType === 'board' ? '/api/store/buy-board' : '/api/store/buy-token';
      const bodyKey = itemType === 'board' ? 'boardId' : 'tokenId';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ [bodyKey]: itemId })
      });
      const text = await res.text();
      if (!text) throw new Error('Empty response');
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error);

      // Update gems
      if (typeof data.gems === 'number') {
        setCurrentUser({ ...currentUser, gems: data.gems });
      }
      // Add to purchases
      setMyPurchases(prev => [...prev, { item_type: itemType, item_id: itemId }]);
      setPurchaseConfirm(null);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Purchase failed'));
    }
  };

  const getHighlightedPositions = () => {
    if (!gameState) return [];
    if (gameState.currentTurn !== myColor) return [];

    const remaining = gameState.remainingDice || [];
    const bonus = gameState.bonusSteps || 0;
    const currentPlayer = gameState.players.find(p => p.color === myColor);
    if (!currentPlayer) return [];

    if (bonus <= 0 && remaining.length === 0) return [];

    const positions: number[] = [];
    const dieValues = bonus > 0 ? [bonus] : [...new Set(remaining)]; // unique die values
    const canExitBySumFive = bonus <= 0 && remaining.length === 2 && (remaining[0] + remaining[1] === 5);

    for (const token of currentPlayer.tokens) {
      for (const dieVal of dieValues) {
        // Exit from home
        if (token.position === -1 && (dieVal === 5 || canExitBySumFive)) {
          positions.push(EXIT_POSITIONS[token.color]);
          continue;
        }
        if (token.position === -1 || token.position === 76) continue;

        // Movement on board
        if (token.position >= 1 && token.position <= 68) {
          const newPos = token.position + dieVal;
          if (newPos <= 76) {
            positions.push(newPos > 68 ? newPos : ((token.position + dieVal - 1) % 68) + 1);
          }
        } else if (token.position > 68 && token.position < 76) {
          const newPos = token.position + dieVal;
          if (newPos <= 76) positions.push(newPos);
        }
      }
    }

    return [...new Set(positions)];
  };

  const turnProgress = Math.max(0, Math.min(1, turnSecondsLeft / TURN_DURATION_SECONDS));
  const isPublicRoom = (roomCode || '').startsWith('public-');

  // --- Rendering ---

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#4A148C] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full"
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#4A148C] selection:bg-[#FF3D004D] relative">
        <AuthView onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // --- Admin-only view ---
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background selection:bg-[#FF3D004D] relative overflow-hidden">
        {/* Background Effect */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        </div>

        {/* Admin Header */}
        <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="font-heading text-2xl text-white tracking-widest uppercase">Admin Panel</h1>
              <p className="text-white/40 text-xs font-bold">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500/20 text-red-400 font-bold px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </header>

        {/* Admin Content */}
        <main className="max-w-4xl mx-auto p-6">
          <AdminPanel />
        </main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background selection:bg-[#FF3D004D] relative", view === 'game' ? "h-[100dvh] overflow-hidden fixed inset-0" : "overflow-hidden")}>
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="https://supabase.cloudteco.com/storage/v1/object/public/assets/music/Parchisi_Dreams.mp3"
        loop
        preload="auto"
        muted
      />

      {/* Background Effect */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: [40, 45, 40], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 flex items-center justify-center opacity-[0.07]"
        >
          <div className="w-[180vmax] h-[180vmax] border-[60px] border-white/10 flex flex-wrap shadow-[inset_0_0_100px_rgba(255,255,255,0.1)]">
            <div className="w-1/2 h-1/2 bg-primary/30 border-r-8 border-b-8 border-white/10" />
            <div className="w-1/2 h-1/2 bg-accent/30 border-b-8 border-white/10" />
            <div className="w-1/2 h-1/2 bg-secondary/30 border-r-8 border-white/10" />
            <div className="w-1/2 h-1/2 bg-emerald-500/30" />
          </div>
        </motion.div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <HUD
        view={view}
        onShopClick={() => handleNavChange('shop')}
        user={currentUser}
        players={gameState?.players || []}
        currentUserId={currentUser?.id}
        onRoll={handleRollDice}
        lastDiceRoll={gameState?.lastDiceRoll}
        remainingDice={gameState?.remainingDice || []}
        currentTurn={gameState?.currentTurn}
        myColor={myColor}
        onSurrender={handleSurrender}
        onPassDie={handlePassDie}
        turnProgress={turnProgress}
        turnSecondsLeft={Math.ceil(turnSecondsLeft)}
      />

      {/* Profile Avatar Button - Top Left in Lobby */}
      {view === 'lobby' && (
        <button
          onClick={() => setShowProfilePopup(true)}
          className="fixed top-4 left-4 z-50 w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg active:scale-90 transition-transform hover:border-white/40"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.username}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUser.id}`; }}
          />
        </button>
      )}

      {/* Profile Popup - My Collection */}
      <Modal isOpen={showProfilePopup} onClose={() => setShowProfilePopup(false)} title="Mi Perfil">
        <div className="space-y-5">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 flex-shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUser.id}`; }}
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{currentUser.username}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><Coins className="w-3 h-3" />{currentUser.coins?.toLocaleString()}</span>
                <span className="flex items-center gap-1 text-purple-400 text-xs font-bold"><Gem className="w-3 h-3" />{currentUser.gems?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Current Board */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Tablero Actual</p>
            {(() => {
              const current = storeBoards.find(b => b.name === customization.boardTheme) || { display_name: 'Classic', image_url: customizationService.getBoardUrl('classic'), name: 'classic' };
              return (
                <div className="bg-white/5 border border-blue-500/30 rounded-2xl overflow-hidden">
                  <img src={current.image_url || customizationService.getBoardUrl(current.name)} alt={current.display_name} className="w-full h-28 object-cover" />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-white font-bold text-sm">{current.display_name}</span>
                    <span className="text-blue-400 text-[10px] font-bold uppercase bg-blue-500/20 px-2 py-0.5 rounded-full">En uso</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Current Tokens */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Fichas Actuales</p>
            {(() => {
              const currentTok = storeTokens.find(t => t.name === customization.tokenStyle) || { display_name: 'Classic', name: 'classic' };
              const tokenColorMaps: Record<string, Record<string, string>> = {
                classic: { red: '#FF4081', yellow: '#FFEB3B', green: '#00E676', blue: '#448AFF' },
                gems: { red: '#FF1744', yellow: '#FFEA00', green: '#76FF03', blue: '#00B0FF' },
                medieval: { red: '#DC143C', yellow: '#FFD700', green: '#228B22', blue: '#3B82F6' },
                cosmic: { red: '#FF006E', yellow: '#FFBE0B', green: '#06FFA5', blue: '#3A86FF' },
              };
              const colors = tokenColorMaps[currentTok.name] || tokenColorMaps.classic;
              return (
                <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-sm">{currentTok.display_name}</span>
                    <span className="ml-2 text-purple-400 text-[10px] font-bold uppercase bg-purple-500/20 px-2 py-0.5 rounded-full">En uso</span>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(colors).map(([c, hex]) => (
                      <div key={c} className="w-7 h-7 rounded-full border border-white/20" style={{ background: `radial-gradient(circle at 30% 30%, ${hex}aa, ${hex})` }} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* My Board Collection */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Mi Coleccion - Tableros</p>
            <div className="grid grid-cols-2 gap-2">
              {storeBoards.filter(b => b.price_gems === 0 || myPurchases.some(p => p.item_type === 'board' && p.item_id === b.id)).map((board) => (
                <button
                  key={board.id}
                  onClick={() => {
                    const newSettings = { ...customization, boardTheme: board.name };
                    setCustomization(newSettings);
                    customizationService.saveSettings(newSettings);
                  }}
                  className={cn(
                    'rounded-xl overflow-hidden border-2 transition-all active:scale-95',
                    customization.boardTheme === board.name ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'border-white/10'
                  )}
                >
                  <img src={board.image_url} alt={board.display_name} className="w-full h-20 object-cover" />
                  <div className="p-2 bg-black/40">
                    <span className="text-white text-[11px] font-bold">{board.display_name}</span>
                  </div>
                </button>
              ))}
              {storeBoards.filter(b => b.price_gems === 0 || myPurchases.some(p => p.item_type === 'board' && p.item_id === b.id)).length === 0 && (
                <div className="col-span-2 text-center py-4 text-white/20 text-xs">Solo tienes el tablero Classic</div>
              )}
            </div>
          </div>

          {/* My Token Collection */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Mi Coleccion - Fichas</p>
            <div className="grid grid-cols-2 gap-2">
              {storeTokens.filter(t => t.price_gems === 0 || myPurchases.some(p => p.item_type === 'token' && p.item_id === t.id)).map((tok) => {
                const tokenColorMaps: Record<string, Record<string, string>> = {
                  classic: { red: '#FF4081', yellow: '#FFEB3B', green: '#00E676', blue: '#448AFF' },
                  gems: { red: '#FF1744', yellow: '#FFEA00', green: '#76FF03', blue: '#00B0FF' },
                  medieval: { red: '#DC143C', yellow: '#FFD700', green: '#228B22', blue: '#3B82F6' },
                  cosmic: { red: '#FF006E', yellow: '#FFBE0B', green: '#06FFA5', blue: '#3A86FF' },
                };
                const colors = tokenColorMaps[tok.name] || tokenColorMaps.classic;
                return (
                  <button
                    key={tok.id}
                    onClick={() => {
                      const newSettings = { ...customization, tokenStyle: tok.name };
                      setCustomization(newSettings);
                      customizationService.saveSettings(newSettings);
                    }}
                    className={cn(
                      'rounded-xl p-3 border-2 transition-all active:scale-95 flex flex-col items-center gap-2',
                      customization.tokenStyle === tok.name ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.3)]' : 'border-white/10 bg-white/5'
                    )}
                  >
                    <span className="text-white text-[11px] font-bold">{tok.display_name}</span>
                    <div className="flex gap-1.5">
                      {Object.entries(colors).map(([c, hex]) => (
                        <div key={c} className="w-5 h-5 rounded-full border border-white/20" style={{ background: `radial-gradient(circle at 30% 30%, ${hex}aa, ${hex})` }} />
                      ))}
                    </div>
                  </button>
                );
              })}
              {storeTokens.filter(t => t.price_gems === 0 || myPurchases.some(p => p.item_type === 'token' && p.item_id === t.id)).length === 0 && (
                <div className="col-span-2 text-center py-4 text-white/20 text-xs">Solo tienes las fichas Classic</div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <main className={cn("w-full flex items-center justify-center overflow-hidden", view === 'game' ? "h-[100dvh] p-0" : "h-screen p-4")}>
        <AnimatePresence mode="wait">
          {view === 'lobby' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full h-full flex flex-col items-center justify-start sm:justify-center gap-4 sm:gap-6 px-4 md:px-10 overflow-y-auto no-scrollbar py-20"
            >
              {/* Rejoin Banner */}
              <AnimatePresence>
                {pendingRejoin && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full max-w-3xl bg-yellow-500/20 border border-yellow-500/40 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-500/30 p-3 rounded-2xl">
                        <RotateCcw className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-yellow-500 font-heading text-xl uppercase tracking-wider">Game in progress</p>
                        <p className="text-yellow-500/60 text-xs font-bold">You were disconnected. Rejoin your match?</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleRejoinGame}
                        className="bg-yellow-500 text-slate-900 font-heading text-lg px-8 py-3 rounded-2xl shadow-xl hover:scale-[1.05] active:scale-95 transition-all uppercase tracking-widest"
                      >
                        REJOIN
                      </button>
                      <button
                        onClick={() => { clearSession(); setPendingRejoin(null); }}
                        className="bg-white/10 text-white/60 font-bold text-sm px-4 py-3 rounded-2xl hover:bg-white/20 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="w-full flex gap-4 sm:gap-6 max-w-6xl mx-auto overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-x-visible">
              {[
                { id: 'rookie', name: 'ROOKIE TABLE', entry: '100', prize: '350', type: 'public' },
                { id: 'pro', name: 'PRO ARENA', entry: '1,000', prize: '3,500', type: 'public' },
                { id: 'private', name: 'PRIVATE MATCH', entry: '0', prize: 'VS FRIENDS', type: 'private' },
                { id: 'legendary', name: 'LEGENDARY', entry: '50,000', prize: '180,000', type: 'public' },
              ].map((mode, idx) => (
                <div key={idx} className="min-w-[75vw] sm:min-w-0 w-full snap-center">
                  <div className={cn(
                    "bg-black/40 backdrop-blur-2xl flex flex-col justify-between min-h-[280px] sm:min-h-[380px] p-5 sm:p-8 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:border-white/30 transition-all",
                    mode.type === 'private' && "border-yellow-500/30 bg-yellow-500/5"
                  )}>
                    <div>
                      <h3 className="font-heading text-2xl sm:text-3xl xl:text-4xl leading-none mb-1 text-white">{mode.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">
                        <Users className="w-3 h-3" />
                        <span>{mode.type === 'private' ? 'Invite Only' : '4 Players'}</span>
                      </div>
                    </div>
                    <div className="space-y-4 sm:space-y-6 my-6 sm:my-8">
                      <div className="flex justify-between items-center bg-white/5 rounded-2xl p-3 sm:p-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry Fee</span>
                        <div className="flex items-center gap-2 text-white">
                          <Coins className="w-4 h-4 text-emerald-400" />
                          <span className="font-heading text-xl sm:text-2xl">{mode.entry}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 rounded-2xl p-3 sm:p-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reward</span>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                          <span className="font-heading text-2xl sm:text-3xl text-yellow-400">{mode.prize}</span>
                        </div>
                      </div>
                    </div>
                    {mode.type === 'private' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleJoinGame('private')} className="bg-yellow-500 text-slate-900 font-heading text-lg sm:text-xl py-3 sm:py-4 rounded-3xl shadow-xl hover:scale-[1.05] active:scale-95 transition-all">
                          CREATE
                        </button>
                        <button onClick={() => setActiveModal('join-room')} className="bg-white/10 text-white font-heading text-lg sm:text-xl py-3 sm:py-4 rounded-3xl border border-white/10 hover:bg-white/20 transition-all">
                          JOIN
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleJoinGame(mode.id)} className="bg-white text-slate-900 font-heading text-xl sm:text-2xl py-3 sm:py-4 rounded-3xl shadow-xl hover:scale-[1.05] active:scale-95 transition-all">
                        JOIN TABLE
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </motion.div>
          ) : view === 'waiting-room' ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-4xl bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-8 md:p-12 flex flex-col items-center gap-4 sm:gap-8 md:gap-10 shadow-3xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="text-center">
                <span className="text-[8px] sm:text-[10px] text-yellow-500 font-black uppercase tracking-[0.4em] mb-2 sm:mb-4 block">Waiting Room</span>
                <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-white mb-1 sm:mb-2 leading-none">INVITE FRIENDS</h2>
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-6 mt-4 sm:mt-8 flex flex-col items-center gap-1 sm:gap-2 group cursor-pointer hover:bg-white/10 transition-all"
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode || '');
                    showToast('Code copied to clipboard!');
                  }}>
                  <span className="text-[8px] sm:text-[10px] text-white/30 font-bold uppercase tracking-widest">Room Code</span>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="font-heading text-3xl sm:text-5xl md:text-6xl text-yellow-500 tracking-[0.15em] sm:tracking-[0.2em]">{roomCode}</span>
                    <Key className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-500/50" />
                  </div>
                </div>
              </div>

              <div className={cn(
                "grid gap-3 sm:gap-6 w-full max-w-2xl px-2 sm:px-4",
                (gameState?.players.length || 0) <= 2 ? "grid-cols-2" : "grid-cols-4"
              )}>
                {(gameState?.players || []).map((player, i) => {
                  const details = {
                    id: player.id,
                    username: player.username || 'Player',
                    avatar: player.avatar || `https://picsum.photos/seed/${player.id}/100/100`
                  };

                  return (
                    <div key={player.id} className="flex flex-col items-center gap-2 sm:gap-4">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.2rem] sm:rounded-[2rem] border-3 sm:border-4 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center transition-all overflow-hidden relative">
                        <img
                          src={details.avatar}
                          className="w-full h-full object-cover"
                          alt={details.username}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${details.id}`;
                          }}
                        />
                        {String(details.id) === String(currentUser.id) && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-[8px] font-black px-2 py-1 uppercase rounded-bl-xl text-white">YOU</div>
                        )}
                        {player.color && (
                          <div className={cn("absolute bottom-0 inset-x-0 h-1", {
                            "bg-red-500": player.color === 'red',
                            "bg-blue-500": player.color === 'blue',
                            "bg-yellow-500": player.color === 'yellow',
                            "bg-green-500": player.color === 'green',
                          })} />
                        )}
                      </div>
                      <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest text-center max-w-[80px] sm:max-w-[120px] truncate text-white">
                        {details.username}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="w-full max-w-md space-y-3 sm:space-y-4">
                {isPublicRoom ? (
                  <div className="w-full bg-white/5 border border-white/10 text-white/80 text-[10px] sm:text-sm font-bold py-3 sm:py-5 px-4 sm:px-6 rounded-[1.5rem] sm:rounded-[2rem] text-center uppercase tracking-widest">
                    Matchmaking público: inicia automático al completar 4 jugadores ({gameState?.players.length || 0}/4)
                  </div>
                ) : (
                  <button
                    disabled={!roomCode || (gameState?.players.length || 0) < 2 || gameState?.players[0]?.id !== currentUser?.id}
                    onClick={() => {
                      if (roomCode) {
                        socket?.emit('start-match', roomCode);
                      }
                    }}
                    className="w-full bg-white text-slate-900 font-heading text-lg sm:text-2xl py-3 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-widest"
                  >
                    {(gameState?.players.length || 0) < 2 ? 'WAITING FOR PLAYERS...' : 'Start Match'}
                  </button>
                )}
                <button onClick={handleLeaveRoom} className="w-full text-white/30 font-bold text-xs sm:text-sm hover:text-white transition-all uppercase tracking-widest">
                  Leave Room
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center w-full h-[100dvh] relative"
            >
              {/* Board + Player rows grouped tightly */}
              <div className="flex flex-col items-center w-full">
                {/* Top player row: green (left), red (right) */}
                <div className="w-[min(100vw,calc(100dvh-16rem),800px)] px-1 pb-1">
                  <GamePlayerRow
                    players={gameState?.players || []}
                    colors={['green', 'red']}
                    currentUserId={currentUser?.id}
                    user={currentUser}
                    currentTurn={gameState?.currentTurn}
                    myColor={myColor}
                    lastDiceRoll={gameState?.lastDiceRoll}
                    remainingDice={gameState?.remainingDice || []}
                    onRoll={handleRollDice}
                    onPassDie={handlePassDie}
                    turnProgress={turnProgress}
                    turnSecondsLeft={Math.ceil(turnSecondsLeft)}
                  />
                </div>

                {/* Board */}
                <ParchisBoard
                  tokens={gameState?.players.flatMap(p => p.tokens) || []}
                  onTokenClick={handleTokenClick}
                  highlightedPositions={getHighlightedPositions()}
                  pendingToken={pendingToken}
                  pendingDice={gameState?.remainingDice || []}
                  onDieSelect={handleDieSelect}
                  boardTheme={customization.boardTheme}
                  tokenStyle={customization.tokenStyle}
                />

                {/* Bottom player row: yellow (left), blue (right) */}
                <div className="w-[min(100vw,calc(100dvh-16rem),800px)] px-1 pt-1">
                  <GamePlayerRow
                    players={gameState?.players || []}
                    colors={['yellow', 'blue']}
                    currentUserId={currentUser?.id}
                    user={currentUser}
                    currentTurn={gameState?.currentTurn}
                    myColor={myColor}
                    lastDiceRoll={gameState?.lastDiceRoll}
                    remainingDice={gameState?.remainingDice || []}
                    onRoll={handleRollDice}
                    onPassDie={handlePassDie}
                    turnProgress={turnProgress}
                    turnSecondsLeft={Math.ceil(turnSecondsLeft)}
                  />
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view !== 'game' && <Navbar active={activeTab} onChange={handleNavChange} />}

      {/* Modals */}

      <Modal isOpen={activeModal === 'shop'} onClose={() => { setActiveModal(null); setActiveTab('home'); setShopTab('packs'); }} title="Store">
        <div className="space-y-6">
          {/* Tab Bar */}
          <div className="flex gap-2 bg-white/5 rounded-2xl p-1.5">
            <button
              onClick={() => setShopTab('packs')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95",
                shopTab === 'packs' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "text-white/40 hover:text-white/60"
              )}
            >
              <Coins className="w-4 h-4" /> Packs
            </button>
            <button
              onClick={() => setShopTab('boards')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95",
                shopTab === 'boards' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-white/40 hover:text-white/60"
              )}
            >
              <Image className="w-4 h-4" /> Boards
            </button>
            <button
              onClick={() => setShopTab('tokens')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95",
                shopTab === 'tokens' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-white/40 hover:text-white/60"
              )}
            >
              <Sparkles className="w-4 h-4" /> Tokens
            </button>
          </div>

          {/* Packs Tab */}
          {shopTab === 'packs' && (
            <div className="space-y-8">
              {/* COINS SECTION */}
              {storePackages.filter(p => p.type === 'coins').length > 0 && (
                <div>
                  <h3 className="text-white/70 font-bold text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-500" /> Gold Packs
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {storePackages.filter(p => p.type === 'coins').map((pack) => (
                      <div key={pack.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-yellow-500/20 transition-all">
                        <Coins className="w-8 h-8 text-yellow-500" />
                        <span className="font-black text-white text-sm">{pack.name}</span>
                        <span className="text-yellow-500 font-bold text-lg">{pack.amount.toLocaleString()}</span>
                        <button
                          onClick={() => setPurchaseConfirm({ type: 'coins', amount: pack.amount, packName: pack.name })}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 px-3 py-2 rounded-full font-bold text-xs transition-all active:scale-95"
                        >
                          ${pack.price_usd}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GEMS SECTION */}
              {storePackages.filter(p => p.type === 'gems').length > 0 && (
                <div>
                  <h3 className="text-white/70 font-bold text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Gem className="w-4 h-4 text-purple-400" /> Gem Packs
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {storePackages.filter(p => p.type === 'gems').map((pack) => (
                      <div key={pack.id} className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-purple-500/20 transition-all">
                        <Gem className="w-8 h-8 text-purple-400" />
                        <span className="font-black text-white text-sm">{pack.name}</span>
                        <span className="text-purple-400 font-bold text-lg">{pack.amount.toLocaleString()}</span>
                        <button
                          onClick={() => setPurchaseConfirm({ type: 'gems', amount: pack.amount, packName: pack.name })}
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-full font-bold text-xs transition-all active:scale-95"
                        >
                          ${pack.price_usd}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {storePackages.length === 0 && (
                <div className="text-center py-8 text-white/30">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold">No hay paquetes disponibles</p>
                  <p className="text-xs mt-1">Pronto habra ofertas</p>
                </div>
              )}
            </div>
          )}

          {/* Boards Tab */}
          {shopTab === 'boards' && (
            <div>
              {storeBoards.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {storeBoards.map((board) => {
                    const isOwned = board.price_gems === 0 || myPurchases.some(p => p.item_type === 'board' && p.item_id === board.id);
                    const isActive = customization.boardTheme === board.name;
                    return (
                      <div
                        key={board.id}
                        className={cn(
                          "bg-white/5 border rounded-2xl overflow-hidden flex flex-col transition-all",
                          isActive ? "border-blue-400 ring-2 ring-blue-400/30" : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <img
                          src={board.image_url}
                          alt={board.display_name}
                          className="w-full h-24 object-cover"
                        />
                        <div className="p-3 flex flex-col gap-2 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm truncate">{board.display_name}</span>
                            {board.price_gems === 0 && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Gratis</span>
                            )}
                            {isOwned && board.price_gems > 0 && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Owned</span>
                            )}
                          </div>
                          {isOwned ? (
                            <button
                              onClick={() => {
                                const newSettings = { ...customization, boardTheme: board.name };
                                setCustomization(newSettings);
                                customizationService.saveSettings(newSettings);
                                showToast(`Board "${board.display_name}" activated!`);
                              }}
                              disabled={isActive}
                              className={cn(
                                "w-full py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95",
                                isActive
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-default"
                                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
                              )}
                            >
                              {isActive ? 'En Uso' : 'Usar'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setPurchaseConfirm({ type: 'board', amount: board.price_gems, packName: board.display_name, itemId: board.id })}
                              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <Gem className="w-3.5 h-3.5" /> {board.price_gems}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-white/30">
                  <Image className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold">No hay tableros disponibles</p>
                  <p className="text-xs mt-1">Pronto habra nuevos tableros</p>
                </div>
              )}
            </div>
          )}

          {/* Tokens Tab */}
          {shopTab === 'tokens' && (
            <div>
              {storeTokens.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {storeTokens.map((tok) => {
                    const isOwned = tok.price_gems === 0 || myPurchases.some(p => p.item_type === 'token' && p.item_id === tok.id);
                    const isActive = customization.tokenStyle === tok.name;
                    const tokenColorMaps: Record<string, Record<string, string>> = {
                      classic: { red: '#FF4081', yellow: '#FFEB3B', green: '#00E676', blue: '#448AFF' },
                      gems: { red: '#FF1744', yellow: '#FFEA00', green: '#76FF03', blue: '#00B0FF' },
                      medieval: { red: '#DC143C', yellow: '#FFD700', green: '#228B22', blue: '#3B82F6' },
                      cosmic: { red: '#FF006E', yellow: '#FFBE0B', green: '#06FFA5', blue: '#3A86FF' },
                    };
                    const colors = tokenColorMaps[tok.name] || tokenColorMaps.classic;
                    return (
                      <div
                        key={tok.id}
                        className={cn(
                          "bg-white/5 border rounded-2xl p-4 flex flex-col items-center gap-3 transition-all",
                          isActive ? "border-purple-400 ring-2 ring-purple-400/30" : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <span className="font-bold text-white text-sm">{tok.display_name}</span>
                        <div className="flex gap-2">
                          {['red', 'yellow', 'green', 'blue'].map((c) => (
                            <div
                              key={c}
                              className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
                              style={{ backgroundColor: colors[c] }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          {tok.price_gems === 0 && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Gratis</span>
                          )}
                          {isOwned && tok.price_gems > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Owned</span>
                          )}
                        </div>
                        {isOwned ? (
                          <button
                            onClick={() => {
                              const newSettings = { ...customization, tokenStyle: tok.name };
                              setCustomization(newSettings);
                              customizationService.saveSettings(newSettings);
                              showToast(`Tokens "${tok.display_name}" activated!`);
                            }}
                            disabled={isActive}
                            className={cn(
                              "w-full py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95",
                              isActive
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 cursor-default"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white"
                            )}
                          >
                            {isActive ? 'En Uso' : 'Usar'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setPurchaseConfirm({ type: 'token', amount: tok.price_gems, packName: tok.display_name, itemId: tok.id })}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <Gem className="w-3.5 h-3.5" /> {tok.price_gems}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-white/30">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold">No hay fichas disponibles</p>
                  <p className="text-xs mt-1">Pronto habra nuevas fichas</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>



      <Modal isOpen={activeModal === 'join-room'} onClose={() => { setActiveModal(null); setActiveTab('home'); }} title="Join Private Match">
        <form onSubmit={handleJoinByCode} className="flex flex-col items-center gap-6 py-4">
          <div className="bg-yellow-500/20 p-4 rounded-full mb-2">
            <Key className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold">Enter the 6-digit room code</p>
            <p className="text-white/40 text-xs">Ask your friend for the code to join their game</p>
          </div>
          <input
            type="text"
            placeholder="CODE"
            maxLength={6}
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl py-6 text-center text-4xl font-heading tracking-[0.5em] text-white focus:outline-none focus:border-yellow-500/50 transition-all uppercase"
          />
          <button type="submit" className="w-full max-w-xs bg-yellow-500 text-slate-900 font-heading text-2xl py-4 rounded-3xl shadow-xl hover:scale-[1.05] active:scale-95 transition-all uppercase tracking-widest">
            ENTER ARENA
          </button>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'customization'} onClose={() => { setActiveModal(null); setActiveTab('home'); }} title="Customization">
        <CustomizationModal
          initialSettings={customization}
          onSave={(settings) => {
            setCustomization(settings);
          }}
        />
      </Modal>

      <Modal isOpen={activeModal === 'settings'} onClose={() => { setActiveModal(null); setActiveTab('home'); }} title="Settings">
        <div className="space-y-6">
          {/* PROFILE SECTION */}
          <div className="space-y-4">
            <h4 className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">Profile</h4>

            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20">
                <img src={currentUser?.avatar} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg truncate">{currentUser?.username}</h3>
                <p className="text-white/40 text-xs truncate">{currentUser?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest block mb-1">Coins</span>
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="font-heading text-lg text-white">{currentUser?.coins.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest block mb-1">Gems</span>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-purple-400" />
                  <span className="font-heading text-lg text-white">{(currentUser?.gems ?? 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest block mb-1">Member</span>
                <span className="text-white font-bold text-xs block">{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] text-white/30 font-black uppercase tracking-widest block mb-2">Games Played</span>
              <span className="font-heading text-2xl text-white">42</span>
            </div>
          </div>

          {/* AUDIO SECTION */}
          <div className="space-y-4 border-t border-white/10 pt-4">
            <h4 className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">Audio</h4>

            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="font-bold text-white">Sound Effects</span>
              <div className="w-12 h-6 bg-green-500 rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" /></div>
            </div>

            <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Music</span>
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    musicEnabled ? "bg-green-500" : "bg-slate-600"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                      musicEnabled ? "right-1" : "left-1"
                    )}
                  />
                </button>
              </div>
              {musicEnabled && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/70">🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(musicVolume * 100)}
                    onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <span className="text-sm text-white/70 min-w-[2.5rem]">{Math.round(musicVolume * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* CUSTOMIZATION SECTION */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <button
              onClick={() => { setActiveModal('customization'); }}
              className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white font-bold py-3 rounded-2xl border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
            >
              <Palette className="w-4 h-4" /> CUSTOMIZE
            </button>
            {isAdmin && (
              <button
                onClick={() => { setActiveModal('admin'); }}
                className="w-full bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-200 font-bold py-3 rounded-2xl border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
              >
                <Shield className="w-4 h-4" /> ADMIN PANEL
              </button>
            )}
          </div>

          {/* ACTIONS SECTION */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            {gameState?.status === 'playing' && (
              <button onClick={handleSurrender} className="w-full bg-red-500/20 text-red-500 font-bold py-3 rounded-2xl border border-red-500/20 hover:bg-red-500/30 transition-all flex items-center justify-center gap-2">
                <Flag className="w-4 h-4" /> SURRENDER
              </button>
            )}
            <button onClick={handleLogout} className="w-full bg-red-500 text-white font-bold py-3 rounded-2xl border border-red-600 hover:bg-red-600 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> LOG OUT
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!gameResultModal} onClose={handleLeaveRoom} title={gameResultModal?.didWin ? "You Win" : "Game Over"}>
        <div className="space-y-6 text-center">
          <p className="text-white/90 font-bold text-2xl">
            {gameResultModal?.didWin ? '¡Felicidades, ganaste la partida!' : `${gameResultModal?.winnerColor?.toUpperCase()} ganó la partida.`}
          </p>
          <button
            onClick={handleLeaveRoom}
            className="w-full bg-yellow-500 text-slate-900 font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wider"
          >
            Ir al lobby
          </button>
        </div>
      </Modal>

      {/* Surrender Confirmation Modal */}
      <Modal isOpen={showSurrenderConfirm} onClose={() => setShowSurrenderConfirm(false)} title="Confirmar Rendición">
        <div className="space-y-6 text-center">
          <p className="text-white/90 font-bold text-xl">
            ¿Estás seguro de que quieres rendirte?
          </p>
          <p className="text-white/60 text-sm">
            Perderás esta partida y serás enviado al lobby
          </p>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowSurrenderConfirm(false)}
              className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-2xl border border-slate-600 hover:bg-slate-600 transition-all uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </button>
            <button
              onClick={confirmSurrender}
              className="flex-1 bg-red-500 text-white font-bold py-3 rounded-2xl border border-red-600 hover:bg-red-600 transition-all uppercase tracking-widest text-[10px]"
            >
              Rendirse
            </button>
          </div>
        </div>
      </Modal>

      {/* Purchase Confirmation Modal */}
      <Modal isOpen={!!purchaseConfirm} onClose={() => setPurchaseConfirm(null)} title="Confirmar Compra">
        {purchaseConfirm && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              {purchaseConfirm.type === 'coins' ? (
                <Coins className="w-12 h-12 text-yellow-500" />
              ) : purchaseConfirm.type === 'gems' ? (
                <Gem className="w-12 h-12 text-purple-400" />
              ) : purchaseConfirm.type === 'board' ? (
                <Image className="w-12 h-12 text-blue-400" />
              ) : (
                <Sparkles className="w-12 h-12 text-purple-400" />
              )}
            </div>
            <div>
              <p className="text-white/90 font-bold text-lg">
                {purchaseConfirm.packName}
              </p>
              <p className="text-white/70 font-bold text-2xl mt-2">
                {purchaseConfirm.type === 'board' || purchaseConfirm.type === 'token' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Gem className="w-6 h-6 text-purple-400" /> {purchaseConfirm.amount} Gems
                  </span>
                ) : (
                  <>+{purchaseConfirm.amount} {purchaseConfirm.type === 'coins' ? 'Coins' : 'Gems'}</>
                )}
              </p>
            </div>
            <p className="text-white/60 text-sm">
              ¿Seguro que quieres realizar esta compra?
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setPurchaseConfirm(null)}
                className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-2xl border border-slate-600 hover:bg-slate-600 transition-all uppercase tracking-widest text-[10px] active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (purchaseConfirm.type === 'coins') {
                    handleBuyCoins(purchaseConfirm.amount);
                  } else if (purchaseConfirm.type === 'gems') {
                    handleBuyGems(purchaseConfirm.amount);
                  } else if (purchaseConfirm.type === 'board' && purchaseConfirm.itemId) {
                    handleBuyItem('board', purchaseConfirm.itemId);
                  } else if (purchaseConfirm.type === 'token' && purchaseConfirm.itemId) {
                    handleBuyItem('token', purchaseConfirm.itemId);
                  }
                }}
                className={cn(
                  "flex-1 font-bold py-3 rounded-2xl border transition-all uppercase tracking-widest text-[10px] active:scale-95",
                  purchaseConfirm.type === 'coins'
                    ? 'bg-yellow-500 text-slate-900 border-yellow-600 hover:bg-yellow-600'
                    : purchaseConfirm.type === 'board'
                    ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                    : 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600'
                )}
              >
                Comprar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Panel Modal */}
      {isAdmin && (
        <Modal isOpen={activeModal === 'admin'} onClose={() => { setActiveModal(null); setActiveTab('home'); }} title="Admin Control Panel">
          <AdminPanel />
        </Modal>
      )}

      {/* Orientation Lock Modal */}
      <Modal isOpen={isLandscape} onClose={() => {}} title="Gira tu dispositivo">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="text-6xl">📱</div>
          </div>
          <p className="text-white/90 font-bold text-xl">
            Por favor, gira tu dispositivo a modo vertical
          </p>
          <p className="text-white/60 text-sm">
            Esta aplicación solo funciona en orientación vertical para una mejor experiencia de juego
          </p>
          <div className="pt-4">
            <button
              disabled
              className="w-full bg-slate-700 text-white/50 font-bold py-3 rounded-2xl border border-slate-600 uppercase tracking-widest text-[10px] cursor-not-allowed"
            >
              Esperando orientación vertical...
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
          >
            <div className={cn(
              "px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3",
              toast.type === 'success' ? "bg-emerald-500/90 border-emerald-400/20 text-white" : "bg-red-500/90 border-red-400/20 text-white"
            )}>
              {toast.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span className="font-bold text-sm tracking-wide">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

