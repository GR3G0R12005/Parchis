import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { PlayerColor, Token } from '../types';
import { getSquareCoords, getHomeCoords, getFinalPathCoords, getSquareOrientation, Point } from '../boardLayout';
import { customizationService } from '../services/customizationService';
import { cn } from '../utils';

const STEP_MS = 150;
const GRID = 17;

// Last main-board square before entering each color's final path
const FINAL_ENTRY_ON_MAIN: Record<PlayerColor, number> = {
  green: 64, yellow: 13, blue: 30, red: 47,
};

function getIntermediatePath(fromPos: number, toPos: number, color: PlayerColor): number[] {
  if (fromPos === toPos) return [];
  // Going home (capture/penalty) or exiting home → direct
  if (fromPos === -1 || toPos === -1 || toPos === 76) return [toPos];

  // Both on final path
  if (fromPos >= 69 && toPos >= 69) {
    const steps: number[] = [];
    for (let p = fromPos + 1; p <= toPos; p++) steps.push(p);
    return steps;
  }

  // Main board → final path
  if (fromPos >= 1 && fromPos <= 68 && toPos >= 69) {
    const steps: number[] = [];
    const entry = FINAL_ENTRY_ON_MAIN[color];
    let p = fromPos;
    let safety = 0;
    while (p !== entry && safety < 68) {
      p = (p % 68) + 1;
      steps.push(p);
      safety++;
    }
    for (let fp = 69; fp <= toPos; fp++) steps.push(fp);
    return steps;
  }

  // Both on main board
  if (fromPos >= 1 && fromPos <= 68 && toPos >= 1 && toPos <= 68) {
    const steps: number[] = [];
    let p = fromPos;
    let safety = 0;
    while (p !== toPos && safety < 68) {
      p = (p % 68) + 1;
      steps.push(p);
      safety++;
    }
    return steps;
  }

  return [toPos];
}

function posToCenter(pos: number, color: PlayerColor): React.CSSProperties | null {
  let point: Point;
  if (pos >= 69 && pos <= 75) {
    point = getFinalPathCoords(color, pos);
  } else if (pos >= 1 && pos <= 68) {
    point = getSquareCoords(pos);
  } else {
    return null;
  }
  return {
    left: `${(point.x / GRID) * 100}%`,
    top: `${(point.y / GRID) * 100}%`,
    width: `${(1 / GRID) * 100}%`,
    height: `${(1 / GRID) * 100}%`,
    transform: 'translate(0%, 0%)',
    zIndex: 50,
  };
}

interface BoardProps {
  tokens: Token[];
  onTokenClick: (token: Token) => void;
  highlightedPositions?: number[];
  pendingToken?: Token | null;
  pendingDice?: number[];
  onDieSelect?: (die: number) => void;
  rotationDeg?: number;
  boardTheme?: string;
  tokenStyle?: string;
  tokenImages?: Partial<Record<PlayerColor, string>>;
  onTokenStep?: () => void;
}

export const ParchisBoard: React.FC<BoardProps> = ({ tokens, onTokenClick, highlightedPositions = [], pendingToken, pendingDice = [], onDieSelect, rotationDeg = 0, boardTheme = 'classic', tokenStyle = 'classic', tokenImages, onTokenStep }) => {
  const getTokensAtPos = (pos: number, tokenColor?: PlayerColor) => {
    return tokens.filter(t => t.position === pos && (pos !== -1 || t.color === tokenColor));
  };

  const getTokenCoords = (token: Token) => {
    let point: Point;
    const isGoal = token.position === 76;
    const isHome = token.position === -1;

    // Get tokens of same color at this position
    const tokensAtThisPos = isGoal
      ? tokens.filter(t => t.position === 76 && t.color === token.color)
      : tokens.filter(t => t.position === token.position && t.color === token.color);

    // Get ALL tokens at this position (any color)
    const allTokensAtPos = isGoal
      ? tokens.filter(t => t.position === 76)
      : tokens.filter(t => t.position === token.position && token.position !== -1);

    const tokenIndex = tokensAtThisPos.findIndex(t => t.id === token.id);
    const sameColorCount = tokensAtThisPos.length;

    if (isHome) {
      point = getHomeCoords(token.color, tokenIndex);
    } else if (isGoal) {
      // Place goal tokens in the center square, offset by color quadrant
      const goalOffsets: Record<PlayerColor, { x: number; y: number }> = {
        green:  { x: 7.5,  y: 7.5  },
        red:    { x: 8.5,  y: 7.5  },
        yellow: { x: 7.5,  y: 8.5  },
        blue:   { x: 8.5,  y: 8.5  },
      };
      point = goalOffsets[token.color];
    } else if (token.position > 68) {
      point = getFinalPathCoords(token.color, token.position);
    } else {
      point = getSquareCoords(token.position);
    }

    const orientation = getSquareOrientation(token.position, token.color);

    // Group all tokens by color
    const colorGroups: Record<PlayerColor, Token[]> = { green: [], red: [], yellow: [], blue: [] };
    allTokensAtPos.forEach(t => {
      colorGroups[t.color].push(t);
    });

    // Get active colors and their order
    const colorOrder: PlayerColor[] = ['green', 'yellow', 'red', 'blue'];
    const activeColors = colorOrder.filter(c => colorGroups[c].length > 0);

    let offset = { x: 0, y: 0 };
    let scale = 0.55;

    if (!isHome && !isGoal && token.position > 0 && token.position <= 68) {
      // If 2+ tokens of same color: they form a block
      if (sameColorCount >= 2) {
        // Position within block (side by side)
        if (orientation === 'vertical') {
          offset = tokenIndex === 0 ? { x: -60, y: 0 } : { x: 60, y: 0 };
        } else {
          offset = tokenIndex === 0 ? { x: 0, y: -60 } : { x: 0, y: 60 };
        }
        scale = 0.45;

        // If there are other color blocks, distribute them around
        if (activeColors.length > 1) {
          const colorIndex = activeColors.indexOf(token.color);
          const baseOffsets = orientation === 'vertical'
            ? [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: -80 }]
            : [{ x: 0, y: -100 }, { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 80, y: 0 }];

          // Get base position for this color's block
          const baseOffset = baseOffsets[colorIndex] || { x: 0, y: 0 };
          offset = {
            x: baseOffset.x + offset.x,
            y: baseOffset.y + offset.y,
          };
          scale = 0.38;
        }
      } else if (activeColors.length > 1) {
        // Multiple colors but no blocking: distribute colors
        const colorIndex = activeColors.indexOf(token.color);
        const offsets = orientation === 'vertical'
          ? [{ x: -80, y: 0 }, { x: -26, y: 0 }, { x: 26, y: 0 }, { x: 80, y: 0 }]
          : [{ x: 0, y: -80 }, { x: 0, y: -26 }, { x: 0, y: 26 }, { x: 0, y: 80 }];
        offset = offsets[colorIndex] || { x: 0, y: 0 };
        scale = 0.40;
      } else {
        scale = 0.55;
      }
    } else if (!isHome && !isGoal) {
      // Final path or other positions
      scale = 0.50;
    }

    return {
      position: {
        left: `${(point.x / GRID) * 100}%`,
        top: `${(point.y / GRID) * 100}%`,
        width: `${(1 / GRID) * 100}%`,
        height: `${(1 / GRID) * 100}%`,
        transform: isHome
          ? `translate(-50%, -50%) translate(${offset.x}%, ${offset.y}%)`
          : `translate(${offset.x}%, ${offset.y}%)`,
        zIndex: 40 + tokenIndex,
      },
      scale,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full h-full rounded-xl sm:rounded-2xl p-0 shadow-2xl flex items-center justify-center overflow-y-hidden overflow-x-auto bg-black/30 md:overflow-hidden"
    >
      <div
        className="relative rounded shadow-inner border-[1px] border-black/40 overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: '1 / 1',
          width: 'clamp(100%, 100vmin, 800px)',
          height: 'clamp(100%, 100vmin, 800px)',
          minWidth: '100%',
          transform: `rotate(${rotationDeg}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 220ms ease-out',
        }}
      >
        <img
          src={customizationService.getBoardUrl(boardTheme)}
          alt="Parchis board"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = customizationService.getBoardUrl('classic');
          }}
        />

        {/* Tokens Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {tokens.map((token) => (
            <TokenComponent
              key={token.id}
              token={token}
              coords={getTokenCoords(token)}
              onClick={() => onTokenClick(token)}
              tokenStyle={tokenStyle}
              tokenImages={tokenImages}
              onStep={onTokenStep}
            />
          ))}
        </div>

        {/* Dice popup above pending token */}
        {pendingToken && (() => {
          const pt = pendingToken;
          let point: Point;
          if (pt.position === -1) point = getHomeCoords(pt.color, 0);
          else if (pt.position > 68) point = getFinalPathCoords(pt.color, pt.position);
          else point = getSquareCoords(pt.position);
          return (
            <motion.div
              key={pt.id}
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="absolute z-[60] pointer-events-auto flex gap-1 items-center bg-black/75 backdrop-blur-sm border border-white/20 rounded-xl px-2 py-1 shadow-xl"
              style={{
                left: `${(point.x / GRID) * 100}%`,
                top: `${(point.y / GRID) * 100}%`,
                transform: 'translate(-30%, -130%)',
              }}
            >
              {pendingDice.map((die, idx) => (
                <button
                  key={idx}
                  onClick={() => onDieSelect?.(die)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-slate-900 font-black text-sm sm:text-base flex items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  {die}
                </button>
              ))}
            </motion.div>
          );
        })()}

        {/* Highlights */}
        {highlightedPositions.map((pos, idx) => {
          const point = pos > 68 ? getFinalPathCoords(tokens[0]?.color || 'red', pos) : getSquareCoords(pos);
          return (
            <div
              key={idx}
              className="absolute bg-white/40 rounded-full border-2 border-white animate-pulse z-30 pointer-events-none shadow-[0_0_15px_white]"
              style={{
                left: `${(point.x / GRID) * 100}%`,
                top: `${(point.y / GRID) * 100}%`,
                width: `${(1 / GRID) * 100}%`,
                height: `${(1 / GRID) * 100}%`,
                transform: 'scale(0.8)',
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

const TokenComponent: React.FC<{
  token: Token;
  coords: { position: React.CSSProperties; scale: number };
  onClick: () => void;
  tokenStyle?: string;
  tokenImages?: Partial<Record<PlayerColor, string>>;
  onStep?: () => void;
}> = ({ token, coords, onClick, tokenStyle = 'classic', tokenImages, onStep }) => {
  const getColorMap = (style: string) => {
    const styles: Record<string, Record<string, string>> = {
      classic: {
        red: 'from-[#FF80AB] via-[#FF4081] to-[#C2185B] border-[#880E4F]',
        yellow: 'from-[#FFF176] via-[#FFEB3B] to-[#FBC02D] border-[#F57F17]',
        green: 'from-[#B9F6CA] via-[#00E676] to-[#388E3C] border-[#1B5E20]',
        blue: 'from-[#82B1FF] via-[#448AFF] to-[#1976D2] border-[#0D47A1]',
      },
      gems: {
        red: 'from-[#FF1744] via-[#E91E63] to-[#C2185B] border-[#880E4F] shadow-[0_0_20px_rgba(255,23,68,0.5)]',
        yellow: 'from-[#FFEA00] via-[#FFD600] to-[#FBC02D] border-[#F57F17] shadow-[0_0_20px_rgba(255,234,0,0.5)]',
        green: 'from-[#76FF03] via-[#00E676] to-[#388E3C] border-[#1B5E20] shadow-[0_0_20px_rgba(118,255,3,0.5)]',
        blue: 'from-[#00B0FF] via-[#448AFF] to-[#1976D2] border-[#0D47A1] shadow-[0_0_20px_rgba(0,176,255,0.5)]',
      },
      medieval: {
        red: 'from-[#8B0000] via-[#DC143C] to-[#600000] border-[#3D0000]',
        yellow: 'from-[#DAA520] via-[#FFD700] to-[#B8860B] border-[#8B6914]',
        green: 'from-[#2F6B2F] via-[#228B22] to-[#1C4C1C] border-[#0D3D0D]',
        blue: 'from-[#1E3A8A] via-[#3B82F6] to-[#1E40AF] border-[#172554]',
      },
      cosmic: {
        red: 'from-[#FF006E] via-[#FB5607] to-[#8B0000] border-[#FB5607] shadow-[0_0_15px_rgba(255,0,110,0.7)]',
        yellow: 'from-[#FFBE0B] via-[#FB5607] to-[#FFB700] border-[#FB5607] shadow-[0_0_15px_rgba(255,190,11,0.7)]',
        green: 'from-[#8338EC] via-[#3A86FF] to-[#06FFA5] border-[#3A86FF] shadow-[0_0_15px_rgba(6,255,165,0.7)]',
        blue: 'from-[#06FFA5] via-[#3A86FF] to-[#8338EC] border-[#3A86FF] shadow-[0_0_15px_rgba(58,134,255,0.7)]',
      },
    };
    return styles[style] || styles.classic;
  };

  const colorMap = getColorMap(tokenStyle);

  const prevPosRef = useRef<number>(token.position);
  const [currentStyle, setCurrentStyle] = useState<React.CSSProperties>(coords.position);
  const isAnimatingRef = useRef(false);
  const coordsRef = useRef(coords);

  // Keep coordsRef up to date so timeouts don't use stale coords
  useEffect(() => { coordsRef.current = coords; });

  // Step-by-step animation when position changes
  useEffect(() => {
    const fromPos = prevPosRef.current;
    const toPos = token.position;
    prevPosRef.current = toPos;

    if (fromPos === toPos) return;

    // Token captured/sent home: delay so the capturing token's animation
    // finishes landing on the capture square before this token disappears
    if (toPos === -1 && fromPos > 0) {
      isAnimatingRef.current = true;
      let cancelled = false;
      const t = setTimeout(() => {
        if (!cancelled) {
          isAnimatingRef.current = false;
          setCurrentStyle(coordsRef.current.position);
        }
      }, STEP_MS * 14); // enough for up to ~14 steps at current speed
      return () => { cancelled = true; clearTimeout(t); };
    }

    const steps = getIntermediatePath(fromPos, toPos, token.color);

    if (steps.length <= 1) {
      isAnimatingRef.current = false;
      setCurrentStyle(coordsRef.current.position);
      return;
    }

    const intermediates = steps.slice(0, -1);
    isAnimatingRef.current = true;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let i = 0;

    const tick = () => {
      if (cancelled) return;
      if (i < intermediates.length) {
        const style = posToCenter(intermediates[i], token.color);
        if (style) setCurrentStyle(style);
        onStep?.();
        i++;
        timeoutId = setTimeout(tick, STEP_MS);
      } else {
        isAnimatingRef.current = false;
        setCurrentStyle(coordsRef.current.position);
      }
    };

    timeoutId = setTimeout(tick, 0);

    return () => {
      cancelled = true;
      isAnimatingRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [token.position, token.color]);

  // Update style when stack changes (no position change)
  const coordsPosKey = `${coords.position.left}-${coords.position.top}-${coords.position.transform}`;
  useEffect(() => {
    if (!isAnimatingRef.current) {
      setCurrentStyle(coords.position);
    }
  }, [coordsPosKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onClick={onClick}
      className="absolute cursor-pointer flex items-center justify-center pointer-events-auto"
      style={{
        ...currentStyle,
        transition: `left ${STEP_MS * 0.85}ms ease-out, top ${STEP_MS * 0.85}ms ease-out`,
      }}
    >
      <div style={{ transform: `scale(${coords.scale})`, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {tokenImages?.[token.color] ? (
          <motion.img
            whileHover={{ scale: 1.2, y: -5 }}
            whileTap={{ scale: 0.9 }}
            src={tokenImages[token.color]}
            alt={token.color}
            className="w-[90%] h-[90%] rounded-full object-cover border-[2px] border-white/40 shadow-[0_5px_10px_rgba(0,0,0,0.4)]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <motion.div
            whileHover={{ scale: 1.2, y: -5 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "w-[90%] h-[90%] rounded-full border-[2px] shadow-[0_5px_10px_rgba(0,0,0,0.4)] flex items-center justify-center relative bg-gradient-to-br",
              colorMap[token.color]
            )}
          >
            <div className="absolute top-[15%] left-[15%] w-1/3 h-1/4 bg-white/40 rounded-full blur-[2px]" />
          </motion.div>
        )}
      </div>
    </div>
  );
};
