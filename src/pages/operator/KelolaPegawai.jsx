import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function KelolaPegawai() {
  const { profile } = useAuth();
  const [pegawais, setPegawais] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('L'); 
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('Guru');
  const [rfidNumber, setRfidNumber] = useState(''); 
  const [selectedShift, setSelectedShift] = useState(''); 
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editJembatanId, setEditJembatanId] = useState(null);
  const [editPegawaiId, setEditPegawaiId] = useState(null);
  const [editNamaLengkap, setEditNamaLengkap] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('L');
  const [editNip, setEditNip] = useState('');
  const [editJabatan, setEditJabatan] = useState('Guru');
  const [editRfidNumber, setEditRfidNumber] = useState('');
  const [editSelectedShift, setEditSelectedShift] = useState('');

  const fetchData = async () => {
    if (!profile?.sekolah_id) return;
    setFetchLoading(true);
    try {
      const { data: dataShift } = await supabase
        .from('shift_absen')
        .select('id, nama_shift, jam_masuk')
        .eq('sekolah_id', profile.sekolah_id);
      if (dataShift) setShifts(dataShift);

      const { data: dataPegawai, error } = await supabase
        .from('pegawai_sekolah')
        .select(`
          id,
          pegawai_id,
          shift_id,
          role_sekolah,
          pegawais (id, nama_lengkap, username, jenis_kelamin, nip, jabatan, rfid_number),
          shift_absen!left (nama_shift, jam_masuk)
        `)
        .eq('sekolah_id', profile.sekolah_id);

      if (!error && dataPegawai) setPegawais(dataPegawai);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const dapatkanRoleSekolah = (jabatanValue) => {
    if (jabatanValue === 'Staf Administrasi' || jabatanValue === 'Keamanan') return 'staf';
    if (jabatanValue === 'Kepala Sekolah') return 'kepsek';
    return 'guru';
  };

  const handleOpenEditModal = (item) => {
    const p = item.pegawais;
    if (!p) return;

    setEditJembatanId(item.id);
    setEditPegawaiId(p.id);
    setEditNamaLengkap(p.nama_lengkap || '');
    setEditUsername(p.username || '');
    setEditJenisKelamin(p.jenis_kelamin || 'L');
    setEditNip(p.nip || '');
    setEditJabatan(p.jabatan || 'Guru');
    setEditRfidNumber(p.rfid_number || '');
    setEditSelectedShift(item.shift_id || '');
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditJembatanId(null);
    setEditPegawaiId(null);
  };

  // 3. Submit Pendaftaran Pegawai Baru + Auto Create Supabase Auth Account
  const handleTambahSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    const cleanUsername = username.trim().toLowerCase();
    const virtualEmail = `${cleanUsername}@guru.skoolago.com`;
    const passwordDefault = "guru123"; // Password bawaan otomatis guru/pegawai

    try {
      // LANGKAH A: Daftarkan kredensial login ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: passwordDefault,
        options: {
          data: {
            username: cleanUsername,
            role_global: 'guru',
            sekolah_id: profile.sekolah_id
          }
        }
      });

      if (authError) throw authError;

      // LANGKAH B: Masukkan data ke tabel public.pegawais menggunakan UUID Auth
      if (authData?.user) {
        const { error: errorPegawai } = await supabase
          .from('pegawais')
          .insert([
            {
              id: authData.user.id, // Samakan ID agar memicu relasi foreign key auth
              nama_lengkap: namaLengkap,
              username: cleanUsername,
              jenis_kelamin: jenisKelamin, 
              nip: nip || null,
              jabatan: jabatan,
              rfid_number: rfidNumber || null,
              is_face_registered: false 
            }
          ]);

        if (errorPegawai) throw errorPegawai;

        // LANGKAH C: Buat jembatan relasi multi-tenant di tabel pegawai_sekolah
        const { error: errorJembatan } = await supabase
          .from('pegawai_sekolah')
          .insert([
            {
              pegawai_id: authData.user.id,
              sekolah_id: profile.sekolah_id,
              shift_id: selectedShift || null, 
              role_sekolah: dapatkanRoleSekolah(jabatan)
            }
          ]);

        if (errorJembatan) throw errorJembatan;
      }

      setPesan({ status: 'sukses', txt: `Berhasil mendaftarkan personil: ${namaLengkap}. Password login: ${passwordDefault}` });
      setNamaLengkap(''); setUsername(''); setNip(''); setRfidNumber(''); setSelectedShift('');
      fetchData();
    } catch (error) {
      setPesan({ status: 'gagal', txt: `Gagal menyimpan data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: errorUpdatePegawai } = await supabase
        .from('pegawais')
        .update({
          nama_lengkap: editNamaLengkap,
          username: editUsername.trim().toLowerCase(),
          jenis_kelamin: editJenisKelamin,
          nip: editNip || null,
          jabatan: editJabatan,
          rfid_number: editRfidNumber || null
        })
        .eq('id', editPegawaiId);

      if (errorUpdatePegawai) throw errorUpdatePegawai;

      const { error: errorUpdateJembatan } = await supabase
        .from('pegawai_sekolah')
        .update({
          shift_id: editSelectedShift || null,
          role_sekolah: dapatkanRoleSekolah(editJabatan)
        })
        .eq('id', editJembatanId);

      if (errorUpdateJembatan) throw errorUpdateJembatan;

      setPesan({ status: 'sukses', txt: `Berhasil memperbarui data: ${editNamaLengkap}` });
      handleCloseModal();
      fetchData();
    } catch (error) {
      alert(`Gagal memperbarui data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHapusPegawai = async (idPegawaiSekolah, idPegawaiAsli, namaPegawai) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus ${namaPegawai}?`);
    if (!konfirmasi) return;

    try {
      const { error: errorJembatan } = await supabase
        .from('pegawai_sekolah')
        .delete()
        .eq('id', idPegawaiSekolah);

      if (errorJembatan) throw errorJembatan;
      await supabase.from('pegawais').delete().eq('id', idPegawaiAsli);

      setPesan({ status: 'sukses', txt: `Data ${namaPegawai} berhasil dihapus.` });
      fetchData();
    } catch (error) {
      setPesan({ status: 'gagal', txt: `Gagal menghapus data: ${error.message}` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative text-left">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-black">Manajemen Data Pegawai & Guru</h1>
        <p className="text-sm text-gray-400 mt-1">Kelola data kepegawaian, jabatan, registrasi kartu RFID, dan ploting jam kerja.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Pendaftaran Pegawai */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs h-fit">
          <h3 className="text-base font-bold text-black mb-4">Registrasi Pegawai</h3>
          
          <form onSubmit={handleTambahSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Lengkap *</label>
              <input type="text" required placeholder="nama lengkap" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Username *</label>
              <input type="text" required placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jenis Kelamin *</label>
              <select value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">NIP / NUPTK</label>
              <input type="text" placeholder="nomor induk kepegawaian" value={nip} onChange={(e) => setNip(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Role / Jabatan *</label>
              <select value={jabatan} onChange={(e) => setJabatan(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                <option value="Guru">Guru / Tenaga Pengajar</option>
                <option value="Kepala Sekolah">Kepala Sekolah</option>
                <option value="Staf Administrasi">Staf Administrasi / TU</option>
                <option value="Keamanan">Petugas Keamanan / Satpam</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">UID Nomor Kartu RFID</label>
              <input type="text" placeholder="input manual atau tempel kartu" value={rfidNumber} onChange={(e) => setRfidNumber(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Alokasi Aturan Shift</label>
              <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                <option value="">-- Pilih Shift --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama_shift} ({s.jam_masuk.substring(0,5)})</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full mt-2 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-40 cursor-pointer border-none">
              {loading ? 'Menyimpan...' : 'Simpan Data Pegawai'}
            </button>
          </form>
        </div>

        {/* Tabel Daftar Personil */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <h3 className="text-base font-bold text-black mb-4">Daftar Personil Terdaftar</h3>

          {fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Sinkronisasi data pegawai...</div>
          ) : pegawais.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Belum ada data personil terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">Nama / Identitas</th>
                    <th className="py-3 px-2">Jabatan / Role</th>
                    <th className="py-3 px-2">RFID Tag</th>
                    <th className="py-3 px-2">Ketentuan Waktu</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pegawais.map((item) => {
                    const p = item.pegawais;
                    const s = item.shift_absen;
                    if (!p) return null;

                    return (
                      <tr key={item.id} className="hover:bg-skoola-bg/10 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-bold text-black">{p.nama_lengkap}</div>
                          <div className="text-xs text-gray-400 font-mono">{p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} | @{p.username || '-'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">NIP: {p.nip || '-'}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                              p.jabatan === 'Kepala Sekolah' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              p.jabatan === 'Guru' ? 'bg-skoola-teal/10 text-skoola-teal border-skoola-teal/30' : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>{p.jabatan}</span>
                            <div className="text-[10px] text-gray-400 font-mono italic">Sys-Role: {item.role_sekolah}</div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-xs font-mono text-gray-600">
                          {p.rfid_number ? <span className="bg-gray-100 px-1.5 py-0.5 rounded text-black border border-gray-200 font-bold">✨ {p.rfid_number}</span> : <span className="text-gray-300 italic">Kosong</span>}
                        </td>
                        <td className="py-3 px-2">
                          {s ? (
                            <>
                              <div className="text-xs font-bold text-skoola-indigo">{s.nama_shift}</div>
                              <div className="text-[10px] text-gray-400 font-mono">Masuk: {s.jam_masuk?.substring(0, 5)}</div>
                            </>
                          ) : <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Belum Diplot</span>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs font-bold text-skoola-indigo bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-none">Ubah</button>
                            <button onClick={() => handleHapusPegawai(item.id, p.id, p.nama_lengkap)} className="text-xs font-bold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg transition-all cursor-pointer border-none bg-transparent">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal Edit Pegawai */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Ubah Data Personil</h3>
                <p className="text-[11px] text-gray-400">Perbarui profil dan alokasikan jadwal masuk kerja.</p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-black font-bold text-sm bg-gray-100 p-1.5 px-2.5 rounded-lg cursor-pointer border-none">✕</button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Lengkap & Gelar *</label>
                <input type="text" required value={editNamaLengkap} onChange={(e) => setEditNamaLengkap(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Username Akun *</label>
                <input type="text" required value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jenis Kelamin *</label>
                <select value={editJenisKelamin} onChange={(e) => setEditJenisKelamin(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">NIP / NUPTK</label>
                <input type="text" value={editNip} onChange={(e) => setEditNip(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jabatan / Peran *</label>
                <select value={editJabatan} onChange={(e) => setEditJabatan(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                  <option value="Guru">Guru / Tenaga Pengajar</option>
                  <option value="Kepala Sekolah">Kepala Sekolah</option>
                  <option value="Staf Administrasi">Staf Administrasi / TU</option>
                  <option value="Keamanan">Petugas Keamanan / Satpam</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Kode UID RFID</label>
                <input type="text" value={editRfidNumber} onChange={(e) => setEditRfidNumber(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Alokasi Aturan Shift</label>
                <select value={editSelectedShift} onChange={(e) => setEditSelectedShift(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                  <option value="">-- Belum ditentukan / Tanpa Shift --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama_shift} ({s.jam_masuk.substring(0,5)})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 bg-white sticky bottom-0">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-all cursor-pointer border-none">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-skoola-indigo text-white font-bold rounded-xl text-xs hover:bg-opacity-90 transition-all cursor-pointer border-none">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}