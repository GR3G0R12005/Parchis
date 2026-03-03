import React from 'react';
import { motion } from 'motion/react';
import { Menu, Users, Trophy, Coins, ShoppingCart, MessageCircle, Smile, User } from 'lucide-react';
import { cn } from '../utils';

export const HUD: React.FC<{
  view?: 'lobby' | 'game';
  onShopClick?: () => void;
  onProfileClick?: () => void;
  user?: any
}> = ({ view = 'game', onShopClick, onProfileClick, user }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 p-4 md:p-6 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full">
        {/* Top Left Profile Trigger (Lobby Only) */}
        {view === 'lobby' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onProfileClick}
            className="pointer-events-auto bg-black/30 backdrop-blur-md rounded-[2rem] p-1.5 border border-white/10 cursor-pointer hover:bg-black/40 transition-all group"
          >
            <div className="w-14 h-14 rounded-[1.6rem] overflow-hidden border-2 border-white/20">
              <img src={user?.avatar || "https://picsum.photos/seed/me/100/100"} alt="profile" className="w-full h-full object-cover" />
            </div>
          </motion.button>
        )}

        {/* Space filler if not lobby */}
        {view !== 'lobby' && <div />}

        {/* Top Right Currency */}
        <div
          onClick={onShopClick}
          className="flex gap-2 pointer-events-auto items-center bg-black/30 backdrop-blur-md rounded-full pl-2 pr-1 py-1 border border-white/20 cursor-pointer hover:bg-black/40 transition-all group"
        >
          <div className="bg-yellow-500 rounded-full p-1.5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Coins className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-bold text-white px-2 tracking-tight">{user?.coins?.toLocaleString() || '0'}</span>
          <div className="bg-white/10 rounded-full p-2 group-hover:bg-white/20 transition-all">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Middle: Avatars in corners - Only in Game View */}
      {view === 'game' && (
        <div className="absolute inset-0 pointer-events-none p-4 md:p-10">
          {/* Top Left Avatar (Current Player) */}
          <div className="absolute top-24 left-4 md:left-10 pointer-events-auto">
            <button onClick={onProfileClick} className="group transition-transform hover:scale-105 active:scale-95">
              <Avatar name={user?.username || "You"} image={user?.avatar || "https://picsum.photos/seed/me/100/100"} active />
            </button>
          </div>
          {/* Top Right Avatar */}
          <div className="absolute top-24 right-4 md:right-10 pointer-events-auto">
            <Avatar name="Guest7064" image="https://picsum.photos/seed/p2/100/100" />
          </div>
          {/* Bottom Left Avatar */}
          <div className="absolute bottom-32 left-4 md:left-10 pointer-events-auto">
            <Avatar name="afsaar" image="https://picsum.photos/seed/p3/100/100" active />
          </div>
          {/* Bottom Right Avatar */}
          <div className="absolute bottom-32 right-4 md:right-10 pointer-events-auto">
            <Avatar name="Qúû Eén" image="https://picsum.photos/seed/p4/100/100" />
          </div>
        </div>
      )}
    </div>
  );
};

const IconButton: React.FC<{ icon: React.ReactNode; className?: string }> = ({ icon, className }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={cn(
      "bg-black/40 backdrop-blur-md text-white p-3 rounded-xl border border-white/10 shadow-lg flex items-center justify-center",
      className
    )}
  >
    {icon}
  </motion.button>
);

const ActionButton: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="bg-black/50 backdrop-blur-lg text-white font-heading text-xl md:text-2xl px-8 py-3 rounded-full border border-white/20 shadow-xl flex items-center gap-3 tracking-widest"
  >
    {label}
  </motion.button>
);

const Avatar: React.FC<{ name: string; image: string; active?: boolean }> = ({ name, image, active }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={cn(
      "w-20 h-20 rounded-full p-1 relative",
      active ? "bg-green-500 shadow-[0_0_20px_rgba(76,175,80,0.6)]" : "bg-white/20"
    )}>
      <div className="w-full h-full rounded-full border-4 border-white overflow-hidden shadow-inner bg-slate-800">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      {active && (
        <div className="absolute -top-1 -right-1 bg-yellow-400 p-1 rounded-lg shadow-md border-2 border-white">
          <ShoppingCart className="w-3 h-3 text-slate-900" />
        </div>
      )}
    </div>
    <span className="text-white font-bold text-sm drop-shadow-md bg-black/20 px-2 py-0.5 rounded-full">{name}</span>
  </div>
);
