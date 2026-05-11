import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ForsDig POS] Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = (this as any).props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-4">Aplikasi Mengalami Kendala</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Maaf, sistem mendeteksi kegagalan runtime. Klik tombol di bawah untuk memuat ulang aplikasi.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
              >
                <RefreshCcw size={20} />
                Muat Ulang Sekarang
              </button>
              
              <button
                onClick={() => {
                  localStorage.removeItem('pos_user');
                  window.location.href = '/';
                }}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95"
              >
                <Home size={20} />
                Kembali ke Login
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <div className="mt-8 p-4 bg-slate-900 rounded-2xl text-left overflow-hidden">
                <p className="text-[10px] font-mono text-red-400 mb-2 font-bold uppercase tracking-widest">Error Detail (Dev Only):</p>
                <pre className="text-[9px] font-mono text-slate-400 overflow-auto max-h-40 whitespace-pre-wrap">
                  {error.toString()}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
