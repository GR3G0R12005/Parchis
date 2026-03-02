import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerColor, Token } from '../types';
import { getSquareCoords, getHomeCoords, getFinalPathCoords, Point } from '../boardLayout';
import { cn } from '../utils';

interface BoardProps {
  tokens: Token[];
  onTokenClick: (token: Token) => void;
  highlightedPositions?: number[];
}

export const ParchisBoard: React.FC<BoardProps> = ({ tokens, onTokenClick, highlightedPositions = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const BOARD_SIZE = 800; // Increased resolution for better quality
  const CELL_SIZE = BOARD_SIZE / 15;

  useEffect(() => {
    const drawBoard = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // 1. Board Background with subtle texture
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      
      // Subtle Grid Dots
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < BOARD_SIZE; i += 20) {
        for (let j = 0; j < BOARD_SIZE; j += 20) {
          ctx.beginPath();
          ctx.arc(i, j, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Helper to draw a stylized cell
      const drawCell = (x: number, y: number, color: string = '#1E293B', isSafe: boolean = false, isFinal: boolean = false) => {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        
        // Cell Base with subtle gradient
        const cellGrad = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
        cellGrad.addColorStop(0, color);
        cellGrad.addColorStop(1, '#0F172A');
        ctx.fillStyle = cellGrad;
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        
        // Inner Bevel/Shadow
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        if (isSafe) {
          // Safe square indicator - Star shape
          const cx = px + CELL_SIZE / 2;
          const cy = py + CELL_SIZE / 2;
          const spikes = 5;
          const outerRadius = CELL_SIZE * 0.3;
          const innerRadius = CELL_SIZE * 0.15;
          
          ctx.beginPath();
          ctx.translate(cx, cy);
          ctx.rotate(Math.PI / spikes);
          for (let i = 0; i < spikes; i++) {
            ctx.lineTo(0, 0 - outerRadius);
            ctx.rotate(Math.PI / spikes);
            ctx.lineTo(0, 0 - innerRadius);
            ctx.rotate(Math.PI / spikes);
          }
          ctx.closePath();
          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
          
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        
        if (isFinal) {
          // Final path subtle pattern - Arrow pointing to goal
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Draw a small arrow or chevron
          ctx.moveTo(px + CELL_SIZE * 0.3, py + CELL_SIZE * 0.4);
          ctx.lineTo(px + CELL_SIZE * 0.5, py + CELL_SIZE * 0.6);
          ctx.lineTo(px + CELL_SIZE * 0.7, py + CELL_SIZE * 0.4);
          ctx.stroke();
        }
      };

      // 2. Draw Path Squares (0-67)
      const safeSquares = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];
      for (let i = 0; i < 68; i++) {
        const { x, y } = getSquareCoords(i);
        const isSafe = safeSquares.includes(i);
        drawCell(x, y, isSafe ? '#334155' : '#1E293B', isSafe);
      }

      // 3. Draw Home Bases with Premium Look
      const drawHomeBase = (x: number, y: number, color: string, label: string) => {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        const size = CELL_SIZE * 6;

        // Outer Glow Layer
        const radial = ctx.createRadialGradient(px + size/2, py + size/2, 0, px + size/2, py + size/2, size * 0.8);
        radial.addColorStop(0, `${color}22`);
        radial.addColorStop(1, 'transparent');
        ctx.fillStyle = radial;
        ctx.fillRect(px - CELL_SIZE, py - CELL_SIZE, size + CELL_SIZE*2, size + CELL_SIZE*2);

        // Main Base Box
        ctx.fillStyle = '#1E293B';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillRect(px + 4, py + 4, size - 8, size - 8);
        ctx.shadowBlur = 0;

        // Border with Gradient
        const borderGrad = ctx.createLinearGradient(px, py, px + size, py + size);
        borderGrad.addColorStop(0, color);
        borderGrad.addColorStop(0.5, '#FFFFFF');
        borderGrad.addColorStop(1, color);
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 4;
        ctx.strokeRect(px + 6, py + 6, size - 12, size - 12);

        // Label
        ctx.fillStyle = color;
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, px + size/2, py + size * 0.85);

        // Token Slots
        for (let i = 0; i < 4; i++) {
          const sx = px + (i % 2 === 0 ? 1.5 : 4.5) * CELL_SIZE;
          const sy = py + (i < 2 ? 1.5 : 4.5) * CELL_SIZE;
          
          ctx.beginPath();
          ctx.arc(sx, sy, CELL_SIZE * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Slot Inner Glow
          const slotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, CELL_SIZE * 0.9);
          slotGrad.addColorStop(0, 'transparent');
          slotGrad.addColorStop(1, `${color}11`);
          ctx.fillStyle = slotGrad;
          ctx.fill();
        }
      };

      drawHomeBase(0, 0, '#FF3D00', 'RED BASE');
      drawHomeBase(9, 0, '#FFD600', 'YELLOW BASE');
      drawHomeBase(0, 9, '#00E5FF', 'BLUE BASE');
      drawHomeBase(9, 9, '#00FF7F', 'GREEN BASE');

      // 4. Final Paths
      const colors = { red: '#FF3D00', yellow: '#FFD600', blue: '#00E5FF', green: '#00FF7F' };
      (['red', 'yellow', 'blue', 'green'] as PlayerColor[]).forEach(color => {
        for (let i = 68; i <= 75; i++) {
          const { x, y } = getFinalPathCoords(color, i);
          drawCell(x, y, `${colors[color]}15`, false, true);
          ctx.strokeStyle = `${colors[color]}44`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * CELL_SIZE + 4, y * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        }
      });

      // 5. Center Goal - The Crown Jewel
      const cx = 7.5 * CELL_SIZE;
      const cy = 7.5 * CELL_SIZE;
      const gSize = CELL_SIZE * 1.5;

      // Center Diamond Background with multiple layers
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      
      // Outer Glow
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(255,255,255,0.2)';
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-gSize * 1.5, -gSize * 1.5, gSize * 3, gSize * 3);
      ctx.shadowBlur = 0;

      // Inner Border
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-gSize * 1.4, -gSize * 1.4, gSize * 2.8, gSize * 2.8);
      ctx.restore();

      // Triangles with Advanced Gradients
      const drawCenterTri = (p1: Point, p2: Point, p3: Point, color: string) => {
        const grad = ctx.createRadialGradient(p3.x * CELL_SIZE, p3.y * CELL_SIZE, 0, p3.x * CELL_SIZE, p3.y * CELL_SIZE, CELL_SIZE * 3);
        grad.addColorStop(0, color);
        grad.addColorStop(0.6, `${color}44`);
        grad.addColorStop(1, '#0F172A');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(p1.x * CELL_SIZE, p1.y * CELL_SIZE);
        ctx.lineTo(p2.x * CELL_SIZE, p2.y * CELL_SIZE);
        ctx.lineTo(p3.x * CELL_SIZE, p3.y * CELL_SIZE);
        ctx.closePath();
        ctx.fill();
        
        // Highlight edge
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      drawCenterTri({ x: 6, y: 6 }, { x: 9, y: 6 }, { x: 7.5, y: 7.5 }, '#FF3D00');
      drawCenterTri({ x: 9, y: 6 }, { x: 9, y: 9 }, { x: 7.5, y: 7.5 }, '#FFD600');
      drawCenterTri({ x: 9, y: 9 }, { x: 6, y: 9 }, { x: 7.5, y: 7.5 }, '#00FF7F');
      drawCenterTri({ x: 6, y: 9 }, { x: 6, y: 6 }, { x: 7.5, y: 7.5 }, '#00E5FF');
      
      // Center Core
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL_SIZE * 0.8);
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.4, '#F8FAFC');
      coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_SIZE * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      
      // Goal Icon
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FFFFFF';
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 18px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WIN', cx, cy);
      ctx.shadowBlur = 0;
    };

    drawBoard();
  }, []);

  const getTokenCoords = (token: Token) => {
    let point: Point;
    if (token.position === -1) {
      const playerTokens = tokens.filter(t => t.color === token.color);
      const index = playerTokens.findIndex(t => t.id === token.id);
      point = getHomeCoords(token.color, index);
    } else if (token.position >= 68) {
      point = getFinalPathCoords(token.color, token.position);
    } else {
      point = getSquareCoords(token.position);
    }
    return {
      left: `${(point.x / 15) * 100}%`,
      top: `${(point.y / 15) * 100}%`,
      width: `${(1 / 15) * 100}%`,
      height: `${(1 / 15) * 100}%`,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full max-w-[700px] aspect-square bg-slate-950 rounded-[2.5rem] p-5 shadow-[0_0_120px_rgba(0,0,0,0.9)] border-[12px] border-slate-900 overflow-hidden group"
    >
      {/* Animated Border Glow */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-accent/20 to-secondary/20 blur-3xl pointer-events-none"
      />

      <div className="relative w-full h-full rounded-3xl overflow-hidden border-4 border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Tokens Layer */}
        <div className="absolute inset-0">
          {tokens.map((token) => (
            <TokenComponent
              key={token.id}
              token={token}
              coords={getTokenCoords(token)}
              onClick={() => onTokenClick(token)}
            />
          ))}
        </div>

        {/* Ghost Indicators */}
        {highlightedPositions.map((pos, idx) => {
          const point = pos >= 68 ? getFinalPathCoords(tokens[0]?.color || 'red', pos) : getSquareCoords(pos);
          return (
            <div
              key={idx}
              className="absolute bg-white/10 rounded-full border-2 border-white/30 animate-pulse z-10 pointer-events-none flex items-center justify-center"
              style={{
                left: `${(point.x / 15) * 100}%`,
                top: `${(point.y / 15) * 100}%`,
                width: `${(1 / 15) * 100}%`,
                height: `${(1 / 15) * 100}%`,
                transform: 'scale(0.7)',
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const TokenComponent: React.FC<{ token: Token; coords: any; onClick: () => void }> = ({ token, coords, onClick }) => {
  const colors = {
    red: 'from-red-500 to-red-700 shadow-red-500/50',
    blue: 'from-blue-400 to-blue-600 shadow-blue-400/50',
    yellow: 'from-yellow-300 to-yellow-500 shadow-yellow-300/50',
    green: 'from-emerald-400 to-emerald-600 shadow-emerald-400/50',
  };

  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        "absolute cursor-pointer flex items-center justify-center z-20",
      )}
      style={coords}
      initial={false}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <motion.div
        whileHover={{ scale: 1.25, y: -8, rotate: 5 }}
        whileTap={{ scale: 0.85 }}
        className={cn(
          "w-[85%] h-[85%] rounded-full border-2 border-white/50 shadow-2xl flex items-center justify-center relative overflow-hidden bg-gradient-to-br",
          colors[token.color]
        )}
      >
        {/* Glass Marble Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_70%,rgba(0,0,0,0.3)_0%,transparent_50%)]" />
        
        {/* Inner Ring */}
        <div className="w-[60%] h-[60%] rounded-full border border-white/20 flex items-center justify-center">
          <div className="w-[30%] h-[30%] bg-white/40 rounded-full blur-[1px]" />
        </div>

        {/* Shine */}
        <div className="absolute top-[10%] left-[15%] w-[30%] h-[15%] bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
      </motion.div>
      
      {/* Dynamic Shadow */}
      <motion.div 
        className="absolute -bottom-1 w-[60%] h-[10%] bg-black/40 blur-sm rounded-full -z-10"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
};
