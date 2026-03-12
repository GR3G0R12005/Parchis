import { PlayerColor } from './types';

export interface Point { x: number; y: number; }

export const GRID_SIZE = 17;

const mapBoardPoint = (x: number, z: number): Point => ({
  x: ((x + 30) / 60) * (GRID_SIZE - 1),
  y: ((30 - z) / 60) * (GRID_SIZE - 1),
});

// 68-position route aligned to imagenes/parchis.jpg
const MAIN_PATH_XZ: [number, number][] = [
  [-7, 18], [-7, 15], [-7, 12], [-7, 9],
  [-9, 7], [-12, 7], [-15, 7], [-18, 7], [-21, 7], [-24, 7], [-27, 7], [-30, 7],
  [-30, 0], [-30, -7],
  [-27, -7], [-24, -7], [-21, -7], [-18, -7], [-15, -7], [-12, -7], [-9, -7],
  [-7, -9], [-7, -12], [-7, -15], [-7, -18], [-7, -21], [-7, -24], [-7, -27], [-7, -30],
  [0, -30],
  [7, -30], [7, -27], [7, -24], [7, -21], [7, -18], [7, -15], [7, -12], [7, -9],
  [9, -7], [12, -7], [15, -7], [18, -7], [21, -7], [24, -7], [27, -7], [30, -7],
  [30, 0], [30, 7],
  [27, 7], [24, 7], [21, 7], [18, 7], [15, 7], [12, 7], [9, 7],
  [7, 9], [7, 12], [7, 15], [7, 18], [7, 21], [7, 24], [7, 27], [7, 30],
  [0, 30],
  [-7, 30], [-7, 27], [-7, 24], [-7, 21],
];

const MAIN_PATH = MAIN_PATH_XZ.map(([x, z]) => mapBoardPoint(x, z));

export const getSquareCoords = (pos: number): Point => {
  return MAIN_PATH[pos - 1] || { x: 8, y: 8 };
};

export const getHomeCoords = (color: PlayerColor, index: number): Point => {
  // Position tokens in home circles (initial positions on the board)
  const homes: Record<PlayerColor, [number, number][]> = {
    green: [[2.5, 2.5], [4.5, 2.5], [2.5, 4.5], [4.5, 4.5]],
    red: [[12.5, 2.5], [14.5, 2.5], [12.5, 4.5], [14.5, 4.5]],
    yellow: [[2.5, 12.5], [4.5, 12.5], [2.5, 14.5], [4.5, 14.5]],
    blue: [[12.5, 12.5], [14.5, 12.5], [12.5, 14.5], [14.5, 14.5]],
  };
  const [x, y] = homes[color][index % 4];
  return { x, y };
};

// Final lanes using direct grid coordinates (centered on cells)
const FINAL_LANES_GRID: Record<PlayerColor, [number, number][]> = {
  // Entrance (69) to square before goal (75): [x, y] in grid coords
  green:  [[8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7]],
  red:    [[15, 8], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8]],
  blue:   [[8, 15], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9]],
  yellow: [[1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8]],
};

export const getFinalPathCoords = (color: PlayerColor, pos: number): Point => {
  const lane = FINAL_LANES_GRID[color];
  const idx = Math.max(0, Math.min(lane.length - 1, pos - 69));
  const [x, y] = lane[idx];
  return { x, y };
};

export const getSquareOrientation = (pos: number, color?: PlayerColor): 'horizontal' | 'vertical' => {
  if (pos === -1) return 'horizontal';
  if (pos > 68) {
    if (color === 'red' || color === 'yellow') return 'horizontal';
    return 'vertical';
  }

  const verticalRanges = [[1, 4], [13, 14], [22, 29], [31, 38], [47, 48], [56, 63], [65, 68]];
  if (verticalRanges.some(([start, end]) => pos >= start && pos <= end)) return 'vertical';
  return 'horizontal';
};
