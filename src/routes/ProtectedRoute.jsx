import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRole }) {
  const { user, profile, loading } = useAuth();

  // 1. Jika AuthContext masih sibuk sinkronisasi sesi awal, tampilkan loading screen indah Anda
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-skoola-teal border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Memverifikasi Otoritas...</p>
        </div>
      </div>
    );
  }

  // 2. Jika loading selesai dan token tidak ada, lempar ke gerbang login yang sesuai target rute
  if (!user) {
    return allowedRole === 'superadmin' 
      ? <Navigate to="/superadminlogin" replace /> 
      : <Navigate to="/login" replace />;
  }

  // 3. Jika token user ada, tapi baris profil belum selesai ditarik, tahan sebentar dengan spinner minim
  if (!profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-black animate-spin"></div>
      </div>
    );
  }

  // 4. Validasi kecocokan Role setelah data dipastikan siap
  if (profile.role_global !== allowedRole) {
    // Jika role tidak sesuai (misal Operator kesasar ke rute Superadmin, atau sebaliknya)
    return allowedRole === 'superadmin'
      ? <Navigate to="/login" replace />
      : <Navigate to="/superadminlogin" replace />;
  }

  // Lolos semua verifikasi, izinkan masuk ke halaman internal layout
  return <Outlet />;
}