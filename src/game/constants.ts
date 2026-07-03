// Table dimensions (in game units)
export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const CUSHION_WIDTH = 28;
export const POCKET_RADIUS = 22;
export const BALL_RADIUS = 11;
export const CUE_BALL_RADIUS = 11;

// Physics
export const FRICTION = 0.985;
export const WALL_RESTITUTION = 0.75;
export const BALL_RESTITUTION = 0.95;
export const MIN_VELOCITY = 0.08;
export const MAX_SHOT_POWER = 22;
export const POWER_CHARGE_SPEED = 0.4;

// Pocket positions (center of each pocket)
export const POCKETS = [
  { x: CUSHION_WIDTH + 2, y: CUSHION_WIDTH + 2 },                          // top-left
  { x: TABLE_WIDTH / 2, y: CUSHION_WIDTH - 4 },                            // top-center
  { x: TABLE_WIDTH - CUSHION_WIDTH - 2, y: CUSHION_WIDTH + 2 },            // top-right
  { x: CUSHION_WIDTH + 2, y: TABLE_HEIGHT - CUSHION_WIDTH - 2 },           // bottom-left
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION_WIDTH + 4 },             // bottom-center
  { x: TABLE_WIDTH - CUSHION_WIDTH - 2, y: TABLE_HEIGHT - CUSHION_WIDTH - 2 }, // bottom-right
];

// Ball colors
export const BALL_COLORS: Record<number, { color: string; stripe: boolean }> = {
  0: { color: '#FFFFFF', stripe: false },  // cue ball
  1: { color: '#FFD700', stripe: false },  // yellow
  2: { color: '#0066CC', stripe: false },  // blue
  3: { color: '#CC0000', stripe: false },  // red
  4: { color: '#6B0099', stripe: false },  // purple
  5: { color: '#FF6600', stripe: false },  // orange
  6: { color: '#006633', stripe: false },  // green
  7: { color: '#880000', stripe: false },  // maroon
  8: { color: '#111111', stripe: false },  // 8-ball (black)
  9: { color: '#FFD700', stripe: true },
  10: { color: '#0066CC', stripe: true },
  11: { color: '#CC0000', stripe: true },
  12: { color: '#6B0099', stripe: true },
  13: { color: '#FF6600', stripe: true },
  14: { color: '#006633', stripe: true },
  15: { color: '#880000', stripe: true },
};

// Scoring
export const SCORE_POCKET = 100;
export const SCORE_COMBO = 50;
export const SCORE_FOUL = -50;
