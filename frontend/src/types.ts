import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';

export interface Token {
  id: string;
  color: PlayerColor;
  position: number; // 0-67 for main board, -1 for home, 68-75 for final path, 76 for goal
  isSafe: boolean;
}

export interface GameState {
  players: {
    id: string;
    username: string;
    avatar: string;
    color: PlayerColor;
    tokens: Token[];
    isTurn: boolean;
    score: number;
  }[];
  currentTurn: PlayerColor;
  lastDiceRoll: [number, number] | null;
  status: 'waiting' | 'playing' | 'finished';
  bonusSteps: number; // For 20 steps (capture) or 10 steps (goal)
  extraTurns: number; // For rolling a 6
  consecutiveSixes: number; // To handle the "3 sixes in a row" rule
  roomId: string;
}
