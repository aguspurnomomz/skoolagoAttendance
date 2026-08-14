import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function KelolaKelas() {
  const [sekolahs, setSekolahs] = useState([]);
  const [tingkatans, setTingkatans] = useState([]);
  const [kelases, setKelases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // State Form Tambah Baru (Kiri)
  const [selectedSekolah, setSelectedSekolah] = useState('');
  const [selectedTingkatan, setSelectedTingkatan] = useState('');
  const [subKelas, setSubKelas] = useState('');
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  // BARU: State Manajemen Pop-Up Modal Edit Kelas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editKelasId, setEditKelasId] = useState(null);
  const [editTingkatans, setEditTingkatans] = useState([]);
  const [editSelectedTingkatan, setEditSelectedTingkatan] = useState('');
  const [editSubKelas, setEditSubKelas] = useState('');

  // 1. Ambil data sekolah saat pertama kali halaman dimuat
  useEffect(() => {
    const fetchAwal = async () => {
      const { data } = await supabase.from('sekolahs').select('id, nama_sekolah, jenjang, kode_sekolah');
      if (data) setSekolahs(data);
      setFetchLoading(false);
    };
    fetchAwal();
  }, []);

  // 2. Ambil master_tingkatans & daftar kelases berdasarkan Sekolah terpilih
  useEffect(() => {
    if (!selectedSekolah) {
      setTingkatans([]);
      setKelases([]);
      return;
    }

    const loadDataSekolah = async () => {
      const sekolahAktif = sekolahs.find(s => s.id === selectedSekolah);
      if (!sekolahAktif) return;

      const { data: dataTingkatan } = await supabase
        .from('master_tingkatans')
        .select('*')
        .eq('jenjang', sekolahAktif.jenjang)
        .order('angka_tingkatan', { ascending: true });
      
      if (dataTingkatan) setTingkatans(dataTingkatan);
      fetchDaftarKelas();
    };

    loadDataSekolah();
  }, [selectedSekolah]);

  // Fungsi fetch pembantu real-time
  const fetchDaftarKelas = async () => {
    const { data, error } = await supabase
      .from('kelases')
      .select(`
        id_kelas,
        master_tingkatan_id,
        sub_kelas,
        nama_kelas_lengkap,
        master_tingkatans (id_tingkatan, label_tingkatan, jenjang)
      `)
      .eq('sekolah_id', selectedSekolah)
      .order('nama_kelas_lengkap', { ascending: true });
    
    if (!error) setKelases(data);
  };

  // 3. Handle Create/Simpan Data Baru (Form Kiri)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    try {
      const tingkatanTerpilih = tingkatans.find(t => t.id_tingkatan === selectedTingkatan);
      if (!tingkatanTerpilih) throw new Error("Pilih tingkatan kelas dulu.");

      const namaLengkap = `${tingkatanTerpilih.label_tingkatan} ${subKelas.trim()}`.trim();

      const { error } = await supabase.from('kelases').insert([
        {
          sekolah_id: selectedSekolah,
          master_tingkatan_id: selectedTingkatan,
          sub_kelas: subKelas.trim() || null,
          nama_kelas_lengkap: namaLengkap
        }
      ]);

      if (error) {
        if (error.code === '23505') throw new Error("Kelas ini sudah terdaftar di sekolah ini!");
        throw error;
      }

      setPesan({ status: 'sukses', txt: `Berhasil membuat ${namaLengkap}` });
      setSubKelas('');
      fetchDaftarKelas();
    } catch (err) {
      setPesan({ status: 'gagal', txt: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 4. BARU: Fungsi Kontrol Pembukaan Modal Edit & Pemuatan Dropdown Dinamis
  const handleOpenEditModal = async (kls) => {
    setEditKelasId(kls.id_kelas);
    setEditSubKelas(kls.sub_kelas || '');
    setEditSelectedTingkatan(kls.master_tingkatan_id);

    // Ambil opsi tingkatan cadangan khusus untuk modal pop-up berdasarkan jenjang kelas terkait
    if (kls.master_tingkatans?.jenjang) {
      const { data } = await supabase
        .from('master_tingkatans')
        .select('*')
        .eq('jenjang', kls.master_tingkatans.jenjang)
        .order('angka_tingkatan', { ascending: true });
      if (data) setEditTingkatans(data);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditKelasId(null);
  };

  // 5. BARU: Handle Submit Update Perubahan Kelas (Dari Modal)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tingkatanTerpilih = editTingkatans.find(t => t.id_tingkatan === editSelectedTingkatan);
      if (!tingkatanTerpilih) throw new Error("Pilih tingkatan kelas.");

      const namaLengkapBaru = `${tingkatanTerpilih.label_tingkatan} ${editSubKelas.trim()}`.trim();

      const { error } = await supabase
        .from('kelases')
        .update({
          master_tingkatan_id: editSelectedTingkatan,
          sub_kelas: editSubKelas.trim() || null,
          nama_kelas_lengkap: namaLengkapBaru
        })
        .eq('id_kelas', editKelasId);

      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Berhasil memperbarui kelas menjadi: ${namaLengkapBaru}` });
      handleCloseModal();
      fetchDaftarKelas();
    } catch (err) {
      alert(`Gagal memperbarui kelas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Hapus Kelas Terpilih
  const handleHapus = async (id, nama) => {
    if (!window.confirm(`Hapus kelas "${nama}"?\nSemua data siswa di kelas ini nantinya akan kehilangan referensi kelas.`)) return;
    
    try {
      const { error } = await supabase.from('kelases').delete().eq('id_kelas', id);
      if (error) throw error;
      
      setPesan({ status: 'sukses', txt: `Kelas "${nama}" berhasil dihapus dari sistem.` });
      fetchDaftarKelas();
    } catch (err) {
      setPesan({ status: 'gagal', txt: `Gagal menghapus: ${err.message}` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-black">Manajemen Master Kelas</h1>
        <p className="text-sm text-gray-500 mt-1">Petakan tingkatan dan rombongan belajar (sub-kelas) untuk setiap institusi.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border font-semibold text-sm ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL KIRI: FORM MAPPING */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-black mb-4">Tambah Sub-Kelas</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Pilih Institusi *</label>
              <select
                required
                value={selectedSekolah}
                onChange={(e) => setSelectedSekolah(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black bg-white"
              >
                <option value="">-- Pilih Sekolah --</option>
                {sekolahs.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama_sekolah} ({s.jenjang})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Tingkatan *</label>
              <select
                required
                disabled={tingkatans.length === 0}
                value={selectedTingkatan}
                onChange={(e) => setSelectedTingkatan(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black bg-white disabled:opacity-50"
              >
                <option value="">-- Pilih Tingkat --</option>
                {tingkatans.map((t) => (
                  <option key={t.id_tingkatan} value={t.id_tingkatan}>{t.label_tingkatan}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Nama Sub-Kelas / Jurusan</label>
              <input
                type="text"
                placeholder="Contoh: RPL 1, MIPA 2, atau A"
                value={subKelas}
                onChange={(e) => setSubKelas(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
              />
              <p className="text-[10px] text-gray-400 mt-1 italic">*Kosongkan jika tidak ada sub-kelas (misal hanya "Kelas 1")</p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTingkatan}
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-50 text-sm mt-2 cursor-pointer border-none"
            >
              {loading ? 'Proses...' : 'Generate Kelas'}
            </button>
          </form>
        </div>

        {/* PANEL KANAN: DAFTAR KELAS SEKOLAH TERPILIH */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-black">Daftar Rombel Terbentuk</h3>
            {selectedSekolah && (
              <span className="text-[10px] bg-skoola-teal/10 text-skoola-teal px-2.5 py-1 rounded-full font-bold border border-skoola-teal/20">
                {sekolahs.find(s => s.id === selectedSekolah)?.nama_sekolah}
              </span>
            )}
          </div>

          {!selectedSekolah ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <p className="text-sm font-medium">Pilih sekolah di panel kiri untuk melihat data kelas.</p>
            </div>
          ) : fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Memuat data kelas...</div>
          ) : kelases.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Belum ada kelas yang dibuat untuk sekolah ini.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kelases.map((kls) => (
                <div key={kls.id_kelas} className="p-4 rounded-xl border border-gray-200 bg-skoola-bg/5 flex justify-between items-center hover:border-skoola-teal transition-all">
                  <div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-tighter">
                      {kls.master_tingkatans?.label_tingkatan}
                    </div>
                    <div className="text-base font-black text-black">
                      {kls.nama_kelas_lengkap}
                    </div>
                  </div>
                  
                  {/* BARU: Tombol Aksi Terbuka Eksplisit (Ubah & Hapus) */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEditModal(kls)}
                      className="p-2 text-skoola-indigo hover:bg-indigo-50 rounded-lg transition-all cursor-pointer border-none bg-transparent font-semibold text-xs"
                    >
                      Ubah
                    </button>
                    <button 
                      onClick={() => handleHapus(kls.id_kelas, kls.nama_kelas_lengkap)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg transition-all cursor-pointer border-none bg-transparent font-semibold text-xs"
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

      {/* POP-UP MODAL EDIT MASTER KELAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Ubah Rumusan Kelas</h3>
                <p className="text-[11px] text-gray-400">Modifikasi tingkat rombongan belajar sekolah terkait.</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-black font-bold text-sm bg-gray-100 p-1.5 px-2.5 rounded-lg cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Tingkatan *</label>
                <select
                  required
                  value={editSelectedTingkatan}
                  onChange={(e) => setEditSelectedTingkatan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
                >
                  {editTingkatans.map((t) => (
                    <option key={t.id_tingkatan} value={t.id_tingkatan}>{t.label_tingkatan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Sub-Kelas / Jurusan</label>
                <input
                  type="text" required
                  value={editSubKelas} onChange={(e) => setEditSubKelas(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 bg-white">
                <button
                  type="button" onClick={handleCloseModal}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-all cursor-pointer border-none"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={loading}
                  className="px-5 py-2.5 bg-skoola-indigo text-white font-bold rounded-xl text-xs hover:bg-opacity-90 transition-all cursor-pointer border-none"
                >
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