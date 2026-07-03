// Table dimensions (in game units)
export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const CUSHION_WIDTH = 28;
export const POCKET_RADIUS = 22;
export const BALL_RADIUS = 11;
export const CUE_BALL_RADIUS = 11;

// Physics - Realistic billiard values
export const FRICTION = 0.985;           // Rolling resistance per frame (0.985 = realistic)
export const TABLE_FRICTION = 0.985;     // Same as FRICTION, adjustable separately
export const WALL_RESTITUTION = 0.88;    // Cushion energy retention (0.88 = realistic)
export const BALL_RESTITUTION = 0.96;    // Ball-to-ball energy retention
export const MIN_VELOCITY = 0.06;        // Lower = balls roll out more naturally
export const MAX_SHOT_POWER = 22;
export const MIN_SHOT_POWER = 0.8;       // Minimum power threshold for a valid shot
export const POWER_CHARGE_SPEED = 0.4;

// Mass system - Realistic mass ratios
// Cue ball = 1.0, 8-ball = 1.05 (slightly heavier), others = 0.95-1.0
export const BALL_MASS: Record<number, number> = {
  0: 1.0,   // cue ball
  1: 0.97,  // yellow
  2: 0.98,  // blue
  3: 0.96,  // red
  4: 0.99,  // purple
  5: 0.97,  // orange
  6: 0.98,  // green
  7: 0.96,  // maroon
  8: 1.05,  // 8-ball (heavier)
  9: 0.97,  // yellow stripe
  10: 0.98, // blue stripe
  11: 0.96, // red stripe
  12: 0.99, // purple stripe
  13: 0.97, // orange stripe
  14: 0.98, // green stripe
  15: 0.96, // maroon stripe
};

// Spin / English system
export const SPIN_FACTOR = 0.6;          // How much spin affects ball trajectory
export const SPIN_DECAY = 0.97;          // How fast spin wears off per frame
export const MAX_SPIN = 5.0;             // Maximum spin magnitude
export const SPIN_CUSHION_EFFECT = 0.3;  // How much spin affects cushion rebound angle
export const TOP_SPIN_FACTOR = 0.4;      // Top spin: ball continues forward after hit
export const BACK_SPIN_FACTOR = 0.5;     // Back spin: ball reverses/stops after hit
export const SIDE_SPIN_FACTOR = 0.35;    // Side spin: angle change on cushion bounce

// Cushion physics
export const CUSHION_ENERGY_LOSS = 0.12; // Energy lost on cushion impact (1 - restitution)
export const CUSHION_FRICTION = 0.92;    // Friction applied parallel to cushion on impact

// Pocket detection
export const POCKET_SINK_SPEED = 0.025;  // How fast ball sinks into pocket (lower = slower)
export const POCKET_SCALE_MIN = 0.3;     // Minimum scale during sink animation
export const POCKET_DETECT_RADIUS_MULT = 0.4; // How much ball radius counts toward pocket detection

// Delta time
export const TARGET_FPS = 60;
export const TARGET_DT = 1 / TARGET_FPS;
export const MAX_DT = 1 / 30;            // Cap delta time to prevent physics explosion
export const PHYSICS_SUBSTEPS = 4;       // Sub-steps for more stable physics

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