import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

type Difficulty = 'easy' | 'normal' | 'hard';
type LightColor = 'red' | 'blue' | null;
type GameScreen = 'title' | 'playing' | 'result';

interface DifficultyConfig {
  label: string;
  speedText: string;
  intervalMs: number;
  redRatio: number;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'やさしい',
    speedText: 'ゆっくり (1.1秒)',
    intervalMs: 1100,
    redRatio: 0.65,
  },
  normal: {
    label: '普通',
    speedText: 'ほどよい (0.75秒)',
    intervalMs: 750,
    redRatio: 0.6,
  },
  hard: {
    label: '強い',
    speedText: '超スピード (0.48秒)',
    intervalMs: 480,
    redRatio: 0.55,
  },
};

const GAME_DURATION = 30;
const MAX_LIVES = 3;
const GRID_SIZE = 25;

const HeartIcon = ({
  size = 20,
  fill = 'white',
  color = 'white',
}: {
  size?: number;
  fill?: string;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const CrossIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="3.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const PlayIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [lives, setLives] = useState<number>(MAX_LIVES);
  const [redHits, setRedHits] = useState<number>(0);
  const [blueMisses, setBlueMisses] = useState<number>(0);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeColor, setActiveColor] = useState<LightColor>(null);
  const [clickedCurrent, setClickedCurrent] = useState<boolean>(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{ text: string; type: 'good' | 'bad' } | null>(null);
  const [shake, setShake] = useState<boolean>(false);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number>>({
    easy: 0,
    normal: 0,
    hard: 0,
  });

  const prevIndexRef = useRef<number | null>(null);

  const spawnNextLight = useCallback(() => {
    const config = DIFFICULTIES[difficulty];
    let nextIdx = Math.floor(Math.random() * GRID_SIZE);
    if (nextIdx === prevIndexRef.current) {
      nextIdx = (nextIdx + 1 + Math.floor(Math.random() * (GRID_SIZE - 1))) % GRID_SIZE;
    }
    prevIndexRef.current = nextIdx;

    const isRed = Math.random() < config.redRatio;
    setActiveIndex(nextIdx);
    setActiveColor(isRed ? 'red' : 'blue');
    setClickedCurrent(false);
  }, [difficulty]);

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(MAX_LIVES);
    setRedHits(0);
    setBlueMisses(0);
    setTimeLeft(GAME_DURATION);
    setFeedback(null);
    setShake(false);
    prevIndexRef.current = null;
    setScreen('playing');
    spawnNextLight();
  };

  const finishGame = useCallback(
    (finalScore: number) => {
      setActiveIndex(null);
      setActiveColor(null);
      setBestScores((prev) => ({
        ...prev,
        [difficulty]: Math.max(prev[difficulty], finalScore),
      }));
      setScreen('result');
    },
    [difficulty]
  );

  useEffect(() => {
    if (screen !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen === 'playing' && timeLeft === 0) {
      finishGame(score);
    }
  }, [timeLeft, screen, score, finishGame]);

  useEffect(() => {
    if (screen !== 'playing') return;
    const intervalMs = DIFFICULTIES[difficulty].intervalMs;
    const lightTimer = setInterval(() => {
      spawnNextLight();
    }, intervalMs);
    return () => clearInterval(lightTimer);
  }, [screen, difficulty, spawnNextLight]);

  const handleCellClick = (index: number) => {
    if (screen !== 'playing' || clickedCurrent) return;

    if (index === activeIndex && activeColor !== null) {
      setClickedCurrent(true);
      setFlashIndex(index);
      setTimeout(() => setFlashIndex(null), 160);

      if (activeColor === 'red') {
        const nextCombo = combo + 1;
        const bonus = Math.min(nextCombo * 10, 100);
        const gained = 100 + bonus;

        setScore((s) => s + gained);
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setRedHits((h) => h + 1);
        setFeedback({
          text: nextCombo >= 3 ? `ナイス！ +${gained} (${nextCombo}コンボ!)` : `ナイス！ +${gained}`,
          type: 'good',
        });

        setActiveIndex(null);
        setActiveColor(null);
      } else if (activeColor === 'blue') {
        setCombo(0);
        setBlueMisses((b) => b + 1);
        setScore((s) => Math.max(0, s - 50));
        setFeedback({ text: 'あちゃー！青はガマン！ -50', type: 'bad' });
        setShake(true);
        setTimeout(() => setShake(false), 350);

        setActiveIndex(null);
        setActiveColor(null);

        const nextLives = lives - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
          setTimeout(() => finishGame(Math.max(0, score - 50)), 250);
        }
      }
    }
  };

  const getRankInfo = () => {
    if (lives <= 0) return { rank: 'C', comment: '青におてつきしちゃった！次は気をつけよう♪' };
    if (score >= 2800) return { rank: 'S+', comment: '神レベルの反射神経！！すごすぎる〜！' };
    if (score >= 2000) return { rank: 'S', comment: 'とってもすばやい！パーフェクトな動き！' };
    if (score >= 1200) return { rank: 'A', comment: 'いい調子！キラキラの反射神経だね♪' };
    return { rank: 'B', comment: 'ナイスチャレンジ！もう1回やってみよう！' };
  };

  return (
    <div className="app-wrapper">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      <div className={`game-card ${shake ? 'shake' : ''}`}>
        {screen === 'title' && (
          <div>
            <div className="title-badge">
              <span>✨ 5×5 反射神経ゲーム ✨</span>
            </div>

            <h1 className="game-title">
              ぴかっと！
              <br />
              赤だけタッチ♪
            </h1>
            <p className="game-subtitle">25マスのうち1つがランダムに光るよ！</p>

            <div className="rule-box">
              <div className="rule-item">
                <div className="mini-tile mini-red">
                  <HeartIcon size={22} />
                </div>
                <span style={{ color: '#ff2a5f' }}>赤はタッチ！</span>
              </div>

              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffc2d4' }}>VS</div>

              <div className="rule-item">
                <div className="mini-tile mini-blue">
                  <CrossIcon size={24} />
                </div>
                <span style={{ color: '#2589ff' }}>青はガマン！</span>
              </div>
            </div>

            <span className="difficulty-label">★ 光るスピードをえらんでね ★</span>
            <div className="difficulty-group">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => {
                const item = DIFFICULTIES[key];
                const isSelected = difficulty === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`diff-btn ${key} ${isSelected ? 'active' : ''}`}
                    onClick={() => setDifficulty(key)}
                  >
                    <span className="diff-name">{item.label}</span>
                    <span className="diff-speed">{item.speedText}</span>
                  </button>
                );
              })}
            </div>

            {bestScores[difficulty] > 0 && (
              <div
                style={{
                  marginBottom: '14px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#d98200',
                }}
              >
                🏆 {DIFFICULTIES[difficulty].label}のハイスコア: {bestScores[difficulty]} pt
              </div>
            )}

            <button type="button" className="start-btn" onClick={startGame}>
              <PlayIcon />
              <span>ゲームスタート！</span>
            </button>
          </div>
        )}

        {screen === 'playing' && (
          <div>
            <div className="hud-bar">
              <div className="hud-box">
                <span className="hud-label">のこり時間</span>
                <span className={`hud-value ${timeLeft <= 5 ? 'time-low' : ''}`}>
                  {timeLeft}秒
                </span>
              </div>

              <div className="hud-box">
                <span className="hud-label">スコア</span>
                <span className="hud-value">{score}</span>
              </div>

              <div className="hud-box">
                <span className="hud-label">ライフ</span>
                <div className="hearts-row">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <HeartIcon
                      key={i}
                      size={18}
                      fill={i < lives ? '#ff2a5f' : '#f3dce3'}
                      color={i < lives ? '#ff2a5f' : '#e0c3cc'}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="feedback-banner">
              {feedback && (
                <span className={feedback.type === 'good' ? 'fb-good' : 'fb-bad'}>
                  {feedback.text}
                </span>
              )}
            </div>

            <div className="grid-board">
              {Array.from({ length: GRID_SIZE }).map((_, idx) => {
                const isLit = idx === activeIndex;
                const litClass = isLit
                  ? activeColor === 'red'
                    ? 'lit-red'
                    : 'lit-blue'
                  : '';
                const flashClass = idx === flashIndex ? 'hit-flash' : '';

                return (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`マス ${idx + 1}`}
                    className={`cell-btn ${litClass} ${flashClass}`}
                    onPointerDown={() => handleCellClick(idx)}
                  >
                    {isLit && activeColor === 'red' && <HeartIcon size={26} />}
                    {isLit && activeColor === 'blue' && <CrossIcon size={28} />}
                  </button>
                );
              })}
            </div>

            <button type="button" className="quit-link" onClick={() => setScreen('title')}>
              タイトルにもどる
            </button>
          </div>
        )}

        {screen === 'result' && (
          <div>
            <div className="title-badge">
              <span>🏆 けっかはっぴょう ({DIFFICULTIES[difficulty].label})</span>
            </div>

            <div>
              <div className="result-rank">ランク {getRankInfo().rank}</div>
              <p className="result-comment">{getRankInfo().comment}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-title">最終スコア</div>
                <div className="stat-num" style={{ color: '#ff2a5f' }}>
                  {score} pt
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-title">最大コンボ</div>
                <div className="stat-num">{maxCombo} 連続</div>
              </div>

              <div className="stat-card">
                <div className="stat-title">赤タッチ成功</div>
                <div className="stat-num">{redHits} 回</div>
              </div>

              <div className="stat-card">
                <div className="stat-title">青おてつき</div>
                <div className="stat-num">{blueMisses} 回</div>
              </div>
            </div>

            <div className="result-actions">
              <button type="button" className="sub-btn" onClick={() => setScreen('title')}>
                <span>🏠 タイトルへ</span>
              </button>

              <button
                type="button"
                className="start-btn"
                style={{ flex: 1.4, padding: '14px 18px', fontSize: '1.05rem' }}
                onClick={startGame}
              >
                <span>↻ もういちど！</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}