import React, { useState, useEffect } from 'react';
import { Friend, UserProfile } from '../types';
import { UserPlus, MessageCircle, Search, MoreVertical, Send, ArrowLeft } from 'lucide-react';
import { Socket } from 'socket.io-client';

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
      } else {
        setError(response.message || 'Erro ao adicionar amigo');
      }
    });

    const savedMessages = localStorage.getItem('kevinflix_dms');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    return () => {
      socket.off('friends-list');
      socket.off('friend-added');
    };
  }, [socket, profile.username]);

  const saveMessages = (newMessages: Record<string, DirectMessage[]>) => {
    setMessages(newMessages);
    localStorage.setItem('kevinflix_dms', JSON.stringify(newMessages));
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFriendName.trim() && socket) {
      socket.emit('add-friend', {
        myUsername: profile.username,
        friendUsername: newFriendName.trim()
      });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedFriend) {
      const msg: DirectMessage = {
        id: Math.random().toString(36).substring(7),
        senderId: 'me',
        text: newMessage.trim(),
        timestamp: Date.now()
      };

      const friendMessages = messages[selectedFriend.username] || []; // Use username as key for better mapping
      const updatedMessages = {
        ...messages,
        [selectedFriend.username]: [...friendMessages, msg]
      };

      saveMessages(updatedMessages);
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] md:h-[calc(100vh-4rem)] bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
      {/* Sidebar - Contacts List */}
      <div className={`${selectedFriend ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-zinc-800 flex-col bg-zinc-950/50`}>
        <div className="p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-xl font-bold text-white mb-4 text-center md:text-left">Contatos</h2>
          <form onSubmit={handleAddFriend} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                placeholder="Nome do usuário..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={!newFriendName.trim()}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                <UserPlus size={20} />
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>Adicione amigos pelo nome de usuário.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {friends.map((friend) => (
                <button
                  key={friend.username}
                  onClick={() => setSelectedFriend(friend)}
                  className={`w-full p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors text-left ${selectedFriend?.username === friend.username ? 'bg-zinc-800/80' : ''
                    }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{friend.username}</h3>
                    <p className="text-sm text-zinc-500 truncate">
                      {messages[friend.username]?.length > 0
                        ? messages[friend.username][messages[friend.username].length - 1].text
                        : 'Toque para conversar'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Area - Chat */}
      <div className={`${!selectedFriend ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-zinc-950`}>
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedFriend(null)}
                  className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                  {selectedFriend.avatar ? (
                    <img src={selectedFriend.avatar} alt={selectedFriend.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                      {selectedFriend.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">{selectedFriend.username}</h3>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {(messages[selectedFriend.username] || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] md:max-w-[70%] ${msg.senderId === 'me' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl ${msg.senderId === 'me'
                        ? 'bg-red-600 text-white rounded-tr-sm'
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                      }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-600 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(messages[selectedFriend.username] || []).length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-500">
                  <p className="text-center px-4">Envie uma mensagem para iniciar a conversa</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-4 md:px-6 py-3 text-sm md:text-base text-white focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-full transition-colors flex-shrink-0"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center">
              <MessageCircle size={40} className="text-zinc-700" />
            </div>
            <h3 className="text-xl font-medium text-zinc-400">KEVINFLIX Web</h3>
            <p>Selecione um contato para começar a conversar</p>
          </div>
        )}
      </div>
    </div>
  );
}
