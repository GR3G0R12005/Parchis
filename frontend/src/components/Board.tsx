import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
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
  const BOARD_SIZE = 800;
  const CELL_SIZE = BOARD_SIZE / 15;

  const COLORS = {
    red: '#EF5350',
    yellow: '#FBC02D',
    blue: '#2196F3',
    green: '#4CAF50',
    safe: '#E0E0E0',
    white: '#FFFFFF',
    text: '#94A3B8'
  };

  useEffect(() => {
    const drawBoard = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure crisp drawing
      ctx.imageSmoothingEnabled = true;

      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // 1. Board Shadow/Base
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(0, 0, BOARD_SIZE, BOARD_SIZE, 30);
      ctx.fill();

      // 2. Wooden/Tan Frame
      ctx.fillStyle = '#E5C49F';
      ctx.beginPath();
      ctx.roundRect(0, 0, BOARD_SIZE, BOARD_SIZE, 30);
      ctx.fill();

      // Internal White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(CELL_SIZE * 0.2, CELL_SIZE * 0.2, BOARD_SIZE - CELL_SIZE * 0.4, BOARD_SIZE - CELL_SIZE * 0.4);

      // Helper for Star
      const drawStar = (cx: number, cy: number, radius: number) => {
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius / 2;
        ctx.beginPath();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 2);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(Math.cos((i * 2 + 0) * Math.PI / spikes) * outerRadius, Math.sin((i * 2 + 0) * Math.PI / spikes) * outerRadius);
          ctx.lineTo(Math.cos((i * 2 + 1) * Math.PI / spikes) * innerRadius, Math.sin((i * 2 + 1) * Math.PI / spikes) * innerRadius);
        }
        ctx.closePath();
        ctx.fillStyle = '#A0AEC0';
        ctx.fill();
        ctx.restore();
      };

      // Helper to draw a cell
      const drawCell = (x: number, y: number, color: string = '#FFFFFF', isSafe: boolean = false, pos?: number) => {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        ctx.fillStyle = color;
        ctx.strokeStyle = '#CBD5E0';
        ctx.lineWidth = 1;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

        if (isSafe && pos === undefined) {
          drawStar(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.25);
        }

        if (pos !== undefined) {
          ctx.fillStyle = COLORS.text;
          ctx.font = '10px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pos.toString(), px + CELL_SIZE / 2, py + CELL_SIZE * 0.2);

          if (isSafe) {
            drawStar(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.25);
          }
        }
      };

      // 3. Draw Path Squares (0-67)
      const safeSquares = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];
      for (let i = 0; i < 68; i++) {
        const { x, y } = getSquareCoords(i);
        const isSafe = safeSquares.includes(i);

        let cellColor = '#FFFFFF';
        if (i === 5) cellColor = COLORS.red;
        if (i === 22) cellColor = COLORS.blue;
        if (i === 39) cellColor = COLORS.yellow;
        if (i === 56) cellColor = COLORS.green;

        drawCell(x, y, cellColor, isSafe, i);
      }

      // 4. Draw Home Bases (Nidos)
      const drawHomeBase = (x: number, y: number, color: string) => {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        const size = CELL_SIZE * 6;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(px + 4, py + 4, size - 8, size - 8, 20);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(px + CELL_SIZE, py + CELL_SIZE, size - CELL_SIZE * 2, size - CELL_SIZE * 2, 10);
        ctx.fill();

        for (let i = 0; i < 4; i++) {
          const sx = px + (i % 2 === 0 ? 2 : 4) * CELL_SIZE;
          const sy = py + (i < 2 ? 2 : 4) * CELL_SIZE;

          ctx.beginPath();
          ctx.arc(sx, sy, CELL_SIZE * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };

      drawHomeBase(0, 0, COLORS.red);
      drawHomeBase(9, 0, COLORS.yellow);
      drawHomeBase(0, 9, COLORS.blue);
      drawHomeBase(9, 9, COLORS.green);

      // 5. Final Paths
      const pathColors = { red: COLORS.red, yellow: COLORS.yellow, blue: COLORS.blue, green: COLORS.green };
      (['red', 'yellow', 'blue', 'green'] as PlayerColor[]).forEach(color => {
        for (let i = 68; i <= 75; i++) {
          const { x, y } = getFinalPathCoords(color, i);
          drawCell(x, y, pathColors[color], false);
        }
      });

      // 6. Center Goal
      const drawCenterTri = (p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1.x * CELL_SIZE, p1.y * CELL_SIZE);
        ctx.lineTo(p2.x * CELL_SIZE, p2.y * CELL_SIZE);
        ctx.lineTo(p3.x * CELL_SIZE, p3.y * CELL_SIZE);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      drawCenterTri({ x: 6, y: 6 }, { x: 9, y: 6 }, { x: 7.5, y: 7.5 }, COLORS.green);
      drawCenterTri({ x: 9, y: 6 }, { x: 9, y: 9 }, { x: 7.5, y: 7.5 }, COLORS.yellow);
      drawCenterTri({ x: 9, y: 9 }, { x: 6, y: 9 }, { x: 7.5, y: 7.5 }, COLORS.red);
      drawCenterTri({ x: 6, y: 9 }, { x: 6, y: 6 }, { x: 7.5, y: 7.5 }, COLORS.blue);
    };

    drawBoard();
  }, [tokens, BOARD_SIZE, CELL_SIZE]); // Added sizing dependencies just in case

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
      className="relative w-[min(90vw,90vh,700px)] aspect-square bg-[#E5C49F] rounded-[2.5rem] p-4 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)] border-[10px] border-[#D2B48C] flex items-center justify-center"
    >
      <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-white shadow-[inset_0_2px_15px_rgba(0,0,0,0.2)]">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          className="absolute inset-0 w-full h-full"
        />

        {/* Tokens Layer */}
        <div className="absolute inset-0 pointer-events-none">
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
              className="absolute bg-white/40 rounded-full border-2 border-white/60 animate-pulse z-10 pointer-events-none"
              style={{
                left: `${(point.x / 15) * 100}%`,
                top: `${(point.y / 15) * 100}%`,
                width: `${(1 / 15) * 100}%`,
                height: `${(1 / 15) * 100}%`,
                transform: 'scale(0.8)',
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

const TokenComponent: React.FC<{ token: Token; coords: any; onClick: () => void }> = ({ token, coords, onClick }) => {
  const colors = {
    red: 'from-red-400 to-red-600 border-red-900',
    blue: 'from-blue-400 to-blue-600 border-blue-900',
    yellow: 'from-yellow-400 to-yellow-600 border-yellow-900',
    green: 'from-green-400 to-green-600 border-green-900',
  };

  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        "absolute cursor-pointer flex items-center justify-center z-20 pointer-events-auto",
      )}
      style={coords}
      initial={false}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "w-[80%] h-[80%] rounded-full border-4 shadow-lg flex items-center justify-center relative bg-gradient-to-b",
          colors[token.color]
        )}
      >
        <div className="w-[70%] h-[70%] rounded-full border-2 border-white/40 flex items-center justify-center">
          <div className="w-[40%] h-[40%] bg-white/60 rounded-full shadow-inner" />
        </div>
      </motion.div>
    </motion.div>
  );
};
