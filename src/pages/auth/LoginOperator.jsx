import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

export default function LoginOperator() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Strategi LOGIN USERNAME: Gabungkan dengan domain virtual SkoolaGo
    const virtualEmail = `${username.trim().toLowerCase()}@skoolago.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password,
      });

      if (error) throw error;

      // Arahkan ke Dashboard
      navigate('/operator/dashboard');
    } catch (error) {
      setErrorMsg(error.message || 'Username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#eafaf9] flex items-center justify-center p-4 antialiased font-sans">
      {/* Container Utama (Split Screen ala Referensi Gambar) */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        
        {/* KIRI: Form Login */}
        <div className="p-8 md:p-16 flex flex-col justify-between">
          {/* Header & Logo */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black tracking-tight text-[#000000]">
              Skoola<span className="text-[#56c9b5]">Go</span>
            </span>
            <span className="text-xs font-semibold bg-[#eafaf9] text-[#56c9b5] px-3 py-1 rounded-full border border-[#56c9b5]/20">
              Portal Operator
            </span>
          </div>

          {/* Form */}
          <div className="my-auto py-8">
            <h2 className="text-3xl font-extrabold text-[#000000] mb-2">Selamat Datang!</h2>
            <p className="text-sm text-gray-500 mb-8">
              Silakan masukkan username dan password operator sekolah Anda untuk mengakses sistem absensi.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#eafaf9]/50 border-2 border-transparent rounded-xl focus:border-[#56c9b5] focus:bg-white text-[#000000] transition-all outline-none text-sm placeholder-gray-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs font-semibold text-[#4e6bff] hover:underline">Lupa Password?</a>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#eafaf9]/50 border-2 border-transparent rounded-xl focus:border-[#56c9b5] focus:bg-white text-[#000000] transition-all outline-none text-sm placeholder-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-[#000000] text-white hover:bg-[#56c9b5] font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {loading ? 'Menghubungkan ke Server...' : 'Masuk'}
              </button>
            </form>
          </div>

          {/* Footer Form */}
          <div className="text-center md:text-left text-xs text-gray-400">
            © 2026 SkoolaGo. All rights reserved.
          </div>
        </div>

        {/* Panel Kanan : Visual Branding  */}
        <div className="hidden md:flex bg-gradient-to-tr from-[#56c9b5] via-[#56c9b5] to-[#4e6bff] p-12 flex-col justify-between relative overflow-hidden">
          {/* Dekorasi Ornamen Lingkaran Kuning SkoolaGo di Latar Belakang */}
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#ffde59] opacity-40 blur-xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-[#eafaf9] opacity-20 blur-2xl"></div>

          <div className="text-white text-right font-medium text-sm tracking-widest opacity-80">
            ABSENSI DIGITAL
          </div>

          {/* Floating Card Glassmorphism ala Referensi Gambar */}
          <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl max-w-sm z-10 my-auto">
            {/* <div className="w-8 h-8 rounded-full border-2 border-[#ffde59] border-t-transparent animate-spin mb-4"></div> */}
            <h3 className="text-xl font-bold text-white mb-2 leading-snug">
              Portal Sistem Absensi Face Recognition & Kartu RFID.
            </h3>
            <p className="text-xs text-white/80 leading-relaxed">
              Sistem laporan terintegrasi langsung antara siswa, guru, kepala sekolah, hingga rekapitulasi operator secara real-time.
            </p>
          </div>

          <div className="text-xs text-white/60 z-10">
            Butuh bantuan teknis? <a href="mailto:support@skoolago.id" className="underline text-[#ffde59] font-semibold">support@skoolago.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}