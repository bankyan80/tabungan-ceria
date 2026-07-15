import React, { useState, useEffect } from 'react';
import { type UserRow, type DatabaseState } from '../types';
import { 
  Lock, 
  LogIn, 
  ShieldAlert, 
  School, 
  Database, 
  User, 
  Briefcase, 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  Info,
  UserPlus,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { OsisLogo } from './OsisLogo';
import { sheetsService } from '../services/sheetsService';

interface LoginProps {
  database: DatabaseState;
  onLogin: (user: UserRow) => void;
  isConnected: boolean;
  onConnectGoogle: () => void;
  onRegisterSuccess?: () => Promise<void>;
}

// Regional API types for registration dropdowns
interface ApiRegion {
  id: string;
  name: string;
}

// Helper to generate a deterministic NIP for a teacher
export const getNipForWaliKelas = (user: UserRow): string => {
  if (user.user_id === 'U-101' || user.email === 'wali_kelas_1@example.com') {
    return '198503152011011002';
  }
  if (user.user_id === 'U-102' || user.email === 'wali_kelas_2@example.com') {
    return '198912242015042003';
  }
  // Fallback for custom teachers
  const idDigits = user.user_id.replace(/\D/g, '');
  const baseNum = idDigits ? parseInt(idDigits, 10) : 101;
  return `199001152020121${String(baseNum).padStart(3, '0')}`;
};

export const Login: React.FC<LoginProps> = ({
  database,
  onLogin,
  isConnected,
  onConnectGoogle,
  onRegisterSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'wali_siswa' | 'wali_kelas' | 'kepala_sekolah'>('wali_siswa');
  const [credential, setCredential] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Registration States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerRole, setRegisterRole] = useState<'wali_siswa' | 'wali_kelas'>('wali_siswa');
  const [isRegistering, setIsRegistering] = useState(false);

  // Wali Siswa / Student Form States
  const [regSiswaNama, setRegSiswaNama] = useState('');
  const [regSiswaNisn, setRegSiswaNisn] = useState('');
  const [regOrangTuaNama, setRegOrangTuaNama] = useState('');
  const [regSiswaKelas, setRegSiswaKelas] = useState('');

  // Guru Kelas Form States
  const [regGuruNama, setRegGuruNama] = useState('');
  const [regGuruEmail, setRegGuruEmail] = useState('');
  const [regGuruKelas, setRegGuruKelas] = useState('');

  // Regional API States
  const [provincesList, setProvincesList] = useState<ApiRegion[]>([]);
  const [regenciesList, setRegenciesList] = useState<ApiRegion[]>([]);
  const [districtsList, setDistrictsList] = useState<ApiRegion[]>([]);
  const [schoolsList, setSchoolsList] = useState<string[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedRegencyName, setSelectedRegencyName] = useState('');
  
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');
  
  const [selectedSchool, setSelectedSchool] = useState('');

  // Fetch Provinces
  useEffect(() => {
    if (isRegisterMode && provincesList.length === 0) {
      fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setProvincesList(data);
          }
        })
        .catch(err => console.error("Error fetching provinces:", err));
    }
  }, [isRegisterMode, provincesList]);

  // Fetch Regencies when province changes
  useEffect(() => {
    if (selectedProvinceId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvinceId}.json`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRegenciesList(data);
          }
        })
        .catch(err => console.error("Error fetching regencies:", err));
    } else {
      setRegenciesList([]);
    }
    setSelectedRegencyId('');
    setSelectedRegencyName('');
    setSelectedDistrictId('');
    setSelectedDistrictName('');
    setSelectedSchool('');
    setSchoolsList([]);
  }, [selectedProvinceId]);

  // Fetch Districts when regency changes
  useEffect(() => {
    if (selectedRegencyId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedRegencyId}.json`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setDistrictsList(data);
          }
        })
        .catch(err => console.error("Error fetching districts:", err));
    } else {
      setDistrictsList([]);
    }
    setSelectedDistrictId('');
    setSelectedDistrictName('');
    setSelectedSchool('');
    setSchoolsList([]);
  }, [selectedRegencyId]);

  // Generate realistic schools when district changes
  useEffect(() => {
    if (selectedDistrictId && selectedDistrictName) {
      const isLemahabang = selectedDistrictName.toLowerCase() === 'lemahabang';

      if (isLemahabang) {
        setSchoolsList([
          "SD NEGERI 1 LEUWIDINGDING",
          "SD NEGERI 1 ASEM",
          "SD NEGERI 1 CIPEUJEUH KULON",
          "SD NEGERI 2 CIPEUJEUH KULON",
          "SD NEGERI 1 CIPEUJEUH WETAN",
          "SD NEGERI 2 CIPEUJEUH WETAN",
          "SD NEGERI 3 CIPEUJEUH WETAN",
          "SD NEGERI 1 SINDANGLAUT",
          "SD NEGERI 1 LEMAHABANG KULON",
          "SD NEGERI 4 SIGONG",
          "SD NEGERI 1 LEMAHABANG",
          "SD NEGERI 2 LEMAHABANG",
          "SD NEGERI 1 SIGONG",
          "SD NEGERI 3 SIGONG",
          "SD NEGERI 1 SARAJAYA",
          "SD NEGERI 2 SARAJAYA",
          "SD NEGERI 1 PICUNGPUGUR",
          "SD NEGERI 1 TUK KARANGSUWUNG",
          "SD NEGERI 1 BELAWA",
          "SD NEGERI 2 BELAWA",
          "SD NEGERI 1 WANGKELANG",
          "SD IT AL IRSYAD AL ISLAMIYYAH",
          "KB A.H. PLUS",
          "KB AMALIA SALSABILA",
          "KB AZ-ZAHRA",
          "KB MUTIARA",
          "KB PALAPA",
          "KB PERMATA BUNDA",
          "PAUD AL HAMBRA",
          "PAUD AL- HIDAYAH",
          "PAUD AL-HUSNA",
          "PAUD AMANAH",
          "PAUD AN NAIM",
          "PAUD ASY - SYAFIIYAH",
          "PAUD BUDGENVIL",
          "PAUD TUNAS HARAPAN",
          "TK NEGERI LEMAHABANG",
          "TK AISYIYAH LEMAHABANG",
          "TK AL-AQSO",
          "TK AL-IRSYAD AL-ISLAMIYYAH",
          "TK BPP KENANGA",
          "TK GELATIK",
          "TK MELATI",
          "TK MUSLIMAT NU",
          "PAUD SPS MELATI"
        ]);
      } else {
        const districtTitleCase = selectedDistrictName
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const generatedSchools = [
          `SDN ${districtTitleCase} 01`,
          `SDN ${districtTitleCase} 02`,
          `SD Swasta ${districtTitleCase}`,
          `SD Islam Terpadu ${districtTitleCase}`,
          `SD Muhammadiyah ${districtTitleCase}`
        ];
        setSchoolsList(generatedSchools);
      }
    } else {
      setSchoolsList([]);
    }
    setSelectedSchool('');
  }, [selectedDistrictId, selectedDistrictName]);

  const classesList = database.kelas || [];

  // Initialize selected class dropdowns with first available class
  useEffect(() => {
    if (classesList.length > 0) {
      if (!regSiswaKelas) setRegSiswaKelas(classesList[0].kelas_id);
      if (!regGuruKelas) setRegGuruKelas(classesList[0].kelas_id);
    }
  }, [classesList, regSiswaKelas, regGuruKelas]);

  // Dynamic user matching based on selected Tab and Entered Credential
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputVal = credential.trim();
    const pinVal = pin.trim();

    if (!inputVal) {
      setError("NIK / NISN / NIP / NPSN tidak boleh kosong!");
      return;
    }

    if (!pinVal) {
      setError("PIN / Sandi Akses wajib diisi!");
      return;
    }

    // Auto-detect role from credential — try all three roles
    // 1. Try Wali Kelas (NIP, email, or user_id)
    const matchedTeacher = database.users.find(u => {
      if (u.role !== 'wali_kelas') return false;
      const nip = getNipForWaliKelas(u);
      return nip === inputVal || u.email.toLowerCase() === inputVal.toLowerCase() || u.user_id === inputVal;
    });

    if (matchedTeacher) {
      if (matchedTeacher.status === 'nonaktif') {
        setError("Status akun Guru nonaktif. Silakan hubungi Kepala Sekolah.");
        return;
      }
      const nip = getNipForWaliKelas(matchedTeacher);
      const expectedPin = nip.slice(-4);
      if (pinVal !== expectedPin) {
        setError("PIN / Sandi Akses salah. Gunakan 4 digit terakhir NIP sebagai PIN.");
        return;
      }
      setActiveTab('wali_kelas');
      onLogin(matchedTeacher);
      return;
    }

    // 2. Try Kepala Sekolah (NPSN)
    if (inputVal === '20103244') {
      const expectedPin = inputVal.slice(-4);
      if (pinVal !== expectedPin) {
        setError("PIN / Sandi Akses salah. Gunakan 4 digit terakhir NPSN sebagai PIN.");
        return;
      }
      const matchedKepsek = database.users.find(u => u.role === 'kepala_sekolah') || {
        user_id: "U-104",
        nama: "Drs. H. Mulyono",
        email: "kepala_sekolah@sekolah.id",
        role: "kepala_sekolah" as const,
        kelas_id: "",
        siswa_id: "",
        status: "aktif" as const
      };
      setActiveTab('kepala_sekolah');
      onLogin(matchedKepsek);
      return;
    }

    // 3. Try Wali Siswa (NISN or siswa_id)
    const matchedSiswa = database.siswa.find(
      s => s.nisn === inputVal || s.siswa_id === inputVal
    );

    if (matchedSiswa) {
      let matchedUser = database.users.find(
        u => u.role === 'wali_siswa' && u.siswa_id === matchedSiswa.siswa_id
      );

      if (!matchedUser) {
        matchedUser = {
          user_id: `U-WALI-${matchedSiswa.siswa_id}`,
          nama: `Orang Tua - ${matchedSiswa.nama}`,
          email: `wali_${matchedSiswa.siswa_id.toLowerCase()}@sekolah.id`,
          role: 'wali_siswa',
          kelas_id: '',
          siswa_id: matchedSiswa.siswa_id,
          status: 'aktif'
        };
      }

      if (matchedUser.status === 'nonaktif') {
        setError("Akun Orang Tua dinonaktifkan. Silakan hubungi Kepala Sekolah.");
        return;
      }

      const expectedPin = matchedSiswa.nisn.slice(-4);
      if (pinVal !== expectedPin) {
        setError("PIN / Sandi Akses salah. Gunakan 4 digit terakhir NISN sebagai PIN.");
        return;
      }
      setActiveTab('wali_siswa');
      onLogin(matchedUser);
      return;
    }

    // No match found
    setError("Kredensial tidak ditemukan. Silakan periksa kembali atau lakukan registrasi akun baru.");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsRegistering(true);

    if (!selectedProvinceId || !selectedRegencyId || !selectedDistrictId || !selectedSchool) {
      setError("Silakan pilih Provinsi, Kabupaten/Kota, Kecamatan, dan Nama Sekolah!");
      setIsRegistering(false);
      return;
    }

    try {
      if (registerRole === 'wali_siswa') {
        const nisnVal = regSiswaNisn.trim();
        const namaSiswaVal = regSiswaNama.trim();
        const namaOrangTuaVal = regOrangTuaNama.trim();
        const kelasIdVal = regSiswaKelas;

        if (!nisnVal || !namaSiswaVal || !kelasIdVal) {
          setError("Semua kolom bertanda bintang (*) wajib diisi!");
          setIsRegistering(false);
          return;
        }

        // Validate NISN uniqueness
        const existSiswa = database.siswa.find(s => s.nisn === nisnVal);
        if (existSiswa) {
          setError(`NISN ${nisnVal} sudah terdaftar atas nama ${existSiswa.nama}. Silakan langsung masuk di menu login.`);
          setIsRegistering(false);
          return;
        }

        const studentId = "S-" + crypto.randomUUID().slice(0, 8);
        
        const newSiswa = {
          siswa_id: studentId,
          nama: namaSiswaVal,
          nisn: nisnVal,
          kelas_id: kelasIdVal,
          saldo: 0,
          status: 'aktif' as const,
          provinsi: selectedProvinceName,
          kabupaten: selectedRegencyName,
          kecamatan: selectedDistrictName,
          sekolah: selectedSchool
        };

        const newUser = {
          user_id: `U-WALI-${studentId}`,
          nama: namaOrangTuaVal || `Orang Tua - ${namaSiswaVal}`,
          email: `wali_${studentId.toLowerCase()}@sekolah.id`,
          role: 'wali_siswa' as const,
          kelas_id: '',
          siswa_id: studentId,
          status: 'aktif' as const,
          provinsi: selectedProvinceName,
          kabupaten: selectedRegencyName,
          kecamatan: selectedDistrictName,
          sekolah: selectedSchool
        };

        await sheetsService.addSiswa(newSiswa, 'admin', '');
        await sheetsService.addUser(newUser, 'admin', '');

        if (onRegisterSuccess) {
          await onRegisterSuccess();
        }

        onLogin(newUser);

      } else {
        // Wali Kelas / Teacher
        const namaGuruVal = regGuruNama.trim();
        const emailGuruVal = regGuruEmail.trim();
        const kelasIdVal = regGuruKelas;

        if (!namaGuruVal || !emailGuruVal || !kelasIdVal) {
          setError("Semua kolom bertanda bintang (*) wajib diisi!");
          setIsRegistering(false);
          return;
        }

        // Validate Email uniqueness
        const existUser = database.users.find(u => u.email.toLowerCase() === emailGuruVal.toLowerCase());
        if (existUser) {
          setError(`Email ${emailGuruVal} sudah terdaftar. Silakan langsung masuk.`);
          setIsRegistering(false);
          return;
        }

        const teacherId = "U-" + crypto.randomUUID().slice(0, 8);
        const newUser = {
          user_id: teacherId,
          nama: namaGuruVal,
          email: emailGuruVal,
          role: 'wali_kelas' as const,
          kelas_id: kelasIdVal,
          siswa_id: '',
          status: 'aktif' as const,
          provinsi: selectedProvinceName,
          kabupaten: selectedRegencyName,
          kecamatan: selectedDistrictName,
          sekolah: selectedSchool
        };

        await sheetsService.addUser(newUser, 'admin', '');

        if (onRegisterSuccess) {
          await onRegisterSuccess();
        }

        onLogin(newUser);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError("Gagal melakukan registrasi: " + message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleQuickDemoClick = (tab: 'wali_siswa' | 'wali_kelas' | 'kepala_sekolah', value: string) => {
    setActiveTab(tab);
    setCredential(value);
    // Auto-fill PIN for quick demo
    const autoPin = value.slice(-4);
    setPin(autoPin);
    
    // Auto-login after set state
    setTimeout(() => {
      if (tab === 'wali_siswa') {
        const student = database.siswa.find(s => s.nisn === value || s.siswa_id === value);
        if (student) {
          const user = database.users.find(u => u.role === 'wali_siswa' && u.siswa_id === student.siswa_id) || {
            user_id: `U-WALI-${student.siswa_id}`,
            nama: `Orang Tua - ${student.nama}`,
            email: `wali_${student.siswa_id.toLowerCase()}@sekolah.id`,
            role: 'wali_siswa' as const,
            kelas_id: '',
            siswa_id: student.siswa_id,
            status: 'aktif' as const
          };
          onLogin(user);
        }
      } else if (tab === 'wali_kelas') {
        const teacher = database.users.find(u => u.role === 'wali_kelas' && (getNipForWaliKelas(u) === value || u.email === value));
        if (teacher) onLogin(teacher);
      } else if (tab === 'kepala_sekolah') {
        const kepsek = database.users.find(u => u.role === 'kepala_sekolah') || {
          user_id: "U-104",
          nama: "Drs. H. Mulyono",
          email: "kepala_sekolah@sekolah.id",
          role: "kepala_sekolah" as const,
          kelas_id: "",
          siswa_id: "",
          status: "aktif" as const
        };
        onLogin(kepsek);
      }
    }, 50);
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 sm:p-8 space-y-6">
        
        {/* Portal Header Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <OsisLogo size={64} />
          </div>
          <div>
            <p className="font-display font-black text-lg text-blue-600 uppercase tracking-wide">
              TABUNGAN<span className="underline decoration-4 decoration-amber-400">CERIA</span>
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Sistem Informasi Tabungan Kolektif Sekolah Mandiri
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-900 p-3.5 text-xs font-bold text-rose-950 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(225,29,72,1)]">
            <ShieldAlert size={18} className="text-rose-700 shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="leading-relaxed uppercase">{error}</p>
          </div>
        )}

        {isRegisterMode ? (
          /* REGISTRATION INTERFACE */
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setError(null);
                }}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft size={14} strokeWidth={3} /> Kembali
              </button>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">
                REGISTRASI AKUN BARU
              </h2>
            </div>

            {/* Role Switch Tabs inside Register Mode */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 border-2 border-slate-900">
              <button
                type="button"
                onClick={() => { setRegisterRole('wali_siswa'); setError(null); }}
                className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  registerRole === 'wali_siswa'
                    ? 'bg-emerald-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent border border-transparent'
                }`}
              >
                <Users size={14} strokeWidth={2.5} />
                <span>Orang Tua / Wali</span>
              </button>
              <button
                type="button"
                onClick={() => { setRegisterRole('wali_kelas'); setError(null); }}
                className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  registerRole === 'wali_kelas'
                    ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent border border-transparent'
                }`}
              >
                <Briefcase size={14} strokeWidth={2.5} />
                <span>Guru Kelas</span>
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {registerRole === 'wali_siswa' ? (
                /* ORANG TUA / SISWA FORM */
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      Nama Lengkap Siswa <span className="text-rose-600 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Rafli"
                      value={regSiswaNama}
                      onChange={(e) => setRegSiswaNama(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      NISN Siswa (10 Digit) <span className="text-rose-600 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="Contoh: 0012345678"
                      value={regSiswaNisn}
                      onChange={(e) => setRegSiswaNisn(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      Nama Lengkap Orang Tua / Wali
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={regOrangTuaNama}
                      onChange={(e) => setRegOrangTuaNama(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      Pilih Kelas <span className="text-rose-600 font-black">*</span>
                    </label>
                    <select
                      required
                      value={regSiswaKelas}
                      onChange={(e) => setRegSiswaKelas(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    >
                      {classesList.map(c => (
                        <option key={c.kelas_id} value={c.kelas_id}>
                          {c.nama_kelas} ({c.tahun_ajaran})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* GURU KELAS FORM */
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      Nama Lengkap Guru <span className="text-rose-600 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Rina Wijaya, S.Pd."
                      value={regGuruNama}
                      onChange={(e) => setRegGuruNama(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      Email Guru <span className="text-rose-600 font-black">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Contoh: rina@sekolah.id"
                      value={regGuruEmail}
                      onChange={(e) => setRegGuruEmail(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                      Pilih Kelas Pengampu <span className="text-rose-600 font-black">*</span>
                    </label>
                    <select
                      required
                      value={regGuruKelas}
                      onChange={(e) => setRegGuruKelas(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                    >
                      {classesList.map(c => (
                        <option key={c.kelas_id} value={c.kelas_id}>
                          {c.nama_kelas} ({c.tahun_ajaran})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* WILAYAH & SEKOLAH DROPDOWNS */}
              <div className="border-t-2 border-dashed border-slate-900 pt-4 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Data Wilayah & Sekolah <span className="text-rose-600 font-black">*</span>
                </p>

                {/* Provinsi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                    Pilih Provinsi <span className="text-rose-600 font-black">*</span>
                  </label>
                  <select
                    required
                    value={selectedProvinceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedProvinceId(id);
                      const name = provincesList.find(p => p.id === id)?.name || '';
                      setSelectedProvinceName(name);
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                  >
                    <option value="">{provincesList.length === 0 ? "Memuat Provinsi..." : "-- Pilih Provinsi --"}</option>
                    {provincesList.map(prov => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kabupaten/Kota */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                    Pilih Kabupaten/Kota <span className="text-rose-600 font-black">*</span>
                  </label>
                  <select
                    required
                    disabled={!selectedProvinceId}
                    value={selectedRegencyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedRegencyId(id);
                      const name = regenciesList.find(r => r.id === id)?.name || '';
                      setSelectedRegencyName(name);
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-0 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <option value="">-- Pilih Kabupaten/Kota --</option>
                    {regenciesList.map(reg => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kecamatan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                    Pilih Kecamatan <span className="text-rose-600 font-black">*</span>
                  </label>
                  <select
                    required
                    disabled={!selectedRegencyId}
                    value={selectedDistrictId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedDistrictId(id);
                      const name = districtsList.find(d => d.id === id)?.name || '';
                      setSelectedDistrictName(name);
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-0 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {districtsList.map(dist => (
                      <option key={dist.id} value={dist.id}>
                        {dist.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nama Sekolah */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                    Pilih Nama Sekolah <span className="text-rose-600 font-black">*</span>
                  </label>
                  <select
                    required
                    disabled={!selectedDistrictId}
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-0 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <option value="">-- Pilih Nama Sekolah --</option>
                    {schoolsList.map(sch => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black text-xs uppercase tracking-widest py-3.5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isRegistering ? 'Mendaftarkan...' : 'Daftar & Masuk Otomatis'}
                {!isRegistering && <CheckCircle2 size={14} strokeWidth={3} />}
              </button>
            </form>
          </div>
        ) : (
          /* STANDARD LOGIN INTERFACE */
          <>
            {/* Form Login */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                  NOMOR IDENTITAS / KREDENSIAL AKSES
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {activeTab === 'wali_siswa' && <User size={16} strokeWidth={2.5} />}
                    {activeTab === 'wali_kelas' && <GraduationCap size={16} strokeWidth={2.5} />}
                    {activeTab === 'kepala_sekolah' && <School size={16} strokeWidth={2.5} />}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan NISN Siswa, NIP Guru, atau NPSN Sekolah..."
                    value={credential}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCredential(val);
                      setError(null);
                      const inputVal = val.trim();
                      if (!inputVal) return;

                      // 1. Check if it's Kepsek NPSN
                      if (inputVal === '20103244') {
                        setActiveTab('kepala_sekolah');
                        return;
                      }

                      // 2. Check if it's a known Guru
                      const isTeacher = database.users.some(u => {
                        if (u.role !== 'wali_kelas') return false;
                        const nip = getNipForWaliKelas(u);
                        return nip === inputVal || u.email.toLowerCase() === inputVal.toLowerCase() || u.user_id === inputVal;
                      });
                      if (isTeacher) {
                        setActiveTab('wali_kelas');
                        return;
                      }

                      // 3. Check if it's a known Siswa/Wali
                      const isSiswa = database.siswa.some(
                        s => s.nisn === inputVal || s.siswa_id === inputVal
                      );
                      if (isSiswa) {
                        setActiveTab('wali_siswa');
                        return;
                      }

                      // Fallbacks based on string length & pattern
                      if (inputVal.length === 8 && /^\d+$/.test(inputVal)) {
                        setActiveTab('kepala_sekolah');
                      } else if (inputVal.includes('@') || inputVal.startsWith('U-') || inputVal.length > 12) {
                        setActiveTab('wali_kelas');
                      } else {
                        setActiveTab('wali_siswa');
                      }
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-900 pl-11 pr-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
                  PIN / Sandi Akses <span className="text-rose-600 font-black">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} strokeWidth={2.5} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="4 digit terakhir NISN / NIP / NPSN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-900 pl-11 pr-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest py-3.5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Masuk <LogIn size={14} strokeWidth={3} />
              </button>
            </form>

            {/* Switch to Register Button */}
            <div className="pt-2 text-center border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-blue-600 hover:text-blue-800 underline decoration-2 hover:decoration-4 transition-all"
              >
                <UserPlus size={14} strokeWidth={3} /> Daftar Akun Baru (Registrasi)
              </button>
            </div>
          </>
        )}

        {/* Cloud sync integration status in login portal */}
        {isConnected && (
          <div className="pt-2 border-t border-slate-200">
            <div className="bg-emerald-50 border-2 border-emerald-950 p-2.5 text-[9px] font-bold text-emerald-950 flex items-center gap-2">
              <Database size={12} className="text-emerald-700 animate-pulse" />
              <span className="uppercase tracking-wider">DATABASE SINKRON DENGAN GOOGLE SHEETS</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

