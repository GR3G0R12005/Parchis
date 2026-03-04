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
  const circles: [number, number][] = [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]];
  const [ox, oy] = circles[index % 4];
  switch (color) {
    case 'red': return { x: ox, y: oy };           // Top-Left
    case 'yellow': return { x: 10 + ox, y: oy };    // Top-Right
    case 'green': return { x: ox, y: 10 + oy };      // Bottom-Left
    case 'blue': return { x: 10 + ox, y: 10 + oy }; // Bottom-Right
  }
};

const FINAL_LANES_XZ: Record<PlayerColor, [number, number][]> = {
  // Entrance (69) to square before goal (75)
  red: [[0, 27], [0, 24], [0, 21], [0, 18], [0, 15], [0, 12], [0, 9]],
  yellow: [[27, 0], [24, 0], [21, 0], [18, 0], [15, 0], [12, 0], [9, 0]],
  blue: [[0, -27], [0, -24], [0, -21], [0, -18], [0, -15], [0, -12], [0, -9]],
  green: [[-27, 0], [-24, 0], [-21, 0], [-18, 0], [-15, 0], [-12, 0], [-9, 0]],
};

export const getFinalPathCoords = (color: PlayerColor, pos: number): Point => {
  const lane = FINAL_LANES_XZ[color];
  const idx = Math.max(0, Math.min(lane.length - 1, pos - 69));
  const [x, z] = lane[idx];
  return mapBoardPoint(x, z);
};
