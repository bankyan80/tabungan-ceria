import { useState, useEffect } from 'react';
import { type UserRole, type DatabaseState, type SiswaRow, type TransaksiRow, type SiswaStatus, type TransaksiJenis, type UserRow } from './types';
import { sheetsService } from './services/sheetsService';
import { initAuth, googleSignIn, logout } from './services/firebaseAuth';
import { RoleSelector } from './components/RoleSelector';
import { WaliKelasDashboard } from './components/WaliKelasDashboard';
import { WaliSiswaDashboard } from './components/WaliSiswaDashboard';
import { KepalaSekolahDashboard } from './components/KepalaSekolahDashboard';
import { Login } from './components/Login';
import { OsisLogo } from './components/OsisLogo';
import { ShieldCheck, Database, LayoutGrid, Info, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Authentication & Integration State
  const [isConnected, setIsConnected] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom Portal Authentication State
  const [loggedInUser, setLoggedInUser] = useState<UserRow | null>(() => {
    const saved = localStorage.getItem('tabungan_ceria_logged_in_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Current active role determined by logged in user
  const currentRole = loggedInUser?.role || 'kepala_sekolah';

  // Active Context Selections
  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    const saved = localStorage.getItem('tabungan_ceria_logged_in_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'wali_kelas' && u.kelas_id) return u.kelas_id;
      } catch {}
    }
    return 'K-101';
  });

  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(() => {
    const saved = localStorage.getItem('tabungan_ceria_logged_in_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'wali_siswa' && u.siswa_id) return u.siswa_id;
      } catch {}
    }
    return 'S-101';
  });

  // Core Database State — initialize synchronously from local storage so Login works immediately
  const [database, setDatabase] = useState<DatabaseState>(() => {
    try {
      const saved = localStorage.getItem('tabungan_ceria_local_db');
      if (saved) {
        const parsed = JSON.parse(saved) as DatabaseState;
        if (parsed.users?.length > 0) return parsed;
      }
    } catch {}
    return {
      users: [
        { user_id: "U-101", nama: "Ahmad Subarjo", email: "wali_kelas_1@example.com", role: "wali_kelas", kelas_id: "K-101", siswa_id: "", status: "aktif" },
        { user_id: "U-102", nama: "Siti Rahma", email: "wali_kelas_2@example.com", role: "wali_kelas", kelas_id: "K-102", siswa_id: "", status: "aktif" },
        { user_id: "U-103", nama: "Rudi Pratama", email: "wali_siswa_1@example.com", role: "wali_siswa", kelas_id: "", siswa_id: "S-101", status: "aktif" },
        { user_id: "U-104", nama: "Drs. H. Mulyono", email: "kepala_sekolah@example.com", role: "kepala_sekolah", kelas_id: "", siswa_id: "", status: "aktif" }
      ],
      kelas: [
        { kelas_id: "K-101", nama_kelas: "Kelas 6A", wali_kelas_id: "wali_kelas_1@example.com", tahun_ajaran: "2026/2027" },
        { kelas_id: "K-102", nama_kelas: "Kelas 6B", wali_kelas_id: "wali_kelas_2@example.com", tahun_ajaran: "2026/2027" }
      ],
      siswa: [
        { siswa_id: "S-101", nama: "Adit Pratama", nisn: "0012345678", kelas_id: "K-101", saldo: 150000, status: "aktif" },
        { siswa_id: "S-102", nama: "Budi Santoso", nisn: "0023456789", kelas_id: "K-101", saldo: 75000, status: "aktif" },
        { siswa_id: "S-103", nama: "Citra Lestari", nisn: "0034567890", kelas_id: "K-101", saldo: 200000, status: "aktif" },
        { siswa_id: "S-104", nama: "Dina Amalia", nisn: "0045678901", kelas_id: "K-102", saldo: 50000, status: "aktif" }
      ],
      transaksi: [],
      logs: []
    };
  });

  // Load database on load (either from sheets if connected, or local storage fallback)
  useEffect(() => {
    // 1. Listen for Google Auth state
    const unsubscribe = initAuth(
      async (user, token) => {
        setUserEmail(user.email);
        setUserDisplayName(user.displayName);
        
        // Link Sheets Service
        sheetsService.setAccessToken(token);
        const savedSheetId = sheetsService.getSpreadsheetId();
        
        if (savedSheetId) {
          setIsConnected(true);
          setSpreadsheetId(savedSheetId);
          // Load data from Google Sheets
          await handleRefreshData();
        } else {
          // Connected Auth but Spreadsheet not created/selected yet.
          // Try to automatically connect or initialize spreadsheet
          try {
            const id = await sheetsService.connectOrInitialize(token, user.email || '', user.displayName || '');
            setSpreadsheetId(id);
            setIsConnected(true);
            await handleRefreshData();
          } catch (err) {
            console.error("Gagal inisialisasi spreadsheet otomatis:", err);
            // Fallback load local data
            await loadLocalDatabase();
          }
        }
      },
      async () => {
        // Not signed in with Google
        setIsConnected(false);
        setSpreadsheetId(null);
        setUserEmail(null);
        setUserDisplayName(null);
        sheetsService.disconnect();
        // Load local/offline fallback data
        await loadLocalDatabase();
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync active selections when loggedInUser changes
  useEffect(() => {
    if (loggedInUser) {
      if (loggedInUser.role === 'wali_kelas' && loggedInUser.kelas_id) {
        setSelectedKelasId(loggedInUser.kelas_id);
      } else if (loggedInUser.role === 'wali_siswa' && loggedInUser.siswa_id) {
        setSelectedSiswaId(loggedInUser.siswa_id);
      }
    }
  }, [loggedInUser]);

  // Helper to load offline local database
  const loadLocalDatabase = async () => {
    const data = await sheetsService.loadAllData();
    setDatabase(data);
  };

  // Synchronize/Refresh Data from Sheets or Local
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const data = await sheetsService.loadAllData();
      setDatabase(data);
    } catch (err) {
      console.error("Gagal menyinkronkan data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Google Login click handler
  const handleConnectGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUserEmail(result.user.email);
        setUserDisplayName(result.user.displayName);
        
        // Initializing spreadsheet
        const id = await sheetsService.connectOrInitialize(
          result.accessToken, 
          result.user.email || '', 
          result.user.displayName || ''
        );
        setSpreadsheetId(id);
        setIsConnected(true);
        await handleRefreshData();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Koneksi Google Sheets dibatalkan atau gagal: " + message);
    }
  };

  // Disconnect Google Sheets
  const handleDisconnectGoogle = async () => {
    const confirmDis = window.confirm("Apakah Anda yakin ingin memutuskan hubungan dengan Google Sheets? Aplikasi akan beralih kembali ke mode penyimpanan demo lokal.");
    if (!confirmDis) return;

    await logout();
    setIsConnected(false);
    setSpreadsheetId(null);
    setUserEmail(null);
    setUserDisplayName(null);
    sheetsService.disconnect();
    await loadLocalDatabase();
  };

  // Business logic callback: Add Student
  const handleAddSiswa = async (name: string, nisn: string, status: SiswaStatus) => {
    const newStudent: SiswaRow = {
      siswa_id: "S-" + crypto.randomUUID().slice(0, 8),
      nama: name,
      nisn: nisn,
      kelas_id: selectedKelasId,
      saldo: 0,
      status: status
    };

    await sheetsService.addSiswa(newStudent, currentRole, loggedInUser?.email || userEmail || '');
    // Reload state
    await handleRefreshData();
  };

  // Business logic callback: Add Transaction
  const handleAddTransaksi = async (siswaId: string, jenis: TransaksiJenis, nominal: number, keterangan: string, foto?: string) => {
    const newTx: TransaksiRow = {
      transaksi_id: "T-" + crypto.randomUUID().slice(0, 8),
      siswa_id: siswaId,
      tanggal: new Date().toISOString().substring(0, 10),
      jenis: jenis,
      nominal: nominal,
      saldo_setelah: 0, // will be computed in service
      keterangan: keterangan,
      input_by: loggedInUser?.email || userEmail || 'wali_kelas_demo@school.id',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      foto: foto
    };

    await sheetsService.createTransaksi(newTx, loggedInUser?.email || userEmail || 'demo_operator', currentRole);
    // Reload state
    await handleRefreshData();
  };

  // Business logic callback: Cancel Transaction
  const handleCancelTransaksi = async (transaksiId: string, alasan: string) => {
    await sheetsService.cancelTransaksi(transaksiId, loggedInUser?.email || userEmail || 'demo_operator', alasan, currentRole);
    // Reload state
    await handleRefreshData();
  };

  // Custom portal authentication handlers
  const handleLoginPortal = (user: UserRow) => {
    setLoggedInUser(user);
    localStorage.setItem('tabungan_ceria_logged_in_user', JSON.stringify(user));
  };

  const handleLogoutPortal = () => {
    setLoggedInUser(null);
    localStorage.removeItem('tabungan_ceria_logged_in_user');
  };

  // Render Login page if not authenticated to custom portal
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Simple Unauthenticated Top Bar */}
        <div className="bg-white border-b-4 border-slate-900 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OsisLogo size={36} />
              <div>
                <h1 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase leading-none">
                  TABUNGAN<span className="text-blue-600 underline decoration-4 decoration-amber-400">CERIA</span>
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                  Sistem Tabungan Sekolah Berbasis Online
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Beautiful login module screen */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex items-center justify-center">
          <Login
            database={database}
            onLogin={handleLoginPortal}
            isConnected={isConnected}
            onConnectGoogle={handleConnectGoogle}
            onRegisterSuccess={handleRefreshData}
          />
        </main>

        {/* Simple Footer */}
        <footer className="bg-white border-t-4 border-slate-900 py-8 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-black uppercase tracking-wider text-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-slate-900">TABUNGANCERIA V1.0</span>
              <span>&bull;</span>
              <span className="text-blue-600 underline decoration-2 decoration-amber-400">Menabung Jadi Menyenangkan</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Info size={12} className="text-slate-900" />
              <span>Kolektif Web & Android App powered by Google Sheets API</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Simulation and Sync Toolbar */}
      <RoleSelector
        currentRole={currentRole}
        selectedKelasId={selectedKelasId}
        onKelasChange={setSelectedKelasId}
        selectedSiswaId={selectedSiswaId}
        onSiswaChange={setSelectedSiswaId}
        database={database}
        isConnected={isConnected}
        spreadsheetId={spreadsheetId}
        userEmail={userEmail}
        userDisplayName={userDisplayName}
        onConnect={handleConnectGoogle}
        onDisconnect={handleDisconnectGoogle}
        onRefresh={handleRefreshData}
        isRefreshing={isRefreshing}
        loggedInUser={loggedInUser}
        onLogoutPortal={handleLogoutPortal}
      />

      {/* Main Content Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Sync Encouragement Alert Banner */}
        {!isConnected && (
          <div className="bg-amber-100 border-4 border-slate-900 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex gap-4">
              <div className="bg-amber-400 p-3 border-2 border-slate-900 text-slate-900 shrink-0 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <Database size={20} />
              </div>
              <div>
                <h4 className="font-display font-black uppercase tracking-tight text-slate-900 text-base">Mode Demo Lokal Sedang Aktif</h4>
                <p className="text-xs text-slate-700 font-bold mt-1">
                  Saat ini Anda sedang memakai database demo offline. Hubungkan ke <span className="underline decoration-2 decoration-blue-600">Google Sheets</span> untuk sinkronisasi otomatis, transparansi real-time, dan penyimpanan cloud sekolah yang aman!
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectGoogle}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer shrink-0"
            >
              Hubungkan ke Google Sheets
            </button>
          </div>
        )}

        {/* Real-time sync success banner */}
        {isConnected && (
          <div className="bg-emerald-100 border-4 border-slate-900 px-5 py-3 text-xs font-bold text-slate-900 flex items-center gap-3 print:hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            <span className="uppercase tracking-wide">Database Sekolah disinkronkan secara real-time ke spreadsheet Google Sheets Anda.</span>
          </div>
        )}

        {/* Dynamic Role Dashboard Renderer */}
        {currentRole === 'kepala_sekolah' && (
          <KepalaSekolahDashboard database={database} />
        )}

        {currentRole === 'wali_kelas' && (
          <WaliKelasDashboard
            kelasId={selectedKelasId}
            database={database}
            onAddSiswa={handleAddSiswa}
            onAddTransaksi={handleAddTransaksi}
            onCancelTransaksi={handleCancelTransaksi}
            userEmail={loggedInUser?.email || userEmail || ''}
          />
        )}

        {currentRole === 'wali_siswa' && (
          <WaliSiswaDashboard
            siswaId={selectedSiswaId}
            database={database}
          />
        )}

      </main>

      {/* Footer detailing architectural beauty */}
      <footer className="bg-white border-t-4 border-slate-900 py-8 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-black uppercase tracking-wider text-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-slate-900">TABUNGANCERIA V1.0</span>
            <span>&bull;</span>
            <span className="text-blue-600 underline decoration-2 decoration-amber-400">Menabung Jadi Menyenangkan</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info size={12} className="text-slate-900" />
            <span>Kolektif Web & Android App powered by Google Sheets API</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
