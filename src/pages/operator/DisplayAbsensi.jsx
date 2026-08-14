import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function DisplayAbsensi() {
  const { profile } = useAuth();
  
  // Security State Guard (Masuk Menu)
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinSekolah, setPinSekolah] = useState('1234'); 
  const [loadingPin, setLoadingPin] = useState(true);

  // Security State Guard (Keluar Menu)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitPinInput, setExitPinInput] = useState('');
  const [exitPinError, setExitPinError] = useState(false);

  // UI Navigation & Log State
  const [activeTab, setActiveTab] = useState('rfid'); 
  const [logAbsen, setLogAbsen] = useState([]);
  const [latestAbsen, setLatestAbsen] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Perangkat Kamera Ref
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null); 

  // 1. Ambil PIN khusus instansi sekolah dari database Supabase
  useEffect(() => {
    const fetchPinSekolah = async () => {
      if (!profile?.sekolah_id) return;
      try {
        setLoadingPin(true);
        const { data, error } = await supabase
          .from('sekolahs')
          .select('pin_display')
          .eq('id', profile.sekolah_id)
          .single();
        
        if (error) throw error;
        if (data && data.pin_display) {
          setPinSekolah(data.pin_display);
        }
      } catch (err) {
        console.error("Gagal memuat PIN operasional gate dari DB:", err);
      } finally {
        setLoadingPin(false);
      }
    };

    fetchPinSekolah();
  }, [profile]);

  // 2. Logika Verifikasi Input PIN Keamanan (Buka Menu Awal)
  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === pinSekolah) {
      setIsLocked(false);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  // 3. Logika Verifikasi PIN Saat Ingin Keluar Menu (Tutup Session)
  const handleVerifyExit = (e) => {
    e.preventDefault();
    if (exitPinInput === pinSekolah) {
      setExitPinError(false);
      setExitPinInput('');
      setIsExitModalOpen(false);
      
      // Jika lolos verifikasi, matikan session dan tendang balik ke dashboard
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsLocked(true);
    } else {
      setExitPinError(true);
    }
  };

  // 4. Kontrol Manual Mode Fullscreen HTML5 API
  const toggleFullscreenManual = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => alert(`Gagal masuk mode fullscreen: ${err.message}`));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 5. Kontrol Aliran Video Kamera Gate
  const startFaceCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Gagal memuat webcam monitor gate:", err);
    }
  };

  const stopFaceCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (!isLocked && (activeTab === 'face' || activeTab === 'split')) {
      startFaceCamera();
    } else {
      stopFaceCamera();
    }
    return () => stopFaceCamera();
  }, [isLocked, activeTab]);

  // 6. Simulasi Aliran Log Masuk Absensi Gerbang
  useEffect(() => {
    if (isLocked || !profile?.sekolah_id) return;

    const interval = setInterval(() => {
      const dummyNames = ["Rian Hidayat", "Siti Aminah", "Budi Santoso", "Rinda Amalia", "Fahmi Idris"];
      const dummyTypes = ["Siswa", "Siswa", "Pegawai", "Siswa", "Pegawai"];
      const randomIdx = Math.floor(Math.random() * dummyNames.length);
      
      const newLog = {
        nama: dummyNames[randomIdx],
        tipe: dummyTypes[randomIdx],
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        metode: Math.random() > 0.5 ? 'RFID' : 'FACE AI',
        status: 'HADIR MASUK'
      };

      setLatestAbsen(newLog);
      setLogAbsen(prev => [newLog, ...prev.slice(0, 4)]); 
    }, 5000); 

    return () => clearInterval(interval);
  }, [isLocked, profile]);

  // --- VIEW LEVEL 1: DIALOG KUNCI PIN MASUK AWAL ---
  if (isLocked) {
    return (
      <div className="w-full py-16 flex items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-sm w-full text-center space-y-5">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-xl mx-auto font-bold">🔒</div>
          <div>
            <h2 className="text-lg font-black text-black">Otorisasi Monitor Absensi</h2>
            <p className="text-xs text-gray-400 mt-1">Masukkan PIN institusi operator sekolah untuk mengaktifkan monitor display gerbang.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password" 
              maxLength={6} 
              disabled={loadingPin}
              placeholder={loadingPin ? "Sinkronisasi PIN..." : "Masukkan PIN Gerbang"}
              value={pinInput} 
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono font-bold text-black outline-none focus:border-skoola-teal disabled:opacity-50"
            />
            {pinError && <p className="text-xs text-red-500 font-bold">⚠️ PIN Salah! Akses otorisasi ditolak.</p>}
            <button 
              type="submit" 
              disabled={loadingPin}
              className="w-full py-3 bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-skoola-teal border-none transition-all cursor-pointer disabled:opacity-50"
            >
              Buka Monitor Display
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW LEVEL 2: DASHBOARD CORE MONITOR ABSENSI ---
  return (
    <div 
      ref={containerRef} 
      className={`w-full font-sans flex flex-col rounded-2xl border transition-all duration-300 relative ${
        isFullscreen ? 'bg-slate-950 p-10 border-none text-white' : 'bg-white p-6 border-gray-100 text-black'
      }`}
    >
      {/* HEADER CONTROL PANEL AREA */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-5 mb-6 gap-4 ${
        isFullscreen ? 'border-white/10' : 'border-gray-100'
      }`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`px-3 py-1.5 text-xs font-black rounded-xl tracking-wider ${
            isFullscreen ? 'bg-teal-500/20 text-skoola-teal' : 'bg-black text-white'
          }`}>
            LIVE GATE MONITORING
          </span>
          
          <div className={`flex p-1 rounded-xl text-xs font-bold border ${
            isFullscreen ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'
          }`}>
            <button onClick={() => setActiveTab('rfid')} className={`px-4 py-2 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${activeTab === 'rfid' ? 'bg-white text-black shadow-xs' : 'text-gray-400 bg-transparent'}`}>💳 RFID</button>
            <button onClick={() => setActiveTab('face')} className={`px-4 py-2 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${activeTab === 'face' ? 'bg-white text-black shadow-xs' : 'text-gray-400 bg-transparent'}`}>📸 Face AI</button>
            <button onClick={() => setActiveTab('split')} className={`px-4 py-2 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${activeTab === 'split' ? 'bg-white text-black shadow-xs' : 'text-gray-400 bg-transparent'}`}>🌓 Split Dual</button>
          </div>
        </div>

        {/* TOMBOL ACTIONS ACTIONS CONTROL */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={toggleFullscreenManual}
            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isFullscreen ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {isFullscreen ? '🗗 Keluar Fullscreen' : '🖥️ Mode Fullscreen TV'}
          </button>
          
          {/* HIDE TOMBOL KELUAR PADA SAAT FULLSCREEN */}
          <button 
            onClick={() => setIsExitModalOpen(true)}
            className={`px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all cursor-pointer ${
              isFullscreen ? 'hidden' : 'block'
            }`}
          >
            Keluar Display Menu
          </button>
        </div>
      </div>

      {/* STRUKTUR GRID WORKSPACE (8 : 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* PANEL KIRI: MONITOR DEVICE SCANNER (8 KOLOM) */}
        <div className="lg:col-span-8 flex flex-col gap-6 justify-between">
          
          {activeTab === 'rfid' && (
            <div className={`flex-1 min-h-[350px] rounded-3xl border flex flex-col items-center justify-center text-center p-8 transition-all ${
              isFullscreen ? 'bg-slate-900 border-white/10' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="text-7xl animate-pulse mb-4">💳</div>
              <h2 className="text-3xl font-black uppercase tracking-wide">Silakan Tempel Kartu RFID</h2>
              <p className="text-gray-400 mt-2 text-sm max-w-sm">Dekatkan kartu contactless murid pada sensor kotak pemindai gerbang.</p>
            </div>
          )}

          {activeTab === 'face' && (
            <div className="flex-1 bg-black rounded-3xl border border-gray-800 overflow-hidden relative flex items-center justify-center min-h-[350px]">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute inset-0 border-4 border-dashed border-skoola-teal/30 m-8 rounded-2xl pointer-events-none animate-pulse flex items-center justify-center">
                <div className="text-xs bg-skoola-teal text-black px-3 py-1 rounded-md font-black tracking-widest uppercase absolute top-4">MEMINDAI WAJAH...</div>
              </div>
            </div>
          )}

          {activeTab === 'split' && (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 min-h-[350px]">
              <div className={`rounded-3xl border flex flex-col items-center justify-center text-center p-6 ${
                isFullscreen ? 'bg-slate-900 border-white/10' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="text-5xl animate-bounce mb-3">💳</div>
                <h3 className="text-base font-black uppercase tracking-wider">TAP KARTU RFID</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[180px]">Tempel kartu absensi pada mesin sensor</p>
              </div>
              <div className="bg-black rounded-3xl border border-gray-800 overflow-hidden relative">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 border-2 border-dashed border-skoola-teal/20 m-5 rounded-xl pointer-events-none" />
              </div>
            </div>
          )}

          {/* TOAST POP-UP PRESENSI */}
          {latestAbsen && (
            <div className={`p-6 rounded-3xl border flex items-center gap-6 animate-scaleUp shadow-md ${
              isFullscreen ? 'bg-emerald-950/90 border-emerald-500/30' : 'bg-green-50 border-green-200'
            }`}>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl text-black font-bold shadow-xs">👤</div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">{latestAbsen.tipe}</span>
                  <span className="text-xs text-emerald-600 font-mono font-bold">Sistem Verifikasi: {latestAbsen.metode}</span>
                </div>
                <h2 className={`text-2xl font-black mt-1 uppercase tracking-wide ${isFullscreen ? 'text-white' : 'text-black'}`}>{latestAbsen.nama}</h2>
                <p className="text-xs text-gray-400 mt-1">Sukses Tercatat Pada Pukul: <span className="font-mono font-bold text-skoola-teal underline text-sm">{latestAbsen.waktu}</span></p>
              </div>
              <div className="text-right">
                <span className="text-sm bg-black text-white px-4 py-2 rounded-xl font-black block tracking-wider shadow-xs">{latestAbsen.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* PANEL KANAN: JURNAL LOG ANTREAN (4 KOLOM) */}
        <div className={`rounded-3xl border p-6 flex flex-col min-h-[400px] lg:col-span-4 transition-all ${
          isFullscreen ? 'bg-slate-900/50 border-white/10' : 'bg-gray-50/60 border-gray-200'
        }`}>
          <div className="mb-5 text-left border-b pb-3 border-gray-200/20">
            <h3 className="text-sm font-black tracking-wider uppercase text-gray-400">📋 Jurnal Antrean Masuk</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Daftar tap kehadiran pintu gerbang hari ini.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {logAbsen.length === 0 ? (
              <div className="text-center py-24 text-xs text-gray-400 italic">Menunggu pemindaian perdana...</div>
            ) : (
              logAbsen.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    isFullscreen 
                      ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                      : 'bg-white border-gray-100 shadow-2xs hover:border-skoola-teal'
                  }`}
                >
                  <div className="space-y-1">
                    <div className={`font-black text-sm tracking-wide ${isFullscreen ? 'text-white' : 'text-black'}`}>
                      {log.nama}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-2 font-semibold">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                        log.tipe === 'Siswa' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>{log.tipe}</span>
                      <span>•</span>
                      <span className="font-mono text-skoola-teal uppercase">{log.metode}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${
                      isFullscreen ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {log.waktu}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* POP-UP MODAL PROTEKSI PIN UNTUK KELUAR MENU DISPLAY */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl max-w-sm w-full text-center space-y-4">
            <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-lg mx-auto font-bold">⚠️</div>
            <div>
              <h3 className="text-base font-black text-black">Tutup Sesi Monitor Gate</h3>
              <p className="text-xs text-gray-400 mt-1">Masukkan PIN keamanan institusi sekolah untuk memverifikasi penutupan layar display.</p>
            </div>
            
            <form onSubmit={handleVerifyExit} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                required
                placeholder="Masukkan PIN Konfirmasi"
                value={exitPinInput}
                onChange={(e) => setExitPinInput(e.target.value)}
                className="w-full text-center py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono font-bold text-black outline-none focus:border-skoola-teal"
              />
              {exitPinError && <p className="text-xs text-red-500 font-bold">⚠️ PIN Salah! Sesi gagal ditutup.</p>}
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsExitModalOpen(false); setExitPinError(false); setExitPinInput(''); }}
                  className="w-1/2 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 border-none transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-black text-white font-bold rounded-xl text-xs hover:bg-red-600 border-none transition-all cursor-pointer"
                >
                  Konfirmasi Keluar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}