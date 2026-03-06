import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Play, RotateCcw, Gamepad2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Medal } from 'lucide-react';
import { UserProfile } from '../types';

interface GamesProps {
  profile: UserProfile;
}

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type ScoreEntry = { name: string; score: number; date: string };

const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Direction = 'UP';
const GAME_SPEED = 120;

export default function Games({ profile }: GamesProps) {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [topScores, setTopScores] = useState<ScoreEntry[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  
  // High score
  useEffect(() => {
    const saved = localStorage.getItem('kevinflix_snake_top_scores');
    if (saved) {
      setTopScores(JSON.parse(saved));
    } else {
      const oldHigh = localStorage.getItem('kevinflix_snake_highscore');
      if (oldHigh) {
        setTopScores([{ name: profile.username || 'Jogador', score: parseInt(oldHigh, 10), date: new Date().toISOString() }]);
      }
    }
  }, [profile.username]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (directionRef.current) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // Check collision with walls
        if (
          newHead.x < 0 || 
          newHead.x >= GRID_SIZE || 
          newHead.y < 0 || 
          newHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // Check collision with self
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          generateFood(newSnake);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(intervalId);
  }, [isPlaying, isGameOver, food]);

  const handleGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    
    setTopScores(prev => {
      if (score === 0) return prev; // Don't save 0 scores
      
      const newScores = [...prev, { name: profile.username || 'Jogador', score, date: new Date().toISOString() }];
      // Sort descending by score
      newScores.sort((a, b) => b.score - a.score);
      
      // Keep only top 3 unique scores (or just top 3 entries)
      const top3 = newScores.slice(0, 3);
      localStorage.setItem('kevinflix_snake_top_scores', JSON.stringify(top3));
      return top3;
    });
  };

  const generateFood = (currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // Make sure food doesn't spawn on snake
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    setFood(newFood);
  };

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    generateFood(INITIAL_SNAKE);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (directionRef.current !== 'DOWN') directionRef.current = 'UP';
          break;
        case 'ArrowDown':
        case 's':
          if (directionRef.current !== 'UP') directionRef.current = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
          if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
          if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#09090b'; // zinc-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellSize = canvas.width / GRID_SIZE;

    // Draw grid (optional, subtle)
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444'; // red-500
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2, 
      food.y * cellSize + cellSize / 2, 
      cellSize / 2.5, 
      0, 
      2 * Math.PI
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      // Head is brighter
      if (index === 0) {
        ctx.fillStyle = '#22c55e'; // green-500
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22c55e';
      } else {
        ctx.fillStyle = '#16a34a'; // green-600
        ctx.shadowBlur = 0;
      }
      
      // Draw rounded rect for snake segments
      ctx.beginPath();
      ctx.roundRect(
        segment.x * cellSize + 1, 
        segment.y * cellSize + 1, 
        cellSize - 2, 
        cellSize - 2,
        4
      );
      ctx.fill();
    });
    ctx.shadowBlur = 0;

  }, [snake, food]);

  // Mobile controls
  const handleDirectionClick = (newDir: Direction) => {
    if (!isPlaying) return;
    
    if (newDir === 'UP' && directionRef.current !== 'DOWN') directionRef.current = 'UP';
    if (newDir === 'DOWN' && directionRef.current !== 'UP') directionRef.current = 'DOWN';
    if (newDir === 'LEFT' && directionRef.current !== 'RIGHT') directionRef.current = 'LEFT';
    if (newDir === 'RIGHT' && directionRef.current !== 'LEFT') directionRef.current = 'RIGHT';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center">
          <Gamepad2 className="text-red-500" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Neon Snake</h2>
          <p className="text-zinc-400">Jogue enquanto espera seus amigos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className="relative bg-zinc-900 p-4 rounded-3xl border border-zinc-800 shadow-2xl w-full max-w-[400px]">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="bg-zinc-950 rounded-xl w-full aspect-square"
            />
            
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
                {isGameOver ? (
                  <>
                    <h3 className="text-3xl font-black text-white mb-2">GAME OVER</h3>
                    <p className="text-zinc-300 mb-6">Pontuação: <span className="text-red-500 font-bold">{score}</span></p>
                    <button 
                      onClick={startGame}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95"
                    >
                      <RotateCcw size={20} />
                      Tentar Novamente
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                      <Gamepad2 size={32} className="text-white" />
                    </div>
                    <button 
                      onClick={startGame}
                      className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      <Play size={24} className="fill-current" />
                      Jogar Agora
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="mt-8 grid grid-cols-3 gap-2 w-full max-w-[200px] lg:hidden">
            <div />
            <button 
              onClick={() => handleDirectionClick('UP')}
              className="bg-zinc-800 p-4 rounded-xl flex items-center justify-center active:bg-zinc-700"
            >
              <ChevronUp />
            </button>
            <div />
            <button 
              onClick={() => handleDirectionClick('LEFT')}
              className="bg-zinc-800 p-4 rounded-xl flex items-center justify-center active:bg-zinc-700"
            >
              <ChevronLeft />
            </button>
            <button 
              onClick={() => handleDirectionClick('DOWN')}
              className="bg-zinc-800 p-4 rounded-xl flex items-center justify-center active:bg-zinc-700"
            >
              <ChevronDown />
            </button>
            <button 
              onClick={() => handleDirectionClick('RIGHT')}
              className="bg-zinc-800 p-4 rounded-xl flex items-center justify-center active:bg-zinc-700"
            >
              <ChevronRight />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="text-yellow-500" size={20} />
              <h3 className="text-zinc-400 font-medium">Top 3 Jogadores</h3>
            </div>
            
            {topScores.length > 0 ? (
              <div className="space-y-3">
                {topScores.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-lg ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-zinc-300' : 'text-amber-600'}`}>
                        #{idx + 1}
                      </span>
                      <span className="text-white font-medium truncate max-w-[100px]">{entry.name}</span>
                    </div>
                    <span className="text-xl font-black text-white">{entry.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-4">Nenhuma pontuação ainda. Seja o primeiro!</p>
            )}
          </div>

          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <h3 className="text-zinc-400 font-medium">Pontuação Atual</h3>
            </div>
            <p className="text-4xl font-black text-white">{score}</p>
          </div>

          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 mt-auto hidden lg:block">
            <h3 className="text-white font-bold mb-4">Como Jogar</h3>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-center gap-2">
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">W</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">A</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">S</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">D</kbd>
                <span>para mover</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">↑</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">←</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">↓</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">→</kbd>
                <span>setas também funcionam</span>
              </li>
              <li>Coma os pontos vermelhos para crescer e ganhar pontos.</li>
              <li>Não bata nas paredes ou no próprio corpo!</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
