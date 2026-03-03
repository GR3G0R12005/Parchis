import { PlayerColor } from './types';

export interface Point {
  x: number;
  y: number;
}

// Parchis board is 15x15 cells
// We map each position (0-67) to grid coordinates (0-14, 0-14)
export const getSquareCoords = (pos: number): Point => {
  // Simplified mapping for a 15x15 cross board
  // This is a rough approximation of the Parchis path
  if (pos >= 0 && pos <= 7) return { x: 6, y: 13 - pos };
  if (pos >= 8 && pos <= 15) return { x: 5 - (pos - 8), y: 8 };
  if (pos >= 16 && pos <= 18) return { x: 0, y: 7 - (pos - 16) };
  if (pos >= 19 && pos <= 26) return { x: pos - 19 + 1, y: 6 };
  if (pos >= 27 && pos <= 34) return { x: 6, y: 5 - (pos - 27) };
  if (pos >= 35 && pos <= 37) return { x: 7 + (pos - 35), y: 0 };
  if (pos >= 38 && pos <= 45) return { x: 8, y: pos - 38 + 1 };
  if (pos >= 46 && pos <= 53) return { x: 9 + (pos - 46), y: 6 };
  if (pos >= 54 && pos <= 56) return { x: 14, y: 7 + (pos - 54) };
  if (pos >= 57 && pos <= 64) return { x: 13 - (pos - 57), y: 8 };
  if (pos >= 65 && pos <= 67) return { x: 8, y: 9 + (pos - 65) };
  return { x: 7, y: 7 }; // Center
};

export const getHomeCoords = (color: PlayerColor, index: number): Point => {
  const offsets = [
    { x: 1.5, y: 1.5 },
    { x: 3.5, y: 1.5 },
    { x: 1.5, y: 3.5 },
    { x: 3.5, y: 3.5 },
  ];
  const offset = offsets[index % 4];
  switch (color) {
    case 'red': return { x: offset.x, y: offset.y };
    case 'yellow': return { x: 9 + offset.x, y: offset.y };
    case 'blue': return { x: offset.x, y: 9 + offset.y };
    case 'green': return { x: 9 + offset.x, y: 9 + offset.y };
  }
};

export const getFinalPathCoords = (color: PlayerColor, pos: number): Point => {
  // pos 68-75
  const step = pos - 68;
  switch (color) {
    case 'red': return { x: 7, y: 13 - step };
    case 'yellow': return { x: 1 + step, y: 7 };
    case 'blue': return { x: 13 - step, y: 7 };
    case 'green': return { x: 7, y: 1 + step };
  }
};
