import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function KelolaShift() {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // State Form Input Shift Kebijakan Baru (Kiri)
  const [namaShift, setNamaShift] = useState('');
  const [peruntukan, setPeruntukan] = useState('siswa'); // BARU: 'siswa' atau 'guru'
  const [jamMasuk, setJamMasuk] = useState('');
  const [jamPulang, setJamPulang] = useState('');
  const [toleransiTerlambat, setToleransiTerlambat] = useState('0'); 
  const [blokirAbsenMasuk, setBlokirAbsenMasuk] = useState('');     
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  // State Manajemen PIN Display Absensi Sekolah
  const [pinSekolah, setPinSekolah] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);

  // BARU: State Manajemen Pop-Up Modal Edit Shift
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editShiftId, setEditShiftId] = useState(null);
  const [editNamaShift, setEditNamaShift] = useState('');
  const [editPeruntukan, setEditPeruntukan] = useState('siswa');
  const [editJamMasuk, setEditJamMasuk] = useState('');
  const [editJamPulang, setEditJamPulang] = useState('');
  const [editToleransiTerlambat, setEditToleransiTerlambat] = useState('0');
  const [editBlokirAbsenMasuk, setEditBlokirAbsenMasuk] = useState('');

  // 1. Ambil data shift & PIN spesifik untuk sekolah operator ini
  const fetchDataSekolahDanShift = async () => {
    if (!profile?.sekolah_id) return;
    setFetchLoading(true);
    try {
      // A. Tarik data kebijakan Shift Absen beserta kolom peruntukan baru
      const { data: dataShift } = await supabase
        .from('shift_absen')
        .select('*')
        .eq('sekolah_id', profile.sekolah_id)
        .order('peruntukan', { ascending: false }) // Urutkan biar rapi per kategori
        .order('created_at', { ascending: true });

      if (dataShift) setShifts(dataShift);

      // B. Tarik data pin_display dari tabel sekolahs
      const { data: dataSekolah } = await supabase
        .from('sekolahs')
        .select('pin_display')
        .eq('id', profile.sekolah_id)
        .single();
      
      if (dataSekolah) {
        setPinSekolah(dataSekolah.pin_display || '1234');
      }
    } catch (err) {
      console.error("Gagal sinkronisasi kebijakan sekolah:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSekolahDanShift();
  }, [profile]);

  // 2. Aksi Tambah Shift Baru
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    if (jamMasuk >= jamPulang) {
      setPesan({ status: 'gagal', txt: 'Jam masuk tidak boleh lebih lambat daripada jam pulang!' });
      setLoading(false);
      return;
    }

    if (blokirAbsenMasuk && blokirAbsenMasuk >= jamMasuk) {
      setPesan({ status: 'gagal', txt: 'Batas awal gerbang (blokir) harus lebih awal dari jam masuk resmi!' });
      setLoading(false);
      return;
    }

    const newShift = {
      sekolah_id: profile.sekolah_id,
      nama_shift: namaShift,
      peruntukan: peruntukan, // BARU: Menyimpan value pemisah target
      jam_masuk: jamMasuk,
      jam_pulang: jamPulang,
      toleransi_terlambat: parseInt(toleransiTerlambat) || 0,
      blokir_absen_masuk: blokirAbsenMasuk || null
    };

    const { error } = await supabase.from('shift_absen').insert([newShift]);

    if (error) {
      setPesan({ status: 'gagal', txt: `Gagal menyimpan konfigurasi: ${error.message}` });
    } else {
      setPesan({ status: 'sukses', txt: `Regulasi aturan "${namaShift}" untuk ${peruntukan} berhasil diaktifkan.` });
      setNamaShift(''); setPeruntukan('siswa'); setJamMasuk(''); setJamPulang(''); setToleransiTerlambat('0'); setBlokirAbsenMasuk('');
      fetchDataSekolahDanShift();
    }
    setLoading(false);
  };

  // 3. BARU: Fungsi Kontrol Pemicu Modal Edit Shift
  const handleOpenEditModal = (item) => {
    setEditShiftId(item.id);
    setEditNamaShift(item.nama_shift || '');
    setEditPeruntukan(item.peruntukan || 'siswa');
    setEditJamMasuk(item.jam_masuk || '');
    setEditJamPulang(item.jam_pulang || '');
    setEditToleransiTerlambat(item.toleransi_terlambat?.toString() || '0');
    setEditBlokirAbsenMasuk(item.blokir_absen_masuk || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditShiftId(null);
  };

  // 4. BARU: Handle Submit Update Perubahan Kebijakan Shift (Dari Modal)
  const handleUpdateShiftSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editJamMasuk >= editJamPulang) {
      alert('Gagal! Jam masuk tidak boleh melebihi jam pulang.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('shift_absen')
        .update({
          nama_shift: editNamaShift,
          peruntukan: editPeruntukan,
          jam_masuk: editJamMasuk,
          jam_pulang: editJamPulang,
          toleransi_terlambat: parseInt(editToleransiTerlambat) || 0,
          blokir_absen_masuk: editBlokirAbsenMasuk || null
        })
        .eq('id', editShiftId);

      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Berhasil memperbarui regulasi jam kerja: ${editNamaShift}` });
      handleCloseModal();
      fetchDataSekolahDanShift();
    } catch (err) {
      alert(`Gagal menyimpan perubahan shift: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 5. Aksi Update PIN Keamanan Display Absensi
  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setLoadingPin(true);
    setPesan({ status: '', txt: '' });

    if (!/^\d+$/.test(pinSekolah) || pinSekolah.length < 4) {
      setPesan({ status: 'gagal', txt: 'Otorisasi PIN gagal! Harus berupa angka saja dan minimal 4-6 digit.' });
      setLoadingPin(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('sekolahs')
        .update({ pin_display: pinSekolah })
        .eq('id', profile.sekolah_id);

      if (error) throw error;
      setPesan({ status: 'sukses', txt: 'Berhasil! PIN pengunci menu Display Absensi TV telah diperbarui.' });
    } catch (err) {
      setPesan({ status: 'gagal', txt: `Gagal merubah PIN: ${err.message}` });
    } finally {
      setLoadingPin(false);
    }
  };

  // 6. Aksi Hapus Kebijakan Shift
  const handleHapusShift = async (id, nama) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus regulasi jam kerja "${nama}"?`);
    if (!konfirmasi) return;

    const { error } = await supabase.from('shift_absen').delete().eq('id', id);
    if (!error) {
      setPesan({ status: 'sukses', txt: `Regulasi "${nama}" berhasil dihapus dari sistem.` });
      fetchDataSekolahDanShift();
    } else {
      setPesan({ status: 'gagal', txt: `Gagal menghapus: Data ini kemungkinan sedang mengikat pegawai/siswa.` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      {/* Judul Atas */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-black">Konfigurasi Jam & Kebijakan Shift</h1>
        <p className="text-sm text-gray-400 mt-1">Atur parameter toleransi ketepatan waktu mesin RFID serta PIN pengaman gerbang untuk ekosistem sekolah Anda.</p>
      </div>

      {/* Alert Banner */}
      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COMPONENT FORM KIRI (SHIFT + SETTING PIN BERTAUT) */}
        <div className="space-y-6">
          
          {/* Form Pembuatan Aturan Jam Shift */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs h-fit text-left">
            <h3 className="text-base font-bold text-black mb-4">Buat Regulasi Waktu</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Shift / Kebijakan *</label>
                <input
                  type="text" required placeholder="Misal: Reguler Pagi Siswa"
                  value={namaShift} onChange={(e) => setNamaShift(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              {/* BARU: Dropdown Pemisah Alokasi Tipe Peruntukan */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Alokasi Peruntukan *</label>
                <select
                  value={peruntukan} onChange={(e) => setPeruntukan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
                >
                  <option value="siswa">Khusus Murid / Siswa</option>
                  <option value="guru">Khusus Guru / Pegawai Staf</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jam Masuk *</label>
                  <input
                    type="time" required
                    value={jamMasuk} onChange={(e) => setJamMasuk(e.target.value)}
                    className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jam Pulang *</label>
                  <input
                    type="time" required
                    value={jamPulang} onChange={(e) => setJamPulang(e.target.value)}
                    className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Toleransi Keterlambatan</label>
                <div className="flex items-center bg-skoola-bg/20 border border-gray-200 rounded-xl overflow-hidden focus-within:border-skoola-teal transition-all">
                  <input
                    type="number" min="0" placeholder="0"
                    value={toleransiTerlambat} onChange={(e) => setToleransiTerlambat(e.target.value)}
                    className="w-full px-3 py-2.5 bg-transparent text-sm text-black outline-none"
                  />
                  <span className="px-3 text-xs font-bold text-gray-400 bg-gray-100/50 h-full flex items-center border-l border-gray-200 select-none">
                    Menit
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Batas Awal Scan RFID (Blokir)</label>
                <input
                  type="time"
                  value={blokirAbsenMasuk} onChange={(e) => setBlokirAbsenMasuk(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full mt-2 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-40 cursor-pointer border-none"
              >
                {loading ? 'Menyimpan Aturan...' : 'Aktifkan Jam Shift'}
              </button>
            </form>
          </div>

          {/* Form Kustomisasi PIN Keamanan Display Absensi TV */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs h-fit text-left">
            <h3 className="text-base font-bold text-black mb-1">PIN Keamanan Monitor Gate</h3>
            <p className="text-[11px] text-gray-400 mb-4">Gunakan kode otorisasi rahasia ini saat mengunci atau menutup halaman Display TV Gerbang.</p>
            
            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Kode PIN Gerbang Aktif *</label>
                <input
                  type="text" required maxLength={6} placeholder="Contoh: 1234"
                  value={pinSekolah} onChange={(e) => setPinSekolah(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono font-bold tracking-widest outline-none focus:border-skoola-teal"
                />
              </div>

              <button
                type="submit" disabled={loadingPin}
                className="w-full py-2.5 bg-skoola-indigo text-white text-xs font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-40 cursor-pointer border-none"
              >
                {loadingPin ? 'Memperbarui PIN...' : 'Simpan Kredensial PIN'}
              </button>
            </form>
          </div>

        </div>

        {/* COMPONENT KANAN: VISUALISASI GRID ATURAN JAM (MENGAMBIL 2 KOLOM) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <h3 className="text-base font-bold text-black mb-4">Aturan Waktu yang Berlaku</h3>

          {fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Sinkronisasi kebijakan waktu sekolah...</div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Belum ada kebijakan jam masuk yang dibuat untuk institusi sekolah ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shifts.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 flex flex-col justify-between shadow-xs relative group text-left">
                  <div>
                    <div className="flex justify-between items-center">
                      {/* BARU: Badge Dinamis Pembatas Target Kategori */}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${
                        item.peruntukan === 'guru' 
                          ? 'bg-purple-50 text-purple-600 border-purple-200' 
                          : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        📌 Shift {item.peruntukan || 'siswa'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-black mt-2 mb-4 capitalize">{item.nama_shift}</h4>
                    
                    <div className="flex items-center gap-6 bg-white p-3 rounded-xl border border-gray-100 mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mulai Masuk</p>
                        <p className="text-base font-black text-black mt-0.5">{item.jam_masuk.substring(0, 5)}</p>
                      </div>
                      <div className="text-gray-300 font-light text-lg">→</div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jam Pulang</p>
                        <p className="text-base font-black text-skoola-indigo mt-0.5">{item.jam_pulang.substring(0, 5)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">⏱️ Batas Scan Awal:</span>
                        <span className="font-bold text-black font-mono">
                          {item.blokir_absen_masuk ? `${item.blokir_absen_masuk.substring(0, 5)} WIB` : 'Bebas'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">🛡️ Toleransi Telat:</span>
                        <span className={`font-bold ${item.toleransi_terlambat > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {item.toleransi_terlambat} Menit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* UPDATE: Tombol Aksi Lengkap (Ubah & Hapus) */}
                  <div className="mt-5 flex justify-end gap-1 border-t pt-3 border-gray-100">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="text-xs font-bold text-skoola-indigo bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-none"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleHapusShift(item.id, item.nama_shift)}
                      className="text-xs font-bold text-red-400 hover:text-red-600 px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-transparent border-none"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* BARU: POP-UP DIALOG MODAL EDIT KEBIJAKAN JAM SHIFT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 text-left">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Koreksi Aturan Regulasi Waktu</h3>
                <p className="text-[11px] text-gray-400">Sesuaikan rentang toleransi terlambat atau alokasi kategori personil.</p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-black font-bold text-sm bg-gray-100 p-1.5 px-2.5 rounded-lg cursor-pointer border-none">✕</button>
            </div>

            <form onSubmit={handleUpdateShiftSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Shift / Kebijakan *</label>
                <input
                  type="text" required
                  value={editNamaShift} onChange={(e) => setEditNamaShift(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Alokasi Peruntukan *</label>
                <select
                  value={editPeruntukan} onChange={(e) => setEditPeruntukan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
                >
                  <option value="siswa">Khusus Murid / Siswa</option>
                  <option value="guru">Khusus Guru / Pegawai Staf</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jam Masuk *</label>
                  <input
                    type="time" required
                    value={editJamMasuk} onChange={(e) => setEditJamMasuk(e.target.value)}
                    className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jam Pulang *</label>
                  <input
                    type="time" required
                    value={editJamPulang} onChange={(e) => setEditJamPulang(e.target.value)}
                    className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Toleransi Keterlambatan (Menit)</label>
                <input
                  type="number" min="0"
                  value={editToleransiTerlambat} onChange={(e) => setEditToleransiTerlambat(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Batas Awal Scan RFID (Blokir)</label>
                <input
                  type="time"
                  value={editBlokirAbsenMasuk} onChange={(e) => setEditBlokirAbsenMasuk(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 bg-white">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 border-none transition-all cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-skoola-indigo text-white font-bold rounded-xl text-xs hover:bg-opacity-90 border-none transition-all cursor-pointer">
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}