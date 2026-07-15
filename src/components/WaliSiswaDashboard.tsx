import React from 'react';
import { 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  Calendar, 
  User, 
  FileText, 
  Download, 
  CreditCard 
} from 'lucide-react';
import { type DatabaseState, type SiswaRow } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface WaliSiswaDashboardProps {
  siswaId: string;
  database: DatabaseState;
}

export const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

export const WaliSiswaDashboard: React.FC<WaliSiswaDashboardProps> = ({
  siswaId,
  database
}) => {
  const siswa = database.siswa.find(s => s.siswa_id === siswaId);
  const kelas = siswa ? database.kelas.find(k => k.kelas_id === siswa.kelas_id) : null;
  const rawTx = database.transaksi.filter(t => t.siswa_id === siswaId);
  
  // Sort transactions by date/time ascending to compute running balance correctly
  const sortedTx = [...rawTx].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  // Re-sort descending for the history table list (newest first)
  const historyTx = [...rawTx].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Calculate totals
  const totalSetor = rawTx.filter(t => t.jenis === 'setor').reduce((acc, t) => acc + t.nominal, 0);
  const totalTarik = rawTx.filter(t => t.jenis === 'tarik').reduce((acc, t) => acc + t.nominal, 0);

  // Generate chart data: Running balance progression
  let currentRunning = 0;
  const chartData = sortedTx.map(t => {
    if (t.jenis === 'setor') {
      currentRunning += t.nominal;
    } else {
      currentRunning -= t.nominal;
    }
    return {
      tanggal: new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      Saldo: currentRunning,
      Nominal: t.nominal,
      Jenis: t.jenis === 'setor' ? 'Setor' : 'Tarik'
    };
  });

  if (!siswa) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xs border border-slate-200 text-center">
        <p className="text-slate-500 font-semibold">Silakan pilih siswa pada panel demo di atas untuk melihat data.</p>
      </div>
    );
  }

  // Handle Export CSV
  const exportCSV = () => {
    const csvHeaders = ["ID Transaksi", "Tanggal", "Jenis", "Nominal", "Keterangan", "Petugas", "Timestamp"];
    const csvRows = historyTx.map(t => [
      t.transaksi_id,
      t.tanggal,
      t.jenis === 'setor' ? 'Setor' : 'Tarik',
      t.nominal,
      t.keterangan.replace(/,/g, ';'), // avoid CSV breaking
      t.input_by,
      t.timestamp
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Riwayat_Tabungan_${siswa.nama.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print Passbook
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Printable Area Header for Window Print */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold font-display text-slate-800">Laporan Buku Tabungan Siswa</h1>
        <h2 className="text-lg font-semibold text-slate-600">Tabungan Ceria</h2>
        <div className="grid grid-cols-2 text-left mt-4 text-xs gap-2">
          <div><strong>Nama Siswa:</strong> {siswa.nama}</div>
          <div><strong>NISN:</strong> {siswa.nisn}</div>
          <div><strong>Kelas:</strong> {kelas ? kelas.nama_kelas : siswa.kelas_id}</div>
          <div><strong>Tahun Ajaran:</strong> {kelas ? kelas.tahun_ajaran : '-'}</div>
          <div><strong>Saldo Saat Ini:</strong> {formatRupiah(siswa.saldo)}</div>
          <div><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <span className="bg-emerald-500 text-white border-2 border-slate-900 text-[10px] px-3 py-1 font-black uppercase tracking-widest inline-block">
            Portal Orang Tua
          </span>
          <h2 className="font-display font-black text-3xl text-slate-900 mt-2 flex items-center gap-2 uppercase tracking-tight">
            <User className="text-emerald-600" size={24} strokeWidth={3} /> {siswa.nama}
          </h2>
          <p className="text-slate-700 font-bold text-xs uppercase mt-1">
            NISN: <span className="font-mono">{siswa.nisn}</span> &bull; Kelas: {kelas ? kelas.nama_kelas : siswa.kelas_id} ({kelas ? kelas.tahun_ajaran : '-'})
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border-2 border-slate-900 text-slate-900 text-xs font-black uppercase tracking-wider px-4 py-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <Download size={14} strokeWidth={3} /> Ekspor CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 border-2 border-slate-900 text-white text-xs font-black uppercase tracking-wider px-4 py-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <FileText size={14} strokeWidth={3} /> Cetak Buku
          </button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Saldo Card */}
        <div className="bg-blue-600 p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-3 translate-y-3">
            <CreditCard size={140} />
          </div>
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Saldo Tabungan Saat Ini</p>
          <h3 className="text-3xl sm:text-4xl font-display font-black mt-2 tracking-tight">
            {formatRupiah(siswa.saldo)}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] bg-slate-900/40 text-white px-2.5 py-1.5 border border-slate-900 font-bold uppercase tracking-wider w-max">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Google Sheets Live Sync</span>
          </div>
        </div>

        {/* Total Setor Card */}
        <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Seluruh Setoran</p>
            <h4 className="text-2xl font-display font-black text-emerald-600 mt-2">
              {formatRupiah(totalSetor)}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Akumulasi Uang Masuk</p>
          </div>
          <div className="bg-emerald-50 border-2 border-slate-900 p-3 text-emerald-600">
            <ArrowUpRight size={24} strokeWidth={3} />
          </div>
        </div>

        {/* Total Tarik Card */}
        <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Penarikan</p>
            <h4 className="text-2xl font-display font-black text-rose-500 mt-2">
              {formatRupiah(totalTarik)}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Akumulasi Uang Diambil</p>
          </div>
          <div className="bg-rose-50 border-2 border-slate-900 p-3 text-rose-600">
            <ArrowDownRight size={24} strokeWidth={3} />
          </div>
        </div>

      </div>

      {/* Progress Chart */}
      <div className="bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] print:hidden">
        <h3 className="font-display font-black text-slate-900 text-xl flex items-center gap-2 uppercase tracking-tight">
          <TrendingUp className="text-emerald-500" strokeWidth={3} /> Grafik Pertumbuhan Tabungan
        </h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 mb-6">Tren perubahan saldo tabungan anak dari waktu ke waktu</p>

        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 10, fill: '#0F172A', fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10, fill: '#0F172A', fontWeight: 'bold' }} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [formatRupiah(val), "Saldo"]}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '0px', border: '2px solid #0F172A', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Saldo" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">
              Belum ada data transaksi untuk menampilkan grafik.
            </div>
          )}
        </div>
      </div>

      {/* Mutasi Transaksi List */}
      <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
        <div className="p-6 border-b-4 border-slate-900 flex justify-between items-center print:hidden bg-slate-50">
          <div>
            <h3 className="font-display font-black text-slate-900 text-xl uppercase tracking-tight">
              Mutasi Rekening Tabungan
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Riwayat lengkap mutasi tabungan terurut terbaru</p>
          </div>
          <span className="text-xs bg-amber-400 border-2 border-slate-900 text-slate-900 font-black px-3 py-1 uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
            {historyTx.length} Transaksi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-950 border-b-2 border-slate-900 text-xs font-black uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-right">Saldo Berjalan</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 print:hidden">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-900 font-bold text-slate-800">
              {historyTx.length > 0 ? (
                historyTx.map((tx) => (
                  <tr key={tx.transaksi_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-900" />
                        <span>{new Date(tx.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.jenis === 'setor' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-800 px-2.5 py-1 uppercase tracking-wider">
                          <ArrowUpRight size={10} strokeWidth={3} /> Setor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-800 px-2.5 py-1 uppercase tracking-wider">
                          <ArrowDownRight size={10} strokeWidth={3} /> Tarik
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right font-black text-base ${tx.jenis === 'setor' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.jenis === 'setor' ? '+' : '-'} {formatRupiah(tx.nominal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-black text-slate-900 text-base">
                      {formatRupiah(tx.saldo_setelah)}
                    </td>
                    <td className="px-6 py-4 text-slate-700 max-w-xs truncate font-bold">
                      {tx.keterangan || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-mono print:hidden font-medium">
                      {tx.input_by}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase">
                    Belum ada riwayat transaksi tabungan untuk siswa ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
