import React, { useState } from 'react';
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
  Info 
} from 'lucide-react';

interface LoginProps {
  database: DatabaseState;
  onLogin: (user: UserRow) => void;
  isConnected: boolean;
  onConnectGoogle: () => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'wali_siswa' | 'wali_kelas' | 'kepala_sekolah'>('wali_siswa');
  const [credential, setCredential] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Dynamic user matching based on selected Tab and Entered Credential
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputVal = credential.trim();
    if (!inputVal) {
      const fieldName = 
        activeTab === 'wali_siswa' ? 'NIK / NISN Siswa' : 
        activeTab === 'wali_kelas' ? 'NIP / NIK Guru' : 'NPSN Sekolah';
      setError(`${fieldName} tidak boleh kosong!`);
      return;
    }

    if (activeTab === 'wali_siswa') {
      // Find Student with this NIK/NISN
      const matchedSiswa = database.siswa.find(
        s => s.nisn === inputVal || s.siswa_id === inputVal
      );

      if (!matchedSiswa) {
        setError("NIK/NISN Siswa tidak ditemukan dalam database sekolah. Silakan periksa kembali atau pilih akun demo di bawah.");
        return;
      }

      // Find if there is a pre-existing parent user
      let matchedUser = database.users.find(
        u => u.role === 'wali_siswa' && u.siswa_id === matchedSiswa.siswa_id
      );

      // If no pre-existing parent user is found, create one dynamically
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

      onLogin(matchedUser);

    } else if (activeTab === 'wali_kelas') {
      // Find Teacher matching NIP/NIK, Email, or User ID
      const matchedTeacher = database.users.find(u => {
        if (u.role !== 'wali_kelas') return false;
        const nip = getNipForWaliKelas(u);
        return nip === inputVal || u.email.toLowerCase() === inputVal.toLowerCase() || u.user_id === inputVal;
      });

      if (!matchedTeacher) {
        setError("NIP/NIK Guru tidak terdaftar atau tidak cocok dengan database kami.");
        return;
      }

      if (matchedTeacher.status === 'nonaktif') {
        setError("Status akun Guru nonaktif. Silakan hubungi Kepala Sekolah.");
        return;
      }

      onLogin(matchedTeacher);

    } else if (activeTab === 'kepala_sekolah') {
      // Verify NPSN
      if (inputVal !== '20103244') {
        setError("NPSN Sekolah tidak terdaftar atau tidak valid. Silakan gunakan NPSN Demo: 20103244.");
        return;
      }

      // Find Kepala Sekolah user
      const matchedKepsek = database.users.find(u => u.role === 'kepala_sekolah') || {
        user_id: "U-104",
        nama: "Drs. H. Mulyono",
        email: "kepala_sekolah@sekolah.id",
        role: "kepala_sekolah" as const,
        kelas_id: "",
        siswa_id: "",
        status: "aktif" as const
      };

      onLogin(matchedKepsek);
    }
  };

  const handleQuickDemoClick = (tab: 'wali_siswa' | 'wali_kelas' | 'kepala_sekolah', value: string) => {
    setActiveTab(tab);
    setCredential(value);
    
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
          <div className="mx-auto w-16 h-16 bg-amber-400 border-4 border-slate-900 text-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <School size={36} strokeWidth={2.5} />
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

        {/* Dynamic Neo-Brutalist Tabs Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 border-2 border-slate-900">
          <button
            type="button"
            onClick={() => { setActiveTab('wali_siswa'); setCredential(''); setError(null); }}
            className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'wali_siswa'
                ? 'bg-emerald-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                : 'text-slate-600 hover:text-slate-900 bg-transparent border border-transparent'
            }`}
          >
            <Users size={14} strokeWidth={2.5} />
            <span>Orang Tua</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('wali_kelas'); setCredential(''); setError(null); }}
            className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'wali_kelas'
                ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                : 'text-slate-600 hover:text-slate-900 bg-transparent border border-transparent'
            }`}
          >
            <Briefcase size={14} strokeWidth={2.5} />
            <span>Guru Kelas</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('kepala_sekolah'); setCredential(''); setError(null); }}
            className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'kepala_sekolah'
                ? 'bg-amber-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                : 'text-slate-600 hover:text-slate-900 bg-transparent border border-transparent'
            }`}
          >
            <ShieldCheck size={14} strokeWidth={2.5} />
            <span>Kepsek</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-900 p-3.5 text-xs font-bold text-rose-950 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(225,29,72,1)]">
            <ShieldAlert size={18} className="text-rose-700 shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="leading-relaxed uppercase">{error}</p>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
              {activeTab === 'wali_siswa' && 'NIK / NISN SISWA'}
              {activeTab === 'wali_kelas' && 'NIP / NIK GURU'}
              {activeTab === 'kepala_sekolah' && 'NPSN SEKOLAH (8 DIGIT)'}
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
                placeholder={
                  activeTab === 'wali_siswa' ? 'Masukkan NIK atau NISN siswa (contoh: 0012345678)' :
                  activeTab === 'wali_kelas' ? 'Masukkan NIP atau NIK guru (contoh: 198503152011011002)' :
                  'Masukkan NPSN Sekolah (contoh: 20103244)'
                }
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-900 pl-11 pr-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">
              PIN / Sandi Akses (Opsional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={16} strokeWidth={2.5} />
              </div>
              <input
                type="password"
                placeholder="Dapat dikosongkan (Akses Instan)"
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
            Masuk Portal <LogIn size={14} strokeWidth={3} />
          </button>
        </form>

        {/* Divider line */}
        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 border-t-2 border-dashed border-slate-300"></div>
          <span className="relative bg-white px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Akses Cepat Uji Coba Peran
          </span>
        </div>

        {/* Helper Instructions with click-to-login mock accounts */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-1">
            <Info size={11} className="text-slate-900" /> Klik akun demo berikut untuk login otomatis:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Kepsek Demo Card */}
            <button
              type="button"
              onClick={() => handleQuickDemoClick('kepala_sekolah', '20103244')}
              className="group text-left p-2.5 bg-amber-50 hover:bg-amber-100/50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-widest inline-block bg-amber-400 text-slate-900 border-amber-900 mb-1">
                Kepala Sekolah
              </span>
              <div className="font-bold text-xs text-slate-900 truncate">Drs. H. Mulyono</div>
              <div className="font-mono text-[9px] text-slate-500 group-hover:text-amber-700">NPSN: <span className="font-black">20103244</span></div>
            </button>

            {/* Guru Kelas Demo 1 */}
            <button
              type="button"
              onClick={() => handleQuickDemoClick('wali_kelas', '198503152011011002')}
              className="group text-left p-2.5 bg-blue-50 hover:bg-blue-100/50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-widest inline-block bg-blue-500 text-white border-blue-900 mb-1">
                Guru Kelas 6A
              </span>
              <div className="font-bold text-xs text-slate-900 truncate">Ahmad Subarjo</div>
              <div className="font-mono text-[9px] text-slate-500 group-hover:text-blue-700">NIP: <span className="font-black">198503152011011002</span></div>
            </button>

            {/* Guru Kelas Demo 2 */}
            <button
              type="button"
              onClick={() => handleQuickDemoClick('wali_kelas', '198912242015042003')}
              className="group text-left p-2.5 bg-blue-50 hover:bg-blue-100/50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-widest inline-block bg-blue-500 text-white border-blue-900 mb-1">
                Guru Kelas 6B
              </span>
              <div className="font-bold text-xs text-slate-900 truncate">Siti Rahma</div>
              <div className="font-mono text-[9px] text-slate-500 group-hover:text-blue-700">NIP: <span className="font-black">198912242015042003</span></div>
            </button>

            {/* Orang Tua Demo 1 */}
            <button
              type="button"
              onClick={() => handleQuickDemoClick('wali_siswa', '0012345678')}
              className="group text-left p-2.5 bg-emerald-50 hover:bg-emerald-100/50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-widest inline-block bg-emerald-500 text-white border-emerald-900 mb-1">
                Wali Orang Tua
              </span>
              <div className="font-bold text-xs text-slate-900 truncate">Wali Adit Pratama</div>
              <div className="font-mono text-[9px] text-slate-500 group-hover:text-emerald-700">NIK Siswa: <span className="font-black">0012345678</span></div>
            </button>
          </div>
        </div>

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
