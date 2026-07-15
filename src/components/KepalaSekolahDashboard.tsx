import React, { useState } from 'react';
import { 
  Shield, 
  BarChart2, 
  Layers, 
  Activity, 
  Eye, 
  Download, 
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Briefcase,
  ChevronDown,
  Search,
  Filter,
  X
} from 'lucide-react';
import { type DatabaseState, type LogAuditRow } from '../types';
import { formatRupiah } from './WaliSiswaDashboard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { jsPDF } from 'jspdf';

interface KepalaSekolahDashboardProps {
  database: DatabaseState;
}

export const KepalaSekolahDashboard: React.FC<KepalaSekolahDashboardProps> = ({
  database
}) => {
  // 1. Overall School Metrics
  const totalSiswa = database.siswa.length;
  const totalTabunganSekolah = database.siswa.reduce((acc, s) => acc + s.saldo, 0);
  const totalKelas = database.kelas.length;
  const totalTransaksiBulanIni = database.transaksi.length;

  // 2. Compute Class breakdown
  const classBreakdown = database.kelas.map((k, index) => {
    const studentsInClass = database.siswa.filter(s => s.kelas_id === k.kelas_id);
    const count = studentsInClass.length;
    const totalSaldo = studentsInClass.reduce((acc, s) => acc + s.saldo, 0);
    const txCount = database.transaksi.filter(t => 
      studentsInClass.map(s => s.siswa_id).includes(t.siswa_id)
    ).length;

    return {
      kelasId: k.kelas_id,
      namaKelas: k.nama_kelas,
      waliKelas: k.wali_kelas_id,
      jumlahSiswa: count,
      totalSaldo: totalSaldo,
      jumlahTransaksi: txCount,
      color: index % 2 === 0 ? '#3B82F6' : '#10B981' // color array for bar chart
    };
  });

  // Log Audit trail (newest first)
  const auditLogs = [...database.logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'audit'>('ringkasan');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [auditSubTab, setAuditSubTab] = useState<'transaksi' | 'tindakan'>('transaksi');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'semua' | 'setor' | 'tarik'>('semua');
  const [txKelasFilter, setTxKelasFilter] = useState<string>('semua');
  const [selectedLog, setSelectedLog] = useState<LogAuditRow | null>(null);

  const renderJsonDetail = (jsonStr: string) => {
    if (!jsonStr) {
      return <span className="text-slate-400 italic">Tidak ada data</span>;
    }
    try {
      const parsed = JSON.parse(jsonStr);
      return (
        <pre className="text-xs font-mono bg-slate-50 border-2 border-slate-900 p-3 overflow-x-auto max-h-48 text-slate-800 font-bold whitespace-pre-wrap rounded-none">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <pre className="text-xs font-mono bg-slate-50 border-2 border-slate-900 p-3 overflow-x-auto max-h-48 text-slate-800 font-bold whitespace-pre-wrap rounded-none">
          {jsonStr}
        </pre>
      );
    }
  };

  const renderNiceProperties = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed !== 'object' || parsed === null) return null;
      return (
        <div className="grid grid-cols-2 gap-2 text-xs border-2 border-slate-900 p-2.5 bg-slate-50">
          {Object.entries(parsed).map(([key, value]) => (
            <div key={key} className="col-span-2 sm:col-span-1 flex flex-col border-b border-slate-200 pb-1 last:border-0">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-black">{key.replace(/_/g, ' ')}</span>
              <span className="text-slate-800 font-extrabold truncate">
                {typeof value === 'number' && (key.includes('saldo') || key.includes('nominal'))
                  ? formatRupiah(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    } catch {
      return null;
    }
  };

  // Filtered transactions for compliance log audit
  const filteredTransaksi = [...database.transaksi]
    .map(tx => {
      const student = database.siswa.find(s => s.siswa_id === tx.siswa_id);
      const k = student ? database.kelas.find(kl => kl.kelas_id === student.kelas_id) : null;
      return {
        ...tx,
        namaSiswa: student ? student.nama : 'Tidak Ditemukan',
        nisnSiswa: student ? student.nisn : '',
        kelasId: student ? student.kelas_id : '',
        namaKelas: k ? k.nama_kelas : 'N/A'
      };
    })
    .filter(tx => {
      const query = txSearchQuery.toLowerCase();
      const matchSearch = 
        tx.namaSiswa.toLowerCase().includes(query) || 
        tx.siswa_id.toLowerCase().includes(query) || 
        tx.transaksi_id.toLowerCase().includes(query) || 
        (tx.nisnSiswa && tx.nisnSiswa.includes(query)) ||
        (tx.keterangan && tx.keterangan.toLowerCase().includes(query));

      const matchType = txTypeFilter === 'semua' || tx.jenis === txTypeFilter;
      const matchKelas = txKelasFilter === 'semua' || tx.kelasId === txKelasFilter;

      return matchSearch && matchType && matchKelas;
    })
    .sort((a, b) => {
      const timeA = a.timestamp || a.tanggal;
      const timeB = b.timestamp || b.tanggal;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

  // Export full school report CSV
  const exportSchoolCSV = () => {
    const csvHeaders = ["Nama Kelas", "Wali Kelas", "Jumlah Siswa", "Total Saldo", "Total Transaksi"];
    const csvRows = classBreakdown.map(c => [
      c.namaKelas,
      c.waliKelas,
      c.jumlahSiswa,
      c.totalSaldo,
      c.jumlahTransaksi
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_Kolektif_Tabungan_Sekolah.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full school report PDF using jsPDF
  const exportSchoolPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("TABUNGAN CERIA", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Laporan Kolektif Tabungan Sekolah (Portal Kepala Sekolah)", 14, 26);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 31);
    
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.line(14, 35, 196, 35);
    
    // Summary Metrics
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("RINGKASAN KOLEKTIF SEKOLAH", 14, 45);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Dana Tabungan Sekolah : ${formatRupiah(totalTabunganSekolah)}`, 14, 52);
    doc.text(`Total Siswa Menabung       : ${totalSiswa} Siswa`, 14, 57);
    doc.text(`Jumlah Kelas Aktif          : ${totalKelas} Kelas`, 14, 62);
    doc.text(`Total Volume Mutasi        : ${totalTransaksiBulanIni} Kali Transaksi`, 14, 67);
    
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(14, 73, 196, 73);
    
    // Table of Classes
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PERFORMA TABUNGAN KELAS", 14, 83);
    
    // Table Header design
    doc.setFontSize(10);
    doc.setFillColor(241, 245, 249); // slate-100 background
    doc.rect(14, 89, 182, 8, "F");
    doc.setTextColor(15, 23, 42);
    doc.text("Nama Kelas", 16, 94);
    doc.text("Wali Kelas", 55, 94);
    doc.text("Jumlah Siswa", 100, 94);
    doc.text("Total Saldo", 135, 94);
    doc.text("Mutasi", 175, 94);
    
    let currentY = 104;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(51, 65, 85); // slate-700
    
    classBreakdown.forEach((c) => {
      // Row overflow check
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(c.namaKelas, 16, currentY);
      doc.text(c.waliKelas, 55, currentY);
      doc.text(`${c.jumlahSiswa} Siswa`, 100, currentY);
      doc.text(formatRupiah(c.totalSaldo), 135, currentY);
      doc.text(`${c.jumlahTransaksi} x`, 175, currentY);
      
      // Separator line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.line(14, currentY + 3, 196, currentY + 3);
      
      currentY += 10;
    });
    
    doc.save("Laporan_Kolektif_Tabungan_Sekolah.pdf");
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-amber-400 text-slate-900 border-2 border-slate-900 text-[10px] px-3 py-1 font-black uppercase tracking-widest inline-block mb-2">
            Portal Kepala Sekolah
          </span>
          <h2 className="font-display font-black text-3xl text-slate-900 mt-2 flex items-center gap-2 uppercase tracking-tight">
            <Shield className="text-amber-500 animate-pulse" strokeWidth={3} size={28} /> Pengawasan Tabungan Sekolah
          </h2>
          <p className="text-slate-700 font-bold text-xs uppercase mt-1">
            Memonitor transparansi, total dana masuk, dan audit transaksi tabungan siswa seluruh kelas
          </p>
        </div>
        
        {/* Export Laporan Dropdown Action Button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-black uppercase tracking-wider px-4 py-3 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <Download size={14} strokeWidth={3} /> Ekspor Laporan <ChevronDown size={14} strokeWidth={3} />
          </button>
          
          {showExportDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportDropdown(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-20 overflow-hidden">
                <button
                  onClick={() => {
                    exportSchoolCSV();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-900 hover:bg-amber-100 flex items-center gap-2 border-b-2 border-slate-900 cursor-pointer"
                >
                  <FileSpreadsheet size={14} strokeWidth={2.5} /> Ekspor Format CSV
                </button>
                <button
                  onClick={() => {
                    exportSchoolPDF();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-900 hover:bg-blue-100 flex items-center gap-2 cursor-pointer"
                >
                  <Download size={14} strokeWidth={2.5} /> Ekspor Format PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aggregate Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Tabungan Sekolah */}
        <div className="bg-blue-600 p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-3 translate-y-3">
            <Layers size={110} />
          </div>
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Total Dana Tabungan Sekolah</p>
          <h3 className="text-2xl sm:text-3xl font-display font-black mt-2 tracking-tight">
            {formatRupiah(totalTabunganSekolah)}
          </h3>
          <p className="text-[10px] text-blue-200 mt-2 font-bold uppercase">Dari {totalKelas} Kelas terdaftar</p>
        </div>

        {/* Total Siswa Menabung */}
        <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Siswa Menabung</p>
            <h4 className="text-2xl font-display font-black text-slate-900 mt-2 uppercase">{totalSiswa} Siswa</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Siswa di seluruh kelas</p>
          </div>
          <div className="bg-blue-50 border-2 border-slate-900 p-3 text-blue-600">
            <Layers size={24} strokeWidth={3} />
          </div>
        </div>

        {/* Jumlah Kelas Aktif */}
        <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Jumlah Kelas</p>
            <h4 className="text-2xl font-display font-black text-slate-900 mt-2 uppercase">{totalKelas} Kelas</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Tahun ajaran berjalan</p>
          </div>
          <div className="bg-emerald-50 border-2 border-slate-900 p-3 text-emerald-600">
            <Activity size={24} strokeWidth={3} />
          </div>
        </div>

        {/* Total Mutasi Transaksi */}
        <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Volume Mutasi</p>
            <h4 className="text-2xl font-display font-black text-slate-900 mt-2 uppercase">{totalTransaksiBulanIni} Kali</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Kumulatif setor & tarik</p>
          </div>
          <div className="bg-amber-50 border-2 border-slate-900 p-3 text-amber-600">
            <Clock size={24} strokeWidth={3} />
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="bg-white border-2 border-slate-900 p-1 flex w-max">
        <button
          onClick={() => setActiveTab('ringkasan')}
          className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ringkasan' 
              ? 'bg-amber-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' 
              : 'text-slate-500 hover:text-slate-900 border-2 border-transparent'
          }`}
        >
          Ringkasan Kelas
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'audit' 
              ? 'bg-amber-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' 
              : 'text-slate-500 hover:text-slate-900 border-2 border-transparent'
          }`}
        >
          Log Audit & Pengawasan ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1 Content: Ringkasan Kelas & Grafik perbandingan */}
      {activeTab === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Class list table */}
          <div className="lg:col-span-7 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
            <div className="p-5 border-b-4 border-slate-900 bg-slate-50">
              <h3 className="font-display font-black text-slate-900 text-xl uppercase tracking-tight">Performa Tabungan Kelas</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Daftar saldo dan aktivitas guru wali kelas</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-950 border-b-2 border-slate-900 text-xs font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nama Kelas</th>
                    <th className="px-6 py-4">Wali Kelas</th>
                    <th className="px-6 py-4 text-center">Jumlah Siswa</th>
                    <th className="px-6 py-4 text-right">Total Tabungan</th>
                    <th className="px-6 py-4 text-center">Mutasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-900 font-bold text-slate-800">
                  {classBreakdown.map((c) => (
                    <tr key={c.kelasId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-black text-slate-950 text-sm">
                        {c.namaKelas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-bold uppercase">
                        {c.waliKelas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-slate-900 font-black text-xs">
                        {c.jumlahSiswa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-black text-blue-600 text-base">
                        {formatRupiah(c.totalSaldo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-slate-600 font-mono">
                        {c.jumlahTransaksi} x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar Chart comparing savings */}
          <div className="lg:col-span-5 bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
            <div>
              <h3 className="font-display font-black text-slate-900 text-xl flex items-center gap-2 uppercase tracking-tight">
                <BarChart2 className="text-blue-500" strokeWidth={3} /> Perbandingan Saldo Antar Kelas
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 mb-6">Grafik perbandingan volume dana tabungan sekolah</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="namaKelas" tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#0F172A', fontWeight: 'bold' }} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                  <Tooltip 
                    formatter={(val: any) => [formatRupiah(val), "Total Saldo"]}
                    contentStyle={{ backgroundColor: 'white', borderRadius: '0px', border: '2px solid #0F172A', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="totalSaldo" radius={[0, 0, 0, 0]}>
                    {classBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2 Content: Audit trail Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          
          {/* Sub Navigation for Audit page */}
          <div className="flex border-b-4 border-slate-900 pb-1 gap-2">
            <button
              onClick={() => setAuditSubTab('transaksi')}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-t-2 border-x-2 border-slate-900 ${
                auditSubTab === 'transaksi'
                  ? 'bg-slate-900 text-white shadow-[2px_-2px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b-0'
              }`}
            >
              Aktivitas Transaksi ({database.transaksi.length})
            </button>
            <button
              onClick={() => setAuditSubTab('tindakan')}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-t-2 border-x-2 border-slate-900 ${
                auditSubTab === 'tindakan'
                  ? 'bg-slate-900 text-white shadow-[2px_-2px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b-0'
              }`}
            >
              Log Koreksi & Sistem ({auditLogs.length})
            </button>
          </div>

          {/* Subtab 1: Live Transactions compliance audit */}
          {auditSubTab === 'transaksi' && (
            <div className="bg-white p-5 sm:p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
              <div className="mb-5">
                <h3 className="font-display font-black text-slate-900 text-xl uppercase tracking-tight">Audit Alur Transaksi Sekolah</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Daftar mutasi setor dan tarik tabungan seluruh siswa untuk kepatuhan & transparansi</p>
              </div>

              {/* Filter controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5 p-4 bg-slate-50 border-2 border-slate-900">
                {/* Search input */}
                <div className="md:col-span-6 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa, ID transaksi, keterangan..."
                    value={txSearchQuery}
                    onChange={(e) => setTxSearchQuery(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none placeholder-slate-400 focus:bg-white"
                  />
                </div>
                {/* Filter Jenis */}
                <div className="md:col-span-3 flex items-center gap-1.5 bg-white border-2 border-slate-900 px-2 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value as 'semua' | 'setor' | 'tarik')}
                    className="w-full bg-transparent border-0 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="semua">Semua Jenis</option>
                    <option value="setor">Setoran (Setor)</option>
                    <option value="tarik">Penarikan (Tarik)</option>
                  </select>
                </div>
                {/* Filter Kelas */}
                <div className="md:col-span-3 flex items-center gap-1.5 bg-white border-2 border-slate-900 px-2 py-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <select
                    value={txKelasFilter}
                    onChange={(e) => setTxKelasFilter(e.target.value)}
                    className="w-full bg-transparent border-0 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="semua">Semua Kelas</option>
                    {database.kelas.map(k => (
                      <option key={k.kelas_id} value={k.kelas_id}>{k.nama_kelas}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Stats for filtered subset */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-center">
                <div className="bg-emerald-50 border-2 border-slate-900 p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Total Setoran Terfilter</p>
                  <p className="font-display font-black text-emerald-950 text-base sm:text-lg mt-0.5">
                    {formatRupiah(filteredTransaksi.filter(t => t.jenis === 'setor').reduce((acc, t) => acc + t.nominal, 0))}
                  </p>
                </div>
                <div className="bg-rose-50 border-2 border-slate-900 p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase text-rose-800 tracking-wider">Total Penarikan Terfilter</p>
                  <p className="font-display font-black text-rose-950 text-base sm:text-lg mt-0.5">
                    {formatRupiah(filteredTransaksi.filter(t => t.jenis === 'tarik').reduce((acc, t) => acc + t.nominal, 0))}
                  </p>
                </div>
                <div className="bg-blue-50 border-2 border-slate-900 p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase text-blue-800 tracking-wider">Aliran Mutasi Bersih</p>
                  <p className="font-display font-black text-blue-950 text-base sm:text-lg mt-0.5">
                    {formatRupiah(
                      filteredTransaksi.filter(t => t.jenis === 'setor').reduce((acc, t) => acc + t.nominal, 0) -
                      filteredTransaksi.filter(t => t.jenis === 'tarik').reduce((acc, t) => acc + t.nominal, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Transactions list Table */}
              <div className="overflow-x-auto border-2 border-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-900 border-b-2 border-slate-900 font-black uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">ID Transaksi</th>
                      <th className="px-4 py-3">Tanggal & Waktu</th>
                      <th className="px-4 py-3">Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-center">Jenis</th>
                      <th className="px-4 py-3 text-right">Nominal</th>
                      <th className="px-4 py-3">Oleh Petugas</th>
                      <th className="px-4 py-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold text-slate-700">
                    {filteredTransaksi.length > 0 ? (
                      filteredTransaksi.map(tx => (
                        <tr key={tx.transaksi_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-black text-slate-900 whitespace-nowrap">
                            {tx.transaksi_id}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">
                            {tx.timestamp || tx.tanggal}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-black whitespace-nowrap">
                            {tx.namaSiswa}
                            <div className="text-[10px] text-slate-400 font-mono font-normal">ID: {tx.siswa_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 text-[10px] font-black uppercase">
                              {tx.namaKelas}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider border ${
                              tx.jenis === 'setor' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                : 'bg-rose-50 text-rose-700 border-rose-300'
                            }`}>
                              {tx.jenis === 'setor' ? 'SETOR' : 'TARIK'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-black text-sm whitespace-nowrap ${
                            tx.jenis === 'setor' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {tx.jenis === 'setor' ? '+' : '-'}{formatRupiah(tx.nominal)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[10px] truncate max-w-[120px]" title={tx.input_by}>
                            {tx.input_by}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium max-w-xs truncate" title={tx.keterangan}>
                            {tx.keterangan || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-bold uppercase">
                          Tidak ada data transaksi yang cocok dengan filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 2: System Correction/Action Audit */}
          {auditSubTab === 'tindakan' && (
            <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
              <div className="p-5 border-b-4 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50">
                <div>
                  <h3 className="font-display font-black text-slate-900 text-xl uppercase tracking-tight">Catatan Audit & Pengawasan Sistem</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Log audit aktivitas guru wali kelas (setor, tarik, dan pembatalan)</p>
                </div>
                <span className="bg-amber-400 border-2 border-slate-900 text-slate-900 text-xs font-black px-3 py-1 uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                  {auditLogs.length} Aktivitas Tercatat
                </span>
              </div>

              <div className="divide-y-2 divide-slate-900 max-h-[500px] overflow-y-auto">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div 
                      key={log.log_id} 
                      onClick={() => setSelectedLog(log)}
                      className="p-5 hover:bg-slate-100/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm cursor-pointer group"
                      title="Klik untuk Quick View detail log audit"
                    >
                      
                      {/* Log description */}
                      <div className="space-y-1.5 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-none uppercase tracking-widest border-2 ${
                            log.aksi === 'create' 
                              ? 'bg-emerald-100 text-emerald-850 border-emerald-900' 
                              : 'bg-rose-100 text-rose-850 border-rose-900'
                          }`}>
                            {log.aksi === 'create' ? 'Input Baru' : 'Pembatalan'}
                          </span>
                          <span className="text-xs font-mono text-slate-500 font-bold">ID: {log.log_id}</span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-slate-600 font-bold text-xs flex items-center gap-1 uppercase">
                            <Clock size={11} strokeWidth={2.5} /> {log.timestamp}
                          </span>
                        </div>

                        <p className="text-slate-800 font-bold mt-1 text-sm">
                          Petugas <span className="font-black text-slate-950 underline decoration-2 decoration-blue-600">{log.user_id}</span> {log.aksi === 'create' ? 'menginput transaksi untuk target' : 'membatalkan transaksi ID'} <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 border border-slate-900 text-slate-900 font-bold">{log.target}</span>.
                        </p>

                        {/* Show JSON details formatted */}
                        {log.detail_sesudah && (
                          <div className="text-[11px] font-mono bg-slate-50 text-slate-700 p-2.5 border-2 border-slate-900 mt-2 max-w-xl overflow-x-auto font-bold group-hover:border-blue-600 transition-colors">
                            {log.detail_sesudah}
                          </div>
                        )}
                      </div>

                      {/* Right action controls */}
                      <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                        <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                          <Eye size={12} strokeWidth={2.5} /> Quick View
                        </span>

                        {/* Icon badge */}
                        <div className={`p-2.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all ${
                          log.aksi === 'create' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.aksi === 'create' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
                        </div>
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-400 font-bold uppercase">
                    Belum ada aktivitas yang tercatat di Log Audit.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Neo-Brutalist Quick View Modal for Audit Logs */}
      {selectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="w-full max-w-2xl bg-white border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            id="audit-quickview-modal"
          >
            {/* Modal Header */}
            <div className="p-4 bg-amber-400 border-b-4 border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-slate-900" strokeWidth={2.5} />
                <h3 className="font-display font-black text-slate-900 text-lg uppercase tracking-tight">
                  QUICK VIEW: LOG AUDIT {selectedLog.log_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-white hover:bg-rose-500 hover:text-white text-slate-900 p-1.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center"
                id="close-modal-button"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Metainfo block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border-2 border-slate-900 p-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Operator / Petugas</span>
                  <span className="font-mono text-sm font-black text-slate-900">{selectedLog.user_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Waktu Aktivitas</span>
                  <span className="font-mono text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> {selectedLog.timestamp}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Tindakan / Aksi</span>
                  <span className={`text-xs font-black px-2.5 py-0.5 border-2 inline-block uppercase tracking-wider mt-1 ${
                    selectedLog.aksi === 'create' 
                      ? 'bg-emerald-100 text-emerald-850 border-emerald-900' 
                      : 'bg-rose-100 text-rose-850 border-rose-900'
                  }`}>
                    {selectedLog.aksi === 'create' ? 'INPUT BARU (CREATE)' : 'PEMBATALAN (DELETE)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Target ID (Transaksi/Siswa)</span>
                  <span className="font-mono text-sm font-black text-slate-900 bg-slate-200 border border-slate-900 px-2 py-0.5 inline-block mt-1">
                    {selectedLog.target}
                  </span>
                </div>
              </div>

              {/* Data comparison block */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-1 flex items-center gap-1.5">
                  <Database size={14} className="text-blue-600" /> Perbandingan Perubahan Data
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div className="space-y-2 flex flex-col">
                    <span className="text-[10px] text-rose-800 font-black uppercase tracking-wider bg-rose-50 border border-rose-300 px-2 py-0.5 self-start">
                      SEBELUM PERUBAHAN (BEFORE)
                    </span>
                    {selectedLog.detail_sebelum ? (
                      <div className="space-y-2 flex-grow flex flex-col">
                        {renderNiceProperties(selectedLog.detail_sebelum)}
                        <div className="mt-2">
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">Raw JSON:</span>
                          {renderJsonDetail(selectedLog.detail_sebelum)}
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-400 uppercase bg-slate-50 flex items-center justify-center flex-grow min-h-[120px]">
                        Tidak ada data sebelumnya (Log Input Baru)
                      </div>
                    )}
                  </div>

                  {/* After */}
                  <div className="space-y-2 flex flex-col">
                    <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider bg-emerald-50 border border-emerald-300 px-2 py-0.5 self-start">
                      SESUDAH PERUBAHAN (AFTER)
                    </span>
                    {selectedLog.detail_sesudah ? (
                      <div className="space-y-2 flex-grow flex flex-col">
                        {renderNiceProperties(selectedLog.detail_sesudah)}
                        <div className="mt-2">
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">Raw JSON:</span>
                          {renderJsonDetail(selectedLog.detail_sesudah)}
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-400 uppercase bg-slate-50 flex items-center justify-center flex-grow min-h-[120px]">
                        Tidak ada data setelahnya (Log Dihapus/Dibatalkan)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t-4 border-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                id="close-modal-footer-button"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
