import { Ball, Particle, ScreenShake, TrajectoryHit } from './types';
import {
  TABLE_WIDTH, TABLE_HEIGHT, CUSHION_WIDTH, POCKET_RADIUS,
  POCKETS, MAX_SHOT_POWER
} from './constants';

// ═══════════════════════════════════════════════════════════════
//  TABLE  – overhead lamp-lit billiard table with wood & felt
// ═══════════════════════════════════════════════════════════════
export function renderTable(ctx: CanvasRenderingContext2D, scale: number, shake: ScreenShake) {
  const sx = shake.elapsed < shake.duration
    ? (Math.random() - 0.5) * shake.intensity * (1 - shake.elapsed / shake.duration)
    : 0;
  const sy = shake.elapsed < shake.duration
    ? (Math.random() - 0.5) * shake.intensity * (1 - shake.elapsed / shake.duration)
    : 0;

  ctx.save();
  ctx.translate(sx * scale, sy * scale);

  const fw = 22; // frame width

  // ── outer shadow ──
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 20 * scale;
  ctx.shadowOffsetY = 6 * scale;

  // ── wood frame ──
  const woodGrad = ctx.createLinearGradient(0, -fw * scale, 0, (TABLE_HEIGHT + fw) * scale);
  woodGrad.addColorStop(0, '#7B4B2A');
  woodGrad.addColorStop(0.15, '#A06030');
  woodGrad.addColorStop(0.5, '#6B3F1F');
  woodGrad.addColorStop(0.85, '#A06030');
  woodGrad.addColorStop(1, '#5C3318');
  ctx.fillStyle = woodGrad;
  roundRect(ctx, -fw * scale, -fw * scale,
    (TABLE_WIDTH + fw * 2) * scale, (TABLE_HEIGHT + fw * 2) * scale, 14 * scale);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // inner bevel
  ctx.strokeStyle = '#3A1F0B';
  ctx.lineWidth = 2 * scale;
  roundRect(ctx, -fw * scale, -fw * scale,
    (TABLE_WIDTH + fw * 2) * scale, (TABLE_HEIGHT + fw * 2) * scale, 14 * scale);
  ctx.stroke();

  // gold inlay line
  ctx.strokeStyle = 'rgba(210,170,90,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, -(fw - 4) * scale, -(fw - 4) * scale,
    (TABLE_WIDTH + (fw - 4) * 2) * scale, (TABLE_HEIGHT + (fw - 4) * 2) * scale, 10 * scale);
  ctx.stroke();

  // ── cushion base ──
  ctx.fillStyle = '#18613A';
  ctx.fillRect(0, 0, TABLE_WIDTH * scale, TABLE_HEIGHT * scale);

  // ── felt surface ──
  const feltGrad = ctx.createRadialGradient(
    TABLE_WIDTH / 2 * scale, TABLE_HEIGHT / 2 * scale, 0,
    TABLE_WIDTH / 2 * scale, TABLE_HEIGHT / 2 * scale, TABLE_WIDTH * 0.55 * scale
  );
  feltGrad.addColorStop(0, '#22A85A');
  feltGrad.addColorStop(0.6, '#1C8C48');
  feltGrad.addColorStop(1, '#156E38');
  ctx.fillStyle = feltGrad;
  const feltL = CUSHION_WIDTH;
  ctx.fillRect(feltL * scale, feltL * scale,
    (TABLE_WIDTH - feltL * 2) * scale, (TABLE_HEIGHT - feltL * 2) * scale);

  // subtle felt texture
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 300; i++) {
    const rx = (feltL + Math.random() * (TABLE_WIDTH - feltL * 2)) * scale;
    const ry = (feltL + Math.random() * (TABLE_HEIGHT - feltL * 2)) * scale;
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(rx, ry, 1.5 * scale, 1.5 * scale);
  }
  ctx.globalAlpha = 1;

  // ── cushion rails (3-D) ──
  drawCushions(ctx, scale);

  // ── diamonds on rails ──
  drawDiamonds(ctx, scale);

  // ── head string & foot spot ──
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(TABLE_WIDTH * 0.25 * scale, CUSHION_WIDTH * scale);
  ctx.lineTo(TABLE_WIDTH * 0.25 * scale, (TABLE_HEIGHT - CUSHION_WIDTH) * scale);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(TABLE_WIDTH * 0.7 * scale, TABLE_HEIGHT / 2 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // ── pockets ──
  drawPockets(ctx, scale);

  // ── overhead lamp light cone ──
  const lampGrad = ctx.createRadialGradient(
    TABLE_WIDTH / 2 * scale, TABLE_HEIGHT / 2 * scale, 20 * scale,
    TABLE_WIDTH / 2 * scale, TABLE_HEIGHT / 2 * scale, TABLE_WIDTH * 0.48 * scale
  );
  lampGrad.addColorStop(0, 'rgba(255,250,220,0.07)');
  lampGrad.addColorStop(0.5, 'rgba(255,250,220,0.03)');
  lampGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = lampGrad;
  ctx.fillRect(feltL * scale, feltL * scale,
    (TABLE_WIDTH - feltL * 2) * scale, (TABLE_HEIGHT - feltL * 2) * scale);

  ctx.restore();
}

function drawCushions(ctx: CanvasRenderingContext2D, s: number) {
  const cw = CUSHION_WIDTH;
  const tw = TABLE_WIDTH;
  const th = TABLE_HEIGHT;

  // top
  let g = ctx.createLinearGradient(0, 0, 0, cw * s);
  g.addColorStop(0, '#0E4D28');
  g.addColorStop(0.4, '#19703D');
  g.addColorStop(0.7, '#1A6B3A');
  g.addColorStop(1, '#135E30');
  ctx.fillStyle = g;
  ctx.fillRect(cw * s, 0, (tw - cw * 2) * s, cw * s);

  // bottom
  g = ctx.createLinearGradient(0, (th - cw) * s, 0, th * s);
  g.addColorStop(0, '#135E30');
  g.addColorStop(0.3, '#1A6B3A');
  g.addColorStop(0.6, '#19703D');
  g.addColorStop(1, '#0E4D28');
  ctx.fillStyle = g;
  ctx.fillRect(cw * s, (th - cw) * s, (tw - cw * 2) * s, cw * s);

  // left
  g = ctx.createLinearGradient(0, 0, cw * s, 0);
  g.addColorStop(0, '#0E4D28');
  g.addColorStop(0.4, '#19703D');
  g.addColorStop(1, '#135E30');
  ctx.fillStyle = g;
  ctx.fillRect(0, cw * s, cw * s, (th - cw * 2) * s);

  // right
  g = ctx.createLinearGradient((tw - cw) * s, 0, tw * s, 0);
  g.addColorStop(0, '#135E30');
  g.addColorStop(0.6, '#19703D');
  g.addColorStop(1, '#0E4D28');
  ctx.fillStyle = g;
  ctx.fillRect((tw - cw) * s, cw * s, cw * s, (th - cw * 2) * s);

  // inner edge highlight (rubber)
  ctx.strokeStyle = 'rgba(100,220,130,0.18)';
  ctx.lineWidth = 2 * s;
  // top
  ctx.beginPath();
  ctx.moveTo((cw + POCKET_RADIUS * 1.5) * s, (cw - 1) * s);
  ctx.lineTo((tw / 2 - POCKET_RADIUS * 1.2) * s, (cw - 1) * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((tw / 2 + POCKET_RADIUS * 1.2) * s, (cw - 1) * s);
  ctx.lineTo((tw - cw - POCKET_RADIUS * 1.5) * s, (cw - 1) * s);
  ctx.stroke();
  // bottom
  ctx.beginPath();
  ctx.moveTo((cw + POCKET_RADIUS * 1.5) * s, (th - cw + 1) * s);
  ctx.lineTo((tw / 2 - POCKET_RADIUS * 1.2) * s, (th - cw + 1) * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((tw / 2 + POCKET_RADIUS * 1.2) * s, (th - cw + 1) * s);
  ctx.lineTo((tw - cw - POCKET_RADIUS * 1.5) * s, (th - cw + 1) * s);
  ctx.stroke();
  // left
  ctx.beginPath();
  ctx.moveTo((cw - 1) * s, (cw + POCKET_RADIUS * 1.5) * s);
  ctx.lineTo((cw - 1) * s, (th - cw - POCKET_RADIUS * 1.5) * s);
  ctx.stroke();
  // right
  ctx.beginPath();
  ctx.moveTo((tw - cw + 1) * s, (cw + POCKET_RADIUS * 1.5) * s);
  ctx.lineTo((tw - cw + 1) * s, (th - cw - POCKET_RADIUS * 1.5) * s);
  ctx.stroke();
}

function drawDiamonds(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = 'rgba(255,250,220,0.28)';
  const cw = CUSHION_WIDTH;
  const tw = TABLE_WIDTH;
  const th = TABLE_HEIGHT;
  const dSize = 3.2 * s;

  // top/bottom rail diamonds (skip pocket areas)
  for (let i = 1; i <= 3; i++) {
    const x1 = cw + (tw / 2 - cw) * i / 4;
    const x2 = tw / 2 + (tw / 2 - cw) * i / 4;
    for (const x of [x1, x2]) {
      ctx.beginPath();
      diamond(ctx, x * s, cw / 2 * s, dSize);
      ctx.fill();
      ctx.beginPath();
      diamond(ctx, x * s, (th - cw / 2) * s, dSize);
      ctx.fill();
    }
  }
  // side rail diamonds
  for (let i = 1; i <= 3; i++) {
    const y = cw + (th - cw * 2) * i / 4;
    ctx.beginPath();
    diamond(ctx, cw / 2 * s, y * s, dSize);
    ctx.fill();
    ctx.beginPath();
    diamond(ctx, (tw - cw / 2) * s, y * s, dSize);
    ctx.fill();
  }
}

function drawPockets(ctx: CanvasRenderingContext2D, s: number) {
  for (const p of POCKETS) {
    // outer shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, (POCKET_RADIUS + 4) * s, 0, Math.PI * 2);
    ctx.fill();

    // pocket hole
    const holeGrad = ctx.createRadialGradient(p.x * s, p.y * s, 0, p.x * s, p.y * s, POCKET_RADIUS * s);
    holeGrad.addColorStop(0, '#050505');
    holeGrad.addColorStop(0.85, '#0A0A0A');
    holeGrad.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, POCKET_RADIUS * s, 0, Math.PI * 2);
    ctx.fill();

    // brass rim
    const rimGrad = ctx.createRadialGradient(
      p.x * s, p.y * s, (POCKET_RADIUS - 2) * s,
      p.x * s, p.y * s, (POCKET_RADIUS + 3) * s
    );
    rimGrad.addColorStop(0, 'transparent');
    rimGrad.addColorStop(0.3, 'rgba(180,150,60,0.5)');
    rimGrad.addColorStop(0.6, 'rgba(120,90,30,0.4)');
    rimGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, (POCKET_RADIUS + 3) * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number) {
  ctx.moveTo(x, y - sz);
  ctx.lineTo(x + sz * 0.55, y);
  ctx.lineTo(x, y + sz);
  ctx.lineTo(x - sz * 0.55, y);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════
//  BALL  – 3-D lit sphere with stripe / number
// ═══════════════════════════════════════════════════════════════
export function renderBall(ctx: CanvasRenderingContext2D, ball: Ball, scale: number, time: number) {
  if (ball.pocketed && ball.sinkAnim <= 0) return;

  let drawScale = 1;
  let drawAlpha = 1;
  let bx = ball.x;
  let by = ball.y;

  // Sink animation – shrink into pocket
  if (ball.sinkAnim > 0 && ball.sinkPocket) {
    const t = 1 - ball.sinkAnim; // 0→1
    drawScale = 1 - t * 0.7;
    drawAlpha = 1 - t;
    bx = ball.x + (ball.sinkPocket.x - ball.x) * t * 0.5;
    by = ball.y + (ball.sinkPocket.y - ball.y) * t * 0.5;
  }

  const x = bx * scale;
  const y = by * scale;
  const r = ball.radius * scale * drawScale;

  ctx.save();
  ctx.globalAlpha = drawAlpha;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 1.5 * scale, y + 2 * scale, r * 0.92, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // ball body gradient
  const bg = ctx.createRadialGradient(x - r * 0.28, y - r * 0.32, r * 0.08, x, y, r);
  if (ball.id === 0) {
    bg.addColorStop(0, '#FFFFFF');
    bg.addColorStop(0.55, '#F0F0F0');
    bg.addColorStop(1, '#B8B8B8');
  } else {
    bg.addColorStop(0, lighten(ball.color, 55));
    bg.addColorStop(0.5, ball.color);
    bg.addColorStop(1, darken(ball.color, 40));
  }
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // stripe
  if (ball.stripe) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - r, y - r * 0.33, r * 2, r * 0.66);
    // number disc
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (ball.id !== 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.40, 0, Math.PI * 2);
    ctx.fill();
  }

  // number
  if (ball.id !== 0) {
    ctx.fillStyle = '#000';
    ctx.font = `bold ${r * 0.68}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.id.toString(), x, y + 0.5);
  }

  // specular highlight
  const sp = ctx.createRadialGradient(x - r * 0.22, y - r * 0.28, 0, x - r * 0.22, y - r * 0.28, r * 0.48);
  sp.addColorStop(0, 'rgba(255,255,255,0.7)');
  sp.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // subtle edge dark ring
  const edge = ctx.createRadialGradient(x, y, r * 0.85, x, y, r);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // cue ball ambient glow
  if (ball.id === 0 && !ball.pocketed) {
    const ga = 0.06 + Math.sin(time * 0.003) * 0.03;
    const gg = ctx.createRadialGradient(x, y, r, x, y, r * 2.2);
    gg.addColorStop(0, `rgba(200,230,255,${ga})`);
    gg.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  CUE STICK + TRAJECTORY + DEFLECTION LINES
// ═══════════════════════════════════════════════════════════════
export function renderCueAndTrajectory(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  angle: number,
  power: number,
  scale: number,
  time: number,
  trajectory: TrajectoryHit | null,
  isCharging: boolean,
) {
  if (ball.pocketed) return;

  const x = ball.x * scale;
  const y = ball.y * scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  ctx.save();

  // ── aim line from cue ball to hit point (or far away) ──
  const aimLen = trajectory ? trajectory.aimDist : 500;
  const isWrong = trajectory?.isWrongBall ?? false;

  // Main aim line — bright cyan, thick, highly visible on green felt
  const aimColor = isWrong ? 'rgba(255,60,80,0.7)' : 'rgba(0,240,255,0.55)';
  const aimGlow  = isWrong ? 'rgba(255,60,80,0.15)' : 'rgba(0,240,255,0.1)';

  // glow underneath
  ctx.strokeStyle = aimGlow;
  ctx.lineWidth = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(x + cos * ball.radius * scale * 1.3, y + sin * ball.radius * scale * 1.3);
  ctx.lineTo(x + cos * aimLen * scale, y + sin * aimLen * scale);
  ctx.stroke();

  // main line
  ctx.strokeStyle = aimColor;
  ctx.lineWidth = 2.5 * scale;
  ctx.setLineDash([6 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(x + cos * ball.radius * scale * 1.3, y + sin * ball.radius * scale * 1.3);
  ctx.lineTo(x + cos * aimLen * scale, y + sin * aimLen * scale);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── if trajectory hit exists, draw deflection lines ──
  if (trajectory) {
    const hp = trajectory.hitPoint;
    const hx = hp.x * scale;
    const hy = hp.y * scale;
    const tb = trajectory.targetBall;

    // ghost cue ball at hit point
    ctx.strokeStyle = isWrong ? 'rgba(255,80,80,0.35)' : 'rgba(0,240,255,0.3)';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.arc(hx, hy, ball.radius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // ── WRONG-BALL red marker on target ball ──
    if (isWrong) {
      const tbx = tb.x * scale, tby = tb.y * scale, tbr = tb.radius * scale;
      // pulsing red ring
      const rAlpha = 0.55 + Math.sin(time * 0.008) * 0.2;
      ctx.strokeStyle = `rgba(255,40,40,${rAlpha})`;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(tbx, tby, tbr + 4 * scale, 0, Math.PI * 2);
      ctx.stroke();
      // red X through the ball
      ctx.strokeStyle = `rgba(255,50,50,${rAlpha})`;
      ctx.lineWidth = 2.5 * scale;
      ctx.lineCap = 'round';
      const xsz = tbr * 0.65;
      ctx.beginPath();
      ctx.moveTo(tbx - xsz, tby - xsz); ctx.lineTo(tbx + xsz, tby + xsz);
      ctx.moveTo(tbx + xsz, tby - xsz); ctx.lineTo(tbx - xsz, tby + xsz);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // ── target ball deflection line — bright magenta/yellow ──
    const dCos = Math.cos(trajectory.deflectAngle);
    const dSin = Math.sin(trajectory.deflectAngle);
    const deflLen = 100 * scale;

    const deflColor = isWrong ? 'rgba(255,80,80,0.5)' : 'rgba(255,220,0,0.65)';
    const deflGlow  = isWrong ? 'rgba(255,80,80,0.1)' : 'rgba(255,220,0,0.12)';

    // glow
    ctx.strokeStyle = deflGlow;
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(tb.x * scale, tb.y * scale);
    ctx.lineTo(tb.x * scale + dCos * deflLen, tb.y * scale + dSin * deflLen);
    ctx.stroke();
    // line
    ctx.strokeStyle = deflColor;
    ctx.lineWidth = 2.5 * scale;
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(tb.x * scale, tb.y * scale);
    ctx.lineTo(tb.x * scale + dCos * deflLen, tb.y * scale + dSin * deflLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // arrowhead
    const ax = tb.x * scale + dCos * deflLen;
    const ay = tb.y * scale + dSin * deflLen;
    ctx.fillStyle = deflColor;
    ctx.beginPath();
    ctx.moveTo(ax + dCos * 6 * scale, ay + dSin * 6 * scale);
    ctx.lineTo(ax + Math.cos(trajectory.deflectAngle + 2.4) * 6 * scale,
      ay + Math.sin(trajectory.deflectAngle + 2.4) * 6 * scale);
    ctx.lineTo(ax + Math.cos(trajectory.deflectAngle - 2.4) * 6 * scale,
      ay + Math.sin(trajectory.deflectAngle - 2.4) * 6 * scale);
    ctx.closePath(); ctx.fill();

    // ── cue ball deflection line (after hit) ──
    const cdCos = Math.cos(trajectory.cueDeflect);
    const cdSin = Math.sin(trajectory.cueDeflect);
    const cdLen = 60 * scale;
    const tangentMag = Math.sqrt(
      (cos - (cos * dCos + sin * dSin) * dCos) ** 2 +
      (sin - (cos * dCos + sin * dSin) * dSin) ** 2
    );
    if (tangentMag > 0.15) {
      ctx.strokeStyle = 'rgba(140,200,255,0.35)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([3 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + cdCos * cdLen, hy + cdSin * cdLen);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // impact marker — pulsing
    const impA = 0.4 + Math.sin(time * 0.006) * 0.2;
    ctx.strokeStyle = isWrong ? `rgba(255,60,60,${impA})` : `rgba(0,255,220,${impA})`;
    ctx.lineWidth = 2 * scale;
    const cs = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(hx - cs, hy); ctx.lineTo(hx + cs, hy);
    ctx.moveTo(hx, hy - cs); ctx.lineTo(hx, hy + cs);
    ctx.stroke();
  }

  // ── cue stick ──
  const cueLen = 200 * scale;
  const cueThick = 4.5 * scale;
  const pullBack = (power / MAX_SHOT_POWER) * 70 * scale;
  const breathe = isCharging ? Math.sin(time * 0.008) * 0.4 * scale : 0;

  const startDist = ball.radius * scale * 1.4 + pullBack;
  const cA = angle + Math.PI;

  const sx = x + Math.cos(cA) * startDist;
  const sy = y + Math.sin(cA) * startDist + breathe;
  const ex = x + Math.cos(cA) * (startDist + cueLen);
  const ey = y + Math.sin(cA) * (startDist + cueLen) + breathe;

  // shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = cueThick + 3 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx + 2.5 * scale, sy + 2.5 * scale);
  ctx.lineTo(ex + 2.5 * scale, ey + 2.5 * scale);
  ctx.stroke();

  // body
  const cg = ctx.createLinearGradient(sx, sy, ex, ey);
  cg.addColorStop(0, '#F2E0C4');
  cg.addColorStop(0.04, '#FFFFFF');
  cg.addColorStop(0.07, '#D8A860');
  cg.addColorStop(0.18, '#C08030');
  cg.addColorStop(0.35, '#8B5020');
  cg.addColorStop(0.55, '#3A1A08');
  cg.addColorStop(0.75, '#2A1205');
  cg.addColorStop(0.9, '#1A0C03');
  cg.addColorStop(1, '#100800');
  ctx.strokeStyle = cg;
  ctx.lineWidth = cueThick;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // highlight stripe along cue
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, sy - cueThick * 0.3);
  ctx.lineTo(ex, ey - cueThick * 0.3);
  ctx.stroke();

  // ferrule (ivory band)
  const ferruleLen = 8 * scale;
  const fx1 = sx;
  const fy1 = sy;
  const fx2 = sx + Math.cos(cA) * (-ferruleLen);
  const fy2 = sy + Math.sin(cA) * (-ferruleLen);
  ctx.strokeStyle = '#F5E8D0';
  ctx.lineWidth = cueThick;
  ctx.beginPath();
  ctx.moveTo(fx1, fy1);
  ctx.lineTo(fx2, fy2);
  ctx.stroke();

  // tip (blue chalk)
  ctx.fillStyle = '#4488CC';
  ctx.beginPath();
  ctx.arc(sx, sy, cueThick * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  POWER BAR  – cue-stick–style sidebar, drag to charge
// ═══════════════════════════════════════════════════════════════
export function renderPowerBar(
  ctx: CanvasRenderingContext2D,
  power: number,
  canvasW: number,
  canvasH: number,
  scale: number,
  isCharging: boolean,
  time: number
) {
  const s = Math.min(scale, 1.3);
  const barW = 22 * s;
  const barH = Math.min(280 * s, canvasH * 0.55);
  const bx = canvasW - 48 * s;
  const by = (canvasH - barH) / 2;

  // outer panel
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rrPath(ctx, bx - 8 * s, by - 28 * s, barW + 16 * s, barH + 56 * s, 10 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  rrPath(ctx, bx - 8 * s, by - 28 * s, barW + 16 * s, barH + 56 * s, 10 * s);
  ctx.stroke();

  // label
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${9 * s}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('POWER', bx + barW / 2, by - 12 * s);

  // empty track
  ctx.fillStyle = 'rgba(40,40,40,0.8)';
  rrPath(ctx, bx, by, barW, barH, 5 * s);
  ctx.fill();

  // tick marks
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const ty = by + barH - barH * i / 10;
    ctx.beginPath();
    ctx.moveTo(bx, ty);
    ctx.lineTo(bx + (i % 5 === 0 ? barW : barW * 0.4), ty);
    ctx.stroke();
  }

  // fill
  const pct = power / MAX_SHOT_POWER;
  const fillH = pct * barH;

  if (fillH > 0) {
    const fg = ctx.createLinearGradient(bx, by + barH, bx, by + barH - fillH);
    if (pct < 0.35) {
      fg.addColorStop(0, '#22DD55');
      fg.addColorStop(1, '#18AA40');
    } else if (pct < 0.7) {
      fg.addColorStop(0, '#FFCC00');
      fg.addColorStop(1, '#EE8800');
    } else {
      fg.addColorStop(0, '#FF3333');
      fg.addColorStop(1, '#CC0000');
    }
    ctx.fillStyle = fg;
    rrPath(ctx, bx, by + barH - fillH, barW, fillH, 5 * s);
    ctx.fill();

    // glow
    if (pct > 0.5) {
      const gg = ctx.createLinearGradient(bx, by + barH, bx, by + barH - fillH);
      gg.addColorStop(0, `rgba(255,${Math.floor(200 * (1 - pct))},0,${pct * 0.25})`);
      gg.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = gg;
      rrPath(ctx, bx - 3 * s, by + barH - fillH - 3 * s, barW + 6 * s, fillH + 6 * s, 7 * s);
      ctx.fill();
    }
  }

  // slider handle (draggable)
  const handleY = by + barH - fillH;
  const handleH = 14 * s;
  const pulse = isCharging ? Math.sin(time * 0.008) * 2 * s : 0;
  ctx.fillStyle = isCharging ? '#FFD700' : '#CCC';
  rrPath(ctx, bx - 4 * s + pulse, handleY - handleH / 2, barW + 8 * s - pulse * 2, handleH, 4 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  rrPath(ctx, bx - 4 * s + pulse, handleY - handleH / 2, barW + 8 * s - pulse * 2, handleH, 4 * s);
  ctx.stroke();
  // grip lines on handle
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + 3 * s, handleY + i * 3 * s);
    ctx.lineTo(bx + barW - 3 * s, handleY + i * 3 * s);
    ctx.stroke();
  }

  // percentage label
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${10 * s}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(pct * 100)}%`, bx + barW / 2, by + barH + 16 * s);

  // instruction
  if (!isCharging && power < 0.5) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `${7 * s}px Arial`;
    ctx.fillText('HOLD', bx + barW / 2, by + barH + 28 * s);
    ctx.fillText('SPACE', bx + barW / 2, by + barH + 37 * s);
  }
  if (isCharging) {
    ctx.fillStyle = 'rgba(255,220,50,0.6)';
    ctx.font = `bold ${7 * s}px Arial`;
    ctx.fillText('RELEASE', bx + barW / 2, by + barH + 28 * s);
    ctx.fillText('TO SHOOT', bx + barW / 2, by + barH + 37 * s);
  }
}

// Return the bounding box of the power bar for touch hit testing
export function getPowerBarBounds(canvasW: number, canvasH: number, scale: number) {
  const s = Math.min(scale, 1.3);
  const barW = 22 * s;
  const barH = Math.min(280 * s, canvasH * 0.55);
  const bx = canvasW - 48 * s;
  const by = (canvasH - barH) / 2;
  return { x: bx - 12 * s, y: by - 32 * s, w: barW + 24 * s, h: barH + 64 * s, barY: by, barH };
}

// ═══════════════════════════════════════════════════════════════
//  ANGLE INDICATOR
// ═══════════════════════════════════════════════════════════════
export function renderAngleIndicator(
  ctx: CanvasRenderingContext2D,
  angle: number,
  _cw: number,
  canvasH: number,
  scale: number
) {
  const s = Math.min(scale, 1.3);
  const sz = 36 * s;
  const cx = 46 * s;
  const cy = canvasH - 46 * s;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, sz + 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, sz + 5 * s, 0, Math.PI * 2);
  ctx.stroke();

  // ticks
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 360; i += 15) {
    const a = (i * Math.PI) / 180;
    const inner = i % 90 === 0 ? 0.65 : i % 45 === 0 ? 0.75 : 0.85;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * sz * inner, cy + Math.sin(a) * sz * inner);
    ctx.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz);
    ctx.stroke();
  }

  // arrow
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * sz * 0.72, cy + Math.sin(angle) * sz * 0.72);
  ctx.stroke();

  const ax = cx + Math.cos(angle) * sz * 0.72;
  const ay = cy + Math.sin(angle) * sz * 0.72;
  const as2 = 6 * s;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(ax + Math.cos(angle) * as2, ay + Math.sin(angle) * as2);
  ctx.lineTo(ax + Math.cos(angle + 2.5) * as2, ay + Math.sin(angle + 2.5) * as2);
  ctx.lineTo(ax + Math.cos(angle - 2.5) * as2, ay + Math.sin(angle - 2.5) * as2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();

  const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${9 * s}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(deg)}°`, cx, cy + sz + 16 * s);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('ANGLE', cx, cy - sz - 10 * s);
}

// ═══════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════
export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], scale: number) {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    const px = p.x * scale;
    const py = p.y * scale;
    const sz = p.size * scale;

    ctx.globalAlpha = a;

    if (p.type === 'star') {
      ctx.fillStyle = p.color;
      drawStar(ctx, px, py, sz, 5);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      drawStar(ctx, px, py, sz * 0.35, 5);
      ctx.fill();
    } else if (p.type === 'glow') {
      const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.2);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, sz * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'trail') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, sz * a, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, sz * a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, pts: number) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i * Math.PI) / pts - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.38;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════
//  MESSAGE TOAST
// ═══════════════════════════════════════════════════════════════
export function renderMessage(
  ctx: CanvasRenderingContext2D,
  message: string,
  timer: number,
  maxTimer: number,
  canvasW: number,
  scale: number
) {
  if (timer <= 0 || !message) return;
  const s = Math.min(scale, 1.3);
  const alpha = Math.min(1, timer / 18);
  const slide = Math.min(1, (maxTimer - timer + 8) / 8);
  const yy = 60 * s + (1 - slide) * -22 * s;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.font = `bold ${15 * s}px Arial`;
  const tw = ctx.measureText(message).width;
  const pad = 22 * s;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  rrPath(ctx, canvasW / 2 - tw / 2 - pad, yy - 17 * s, tw + pad * 2, 38 * s, 8 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.45)';
  ctx.lineWidth = 1.5;
  rrPath(ctx, canvasW / 2 - tw / 2 - pad, yy - 17 * s, tw + pad * 2, 38 * s, 8 * s);
  ctx.stroke();

  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvasW / 2, yy);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════
function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${Math.min(255, (n >> 16) + amt)},${Math.min(255, ((n >> 8) & 0xff) + amt)},${Math.min(255, (n & 0xff) + amt)})`;
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${Math.max(0, (n >> 16) - amt)},${Math.max(0, ((n >> 8) & 0xff) - amt)},${Math.max(0, (n & 0xff) - amt)})`;
}

// Player HUD for versus mode
export function renderPlayerHUD(
  ctx: CanvasRenderingContext2D,
  currentPlayer: 1 | 2,
  p1Type: string | null,
  p2Type: string | null,
  p1Score: number,
  p2Score: number,
  canvasW: number,
  scale: number,
  isVersus: boolean,
  time: number,
) {
  if (!isVersus) return;
  const s = Math.min(scale, 1.3);

  // Player 1 (left)
  const p1Active = currentPlayer === 1;
  const p1x = 14 * s, p1y = 8 * s;
  const boxW = 130 * s, boxH = 38 * s;

  ctx.fillStyle = p1Active ? 'rgba(0,180,255,0.18)' : 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(p1x + 6 * s, p1y); ctx.lineTo(p1x + boxW - 6 * s, p1y);
  ctx.quadraticCurveTo(p1x + boxW, p1y, p1x + boxW, p1y + 6 * s);
  ctx.lineTo(p1x + boxW, p1y + boxH - 6 * s);
  ctx.quadraticCurveTo(p1x + boxW, p1y + boxH, p1x + boxW - 6 * s, p1y + boxH);
  ctx.lineTo(p1x + 6 * s, p1y + boxH);
  ctx.quadraticCurveTo(p1x, p1y + boxH, p1x, p1y + boxH - 6 * s);
  ctx.lineTo(p1x, p1y + 6 * s);
  ctx.quadraticCurveTo(p1x, p1y, p1x + 6 * s, p1y);
  ctx.closePath(); ctx.fill();
  if (p1Active) {
    ctx.strokeStyle = `rgba(0,200,255,${0.5 + Math.sin(time * 0.005) * 0.2})`;
    ctx.lineWidth = 2; ctx.stroke();
  }

  ctx.fillStyle = p1Active ? '#00DDFF' : '#AAA';
  ctx.font = `bold ${11 * s}px Arial`; ctx.textAlign = 'left';
  ctx.fillText('P1', p1x + 8 * s, p1y + 15 * s);
  ctx.font = `${9 * s}px Arial`;
  ctx.fillStyle = p1Active ? '#FFF' : '#888';
  const p1Label = p1Type === 'solids' ? '● Solids' : p1Type === 'stripes' ? '◐ Stripes' : '—';
  ctx.fillText(p1Label, p1x + 8 * s, p1y + 28 * s);
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${11 * s}px Arial`; ctx.textAlign = 'right';
  ctx.fillText(`${p1Score}`, p1x + boxW - 8 * s, p1y + 22 * s);

  // Player 2 (right)
  const p2Active = currentPlayer === 2;
  const p2x = canvasW - boxW - 14 * s;

  ctx.fillStyle = p2Active ? 'rgba(255,140,0,0.18)' : 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(p2x + 6 * s, p1y); ctx.lineTo(p2x + boxW - 6 * s, p1y);
  ctx.quadraticCurveTo(p2x + boxW, p1y, p2x + boxW, p1y + 6 * s);
  ctx.lineTo(p2x + boxW, p1y + boxH - 6 * s);
  ctx.quadraticCurveTo(p2x + boxW, p1y + boxH, p2x + boxW - 6 * s, p1y + boxH);
  ctx.lineTo(p2x + 6 * s, p1y + boxH);
  ctx.quadraticCurveTo(p2x, p1y + boxH, p2x, p1y + boxH - 6 * s);
  ctx.lineTo(p2x, p1y + 6 * s);
  ctx.quadraticCurveTo(p2x, p1y, p2x + 6 * s, p1y);
  ctx.closePath(); ctx.fill();
  if (p2Active) {
    ctx.strokeStyle = `rgba(255,160,0,${0.5 + Math.sin(time * 0.005) * 0.2})`;
    ctx.lineWidth = 2; ctx.stroke();
  }

  ctx.fillStyle = p2Active ? '#FFAA00' : '#AAA';
  ctx.font = `bold ${11 * s}px Arial`; ctx.textAlign = 'right';
  ctx.fillText('P2', p2x + boxW - 8 * s, p1y + 15 * s);
  ctx.font = `${9 * s}px Arial`;
  ctx.fillStyle = p2Active ? '#FFF' : '#888';
  ctx.textAlign = 'right';
  const p2Label = p2Type === 'solids' ? '● Solids' : p2Type === 'stripes' ? '◐ Stripes' : '—';
  ctx.fillText(p2Label, p2x + boxW - 8 * s, p1y + 28 * s);
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${11 * s}px Arial`; ctx.textAlign = 'left';
  ctx.fillText(`${p2Score}`, p2x + 8 * s, p1y + 22 * s);
}
