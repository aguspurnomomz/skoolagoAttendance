import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function SuperadminLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fungsi untuk menangani Logout
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari HQ Console?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      navigate('/superadminlogin');
    }
  };

  // Menu Navigasi Sidebar
  const navigationMenu = [
    { name: 'Overview Dashboard', path: '/superadmin/dashboard', icon: '' },
    { name: 'Registrasi Sekolah', path: '/superadmin/sekolah', icon: '' },
    { name: 'Kelola Operator', path: '/superadmin/operator', icon: '' },
    { name: 'Kelola Kelas', path: '/superadmin/kelas', icon: '' },
    { name: 'Biometrik', path: '/superadmin/monitoringbiometrik', icon: '' }
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50 flex font-sans antialiased">
      
      {/* Sidebar (KIRI) - Terkunci di layar */}
      <aside className="w-64 bg-black text-white flex flex-col justify-between fixed h-full z-20 shadow-xl">
        <div>
          {/* Logo Brand SkoolaGo */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xl font-black tracking-tight text-white">
              Skoola<span className="text-skoola-teal">Go</span>
            </span>
            <span className="text-[10px] bg-skoola-yellow text-black font-extrabold px-1.5 py-0.5 rounded uppercase">
              HQ
            </span>
          </div>

          {/* Profil Singkat Superadmin di Top Sidebar */}
          <div className="p-5 bg-gradient-to-r from-gray-950 to-gray-900 border-b border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-skoola-teal/20 border border-skoola-teal/40 flex items-center justify-center text-lg font-bold text-skoola-teal">
              {profile?.username?.substring(0, 2).toUpperCase() || 'SA'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-white truncate">{profile?.username || 'Superadmin'}</h4>
              <p className="text-[11px] text-skoola-teal font-medium tracking-wider uppercase mt-0.5">
                {profile?.role_global}
              </p>
            </div>
          </div>

          {/* List Menu Navigasi */}
          <nav className="p-4 space-y-1.5 mt-4">
            {navigationMenu.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                    isActive
                      ? 'bg-skoola-teal text-black shadow-lg shadow-skoola-teal/10'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <span className={`text-base ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`}>
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bagian Bawah Sidebar (Tombol Logout) */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-sm font-bold transition-all outline-none"
          >
            <span>-</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Konten Utama (KANAN) - Bergeser seukuran lebar sidebar */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-xs">
          <div className="text-xs font-semibold text-gray-400 font-mono">
            Pusat Kendali Utama / <span className="text-black font-sans font-bold capitalize">{location.pathname.split('/').pop()}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-gray-600 font-medium">Database Synced</span>
            </div>
          </div>
        </header>

        {/* Konten Halaman Dinamis */}
        <main className="flex-1 bg-gray-50">
          <Outlet />
        </main>
      </div>

    </div>
  );
}