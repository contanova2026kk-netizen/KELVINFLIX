import React, { useState, useEffect } from 'react';
import { Friend, UserProfile } from '../types';
import { UserPlus, MessageCircle, Search, MoreVertical, Send, ArrowLeft, Smile, X } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendsProps {
  profile: UserProfile;
  socket: Socket | null;
}

interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export default function Friends({ profile, socket }: FriendsProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendName, setNewFriendName] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Record<string, DirectMessage[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!socket || !profile.username) return;

    socket.emit('get-friends', profile.username);

    socket.on('friends-list', (friendsList: Friend[]) => {
      setFriends(friendsList);
    });

    socket.on('friend-added', (response: { success: boolean; friendUsername?: string; message?: string }) => {
      if (response.success) {
        socket.emit('get-friends', profile.username);
        setNewFriendName('');
        setError(null);
        setIsSearching(false);
      } else {
        setError(response.message || 'Erro ao adicionar amigo');
      }
    });

    socket.on('search-results', (results: Friend[]) => {
      // Filter out people who are already friends or represent the current user
      const filteredResults = results.filter(u =>
        u.id !== profile.id && !friends.some(f => f.id === u.id)
      );
      setSearchResults(filteredResults);
    });

    socket.on('dms-list', ({ friendId, messages: fetchedMessages }) => {
      setMessages(prev => ({
        ...prev,
        [friendId]: fetchedMessages.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id === profile.id ? 'me' : m.sender_id,
          text: m.text,
          timestamp: new Date(m.timestamp).getTime()
        }))
      }));
    });

    socket.on('new-dm', (m: any) => {
      if (m.sender_id !== profile.id && m.receiver_id !== profile.id) return;
      const isMe = m.sender_id === profile.id;
      const otherId = isMe ? m.receiver_id : m.sender_id;

      setMessages(prev => {
        const friendMsgs = prev[otherId] || [];
        // Avoid duplicates
        if (friendMsgs.find(msg => msg.id === m.id)) return prev;

        return {
          ...prev,
          [otherId]: [...friendMsgs, {
            id: m.id,
            senderId: isMe ? 'me' : m.sender_id,
            text: m.text,
            timestamp: new Date(m.timestamp).getTime()
          }]
        };
      });
    });

    return () => {
      socket.off('friends-list');
      socket.off('friend-added');
      socket.off('dms-list');
      socket.off('new-dm');
      socket.off('search-results');
    };
  }, [socket, profile, friends]);

  useEffect(() => {
    if (selectedFriend && socket) {
      socket.emit('get-dms', { userId: profile.id, friendId: selectedFriend.id });
    }
  }, [selectedFriend, socket, profile.id]);

  const handleAddFriend = (friendUsername: string) => {
    if (friendUsername.trim() && socket) {
      socket.emit('add-friend', {
        myUsername: profile.username,
        friendUsername: friendUsername.trim()
      });
    }
  };

  const handleSearch = (query: string) => {
    setNewFriendName(query);
    if (!socket) return;

    if (query.trim().length >= 2) {
      setIsSearching(true);
      socket.emit('search-users', query.trim());
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedFriend && socket) {
      socket.emit('send-dm', {
        senderId: profile.id,
        receiverId: selectedFriend.id,
        text: newMessage.trim()
      });
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] md:h-[calc(100vh-10rem)] glass rounded-[2.5rem] border-white/5 overflow-hidden shadow-2xl">
      {/* Sidebar - Contacts List */}
      <div className={`${selectedFriend ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-white/5 flex-col bg-white/[0.02]`}>
        <div className="p-6 border-b border-white/5 bg-white/[0.02] space-y-6">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase text-center md:text-left drop-shadow-lg">Contatos</h2>
          <div className="flex flex-col gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-zinc-500" size={16} />
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="PROCURAR USUÁRIO..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all font-black tracking-widest"
              />
              {newFriendName && (
                <button
                  onClick={() => { setNewFriendName(''); setIsSearching(false); setSearchResults([]); }}
                  className="absolute right-4 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {error && <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter ml-1">{error}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isSearching ? (
            <div className="p-2 space-y-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-4 mb-2">Resultados da Busca</p>
              {searchResults.length === 0 ? (
                <p className="text-xs text-zinc-600 font-bold px-4 py-8 text-center italic">Nenhum usuário novo encontrado...</p>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="w-full p-4 flex items-center gap-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 group"
                  >
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-white/5">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-zinc-700">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black truncate tracking-tight text-white">{user.username}</h3>
                    </div>
                    <button
                      onClick={() => handleAddFriend(user.username)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all glow-red"
                    >
                      <UserPlus size={18} />
                    </button>
                  </div>
                ))
              )}
              <div className="h-px bg-white/5 my-4 mx-4"></div>
            </div>
          ) : null}

          {!isSearching && friends.length === 0 ? (
            <div className="p-12 text-center space-y-4 opacity-30">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto">
                <MessageCircle size={32} className="text-zinc-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Sem Amigos</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className={`w-full p-4 flex items-center gap-4 rounded-[1.5rem] transition-all duration-300 group ${selectedFriend?.id === friend.id
                    ? 'bg-red-600 text-white shadow-xl scale-[0.98] glow-red'
                    : 'hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent hover:border-white/5'
                    }`}
                >
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 flex-shrink-0 border-2 transition-all ${selectedFriend?.id === friend.id ? 'border-white/20' : 'border-white/5 group-hover:border-white/20'}`}>
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-black">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-zinc-950 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-black truncate tracking-tight text-base ${selectedFriend?.id === friend.id ? 'text-white' : 'text-zinc-300'}`}>{friend.username}</h3>
                    <p className={`text-xs truncate font-medium ${selectedFriend?.id === friend.id ? 'text-red-100/60' : 'text-zinc-600'}`}>
                      {messages[friend.id]?.length > 0
                        ? messages[friend.id][messages[friend.id].length - 1].text
                        : 'ENVIE UM "OI!"'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Area - Chat */}
      <div className={`${!selectedFriend ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-black/20 backdrop-blur-3xl`}>
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedFriend(null)}
                  className="md:hidden w-10 h-10 glass rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 flex-shrink-0 border border-white/10 shadow-xl">
                  {selectedFriend.avatar ? (
                    <img src={selectedFriend.avatar} alt={selectedFriend.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-black text-zinc-500">
                      {selectedFriend.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{selectedFriend.username}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Sessão Ativa</p>
                  </div>
                </div>
              </div>
              <button className="w-10 h-10 glass rounded-xl flex items-center justify-center text-zinc-600 hover:text-white transition-all">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {(messages[selectedFriend.id] || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] md:max-w-[70%] ${msg.senderId === 'me' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                >
                  <div
                    className={`px-6 py-4 text-sm font-semibold shadow-2xl transition-all hover:scale-[1.02] ${msg.senderId === 'me'
                      ? 'bg-red-600 text-white rounded-[1.5rem] rounded-tr-none glow-red'
                      : 'glass text-zinc-200 rounded-[1.5rem] rounded-tl-none border-white/10'
                      }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-black text-zinc-600 mt-2 uppercase tracking-widest px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(messages[selectedFriend.id] || []).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                  <div className="w-16 h-16 glass rounded-full flex items-center justify-center">
                    <Send size={24} className="text-zinc-500 rotate-12" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-center max-w-[200px]">Quebre o gelo enviando a primeira mensagem!</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white/[0.01] border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="DIGITE ALGO REALMENTE ÉPICO..."
                    className="w-full glass border-white/10 rounded-[1.5rem] px-8 py-5 text-sm md:text-base text-white focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all font-bold tracking-tight shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button type="button" className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors">
                      <Smile size={20} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-14 h-14 bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 disabled:text-zinc-700 text-white rounded-[1.5rem] transition-all flex items-center justify-center shadow-xl glow-red hover:scale-110 active:scale-95 disabled:glow-none"
                >
                  <Send size={24} className="-mr-1 rotate-[-10deg]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 aura-bg opacity-30 active" />
            <div className="w-32 h-32 glass rounded-[2.5rem] flex items-center justify-center shadow-2xl relative">
              <div className="absolute inset-0 bg-red-600/5 blur-2xl rounded-full" />
              <MessageCircle size={64} className="text-zinc-800" />
            </div>
            <div className="text-center space-y-2 relative">
              <h3 className="text-3xl font-black text-zinc-800 tracking-tighter uppercase">KEVINFLIX CHAT</h3>
              <p className="text-xs font-black uppercase tracking-[0.4em]">Selecione um amigo para interagir</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
