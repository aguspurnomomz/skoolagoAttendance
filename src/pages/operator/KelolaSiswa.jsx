import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function KelolaSiswa() {
  const { profile } = useAuth();
  const [siswas, setSiswas] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [opsiKelas, setOpsiKelas] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // State Form Tambah Siswa Baru (Kiri)
  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState(''); 
  const [nisNisn, setNisNisn] = useState('');   
  const [selectedKelasId, setSelectedKelasId] = useState(''); 
  const [jenisKelamin, setJenisKelamin] = useState('L');
  const [rfidNumber, setRfidNumber] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  // State Manajemen Pop-up Modal Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSiswaId, setEditSiswaId] = useState(null);
  const [editNamaLengkap, setEditNamaLengkap] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editNisNisn, setEditNisNisn] = useState('');
  const [editSelectedKelasId, setEditSelectedKelasId] = useState(''); 
  const [editJenisKelamin, setEditJenisKelamin] = useState('L');
  const [editRfidNumber, setEditRfidNumber] = useState('');
  const [editSelectedShift, setEditSelectedShift] = useState('');

  // 1. Ambil data Siswa, Shift Absen, dan Opsi Kelas dari Sekolah terkait
  const fetchData = async () => {
    if (!profile?.sekolah_id) return;
    setFetchLoading(true);
    try {
      const { data: dataShift } = await supabase
        .from('shift_absen')
        .select('id, nama_shift, jam_masuk')
        .eq('sekolah_id', profile.sekolah_id);
      if (dataShift) setShifts(dataShift);

      const { data: dataKelas } = await supabase
        .from('kelases')
        .select('id_kelas, nama_kelas_lengkap')
        .eq('sekolah_id', profile.sekolah_id)
        .order('nama_kelas_lengkap', { ascending: true });
      if (dataKelas) setOpsiKelas(dataKelas);

      const { data: dataSiswa, error } = await supabase
        .from('siswas')
        .select(`
          id,
          sekolah_id,
          username,
          nis_nisn,
          nama_lengkap,
          kelas_id,
          role,
          jenis_kelamin,
          rfid_number,
          shift_id,
          kelases!left (nama_kelas_lengkap), 
          shift_absen!left (nama_shift, jam_masuk)
        `)
        .eq('sekolah_id', profile.sekolah_id)
        .order('created_at', { ascending: false });

      if (!error && dataSiswa) setSiswas(dataSiswa);
    } catch (err) {
      console.error('Gagal memuat data siswa:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleOpenEditModal = (siswa) => {
    setEditSiswaId(siswa.id);
    setEditNamaLengkap(siswa.nama_lengkap || '');
    setEditUsername(siswa.username || '');
    setEditNisNisn(siswa.nis_nisn || '');
    setEditSelectedKelasId(siswa.kelas_id || ''); 
    setEditJenisKelamin(siswa.jenis_kelamin || 'L');
    setEditRfidNumber(siswa.rfid_number || '');
    setEditSelectedShift(siswa.shift_id || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditSiswaId(null);
  };

  // 3. Submit Pendaftaran Siswa Baru + Auto Create Supabase Auth Account
  const handleTambahSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPesan({ status: '', txt: '' });

    const cleanUsername = username.trim().toLowerCase();
    const virtualEmail = `${cleanUsername}@siswa.skoolago.com`;
    const passwordDefault = "siswa123"; // Password bawaan otomatis siswa

    try {
      // LANGKAH A: Daftarkan akun kredensial ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: passwordDefault,
        options: {
          data: {
            username: cleanUsername,
            role_global: 'siswa',
            sekolah_id: profile.sekolah_id
          }
        }
      });

      if (authError) throw authError;

      // LANGKAH B: Jika akun auth berhasil terbentuk, masukkan data ke tabel profil public.siswas
      if (authData?.user) {
        const { error: dbError } = await supabase
          .from('siswas')
          .insert([
            {
              id: authData.user.id, // Menyamakan ID UUID profil dengan data auth user
              sekolah_id: profile.sekolah_id,
              nama_lengkap: namaLengkap,
              username: cleanUsername,
              nis_nisn: nisNisn.trim(),
              kelas_id: selectedKelasId || null, 
              role: 'siswa', 
              jenis_kelamin: jenisKelamin,
              rfid_number: rfidNumber.trim() || null,
              shift_id: selectedShift || null,
              is_face_registered: false
            }
          ]);

        if (dbError) {
          // Rollback data auth jika insert ke public table gagal agar tidak ada data gantung
          console.error("Gagal sinkronisasi data profil, melakukan rollback...");
          throw dbError;
        }
      }

      setPesan({ status: 'sukses', txt: `Berhasil mendaftarkan siswa baru: ${namaLengkap}. Password login: ${passwordDefault}` });
      setNamaLengkap(''); setUsername(''); setNisNisn(''); setSelectedKelasId(''); setRfidNumber(''); setSelectedShift('');
      fetchData();
    } catch (error) {
      setPesan({ status: 'gagal', txt: `Gagal menyimpan siswa: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Update Data Siswa
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('siswas')
        .update({
          nama_lengkap: editNamaLengkap,
          username: editUsername.trim().toLowerCase(),
          nis_nisn: editNisNisn.trim(),
          kelas_id: editSelectedKelasId || null, 
          jenis_kelamin: editJenisKelamin,
          rfid_number: editRfidNumber.trim() || null,
          shift_id: editSelectedShift || null
        })
        .eq('id', editSiswaId);

      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Berhasil memperbarui data siswa: ${editNamaLengkap}` });
      handleCloseModal();
      fetchData();
    } catch (error) {
      alert(`Gagal memperbarui data siswa: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 5. Aksi Hapus Siswa
  const handleHapusSiswa = async (id, nama) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus siswa bernama "${nama}"?`);
    if (!konfirmasi) return;

    try {
      const { error } = await supabase.from('siswas').delete().eq('id', id);
      if (error) throw error;

      setPesan({ status: 'sukses', txt: `Data siswa "${nama}" berhasil dihapus dari sistem.` });
      fetchData();
    } catch (error) {
      setPesan({ status: 'gagal', txt: `Gagal menghapus data siswa: ${error.message}` });
    }
  };

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative text-left">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-black">Manajemen Data Siswa Sekolah</h1>
        <p className="text-sm text-gray-400 mt-1">Kelola data murid, pemetaan kelas, pendaftaran kartu RFID, dan alokasi shift absen masuk.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COMPONENT KIRI: FORM PENDAFTARAN SISWA */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs h-fit">
          <h3 className="text-base font-bold text-black mb-4">Registrasi Murid Baru</h3>
          
          <form onSubmit={handleTambahSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Lengkap Murid *</label>
              <input
                type="text" required placeholder="nama lengkap"
                value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Username Akun Murid *</label>
              <input
                type="text" required placeholder="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">NISN (Nomor Induk) *</label>
              <input
                type="text" required placeholder="nomor induk siswa"
                value={nisNisn} onChange={(e) => setNisNisn(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Ploting Rombel Kelas *</label>
              <select
                required
                value={selectedKelasId} onChange={(e) => setSelectedKelasId(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
              >
                <option value="">-- Pilih Kelas Terdaftar --</option>
                {opsiKelas.map((kls) => (
                  <option key={kls.id_kelas} value={kls.id_kelas}>{kls.nama_kelas_lengkap}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jenis Kelamin *</label>
              <select
                value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">UID Nomor Kartu RFID </label>
              <input
                type="text" placeholder="input manual atau tempel kartu"
                value={rfidNumber} onChange={(e) => setRfidNumber(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Alokasi Aturan Shift </label>
              <select
                value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white"
              >
                <option value="">-- Pilih Shift --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama_shift} ({s.jam_masuk.substring(0,5)})</option>
                ))}
              </select>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full mt-2 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-skoola-teal transition-all disabled:opacity-40 cursor-pointer border-none"
            >
              {loading ? 'Menyimpan...' : 'Simpan Data Siswa'}
            </button>
          </form>
        </div>

        {/* COMPONENT KANAN: TABEL REKAPAN MURID AKTIF */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <h3 className="text-base font-bold text-black mb-4">Daftar Siswa Aktif Terdaftar</h3>

          {fetchLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Sinkronisasi data database siswa...</div>
          ) : siswas.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Belum ada data siswa yang diinput untuk lembaga sekolah ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">Nama Murid</th>
                    <th className="py-3 px-2">Kelas / NISN</th>
                    <th className="py-3 px-2">RFID Tag</th>
                    <th className="py-3 px-2">Jadwal Shift</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {siswas.map((siswa) => (
                    <tr key={siswa.id} className="hover:bg-skoola-bg/10 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-bold text-black">{siswa.nama_lengkap}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          @{siswa.username} | {siswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-0.5 bg-skoola-bg text-black text-[11px] font-bold rounded border border-gray-200">
                          {siswa.kelases?.nama_kelas_lengkap || 'Tanpa Rombel'}
                        </span>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">NISN: {siswa.nis_nisn}</div>
                      </td>
                      <td className="py-3 px-2 text-xs font-mono text-gray-600">
                        {siswa.rfid_number ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-black border border-gray-200 font-bold">✨ {siswa.rfid_number}</span>
                        ) : (
                          <span className="text-gray-300 italic">Belum Set</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {siswa.shift_absen ? (
                          <>
                            <div className="text-xs font-bold text-skoola-indigo">{siswa.shift_absen.nama_shift}</div>
                            <div className="text-[10px] text-gray-400 font-mono">Batas: {siswa.shift_absen.jam_masuk?.substring(0, 5)}</div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Bebas</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(siswa)}
                            className="text-xs font-bold text-skoola-indigo bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-none"
                          >
                            Ubah
                          </button>
                          <button
                            onClick={() => handleHapusSiswa(siswa.id, siswa.nama_lengkap)}
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

      {/* MODAL POP-UP DIALOG EDIT DATA SISWA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">⚙️ Perbarui Data Siswa</h3>
                <p className="text-[11px] text-gray-400">Modifikasi data kelas, registrasi ulang rfid, atau ubah shift jam masuk.</p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-black font-bold text-sm bg-gray-100 p-1.5 px-2.5 rounded-lg cursor-pointer border-none">✕</button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Nama Lengkap Murid *</label>
                <input type="text" required value={editNamaLengkap} onChange={(e) => setEditNamaLengkap(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Username Akun *</label>
                <input type="text" required value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">NISN (Nomor Induk) *</label>
                <input type="text" required value={editNisNisn} onChange={(e) => setEditNisNisn(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal bg-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Ploting Rombel Kelas *</label>
                <select required value={editSelectedKelasId} onChange={(e) => setEditSelectedKelasId(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                  <option value="">-- Pilih Kelas Terdaftar --</option>
                  {opsiKelas.map((kls) => (
                    <option key={kls.id_kelas} value={kls.id_kelas}>{kls.nama_kelas_lengkap}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Jenis Kelamin *</label>
                <select value={editJenisKelamin} onChange={(e) => setEditJenisKelamin(e.target.value)} className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black outline-none focus:border-skoola-teal bg-white">
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">UID Nomor Kartu RFID</label>
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