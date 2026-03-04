import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';

export interface Token {
  id: string;
  color: PlayerColor;
  position: number; // -1 = home, 1-68 main board, 69-75 final path, 76 = goal
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
  remainingDice: number[]; // Individual dice values still to be used this turn
  status: 'waiting' | 'playing' | 'finished';
  bonusSteps: number; // 20 for capture, 10 for reaching goal
  consecutiveDoubles: number; // 3 doubles in a row = penalty
  mustBreakBarrier?: boolean;
  turnTimerVersion?: number;
  roomId: string;
}
