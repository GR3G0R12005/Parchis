import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils';

interface DiceProps {
  onRoll: (values: [number, number]) => void;
  disabled?: boolean;
}

export const Dice: React.FC<DiceProps> = ({ onRoll, disabled }) => {
  const [rolling, setRolling] = useState(false);
  const [values, setValues] = useState<[number, number]>([1, 1]);

  const rollDice = () => {
    if (disabled || rolling) return;
    setRolling(true);

    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10, 30]);
    }

    let iterations = 0;
    const interval = setInterval(() => {
      setValues([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
      iterations++;
      if (iterations > 10) {
        clearInterval(interval);
        const finalValues: [number, number] = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ];
        setValues(finalValues);
        setRolling(false);
        onRoll(finalValues);
      }
    }, 50);
  };

  return (
    <div className="flex gap-2 bg-black/20 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
      {[0, 1].map((idx) => (
        <motion.div
          key={idx}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.9 } : {}}
          onClick={rollDice}
          className={cn(
            "w-12 h-12 md:w-16 md:h-16 rounded-xl bg-white flex items-center justify-center cursor-pointer shadow-lg relative overflow-hidden",
            disabled && "opacity-50 cursor-not-allowed",
            rolling && "animate-bounce"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-300" />
          {/* Bevel effect */}
          <div className="absolute inset-[2px] border border-white/50 rounded-[10px]" />

          <div className="relative grid grid-cols-3 grid-rows-3 gap-0.5 md:gap-1 p-2 md:p-3 w-full h-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
              const show = shouldShowDot(values[idx], i);
              return (
                <div key={i} className="flex items-center justify-center">
                  {show && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-700 rounded-full shadow-inner" />}
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

function shouldShowDot(value: number, index: number) {
  const dots: Record<number, number[]> = {
    1: [5],
    2: [3, 7],
    3: [3, 5, 7],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };
  return dots[value]?.includes(index);
}
