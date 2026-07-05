import { useRef, useCallback, useEffect, useState } from 'react';
import { GameData, GameState, Ball, HighScore, GameMode } from './types';
import {
  TABLE_WIDTH, TABLE_HEIGHT, CUSHION_WIDTH,
  MAX_SHOT_POWER, POWER_CHARGE_SPEED, MIN_SHOT_POWER,
  SCORE_POCKET, SCORE_COMBO, SCORE_FOUL, BALL_RADIUS,
  MAX_DT, SPIN_FACTOR, MAX_SPIN
} from './constants';
import {
  createBalls, updateBallPhysics, checkWallCollision,
  checkBallCollision, checkPocketCollision, areBallsMoving,
  updateParticles, getDefaultCueBallPosition, distance,
  computeTrajectory, createTrailParticle
} from './physics';
import {
  renderTable, renderBall, renderCueAndTrajectory, renderParticles,
  renderPowerBar, renderAngleIndicator, renderMessage,
  getPowerBarBounds, renderPlayerHUD, renderSpinIndicator
} from './renderer';
import {
  playHitSound, playCushionSound, playPocketSound,
  playShotSound, playFoulSound, playWinSound, playTurnSound,
  startRollingSound, updateRollingSound, stopRollingSound
} from './audio';

const ANGLE_SPEED = 0.028;
const ANGLE_FINE_SPEED = 0.004;
const SPIN_CHANGE_SPEED = 0.02;

function loadHS(): HighScore[] { try { const d = localStorage.getItem('pool_high_scores'); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveHS(s: HighScore[]) { try { localStorage.setItem('pool_high_scores', JSON.stringify(s)); } catch {} }

export function useGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>(loadHS());
  const [, setMsg] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const mouseRef = useRef<{ x: number; y: number; down: boolean }>({ x: 0, y: 0, down: false });
  const touchRef = useRef<{ active: boolean }>({ active: false });
  const frameRef = useRef(0);

  // helpers
  const getScale = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return { scale: 1, offsetX: 0, offsetY: 0 };
    const cw = c.width, ch = c.height;
    const s = Math.min((cw - 100) / TABLE_WIDTH, (ch - 100) / TABLE_HEIGHT);
    return { scale: s, offsetX: (cw - TABLE_WIDTH * s) / 2, offsetY: (ch - TABLE_HEIGHT * s) / 2 + 15 * s };
  }, []);
  const clientToTable = useCallback((cx: number, cy: number) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const { scale: s, offsetX, offsetY } = getScale();
    return { x: ((cx - rect.left) * (c.width / rect.width) - offsetX) / s, y: ((cy - rect.top) * (c.height / rect.height) - offsetY) / s };
  }, [getScale]);
  const isInPowerBar = useCallback((cx: number, cy: number) => {
    const c = canvasRef.current; if (!c) return false;
    const rect = c.getBoundingClientRect(); const { scale: s } = getScale();
    const px = (cx - rect.left) * (c.width / rect.width);
    const py = (cy - rect.top) * (c.height / rect.height);
    const b = getPowerBarBounds(c.width, c.height, s);
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }, [getScale]);
  const powerFromBarY = useCallback((cy: number) => {
    const c = canvasRef.current; if (!c) return 0;
    const rect = c.getBoundingClientRect(); const { scale: s } = getScale();
    const py = (cy - rect.top) * (c.height / rect.height);
    const b = getPowerBarBounds(c.width, c.height, s);
    return Math.max(0, Math.min(MAX_SHOT_POWER, (1 - (py - b.barY) / b.barH) * MAX_SHOT_POWER));
  }, [getScale]);

  // ── get current player's assigned type ──
  const getCurrentType = useCallback((g: GameData) => {
    return g.currentPlayer === 1 ? g.player1Type : g.player2Type;
  }, []);

  // ── init ──
  const initGame = useCallback((mode: GameMode = 'solo') => {
    const balls = createBalls();
    const game: GameData = {
      balls, cueBall: balls[0], particles: [], screenShake: { intensity: 0, duration: 0, elapsed: 0 },
      score: 0, shotAngle: 0, shotPower: 0, isPowerCharging: false, powerDirection: 1,
      state: 'aiming', gameMode: mode,
      player1Type: null, player2Type: null,
      player1Score: 0, player2Score: 0, currentPlayer: 1,
      turnBallsPocketed: 0, foulThisTurn: false,
      firstHitBallId: null, pocketedThisTurn: [],
      message: '', messageTimer: 0, comboCount: 0, totalBallsPocketed: 0,
      highScores: loadHS(), cueBallPlacing: false,
      trajectoryHit: null, powerBarDragging: false, winner: 0,
      spin: { topSpin: 0, backSpin: 0, leftSpin: 0, rightSpin: 0 },
      dt: 0, prevTime: performance.now(),
    };
    gameRef.current = game;
    setGameMode(mode);
    setGameState('playing'); setScore(0); setMsg('');
  }, []);

  const showM = useCallback((m: string, d = 120) => { const g = gameRef.current; if (g) { g.message = m; g.messageTimer = d; } setMsg(m); }, []);
  const addShake = useCallback((i: number, d: number) => { const g = gameRef.current; if (g) g.screenShake = { intensity: i, duration: d, elapsed: 0 }; }, []);

  // ── shoot ──
  const shoot = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.state !== 'aiming' || g.cueBall.pocketed || g.shotPower < MIN_SHOT_POWER) return;

    // Apply spin to cue ball velocity
    const angle = g.shotAngle;
    let power = g.shotPower;

    // Calculate spin effects on initial velocity
    const spin = g.spin;
    let vx = Math.cos(angle) * power;
    let vy = Math.sin(angle) * power;

    // Top spin: adds forward velocity (follow-through)
    if (spin.topSpin > 0.05) {
      vx += Math.cos(angle) * spin.topSpin * SPIN_FACTOR * 2;
      vy += Math.sin(angle) * spin.topSpin * SPIN_FACTOR * 2;
    }
    // Back spin: adds backward velocity (draw back)
    if (spin.backSpin > 0.05) {
      vx -= Math.cos(angle) * spin.backSpin * SPIN_FACTOR * 2;
      vy -= Math.sin(angle) * spin.backSpin * SPIN_FACTOR * 2;
    }

    g.cueBall.vx = vx;
    g.cueBall.vy = vy;

    // Set cue ball spin values for physics simulation
    g.cueBall.spinX = (spin.topSpin - spin.backSpin) * MAX_SPIN * 0.5;
    g.cueBall.spinY = (spin.rightSpin - spin.leftSpin) * MAX_SPIN * 0.5;

    g.state = 'rolling'; g.isPowerCharging = false; g.powerBarDragging = false;
    g.turnBallsPocketed = 0; g.foulThisTurn = false; g.comboCount = 0;
    g.trajectoryHit = null; g.firstHitBallId = null; g.pocketedThisTurn = [];
    playShotSound(g.shotPower); addShake(g.shotPower * 0.35, 10);
    setGameState('playing');
  }, [addShake]);

  // ── switch turn (for versus) ──
  const switchTurn = useCallback((g: GameData) => {
    g.currentPlayer = g.currentPlayer === 1 ? 2 : 1;
    g.shotPower = 0; g.shotAngle = 0;
    g.spin = { topSpin: 0, backSpin: 0, leftSpin: 0, rightSpin: 0 };
    const pName = g.currentPlayer === 1 ? 'Player 1' : 'Player 2';
    const pColor = g.currentPlayer === 1 ? '🔵' : '🟠';
    showM(`${pColor} ${pName}'s turn`, 100);
    playTurnSound();
  }, [showM]);

  // ── handle pocket ──
  const handlePocket = useCallback((ball: Ball, game: GameData) => {
    ball.pocketed = true; ball.vx = 0; ball.vy = 0;
    game.totalBallsPocketed++;
    game.pocketedThisTurn.push(ball.id);
    playPocketSound(); addShake(7, 14);

    const curType = game.currentPlayer === 1 ? game.player1Type : game.player2Type;
    const isVs = game.gameMode === 'versus';

    if (ball.id === 0) {
      // scratch
      game.foulThisTurn = true;
      if (isVs) {
        const pn = game.currentPlayer === 1 ? 'P1' : 'P2';
        showM(`SCRATCH! ${pn} pocketed the cue ball!`, 120);
      } else {
        game.score = Math.max(0, game.score + SCORE_FOUL);
        showM('SCRATCH! Cue ball pocketed!', 120);
      }
      playFoulSound();
    } else if (ball.id === 8) {
      // ── 8-ball pocketed ──
      const ownBalls = curType === 'solids'
        ? game.balls.filter(b => b.id >= 1 && b.id <= 7)
        : curType === 'stripes'
          ? game.balls.filter(b => b.id >= 9 && b.id <= 15)
          : [];
      const allCleared = curType !== null && ownBalls.every(b => b.pocketed);
      const isFoul = game.foulThisTurn;

      if (allCleared && !isFoul) {
        // legitimate win
        if (isVs) {
          game.winner = game.currentPlayer;
          showM(`🏆 Player ${game.currentPlayer} WINS!`, 300);
        } else {
          game.score += 500;
          showM('🏆 YOU WIN! 8-BALL POCKETED!', 300);
        }
        playWinSound();
      } else {
        // sunk 8 early or on a foul = lose
        if (isVs) {
          game.winner = game.currentPlayer === 1 ? 2 : 1;
          showM(`💀 Player ${game.currentPlayer} pocketed 8-ball illegally! P${game.winner} WINS!`, 300);
        } else {
          game.score = Math.max(0, game.score - 200);
          showM('💀 GAME OVER! 8-ball pocketed too early!', 300);
        }
        playFoulSound();
      }
      game.state = 'gameover'; setGameState('gameover');
      if (!isVs) {
        const ns: HighScore = { score: game.score, date: new Date().toLocaleDateString(), ballsPocketed: game.totalBallsPocketed };
        const upd = [...game.highScores, ns].sort((a, b) => b.score - a.score).slice(0, 10);
        game.highScores = upd; saveHS(upd); setHighScores(upd);
      }
    } else {
      // regular ball pocketed
      game.turnBallsPocketed++; game.comboCount++;

      // assign type on break if not yet assigned
      if (!game.player1Type) {
        const isSolid = ball.id <= 7;
        game.player1Type = isSolid ? 'solids' : 'stripes';
        game.player2Type = isSolid ? 'stripes' : 'solids';
        if (isVs) {
          showM(`P1 → ${game.player1Type === 'solids' ? 'SOLIDS ●' : 'STRIPES ◐'}  |  P2 → ${game.player2Type === 'solids' ? 'SOLIDS ●' : 'STRIPES ◐'}`, 140);
        } else {
          showM(`You're playing ${game.player1Type === 'solids' ? 'SOLIDS (1-7)' : 'STRIPES (9-15)'}!`, 120);
        }
      } else {
        const isOwn = curType === 'solids' ? ball.id <= 7 : ball.id >= 9;
        if (!isVs) {
          const base = SCORE_POCKET; const combo = (game.comboCount - 1) * SCORE_COMBO;
          game.score += base + combo;
          if (isOwn && game.comboCount > 1) showM(`🔥 ${game.comboCount}x COMBO! +${base + combo}`, 90);
          else if (isOwn) showM(`Ball ${ball.id} pocketed! +${base}`, 60);
          else showM(`Opponent's ball pocketed!`, 60);
        } else {
          if (isOwn) {
            if (game.currentPlayer === 1) game.player1Score += SCORE_POCKET;
            else game.player2Score += SCORE_POCKET;
            showM(`P${game.currentPlayer}: Ball ${ball.id} pocketed! ✓`, 60);
          } else {
            const opp = game.currentPlayer === 1 ? 2 : 1;
            if (opp === 1) game.player1Score += SCORE_POCKET; else game.player2Score += SCORE_POCKET;
            showM(`P${game.currentPlayer} pocketed opponent's ball ${ball.id}`, 80);
          }
        }
      }
    }
    setScore(game.score);
  }, [addShake, showM]);

  // ══════════════════════════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════════════════════════
  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.state === 'paused' || g.state === 'gameover' || g.state === 'start') return;
    const keys = keysRef.current;
    frameRef.current++;
    const isVs = g.gameMode === 'versus';
    const curType = getCurrentType(g);

    // ── AIMING ──
    if (g.state === 'aiming' && !g.cueBallPlacing) {
      const fine = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const sp = fine ? ANGLE_FINE_SPEED : ANGLE_SPEED;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) g.shotAngle -= sp;
      if (keys.has('ArrowRight') || keys.has('KeyD')) g.shotAngle += sp;

      // Spin controls
      if (keys.has('KeyW')) g.spin.topSpin = Math.min(1, g.spin.topSpin + SPIN_CHANGE_SPEED);
      if (keys.has('KeyS')) g.spin.backSpin = Math.min(1, g.spin.backSpin + SPIN_CHANGE_SPEED);
      if (keys.has('KeyQ')) g.spin.leftSpin = Math.min(1, g.spin.leftSpin + SPIN_CHANGE_SPEED);
      if (keys.has('KeyE')) g.spin.rightSpin = Math.min(1, g.spin.rightSpin + SPIN_CHANGE_SPEED);
      // Reset spin with Z
      if (keys.has('KeyZ')) { g.spin = { topSpin: 0, backSpin: 0, leftSpin: 0, rightSpin: 0 }; keys.delete('KeyZ'); }

      if (canvasRef.current && mouseRef.current.down && !g.powerBarDragging) {
        const tp = clientToTable(mouseRef.current.x, mouseRef.current.y);
        if (tp.x > 0 && tp.x < TABLE_WIDTH && tp.y > 0 && tp.y < TABLE_HEIGHT) {
          const dx = tp.x - g.cueBall.x, dy = tp.y - g.cueBall.y;
          if (Math.sqrt(dx * dx + dy * dy) > 5) g.shotAngle = Math.atan2(dy, dx);
        }
      }

      // space hold power
      if (keys.has('Space')) {
        if (!g.isPowerCharging) { g.isPowerCharging = true; g.powerDirection = 1; g.shotPower = 0; }
        g.shotPower += POWER_CHARGE_SPEED * g.powerDirection;
        if (g.shotPower >= MAX_SHOT_POWER) { g.shotPower = MAX_SHOT_POWER; g.powerDirection = -1; }
        if (g.shotPower <= 0) { g.shotPower = 0; g.powerDirection = 1; }
      } else if (g.isPowerCharging) { g.isPowerCharging = false; shoot(); return; }

      if (g.powerBarDragging && mouseRef.current.down) g.shotPower = powerFromBarY(mouseRef.current.y);
      if (g.powerBarDragging && !mouseRef.current.down) { g.powerBarDragging = false; if (g.shotPower > MIN_SHOT_POWER) { shoot(); return; } }
      if (keys.has('Enter') && !g.isPowerCharging && g.shotPower > 0) { keys.delete('Enter'); shoot(); return; }

      // trajectory with wrong-ball awareness
      g.trajectoryHit = computeTrajectory(g.cueBall, g.shotAngle, g.balls, curType);
    }

    // ── CUE BALL PLACING ──
    if (g.cueBallPlacing) {
      if (canvasRef.current && mouseRef.current.down) {
        const tp = clientToTable(mouseRef.current.x, mouseRef.current.y);
        let tx = Math.max(CUSHION_WIDTH + BALL_RADIUS, Math.min(TABLE_WIDTH * 0.25, tp.x));
        let ty = Math.max(CUSHION_WIDTH + BALL_RADIUS, Math.min(TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS, tp.y));
        let ok = true;
        for (const b of g.balls) { if (b.id !== 0 && !b.pocketed && distance({ x: tx, y: ty }, { x: b.x, y: b.y }) < BALL_RADIUS * 2.2) { ok = false; break; } }
        if (ok) { g.cueBall.x = tx; g.cueBall.y = ty; }
      }
      if (keys.has('Enter') || keys.has('Space')) { keys.delete('Enter'); keys.delete('Space'); g.cueBallPlacing = false; g.cueBall.pocketed = false; g.state = 'aiming'; g.shotPower = 0; }
      if (!mouseRef.current.down) {
        if (keys.has('ArrowLeft') || keys.has('KeyA')) g.cueBall.x = Math.max(CUSHION_WIDTH + BALL_RADIUS, g.cueBall.x - 2);
        if (keys.has('ArrowRight') || keys.has('KeyD')) g.cueBall.x = Math.min(TABLE_WIDTH * 0.25, g.cueBall.x + 2);
        if (keys.has('ArrowUp') || keys.has('KeyW')) g.cueBall.y = Math.max(CUSHION_WIDTH + BALL_RADIUS, g.cueBall.y - 2);
        if (keys.has('ArrowDown') || keys.has('KeyS')) g.cueBall.y = Math.min(TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS, g.cueBall.y + 2);
      }
    }

    // ── PHYSICS ──
    if (g.state === 'rolling') {
      // Delta-time based physics
      const now = performance.now();
      let dt = (now - g.prevTime) / 1000;
      g.prevTime = now;
      dt = Math.min(dt, MAX_DT); // Cap to prevent physics explosion

      for (const b of g.balls) updateBallPhysics(b, dt);

      // Ball rolling sound
      let maxSpeed = 0;
      for (const b of g.balls) {
        if (!b.pocketed) {
          const spd = Math.sqrt(b.vx ** 2 + b.vy ** 2);
          if (spd > maxSpeed) maxSpeed = spd;
        }
      }
      if (maxSpeed > 1) {
        startRollingSound();
        updateRollingSound(maxSpeed);
      } else {
        stopRollingSound();
      }

      for (const b of g.balls) {
        const wr = checkWallCollision(b);
        if (wr.collided) { g.particles.push(...wr.particles); playCushionSound(Math.min(Math.sqrt(b.vx ** 2 + b.vy ** 2) * 0.05, 0.3)); }
      }

      for (let i = 0; i < g.balls.length; i++) {
        for (let j = i + 1; j < g.balls.length; j++) {
          const cr = checkBallCollision(g.balls[i], g.balls[j]);
          if (cr.collided) {
            g.particles.push(...cr.particles);
            const sp = Math.sqrt((g.balls[i].vx - g.balls[j].vx) ** 2 + (g.balls[i].vy - g.balls[j].vy) ** 2);
            playHitSound(Math.min(sp * 0.03, 0.4));
            if (sp > 4) addShake(sp * 0.25, 6);

            // Track first ball hit by cue ball
            if (g.firstHitBallId === null) {
              if (g.balls[i].id === 0 && g.balls[j].id !== 0) g.firstHitBallId = g.balls[j].id;
              else if (g.balls[j].id === 0 && g.balls[i].id !== 0) g.firstHitBallId = g.balls[i].id;
            }
          }
        }
      }

      for (const b of g.balls) {
        const pr = checkPocketCollision(b);
        if (pr.pocketed) {
          g.particles.push(...pr.particles);
          if (pr.pocketPos) { b.sinkAnim = 1; b.sinkPocket = pr.pocketPos; }
          handlePocket(b, g);
          if ((g.state as string) === 'gameover') return;
        }
      }

      // trails
      if (frameRef.current % 2 === 0) {
        for (const b of g.balls) {
          if (!b.pocketed && Math.sqrt(b.vx ** 2 + b.vy ** 2) > 4) {
            g.particles.push(createTrailParticle(b.x, b.y, b.id === 0 ? 'rgba(200,220,255,0.3)' : b.color));
          }
        }
      }

      // ── balls stopped ──
      if (!areBallsMoving(g.balls)) {
        // ── CHECK FOULS ──
        if (curType && g.firstHitBallId !== null && g.firstHitBallId !== 8) {
          const firstIsOwn = curType === 'solids' ? g.firstHitBallId <= 7 : g.firstHitBallId >= 9;

          const ownBalls = curType === 'solids'
            ? g.balls.filter(b => b.id >= 1 && b.id <= 7)
            : g.balls.filter(b => b.id >= 9 && b.id <= 15);
          const allOwn = ownBalls.every(b => b.pocketed);
          const shouldHit8 = allOwn;

          if (!firstIsOwn && !shouldHit8) {
            g.foulThisTurn = true;
            const pn = g.currentPlayer === 1 ? 'P1' : 'P2';
            if (isVs) showM(`⚠️ FOUL! ${pn} hit wrong ball first!`, 120);
            else { showM('⚠️ FOUL! Wrong ball hit first!', 120); g.score = Math.max(0, g.score + SCORE_FOUL); }
            playFoulSound();
          }
        }
        if (g.firstHitBallId === null && !g.foulThisTurn) {
          g.foulThisTurn = true;
          if (isVs) showM(`⚠️ FOUL! No ball contacted!`, 120);
          else { showM('⚠️ FOUL! No ball contacted!', 120); g.score = Math.max(0, g.score + SCORE_FOUL); }
          playFoulSound();
        }

        if (g.foulThisTurn && g.cueBall.pocketed) {
          const pos = getDefaultCueBallPosition();
          g.cueBall.x = pos.x; g.cueBall.y = pos.y; g.cueBall.vx = 0; g.cueBall.vy = 0;
          g.cueBall.pocketed = false; g.cueBallPlacing = true;
        } else if (g.foulThisTurn && !g.cueBall.pocketed) {
          if (isVs) {
            g.cueBallPlacing = true;
          }
        }

        if (!g.cueBallPlacing) { g.state = 'aiming'; g.shotPower = 0; }

        if (isVs) {
          const ownPocketed = g.pocketedThisTurn.filter(id => {
            if (id === 0 || id === 8) return false;
            if (!curType) return true;
            return curType === 'solids' ? id <= 7 : id >= 9;
          });
          if (ownPocketed.length > 0 && !g.foulThisTurn) {
            const pn = g.currentPlayer === 1 ? 'P1' : 'P2';
            showM(`${pn} continues! 🎯`, 60);
          } else {
            if (g.cueBallPlacing) {
              switchTurn(g);
            } else {
              switchTurn(g);
            }
          }
        }

        setGameState('playing');

        if (curType) {
          const pb = curType === 'solids'
            ? g.balls.filter(b => b.id >= 1 && b.id <= 7)
            : g.balls.filter(b => b.id >= 9 && b.id <= 15);
          const e8 = g.balls.find(b => b.id === 8);
          if (pb.every(b => b.pocketed) && e8 && !e8.pocketed) {
            const pn = isVs ? `P${g.currentPlayer}` : 'You';
            showM(`${pn}: All group cleared! Aim for the 8-BALL! 🎱`, 120);
          }
        }
      }
    }

    // sink animations
    for (const b of g.balls) { if (b.sinkAnim > 0) { b.sinkAnim -= 0.04; if (b.sinkAnim <= 0) b.sinkAnim = 0; } }
    g.particles = updateParticles(g.particles);
    if (g.screenShake.elapsed < g.screenShake.duration) g.screenShake.elapsed++;
    if (g.messageTimer > 0) { g.messageTimer--; if (g.messageTimer <= 0) { g.message = ''; setMsg(''); } }
  }, [shoot, handlePocket, showM, addShake, clientToTable, powerFromBarY, switchTurn, getCurrentType]);

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  const render = useCallback(() => {
    const canvas = canvasRef.current; const g = gameRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const { scale, offsetX, offsetY } = getScale();
    const time = timeRef.current;
    const isVs = g.gameMode === 'versus';
    const uiS = Math.min(scale, 1.3);

    // background
    ctx.fillStyle = '#0B1622'; ctx.fillRect(0, 0, cw, ch);
    const ag = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * 0.5);
    ag.addColorStop(0, 'rgba(18,80,42,0.25)'); ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag; ctx.fillRect(0, 0, cw, ch);

    ctx.save(); ctx.translate(offsetX, offsetY);
    renderTable(ctx, scale, g.screenShake);

    const shk = g.screenShake;
    const sxO = shk.elapsed < shk.duration ? (Math.random() - 0.5) * shk.intensity * (1 - shk.elapsed / shk.duration) * scale : 0;
    const syO = shk.elapsed < shk.duration ? (Math.random() - 0.5) * shk.intensity * (1 - shk.elapsed / shk.duration) * scale : 0;
    ctx.save(); ctx.translate(sxO, syO);

    for (const b of g.balls) { if (b.id !== 0) renderBall(ctx, b, scale, time); }
    renderBall(ctx, g.cueBall, scale, time);

    if (g.state === 'aiming' && !g.cueBallPlacing) {
      renderCueAndTrajectory(ctx, g.cueBall, g.shotAngle, g.shotPower, scale, time, g.trajectoryHit, g.isPowerCharging || g.powerBarDragging, g.spin);
    }

    if (g.cueBallPlacing) {
      ctx.strokeStyle = `rgba(255,255,255,${0.45 + Math.sin(time * 0.005) * 0.25})`;
      ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(g.cueBall.x * scale, g.cueBall.y * scale, (BALL_RADIUS + 5) * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(CUSHION_WIDTH * scale, CUSHION_WIDTH * scale, (TABLE_WIDTH * 0.25 - CUSHION_WIDTH) * scale, (TABLE_HEIGHT - CUSHION_WIDTH * 2) * scale);
    }

    renderParticles(ctx, g.particles, scale);
    ctx.restore(); ctx.restore();

    // ── UI ──
    if (g.state === 'aiming' && !g.cueBallPlacing) {
      renderPowerBar(ctx, g.shotPower, cw, ch, scale, g.isPowerCharging || g.powerBarDragging, time);
      renderAngleIndicator(ctx, g.shotAngle, cw, ch, scale);
      renderSpinIndicator(ctx, g.spin, cw, ch, scale);
    }

    renderPlayerHUD(ctx, g.currentPlayer, g.player1Type, g.player2Type, g.player1Score, g.player2Score, cw, scale, isVs, time);

    // Score (solo) or turn indicator at center-top
    if (!isVs) {
      ctx.fillStyle = '#FFD700'; ctx.font = `bold ${17 * uiS}px Arial`; ctx.textAlign = 'center';
      ctx.fillText(`SCORE: ${g.score}`, cw / 2, 20 * uiS);
      if (g.player1Type) {
        ctx.font = `${11 * uiS}px Arial`; ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillText(`Playing: ${g.player1Type === 'solids' ? 'SOLIDS (1-7)' : 'STRIPES (9-15)'}`, cw / 2, 37 * uiS);
      }
    } else {
      const pCol = g.currentPlayer === 1 ? '#00CCFF' : '#FFAA00';
      ctx.fillStyle = pCol; ctx.font = `bold ${14 * uiS}px Arial`; ctx.textAlign = 'center';
      ctx.fillText(`Player ${g.currentPlayer}'s Turn`, cw / 2, 20 * uiS);
    }

    // pocketed ball tray
    const pk = g.balls.filter(b => b.id !== 0 && b.id !== 8 && b.pocketed);
    if (pk.length > 0) {
      const iy = ch - 22 * uiS; const sx2 = cw / 2 - pk.length * 11 * uiS;
      pk.forEach((b, i) => {
        const bx = sx2 + i * 22 * uiS; const r = 7.5 * uiS;
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(bx, iy, r, 0, Math.PI * 2); ctx.fill();
        if (b.stripe) { ctx.fillStyle = '#FFF'; ctx.fillRect(bx - r, iy - r * 0.3, r * 2, r * 0.6); }
        ctx.fillStyle = b.stripe ? '#000' : '#FFF'; ctx.font = `bold ${r * 0.85}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.id.toString(), bx, iy);
      });
    }

    if (g.message && g.messageTimer > 0) renderMessage(ctx, g.message, g.messageTimer, 120, cw, scale);

    if (g.state === 'aiming' && !g.cueBallPlacing) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = `${7.5 * uiS}px Arial`; ctx.textAlign = 'center';
      ctx.fillText('← → Aim  |  HOLD SPACE charge & release  |  SHIFT Fine  |  W/S Top/Back Spin  |  Q/E Left/Right Spin  |  Z Reset', cw / 2, ch - 5 * uiS);
    }
  }, [getScale]);

  const gameLoop = useCallback(() => {
    timeRef.current = performance.now();
    update();
    render();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [update, render]);
  const startGame = useCallback((mode: GameMode = 'solo') => { initGame(mode); showM(mode === 'versus' ? '🔵 Player 1 breaks! 🎱' : 'Break the rack! 🎱', 120); }, [initGame, showM]);
  const pauseGame = useCallback(() => {
    const g = gameRef.current; if (!g) return;
    if (g.state === 'paused') { g.state = g.cueBallPlacing ? 'aiming' : (areBallsMoving(g.balls) ? 'rolling' : 'aiming'); setGameState('playing'); }
    else if (g.state !== 'start' && g.state !== 'gameover') { g.state = 'paused'; setGameState('paused'); }
  }, []);

  // ── INPUT ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.code);
    if (e.code === 'Escape' || e.code === 'KeyP') pauseGame();
    if (e.code === 'KeyR' && gameRef.current?.state === 'gameover') startGame(gameRef.current.gameMode);
    e.preventDefault();
  }, [pauseGame, startGame]);
  const handleKeyUp = useCallback((e: KeyboardEvent) => { keysRef.current.delete(e.code); }, []);
  const handleMouseMove = useCallback((e: MouseEvent) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; }, []);
  const handleMouseDown = useCallback((e: MouseEvent) => {
    mouseRef.current.down = true; mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY;
    const g = gameRef.current; if (!g || g.state !== 'aiming' || g.cueBallPlacing) return;
    if (isInPowerBar(e.clientX, e.clientY)) { g.powerBarDragging = true; g.shotPower = powerFromBarY(e.clientY); return; }
    const tp = clientToTable(e.clientX, e.clientY);
    if (tp.x > 0 && tp.x < TABLE_WIDTH && tp.y > 0 && tp.y < TABLE_HEIGHT) { const dx = tp.x - g.cueBall.x, dy = tp.y - g.cueBall.y; if (Math.sqrt(dx * dx + dy * dy) > 5) g.shotAngle = Math.atan2(dy, dx); }
  }, [isInPowerBar, powerFromBarY, clientToTable]);
  const handleMouseUp = useCallback(() => {
    mouseRef.current.down = false; const g = gameRef.current; if (!g) return;
    if (g.cueBallPlacing) { g.cueBallPlacing = false; g.cueBall.pocketed = false; g.state = 'aiming'; return; }
    if (g.powerBarDragging) { g.powerBarDragging = false; if (g.shotPower > MIN_SHOT_POWER) shoot(); }
  }, [shoot]);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault(); if (e.touches.length < 1) return; const t = e.touches[0];
    mouseRef.current.down = true; mouseRef.current.x = t.clientX; mouseRef.current.y = t.clientY; touchRef.current.active = true;
    const g = gameRef.current; if (!g || g.state !== 'aiming' || g.cueBallPlacing) return;
    if (isInPowerBar(t.clientX, t.clientY)) { g.powerBarDragging = true; g.shotPower = powerFromBarY(t.clientY); return; }
    const tp = clientToTable(t.clientX, t.clientY);
    if (tp.x > 0 && tp.x < TABLE_WIDTH && tp.y > 0 && tp.y < TABLE_HEIGHT) { const dx = tp.x - g.cueBall.x, dy = tp.y - g.cueBall.y; if (Math.sqrt(dx * dx + dy * dy) > 5) g.shotAngle = Math.atan2(dy, dx); }
  }, [isInPowerBar, powerFromBarY, clientToTable]);
  const handleTouchMove = useCallback((e: TouchEvent) => { e.preventDefault(); if (e.touches.length < 1) return; mouseRef.current.x = e.touches[0].clientX; mouseRef.current.y = e.touches[0].clientY; }, []);
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault(); mouseRef.current.down = false; touchRef.current.active = false;
    const g = gameRef.current; if (!g) return;
    if (g.cueBallPlacing) { g.cueBallPlacing = false; g.cueBall.pocketed = false; g.state = 'aiming'; return; }
    if (g.powerBarDragging) { g.powerBarDragging = false; if (g.shotPower > MIN_SHOT_POWER) shoot(); }
  }, [shoot]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const resize = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr; c.style.width = window.innerWidth + 'px'; c.style.height = window.innerHeight + 'px'; };
    resize(); window.addEventListener('resize', resize); window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    c.addEventListener('mousemove', handleMouseMove); c.addEventListener('mousedown', handleMouseDown); c.addEventListener('mouseup', handleMouseUp);
    c.addEventListener('touchstart', handleTouchStart, { passive: false }); c.addEventListener('touchmove', handleTouchMove, { passive: false }); c.addEventListener('touchend', handleTouchEnd, { passive: false });
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); c.removeEventListener('mousemove', handleMouseMove); c.removeEventListener('mousedown', handleMouseDown); c.removeEventListener('mouseup', handleMouseUp); c.removeEventListener('touchstart', handleTouchStart); c.removeEventListener('touchmove', handleTouchMove); c.removeEventListener('touchend', handleTouchEnd); cancelAnimationFrame(rafRef.current); };
  }, [gameLoop, handleKeyDown, handleKeyUp, handleMouseMove, handleMouseDown, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { canvasRef, gameState, gameMode, score, highScores, startGame, pauseGame, initGame, gameRef };
}