import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function KelolaOperator() {
  const [sekolahs, setSekolahs] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // State Form Tambah Baru (Kiri)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 
  const [selectedSekolah, setSelectedSekolah] = useState('');
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  // BARU: State Manajemen Pop-Up Modal Edit Operator
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOperatorId, setEditOperatorId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editSelectedSekolah, setEditSelectedSekolah] = useState('');

  // 1. Ambil data sekolah & operator untuk tabel
  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const { data: dataSekolah } = await supabase.from('sekolahs').select('id, nama_sekolah, kode_sekolah');
      if (dataSekolah) setSekolahs(dataSekolah);

      const { data: dataOperator, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          role_global,
          sekolah_id,
          sekolahs!left (nama_sekolah, kode_sekolah)
        `)
        .eq('role_global', 'operator');
      
      if (!error && dataOperator) {
        setOperators(dataOperator);
      }
    } catch (err) {
      console.error('Error fetching operator data:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Handle Submit Pendaftaran Operator Sekolah
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    const cleanUsername = username.trim().toLowerCase();
    const virtualEmail = `${cleanUsername}@skoolago.com`;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: password,
        options: {
          data: {
            username: cleanUsername,
            role_global: 'operator',
            sekolah_id: selectedSekolah
          }
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            username: cleanUsername,
            role_global: 'operator',
            sekolah_id: selectedSekolah
          });

        if (profileError) {
          await supabase
            .from('users')
            .update({ username: cleanUsername, sekolah_id: selectedSekolah })
            .eq('id', authData.user.id);
        }
      }

      setPesan({ 
        status: 'sukses', 
        txt: `Akun Operator [ ${cleanUsername} ] berhasil dibuat dan disinkronkan ke database!` 
      });
      
      setUsername(''); setPassword(''); setSelectedSekolah('');
      setTimeout(() => { fetchData(); }, 1000);
    } catch (error) {
      setPesan({ status: 'gagal', txt: `Gagal mendaftarkan operator: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 3. BARU: Fungsi Kontrol Modal Edit Operator
  const handleOpenEditModal = (op) => {
    setEditOperatorId(op.id);
    setEditUsername(op.username || '');
    setEditSelectedSekolah(op.sekolah_id || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditOperatorId(null);
  };

  // 4. BARU: Handle Submit Update Perubahan Profil Operator (Mutasi Tugas)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editUsername.trim().toLowerCase(),
          sekolah_id: editSelectedSekolah || null
        })
        .eq('id', editOperatorId);

      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Profil operator @${editUsername} berhasil diperbarui!` });
      handleCloseModal();
      fetchData();
    } catch (err) {
      alert(`Gagal memperbarui data operator: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 5. Aksi Cabut Akses Operator
  const handleHapusOperator = async (id, name) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin mencabut akses dan menghapus akun operator "${name}"?`);
    if (!konfirmasi) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Akses operator "${name}" berhasil dihapus dari sistem.` });
      fetchData();
    } catch (err) {
      setPesan({ status: 'gagal', txt: `Gagal menghapus: ${err.message}` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-black">Manajemen Operator Sekolah</h1>
        <p className="text-sm text-gray-500 mt-1">Buat dan kelola hak akses akun operator perwakilan institusi sekolah.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border font-semibold text-sm ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL INPUT (SEBELAH KIRI) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-black mb-4">Buat Akun Operator</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Pilih Sekolah *</label>
              <select
                required
                value={selectedSekolah}
                onChange={(e) => setSelectedSekolah(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black bg-white"
              >
                <option value="">-- Pilih Institusi Sekolah --</option>
                {sekolahs.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.nama_sekolah} ({sch.kode_sekolah})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Username Operator *</label>
              <input
                type="text" required placeholder="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Password Awal *</label>
              <input
                type="password" required placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/30 border border-gray-200 rounded-xl text-sm outline-none focus:border-skoola-teal text-black"
              />
            </div>

            <button
              type="submit" disabled={loading || sekolahs.length === 0}
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-50 text-sm mt-2 cursor-pointer border-none"
            >
              {loading ? 'Memproses Akun...' : 'Generate Akun Operator'}
            </button>
          </form>
        </div>

        {/* TABEL LIST OPERATOR (SEBELAH KANAN) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-black mb-4">Daftar Akun Operator Profil</h3>

          {fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Memuat data akses operator...</div>
          ) : operators.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Belum ada akun operator yang dibuat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">Username Dashboard</th>
                    <th className="py-3 px-2">Sekolah Penugasan</th>
                    <th className="py-3 px-2">Status Sistem</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {operators.map((op) => (
                    <tr key={op.id} className="hover:bg-skoola-bg/20 transition-colors">
                      <td className="py-3 px-2 font-bold text-black">@{op.username}</td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-skoola-indigo">
                          {op.sekolahs?.nama_sekolah || 'Sekolah Tidak Terpeta'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Kode Otoritas: {op.sekolahs?.kode_sekolah || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                          Active Access
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(op)}
                            className="text-xs font-bold text-skoola-indigo bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-none"
                          >
                            Ubah
                          </button>
                          <button
                            onClick={() => handleHapusOperator(op.id, op.username)}
                            className="text-xs font-bold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg transition-all cursor-pointer border-none bg-transparent"
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

      {/* POP-UP MODAL EDIT MUTASI OPERATOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Ubah Mutasi Penugasan</h3>
                <p className="text-[11px] text-gray-400">Sesuaikan profil admin atau pindahkan lokasi penugasan sekolah.</p>
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
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Username Operator *</label>
                <input
                  type="text" required
                  value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Pindahkan Tugas Ke Sekolah *</label>
                <select
                  required
                  value={editSelectedSekolah} onChange={(e) => setEditSelectedSekolah(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
                >
                  <option value="">-- Pilih Sekolah Tujuan --</option>
                  {sekolahs.map((sch) => (
                    <option key={sch.id} value={sch.id}>{sch.nama_sekolah}</option>
                  ))}
                </select>
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