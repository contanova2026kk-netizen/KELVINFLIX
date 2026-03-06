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
    if (socket && profile.username && newMovieTitle && newMovieUrl) {
      socket.emit('add-movie', {
        username: profile.username,
        movie: {
          title: newMovieTitle,
          videoUrl: newMovieUrl,
          thumbnail: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80`, // Default for now
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
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Rooms Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={24} className="text-red-600" />
              Salas Ativas
            </h2>
            <p className="text-zinc-500 text-sm">{rooms.length} salas disponíveis</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-900/20"
          >
            <Plus size={18} />
            Criar Sala
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="py-12 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
            <Play size={40} className="text-zinc-800 mb-3" />
            <p className="text-zinc-400">Nenhuma sala ativa no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-zinc-900/60 rounded-2xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all group">
                <div className="h-32 bg-zinc-950 flex items-center justify-center relative">
                  <Play size={32} className="text-zinc-800 group-hover:text-red-600 transition-colors" />
                  {room.hasPassword && (
                    <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg">
                      <Lock size={14} className="text-zinc-400" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-bold truncate">{room.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{room.users.length} usuários</p>
                    </div>
                    <div className="flex -space-x-2">
                      {room.users.slice(0, 3).map((u) => (
                        <div key={u.id} className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden text-[8px] flex items-center justify-center text-white">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.username.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinClick(room)}
                    className="w-full py-2 bg-zinc-800 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-all"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Movie Library Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Film size={24} className="text-red-600" />
              Minha Biblioteca
            </h2>
            <p className="text-zinc-500 text-sm">Seus vídeos e filmes salvos</p>
          </div>
          <button
            onClick={() => setShowAddMovieModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
          >
            <Plus size={18} />
            Adicionar Filme
          </button>
        </div>

        {myMovies.length === 0 ? (
          <div className="py-12 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
            <Film size={40} className="text-zinc-800 mb-3" />
            <p className="text-zinc-400">Sua biblioteca está vazia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {myMovies.map((movie) => (
              <div key={movie.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer">
                <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                  <img src={movie.thumbnail} alt={movie.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={24} className="text-white fill-white" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-white truncate">{movie.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Criar Sala</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <input
                type="text"
                placeholder="Nome da sala"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-red-600 outline-none text-white"
              />
              <input
                type="password"
                placeholder="Senha (opcional)"
                value={newRoomPassword}
                onChange={e => setNewRoomPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-red-600 outline-none text-white"
              />
              <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all">
                Criar Sala Agora
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddMovieModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Adicionar vídeo</h2>
              <button onClick={() => setShowAddMovieModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddMovie} className="space-y-4">
              <input
                type="text"
                placeholder="Título do filme/vídeo"
                value={newMovieTitle}
                onChange={e => setNewMovieTitle(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-red-600 outline-none text-white"
                required
              />
              <input
                type="text"
                placeholder="URL do vídeo (YouTube, MP4, etc)"
                value={newMovieUrl}
                onChange={e => setNewMovieUrl(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-red-600 outline-none text-white"
                required
              />
              <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all">
                Salvar na Biblioteca
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-white">Sala Protegida</h2>
            <p className="text-zinc-400 text-sm">Esta sala exige uma senha para entrar.</p>
            <form onSubmit={handleJoinWithPassword} className="space-y-4">
              <input
                type="password"
                placeholder="Senha da sala"
                value={joinPassword}
                onChange={e => setJoinPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-red-600 outline-none text-white"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedRoom(null)} className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
