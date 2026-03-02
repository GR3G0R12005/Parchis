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
    <div className="flex gap-4">
      {[0, 1].map((idx) => (
        <motion.div
          key={idx}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.9 } : {}}
          onClick={rollDice}
          className={cn(
            "w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white flex items-center justify-center cursor-pointer shadow-2xl relative overflow-hidden",
            disabled && "opacity-50 cursor-not-allowed grayscale",
            rolling && "animate-bounce"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-200" />
          <div className="relative grid grid-cols-3 grid-rows-3 gap-1 md:gap-2 p-3 md:p-4 w-full h-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
              const show = shouldShowDot(values[idx], i);
              return (
                <div key={i} className="flex items-center justify-center">
                  {show && <div className="w-2 h-2 md:w-3 md:h-3 bg-slate-900 rounded-full shadow-inner" />}
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
