import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Import Halaman Autentikasi
import LoginOperator from './pages/auth/LoginOperator';
import LoginSuperadmin from './pages/auth/LoginSuperadmin';

// Import Halaman Dashboard
import SuperadminDashboard from './pages/superadmin/Dashboard';
import OperatorDashboard from './pages/operator/Dashboard';

import KelolaSekolah from './pages/superadmin/KelolaSekolah';
import KelolaOperator from './pages/superadmin/KelolaOperator';
import SuperadminLayout from './layouts/SuperadminLayout';
import KelolaKelas from './pages/superadmin/KelolaKelas';
import MonitoringBiometrik from './pages/superadmin/MonitoringBiometrik';
import OperatorLayout from './layouts/OperatorLayout';
// Import Halaman Operator Sekolah
import KelolaShift from './pages/operator/KelolaShift';       
import KelolaPegawai from './pages/operator/KelolaPegawai';   
import KelolaSiswa from './pages/operator/KelolaSiswa'; 
import KelolaKelasOperator from './pages/operator/KelolaKelas';      
import LogAbsensi from './pages/operator/LogAbsensi';
import AktivasiBiometrik from './pages/operator/AktivasiBiometrik';
import DisplayAbsensi from './pages/operator/DisplayAbsensi';

//Import Halaman Portal Absensi
import PortalAbsensi from './pages/absensi/PortalAbsensi';


// Import Guard Proteksi
import ProtectedRoute from './routes/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/login" element={<LoginOperator />} />
          <Route path="/superadminlogin" element={<LoginSuperadmin />} />

          {/* ================= PROTECTED ROUTES (SUPERADMIN) ================= */}
          <Route element={<ProtectedRoute allowedRole="superadmin" />}>
            <Route element={<SuperadminLayout />}>
              <Route path="/superadmin/dashboard" element={<SuperadminDashboard />} />
              <Route path="/superadmin/sekolah" element={<KelolaSekolah />} />
              <Route path="/superadmin/operator" element={<KelolaOperator />} />
              <Route path="/superadmin/kelas" element={<KelolaKelas />} />
              <Route path="/superadmin/monitoringbiometrik" element={<MonitoringBiometrik />} />
            </Route>
          </Route>

         {/* ================= PROTECTED ROUTES (OPERATOR SCH) ================= */}
          <Route element={<ProtectedRoute allowedRole="operator" />}>
            <Route element={<OperatorLayout />}>
              <Route path="/operator/dashboard" element={<OperatorDashboard />} />
              <Route path="/operator/shift" element={<KelolaShift />} />         {/* <-- Jalur Akses Menu Shift */}
              <Route path="/operator/pegawai" element={<KelolaPegawai />} />     {/* <-- Jalur Akses Menu Pegawai */}
              <Route path="/operator/siswa" element={<KelolaSiswa />} />         {/* <-- Jalur Akses Menu Siswa */}
              <Route path="/operator/kelas" element={<KelolaKelasOperator />} />   
              <Route path="/operator/aktivasibiometrik" element={<AktivasiBiometrik />} /> 
              <Route path="/operator/displayabsensi" element={<DisplayAbsensi />} /> 
              <Route path="/operator/log" element={<LogAbsensi />} />           {/* <-- Jalur Akses Menu Log Absen */}
            </Route>
          </Route>

          {/* Portal Absensi */}
          <Route path="/absensi" element={<PortalAbsensi />} />

          {/* Rute Otomatis: Jika user mengetik sembarang alamat URL, arahkan ke /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}