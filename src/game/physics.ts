import { Ball, Particle, Vec2, TrajectoryHit } from './types';
import {
  TABLE_WIDTH, TABLE_HEIGHT, CUSHION_WIDTH, POCKET_RADIUS,
  FRICTION, WALL_RESTITUTION, BALL_RESTITUTION, MIN_VELOCITY,
  POCKETS, BALL_RADIUS, BALL_COLORS, BALL_MASS,
  SPIN_FACTOR, SPIN_DECAY, MAX_SPIN, SPIN_CUSHION_EFFECT,
  TOP_SPIN_FACTOR,
  CUSHION_ENERGY_LOSS, CUSHION_FRICTION,
  POCKET_DETECT_RADIUS_MULT,
  PHYSICS_SUBSTEPS, TARGET_DT
} from './constants';

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function updateBallPhysics(ball: Ball, dt: number = TARGET_DT): void {
  if (ball.pocketed) return;

  const steps = PHYSICS_SUBSTEPS;
  const subDt = dt / steps;

  for (let s = 0; s < steps; s++) {
    // Apply velocity with sub-step
    ball.x += ball.vx * subDt * 60;
    ball.y += ball.vy * subDt * 60;

    // Apply friction (rolling resistance)
    ball.vx *= Math.pow(FRICTION, subDt * 60);
    ball.vy *= Math.pow(FRICTION, subDt * 60);

    // Apply spin decay
    ball.spinX *= Math.pow(SPIN_DECAY, subDt * 60);
    ball.spinY *= Math.pow(SPIN_DECAY, subDt * 60);

    // Spin affects velocity: top/back spin adds/subtracts from velocity
    if (Math.abs(ball.spinX) > 0.01) {
      ball.vx += ball.spinX * SPIN_FACTOR * subDt * 60 * 0.02;
    }
    if (Math.abs(ball.spinY) > 0.01) {
      ball.vy += ball.spinY * SPIN_FACTOR * subDt * 60 * 0.02;
    }

    // Angular velocity for visual rolling effect
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    ball.angularV = speed / ball.radius;
    ball.rotation += ball.angularV * subDt * 60 * 0.05;

    // Clamp spin
    ball.spinX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, ball.spinX));
    ball.spinY = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, ball.spinY));
  }

  // Stop ball if below threshold
  if (Math.abs(ball.vx) < MIN_VELOCITY && Math.abs(ball.vy) < MIN_VELOCITY) {
    ball.vx = 0;
    ball.vy = 0;
  }
}

export function checkWallCollision(ball: Ball): { collided: boolean; particles: Particle[] } {
  if (ball.pocketed) return { collided: false, particles: [] };

  const particles: Particle[] = [];
  let collided = false;

  const left = CUSHION_WIDTH + ball.radius;
  const right = TABLE_WIDTH - CUSHION_WIDTH - ball.radius;
  const top = CUSHION_WIDTH + ball.radius;
  const bottom = TABLE_HEIGHT - CUSHION_WIDTH - ball.radius;

  const nearPocket = POCKETS.some(p => distance({ x: ball.x, y: ball.y }, p) < POCKET_RADIUS * 2.2);
  if (nearPocket) return { collided: false, particles: [] };

  const doWallHit = (speed: number) => {
    if (speed > 1) {
      const count = Math.min(10, Math.floor(speed * 2));
      for (let i = 0; i < count; i++) {
        particles.push(createSparkParticle(ball.x, ball.y, speed));
      }
    }
  };

  if (ball.x <= left) {
    ball.x = left;
    // Apply spin effect on cushion rebound
    const spinEffect = ball.spinY * SPIN_CUSHION_EFFECT;
    ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION;
    ball.vy += spinEffect;
    // Energy loss
    ball.vx *= (1 - CUSHION_ENERGY_LOSS);
    // Cushion friction
    ball.vy *= CUSHION_FRICTION;
    collided = true;
    doWallHit(Math.sqrt(ball.vx ** 2 + ball.vy ** 2));
  }
  if (ball.x >= right) {
    ball.x = right;
    const spinEffect = ball.spinY * SPIN_CUSHION_EFFECT;
    ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION;
    ball.vy += spinEffect;
    ball.vx *= (1 - CUSHION_ENERGY_LOSS);
    ball.vy *= CUSHION_FRICTION;
    collided = true;
    doWallHit(Math.sqrt(ball.vx ** 2 + ball.vy ** 2));
  }
  if (ball.y <= top) {
    ball.y = top;
    const spinEffect = ball.spinX * SPIN_CUSHION_EFFECT;
    ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION;
    ball.vx += spinEffect;
    ball.vy *= (1 - CUSHION_ENERGY_LOSS);
    ball.vx *= CUSHION_FRICTION;
    collided = true;
    doWallHit(Math.sqrt(ball.vx ** 2 + ball.vy ** 2));
  }
  if (ball.y >= bottom) {
    ball.y = bottom;
    const spinEffect = ball.spinX * SPIN_CUSHION_EFFECT;
    ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION;
    ball.vx += spinEffect;
    ball.vy *= (1 - CUSHION_ENERGY_LOSS);
    ball.vx *= CUSHION_FRICTION;
    collided = true;
    doWallHit(Math.sqrt(ball.vx ** 2 + ball.vy ** 2));
  }

  return { collided, particles };
}

export function checkBallCollision(a: Ball, b: Ball): { collided: boolean; particles: Particle[] } {
  if (a.pocketed || b.pocketed) return { collided: false, particles: [] };

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist < minDist && dist > 0.001) {
    const overlap = minDist - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    // Mass-weighted position correction
    const totalMass = a.mass + b.mass;
    a.x -= nx * overlap * (b.mass / totalMass);
    a.y -= ny * overlap * (b.mass / totalMass);
    b.x += nx * overlap * (a.mass / totalMass);
    b.y += ny * overlap * (a.mass / totalMass);

    // Relative velocity along collision normal
    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dvDotN = dvx * nx + dvy * ny;

    if (dvDotN > 0) {
      // Elastic collision with mass weighting
      const impulse = (1 + BALL_RESTITUTION) * dvDotN / (1 / a.mass + 1 / b.mass);
      a.vx -= (impulse / a.mass) * nx;
      a.vy -= (impulse / a.mass) * ny;
      b.vx += (impulse / b.mass) * nx;
      b.vy += (impulse / b.mass) * ny;

      // Transfer spin on collision
      const tangentX = -ny;
      const tangentY = nx;
      const relTangentVel = dvx * tangentX + dvy * tangentY;
      const spinTransfer = relTangentVel * 0.05;

      a.spinX += spinTransfer * tangentX * 0.5;
      a.spinY += spinTransfer * tangentY * 0.5;
      b.spinX += spinTransfer * tangentX * 0.5;
      b.spinY += spinTransfer * tangentY * 0.5;

      // Apply spin effects on target ball after collision
      // Top spin on cue ball = target ball gets forward momentum
      if (a.id === 0 && Math.abs(a.spinX) > 0.1) {
        b.vx += a.spinX * TOP_SPIN_FACTOR * 0.1;
      }
      if (b.id === 0 && Math.abs(b.spinX) > 0.1) {
        a.vx += b.spinX * TOP_SPIN_FACTOR * 0.1;
      }
    }

    const particles: Particle[] = [];
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const speed = Math.sqrt(dvx * dvx + dvy * dvy);

    if (speed > 1.5) {
      const count = Math.min(14, Math.floor(speed * 2));
      for (let i = 0; i < count; i++) {
        particles.push(createCollisionParticle(cx, cy, speed, a.color));
      }
    }

    return { collided: true, particles };
  }

  return { collided: false, particles: [] };
}

export function checkPocketCollision(ball: Ball): { pocketed: boolean; pocketIndex: number; particles: Particle[]; pocketPos: Vec2 | null } {
  if (ball.pocketed) return { pocketed: false, pocketIndex: -1, particles: [], pocketPos: null };

  for (let i = 0; i < POCKETS.length; i++) {
    const pocket = POCKETS[i];
    const dist = distance({ x: ball.x, y: ball.y }, pocket);

    // Progressive detection: ball enters pocket partially before being pocketed
    const detectRadius = POCKET_RADIUS + ball.radius * POCKET_DETECT_RADIUS_MULT;
    if (dist < detectRadius) {
      const particles: Particle[] = [];
      for (let j = 0; j < 24; j++) {
        particles.push(createPocketParticle(pocket.x, pocket.y, ball.color));
      }
      for (let j = 0; j < 10; j++) {
        particles.push(createStarParticle(pocket.x, pocket.y, ball.color));
      }
      return { pocketed: true, pocketIndex: i, particles, pocketPos: { x: pocket.x, y: pocket.y } };
    }
  }

  return { pocketed: false, pocketIndex: -1, particles: [], pocketPos: null };
}

export function areBallsMoving(balls: Ball[]): boolean {
  return balls.some(b => !b.pocketed && (
    Math.abs(b.vx) > MIN_VELOCITY ||
    Math.abs(b.vy) > MIN_VELOCITY ||
    Math.abs(b.spinX) > 0.05 ||
    Math.abs(b.spinY) > 0.05
  ));
}

// ─── Trajectory prediction ──────────────────────────────────────────
export function computeTrajectory(cueBall: Ball, angle: number, allBalls: Ball[], currentPlayerType: 'solids' | 'stripes' | null = null): TrajectoryHit | null {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let closestDist = 600; // max ray distance
  let hitBall: Ball | null = null;

  for (const other of allBalls) {
    if (other.id === cueBall.id || other.pocketed) continue;

    const fx = cueBall.x - other.x;
    const fy = cueBall.y - other.y;
    const minDist = cueBall.radius + other.radius;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - minDist * minDist;
    const discriminant = b * b - 4 * a * c;

    if (discriminant >= 0) {
      const t = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (t > 0 && t < closestDist) {
        closestDist = t;
        hitBall = other;
      }
    }
  }

  if (!hitBall) return null;

  const hitX = cueBall.x + dx * closestDist;
  const hitY = cueBall.y + dy * closestDist;

  // Compute deflection: target ball moves along the line connecting cue-ball-center → target-ball-center
  const toDx = hitBall.x - hitX;
  const toDy = hitBall.y - hitY;
  const toLen = Math.sqrt(toDx * toDx + toDy * toDy);
  const deflectAngle = Math.atan2(toDy / toLen, toDx / toLen);

  // Cue ball deflects 90° from the target ball's path (approximately)
  const nx = toDx / toLen;
  const ny = toDy / toLen;
  const tangentX = dx - (dx * nx + dy * ny) * nx;
  const tangentY = dy - (dx * nx + dy * ny) * ny;
  const cueDeflect = Math.atan2(tangentY, tangentX);

  // Determine if this is the wrong ball group
  let isWrongBall = false;
  if (currentPlayerType && hitBall.id !== 8) {
    if (currentPlayerType === 'solids' && hitBall.id > 8) isWrongBall = true;
    if (currentPlayerType === 'stripes' && hitBall.id < 8) isWrongBall = true;
  }

  return {
    hitPoint: { x: hitX, y: hitY },
    targetBall: hitBall,
    deflectAngle,
    cueDeflect,
    aimDist: closestDist,
    isWrongBall,
  };
}

// ─── Particle factories ─────────────────────────────────────────────
function createSparkParticle(x: number, y: number, speed: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const vel = (0.5 + Math.random() * 2) * Math.min(speed * 0.3, 3);
  return {
    x, y,
    vx: Math.cos(angle) * vel,
    vy: Math.sin(angle) * vel,
    life: 18 + Math.random() * 18,
    maxLife: 36,
    color: `hsl(${35 + Math.random() * 35}, 100%, ${55 + Math.random() * 35}%)`,
    size: 1.5 + Math.random() * 2.5,
    type: 'spark',
  };
}

function createCollisionParticle(x: number, y: number, speed: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const vel = (0.5 + Math.random() * 2) * Math.min(speed * 0.2, 2.5);
  return {
    x, y,
    vx: Math.cos(angle) * vel,
    vy: Math.sin(angle) * vel,
    life: 14 + Math.random() * 14,
    maxLife: 28,
    color: Math.random() > 0.4 ? color : '#FFFFFF',
    size: 1 + Math.random() * 2.5,
    type: 'glow',
  };
}

function createPocketParticle(x: number, y: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const vel = 1.5 + Math.random() * 4.5;
  return {
    x, y,
    vx: Math.cos(angle) * vel,
    vy: Math.sin(angle) * vel,
    life: 35 + Math.random() * 35,
    maxLife: 70,
    color,
    size: 2.5 + Math.random() * 4,
    type: 'glow',
  };
}

function createStarParticle(x: number, y: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const vel = 2.5 + Math.random() * 3.5;
  return {
    x, y,
    vx: Math.cos(angle) * vel,
    vy: Math.sin(angle) * vel,
    life: 25 + Math.random() * 25,
    maxLife: 50,
    color,
    size: 3 + Math.random() * 4,
    type: 'star',
  };
}

export function createTrailParticle(x: number, y: number, color: string): Particle {
  return {
    x: x + (Math.random() - 0.5) * 3,
    y: y + (Math.random() - 0.5) * 3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    life: 10 + Math.random() * 10,
    maxLife: 20,
    color,
    size: 1 + Math.random() * 1.5,
    type: 'trail',
  };
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    return p.life > 0;
  });
}

export function createBalls(): Ball[] {
  const balls: Ball[] = [];

  balls.push({
    id: 0,
    x: TABLE_WIDTH * 0.25,
    y: TABLE_HEIGHT / 2,
    vx: 0, vy: 0,
    radius: BALL_RADIUS,
    pocketed: false,
    color: '#FFFFFF',
    stripe: false,
    sinkAnim: 0,
    sinkPocket: null,
    mass: BALL_MASS[0],
    spinX: 0,
    spinY: 0,
    angularV: 0,
    rotation: 0,
  });

  const startX = TABLE_WIDTH * 0.7;
  const startY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2.05;
  const rackOrder = [1, 9, 2, 10, 8, 11, 3, 12, 6, 14, 4, 13, 7, 15, 5];
  let ballIndex = 0;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const x = startX + row * spacing * Math.cos(Math.PI / 6);
      const y = startY + (col - row / 2) * spacing;
      const num = rackOrder[ballIndex];
      const info = BALL_COLORS[num];
      balls.push({
        id: num, x, y,
        vx: 0, vy: 0,
        radius: BALL_RADIUS,
        pocketed: false,
        color: info.color,
        stripe: info.stripe,
        sinkAnim: 0,
        sinkPocket: null,
        mass: BALL_MASS[num],
        spinX: 0,
        spinY: 0,
        angularV: 0,
        rotation: 0,
      });
      ballIndex++;
    }
  }

  return balls;
}

export function getDefaultCueBallPosition(): Vec2 {
  return { x: TABLE_WIDTH * 0.25, y: TABLE_HEIGHT / 2 };
}