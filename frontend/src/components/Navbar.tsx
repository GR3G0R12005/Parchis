import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, ShoppingBag, Trophy, Settings, MessageCircle, User } from 'lucide-react';
import { cn } from '../utils';

interface NavbarProps {
  active: string;
  onChange: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ active, onChange }) => {
  const items = [
    { id: 'home', icon: Home, label: 'Lobby' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'shop', icon: ShoppingBag, label: 'Store' },
    { id: 'rank', icon: Trophy, label: 'Ranks' },
    { id: 'social', icon: MessageCircle, label: 'Social' },
    { id: 'settings', icon: Settings, label: 'Menu' },
  ];

  return (
    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-lg">
      <div className="bg-black/40 backdrop-blur-2xl flex items-center justify-around md:justify-center gap-2 md:gap-4 p-2 md:p-3 px-4 md:px-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10 rounded-[2.5rem]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onChange(item.id)}
              whileHover={{ scale: 1.15, y: -5 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative p-3 md:p-4 rounded-2xl md:rounded-3xl transition-all duration-300 group",
                isActive ? "bg-white/10 text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)]" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon className={cn("w-6 h-6 md:w-7 md:h-7 transition-all", isActive && "drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-110")} />

              <AnimatePresence>
                {isActive && (
                  <>
                    <motion.div
                      layoutId="nav-active-glow"
                      className="absolute inset-0 bg-white/10 blur-xl rounded-full -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]"
                      initial={{ width: 0 }}
                      animate={{ width: 24 }}
                    />
                  </>
                )}
              </AnimatePresence>

              <span className={cn(
                "absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest border border-white/10",
                isActive && "opacity-100"
              )}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
