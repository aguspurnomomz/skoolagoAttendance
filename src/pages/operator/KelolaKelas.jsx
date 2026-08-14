import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function OperatorKelolaKelas() {
  const { profile } = useAuth();
  const [tingkatans, setTingkatans] = useState([]);
  const [kelases, setKelases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [selectedTingkatan, setSelectedTingkatan] = useState('');
  const [subKelas, setSubKelas] = useState('');
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editKelasId, setEditKelasId] = useState(null);
  const [editSelectedTingkatan, setEditSelectedTingkatan] = useState('');
  const [editSubKelas, setEditSubKelas] = useState('');


  const fetchOpsiDanDaftarKelas = async () => {
    if (!profile?.sekolah_id) return;
    setFetchLoading(true);

    try {
      // Ambil profil sekolah
      const { data: dataSekolah } = await supabase
        .from('sekolahs')
        .select('jenjang')
        .eq('id', profile.sekolah_id)
        .single();

      if (dataSekolah) {
        const { data: dataTingkatan } = await supabase
          .from('master_tingkatans')
          .select('*')
          .eq('jenjang', dataSekolah.jenjang)
          .order('angka_tingkatan', { ascending: true });
        
        if (dataTingkatan) setTingkatans(dataTingkatan);
      }

      const { data: dataKelas, error } = await supabase
        .from('kelases')
        .select(`
          id_kelas,
          master_tingkatan_id,
          sub_kelas,
          nama_kelas_lengkap,
          master_tingkatans (label_tingkatan)
        `)
        .eq('sekolah_id', profile.sekolah_id)
        .order('nama_kelas_lengkap', { ascending: true });
      
      if (!error && dataKelas) setKelases(dataKelas);
    } catch (err) {
      console.error('Gagal sinkronisasi rombel kelas:', err);
    } {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsiDanDaftarKelas();
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    try {
      const tingkatanTerpilih = tingkatans.find(t => t.id_tingkatan === selectedTingkatan);
      if (!tingkatanTerpilih) throw new Error("Silakan tentukan tingkatan terlebih dahulu.");

  
      const namaLengkap = `${tingkatanTerpilih.label_tingkatan} ${subKelas.trim()}`.trim();

      const { error } = await supabase.from('kelases').insert([
        {
          sekolah_id: profile.sekolah_id,
          master_tingkatan_id: selectedTingkatan,
          sub_kelas: subKelas.trim() || null,
          nama_kelas_lengkap: namaLengkap
        }
      ]);

      if (error) {
        if (error.code === '23505') throw new Error("Nama sub-kelas tersebut sudah terdaftar di sekolah ini!");
        throw error;
      }

      setPesan({ status: 'sukses', txt: `Berhasil merumuskan kelas baru: ${namaLengkap}` });
      setSubKelas('');
      fetchOpsiDanDaftarKelas();
    } catch (err) {
      setPesan({ status: 'gagal', txt: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Modal Edit Kelas
  const handleOpenEditModal = (kls) => {
    setEditKelasId(kls.id_kelas);
    setEditSelectedTingkatan(kls.master_tingkatan_id);
    setEditSubKelas(kls.sub_kelas || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditKelasId(null);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tingkatanTerpilih = tingkatans.find(t => t.id_tingkatan === editSelectedTingkatan);
      if (!tingkatanTerpilih) throw new Error("Tingkatan tidak valid.");

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

      setPesan({ status: 'sukses', txt: `Berhasil mengubah formasi kelas: ${namaLengkapBaru}` });
      handleCloseModal();
      fetchOpsiDanDaftarKelas();
    } catch (err) {
      alert(`Gagal merubah kelas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHapusKelas = async (id, nama) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus "${nama}"?\nSiswa yang berada di kelas ini sementara akan kehilangan ploting kelas.`);
    if (!konfirmasi) return;

    try {
      const { error } = await supabase.from('kelases').delete().eq('id_kelas', id);
      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Kelas "${nama}" berhasil dihapus dari daftar.` });
      fetchOpsiDanDaftarKelas();
    } catch (err) {
      setPesan({ status: 'gagal', txt: `Gagal menghapus kelas: ${err.message}` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-black">Manajemen Kelas & Rombel</h1>
        <p className="text-sm text-gray-400 mt-1">Konfigurasikan pembagian ruangan kelas paralel atau rumpun jurusan di sekolah Anda.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel Kiri Form Input*/}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs h-fit">
          <h3 className="text-base font-bold text-black mb-4">Buat Sub-Kelas Baru</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Tingkatan Urutan *</label>
              <select
                required
                value={selectedTingkatan}
                onChange={(e) => setSelectedTingkatan(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
              >
                <option value="">-- Pilih Tingkat --</option>
                {tingkatans.map((t) => (
                  <option key={t.id_tingkatan} value={t.id_tingkatan}>{t.label_tingkatan}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Sub-Kelas / Huruf / Jurusan</label>
              <input
                type="text"
                placeholder="Contoh: A, B, atau RPL 1, MIPA 3"
                value={subKelas}
                onChange={(e) => setSubKelas(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
              />
              <p className="text-[10px] text-gray-400 mt-1.5 italic">*Kosongkan jika sekolah tidak memiliki kelas paralel paralel.</p>
            </div>

            <button
              type="submit" disabled={loading || !selectedTingkatan}
              className="w-full mt-2 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-40 cursor-pointer border-none"
            >
              {loading ? 'Memproses...' : 'Daftarkan Kelas'}
            </button>
          </form>
        </div>

        {/* Panel Kanan */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <h3 className="text-base font-bold text-black mb-4">Daftar Rombongan Belajar Sekolah</h3>

          {fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Sinkronisasi data kelas...</div>
          ) : kelases.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Belum ada formasi kelas yang didaftarkan. Silakan rumuskan kelas di form sebelah kiri.
            </div>
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
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEditModal(kls)}
                      className="p-2 text-skoola-indigo hover:bg-indigo-50 rounded-lg transition-all cursor-pointer border-none bg-transparent font-bold text-xs"
                    >
                      Ubah
                    </button>
                    <button 
                      onClick={() => handleHapusKelas(kls.id_kelas, kls.nama_kelas_lengkap)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg transition-all cursor-pointer border-none bg-transparent font-bold text-xs"
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

      {/* Modal Pop Up*/}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Modifikasi Formasi Kelas</h3>
                <p className="text-[11px] text-gray-400">Sesuaikan urutan tingkat atau koreksi kesalahan ketik nama rombel.</p>
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
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Tingkatan Urutan *</label>
                <select
                  required
                  value={editSelectedTingkatan}
                  onChange={(e) => setEditSelectedTingkatan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
                >
                  {tingkatans.map((t) => (
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