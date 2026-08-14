import React, { useState, useEffect, useRef } from 'react';

export default function PortalAbsensi() {
  // Sesi & Profil State (Menggunakan LocalStorage agar session dummy tidak hilang saat di-refresh)
  const [session, setSession] = useState(() => {
    return localStorage.getItem('skoola_dummy_session') === 'true';
  });
  const [userData, setUserData] = useState(() => {
    const savedProfile = localStorage.getItem('skoola_dummy_profile');
    return savedProfile ? JSON.parse(savedProfile) : null;
  });
  const [initLoading, setInitLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Perangkat Guard & Navigasi Mobile State
  const [isMobileDevice, setIsMobileDevice] = useState(true);
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'absen', 'riwayat'

  // Form Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleType, setRoleType] = useState('siswa'); // 'siswa' atau 'guru'
  const [errPesan, setErrPesan] = useState('');

  // GPS & Live Kamera State
  const [lokasiUser, setLokasiUser] = useState({ lat: null, lng: null });
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [jarakMeter, setJarakMeter] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  const [isCamActive, setIsCamActive] = useState(false);
  const [snapshotAbsen, setSnapshotAbsen] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // State Riwayat Absensi (Menggunakan Data Dummy Lokal)
  const [riwayat, setRiwayat] = useState([
    { tanggal: '24 Mei 2026', jam: '06:45:12', metode: 'MOBILE WEB (GPS)', status: 'TEPAT WAKTU' },
    { tanggal: '23 Mei 2026', jam: '06:52:30', metode: 'FACE RECOGNITION', status: 'TEPAT WAKTU' },
    { tanggal: '22 Mei 2026', jam: '07:03:15', metode: 'RFID CARD', status: 'TERLAMBAT' },
  ]);

  // Titik Koordinat Sekolah (Default Contoh Uji Coba)
  const SEKOLAH_LAT = -6.9147; 
  const SEKOLAH_LNG = 107.6098;
  const RADIUS_MAKSIMAL_METER = 50; 

  // 1. Deteksi Perangkat Mobile
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const checkMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    setIsMobileDevice(checkMobile);
    setInitLoading(false);
  }, []);

  // Pemicu otomatis ambil GPS / matikan kamera saat tab berpindah
  useEffect(() => {
    if (currentTab === 'absen' && session) {
      dapatkanLokasiAbsen();
    } else {
      stopCameraAbsen();
    }
  }, [currentTab, session]);

  // 2. Ambil Koordinat GPS HP User via Web Geolocation API
  const dapatkanLokasiAbsen = () => {
    if (!navigator.geolocation) {
      alert("Browser HP Anda tidak mendukung fitur pelacakan GPS!");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setLokasiUser({ lat: userLat, lng: userLng });

        // Hitung jarak manual simulasi Haversine
        const R = 6371e3;
        const phi1 = userLat * Math.PI / 180;
        const phi2 = SEKOLAH_LAT * Math.PI / 180;
        const deltaPhi = (SEKOLAH_LAT - userLat) * Math.PI / 180;
        const deltaLambda = (SEKOLAH_LNG - userLng) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const jarak = Math.round(R * c);

        setJarakMeter(jarak);
        // Always true untuk testing
        setIsWithinRadius(true); 
        setGpsLoading(false);
      },
      (error) => {
        // Jika GPS mati/ditolak, set data dummy lokasi agar tombol absen tidak stuck mati saat testing
        setLokasiUser({ lat: SEKOLAH_LAT, lng: SEKOLAH_LNG });
        setJarakMeter(12);
        setIsWithinRadius(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // 3. Kontrol Kamera Depan HP (Selfie Capture)
  const startCameraAbsen = async () => {
    setIsCamActive(true);
    setSnapshotAbsen(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 320 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Gagal membuka kamera! Periksa kembali izin kamera di browser Anda.");
      setIsCamActive(false);
    }
  };

  const stopCameraAbsen = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCamActive(false);
  };

  const ambilFotoSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 320, 320);
      setSnapshotAbsen(canvas.toDataURL('image/jpeg'));
      stopCameraAbsen();
    }
  };

  // 4. Jalur Handler Kirim Data Kehadiran Dummy ke State Lokal
  const handleKirimAbsen = async () => {
    if (!snapshotAbsen) return;
    setLoading(true);

    setTimeout(() => {
      const sekarang = new Date();
      const jamMsk = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const tglMsk = sekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // Menambahkan record baru ke list teratas riwayat state
      const logBaru = {
        tanggal: tglMsk,
        jam: jamMsk,
        metode: 'MOBILE WEB (GPS)',
        status: sekarang.getHours() >= 7 ? 'TERLAMBAT' : 'TEPAT WAKTU'
      };

      setRiwayat(prev => [logBaru, ...prev]);
      alert(`Simulasi Berhasil! Absensi Anda dikunci pada pukul ${jamMsk} WIB.`);
      
      setSnapshotAbsen(null);
      setCurrentTab('home');
      setLoading(false);
    }, 1500);
  };

  // 5. Login Handler Dummy (BYPASS AUTH SYSTEM)
  const handleLoginPortal = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrPesan('');

    if (!username.trim()) {
      setErrPesan('Username tidak boleh kosong!');
      setLoading(false);
      return;
    }

    // Ganti format huruf kapital di awal untuk estetika nama lengkap dummy
    const formatNama = username.trim().replace(/\b\w/g, l => l.toUpperCase());

    // Membuat cetakan profile tiruan reaktif sesuai pilihan tab role user
    const profileDummy = {
      nama_lengkap: formatNama,
      username: username.trim().toLowerCase(),
      nis_nisn: roleType === 'siswa' ? '9902314512' : '-',
      jabatan: roleType === 'guru' ? 'Tenaga Pendidik (Guru)' : '-',
      rfid_number: 'RFID-903123',
      role_sistem: roleType,
      sekolahs: { nama_sekolah: 'SMK Negeri 1 Bandung (Demo Instansi)' }
    };

    // Simpan ke memory localstorage agar tidak log out saat refresh browser
    localStorage.setItem('skoola_dummy_session', 'true');
    localStorage.setItem('skoola_dummy_profile', JSON.stringify(profileDummy));

    setSession(true);
    setUserData(profileDummy);
    setLoading(false);
  };

  const handleLogoutPortal = () => {
    localStorage.removeItem('skoola_dummy_session');
    localStorage.removeItem('skoola_dummy_profile');
    setUserData(null);
    setSession(false);
    setCurrentTab('home');
  };

  // --- BLOKIR PROTEKSI 1: JIKA DIAKSES VIA LAPTOP / DESKTOP ---
  if (!isMobileDevice) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans w-full">
        <div className="bg-white p-8 rounded-3xl max-w-sm border border-gray-100 shadow-xl space-y-4 text-left">
          <div className="text-5xl text-center">📱</div>
          <h2 className="text-xl font-black text-black text-center">Akses Ditutup (Device Locked)</h2>
          <p className="text-xs text-gray-500 leading-relaxed text-center">
            Portal Absensi Mandiri SkoolaGo berintegritas tinggi dan **hanya boleh diakses menggunakan Smartphone / Tablet** demi validitas koordinat lokasi yang akurat.
          </p>
          <div className="text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-bold font-mono text-center uppercase">
            DESKTOP / LAPTOP DETECTED
          </div>
        </div>
      </div>
    );
  }

  if (initLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 font-sans">
        Sinkronisasi sistem keamanan mobile...
      </div>
    );
  }

  // --- VIEW INTERFACE 2: FORM LOGIN MOBILE PORTAL (DUMMY BYPASS) ---
  if (!session || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-left w-full max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs w-full space-y-5">
          <div className="text-center">
            <span className="text-2xl font-black text-black">Skoola<span className="text-skoola-teal">Go</span></span>
            <h2 className="text-lg font-black text-black mt-1">Portal Absen HP (Demo Mode)</h2>
            <p className="text-[11px] text-gray-400">Ketik username & password bebas tanpa simbol @ untuk mencoba.</p>
          </div>

          {errPesan && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold">
              {errPesan}
            </div>
          )}

          <form onSubmit={handleLoginPortal} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-black uppercase mb-1">Status Anda *</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button type="button" onClick={() => setRoleType('siswa')} className={`py-2 rounded-lg border-none cursor-pointer transition-all ${roleType === 'siswa' ? 'bg-white text-black shadow-2xs' : 'text-gray-400 bg-transparent'}`}>Siswa</button>
                <button type="button" onClick={() => setRoleType('guru')} className={`py-2 rounded-lg border-none cursor-pointer transition-all ${roleType === 'guru' ? 'bg-white text-black shadow-2xs' : 'text-gray-400 bg-transparent'}`}>Guru / Staf</button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-black uppercase mb-1">Username Akun *</label>
              <input type="text" required placeholder="Ketik bebas, misal: rinda_amalia" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-black outline-none bg-white" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-black uppercase mb-1">Password Kunci *</label>
              <input type="password" required placeholder="Ketik sandi bebas" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-black outline-none bg-white" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-black text-white text-sm font-bold rounded-xl border-none cursor-pointer hover:bg-teal-600 transition-all">{loading ? 'Membuka Akses...' : 'Masuk Portal Absen'}</button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW INTERFACE 3: WORKSPACE DASHBOARD MOBILE UTAMA ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full max-w-md mx-auto font-sans text-left pb-20 relative shadow-sm">
      
      {/* HEADER NAV */}
      <header className="bg-white p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
        <div>
          <span className="text-lg font-black text-black">Skoola<span className="text-skoola-teal">Go</span></span>
          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded ml-2 uppercase tracking-wide animate-pulse">Demo</span>
        </div>
        <button onClick={handleLogoutPortal} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border-none cursor-pointer">Keluar</button>
      </header>

      {/* CORE DISPLAY BERDASARKAN TAB AKTIF */}
      <div className="p-4 flex-1 overflow-y-auto">
        
        {/* TAB A: BERANDA (HOME) */}
        {currentTab === 'home' && (
          <div className="space-y-4">
            {/* Profil Card */}
            <div className="bg-gradient-to-br from-slate-900 to-black p-5 rounded-2xl text-white flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-2xl border border-white/10">👤</div>
              <div className="overflow-hidden text-left">
                <h3 className="font-black text-base truncate">{userData.nama_lengkap}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{userData.role_sistem === 'guru' ? `Jabatan: ${userData.jabatan}` : `NISN: ${userData.nis_nisn}`}</p>
                <p className="text-[10px] text-skoola-teal font-bold tracking-tight mt-1 truncate">📍 {userData.sekolahs?.nama_sekolah}</p>
              </div>
            </div>

            {/* Rekapan Dashboard Mini */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Hadir Bln Ini</span>
                <span className="text-xl font-black text-black mt-1 block">{riwayat.filter(r => r.status === 'TEPAT WAKTU' || r.status === 'TERLAMBAT').length} Hari</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Telat</span>
                <span className="text-xl font-black text-amber-600 mt-1 block">{riwayat.filter(r => r.status === 'TERLAMBAT').length} Kali</span>
              </div>
            </div>

            {/* Call To Action Box */}
            <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-center space-y-2">
              <p className="text-xs text-teal-800 font-bold">Sudah sampai di wilayah sekolah hari ini?</p>
              <button onClick={() => setCurrentTab('absen')} className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl border-none cursor-pointer">Buka Kamera Absen Sekarang ➔</button>
            </div>
          </div>
        )}

        {/* TAB B: PROSES SCAN ABSENSI MANDIRI */}
        {currentTab === 'absen' && (
          <div className="space-y-4 text-center">
            {/* Geofencing Status */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 text-left">
              <h4 className="text-sm font-black text-black">Validasi Lokasi Satelit GPS</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">Sistem mencocokkan titik kordinat HP Anda dengan gerbang instansi.</p>
              
              {gpsLoading ? (
                <div className="text-xs text-blue-500 font-bold mt-3 animate-pulse">Mengunci titik sinyal koordinat...</div>
              ) : (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5 font-bold">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Jangkauan Radius:</span>
                    <span className="text-green-600">Berada di Sekolah (Simulasi)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Penyimpangan Jarak:</span>
                    <span className="text-black font-mono">{jarakMeter} Meter dari Pusat</span>
                  </div>
                </div>
              )}
              <button onClick={dapatkanLokasiAbsen} className="w-full mt-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border-none cursor-pointer hover:bg-gray-200">🔄 Segarkan Akurasi GPS</button>
            </div>

            {/* Kamera Swafoto Section */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col items-center">
              <h4 className="text-sm font-black text-black mb-3 text-left w-full">Bukti Swafoto Wajah (Selfie)</h4>
              
              {!isCamActive && !snapshotAbsen && (
                <button 
                  onClick={startCameraAbsen}
                  disabled={!isWithinRadius}
                  className="w-full py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-black cursor-pointer disabled:opacity-40"
                >
                  📷 Ketuk untuk Menyalakan Kamera Depan
                </button>
              )}

              {isCamActive && (
                <div className="flex flex-col items-center gap-3 w-full">
                  <video ref={videoRef} autoPlay playsInline className="w-48 h-48 rounded-2xl object-cover border-2 border-skoola-teal bg-black scale-x-[-1]" />
                  <button type="button" onClick={ambilFotoSelfie} className="px-4 py-2 bg-skoola-teal text-black text-xs font-black rounded-xl border-none cursor-pointer shadow-sm">⚡ Ambil Jepretan Wajah</button>
                </div>
              )}

              {snapshotAbsen && (
                <div className="flex flex-col items-center gap-3 w-full">
                  <img src={snapshotAbsen} alt="selfie" className="w-48 h-48 object-cover rounded-2xl border border-gray-200" />
                  <button type="button" onClick={() => setSnapshotAbsen(null)} className="text-[11px] font-bold text-gray-400 underline border-none bg-transparent cursor-pointer">Hapus & Foto Ulang</button>
                </div>
              )}
            </div>

            {/* Tombol Eksekusi Akhir */}
            <button
              onClick={handleKirimAbsen}
              disabled={loading || !isWithinRadius || !snapshotAbsen}
              className="w-full py-3 bg-black text-white font-black rounded-xl text-sm tracking-wider uppercase disabled:opacity-30 border-none cursor-pointer hover:bg-teal-600 transition-all"
            >
              {loading ? 'Mengunci Presensi...' : 'Kirim Kehadiran Sekarang'}
            </button>
          </div>
        )}

        {/* TAB C: LOG HISTORI ABSENSI */}
        {currentTab === 'riwayat' && (
          <div className="space-y-3">
            <div className="text-left mb-2">
              <h4 className="text-sm font-black text-black">Log Riwayat Presensi Anda</h4>
              <p className="text-[11px] text-gray-400">Daftar rekapan log audit mesin kehadiran milik Anda pribadi.</p>
            </div>
            
            <div className="space-y-2.5">
              {riwayat.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-gray-400 bg-white rounded-xl border border-gray-200">Belum ada rekapan absensi bulan ini.</div>
              ) : (
                riwayat.map((log, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 flex justify-between items-center text-xs font-bold">
                    <div className="text-left">
                      <div className="text-black">{log.tanggal}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{log.jam} WIB | <span className="text-skoola-teal uppercase">{log.metode}</span></div>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wide border ${
                        log.status === 'TERLAMBAT' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-700 border-green-100'
                      }`}>{log.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM NAVIGATION FIXED BAR */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 grid grid-cols-3 py-2 z-30 shadow-lg text-center">
        <button 
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center justify-center border-none bg-transparent cursor-pointer transition-all ${currentTab === 'home' ? 'text-black scale-105' : 'text-gray-400'}`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-bold mt-0.5">Beranda</span>
        </button>

        <button 
          onClick={() => setCurrentTab('absen')}
          className={`flex flex-col items-center justify-center border-none bg-transparent cursor-pointer transition-all ${currentTab === 'absen' ? 'text-black scale-105' : 'text-gray-400'}`}
        >
          <span className="text-lg">📸</span>
          <span className="text-[10px] font-bold mt-0.5">Kamera Absen</span>
        </button>

        <button 
          onClick={() => setCurrentTab('riwayat')}
          className={`flex flex-col items-center justify-center border-none bg-transparent cursor-pointer transition-all ${currentTab === 'riwayat' ? 'text-black scale-105' : 'text-gray-400'}`}
        >
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-bold mt-0.5">Riwayat</span>
        </button>
      </div>
    </div>
  );
}