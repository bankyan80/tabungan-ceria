export type UserRole = 'admin' | 'wali_kelas' | 'wali_siswa' | 'kepala_sekolah';
export type UserStatus = 'aktif' | 'nonaktif';
export type SiswaStatus = 'aktif' | 'lulus' | 'pindah';
export type TransaksiJenis = 'setor' | 'tarik';

export interface UserRow {
  user_id: string;
  nama: string;
  email: string;
  role: UserRole;
  kelas_id: string; // for wali_kelas
  siswa_id: string; // for wali_siswa
  status: UserStatus;
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  sekolah?: string;
}

export interface KelasRow {
  kelas_id: string;
  nama_kelas: string;
  wali_kelas_id: string; // user_id or email
  tahun_ajaran: string;
}

export interface SiswaRow {
  siswa_id: string;
  nama: string;
  nisn: string;
  kelas_id: string;
  saldo: number;
  status: SiswaStatus;
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  sekolah?: string;
}

export interface TransaksiRow {
  transaksi_id: string;
  siswa_id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: TransaksiJenis;
  nominal: number;
  saldo_setelah: number;
  keterangan: string;
  input_by: string; // email/name or user_id
  timestamp: string; // YYYY-MM-DD HH:mm:ss
}

export interface LogAuditRow {
  log_id: string;
  user_id: string;
  aksi: 'create' | 'update' | 'delete';
  target: string; // transaksi_id or siswa_id
  detail_sebelum: string; // JSON string
  detail_sesudah: string; // JSON string
  timestamp: string;
}

export interface DatabaseState {
  users: UserRow[];
  kelas: KelasRow[];
  siswa: SiswaRow[];
  transaksi: TransaksiRow[];
  logs: LogAuditRow[];
}
