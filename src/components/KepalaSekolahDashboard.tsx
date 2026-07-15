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
  ChevronDown
} from 'lucide-react';
import { type DatabaseState } from '../types';
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
                <div key={log.log_id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm">
                  
                  {/* Log description */}
                  <div className="space-y-1.5">
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
                      <div className="text-[11px] font-mono bg-slate-50 text-slate-700 p-2.5 border-2 border-slate-900 mt-2 max-w-xl overflow-x-auto font-bold">
                        {log.detail_sesudah}
                      </div>
                    )}
                  </div>

                  {/* Icon badge */}
                  <div className={`p-2.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0 ${
                    log.aksi === 'create' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {log.aksi === 'create' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
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
  );
};
