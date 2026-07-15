import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  PlusCircle, 
  BookOpen, 
  X, 
  Check, 
  Trash2, 
  AlertTriangle,
  Download,
  Search
} from 'lucide-react';
import { 
  type DatabaseState, 
  type SiswaRow, 
  type TransaksiRow, 
  type TransaksiJenis,
  type SiswaStatus
} from '../types';
import { formatRupiah } from './WaliSiswaDashboard';

interface WaliKelasDashboardProps {
  kelasId: string;
  database: DatabaseState;
  onAddSiswa: (name: string, nisn: string, status: SiswaStatus) => Promise<void>;
  onAddTransaksi: (siswaId: string, jenis: TransaksiJenis, nominal: number, keterangan: string) => Promise<void>;
  onCancelTransaksi: (transaksiId: string, alasan: string) => Promise<void>;
  userEmail: string | null;
}

export const WaliKelasDashboard: React.FC<WaliKelasDashboardProps> = ({
  kelasId,
  database,
  onAddSiswa,
  onAddTransaksi,
  onCancelTransaksi,
  userEmail
}) => {
  const currentKelas = database.kelas.find(k => k.kelas_id === kelasId);
  const classStudents = database.siswa.filter(s => s.kelas_id === kelasId);
  
  // Calculate Class Metrics
  const totalSiswa = classStudents.length;
  const totalTabunganKelas = classStudents.reduce((acc, s) => acc + s.saldo, 0);
  const rataRataTabungan = totalSiswa > 0 ? totalTabunganKelas / totalSiswa : 0;

  // Filter Transactions specifically for this class's students
  const studentIds = classStudents.map(s => s.siswa_id);
  const classTransactions = database.transaksi
    .filter(t => studentIds.includes(t.siswa_id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'siswa' | 'riwayat'>('siswa');

  // Modal States
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedStudentForTx, setSelectedStudentForTx] = useState<SiswaRow | null>(null);
  const [txType, setTxType] = useState<TransaksiJenis>('setor');

  // Form States - Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');

  // Form States - Transaction
  const [txNominal, setTxNominal] = useState('');
  const [txKeterangan, setTxKeterangan] = useState('');

  // Form States - Cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [txToCancel, setTxToCancel] = useState<TransaksiRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Loading indicator states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter students based on search term
  const filteredStudents = classStudents.filter(s => 
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nisn.includes(searchTerm)
  );

  // Submit Add Student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentNisn) return;
    setIsSubmitting(true);
    try {
      await onAddSiswa(newStudentName, newStudentNisn, 'aktif');
      setNewStudentName('');
      setNewStudentNisn('');
      setShowAddStudent(false);
    } catch (err: any) {
      alert("Gagal menambahkan siswa: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Transaction
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForTx || !txNominal) return;
    
    const nominalNum = Number(txNominal);
    if (isNaN(nominalNum) || nominalNum <= 0) {
      alert("Nominal transaksi harus berupa angka positif!");
      return;
    }

    if (txType === 'tarik' && selectedStudentForTx.saldo < nominalNum) {
      alert("Saldo tidak cukup! Saldo saat ini: " + formatRupiah(selectedStudentForTx.saldo));
      return;
    }

    // Explicit confirmation dialog for mutations (PRD requirement!)
    const confirmMessage = `Apakah Anda yakin ingin memproses transaksi ${
      txType === 'setor' ? 'SETORAN' : 'PENARIKAN'
    } sebesar ${formatRupiah(nominalNum)} untuk siswa ${selectedStudentForTx.nama}?`;
    
    if (!window.confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      await onAddTransaksi(selectedStudentForTx.siswa_id, txType, nominalNum, txKeterangan);
      setTxNominal('');
      setTxKeterangan('');
      setShowTransactionModal(false);
      setSelectedStudentForTx(null);
    } catch (err: any) {
      alert("Gagal memproses transaksi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger cancel modal
  const openCancelModal = (tx: TransaksiRow) => {
    setTxToCancel(tx);
    setCancelReason('');
    setShowCancelModal(true);
  };

  // Submit cancellation
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToCancel || !cancelReason) return;

    // Explicit confirmation (PRD safety rule!)
    const confirmMessage = `Apakah Anda yakin ingin membatalkan/menghapus transaksi ID ${txToCancel.transaksi_id}? Uang akan dikembalikan/ditarik dari saldo siswa.`;
    if (!window.confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      await onCancelTransaksi(txToCancel.transaksi_id, cancelReason);
      setShowCancelModal(false);
      setTxToCancel(null);
    } catch (err: any) {
      alert("Gagal membatalkan transaksi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open transaction modal for specific student
  const openTransaction = (student: SiswaRow, type: TransaksiJenis) => {
    setSelectedStudentForTx(student);
    setTxType(type);
    setTxNominal('');
    setTxKeterangan(type === 'setor' ? 'Setoran mingguan rutin' : 'Kebutuhan membeli buku/alat tulis');
    setShowTransactionModal(true);
  };

  const exportClassCSV = () => {
    const csvHeaders = ["ID Siswa", "Nama", "NISN", "Saldo", "Status"];
    const csvRows = classStudents.map(s => [
      s.siswa_id,
      s.nama,
      s.nisn,
      s.saldo,
      s.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Siswa_Kelas_${currentKelas?.nama_kelas || kelasId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentKelas) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
        <p className="text-slate-500 font-semibold">Memuat kelas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Banner / Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-sky-50 text-sky-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Pengelola Kelas
          </span>
          <h2 className="font-display font-extrabold text-2xl text-slate-800 mt-2">
            {currentKelas.nama_kelas}
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Wali Kelas: <span className="font-semibold text-slate-700">{currentKelas.wali_kelas_id}</span> &bull; Tahun Ajaran: {currentKelas.tahun_ajaran}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportClassCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            <Download size={14} /> Ekspor Rekap
          </button>
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Class Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Siswa Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Jumlah Siswa</p>
            <h4 className="text-2xl font-display font-extrabold text-slate-800 mt-1">{totalSiswa} Siswa</h4>
            <p className="text-xs text-slate-400 mt-1">Terdaftar aktif di kelas ini</p>
          </div>
          <div className="bg-sky-50 p-3.5 rounded-xl text-sky-600">
            <Users size={24} />
          </div>
        </div>

        {/* Total Tabungan Kelas Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Tabungan Kelas</p>
            <h4 className="text-2xl font-display font-extrabold text-sky-700 mt-1">{formatRupiah(totalTabunganKelas)}</h4>
            <p className="text-xs text-slate-400 mt-1">Akumulasi saldo seluruh siswa</p>
          </div>
          <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Rerata Tabungan Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Rata-rata Tabungan</p>
            <h4 className="text-2xl font-display font-extrabold text-amber-600 mt-1">{formatRupiah(rataRataTabungan)}</h4>
            <p className="text-xs text-slate-400 mt-1">Perkiraan saldo per siswa</p>
          </div>
          <div className="bg-amber-50 p-3.5 rounded-xl text-amber-600">
            <BookOpen size={24} />
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl flex w-max border border-slate-200">
        <button
          onClick={() => setActiveTab('siswa')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'siswa' 
              ? 'bg-white text-slate-800 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Siswa ({filteredStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'riwayat' 
              ? 'bg-white text-slate-800 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Riwayat Transaksi Kelas ({classTransactions.length})
        </button>
      </div>

      {/* Content for TAB 1: Daftar Siswa */}
      {activeTab === 'siswa' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          
          {/* List Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div className="text-slate-400 text-xs font-semibold shrink-0">
              Menampilkan {filteredStudents.length} dari {classStudents.length} siswa
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">NISN</th>
                  <th className="px-6 py-4 text-right">Saldo Saat Ini</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <tr key={s.siswa_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-sm">{s.nama}</div>
                        <div className="text-slate-400 font-mono text-[10px] mt-0.5">{s.siswa_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-semibold text-xs">
                        {s.nisn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-slate-800 text-sm">
                        {formatRupiah(s.saldo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                          s.status === 'aktif' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => openTransaction(s, 'setor')}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            <ArrowUpRight size={12} /> Setor
                          </button>
                          <button
                            onClick={() => openTransaction(s, 'tarik')}
                            className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            <ArrowDownRight size={12} /> Tarik
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-semibold">
                      Tidak ada siswa yang sesuai dengan pencarian Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content for TAB 2: Riwayat Transaksi Kelas */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                  <th className="px-6 py-4 text-right">Saldo Sesudah</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4 text-right">Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classTransactions.length > 0 ? (
                  classTransactions.map((tx) => {
                    const student = classStudents.find(s => s.siswa_id === tx.siswa_id);
                    return (
                      <tr key={tx.transaksi_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                          {tx.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-sm">
                            {student ? student.nama : tx.siswa_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.jenis === 'setor' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Setor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Tarik
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-extrabold ${tx.jenis === 'setor' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.jenis === 'setor' ? '+' : '-'} {formatRupiah(tx.nominal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-500 font-semibold">
                          {formatRupiah(tx.saldo_setelah)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate font-medium">
                          {tx.keterangan || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openCancelModal(tx)}
                            title="Batalkan / Koreksi Transaksi ini"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">
                      Belum ada transaksi di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Tambah Siswa */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-display font-extrabold text-slate-800">Tambah Siswa Baru</h3>
              <button 
                onClick={() => setShowAddStudent(false)}
                className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddStudentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rafli"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">NISN (10 Digit)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="Contoh: 0123456789"
                  value={newStudentNisn}
                  onChange={(e) => setNewStudentNisn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-mono font-semibold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Setor / Tarik Tabungan */}
      {showTransactionModal && selectedStudentForTx && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200">
            <div className={`p-5 border-b border-slate-100 flex justify-between items-center text-white ${
              txType === 'setor' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              <div>
                <h3 className="font-display font-extrabold text-sm uppercase tracking-wider">
                  Transaksi {txType === 'setor' ? 'Setor' : 'Tarik'}
                </h3>
                <h4 className="font-display font-black text-lg mt-0.5">{selectedStudentForTx.nama}</h4>
              </div>
              <button 
                onClick={() => setShowTransactionModal(false)}
                className="p-1 hover:bg-white/15 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="p-5 space-y-4">
              
              {/* Display balance context */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-400">Saldo Siswa Saat Ini:</span>
                <span className="text-slate-700 font-extrabold">{formatRupiah(selectedStudentForTx.saldo)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nominal Uang (Rp)</label>
                <input
                  type="number"
                  required
                  min={100}
                  placeholder="Contoh: 50000"
                  value={txNominal}
                  onChange={(e) => setTxNominal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-extrabold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan / Tujuan</label>
                <textarea
                  placeholder="Contoh: Setoran minggu ke-3"
                  value={txKeterangan}
                  onChange={(e) => setTxKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-semibold h-16 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 ${
                    txType === 'setor' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? "Memproses..." : `Konfirmasi ${txType === 'setor' ? 'Setor' : 'Tarik'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Pembatalan / Koreksi Transaksi */}
      {showCancelModal && txToCancel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-rose-50 text-rose-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <h3 className="font-display font-extrabold text-sm uppercase tracking-wider">Koreksi / Batalkan Transaksi</h3>
              </div>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCancelSubmit} className="p-5 space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                <div><strong>ID Transaksi:</strong> {txToCancel.transaksi_id}</div>
                <div><strong>Jenis:</strong> {txToCancel.jenis === 'setor' ? 'Setoran (+)' : 'Penarikan (-)'}</div>
                <div><strong>Nominal:</strong> {formatRupiah(txToCancel.nominal)}</div>
                <div><strong>Keterangan Lama:</strong> {txToCancel.keterangan}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alasan Pembatalan / Koreksi</label>
                <textarea
                  required
                  placeholder="Tuliskan alasan pembatalan atau detail koreksi..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:border-rose-500 font-semibold h-20"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Membatalkan..." : "Batalkan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
