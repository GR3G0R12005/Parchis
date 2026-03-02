import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { ParchisBoard } from './components/Board';
import { Dice } from './components/Dice';
import { HUD } from './components/HUD';
import { Navbar } from './components/Navbar';
import { GameState, Token, PlayerColor } from './types';
import { cn } from './utils';

import { Trophy, Users, Coins } from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [view, setView] = useState<'lobby' | 'game'>('lobby');

  const EXIT_POSITIONS: Record<PlayerColor, number> = {
    red: 5,
    blue: 22,
    yellow: 39,
    green: 56
  };

  const SAFE_SQUARES = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('player-assigned', (color: PlayerColor) => {
      setMyColor(color);
    });

    newSocket.on('room-update', (data: GameState) => {
      setGameState(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleJoinGame = () => {
    socket?.emit('join-room', 'default-room');
    setView('game');
  };

  const handleRollDice = (values: [number, number]) => {
    socket?.emit('roll-dice', { roomId: 'default-room', values });
  };

  const handleTokenClick = (token: Token) => {
    socket?.emit('move-token', { roomId: 'default-room', tokenId: token.id });
  };

  const getHighlightedPositions = () => {
    if (!gameState || (!gameState.lastDiceRoll && gameState.bonusSteps === 0)) return [];
    if (gameState.currentTurn !== myColor) return [];

    const roll = gameState.lastDiceRoll;
    const bonus = gameState.bonusSteps;
    const currentPlayer = gameState.players.find(p => p.color === myColor);
    if (!currentPlayer) return [];

    return currentPlayer.tokens.map(token => {
      let moveAmount = 0;
      if (bonus > 0) {
        moveAmount = bonus;
      } else if (roll) {
        const [d1, d2] = roll;
        if (token.position === -1 && (d1 === 5 || d2 === 5 || d1 + d2 === 5)) {
          return EXIT_POSITIONS[token.color];
        }
        moveAmount = d1 + d2;
      }

      if (token.position === -1) return -1;
      
      let newPos = (token.position + moveAmount) % 68;
      // Simplified goal logic for ghost
      if (token.position < 68 && token.position + moveAmount > 67) {
        // This is a rough estimate, real logic is more complex with final path
        return 76; 
      }
      return newPos;
    }).filter(pos => pos !== -1);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden selection:bg-primary/30 relative">
      {/* Ludo Board Background - Enhanced */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            rotate: [40, 45, 40],
            scale: [1, 1.05, 1]
          }}
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
        
        {/* Animated Particles/Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <HUD />
      
      <main className="pt-20 pb-28 md:pt-24 md:pb-32 h-full flex items-center">
        <AnimatePresence mode="wait">
          {view === 'lobby' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full overflow-x-auto no-scrollbar flex items-center gap-6 px-8 md:px-24 snap-x snap-mandatory"
            >
              {/* Game Modes Section */}
              {[
                { name: 'ROOKIE TABLE', entry: '100', prize: '350', color: 'text-emerald-400', glow: 'neon-glow-green', bg: 'bg-emerald-500/10' },
                { name: 'PRO ARENA', entry: '1,000', prize: '3,500', color: 'text-secondary', glow: 'neon-glow-blue', bg: 'bg-secondary/10' },
                { name: 'HIGH ROLLER', entry: '10,000', prize: '35,000', color: 'text-accent', glow: 'neon-glow-yellow', bg: 'bg-accent/10' },
                { name: 'LEGENDARY DUEL', entry: '50,000', prize: '180,000', color: 'text-primary', glow: 'neon-glow-red', bg: 'bg-primary/10' },
              ].map((mode, idx) => (
                <div key={idx} className="flex-shrink-0 w-[80vw] md:w-[25vw] snap-center">
                  <div className={cn("card-glass flex flex-col justify-between min-h-[350px] md:min-h-[450px] p-8 border-2 border-white/5 hover:border-white/20 transition-all group relative overflow-hidden", mode.bg)}>
                    <div className="absolute top-0 right-0 p-4">
                      <div className={cn("w-3 h-3 rounded-full animate-pulse", mode.glow.replace('neon-glow-', 'bg-'))} />
                    </div>
                    
                    <div>
                      <h3 className={cn("font-heading text-4xl md:text-5xl leading-none mb-2", mode.color)}>{mode.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest">
                        <Users className="w-4 h-4" />
                        <span>4 Players</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end border-b border-white/10 pb-4">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Entry Fee</span>
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-accent" />
                          <span className="font-heading text-2xl text-white">{mode.entry}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Grand Prize</span>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-accent" />
                          <span className="font-heading text-3xl text-accent">{mode.prize}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleJoinGame}
                      className={cn("btn-glossy w-full mt-6 text-xl", mode.bg.replace('/10', '/40'), "hover:scale-[1.02] active:scale-95")}
                    >
                      JOIN TABLE
                    </button>
                  </div>
                </div>
              ))}

              {/* Companion Scores / Leaderboard Card */}
              <div className="flex-shrink-0 w-[85vw] md:w-[40vw] snap-center">
                <div className="card-glass flex flex-col min-h-[350px] md:min-h-[450px] p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Trophy className="w-8 h-8 text-accent" />
                    <h3 className="font-heading text-3xl md:text-4xl">TOP COMPANIONS</h3>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {[
                      { name: 'JUAN_PRO', score: '15,420', color: 'bg-primary' },
                      { name: 'MARIA_G', score: '12,100', color: 'bg-secondary' },
                      { name: 'CARLOS_X', score: '9,850', color: 'bg-accent' },
                      { name: 'LUCIA_99', score: '8,200', color: 'bg-emerald-500' },
                    ].map((player, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="font-heading text-2xl text-slate-500 w-6">{i + 1}</span>
                          <div className={cn("w-10 h-10 rounded-full", player.color)} />
                          <span className="font-bold text-lg">{player.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-accent font-black">{player.score}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">PTS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Online Status Summary */}
              <div className="flex-shrink-0 w-[85vw] md:w-[40vw] snap-center">
                <div className="card-glass flex items-center justify-between p-8 min-h-[150px]">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1,2,3,4,5].map(i => (
                        <img key={i} src={`https://picsum.photos/seed/friend${i}/60/60`} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-surface" referrerPolicy="no-referrer" />
                      ))}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">1,240 Players</div>
                      <div className="text-sm text-slate-400">Currently Online</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Servers Optimal</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col lg:flex-row gap-6 md:gap-12 items-center w-full"
            >
              <div className="relative w-full max-w-[600px]">
                <ParchisBoard 
                  tokens={gameState?.players.flatMap(p => p.tokens) || []}
                  onTokenClick={handleTokenClick}
                  highlightedPositions={getHighlightedPositions()}
                />
                
                {/* Reaction Emojis Overlay */}
                <div className="absolute -right-4 md:-right-12 top-0 flex flex-col gap-2 md:gap-4">
                  {['🔥', '😂', '😲', '😡'].map(emoji => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur border border-white/10 flex items-center justify-center text-xl shadow-lg"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 md:gap-8 w-full md:w-auto">
                <div className="card-glass p-4 md:p-8 flex flex-col items-center gap-4 md:gap-6 w-full max-w-[300px] md:max-w-none">
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your Turn</div>
                    <div className="font-heading text-2xl md:text-4xl text-primary">
                      {gameState?.lastDiceRoll 
                        ? `${gameState.lastDiceRoll[0]} + ${gameState.lastDiceRoll[1]} = ${gameState.lastDiceRoll[0] + gameState.lastDiceRoll[1]}`
                        : "ROLL THE DICE!"}
                    </div>
                  </div>
                  <div className="scale-75 md:scale-100">
                    <Dice onRoll={handleRollDice} disabled={gameState?.currentTurn !== myColor} />
                  </div>
                </div>

                <div className="flex gap-2 md:gap-4">
                  <div className="card-glass py-2 px-4 md:py-3 md:px-6 flex items-center gap-2 md:gap-3">
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary neon-glow-red" />
                    <span className="font-bold text-xs md:text-sm">RED</span>
                  </div>
                  <div className="card-glass py-2 px-4 md:py-3 md:px-6 flex items-center gap-2 md:gap-3 opacity-50">
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-secondary" />
                    <span className="font-bold text-xs md:text-sm">BLUE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Navbar />
    </div>
  );
}


