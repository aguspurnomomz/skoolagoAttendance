import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function KelolaSekolah() {
  const [sekolahs, setSekolahs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  const [namaSekolah, setNamaSekolah] = useState('');
  const [jenjang, setJenjang] = useState('SD'); 
  const [alamat, setAlamat] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [email, setEmail] = useState('');
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSekolahId, setEditSekolahId] = useState(null);
  const [editNamaSekolah, setEditNamaSekolah] = useState('');
  const [editJenjang, setEditJenjang] = useState('SD');
  const [editAlamat, setEditAlamat] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editNoTelp, setEditNoTelp] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const fetchSekolah = async () => {
    setFetchLoading(true);
    const { data, error } = await supabase
      .from('sekolahs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setSekolahs(data);
    setFetchLoading(false);
  };

  useEffect(() => {
    fetchSekolah();
  }, []);

  const generateKodeSekolah = () => {
    const stringAcak = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SCH-${stringAcak}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    const kodeOtomatis = generateKodeSekolah();

    const dataInput = {
      kode_sekolah: kodeOtomatis,
      nama_sekolah: namaSekolah,
      jenjang: jenjang,
      alamat: alamat,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      no_telp: noTelp || null,
      email: email || null
    };

    const { error } = await supabase.from('sekolahs').insert([dataInput]);

    if (error) {
      setPesan({ status: 'gagal', txt: `Gagal mendaftarkan sekolah: ${error.message}` });
    } else {
      setPesan({ status: 'sukses', txt: `Berhasil! ${namaSekolah} terdaftar dengan Kode: ${kodeOtomatis}` });
      // Reset Form
      setNamaSekolah('');
      setJenjang('SD'); 
      setAlamat('');
      setLatitude('');
      setLongitude('');
      setNoTelp('');
      setEmail('');
      fetchSekolah();
    }
    setLoading(false);
  };

  // 4. BARU: Fungsi Buka Modal & Pasang Data Edit
  const handleOpenEditModal = (sch) => {
    setEditSekolahId(sch.id);
    setEditNamaSekolah(sch.nama_sekolah || '');
    setEditJenjang(sch.jenjang || 'SD');
    setEditAlamat(sch.alamat || '');
    setEditLatitude(sch.latitude || '');
    setEditLongitude(sch.longitude || '');
    setEditNoTelp(sch.no_telp || '');
    setEditEmail(sch.email || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditSekolahId(null);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sekolahs')
        .update({
          nama_sekolah: editNamaSekolah,
          jenjang: editJenjang,
          alamat: editAlamat,
          latitude: editLatitude ? parseFloat(editLatitude) : null,
          longitude: editLongitude ? parseFloat(editLongitude) : null,
          no_telp: editNoTelp || null,
          email: editEmail || null
        })
        .eq('id', editSekolahId);

      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Berhasil memperbarui profil sekolah: ${editNamaSekolah}` });
      handleCloseModal();
      fetchSekolah();
    } catch (err) {
      alert(`Gagal memperbarui data sekolah: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHapusSekolah = async (id, nama) => {
    const konfirmasi = window.confirm(
      `⚠️ PERINGATAN KERAS! ⚠️\nApakah Anda yakin ingin menghapus "${nama}"?\n\nMenghapus sekolah ini akan melenyapkan secara otomatis semua akun operator, data kelas, data guru, dan data siswa yang berafiliasi di dalamnya!`
    );
    if (!konfirmasi) return;

    try {
      const { error } = await supabase.from('sekolahs').delete().eq('id', id);
      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Lembaga institusi "${nama}" berhasil dihapus dari sistem SkoolaGo.` });
      fetchSekolah();
    } catch (err) {
      setPesan({ status: 'gagal', txt: `Gagal menghapus sekolah: ${err.message}` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-black">Pusat Registrasi Sekolah</h1>
        <p className="text-sm text-gray-500 mt-1">Daftarkan institusi sekolah baru ke dalam ekosistem SkoolaGo.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border font-semibold text-sm ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KIRI: Form Input Tambah Baru */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-black mb-4">Tambah Sekolah Baru</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Nama Sekolah *</label>
              <input
                type="text" required placeholder="nama sekolah"
                value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Jenjang Pendidikan *</label>
              <select
                value={jenjang}
                onChange={(e) => setJenjang(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black bg-white"
              >
                <option value="SD">Sekolah Dasar (SD)</option>
                <option value="MI">Madrasah Ibtidaiyah (MI)</option>
                <option value="SMP">Sekolah Menengah Pertama (SMP)</option>
                <option value="MTs">Madrasah Tsanawiyah (MTs)</option>
                <option value="SMA">Sekolah Menengah Atas (SMA)</option>
                <option value="SMK">Sekolah Menengah Kejuruan (SMK)</option>
                <option value="MA">Madrasah Aliyah (MA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Alamat Lengkap *</label>
              <textarea
                required rows="3" placeholder="alamat sekolah"
                value={alamat} onChange={(e) => setAlamat(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal resize-none text-black"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Latitude</label>
                <input
                  type="number" step="any" placeholder="latitude"
                  value={latitude} onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Longitude</label>
                <input
                  type="number" step="any" placeholder="longitude"
                  value={longitude} onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">No. Telp / WA Sekolah</label>
              <input
                type="text" placeholder="no. telp / wa sekolah"
                value={noTelp} onChange={(e) => setNoTelp(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Email Sekolah</label>
              <input
                type="email" placeholder="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-50 text-sm mt-2 cursor-pointer border-none"
            >
              {loading ? 'Menyimpan...' : 'Daftarkan Sekolah'}
            </button>
          </form>
        </div>

        {/* KANAN: Tabel Data Sekolah Terdaftar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <h3 className="text-lg font-bold text-black mb-4">Daftar Sekolah Didukung</h3>

          {fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Memuat data ekosistem sekolah...</div>
          ) : sekolahs.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Belum ada sekolah yang didaftarkan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">Kode</th>
                    <th className="py-3 px-2">Nama Institusi / Jenjang</th>
                    <th className="py-3 px-2">Kontak Alamat</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sekolahs.map((sch) => (
                    <tr key={sch.id} className="hover:bg-skoola-bg/20 transition-colors">
                      <td className="py-3 px-2 font-black text-skoola-indigo font-mono">{sch.kode_sekolah}</td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-black flex items-center gap-2">
                          {sch.nama_sekolah}
                          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded border ${
                            sch.jenjang === 'SMK' || sch.jenjang === 'MA' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            sch.jenjang === 'SMA' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            sch.jenjang === 'SMP' || sch.jenjang === 'MTs' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                            'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {sch.jenjang}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 max-w-xs truncate mt-0.5">{sch.alamat}</div>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <div className="text-black font-medium">{sch.no_telp || '-'}</div>
                        <div className="text-gray-400">{sch.email || '-'}</div>
                        <div className="text-gray-400 text-[10px] font-mono mt-0.5">GPS: {sch.latitude ? `${sch.latitude}, ${sch.longitude}` : '-'}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(sch)}
                            className="px-2 py-1 text-skoola-indigo bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold text-xs transition-all cursor-pointer border-none"
                          >
                            Ubah
                          </button>
                          <button
                            onClick={() => handleHapusSekolah(sch.id, sch.nama_sekolah)}
                            className="px-2 py-1 text-red-400 hover:text-red-600 bg-transparent rounded-lg font-bold text-xs transition-all cursor-pointer border-none"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* POP-UP MODAL EDIT MASTER INSTITUSI SEKOLAH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Ubah Profil Lembaga</h3>
                <p className="text-[11px] text-gray-400">Sesuaikan data identitas, jenjang nasional, maupun koordinat geo-lokasi.</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-black font-bold text-sm bg-gray-100 p-1.5 px-2.5 rounded-lg cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Sekolah *</label>
                <input
                  type="text" required
                  value={editNamaSekolah} onChange={(e) => setEditNamaSekolah(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jenjang Pendidikan *</label>
                <select
                  value={editJenjang} onChange={(e) => setEditJenjang(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
                >
                  <option value="SD">Sekolah Dasar (SD)</option>
                  <option value="MI">Madrasah Ibtidaiyah (MI)</option>
                  <option value="SMP">Sekolah Menengah Pertama (SMP)</option>
                  <option value="MTs">Madrasah Tsanawiyah (MTs)</option>
                  <option value="SMA">Sekolah Menengah Atas (SMA)</option>
                  <option value="SMK">Sekolah Menengah Kejuruan (SMK)</option>
                  <option value="MA">Madrasah Aliyah (MA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Alamat Lengkap *</label>
                <textarea
                  required rows="3"
                  value={editAlamat} onChange={(e) => setEditAlamat(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Latitude</label>
                  <input
                    type="number" step="any"
                    value={editLatitude} onChange={(e) => setEditLatitude(e.target.value)}
                    className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Longitude</label>
                  <input
                    type="number" step="any"
                    value={editLongitude} onChange={(e) => setEditLongitude(e.target.value)}
                    className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">No. Telp / WA Sekolah</label>
                <input
                  type="text"
                  value={editNoTelp} onChange={(e) => setEditNoTelp(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Email Sekolah</label>
                <input
                  type="email"
                  value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 bg-white sticky bottom-0">
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