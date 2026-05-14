import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-50">
      <div className="relative">
        <motion.div
           animate={{
             scale: [1, 1.1, 1],
             rotate: [0, 5, -5, 0],
           }}
           transition={{
             duration: 2,
             repeat: Infinity,
             ease: "easeInOut"
           }}
           className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 z-10 relative"
        >
          <ShoppingBag size={48} className="text-red-500" />
        </motion.div>
        <div className="absolute -inset-4 bg-red-100/50 blur-2xl rounded-full -z-10 animate-pulse" />
      </div>
      
      <div className="mt-8 text-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Memuat Sistem ForsDig</h3>
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-1.5 h-1.5 bg-red-600 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
