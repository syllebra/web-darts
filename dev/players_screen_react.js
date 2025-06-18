import React, { useState } from 'react';
import { Plus, Trash2, Gamepad2, Users, Play } from 'lucide-react';

const PlayerSelectMenu = () => {
  const [players, setPlayers] = useState([
    { id: 1, name: 'MARIO', color: '#ff4444', icon: '🍄' },
    { id: 2, name: 'LUIGI', color: '#44ff44', icon: '⭐' },
    { id: 3, name: 'PEACH', color: '#ff69b4', icon: '👑' },
    { id: 4, name: 'TOAD', color: '#4169e1', icon: '🎯' }
  ]);

  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);

  const predefinedColors = [
    '#ff4444', '#44ff44', '#4444ff', '#ffff44',
    '#ff44ff', '#44ffff', '#ff8844', '#8844ff',
    '#ff4488', '#88ff44', '#4488ff', '#ffaa44'
  ];

  const availableIcons = ['🍄', '⭐', '👑', '🎯', '🔥', '⚡', '💎', '🎮', '🚀', '🎪', '🎨', '🎭'];

  const addPlayer = () => {
    const newId = Math.max(...players.map(p => p.id)) + 1;
    const newPlayer = {
      id: newId,
      name: `PLAYER ${newId}`,
      color: predefinedColors[Math.floor(Math.random() * predefinedColors.length)],
      icon: availableIcons[Math.floor(Math.random() * availableIcons.length)]
    };
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id) => {
    if (players.length > 1) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const updatePlayer = (id, field, value) => {
    setPlayers(players.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const PlayerCard = ({ player, index }) => (
    <div className="relative group">
      <div 
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 
                   shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105
                   hover:bg-white/15 cursor-pointer transform hover:-translate-y-1"
        style={{ borderColor: player.color + '40' }}
      >
        {/* Player Number */}
        <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gradient-to-br 
                        from-white/30 to-white/10 border border-white/40 flex items-center 
                        justify-center text-sm font-bold text-white shadow-lg"
             style={{ 
               backgroundColor: player.color + '60',
               borderColor: player.color + '80',
               textShadow: `0 0 5px ${player.color}` 
             }}>
          {index + 1}
        </div>
        {/* Player Icon */}
        <div 
          className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl
                     bg-gradient-to-br from-white/20 to-white/5 border border-white/30
                     shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{ 
            boxShadow: `0 0 20px ${player.color}40, inset 0 0 20px ${player.color}20`
          }}
          onClick={() => setEditingPlayer(editingPlayer === player.id ? null : player.id)}
        >
          {player.icon}
        </div>

        {/* Player Name */}
        {editingPlayer === player.id ? (
          <input
            type="text"
            value={player.name}
            onChange={(e) => updatePlayer(player.id, 'name', e.target.value.toUpperCase())}
            onBlur={() => setEditingPlayer(null)}
            onKeyPress={(e) => e.key === 'Enter' && setEditingPlayer(null)}
            className="w-full text-center text-xl font-bold bg-transparent border-b-2 
                       border-white/50 text-white outline-none mb-4 pb-1"
            style={{ borderColor: player.color }}
            autoFocus
          />
        ) : (
          <h3 
            className="text-xl font-bold text-center mb-4 cursor-pointer hover:scale-105 
                       transition-transform duration-200"
            style={{ color: player.color, textShadow: `0 0 10px ${player.color}80` }}
            onClick={() => setEditingPlayer(player.id)}
          >
            {player.name}
          </h3>
        )}

        {/* Color Picker */}
        <div className="flex justify-center mb-4">
          <div
            className="w-8 h-8 rounded-full border-2 border-white/50 cursor-pointer
                       hover:scale-110 transition-transform duration-200 shadow-lg"
            style={{ backgroundColor: player.color }}
            onClick={() => setShowColorPicker(showColorPicker === player.id ? null : player.id)}
          />
        </div>

        {showColorPicker === player.id && (
          <div className="absolute z-20 top-full left-1/2 transform -translate-x-1/2 mt-2">
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {predefinedColors.map(color => (
                  <div
                    key={color}
                    className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 
                               transition-transform duration-200 border-2 border-white/30"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      updatePlayer(player.id, 'color', color);
                      setShowColorPicker(null);
                    }}
                  />
                ))}
              </div>
              <div className="text-center">
                <button
                  onClick={() => setShowColorPicker(null)}
                  className="text-white/80 text-sm hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Icon Selector */}
        {editingPlayer === player.id && (
          <div className="absolute z-10 top-full left-0 right-0 mt-2">
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                {availableIcons.map(icon => (
                  <div
                    key={icon}
                    className="w-10 h-10 flex items-center justify-center text-2xl
                               bg-white/10 rounded-lg cursor-pointer hover:bg-white/20
                               transition-all duration-200 hover:scale-110"
                    onClick={() => updatePlayer(player.id, 'icon', icon)}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Remove Button */}
        {players.length > 1 && (
          <button
            onClick={() => removePlayer(player.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                       w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full
                       flex items-center justify-center transition-all duration-300
                       hover:scale-110 shadow-lg"
          >
            <Trash2 size={16} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 
                    flex flex-col relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br 
                        from-cyan-400/10 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl 
                        from-pink-400/10 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center py-8 px-4">
        <div className="inline-block bg-black/40 backdrop-blur-md rounded-2xl px-8 py-4 
                        border border-white/20 shadow-2xl">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 
                         to-pink-400 bg-clip-text text-transparent mb-2
                         animate-pulse">
            PLAYER SELECT
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/80">
            <Users size={20} />
            <span className="text-lg">{players.length} Player{players.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="flex-1 px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 
                          gap-6 mb-8">
            {players.map((player, index) => (
              <PlayerCard key={player.id} player={player} index={index} />
            ))}
            
            {/* Add Player Button */}
            <div
              onClick={addPlayer}
              className="bg-white/5 backdrop-blur-md border-2 border-dashed border-white/30 
                         rounded-2xl p-6 flex flex-col items-center justify-center
                         hover:bg-white/10 hover:border-white/50 cursor-pointer
                         transition-all duration-300 hover:scale-105 group min-h-[200px]"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 
                              border border-white/30 flex items-center justify-center mb-4
                              group-hover:scale-110 transition-transform duration-300">
                <Plus size={32} className="text-white/80" />
              </div>
              <span className="text-white/80 font-bold text-lg">ADD PLAYER</span>
            </div>
          </div>

          {/* Start Game Button */}
          <div className="text-center">
            <button className="bg-gradient-to-r from-green-500 to-emerald-500 
                             hover:from-green-400 hover:to-emerald-400
                             text-white font-bold text-xl px-12 py-4 rounded-2xl
                             shadow-2xl hover:shadow-green-500/25 transition-all duration-300
                             hover:scale-105 hover:-translate-y-1 border border-green-400/50
                             backdrop-blur-md flex items-center gap-3 mx-auto">
              <Play size={24} />
              START GAME
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-4 px-4">
        <div className="text-white/60 flex items-center justify-center gap-2">
          <Gamepad2 size={16} />
          <span className="text-sm">Click player icons to customize • Tap colors to change</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerSelectMenu;