// Table dimensions (in game units)
export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const CUSHION_WIDTH = 28;
export const POCKET_RADIUS = 22;
export const BALL_RADIUS = 11;
export const CUE_BALL_RADIUS = 11;

// Physics - Realistic billiard values
export const FRICTION = 0.986;           // Rolling resistance per frame (slightly smoother)
export const TABLE_FRICTION = 0.986;     // Same as FRICTION, adjustable separately
export const WALL_RESTITUTION = 0.82;    // Cushion energy retention (0.82 = more realistic felt-top rail)
export const BALL_RESTITUTION = 0.94;    // Ball-to-ball energy retention (slightly less bouncy = more realistic)
export const MIN_VELOCITY = 0.04;        // Lower = balls roll out more naturally
export const MAX_SHOT_POWER = 22;
export const MIN_SHOT_POWER = 0.8;       // Minimum power threshold for a valid shot
export const POWER_CHARGE_SPEED = 0.35;

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

// Spin / English system - IMPROVED
export const SPIN_FACTOR = 0.55;         // How much spin affects ball trajectory
export const SPIN_DECAY = 0.96;          // How fast spin wears off per frame (slower decay = more pronounced spin)
export const MAX_SPIN = 6.0;             // Maximum spin magnitude
export const SPIN_CUSHION_EFFECT = 0.35; // How much spin affects cushion rebound angle
export const TOP_SPIN_FACTOR = 0.5;      // Top spin: ball continues forward after hit
export const BACK_SPIN_FACTOR = 0.6;     // Back spin: ball reverses/stops after hit
export const SIDE_SPIN_FACTOR = 0.45;    // Side spin: angle change on cushion bounce
export const SPIN_CURVE_FACTOR = 0.08;   // How much spin curves the ball in flight (swerve) NEW
export const MASSE_FACTOR = 0.15;        // Vertical spin influence on curved trajectory NEW

// Cushion physics
export const CUSHION_ENERGY_LOSS = 0.15; // Energy lost on cushion impact (1 - restitution)
export const CUSHION_FRICTION = 0.90;    // Friction applied parallel to cushion on impact

// Pocket detection - IMPROVED: wider entry, tighter throat
export const POCKET_SINK_SPEED = 0.03;   // How fast ball sinks into pocket (lower = slower)
export const POCKET_SCALE_MIN = 0.2;     // Minimum scale during sink animation
export const POCKET_DETECT_RADIUS_MULT = 0.5; // How much ball radius counts toward pocket detection
export const POCKET_MOUTH_WIDTH = 1.3;   // Pocket mouth width multiplier (wider opening) NEW
export const POCKET_THROAT_DEPTH = 0.7;  // How deep the pocket throat is NEW

// Delta time
export const TARGET_FPS = 60;
export const TARGET_DT = 1 / TARGET_FPS;
export const MAX_DT = 1 / 30;            // Cap delta time to prevent physics explosion
export const PHYSICS_SUBSTEPS = 6;       // Sub-steps for more stable physics (increased from 4)

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

// VFX constants - NEW
export const TRAIL_PARTICLE_INTERVAL = 1;  // Emit trail every N frames
export const CUSHION_SPARK_THRESHOLD = 0.8; // Minimum speed for cushion sparks
export const COLLISION_SPARK_THRESHOLD = 1.2; // Minimum speed for collision sparks
export const MAX_PARTICLES = 300;          // Cap on simultaneous particles
export const AMBIENT_GLOW_ALPHA = 0.12;    // Cue ball ambient glow