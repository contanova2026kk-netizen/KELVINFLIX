import React, { useRef, useState } from 'react';
import { UserProfile } from '../types';
import { Camera, Save, Check, Type, Smile, Users, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
}

const fontOptions = [
  { name: 'Padrão', value: 'font-sans' },
  { name: 'Elegante', value: 'font-serif' },
  { name: 'Código', value: 'font-mono' },
  { name: 'Impacto', value: 'font-black tracking-tighter' },
  { name: 'Cursiva', value: 'italic font-serif' },
  { name: 'Roboto', value: 'font-["Roboto"]' },
  { name: 'Lato', value: 'font-["Lato"]' },
  { name: 'Montserrat', value: 'font-["Montserrat"]' },
  { name: 'Oswald', value: 'font-["Oswald"] uppercase tracking-wide' },
  { name: 'Raleway', value: 'font-["Raleway"]' },
  { name: 'Poppins', value: 'font-["Poppins"]' },
  { name: 'Nunito', value: 'font-["Nunito"]' },
  { name: 'Playfair', value: 'font-["Playfair_Display"]' },
  { name: 'Merriweather', value: 'font-["Merriweather"]' },
  { name: 'Pacifico', value: 'font-["Pacifico"]' },
  { name: 'Dancing Script', value: 'font-["Dancing_Script"] text-lg' },
  { name: 'Caveat', value: 'font-["Caveat"] text-xl' },
];

const customSymbols = [
  '★', '☆', '✦', '✧', '✪', '✫', '✬', '✭', '✮', '✯', 
  '✰', '♡', '♥', '❥', '❦', '❧', '☙', '♔', '♕', '♚', 
  '♛', '⚜', '♪', '♫', '♬', '⚡', '🔥', '✨', '🌟', '💫'
];

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

export default function Profile({ profile, setProfile }: ProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfile({ ...profile, avatar: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const addTextToName = (text: string) => {
    setProfile({ ...profile, username: profile.username + text });
    setIsSaved(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-12">
      
      {/* Profile Section */}
      <div className="bg-zinc-900 p-6 md:p-8 rounded-2xl border border-zinc-800 space-y-8 relative">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-white">Seu Perfil</h2>
          <p className="text-zinc-400 text-sm md:text-base">Personalize como os outros te veem</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 border-4 border-zinc-700 group-hover:border-red-500 transition-colors flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera size={40} className="text-zinc-500 group-hover:text-red-500 transition-colors" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">Alterar Foto</span>
            </div>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-zinc-300">Seu Nome</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={profile.username}
                onChange={(e) => {
                  setProfile({ ...profile, username: e.target.value });
                  setIsSaved(false);
                }}
                placeholder="Digite seu nome"
                className={`w-full pl-4 pr-24 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white ${profile.fontStyle}`}
              />
              <div className="absolute right-2 flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9, y: -4 }}
                  onClick={() => { setShowFonts(!showFonts); setShowEmojis(false); }}
                  className={`p-2 rounded-lg transition-colors ${showFonts ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  title="Estilos de Fonte"
                >
                  <Type size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9, y: -4 }}
                  onClick={() => { setShowEmojis(!showEmojis); setShowFonts(false); }}
                  className={`p-2 rounded-lg transition-colors ${showEmojis ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  title="Emojis e Símbolos"
                >
                  <Smile size={18} />
                </motion.button>
              </div>
            </div>

            {/* Fonts Popover */}
            <AnimatePresence>
              {showFonts && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl z-50"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 pr-2 custom-scrollbar">
                    {fontOptions.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => {
                          setProfile({ ...profile, fontStyle: font.value });
                          setIsSaved(false);
                          setShowFonts(false);
                        }}
                        className={`p-2 rounded-xl border text-center transition-colors ${
                          profile.fontStyle === font.value 
                            ? 'bg-red-600/20 border-red-500 text-red-500' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <span className={`${font.value} text-sm`}>{font.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emojis Popover */}
            <AnimatePresence>
              {showEmojis && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 p-4 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl z-50"
                >
                  <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Combos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {emojiCombos.map(combo => (
                          <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: '#3f3f46' }}
                            whileTap={{ scale: 0.95 }}
                            key={combo}
                            onClick={() => addTextToName(combo)}
                            className="text-sm p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors text-white"
                          >
                            {combo}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Símbolos</h4>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {customSymbols.map(symbol => (
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            key={symbol}
                            onClick={() => addTextToName(symbol)}
                            className="text-xl p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center"
                          >
                            {symbol}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Emojis</h4>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {singleEmojis.map(emoji => (
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            key={emoji}
                            onClick={() => addTextToName(emoji)}
                            className="text-xl p-2 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center"
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
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!profile.username.trim()}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              isSaved 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-zinc-800 disabled:text-zinc-500'
            }`}
          >
            {isSaved ? (
              <>
                <Check size={20} />
                Salvo com sucesso!
              </>
            ) : (
              <>
                <Save size={20} />
                Salvar Perfil
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-zinc-900 p-6 md:p-8 rounded-2xl border border-zinc-800 space-y-6 text-zinc-300">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-black text-red-600 tracking-tighter">KEVINFLIX</h1>
          <p className="text-zinc-400">A melhor plataforma para assistir e interagir com amigos.</p>
        </div>

        <div className="space-y-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Users className="text-red-500" /> Salas Simultâneas
            </h3>
            <p className="text-sm leading-relaxed">
              Crie salas privadas ou públicas para até 6 pessoas. Assista vídeos do YouTube sincronizados com todos os participantes em tempo real. Se você pausar, pausa para todos!
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="text-red-500" /> Chat Dinâmico
            </h3>
            <p className="text-sm leading-relaxed">
              Converse com seus amigos usando um chat super rápido. Envie mensagens, imagens e use emojis gigantes. Veja quem entrou ou saiu da sala em tempo real.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Camera className="text-red-500" /> Lousa Interativa
            </h3>
            <p className="text-sm leading-relaxed">
              Abra a folha de desenho a qualquer momento para rabiscar, explicar algo ou jogar com seus amigos. Todos veem o desenho em tempo real e podem desenhar juntos!
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <User className="text-red-500" /> Personalização Extrema
            </h3>
            <p className="text-sm leading-relaxed">
              Escolha entre dezenas de fontes para o seu nome, adicione símbolos especiais e coloque sua foto de perfil favorita para se destacar nas salas.
            </p>
          </div>
        </div>
        
        <div className="text-center text-xs text-zinc-500 pt-4">
          <p>Versão 2.0.0 • Desenvolvido por kelvin lex</p>
        </div>
      </div>

    </div>
  );
}
