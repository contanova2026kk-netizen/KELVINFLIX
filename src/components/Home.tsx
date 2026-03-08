import React, { useState, useEffect } from 'react';
import { RoomInfo, UserProfile } from '../types';
import { Socket } from 'socket.io-client';
import { Play, Users, Lock, Plus, Film, Search, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Movie {
  id: string;
  title: string;
  video_url: string;
  thumbnail?: string;
  duration?: string;
}

interface HomeProps {
  socket: Socket | null;
  profile: UserProfile;
  onJoinRoom: (roomId: string, password?: string) => void;
}

export default function Home({ socket, profile, onJoinRoom }: HomeProps) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [myMovies, setMyMovies] = useState<Movie[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
  const [joinPassword, setJoinPassword] = useState('');

  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieUrl, setNewMovieUrl] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      }
    };

    fetchRooms();

    if (socket) {
      socket.on('rooms-updated', fetchRooms);

      if (profile.username) {
        socket.emit('get-my-movies', profile.username);
      }

      socket.on('my-movies-list', (movies: any[]) => {
        setMyMovies(movies.map(m => ({
          id: m.id,
          title: m.title,
          video_url: m.video_url,
          thumbnail: m.thumbnail,
          duration: m.duration
        })));
      });

      socket.on('movie-added', (res: any) => {
        if (res.success && profile.username) {
          socket.emit('get-my-movies', profile.username);
          setShowAddMovieModal(false);
          setNewMovieTitle('');
          setNewMovieUrl('');
        }
      });

      return () => {
        socket.off('rooms-updated');
        socket.off('my-movies-list');
        socket.off('movie-added');
      };
    }
  }, [socket, profile.username]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.username) return;
    const roomId = uuidv4().substring(0, 8);
    if (socket) {
      socket.emit('create-room', {
        roomId,
        name: newRoomName.trim() || `Sala de ${profile.username}`,
        password: newRoomPassword,
        username: profile.username,
        avatar: profile.avatar
      });
      onJoinRoom(roomId, newRoomPassword);
    }
  };

  const handleAddMovie = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newMovieUrl.trim();
    if (socket && profile.username && newMovieTitle.trim() && cleanUrl) {
      // Basic validation for common video hosts
      const isYoutube = cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
      const videoId = isYoutube ? (cleanUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1] || '') : '';

      socket.emit('add-movie', {
        username: profile.username,
        movie: {
          title: newMovieTitle.trim(),
          videoUrl: cleanUrl,
          thumbnail: isYoutube && videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80`,
          duration: '0:00'
        }
      });
    }
  };

  const handleJoinClick = (room: RoomInfo) => {
    if (room.hasPassword) {
      setSelectedRoom(room);
    } else {
      onJoinRoom(room.id);
    }
  };

  const handleJoinWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoom && socket) {
      socket.emit('check-password', { roomId: selectedRoom.id, password: joinPassword }, (response: any) => {
        if (response.success) {
          onJoinRoom(selectedRoom.id, joinPassword);
          setSelectedRoom(null);
          setJoinPassword('');
        } else {
          alert('Senha incorreta!');
        }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-12">
      {/* Rooms Section */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center glow-red">
                <Users size={28} className="text-red-500" />
              </div>
              SALAS ATIVAS
            </h2>
            <p className="text-zinc-500 font-medium tracking-wide">Explore {rooms.length} salas de cinema agora</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="group relative flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-black rounded-2xl transition-all hover:scale-105 active:scale-95 glow-red overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            CRIAR MINHA SALA
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="py-24 glass rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <Play size={40} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500 font-medium text-lg">O cinema está vazio. Que tal ser o primeiro?</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <div key={room.id} className="glass-card rounded-[2rem] overflow-hidden group hover:border-red-500/50 transition-all duration-500 hover:-translate-y-2">
                <div className="h-40 bg-zinc-950/50 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
                  <Play size={48} className="text-zinc-800 group-hover:text-red-600 transition-all duration-500 group-hover:scale-125 z-10" />
                  {room.hasPassword && (
                    <div className="absolute top-4 right-4 p-2 glass rounded-xl z-20">
                      <Lock size={16} className="text-red-400" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="px-3 py-1 bg-red-600/20 text-red-500 border border-red-500/30 rounded-full text-[10px] font-black tracking-widest uppercase">Ao Vivo</span>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white truncate tracking-tight">{room.name}</h3>
                      <p className="text-sm font-bold text-zinc-500 mt-1 uppercase tracking-tighter">{room.users.length} ESPECTADORES</p>
                    </div>
                    <div className="flex -space-x-3">
                      {room.users.slice(0, 3).map((u) => (
                        <div key={u.id} className="w-9 h-9 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden shadow-xl ring-2 ring-white/5">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{u.username.charAt(0)}</div>}
                        </div>
                      ))}
                      {room.users.length > 3 && (
                        <div className="w-9 h-9 rounded-full border-2 border-zinc-900 bg-red-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                          +{room.users.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinClick(room)}
                    className="w-full py-4 bg-white/5 hover:bg-red-600 text-white text-sm font-black rounded-2xl transition-all group-hover:glow-red uppercase tracking-widest border border-white/5 hover:border-red-500"
                  >
                    ENTRAR NA SESSÃO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Movie Library Section */}
      <section className="space-y-8">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
              <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center glow-accent">
                <Film size={28} className="text-purple-500" />
              </div>
              Minha Lista
            </h2>
            <p className="text-zinc-500 font-medium tracking-wide">Seus filmes e séries favoritos salvos</p>
          </div>
          <button
            onClick={() => setShowAddMovieModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all border border-white/10 hover:border-purple-500"
          >
            <Plus size={20} />
            NOVO FILME
          </button>
        </div>

        {myMovies.length === 0 ? (
          <div className="py-24 glass rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center text-center space-y-4">
            <Film size={48} className="text-zinc-800" />
            <p className="text-zinc-500 font-medium">Sua lista está vazia. Comece a adicionar agora!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {myMovies.map((movie) => (
              <div key={movie.id} className="glass-card rounded-[1.5rem] overflow-hidden group hover:scale-[1.05] transition-all duration-500 cursor-pointer border-white/5 hover:border-purple-500 shadow-2xl">
                <div className="aspect-[2/3] bg-zinc-950 relative overflow-hidden">
                  <img src={movie.thumbnail} alt={movie.title} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 backdrop-blur-sm bg-purple-600/10">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl glow-accent">
                      <Play size={28} className="text-purple-600 fill-purple-600 ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-lg font-black text-white leading-tight drop-shadow-lg">{movie.title}</h3>
                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Assistir Agora</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-2xl transition-all">
          <div className="glass-card rounded-[2.5rem] p-8 w-full max-w-md space-y-8 animate-in zoom-in-95 duration-300 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Configurar Sala</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Nome da Experiência</label>
                <input
                  type="text"
                  placeholder="Ex: Cine Night"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-red-600 focus:bg-white/10 outline-none text-white font-bold transition-all placeholder:text-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Senha (Privacidade)</label>
                <input
                  type="password"
                  placeholder="Deixe vazio para sala aberta"
                  value={newRoomPassword}
                  onChange={e => setNewRoomPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-red-600 focus:bg-white/10 outline-none text-white font-bold transition-all placeholder:text-zinc-700"
                />
              </div>
              <button className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-900/20 uppercase tracking-widest glow-red">
                LANÇAR SALA AGORA
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddMovieModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-2xl">
          <div className="glass-card rounded-[2.5rem] p-8 w-full max-w-md space-y-8 animate-in zoom-in-95 duration-300 border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Novo Conteúdo</h2>
              <button onClick={() => setShowAddMovieModal(false)} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddMovie} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Título do Vídeo</label>
                <input
                  type="text"
                  placeholder="Ex: Trailer Superman"
                  value={newMovieTitle}
                  onChange={e => setNewMovieTitle(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-purple-600 focus:bg-white/10 outline-none text-white font-bold transition-all placeholder:text-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Link (Direct URL)</label>
                <input
                  type="text"
                  placeholder="YouTube, MP4, etc"
                  value={newMovieUrl}
                  onChange={e => setNewMovieUrl(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-purple-600 focus:bg-white/10 outline-none text-white font-bold transition-all placeholder:text-zinc-700"
                  required
                />
              </div>
              <button className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-purple-900/20 uppercase tracking-widest glow-accent">
                ADICIONAR À MINHA LISTA
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-2xl">
          <div className="glass-card rounded-[2.5rem] p-8 w-full max-w-md space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 glass rounded-[2rem] flex items-center justify-center mx-auto glow-red mb-4">
              <Lock size={32} className="text-red-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">ESTA SALA É PRIVADA</h2>
              <p className="text-zinc-500 font-bold uppercase tracking-tight text-sm">Insira o código de acesso para entrar</p>
            </div>
            <form onSubmit={handleJoinWithPassword} className="space-y-6 pt-4">
              <input
                type="password"
                placeholder="SENHA DA SALA"
                value={joinPassword}
                onChange={e => setJoinPassword(e.target.value)}
                className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:border-red-600 outline-none text-center text-2xl font-black tracking-[0.5em] focus:bg-white/10 text-white"
                autoFocus
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setSelectedRoom(null)} className="flex-1 py-4 glass text-white font-black rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest">VOLTAR</button>
                <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all uppercase tracking-widest glow-red">ENTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
