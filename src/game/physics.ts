import { Ball, Particle, Vec2, TrajectoryHit } from './types';
import {
  TABLE_WIDTH, TABLE_HEIGHT, CUSHION_WIDTH, POCKET_RADIUS,
  FRICTION, WALL_RESTITUTION, BALL_RESTITUTION, MIN_VELOCITY,
  POCKETS, BALL_RADIUS, BALL_COLORS, BALL_MASS,
  SPIN_FACTOR, SPIN_DECAY, MAX_SPIN, SPIN_CUSHION_EFFECT,
  TOP_SPIN_FACTOR, BACK_SPIN_FACTOR, SIDE_SPIN_FACTOR,
  SPIN_CURVE_FACTOR, MASSE_FACTOR,
  CUSHION_ENERGY_LOSS, CUSHION_FRICTION,
  POCKET_DETECT_RADIUS_MULT, POCKET_MOUTH_WIDTH,
  PHYSICS_SUBSTEPS, TARGET_DT,
  CUSHION_SPARK_THRESHOLD, COLLISION_SPARK_THRESHOLD, MAX_PARTICLES,
  ROLLING_FRICTION, SLIDING_FRICTION, SLIDING_THRESHOLD, SPIN_TO_ROLL_TRANSITION
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

    // Enhanced friction model: sliding vs rolling friction
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const frictionCoeff = speed > SLIDING_THRESHOLD ? SLIDING_FRICTION : ROLLING_FRICTION;
    ball.vx *= Math.pow(frictionCoeff, subDt * 60);
    ball.vy *= Math.pow(frictionCoeff, subDt * 60);

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

    // Spin swerve/curve effect
    if (speed > 0.5 && Math.abs(ball.spinY) > 0.1) {
      const dirX = ball.vx / speed;
      const dirY = ball.vy / speed;
      const curveForce = ball.spinY * SPIN_CURVE_FACTOR * subDt * 60 * 0.01;
      ball.vx += -dirY * curveForce;
      ball.vy += dirX * curveForce;
    }
    // Masse effect
    if (speed > 0.5 && Math.abs(ball.spinX) > 0.1) {
      const masseForce = ball.spinX * MASSE_FACTOR * subDt * 60 * 0.01;
      ball.vx += ball.vy / speed * masseForce;
      ball.vy += -ball.vx / speed * masseForce;
    }

    // Spin-to-roll transition: at low speeds, spin converts to rolling
    if (speed < SLIDING_THRESHOLD && speed > 0.1) {
      ball.spinX *= Math.pow(SPIN_TO_ROLL_TRANSITION, subDt * 60);
      ball.spinY *= Math.pow(SPIN_TO_ROLL_TRANSITION, subDt * 60);
    }

    // Angular velocity for visual rolling effect
    ball.angularV = speed / ball.radius;
    ball.rotation += ball.angularV * subDt * 60 * 0.05;

    // Clamp spin
    ball.spinX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, ball.spinX));
    ball.spinY = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, ball.spinY));
  }

  // Smooth stop: gradual deceleration to zero rather than hard cutoff
  const finalSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (finalSpeed < MIN_VELOCITY) {
    ball.vx = 0;
    ball.vy = 0;
    ball.spinX *= 0.9;
    ball.spinY *= 0.9;
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

  // Improved: only skip wall collision if ball is very close to pocket center
  const nearPocket = POCKETS.some(p => distance({ x: ball.x, y: ball.y }, p) < POCKET_RADIUS * 1.5);
  if (nearPocket) return { collided: false, particles: [] };

  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  const doWallHit = (spd: number) => {
    if (spd > CUSHION_SPARK_THRESHOLD) {
      const count = Math.min(8, Math.floor(spd * 1.5));
      for (let i = 0; i < count; i++) {
        particles.push(createCushionSparkParticle(ball.x, ball.y, spd));
      }
    }
  };

  if (ball.x <= left) {
    ball.x = left;
    // Apply spin effect on cushion rebound
    const spinEffect = ball.spinY * SPIN_CUSHION_EFFECT;
    // Side spin changes rebound angle (like real billiards)
    const sideSpinEffect = ball.spinY * SIDE_SPIN_FACTOR * 0.15;
    ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION;
    ball.vy += spinEffect + sideSpinEffect;
    // Energy loss
    ball.vx *= (1 - CUSHION_ENERGY_LOSS);
    // Cushion friction
    ball.vy *= CUSHION_FRICTION;
    // Reduce spin on cushion contact
    ball.spinY *= 0.7;
    collided = true;
    doWallHit(speed);
  }
  if (ball.x >= right) {
    ball.x = right;
    const spinEffect = ball.spinY * SPIN_CUSHION_EFFECT;
    const sideSpinEffect = ball.spinY * SIDE_SPIN_FACTOR * 0.15;
    ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION;
    ball.vy += spinEffect + sideSpinEffect;
    ball.vx *= (1 - CUSHION_ENERGY_LOSS);
    ball.vy *= CUSHION_FRICTION;
    ball.spinY *= 0.7;
    collided = true;
    doWallHit(speed);
  }
  if (ball.y <= top) {
    ball.y = top;
    const spinEffect = ball.spinX * SPIN_CUSHION_EFFECT;
    const sideSpinEffect = ball.spinX * SIDE_SPIN_FACTOR * 0.15;
    ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION;
    ball.vx += spinEffect + sideSpinEffect;
    ball.vy *= (1 - CUSHION_ENERGY_LOSS);
    ball.vx *= CUSHION_FRICTION;
    ball.spinX *= 0.7;
    collided = true;
    doWallHit(speed);
  }
  if (ball.y >= bottom) {
    ball.y = bottom;
    const spinEffect = ball.spinX * SPIN_CUSHION_EFFECT;
    const sideSpinEffect = ball.spinX * SIDE_SPIN_FACTOR * 0.15;
    ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION;
    ball.vx += spinEffect + sideSpinEffect;
    ball.vy *= (1 - CUSHION_ENERGY_LOSS);
    ball.vx *= CUSHION_FRICTION;
    ball.spinX *= 0.7;
    collided = true;
    doWallHit(speed);
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
      // Back spin effect: target ball gets less forward momentum
      if (a.id === 0 && a.spinX < -0.1) {
        b.vx += a.spinX * BACK_SPIN_FACTOR * 0.08;
      }
      if (b.id === 0 && b.spinX < -0.1) {
        a.vx += b.spinX * BACK_SPIN_FACTOR * 0.08;
      }
    }

    const particles: Particle[] = [];
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const speed = Math.sqrt(dvx * dvx + dvy * dvy);

    if (speed > COLLISION_SPARK_THRESHOLD) {
      const count = Math.min(16, Math.floor(speed * 2.5));
      for (let i = 0; i < count; i++) {
        particles.push(createCollisionParticle(cx, cy, speed, a.color));
      }
      // Add extra glow particles for harder hits
      if (speed > 4) {
        for (let i = 0; i < 4; i++) {
          particles.push(createGlowBurstParticle(cx, cy, speed, a.color));
        }
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

    // Improved pocket detection with mouth geometry
    // Corner pockets have wider mouths, side pockets are tighter
    const isCorner = i === 0 || i === 2 || i === 3 || i === 5;
    const mouthMultiplier = isCorner ? POCKET_MOUTH_WIDTH * 1.1 : POCKET_MOUTH_WIDTH;
    const detectRadius = (POCKET_RADIUS + ball.radius * POCKET_DETECT_RADIUS_MULT) * mouthMultiplier;

    if (dist < detectRadius) {
      const particles: Particle[] = [];
      // Enhanced pocket particles
      for (let j = 0; j < 30; j++) {
        particles.push(createPocketParticle(pocket.x, pocket.y, ball.color));
      }
      for (let j = 0; j < 12; j++) {
        particles.push(createStarParticle(pocket.x, pocket.y, ball.color));
      }
      // Add glow burst
      for (let j = 0; j < 8; j++) {
        particles.push(createGlowBurstParticle(pocket.x, pocket.y, 5, ball.color));
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
function createCushionSparkParticle(x: number, y: number, speed: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const vel = (0.5 + Math.random() * 2) * Math.min(speed * 0.3, 3);
  return {
    x, y,
    vx: Math.cos(angle) * vel,
    vy: Math.sin(angle) * vel,
    life: 20 + Math.random() * 20,
    maxLife: 40,
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
    life: 16 + Math.random() * 16,
    maxLife: 32,
    color: Math.random() > 0.4 ? color : '#FFFFFF',
    size: 1 + Math.random() * 2.5,
    type: 'glow',
  };
}

function createGlowBurstParticle(x: number, y: number, speed: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const vel = (1 + Math.random() * 3) * Math.min(speed * 0.15, 2);
  return {
    x, y,
    vx: Math.cos(angle) * vel,
    vy: Math.sin(angle) * vel,
    life: 10 + Math.random() * 10,
    maxLife: 20,
    color: color,
    size: 3 + Math.random() * 4,
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
    life: 40 + Math.random() * 40,
    maxLife: 80,
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
    life: 30 + Math.random() * 30,
    maxLife: 60,
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
    life: 12 + Math.random() * 12,
    maxLife: 24,
    color,
    size: 1 + Math.random() * 1.5,
    type: 'trail',
  };
}

export function updateParticles(particles: Particle[]): Particle[] {
  // Cap particle count
  if (particles.length > MAX_PARTICLES) {
    particles = particles.slice(-MAX_PARTICLES);
  }
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