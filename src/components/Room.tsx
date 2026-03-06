import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { io, Socket } from 'socket.io-client';
import { UserProfile } from '../types';
import { Send, Image as ImageIcon, Smile, PenTool, X, Trash2, Users, ArrowLeft, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  avatar?: string;
  isSystem?: boolean;
}

interface DrawingLine {
  id: string;
  points: number[];
  color: string;
  brushSize: number;
}

interface RoomProps {
  roomId: string;
  password?: string;
  profile: UserProfile;
  onLeave: () => void;
}

const singleEmojis = [
  '😂', '💀', '🤡', '🗿', '👀', '🔥', '🤓', '😎', '🤔', '😭',
  '🤬', '🥺', '😏', '👍', '👎', '❤️', '💩', '👽', '👻', '🤌',
  '🫶', '✨', '💯', '🙏', '🤷‍♂️', '🤦‍♂️', '🎉', '🥶', '🥵', '🤯',
  '😈', '🤫', '🥱', '🤮', '🤑', '🤠', '🥳', '🥸', '😻', '😹'
];

const emojiCombos = [
  '👁️👄👁️', '👉👈', '🏃‍♂️💨', '🧍‍♂️...', '🗣️🔥',
  '🤡🔪', '💀🎺', '💅✨', '🍿👀', '😭🔫',
  '🧠💥', '🤌🍝', '🤝💰', '👀💦', '🔥🚒'
];

const customSymbols = [
  '★', '☆', '✦', '✧', '✪', '✫', '✬', '✭', '✮', '✯',
  '✰', '♡', '♥', '❥', '❦', '❧', '☙', '♔', '♕', '♚',
  '♛', '⚜', '♪', '♫', '♬', '⚡', '🔥', '✨', '🌟', '💫'
];

const isOnlyEmojis = (text: string) => {
  if (!text.trim()) return false;
  const stripped = text.replace(/[\s\n]/g, '');
  if (!stripped) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})+$/u;
  return emojiRegex.test(stripped);
};

export default function Room({ roomId, password, profile, onLeave }: RoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [activeDrawers, setActiveDrawers] = useState<string[]>([]);
  const [drawings, setDrawings] = useState<DrawingLine[]>([]);

  const playerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        socket.emit('send-message', `[IMAGE]${base64}`);
      };
      reader.readAsDataURL(file);
    }
  };
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [color, setColor] = useState('#000000');

  const [myMovies, setMyMovies] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join-room', {
      roomId,
      password,
      username: profile.username,
      avatar: profile.avatar
    });

    newSocket.on('room-state', (state) => {
      setVideoUrl(state.videoUrl);
      setPlaying(state.playing);
      if (playerRef.current && state.currentTime > 0) {
        playerRef.current.seekTo(state.currentTime, 'seconds');
      }
      setMessages(state.messages);
      setDrawings(state.drawings);
      setActiveDrawers(state.activeDrawers);
    });

    if (profile.username) {
      newSocket.emit('get-my-movies', profile.username);
    }

    newSocket.on('my-movies-list', (movies) => {
      setMyMovies(movies);
    });

    newSocket.on('video-url', (url) => setVideoUrl(url));
    newSocket.on('video-play', (time) => {
      setPlaying(true);
      if (playerRef.current) playerRef.current.seekTo(time, 'seconds');
    });
    newSocket.on('video-pause', (time) => {
      setPlaying(false);
      if (playerRef.current) playerRef.current.seekTo(time, 'seconds');
    });
    newSocket.on('video-seek', (time) => {
      if (playerRef.current) playerRef.current.seekTo(time, 'seconds');
    });

    newSocket.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('draw-line', (line) => {
      setDrawings((prev) => [...prev, line]);
    });

    newSocket.on('clear-drawing', () => {
      setDrawings([]);
    });

    newSocket.on('active-drawers', (drawers) => {
      setActiveDrawers(drawers);
    });

    newSocket.on('user-joined', (user) => {
      setMessages((prev) => [...prev, {
        id: Math.random().toString(),
        userId: 'system',
        username: 'Sistema',
        text: `${user.username} entrou na sala`,
        timestamp: Date.now(),
        isSystem: true
      }]);
    });

    newSocket.on('user-left', (user) => {
      setMessages((prev) => [...prev, {
        id: Math.random().toString(),
        userId: 'system',
        username: 'Sistema',
        text: `${user.username} saiu da sala`,
        timestamp: Date.now(),
        isSystem: true
      }]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, password, profile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (socket) {
      if (isDrawingMode) {
        socket.emit('start-drawing');
      } else {
        socket.emit('stop-drawing');
      }
    }
  }, [isDrawingMode, socket]);

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawings.forEach((line) => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.brushSize;
      for (let i = 0; i < line.points.length; i += 2) {
        if (i === 0) {
          ctx.moveTo(line.points[i], line.points[i + 1]);
        } else {
          ctx.lineTo(line.points[i], line.points[i + 1]);
        }
      }
      ctx.stroke();
    });

    if (currentLine.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      for (let i = 0; i < currentLine.length; i += 2) {
        if (i === 0) {
          ctx.moveTo(currentLine[i], currentLine[i + 1]);
        } else {
          ctx.lineTo(currentLine[i], currentLine[i + 1]);
        }
      }
      ctx.stroke();
    }
  }, [drawings, currentLine, color, isDrawingMode]);

  const handlePlay = () => {
    if (socket && playerRef.current) {
      socket.emit('video-play', playerRef.current.getCurrentTime());
    }
  };

  const handlePause = () => {
    if (socket && playerRef.current) {
      socket.emit('video-pause', playerRef.current.getCurrentTime());
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('send-message', newMessage);
      setNewMessage('');
    }
  };

  const handleLoadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl && socket) {
      socket.emit('video-url', inputUrl);
      setInputUrl('');
    }
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setCurrentLine([x, y]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    setCurrentLine((prev) => [...prev, x, y]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentLine.length > 2 && socket) {
      const line: DrawingLine = {
        id: Math.random().toString(36).substring(7),
        points: currentLine,
        color,
        brushSize: 3
      };
      socket.emit('draw-line', line);
      setDrawings((prev) => [...prev, line]);
    }
    setCurrentLine([]);
  };

  const clearDrawing = () => {
    if (socket) {
      socket.emit('clear-drawing');
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSelectMovie = (url: string) => {
    if (socket) {
      socket.emit('video-url', url);
      setShowLibrary(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-3 md:p-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 md:gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLeave}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <h1 className="text-xl md:text-2xl font-bold text-red-600 tracking-tighter">KEVINFLIX</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400">
            <Users size={16} />
            <span>Sala: {roomId}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyInviteLink}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${copySuccess ? 'bg-green-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'}`}
          >
            {copySuccess ? 'Copiado!' : 'Convidar Amigo'}
          </motion.button>
        </div>
      </header>

      {/* Video Area */}
      <div className="flex-none bg-black relative overflow-hidden" style={{ height: '35vh', minHeight: '250px' }}>
        {!videoUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="max-w-md w-full space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-zinc-300">O que vamos assistir?</h2>
              <form onSubmit={handleLoadVideo} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Cole um link ou escolha da biblioteca..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-red-500 transition-colors text-sm"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Reproduzir
                </button>
              </form>
              <button
                onClick={() => setShowLibrary(true)}
                className="text-xs text-zinc-500 hover:text-white transition-colors underline"
              >
                Ou escolher da minha biblioteca
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative group">
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={() => setShowLibrary(true)}
                className="px-3 py-1.5 bg-black/70 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg backdrop-blur-sm transition-colors border border-white/10"
              >
                Biblioteca
              </button>
              <button
                onClick={() => {
                  if (socket) socket.emit('video-url', '');
                  setVideoUrl('');
                }}
                className="px-3 py-1.5 bg-black/70 hover:bg-red-600 text-white text-xs font-medium rounded-lg backdrop-blur-sm transition-colors border border-white/10"
              >
                Fechar
              </button>
            </div>
            {/* @ts-ignore */}
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              playing={playing}
              controls={true}
              onPlay={handlePlay}
              onPause={handlePause}
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
              {...({} as any)}
            />
          </div>
        )}

        {/* Library Modal */}
        <AnimatePresence>
          {showLibrary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Minha Biblioteca</h3>
                <button onClick={() => setShowLibrary(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => handleSelectMovie(movie.video_url)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-red-600 transition-colors group"
                  >
                    <div className="aspect-video bg-zinc-950 relative">
                      <img src={movie.thumbnail} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play fill="white" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{movie.title}</p>
                    </div>
                  </div>
                ))}
                {myMovies.length === 0 && (
                  <p className="col-span-full text-center text-zinc-500 py-10">Sua biblioteca está vazia.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        {isDrawingMode ? (
          <div className="flex-1 flex flex-col bg-[#f8f9fa] relative overflow-hidden">
            {/* Dot pattern background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none overflow-hidden"
              />
              <div className="w-px h-6 bg-zinc-200 mx-1"></div>
              <button onClick={clearDrawing} className="p-2 text-zinc-500 hover:text-red-500 transition-colors rounded-full hover:bg-zinc-100" title="Limpar tudo">
                <Trash2 size={18} />
              </button>
              <div className="w-px h-6 bg-zinc-200 mx-1"></div>
              <button
                onClick={() => setIsDrawingMode(false)}
                className="p-2 text-zinc-500 hover:text-zinc-800 transition-colors rounded-full hover:bg-zinc-100"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center my-2"
                    >
                      <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                        {msg.text}
                      </span>
                    </motion.div>
                  );
                }

                const isMe = msg.username === profile.username;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.avatar ? (
                        <img src={msg.avatar} alt={msg.username} className="w-6 h-6 rounded-full bg-zinc-800 object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold uppercase">
                          {msg.username.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs text-zinc-500">{msg.username}</span>
                    </div>
                    {msg.text.startsWith('[IMAGE]') ? (
                      <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-red-600 rounded-tr-sm' : 'bg-zinc-800 rounded-tl-sm'}`}>
                        <img src={msg.text.replace('[IMAGE]', '')} alt="Uploaded" className="max-w-full rounded-lg" />
                      </div>
                    ) : isOnlyEmojis(msg.text) ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.6 }}
                        className="text-5xl py-2"
                      >
                        {msg.text}
                      </motion.div>
                    ) : (
                      <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-red-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Chat Input */}
        <div className="p-2 md:p-4 bg-zinc-900 border-t border-zinc-800 relative">
          <AnimatePresence>
            {showEmojis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full right-4 mb-2 p-3 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-xl w-72 max-h-80 flex flex-col z-50"
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Combos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {emojiCombos.map(combo => (
                        <motion.button
                          whileHover={{ scale: 1.05, backgroundColor: '#3f3f46' }}
                          whileTap={{ scale: 0.95 }}
                          key={combo}
                          type="button"
                          onClick={() => {
                            setNewMessage(prev => prev + combo);
                            setShowEmojis(false);
                          }}
                          className="text-sm p-2 bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          {combo}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Emojis</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {singleEmojis.map(emoji => (
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojis(false);
                          }}
                          className="text-xl p-1 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Símbolos</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {customSymbols.map(symbol => (
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          key={symbol}
                          type="button"
                          onClick={() => {
                            setNewMessage(prev => prev + symbol);
                            setShowEmojis(false);
                          }}
                          className="text-xl p-1 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          {symbol}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={handleSendMessage} className="flex items-center gap-1 md:gap-2">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className={`p-2 md:p-3 rounded-full transition-colors relative ${isDrawingMode ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title={isDrawingMode ? "Fechar desenho" : "Abrir papel de desenho"}
              >
                <PenTool size={20} />
                {activeDrawers.length > 0 && !isDrawingMode && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-zinc-900 rounded-full animate-pulse" title={`${activeDrawers.join(', ')} desenhando`}></span>
                )}
              </motion.button>
              {activeDrawers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 whitespace-nowrap bg-zinc-800 text-xs px-2 py-1 rounded text-zinc-300 pointer-events-none">
                  {activeDrawers.join(', ')} desenhando...
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ImageIcon size={20} />
            </motion.button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setShowEmojis(!showEmojis)}
              className={`p-2 md:p-3 rounded-full transition-colors ${showEmojis ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <Smile size={20} />
            </motion.button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mensagem..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-3 md:px-4 py-2 text-sm md:text-base focus:outline-none focus:border-zinc-600 transition-colors min-w-0"
            />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 md:p-3 bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-full transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
