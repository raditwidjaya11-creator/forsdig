import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, RefreshCw, AlertTriangle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<string>('');

  // Sinyal Bip Sukses Scan Kamera
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1250, audioCtx.currentTime); // High pitch beef
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // 100ms
    } catch (err) {
      console.warn("Audio Context blocked by browser permission.", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const elementId = "camera-scanner-reader";
    const scanner = new Html5Qrcode(elementId);
    html5QrCodeRef.current = scanner;

    const startScanner = async () => {
      try {
        // Atur parameter pemindaian yang dioptimalkan untuk barcode 1D (EAN/UPC) pada Android
        const config = {
          fps: 15,
          qrbox: (videoWidth: number, videoHeight: number) => {
            // Rentang box melebar horizontal untuk barcode tradisional
            const width = Math.min(videoWidth * 0.85, 340);
            const height = Math.min(videoHeight * 0.35, 140);
            return { width, height };
          },
          aspectRatio: 1.333333,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        };

        // Pilihi mode kamera belakang ('environment' default untuk Android)
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isMounted) return;
            
            // Cegah pemindaian berulang instan dari kode yang sama persis dalam 1.5 detik
            if (decodedText === lastScanResult) {
              return;
            }
            
            setLastScanResult(decodedText);
            playBeep();
            onScan(decodedText);
            
            setTimeout(() => {
              if (isMounted) setLastScanResult('');
            }, 1500);
          },
          () => {
            // Abaikan error parse standar agar tidak meluber di log
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setHasPermission(true);
        }

        // Cari daftar perangkat kamera yang tersedia untuk opsi beralih kamera
        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMounted && devices && devices.length > 0) {
            setCameras(devices);
            // Default active adalah kamera default yang sedang kita gunakan
            setSelectedCameraId(devices[0].id);
          }
        } catch (e) {
          console.warn("Gagal membaca daftar kamera.", e);
        }

      } catch (err: any) {
        console.error("Gagal memulai scanner:", err);
        if (isMounted) {
          setIsScanning(false);
          setHasPermission(false);
        }
      }
    };

    // Timeout kecil menjamin div penampung selesai dibuat di DOM
    const timer = setTimeout(() => {
      startScanner();
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(err => {
          console.warn("Gagal menghentikan scanner kamera pada unmount:", err);
        });
      }
    };
  }, [isOpen, onScan]);

  // Handle beralih kamera pilihan jika perangkat Android memiliki multi-lensa belakang
  const handleCameraChange = async (cameraId: string) => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      setIsScanning(false);
      setSelectedCameraId(cameraId);

      const config = {
        fps: 15,
        qrbox: (videoWidth: number, videoHeight: number) => {
          const width = Math.min(videoWidth * 0.85, 340);
          const height = Math.min(videoHeight * 0.35, 140);
          return { width, height };
        },
        aspectRatio: 1.333333,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      };

      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          playBeep();
          onScan(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Gagal beralih kamera:", err);
      toast.error("Tidak dapat membuka lensa kamera yang dipilih.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <style>{`
            @keyframes laser-sweep {
              0% { top: 6%; }
              50% { top: 94%; }
              100% { top: 6%; }
            }
            .laser-line {
              animation: laser-sweep 2.2s infinite linear;
            }
            #camera-scanner-reader video {
              width: 100% !important;
              height: auto !important;
              border-radius: 1rem;
              object-fit: cover !important;
            }
          `}</style>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-black tracking-widest rounded-md uppercase animate-pulse">
                  Live Camera
                </span>
                <span className="text-sm font-black tracking-wider text-slate-100 uppercase">Scanner Android</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-750 rounded-full transition-all text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Scanner Area */}
            <div className="p-5">
              <div className="relative overflow-hidden rounded-2xl bg-black border border-slate-800 aspect-[4/3] flex items-center justify-center">
                {/* ID Div tempat HTML5Qrcode me-mount elemen video */}
                <div id="camera-scanner-reader" className="w-full h-full"></div>

                {/* Laser Overlay hanya muncul saat terhubung / sedang scanning */}
                {isScanning && hasPermission && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                    <div className="w-[300px] h-[120px] border-[2.5px] border-amber-500/75 rounded-2xl relative flex items-center justify-center overflow-hidden bg-transparent shadow-[0_0_20px_rgba(0,0,0,0.6)]">
                      {/* Gantungan Sudut Glowing */}
                      <span className="absolute top-0 left-0 w-4 h-4 border-t-[3.5px] border-l-[3.5px] border-amber-400 rounded-tl pointer-events-none" />
                      <span className="absolute top-0 right-0 w-4 h-4 border-t-[3.5px] border-r-[3.5px] border-amber-400 rounded-tr pointer-events-none" />
                      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-[3.5px] border-l-[3.5px] border-amber-400 rounded-bl pointer-events-none" />
                      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-[3.5px] border-r-[3.5px] border-amber-400 rounded-br pointer-events-none" />

                      {/* Laser Merah/Kuning Sweep Animasi */}
                      <div className="laser-line w-full h-[2.5px] bg-amber-400 absolute shadow-[0_0_12px_rgba(245,158,11,0.9)] opacity-90" />
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {!isScanning && hasPermission !== false && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3.5" />
                    <p className="text-xs font-black tracking-wider uppercase text-slate-300">Menghubungkan Lensa Kamera...</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">Pastikan Anda mengizinkan akses kamera jika browser Android memintanya.</p>
                  </div>
                )}

                {/* Permission Denied / Error state */}
                {hasPermission === false && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 border border-slate-900 rounded-2xl p-6 text-center z-20">
                    <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 mb-3">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black tracking-wider uppercase text-red-400 leading-tight">Izin Kamera Ditolak / Bermasalah</p>
                    <p className="text-[10px] text-slate-400 mt-2 max-w-[280px] leading-relaxed">
                      Layanan Smart POS tidak bisa membaca barcode melalui Android tanpa izin kamera. 
                    </p>
                    <div className="mt-4 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-[9.5px] text-slate-400 text-left">
                      💡 <b>Cara Mengizinkan di Android:</b>
                      <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                        <li>Ketuk ikon <b>Gembok/Setting</b> di sebelah kiri alamat web browser Chrome/Samsung.</li>
                        <li>Ubah status izin <b>Kamera</b> ke <b>"Izinkan" / "Allowed"</b>.</li>
                        <li>Muat ulang (refresh) halaman kasir ini.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Switcher Only if Multiple Lenses Found */}
              {cameras.length > 1 && (
                <div className="mt-4 flex items-center justify-between gap-2.5 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/60">
                  <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Pilihan Lensa:
                  </span>
                  
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="bg-slate-900 border border-slate-750 text-slate-200 text-[11px] font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 max-w-[190px] truncate"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Lensa Belakang ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Extra scanning guidance */}
              <div className="mt-4 text-center">
                <p className="text-[10.5px] font-medium text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Dekatkan barcode produk pas di garis kuning. Nyalakan senter (flash) smartphone Anda jika kondisi ruko sedang redup.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

