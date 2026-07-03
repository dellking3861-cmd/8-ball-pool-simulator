import { useState, useEffect } from 'react';
import { useGame } from './game/useGame';
import { HighScore, GameMode } from './game/types';

/* ── Start Screen ── */
function StartScreen({ onStart, highScores }: { onStart: (mode: GameMode) => void; highScores: HighScore[] }) {
  const [showScores, setShowScores] = useState(false);
  const [vis, setVis] = useState('opacity-0 scale-95');
  useEffect(() => { requestAnimationFrame(() => setVis('opacity-100 scale-100')); }, []);

  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-500 ${vis}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#081420] via-[#0F2030] to-[#081420]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="absolute rounded-full animate-pulse" style={{
            left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%`,
            width: `${6 + Math.random() * 10}px`, height: `${6 + Math.random() * 10}px`,
            backgroundColor: ['#FFD700','#0066CC','#CC0000','#006633','#FF6600','#6B0099','#880000'][i % 7],
            opacity: 0.1 + Math.random() * 0.15, animationDelay: `${Math.random() * 4}s`, animationDuration: `${2.5 + Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-lg w-full">
        {!showScores ? (
          <>
            <div className="mb-6">
              <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🎱</div>
              <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 tracking-tight leading-tight">8 BALL POOL</h1>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-400/90 tracking-[0.25em] mt-1">SIMULATOR</h2>
              <div className="mt-3 h-[2px] w-40 mx-auto bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent rounded-full" />
            </div>

            {/* Mode buttons */}
            <div className="flex gap-3 justify-center mb-5">
              <button onClick={() => onStart('solo')}
                className="px-8 py-3.5 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-bold text-lg rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.45)] transition-all duration-300 hover:scale-105 active:scale-95 border border-emerald-400/20">
                🎯 Solo Play
              </button>
              <button onClick={() => onStart('versus')}
                className="px-8 py-3.5 bg-gradient-to-b from-orange-500 to-red-700 text-white font-bold text-lg rounded-2xl shadow-[0_4px_20px_rgba(234,88,12,0.3)] hover:shadow-[0_4px_30px_rgba(234,88,12,0.45)] transition-all duration-300 hover:scale-105 active:scale-95 border border-orange-400/20">
                👥 2 Players
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-5">Local multiplayer — take turns on the same device</p>

            <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/[0.06] text-left mb-4 shadow-xl">
              <h3 className="text-yellow-400/90 font-bold text-xs mb-2 text-center tracking-wider">⌨️ CONTROLS</h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-gray-300/90">
                <div><span className="text-yellow-300/80 font-mono bg-white/5 px-1 py-0.5 rounded text-[10px]">← →</span> Aim</div>
                <div><span className="text-yellow-300/80 font-mono bg-white/5 px-1 py-0.5 rounded text-[10px]">SHIFT</span> Fine aim</div>
                <div className="col-span-2"><span className="text-yellow-300/80 font-mono bg-white/5 px-1 py-0.5 rounded text-[10px]">SPACE</span> Hold to charge, release to shoot</div>
                <div className="col-span-2 text-center mt-1 text-emerald-300/80 text-[10px]">
                  🖱️ Click to aim • Drag power bar to charge & release to shoot
                </div>
              </div>
            </div>

            <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/[0.04] text-left mb-4">
              <h3 className="text-cyan-400/90 font-bold text-xs mb-2 text-center tracking-wider">🎱 8-BALL RULES</h3>
              <ul className="text-[10px] text-gray-400 space-y-1 list-disc list-inside">
                <li>First ball pocketed after break determines Solids/Stripes</li>
                <li>Must hit your own group ball first — or it's a <span className="text-red-400">FOUL</span></li>
                <li>Pocket all your group, then sink the 8-ball to win</li>
                <li>Sinking 8-ball early = instant loss</li>
                <li><span className="text-red-400">Red markers</span> warn when aiming at wrong ball</li>
              </ul>
            </div>

            {highScores.length > 0 && (
              <button onClick={() => setShowScores(true)} className="text-yellow-400/80 hover:text-yellow-300 text-sm font-bold transition-colors">🏆 HIGH SCORES →</button>
            )}
          </>
        ) : (
          <>
            <h2 className="text-3xl font-black text-yellow-400 mb-6">🏆 HIGH SCORES</h2>
            <div className="bg-black/45 backdrop-blur-md rounded-2xl border border-yellow-500/15 overflow-hidden mb-6 shadow-xl">
              <div className="grid grid-cols-4 gap-2 p-3 text-xs font-bold text-yellow-400/80 border-b border-yellow-500/15"><div>#</div><div>Score</div><div>Balls</div><div>Date</div></div>
              {highScores.slice(0, 10).map((hs, i) => (
                <div key={i} className={`grid grid-cols-4 gap-2 p-3 text-sm ${i === 0 ? 'text-yellow-300 bg-yellow-500/5' : 'text-gray-300'} ${i % 2 ? 'bg-white/[0.02]' : ''}`}>
                  <div className="font-bold">{i + 1}</div><div className="font-mono">{hs.score}</div><div>{hs.ballsPocketed}</div><div className="text-xs opacity-70">{hs.date}</div>
                </div>
              ))}
              {highScores.length === 0 && <div className="p-6 text-gray-500 text-sm">No scores yet.</div>}
            </div>
            <button onClick={() => setShowScores(false)} className="text-gray-400 hover:text-white text-sm font-bold transition-colors">← BACK</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Pause ── */
function PauseOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="text-center p-8 bg-gray-900/90 rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full mx-4">
        <div className="text-4xl mb-4">⏸️</div>
        <h2 className="text-3xl font-black text-white mb-2">PAUSED</h2>
        <button onClick={onResume} className="px-10 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/20">▶ RESUME</button>
        <p className="text-gray-500 text-xs mt-4">Press P or ESC</p>
      </div>
    </div>
  );
}

/* ── Game Over ── */
function GameOverOverlay({ score, onRestart, highScores, isVersus, winner, p1Score, p2Score }: {
  score: number; onRestart: () => void; highScores: HighScore[];
  isVersus: boolean; winner: number; p1Score: number; p2Score: number;
}) {
  const [vis, setVis] = useState('opacity-0 scale-90');
  const isNew = !isVersus && highScores.length > 0 && highScores[0].score === score;
  useEffect(() => { requestAnimationFrame(() => setVis('opacity-100 scale-100')); }, []);

  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-sm transition-all duration-500 ${vis}`}>
      <div className="text-center p-8 bg-gradient-to-b from-gray-900/95 to-black/95 rounded-2xl border border-yellow-500/15 shadow-2xl max-w-md w-full mx-4">
        <div className="text-5xl mb-3">{winner > 0 || score > 300 ? '🏆' : '🎱'}</div>
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-1">GAME OVER</h2>

        {isVersus ? (
          <div className="my-5 py-4 bg-black/40 rounded-xl border border-yellow-500/10">
            <div className="text-2xl font-black mb-2" style={{ color: winner === 1 ? '#00CCFF' : '#FFAA00' }}>
              Player {winner} Wins! 🎉
            </div>
            <div className="flex justify-center gap-8 mt-3 text-sm">
              <div><span className="text-cyan-400 font-bold">P1</span> <span className="text-yellow-300 font-mono ml-1">{p1Score}</span></div>
              <div><span className="text-orange-400 font-bold">P2</span> <span className="text-yellow-300 font-mono ml-1">{p2Score}</span></div>
            </div>
          </div>
        ) : (
          <>
            {isNew && <div className="text-yellow-400 text-sm font-bold animate-pulse mb-1">⭐ NEW HIGH SCORE! ⭐</div>}
            <div className="my-5 py-4 bg-black/40 rounded-xl border border-yellow-500/10">
              <div className="text-gray-400 text-xs mb-1 tracking-wider">FINAL SCORE</div>
              <div className="text-5xl font-black text-yellow-400 font-mono">{score}</div>
            </div>
          </>
        )}

        <button onClick={onRestart} className="px-10 py-3 bg-gradient-to-b from-yellow-500 to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 mb-2 border border-yellow-400/20">🔄 PLAY AGAIN</button>
        <p className="text-gray-500 text-xs">Press R to restart</p>

        {!isVersus && highScores.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <h3 className="text-yellow-400/80 font-bold text-sm mb-3">🏆 TOP SCORES</h3>
            <div className="space-y-1">
              {highScores.slice(0, 5).map((hs, i) => (
                <div key={i} className={`flex justify-between items-center px-3 py-1.5 rounded text-sm ${hs.score === score ? 'bg-yellow-500/10 text-yellow-300' : 'text-gray-400'}`}>
                  <span className="font-bold">#{i + 1}</span><span className="font-mono">{hs.score}</span><span className="text-xs opacity-60">{hs.ballsPocketed} balls</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const { canvasRef, gameState, gameMode, score, highScores, startGame, pauseGame, gameRef } = useGame();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (gameState === 'start' && (e.code === 'Space' || e.code === 'Enter')) { startGame('solo'); e.preventDefault(); }
      if (gameState === 'gameover' && e.code === 'KeyR') { startGame(gameRef.current?.gameMode || 'solo'); e.preventDefault(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [gameState, startGame, gameRef]);

  const g = gameRef.current;
  const isVersus = gameMode === 'versus';

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0B1622] relative select-none" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      {gameState === 'start' && <StartScreen onStart={startGame} highScores={highScores} />}
      {gameState === 'paused' && <PauseOverlay onResume={pauseGame} />}
      {gameState === 'gameover' && (
        <GameOverOverlay
          score={score}
          onRestart={() => startGame(gameMode)}
          highScores={highScores}
          isVersus={isVersus}
          winner={g?.winner || 0}
          p1Score={g?.player1Score || 0}
          p2Score={g?.player2Score || 0}
        />
      )}

      {gameState === 'playing' && (
        <button onClick={pauseGame}
          className="absolute top-2.5 right-2.5 z-10 w-10 h-10 rounded-lg bg-black/40 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/60 transition-all text-lg font-bold border border-white/[0.08]">
          ⏸
        </button>
      )}
    </div>
  );
}
