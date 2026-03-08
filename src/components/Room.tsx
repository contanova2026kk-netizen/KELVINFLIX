import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { io, Socket } from 'socket.io-client';
import { UserProfile } from '../types';
import { Send, Image as ImageIcon, Smile, PenTool, X, Trash2, Users, ArrowLeft, Play, Plus } from 'lucide-react';
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

const urlRegex = /(https?:\/\/[^\s]+)/g;

const renderMessageText = (text: string, onPlayVideo: (url: string) => void) => {
  const parts = text.split(urlRegex);
  
  if (parts.length === 1) return text;

  return (
    <div className="flex flex-col gap-2">
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          if (part.match(urlRegex)) {
            return (
              <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-200 text-blue-300 break-all">
                {part}
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      
      {parts.filter(p => p.match(urlRegex)).map((url, i) => {
        const isVideo = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('vimeo.com') || url.includes('twitch.tv');
        if (isVideo) {
          return (
            <button
              key={`btn-${i}`}
              onClick={() => onPlayVideo(url)}
              className="flex w-fit items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <Play size={12} fill="currentColor" />
              Reproduzir Vídeo na Sala
            </button>
          );
        }
        return null;
      })}
    </div>
  );
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
      id: profile.id,
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

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/?room=${roomId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kevinflix - Sala de Cinema',
          text: `Venha assistir algo comigo na sala: ${roomId}`,
          url: url
        });
      } catch (err) {
        console.log('Share failed or cancelled');
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSelectMovie = (url: string) => {
    if (socket) {
      socket.emit('video-url', url);
      setShowLibrary(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden aura-bg">
      {/* Header */}
      <header className="flex-none flex items-center justify-between p-4 md:p-6 glass border-b border-white/5 z-30 shadow-2xl">
        <div className="flex items-center gap-4 md:gap-8">
          <motion.button
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLeave}
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black text-red-600 tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.5)] leading-none">
              KEVINFLIX
            </h1>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-1">Sala de Cinema</p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 glass rounded-2xl border-white/10">
            <Users size={18} className="text-red-500" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-300">ID: {roomId}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyInviteLink}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl ${copySuccess ? 'bg-green-600 text-white glow-green' : 'glass hover:bg-white/10 text-white border-white/20'}`}
          >
            {copySuccess ? 'COPIADO!' : 'CONVIDAR AMIGO'}
          </motion.button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Content Area (Video/Board) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-black/40">

          {/* Video Section */}
          <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

            {!videoUrl ? (
              <div className="relative z-10 w-full max-w-2xl glass-card rounded-[3rem] p-10 md:p-16 text-center space-y-10 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-red-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto glow-red border border-red-500/20">
                  <Play size={40} className="text-red-500 fill-red-500 ml-1" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Sessão Suspensa</h2>
                  <p className="text-zinc-500 font-medium text-lg">Insira um link ou escolha algo da sua biblioteca</p>
                </div>
                <form onSubmit={handleLoadVideo} className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="URL DO VÍDEO (YOUTUBE, MP4, ETC)"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="flex-1 px-8 py-5 glass border-white/10 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all text-sm font-bold tracking-tight text-white placeholder:text-zinc-700"
                  />
                  <button
                    type="submit"
                    className="px-10 py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all glow-red uppercase tracking-widest"
                  >
                    LANÇAR
                  </button>
                </form>
                <button
                  onClick={() => setShowLibrary(true)}
                  className="flex items-center gap-2 mx-auto text-xs font-black text-zinc-600 hover:text-white transition-all uppercase tracking-widest"
                >
                  <Plus size={16} />
                  ACESSAR MINHA BIBLIOTECA
                </button>
              </div>
            ) : (
              <div className="w-full h-full relative group rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.1)] border border-white/5">
                <div className="absolute top-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 flex gap-3">
                  <button
                    onClick={() => setShowLibrary(true)}
                    className="px-6 py-3 glass hover:bg-white/10 text-white text-[10px] font-black rounded-xl backdrop-blur-3xl transition-all border border-white/20 uppercase tracking-widest"
                  >
                    BIBLIOTECA
                  </button>
                  <button
                    onClick={() => {
                      if (socket) socket.emit('video-url', '');
                      setVideoUrl('');
                    }}
                    className="px-6 py-3 glass hover:bg-red-600 text-white text-[10px] font-black rounded-xl backdrop-blur-3xl transition-all border border-white/20 uppercase tracking-widest"
                  >
                    FECHAR
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
                  playsinline={true}
                  config={{
                    youtube: {
                      playerVars: { showinfo: 1, origin: window.location.origin }
                    }
                  }}
                  onError={(e) => {
                    console.error('Video Error:', e);
                    setMessages(prev => [...prev, {
                      id: Math.random().toString(),
                      userId: 'system',
                      username: 'Sistema',
                      text: 'Erro ao carregar o vídeo. Verifique o link.',
                      timestamp: Date.now(),
                      isSystem: true
                    }]);
                  }}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  className="rounded-[2rem] overflow-hidden"
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
                  {...({} as any)}
                />
              </div>
            )}
          </div>

          {/* Drawing Board Layer */}
          <AnimatePresence>
            {isDrawingMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-zinc-100/95 backdrop-blur-md overflow-hidden flex flex-col"
              >
                {/* Dot pattern background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-4 glass rounded-[2.5rem] shadow-2xl border-white/20 bg-white/50 backdrop-blur-2xl">
                  <div className="flex items-center gap-2 px-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-2xl cursor-pointer bg-transparent border-none p-0 overflow-hidden shadow-sm"
                    />
                  </div>
                  <div className="w-px h-8 bg-black/10 mx-2"></div>
                  <button onClick={clearDrawing} className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-red-600 transition-all rounded-2xl hover:bg-white/50" title="LIMPAR QUADRO">
                    <Trash2 size={22} />
                  </button>
                  <div className="w-px h-8 bg-black/10 mx-2"></div>
                  <button
                    onClick={() => setIsDrawingMode(false)}
                    className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-black transition-all rounded-2xl hover:bg-white/50"
                    title="FECHAR QUADRO"
                  >
                    <X size={26} />
                  </button>
                </div>

                <div className="flex-1 relative cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={1920}
                    height={1080}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full touch-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar - Chat Area */}
        <div className="w-full md:w-96 flex flex-col bg-white/[0.02] border-l border-white/5 relative z-20">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center my-4"
                      >
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                          {msg.text}
                        </span>
                      </motion.div>
                    );
                  }

                  const isMe = (msg.id === profile.id || msg.userId === profile.id || msg.username === profile.username);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`flex flex-col max-w-[90%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className={`flex items-center gap-3 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="w-8 h-8 rounded-xl bg-zinc-900 overflow-hidden border border-white/10 shadow-lg">
                          {msg.avatar ? (
                            <img src={msg.avatar} alt={msg.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-zinc-600 uppercase">
                              {msg.username.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{msg.username}</span>
                      </div>

                      {msg.text.startsWith('[IMAGE]') ? (
                        <div className={`p-2 rounded-[1.5rem] glass-card ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                          <img src={msg.text.replace('[IMAGE]', '')} alt="Uploaded" className="max-w-full rounded-2xl shadow-2xl" />
                        </div>
                      ) : isOnlyEmojis(msg.text) ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.6 }}
                          className="text-6xl py-2 drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        >
                          {msg.text}
                        </motion.div>
                      ) : (
                        <div className={`px-5 py-3.5 text-sm font-bold shadow-2xl transition-all ${isMe
                          ? 'bg-red-600 text-white rounded-[1.5rem] rounded-tr-none glow-red'
                          : 'glass text-zinc-200 rounded-[1.5rem] rounded-tl-none border-white/10'}`}>
                          {renderMessageText(msg.text, (url) => {
                            if (socket) socket.emit('video-url', url);
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Chat Controls & Input */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsDrawingMode(!isDrawingMode)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDrawingMode ? 'bg-red-600 text-white glow-red' : 'glass text-zinc-500 hover:text-white'}`}
                  >
                    <PenTool size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                  >
                    <ImageIcon size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowEmojis(!showEmojis)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${showEmojis ? 'bg-purple-600 text-white glow-accent' : 'glass text-zinc-500 hover:text-white'}`}
                  >
                    <Smile size={20} />
                  </motion.button>
                </div>

                {activeDrawers.length > 0 && !isDrawingMode && (
                  <div className="px-4 py-2 glass rounded-xl border-red-500/20 flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 bg-red-600 rounded-full" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Desenho Ativo</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="DIGITE ALGO..."
                  className="flex-1 glass border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-800"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-14 h-14 bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 disabled:text-zinc-700 text-white rounded-2xl transition-all flex items-center justify-center shadow-xl glow-red disabled:glow-none"
                >
                  <Send size={24} className="rotate-[-10deg] -mr-1" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Popovers & Overlays */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed bottom-24 right-96 mr-6 mb-2 p-6 glass-card rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-80 max-h-96 flex flex-col z-[100] border-white/20"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Reações</h4>
                <div className="grid grid-cols-2 gap-2">
                  {emojiCombos.map(combo => (
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      whileTap={{ scale: 0.95 }}
                      key={combo}
                      onClick={() => {
                        setNewMessage(prev => prev + combo);
                        setShowEmojis(false);
                      }}
                      className="text-base p-3 glass rounded-xl text-white transition-all border-white/5"
                    >
                      {combo}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Emojis</h4>
                <div className="grid grid-cols-5 gap-2">
                  {singleEmojis.map(emoji => (
                    <motion.button
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.8 }}
                      key={emoji}
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojis(false);
                      }}
                      className="text-2xl p-2 hover:bg-white/5 rounded-xl transition-all"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-3xl p-8 flex items-center justify-center"
          >
            <div className="glass-card rounded-[3rem] w-full max-w-5xl p-10 space-y-10 relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-white tracking-tighter uppercase">Minha Biblioteca</h3>
                  <p className="text-zinc-500 font-medium tracking-wide">Escolha o que vamos assistir agora</p>
                </div>
                <button onClick={() => setShowLibrary(false)} className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:rotate-90">
                  <X size={32} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                {myMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => handleSelectMovie(movie.video_url)}
                    className="glass-card rounded-[1.5rem] overflow-hidden group cursor-pointer border-white/5 hover:border-red-500/50 transition-all duration-500"
                  >
                    <div className="aspect-[2/3] bg-zinc-950 relative overflow-hidden">
                      <img src={movie.thumbnail} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl glow-red">
                          <Play fill="#dc2626" className="text-red-600 ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-sm font-black text-white leading-tight drop-shadow-lg truncate">{movie.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {myMovies.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-30">
                    <Plus size={64} className="mx-auto mb-4" />
                    <p className="text-xl font-black uppercase tracking-widest">Sua lista está vazia</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </div>
  );
}
