import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, RefreshCcw } from 'lucide-react';

const LoadingScreen = () => {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50">
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
      
      <div className="mt-8 text-center max-w-xs px-6">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Memuat Sistem ForsDig</h3>
        
        {showRetry ? (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
              Proses memuat memakan waktu lebih lama dari biasanya. Ini mungkin karena koneksi lambat atau masalah server.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
            >
              <RefreshCcw size={14} />
              Muat Ulang Sekarang
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
