import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
    id: '',
    username: '',
    avatar: '',
    fontStyle: 'font-sans'
  });

  useEffect(() => {
    const savedProfile = localStorage.getItem('kevinflix_profile');
    let currentProfile = profile;
    if (savedProfile) {
      currentProfile = JSON.parse(savedProfile);
      // Ensure existing users get an ID
      if (!currentProfile.id) {
        currentProfile.id = uuidv4() as string;
        localStorage.setItem('kevinflix_profile', JSON.stringify(currentProfile));
      }
      setProfile(currentProfile);
    } else {
      currentProfile = { ...profile, id: uuidv4() as string };
      setProfile(currentProfile);
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
      <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden aura-bg">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-72 glass border-r border-white/5 flex-col shadow-2xl z-20">
          <div className="p-8">
            <h1 className="text-3xl font-black text-red-600 tracking-tighter text-center md:text-left drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
              KEVINFLIX
            </h1>
          </div>

          <nav className="flex-1 px-4 space-y-3">
            {[
              { id: 'home', label: 'Início', icon: HomeIcon },
              { id: 'friends', label: 'Amigos', icon: Users },
              { id: 'games', label: 'Jogos', icon: Gamepad2 },
              { id: 'profile', label: 'Perfil', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${isActive
                    ? 'bg-red-600 text-white glow-red scale-[1.02]'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <Icon size={22} className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                  <span className="font-semibold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {profile.username && (
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4 p-4 glass-card rounded-2xl border-white/10 hover:border-white/20 transition-colors group cursor-pointer">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border-2 border-zinc-700 group-hover:border-red-500 transition-colors">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-lg">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold text-white truncate ${profile.fontStyle}`}>
                    {profile.username}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Membro Premium</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex-none flex items-center justify-center p-5 glass border-b border-white/5 z-20">
          <h1 className="text-2xl font-black text-red-600 tracking-tighter drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
            KEVINFLIX
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 custom-scrollbar relative z-10">
          <div className="max-w-7xl mx-auto h-full">
            {view === 'home' && <Home socket={socket} profile={profile} onJoinRoom={handleJoinRoom} />}
            {view === 'profile' && <Profile profile={profile} setProfile={handleProfileUpdate} />}
            {view === 'friends' && <Friends profile={profile} socket={socket} />}
            {view === 'games' && <Games profile={profile} />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-6 left-6 right-6 glass p-2 rounded-2xl flex justify-around items-center border-white/10 shadow-2xl z-50">
          {[
            { id: 'home', label: 'Início', icon: HomeIcon },
            { id: 'friends', label: 'Amigos', icon: Users },
            { id: 'games', label: 'Jogos', icon: Gamepad2 },
            { id: 'profile', label: 'Perfil', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${isActive ? 'text-red-500 scale-110' : 'text-zinc-500'
                  }`}
              >
                <Icon size={24} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
