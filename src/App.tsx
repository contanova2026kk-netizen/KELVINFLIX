import React, { useState, useEffect } from 'react';
import Room from './components/Room';
import Home from './components/Home';
import Profile from './components/Profile';
import Friends from './components/Friends';
import Games from './components/Games';
import IntroAnimation from './components/IntroAnimation';
import { UserProfile } from './types';
import { io, Socket } from 'socket.io-client';
import { Home as HomeIcon, User, Users, LogOut, Gamepad2 } from 'lucide-react';

type View = 'home' | 'profile' | 'friends' | 'room' | 'games';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState<View>('home');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomPassword, setRoomPassword] = useState<string | undefined>();

  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    avatar: '',
    fontStyle: 'font-sans'
  });

  useEffect(() => {
    const savedProfile = localStorage.getItem('kevinflix_profile');
    let currentProfile = profile;
    if (savedProfile) {
      currentProfile = JSON.parse(savedProfile);
      setProfile(currentProfile);
    } else {
      setView('profile');
    }

    const newSocket = io();
    setSocket(newSocket);

    if (currentProfile.username) {
      newSocket.emit('register-user', currentProfile);
    }

    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
      setView('room');
    }

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleProfileUpdate = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('kevinflix_profile', JSON.stringify(newProfile));
    if (socket) {
      socket.emit('register-user', newProfile);
    }
  };

  const handleJoinRoom = (id: string, password?: string) => {
    setRoomId(id);
    setRoomPassword(password);
    setView('room');
    window.history.pushState({}, '', `/?room=${id}`);
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    setRoomPassword(undefined);
    setView('home');
    window.history.pushState({}, '', '/');
  };

  if (view === 'room' && roomId && profile.username) {
    return (
      <>
        {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
        <Room
          roomId={roomId}
          password={roomPassword}
          profile={profile}
          onLeave={handleLeaveRoom}
        />
      </>
    );
  }

  return (
    <>
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-black text-red-600 tracking-tighter text-center md:text-left">KEVINFLIX</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => setView('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'home' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
            >
              <HomeIcon size={20} />
              <span className="font-medium">Início</span>
            </button>

            <button
              onClick={() => setView('friends')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'friends' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
            >
              <Users size={20} />
              <span className="font-medium">Amigos</span>
            </button>

            <button
              onClick={() => setView('games')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'games' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
            >
              <Gamepad2 size={20} />
              <span className="font-medium">Jogos</span>
            </button>

            <button
              onClick={() => setView('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'profile' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
            >
              <User size={20} />
              <span className="font-medium">Perfil</span>
            </button>
          </nav>

          {profile.username && (
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-white truncate ${profile.fontStyle}`}>
                    {profile.username}
                  </p>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex-none flex items-center justify-center p-4 bg-zinc-900 border-b border-zinc-800">
          <h1 className="text-2xl font-black text-red-600 tracking-tighter">KEVINFLIX</h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          {view === 'home' && <Home socket={socket} profile={profile} onJoinRoom={handleJoinRoom} />}
          {view === 'profile' && <Profile profile={profile} setProfile={handleProfileUpdate} />}
          {view === 'friends' && <Friends profile={profile} socket={socket} />}
          {view === 'games' && <Games profile={profile} />}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around items-center p-2 pb-safe z-50">
          <button
            onClick={() => setView('home')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${view === 'home' ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <HomeIcon size={24} />
            <span className="text-[10px] font-medium">Início</span>
          </button>

          <button
            onClick={() => setView('friends')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${view === 'friends' ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <Users size={24} />
            <span className="text-[10px] font-medium">Amigos</span>
          </button>

          <button
            onClick={() => setView('games')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${view === 'games' ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <Gamepad2 size={24} />
            <span className="text-[10px] font-medium">Jogos</span>
          </button>

          <button
            onClick={() => setView('profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${view === 'profile' ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <User size={24} />
            <span className="text-[10px] font-medium">Perfil</span>
          </button>
        </div>
      </div>
    </>
  );
}
