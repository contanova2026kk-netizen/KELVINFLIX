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
    <div className="max-w-2xl mx-auto space-y-12 pb-20">

      {/* Profile Section */}
      <div className="glass-card p-8 md:p-12 rounded-[2.5rem] space-y-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] -z-10" />

        <div className="text-center space-y-3">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Seu Perfil</h2>
          <p className="text-zinc-500 font-medium tracking-wide">Como a comunidade Kevinflix te vê</p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-40 h-40 rounded-[3rem] overflow-hidden bg-zinc-900 border-2 border-white/5 group-hover:border-red-500 transition-all duration-500 flex items-center justify-center shadow-2xl group-hover:glow-red group-hover:scale-105">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera size={48} className="text-zinc-700 group-hover:text-red-500 transition-colors" />
                  <span className="text-[10px] font-black uppercase text-zinc-800 group-hover:text-red-900 tracking-[0.2em]">Upload</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-red-600/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <Camera size={24} className="text-white" />
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

        <div className="space-y-8">
          <div className="space-y-3 relative">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Identidade</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={profile.username}
                onChange={(e) => {
                  setProfile({ ...profile, username: e.target.value });
                  setIsSaved(false);
                }}
                placeholder="Como quer ser chamado?"
                className={`w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all text-white text-xl font-bold placeholder:text-zinc-700 ${profile.fontStyle}`}
              />
              <div className="absolute right-3 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowFonts(!showFonts); setShowEmojis(false); }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showFonts ? 'bg-red-600 text-white glow-red' : 'glass text-zinc-500 hover:text-white'}`}
                  title="Estilos de Fonte"
                >
                  <Type size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowEmojis(!showEmojis); setShowFonts(false); }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showEmojis ? 'bg-purple-600 text-white glow-accent' : 'glass text-zinc-500 hover:text-white'}`}
                  title="Emojis e Símbolos"
                >
                  <Smile size={20} />
                </motion.button>
              </div>
            </div>

            {/* Fonts Popover */}
            <AnimatePresence>
              {showFonts && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-4 p-4 glass rounded-[2rem] shadow-2xl z-50 border-white/20"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1 custom-scrollbar">
                    {fontOptions.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => {
                          setProfile({ ...profile, fontStyle: font.value });
                          setIsSaved(false);
                          setShowFonts(false);
                        }}
                        className={`p-4 rounded-xl border text-center transition-all duration-300 ${profile.fontStyle === font.value
                            ? 'bg-red-600 text-white glow-red border-red-400'
                            : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20 hover:text-white'
                          }`}
                      >
                        <span className={`${font.value} text-base font-medium`}>{font.name}</span>
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
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-4 p-6 glass rounded-[2rem] shadow-2xl z-50 border-white/20"
                >
                  <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-black text-zinc-500 mb-4 uppercase tracking-[0.3em] ml-1">Combinações Sugeridas</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {emojiCombos.map(combo => (
                          <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(147, 51, 234, 0.2)' }}
                            whileTap={{ scale: 0.95 }}
                            key={combo}
                            onClick={() => addTextToName(combo)}
                            className="text-lg p-3 glass rounded-xl text-white transition-all border-white/5 hover:border-purple-500/50"
                          >
                            {combo}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-zinc-500 mb-4 uppercase tracking-[0.3em] ml-1">Símbolos de Prestígio</h4>
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                        {customSymbols.map(symbol => (
                          <motion.button
                            whileHover={{ scale: 1.3, color: '#fff' }}
                            whileTap={{ scale: 0.8 }}
                            key={symbol}
                            onClick={() => addTextToName(symbol)}
                            className="text-2xl h-14 glass rounded-xl text-zinc-400 flex items-center justify-center transition-all hover:bg-white/10"
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
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!profile.username.trim()}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-500 ${isSaved
                ? 'bg-green-600 text-white glow-green'
                : 'bg-red-600 hover:bg-red-700 text-white glow-red disabled:bg-zinc-900 disabled:text-zinc-700 disabled:glow-none'
              }`}
          >
            {isSaved ? (
              <>
                <Check size={24} />
                ALTERAÇÕES SALVAS
              </>
            ) : (
              <>
                <Save size={24} />
                CONFIRMAR PERFIL
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* About Section */}
      <div className="glass-card p-10 md:p-14 rounded-[3rem] space-y-12 text-zinc-400 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 rounded-full blur-[80px]" />

        <div className="text-center space-y-4 relative">
          <h1 className="text-5xl font-black text-red-600 tracking-tight drop-shadow-2xl">KEVINFLIX</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">The Ultimate Cinema Experience</p>
        </div>

        <div className="grid gap-8 relative">
          {[
            { icon: Users, title: 'Imerção em Grupo', desc: 'Assista com sincronia perfeita. Se você pausar, todo mundo pausa. Sinta-se na mesma sala física.' },
            { icon: Sparkles, title: 'Chat Ultra-Rápido', desc: 'Comunicação instantânea com emojis gigantes e feedback visual de quem está online.' },
            { icon: Camera, title: 'Lousa Mágica', desc: 'A lousa agora é parte da experiência. Desenhe, explique ou jogue simultaneamente.' },
            { icon: User, title: 'Sua Identidade', desc: 'Sua presença é marcante com perfis totalmente customizáveis e fontes exclusivas.' }
          ].map((item, i) => (
            <div key={i} className="flex gap-6 items-start group">
              <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:glow-red transition-all group-hover:bg-red-600 group-hover:text-white duration-500">
                <item.icon size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-red-500 transition-colors">{item.title}</h3>
                <p className="text-sm leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-8 border-t border-white/5">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
            Versão 3.5.0 Premium • Crafted with passion by kelvin lex
          </p>
        </div>
      </div>

    </div>
  );
}
