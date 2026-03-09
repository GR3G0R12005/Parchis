import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CustomizationSettings, customizationService } from '../services/customizationService';
import { cn } from '../utils';
import { Palette, Gem, Zap, Crown, Sword, Star } from 'lucide-react';

interface CustomizationModalProps {
  onSave: (settings: CustomizationSettings) => void;
  initialSettings: CustomizationSettings;
}

const boardThemes = [
  { id: 'classic' as const, name: 'Classic', icon: Palette, description: 'Original Parchís board' },
  { id: 'neon' as const, name: 'Neon', icon: Zap, description: 'Futuristic neon aesthetic' },
  { id: 'vintage' as const, name: 'Vintage', icon: Crown, description: 'Retro board style' },
  { id: 'royal' as const, name: 'Royal', icon: Crown, description: 'Elegant royal design' },
];

const tokenStyles = [
  { id: 'classic' as const, name: 'Classic', icon: Palette, description: 'Traditional colorful tokens' },
  { id: 'gems' as const, name: 'Gems', icon: Gem, description: 'Shimmering gem tokens' },
  { id: 'medieval' as const, name: 'Medieval', icon: Sword, description: 'Ancient knight pieces' },
  { id: 'cosmic' as const, name: 'Cosmic', icon: Star, description: 'Space-themed tokens' },
];

export const CustomizationModal: React.FC<CustomizationModalProps> = ({ onSave, initialSettings }) => {
  const [settings, setSettings] = useState<CustomizationSettings>(initialSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    customizationService.saveSettings(settings);
    onSave(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* BOARD THEME SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-bold text-lg uppercase tracking-widest">Board Theme</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {boardThemes.map((theme) => {
            const Icon = theme.icon;
            const isSelected = settings.boardTheme === theme.id;
            return (
              <motion.button
                key={theme.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSettings({ ...settings, boardTheme: theme.id })}
                className={cn(
                  'p-4 rounded-2xl border-2 transition-all text-left group',
                  isSelected
                    ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-6 h-6 mt-1', isSelected ? 'text-blue-400' : 'text-white/50')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{theme.name}</p>
                    <p className="text-white/50 text-xs">{theme.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Board Preview */}
        <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-2">Preview</p>
          <div className="w-full h-32 bg-black/30 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
            <img
              src={customizationService.getBoardUrl(settings.boardTheme)}
              alt="Board preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = customizationService.getBoardUrl('classic');
              }}
            />
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="border-t border-white/10" />

      {/* TOKEN STYLE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-bold text-lg uppercase tracking-widest">Token Style</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tokenStyles.map((style) => {
            const Icon = style.icon;
            const isSelected = settings.tokenStyle === style.id;
            return (
              <motion.button
                key={style.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSettings({ ...settings, tokenStyle: style.id })}
                className={cn(
                  'p-4 rounded-2xl border-2 transition-all text-left group',
                  isSelected
                    ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-6 h-6 mt-1', isSelected ? 'text-purple-400' : 'text-white/50')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{style.name}</p>
                    <p className="text-white/50 text-xs">{style.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Token Preview */}
        <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-2">Token Preview</p>
          <div className="w-full h-20 bg-black/30 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center gap-4">
            {(['red', 'yellow', 'green', 'blue'] as const).map((color) => (
              <div key={color} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-8 h-8 rounded-full border-2 shadow-lg',
                  {
                    'bg-gradient-to-br from-[#FF80AB] via-[#FF4081] to-[#C2185B] border-[#880E4F]': color === 'red',
                    'bg-gradient-to-br from-[#FFF176] via-[#FFEB3B] to-[#FBC02D] border-[#F57F17]': color === 'yellow',
                    'bg-gradient-to-br from-[#B9F6CA] via-[#00E676] to-[#388E3C] border-[#1B5E20]': color === 'green',
                    'bg-gradient-to-br from-[#82B1FF] via-[#448AFF] to-[#1976D2] border-[#0D47A1]': color === 'blue',
                  }
                )} />
                <span className="text-[8px] text-white/50">{color[0].toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
      >
        {saved ? '✓ Saved!' : 'Save Customization'}
      </motion.button>
    </div>
  );
};
