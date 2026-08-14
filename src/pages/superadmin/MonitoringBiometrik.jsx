import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function MonitoringBiometrik() {
  const [listSekolah, setListSekolah] = useState([]);
  const [selectedSekolahId, setSelectedSekolahId] = useState('');
  
  const [activeTab, setActiveTab] = useState('semua');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [listGabungan, setListGabungan] = useState([]);

  // 1. Ambil daftar seluruh sekolah untuk dropdown Superadmin
  useEffect(() => {
    const fetchSekolah = async () => {
      try {
        const { data, error } = await supabase
          .from('sekolahs')
          .select('id, nama_sekolah')
          .order('nama_sekolah', { ascending: true });
        
        if (error) throw error;
        setListSekolah(data || []);
        
        // Pilih sekolah pertama secara otomatis jika ada data
        if (data && data.length > 0) {
          setSelectedSekolahId(data[0].id);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar sekolah:', err);
      }
    };
    fetchSekolah();
  }, []);

  // 2. Ambil data biometrik berdasarkan sekolah yang dipilih (Read-Only)
  const fetchDataBiometrikSekolah = async () => {
    if (!selectedSekolahId) return;
    setFetchLoading(true);
    try {
      // A. Tarik Data Siswa
      const { data: dataSiswa } = await supabase
        .from('siswas')
        .select('id, nama_lengkap, username, nis_nisn, rfid_number, is_face_registered, foto_url, kelases(nama_kelas_lengkap)')
        .eq('sekolah_id', selectedSekolahId);

      // B. Tarik Data Pegawai via pegawai_sekolah
      const { data: dataPegawai } = await supabase
        .from('regular_pegawai_sekolah_atau_sesuai_tabel_jembatan_anda') // sesuaikan nama tabel jembatan pegawai Anda
        .select('id, pegawais(id, nama_lengkap, username, jabatan, rfid_number, is_face_registered, foto_url)')
        .eq('sekolah_id', selectedSekolahId);

      const siswaFormatted = (dataSiswa || []).map(s => ({
        tipe: 'Siswa',
        nama: s.nama_lengkap,
        identitas_unik: `NISN: ${s.nis_nisn || '-'}`,
        keterangan: s.kelases?.nama_kelas_lengkap || 'Tanpa Kelas',
        rfid_number: s.rfid_number,
        is_face_registered: s.is_face_registered,
        foto_url: s.foto_url
      }));

      const pegawaiFormatted = (dataPegawai || []).map(item => {
        const p = item.pegawais;
        return {
          tipe: 'Pegawai',
          nama: p?.nama_lengkap || 'No Name',
          identitas_unik: p?.jabatan || 'Staf',
          keterangan: `@${p?.username || '-'}`,
          rfid_number: p?.rfid_number,
          is_face_registered: p?.is_face_registered,
          foto_url: p?.foto_url
        };
      });

      setListGabungan([...siswaFormatted, ...pegawaiFormatted]);
    } catch (err) {
      console.error('Gagal memuat monitoring data biometrik:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchDataBiometrikSekolah();
  }, [selectedSekolahId]);

  // 3. Filter Berdasarkan Tab
  const dataTersaring = listGabungan.filter(item => {
    if (activeTab === 'siswa') return item.tipe === 'Siswa';
    if (activeTab === 'pegawai') return item.tipe === 'Pegawai';
    return true;
  });

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black">Monitoring Biometrik Global</h1>
          <p className="text-sm text-gray-400 mt-1">Audit dan pantau status kepemilikan RFID & data Face AI seluruh instansi sekolah.</p>
        </div>

        {/* DROPDOWN PILIHAN SEKOLAH (Khusus Hak Akses Superadmin) */}
        <div className="flex flex-col gap-1 w-full md:w-72">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pilih Instansi Sekolah</label>
          <select
            value={selectedSekolahId}
            onChange={(e) => setSelectedSekolahId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black outline-none focus:border-black"
          >
            {listSekolah.map((sek) => (
              <option key={sek.id} value={sek.id}>{sek.nama_sekolah}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RENDER TAB FILTER BUTTONS */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl w-fit">
        {['semua', 'siswa', 'pegawai'].map((tab) => (
          <button
            key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer ${
              activeTab === tab ? 'bg-white text-black shadow-xs' : 'text-gray-400 hover:text-black bg-transparent'
            }`}
          >
            {tab === 'semua' ? 'Semua Kategori' : tab}
          </button>
        ))}
      </div>

      {/* TABEL UTAMA READ-ONLY */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        {fetchLoading ? (
          <div className="text-center py-12 text-sm text-gray-400">Memuat data log biometrik sekolah terpilih...</div>
        ) : dataTersaring.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Belum ada personil yang terdaftar atau sekolah belum dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-2">Foto Referensi</th>
                  <th className="py-3 px-2">Nama Lengkap</th>
                  <th className="py-3 px-2">Klasifikasi</th>
                  <th className="py-3 px-2 text-center">ID Kartu RFID</th>
                  <th className="py-3 px-2 text-center">Status Pindai Wajah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dataTersaring.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt="wajah" className="w-9 h-9 object-cover rounded-xl border border-gray-200 grayscale" />
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400 font-bold">👤</div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-black">{item.nama}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.keterangan}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                        item.tipe === 'Siswa' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                      }`}>{item.tipe}</span>
                      <div className="text-[11px] text-gray-400 mt-0.5">{item.identitas_unik}</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.rfid_number ? (
                        <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                          💳 {item.rfid_number}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs italic">Kosong</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.is_face_registered ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-gray-50 text-gray-300 border-gray-100 italic'
                      }`}>
                        {item.is_face_registered ? 'Terpindai' : 'Belum Ada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}