import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User as UserIcon, Mail, LogIn, UserPlus, ShieldCheck, Store, Loader2, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

interface AuthProps {
  onLogin?: (user: UserProfile, isSignup?: boolean) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await login(email, password, fullName, phone, !isLogin);
      if (result.success) {
        if (result.message) {
          setSuccess(result.message);
        }
        if (onLogin) {
          // Backward compatibility if parent expects a callback
          onLogin({
            id: isFirebaseConfigured ? 'temp' : 'demo-user-id',
            username: isFirebaseConfigured ? email.split('@')[0] : 'demo_user',
            fullName: isFirebaseConfigured ? fullName : 'Demo Usaha',
            email: email || 'demo@forsdig.com',
            phone: phone || '08123456789',
            role: 'admin',
            balance: isFirebaseConfigured ? 0 : 1000000,
            subscriptionStatus: 'active',
            packageType: 'FREE',
            status: 'active',
            createdAt: Date.now()
          }, !isLogin);
        }
      } else {
        setError(result.message || 'Gagal memproses otentikasi. Periksa koneksi data Anda.');
      }
    } catch (err: any) {
      console.error('Auth error in component:', err);
      setError(err.message || 'Terjadi kesalahan sistem saat otentikasi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-[2rem] shadow-xl shadow-red-100 mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Smart POS</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Enterprise Retail Management</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {!isFirebaseConfigured && (
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-700 uppercase tracking-tight">Mode Demo Offline Aktif</p>
                <p className="text-[10px] font-bold text-amber-600/80 leading-tight mt-0.5">
                  Gunakan email dan password apa saja untuk masuk ke demo lokal. Seluruh transaksi & fitur Smart POS aktif penuh.
                </p>
              </div>
            </div>
          )}
          <div className="flex border-b border-slate-50">
            <button 
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Masuk
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleAuth} className="p-8 md:p-10 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={12} className="text-red-500" />
                        Nama Lengkap
                      </label>
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} className="text-red-500" />
                        Nomor Telepon
                      </label>
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08123456789"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} className="text-red-500" />
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Lock size={12} className="text-red-500" />
                    Password
                  </label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.p 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-bold text-red-500 text-center bg-red-50 py-3 rounded-xl border border-red-100"
              >
                {error}
              </motion.p>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 flex-shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-0.5">Pendaftaran Berhasil</p>
                  <p className="text-[10px] font-bold text-green-600 leading-tight">{success}</p>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-100 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                isLogin ? <LogIn size={18} /> : <UserPlus size={18} />
              )}
              {isLoading ? (isLogin ? 'Memproses...' : 'Mendaftar...') : (isLogin ? 'Masuk ke Sistem' : 'Buat Akun Baru')}
            </button>
          </form>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-green-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure Access Control Active</span>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-xs font-medium">
          © {new Date().getFullYear()} Smart POS System. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
