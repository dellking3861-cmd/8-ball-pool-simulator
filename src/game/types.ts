export interface Vec2 { x: number; y: number; }

export interface Ball {
  id: number; x: number; y: number;
  vx: number; vy: number; radius: number;
  pocketed: boolean; color: string; stripe: boolean;
  sinkAnim: number; sinkPocket: Vec2 | null;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type: 'spark' | 'glow' | 'star' | 'smoke' | 'trail';
}

export interface ScreenShake { intensity: number; duration: number; elapsed: number; }

export type GameState = 'start' | 'playing' | 'aiming' | 'shooting' | 'rolling' | 'paused' | 'gameover';
export type PlayerType = 'solids' | 'stripes' | null;
export type GameMode = 'solo' | 'versus';

export interface HighScore { score: number; date: string; ballsPocketed: number; }

export interface TrajectoryHit {
  hitPoint: Vec2; targetBall: Ball;
  deflectAngle: number; cueDeflect: number; aimDist: number;
  isWrongBall: boolean;          // true if this ball is NOT current player's group
}

export interface GameData {
  balls: Ball[]; cueBall: Ball;
  particles: Particle[]; screenShake: ScreenShake;
  score: number; shotAngle: number; shotPower: number;
  isPowerCharging: boolean; powerDirection: number;
  state: GameState;
  gameMode: GameMode;
  player1Type: PlayerType; player2Type: PlayerType;
  player1Score: number; player2Score: number;
  currentPlayer: 1 | 2;
  turnBallsPocketed: number; foulThisTurn: boolean;
  firstHitBallId: number | null;      // id of first ball the cue ball contacts this shot
  pocketedThisTurn: number[];         // ids of balls pocketed this turn
  message: string; messageTimer: number;
  comboCount: number; totalBallsPocketed: number;
  highScores: HighScore[];
  cueBallPlacing: boolean;
  trajectoryHit: TrajectoryHit | null;
  powerBarDragging: boolean;
  winner: 0 | 1 | 2;                 // 0 = none, 1 = P1 wins, 2 = P2 wins
}
