import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function OperatorLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari Panel Operator?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  // Navigasi Menu Khusus Operator Sekolah
  const navigationMenu = [
    { name: 'Overview', path: '/operator/dashboard', icon: '' },
    { name: 'Pengaturan Shift', path: '/operator/shift', icon: '' },
    { name: 'Kelola Guru & Pegawai', path: '/operator/pegawai', icon: '' },
    { name: 'Kelola Siswa', path: '/operator/siswa', icon: '' },
    { name: 'Kelola Kelas', path: '/operator/kelas', icon: '' },
    { name: 'Biometrik', path: '/operator/aktivasibiometrik', icon: '' },
    { name: 'Display Absensi', path: '/operator/displayabsensi', icon: '' },
    { name: 'Log Absensi', path: '/operator/log', icon: '' },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50 flex font-sans antialiased">
      
      {/* Sidebar (KIRI) */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between fixed h-full z-20 shadow-xs">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <span className="text-xl font-black tracking-tight text-black">
              Skoola<span className="text-skoola-teal">Go</span>
            </span>
            <span className="text-[10px] bg-skoola-teal/10 text-skoola-teal font-extrabold px-2 py-0.5 rounded-full border border-skoola-teal/20">
              Operator
            </span>
          </div>

          {/* Profil Operator & Info Sekolah */}
          <div className="p-5 bg-skoola-bg/20 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-skoola-teal text-white flex items-center justify-center text-sm font-black shadow-md shadow-skoola-teal/20">
              {profile?.username?.substring(0, 2).toUpperCase() || 'OP'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-black truncate">{profile?.username || 'Operator'}</h4>
              <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                Panel Kontrol Sekolah
              </p>
            </div>
          </div>

          {/* List Menu */}
          <nav className="p-4 space-y-1 mt-2">
            {navigationMenu.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${
                    isActive
                      ? 'bg-skoola-teal text-white shadow-lg shadow-skoola-teal/20'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tombol Logout */}
        <div className="p-4 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl text-sm font-bold transition-all cursor-pointer border-none outline-none"
          >
            <span>-</span>
            logout
          </button>
        </div>
      </aside>

      {/* Konten Area (KANAN) */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Sistem Digitalisasi Sekolah
          </div>
          <div className="text-xs font-bold bg-black text-white px-3 py-1 rounded-lg">
             © 2026 SkoolaGo. All rights reserved.
          </div>
        </header>

        <main className="flex-1 bg-gray-50">
          <Outlet />
        </main>
      </div>

    </div>
  );
}