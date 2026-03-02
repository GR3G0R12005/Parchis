import React from 'react';
import { motion } from 'motion/react';
import { Coins, Gem, Trophy, Users } from 'lucide-react';

export const HUD: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 p-3 md:p-6 flex justify-between items-start pointer-events-none z-50">
      {/* Left: Player Profile & Stats */}
      <div className="flex gap-2 md:gap-4 pointer-events-auto">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="card-glass flex items-center gap-2 md:gap-4 py-1.5 px-3 md:py-2 md:px-4 border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
        >
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-primary to-orange-600 p-0.5 shadow-[0_0_20px_rgba(255,61,0,0.4)]">
            <div className="w-full h-full rounded-full border-2 border-white/20 overflow-hidden">
              <img src="https://picsum.photos/seed/player1/100/100" alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="font-heading text-xl md:text-2xl leading-none text-white drop-shadow-sm">EL_MAESTRO</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  className="h-full bg-primary shadow-[0_0_10px_#FF3D00]"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">LVL 42</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Center: Game Status / Timer */}
      <div className="absolute left-1/2 -translate-x-1/2 top-3 md:top-6 pointer-events-auto">
        <div className="card-glass py-1.5 px-4 md:py-2 md:px-8 flex flex-col items-center min-w-[120px]">
          <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden xs:block">Current Turn</div>
          <div className="font-heading text-lg md:text-2xl text-primary animate-pulse whitespace-nowrap">RED PLAYER</div>
        </div>
      </div>

      {/* Right: Currencies */}
      <div className="flex flex-col gap-2 md:gap-3 pointer-events-auto items-end">
        <CurrencyItem icon={<Coins className="w-3 h-3 md:w-4 md:h-4 text-accent" />} value="12,450" color="text-accent" />
        <CurrencyItem icon={<Gem className="w-3 h-3 md:w-4 md:h-4 text-secondary" />} value="420" color="text-secondary" />
      </div>
    </div>
  );
};

const CurrencyItem: React.FC<{ icon: React.ReactNode; value: string; color: string }> = ({ icon, value, color }) => (
  <motion.div 
    whileHover={{ scale: 1.05, x: -5 }}
    className="card-glass py-1 px-2 md:py-2 md:px-4 flex items-center gap-2 md:gap-3 min-w-[80px] md:min-w-[120px] justify-between cursor-pointer"
  >
    <div className="flex items-center gap-1.5 md:gap-2">
      {icon}
      <span className={cn("font-bold text-[10px] md:text-sm", color)}>{value}</span>
    </div>
    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">+</div>
  </motion.div>
);

import { cn } from '../utils';
