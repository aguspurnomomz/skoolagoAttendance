import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function AktivasiBiometrik() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('semua');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [pesan, setPesan] = useState({ status: '', txt: '' });

  // Data State
  const [listGabungan, setListGabungan] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rfidInput, setRfidInput] = useState('');
  
  // State Kamera & Upload File 
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // Menampung base64 snapshot atau objek file upload
  const [uploadMode, setUploadMode] = useState('upload'); // 'upload' atau 'kamera'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 1. Ambil data gabungan dari sekolah ini
  const fetchDataBiometrik = async () => {
    if (!profile?.sekolah_id) return;
    setFetchLoading(true);
    try {
      const { data: dataSiswa } = await supabase
        .from('siswas')
        .select('id, nama_lengkap, username, nis_nisn, rfid_number, is_face_registered, foto_url, kelases(nama_kelas_lengkap)')
        .eq('sekolah_id', profile.sekolah_id);

      const { data: dataPegawai } = await supabase
        .from('pegawai_sekolah')
        .select('id, pegawai_id, pegawais(id, nama_lengkap, username, jabatan, rfid_number, is_face_registered, foto_url)')
        .eq('sekolah_id', profile.sekolah_id);

      const siswaFormatted = (dataSiswa || []).map(s => ({
        id_asli: s.id,
        tipe: 'Siswa',
        nama: s.nama_lengkap,
        identitas_unik: `NISN: ${s.nis_nisn || '-'}`,
        keterangan: s.kelases?.nama_kelas_lengkap || 'Tanpa Kelas',
        rfid_number: s.rfid_number,
        is_face_registered: s.is_face_registered,
        foto_url: s.foto_url,
        tabel_target: 'siswas'
      }));

      const pegawaiFormatted = (dataPegawai || []).map(item => {
        const p = item.pegawais;
        return {
          id_asli: p?.id,
          tipe: 'Pegawai',
          nama: p?.nama_lengkap || 'No Name',
          identitas_unik: p?.jabatan || 'Staf',
          keterangan: `@${p?.username || '-'}`,
          rfid_number: p?.rfid_number,
          is_face_registered: p?.is_face_registered,
          foto_url: p?.foto_url,
          tabel_target: 'pegawais'
        };
      });

      setListGabungan([...siswaFormatted, ...pegawaiFormatted]);
    } catch (err) {
      console.error('Gagal memuat data biometrik:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchDataBiometrik();
  }, [profile]);

  // 2. Akses Kontrol Kamera 
  const startCamera = async () => {
    setIsCameraActive(true);
    setPreviewImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Gagal mengakses web camera laptop: " + err.message);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPreviewImage(dataUrl);
      stopCamera();
    }
  };

  // 3. Kontrol Unggah File Manual 
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result); // Simpan base64 data url untuk preview
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. Buka & Tutup Modal
  const handleOpenModal = (personil) => {
    setSelectedUser(personil);
    setRfidInput(personil.rfid_number || '');
    setPreviewImage(personil.foto_url || null);
    setUploadMode('upload');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    stopCamera();
    setIsModalOpen(false);
    setSelectedUser(null);
    setPreviewImage(null);
  };

  // Helper konversi dataURI base64 menjadi File Blob mentah untuk diunggah ke Supabase
  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  };

  // 5. Simpan Data & Upload Gambar Terintegrasi
  const handleSaveBiometrik = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setPesan({ status: '', txt: '' });

    try {
      let finalFotoUrl = selectedUser.foto_url;
      let statusWajahChecked = selectedUser.is_face_registered;

      // Logika Upload jika operator mengambil foto baru atau mengunggah file baru
      if (previewImage && previewImage.startsWith('data:image')) {
        const fileBlob = dataURLtoBlob(previewImage);
        const namaFile = `${selectedUser.tabel_target}/${selectedUser.id_asli}-${Date.now()}.jpg`;

        // Upload ke Supabase Storage Bucket 'wajah-personil'
        const { error: uploadError } = await supabase.storage
          .from('wajah-personil')
          .upload(namaFile, fileBlob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        // Dapatkan URL Publik gambar tersebut
        const { data: { publicUrl } } = supabase.storage
          .from('wajah-personil')
          .getPublicUrl(namaFile);

        finalFotoUrl = publicUrl;
        statusWajahChecked = true; // Otomatis aktifkan status Face AI jika gambar sukses terunggah
      }

      // Update Database Utama Target Pegawai / Siswa
      const { error: dbError } = await supabase
        .from(selectedUser.tabel_target)
        .update({
          rfid_number: rfidInput.trim() || null,
          is_face_registered: statusWajahChecked,
          foto_url: finalFotoUrl
        })
        .eq('id', selectedUser.id_asli);

      if (dbError) throw dbError;

      setPesan({ status: 'sukses', txt: `Sinkronisasi identitas biometrik [ ${selectedUser.nama} ] sukses dikunci!` });
      handleCloseModal();
      fetchDataBiometrik();
    } catch (err) {
      alert(`Gagal menyimpan kredensial biometrik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const dataTersaring = listGabungan.filter(item => {
    if (activeTab === 'siswa') return item.tipe === 'Siswa';
    if (activeTab === 'pegawai') return item.tipe === 'Pegawai';
    return true;
  });

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-black">Pusat Aktivasi Biometrik (RFID & Face)</h1>
        <p className="text-sm text-gray-400 mt-1">Daftarkan ID kartu fisik contactless atau aktifkan pengenalan wajah cerdas untuk siswa dan guru.</p>
      </div>

      {pesan.txt && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold ${
          pesan.status === 'sukses' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pesan.txt}
        </div>
      )}

      <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl w-fit">
        {['semua', 'siswa', 'pegawai'].map((tab) => (
          <button
            key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer ${
              activeTab === tab ? 'bg-white text-black shadow-xs' : 'text-gray-400 hover:text-black bg-transparent'
            }`}
          >
            {tab === 'semua' ? 'Semua Personil' : tab}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        {fetchLoading ? (
          <div className="text-center py-12 text-sm text-gray-400">Sinkronisasi status biometrik sekolah...</div>
        ) : dataTersaring.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Tidak ditemukan data personil untuk kategori filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-2">Foto</th>
                  <th className="py-3 px-2">Nama Personil</th>
                  <th className="py-3 px-2">Klasifikasi</th>
                  <th className="py-3 px-2 text-center">Status RFID</th>
                  <th className="py-3 px-2 text-center">Status Face AI</th>
                  <th className="py-3 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dataTersaring.map((item, idx) => (
                  <tr key={idx} className="hover:bg-skoola-bg/10 transition-colors">
                    <td className="py-3 px-2">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt="wajah" className="w-9 h-9 object-cover rounded-xl border border-gray-200" />
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
                        <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">💳 {item.rfid_number}</span>
                      ) : (
                        <span className="text-gray-300 text-xs italic">Belum Set</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.is_face_registered ? 'bg-teal-50 text-skoola-teal border-skoola-teal/20' : 'bg-gray-50 text-gray-300 border-gray-100 italic'
                      }`}>{item.is_face_registered ? '📸 Aktif' : 'Belum Ada'}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="text-xs font-bold text-skoola-indigo bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer border-none"
                      >
                        Konfigurasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POP-UP MODAL PANEL AKTIVASI BIOMETRIK */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-black">Sinkronisasi Media Absen</h3>
                <p className="text-[11px] text-gray-400">Pendaftaran RFID serta rekam foto wajah.</p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-black font-bold text-sm bg-gray-100 p-1.5 px-2.5 rounded-lg cursor-pointer border-none">✕</button>
            </div>

            <form onSubmit={handleSaveBiometrik} className="p-6 space-y-4 text-left overflow-y-auto max-h-[75vh]">
              {/* Target info */}
              <div className="p-3 bg-skoola-bg/10 rounded-xl border border-gray-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{selectedUser.tipe} Target</div>
                <div className="text-base font-black text-black">{selectedUser.nama}</div>
                <div className="text-xs text-gray-500">{selectedUser.identitas_unik} | {selectedUser.keterangan}</div>
              </div>

              {/* Input RFID */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Kode UID Nomor Kartu RFID</label>
                <input
                  type="text" placeholder="Masukkan nomor UID kartu"
                  value={rfidInput} onChange={(e) => setRfidInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-skoola-bg/20 border border-gray-200 rounded-xl text-sm text-black font-mono outline-none focus:border-skoola-teal"
                />
              </div>

              {/* Opsi Pendaftaran Wajah */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-wider">Registrasi Pola Wajah (Face Registration)</label>
                
                {/* Mode Selector */}
                <div className="flex gap-2 bg-gray-200/60 p-1 rounded-lg w-fit text-[11px] font-bold">
                  <button type="button" onClick={() => { stopCamera(); setUploadMode('upload'); }} className={`px-2.5 py-1 rounded border-none cursor-pointer ${uploadMode === 'upload' ? 'bg-white text-black' : 'text-gray-400'}`}>Upload File (Skenario 3)</button>
                  <button type="button" onClick={() => { setUploadMode('kamera'); startCamera(); }} className={`px-2.5 py-1 rounded border-none cursor-pointer ${uploadMode === 'kamera' ? 'bg-white text-black' : 'text-gray-400'}`}>Ambil Live (Skenario 2)</button>
                </div>

                {/* AREA JALUR KAMERA LIVE */}
                {uploadMode === 'kamera' && isCameraActive && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <video ref={videoRef} autoPlay playsInline className="w-48 h-48 rounded-xl object-cover border-2 border-skoola-teal bg-black" />
                    <button type="button" onClick={takeSnapshot} className="px-3 py-1.5 bg-skoola-teal text-white text-xs font-bold rounded-lg cursor-pointer border-none">📸 Ambil Gambar Wajah</button>
                  </div>
                )}

                {/* AREA JALUR UPLOAD FILE */}
                {uploadMode === 'upload' && (
                  <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs mt-2 text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-skoola-teal cursor-pointer" />
                )}

                {/* PREVIEW HASIL BOX */}
                {previewImage && (
                  <div className="mt-2 flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Preview Foto Terpilih</span>
                    <img src={previewImage} alt="Preview" className="w-32 h-32 object-cover rounded-xl border shadow-xs" />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 bg-white">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-all cursor-pointer border-none">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-black text-white font-bold rounded-xl text-xs hover:bg-skoola-teal transition-all cursor-pointer border-none">
                  {loading ? 'Mengunci Data...' : 'Sinkron Kredensial'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}