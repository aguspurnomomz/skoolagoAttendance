import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

export default function LoginSuperadmin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Strategi LOGIN SUPERADMIN: Akun superadmin global internal SkoolaGo
    const virtualEmail = `${username.trim().toLowerCase()}@skoolago.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password,
      });

      if (error) throw error;

      navigate('/superadmin/dashboard');
    } catch (error) {
      setErrorMsg(error.message || 'Akses ditolak. Kredensial Superadmin tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] flex items-center justify-center p-4 antialiased font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        
        {/* Panel Kiri u visual branding */}
        <div className="hidden md:flex bg-gradient-to-br from-[#000000] to-[#242424] p-12 flex-col justify-between relative">
          <div className="absolute right-4 bottom-10 w-72 h-72 rounded-full bg-[#56c9b5] opacity-20 blur-3xl"></div>
          
          <div className="text-[#56c9b5] font-black tracking-widest text-sm">
            SKOOLAGO CORE CONSOLE v1.0
          </div>

          <div className="backdrop-blur-sm bg-white/5 p-8 rounded-2xl border border-white/10 my-auto max-w-sm">
            <div className="inline-block px-2 py-1 bg-[#ffde59] text-black text-[10px] font-black rounded mb-3 uppercase tracking-wider">
              Security Level Superadmin
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Central Management</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Gunakan gerbang ini hanya jika Anda adalah staff resmi SkoolaGo untuk mendaftarkan institusi sekolah baru dan manajemen lisensi operator.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            Authorized Superadmin Only.
          </div>
        </div>

        {/* Panel Kanan u form login superadmin */}
        <div className="p-8 md:p-16 flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black tracking-tight text-[#000000]">
              Skoola<span className="text-[#56c9b5]">Go</span>
            </span>
            <span className="text-xs font-black bg-[#ffde59] text-black px-3 py-1 rounded-md uppercase tracking-wider">
              Superadmin
            </span>
          </div>

          <div className="my-auto py-8">
            <h2 className="text-3xl font-extrabold text-[#000000] mb-2">Akses Superadmin</h2>
            <p className="text-sm text-gray-500 mb-8">
              Masukkan ID/Username Superadmin Khusus untuk mengakses pusat data absensi SkoolaGo.
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
                  placeholder="username superadmin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#ffde59] focus:bg-white text-[#000000] transition-all outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-2">Master Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#ffde59] focus:bg-white text-[#000000] transition-all outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-[#000000] text-white hover:bg-[#ffde59] hover:text-black font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-wider"
              >
                {loading ? 'Mengautentikasi...' : 'Masuk Root Konsol'}
              </button>
            </form>
          </div>

          <div className="text-center md:text-right text-xs text-gray-400">
            SkoolaGo Engine System Infrastructure © 2026.
          </div>
        </div>
      </div>
    </div>
  );
}