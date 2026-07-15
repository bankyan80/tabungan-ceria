import { 
  type UserRow, 
  type KelasRow, 
  type SiswaRow, 
  type TransaksiRow, 
  type LogAuditRow, 
  type DatabaseState,
  type UserRole
} from '../types';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5UeqAD4RmutRMFu7EOqE5IOSSo2zaWRhO7tL3lJBAx4wJ0BxopNG190GDaf7Y0Bz41g/exec';

// Role-based access control helper
function checkPermission(
  userRole: UserRole,
  userEmail: string,
  action: 'add_siswa' | 'create_transaksi' | 'cancel_transaksi' | 'add_user',
  context?: { kelasId?: string; siswaId?: string; database?: DatabaseState }
): void {
  const allowedRoles: Record<string, UserRole[]> = {
    add_siswa: ['admin', 'kepala_sekolah', 'wali_kelas'],
    create_transaksi: ['admin', 'kepala_sekolah', 'wali_kelas'],
    cancel_transaksi: ['admin', 'kepala_sekolah'],
    add_user: ['admin', 'kepala_sekolah'],
  };

  if (!allowedRoles[action]?.includes(userRole)) {
    throw new Error(`Akses ditolak: Peran ${userRole} tidak memiliki izin untuk ${action.replace(/_/g, ' ')}.`);
  }

  if (userRole === 'wali_kelas' && context?.kelasId && context?.database) {
    const userClass = context.database.kelas.find(k => 
      k.wali_kelas_id === userEmail
    );
    if (userClass && userClass.kelas_id !== context.kelasId) {
      throw new Error('Akses ditolak: Wali Kelas hanya dapat mengelola kelas sendiri.');
    }
  }
}

// Apps Script API helper
async function callAppsScript(action: string, body?: Record<string, unknown>): Promise<unknown> {
  const payload = body ? { action, ...body } : { action };
  
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
  
  // Apps Script with mode:'no-cors' won't return readable response
  // We need to use redirect=studio or parse differently
  // For Apps Script web apps, GET with action param works better
  
  const getUrl = `${APPS_SCRIPT_URL}?action=${action}`;
  const getRes = await fetch(getUrl);
  
  if (!getRes.ok) {
    throw new Error(`Apps Script error: ${getRes.statusText}`);
  }
  
  const data = await getRes.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown Apps Script error');
  }
  
  return data.data;
}

async function postToAppsScript(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const body = JSON.stringify({ action, ...payload });
  
  // Use redirect=studio to avoid CORS issues with Apps Script
  const url = `${APPS_SCRIPT_URL}?action=${action}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: body
  });
  
  if (!res.ok) {
    throw new Error(`Apps Script error: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown Apps Script error');
  }
  
  return data.data;
}

export class SheetsService {
  private localDb: DatabaseState;
  private isCloudConnected = false;
  private spreadsheetId: string | null = null;

  constructor() {
    const savedLocal = localStorage.getItem('tabungan_ceria_local_db');
    if (savedLocal) {
      try {
        this.localDb = JSON.parse(savedLocal);
      } catch {
        this.localDb = this.getInitialLocalDb();
      }
    } else {
      this.localDb = this.getInitialLocalDb();
      this.saveLocalDb();
    }
    this.spreadsheetId = localStorage.getItem('tabungan_ceria_spreadsheet_id');
  }

  private getInitialLocalDb(): DatabaseState {
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
      transaksi: [
        { transaksi_id: "T-101", siswa_id: "S-101", tanggal: "2026-07-10", jenis: "setor", nominal: 100000, saldo_setelah: 100000, keterangan: "Setoran awal siswa baru", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-10 08:30:00" },
        { transaksi_id: "T-102", siswa_id: "S-101", tanggal: "2026-07-12", jenis: "setor", nominal: 50000, saldo_setelah: 150000, keterangan: "Tabungan mingguan rutin", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-12 09:15:00" },
        { transaksi_id: "T-103", siswa_id: "S-102", tanggal: "2026-07-11", jenis: "setor", nominal: 100000, saldo_setelah: 100000, keterangan: "Setoran perdana", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-11 10:00:00" },
        { transaksi_id: "T-104", siswa_id: "S-102", tanggal: "2026-07-14", jenis: "tarik", nominal: 25000, saldo_setelah: 75000, keterangan: "Beli buku tulis", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-14 11:30:00" },
        { transaksi_id: "T-105", siswa_id: "S-103", tanggal: "2026-07-13", jenis: "setor", nominal: 200000, saldo_setelah: 200000, keterangan: "Tabungan bulanan Juli", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-13 08:00:00" },
        { transaksi_id: "T-106", siswa_id: "S-104", tanggal: "2026-07-14", jenis: "setor", nominal: 50000, saldo_setelah: 50000, keterangan: "Setoran awal", input_by: "wali_kelas_2@example.com", timestamp: "2026-07-14 09:00:00" }
      ],
      logs: [
        { log_id: "L-101", user_id: "wali_kelas_1@example.com", aksi: "create", target: "T-101", detail_sebelum: "", detail_sesudah: "{\"siswa_id\":\"S-101\",\"nominal\":100000}", timestamp: "2026-07-10 08:30:00" },
        { log_id: "L-102", user_id: "wali_kelas_1@example.com", aksi: "create", target: "T-102", detail_sebelum: "", detail_sesudah: "{\"siswa_id\":\"S-101\",\"nominal\":50000}", timestamp: "2026-07-12 09:15:00" }
      ]
    };
  }

  private saveLocalDb() {
    localStorage.setItem('tabungan_ceria_local_db', JSON.stringify(this.localDb));
  }

  public isConnected(): boolean {
    return this.isCloudConnected;
  }

  public getSpreadsheetId(): string | null {
    return this.spreadsheetId;
  }

  public setAccessToken(_token: string | null) {
    // No longer needed with Apps Script backend
  }

  public async connectOrInitialize(_token: string, _userEmail: string, _userDisplayName: string): Promise<string> {
    try {
      const result = await callAppsScript('init') as { spreadsheetId: string; url: string };
      this.spreadsheetId = result.spreadsheetId;
      this.isCloudConnected = true;
      localStorage.setItem('tabungan_ceria_spreadsheet_id', result.spreadsheetId);
      return result.spreadsheetId;
    } catch (error) {
      console.error('Gagal menghubungkan ke Apps Script:', error);
      throw error;
    }
  }

  public disconnect() {
    this.isCloudConnected = false;
    this.spreadsheetId = null;
    localStorage.removeItem('tabungan_ceria_spreadsheet_id');
  }

  public async loadAllData(): Promise<DatabaseState> {
    if (!this.isCloudConnected) {
      return { ...this.localDb };
    }

    try {
      const data = await callAppsScript('load') as DatabaseState;
      this.localDb = {
        users: data.users || [],
        kelas: data.kelas || [],
        siswa: data.siswa || [],
        transaksi: data.transaksi || [],
        logs: data.logs || []
      };
      this.saveLocalDb();
      return this.localDb;
    } catch (err) {
      console.error("Error loading from Apps Script, falling back to local:", err);
      return { ...this.localDb };
    }
  }

  public async addUser(user: UserRow, operatorRole: UserRole = 'admin', operatorEmail: string = ''): Promise<void> {
    checkPermission(operatorRole, operatorEmail, 'add_user');
    this.localDb.users.push(user);
    this.saveLocalDb();
    
    if (this.isCloudConnected) {
      try {
        await postToAppsScript('addUser', { user });
      } catch (err) {
        console.error("Gagal sync user ke cloud:", err);
      }
    }
  }

  public async updateUser(user: UserRow): Promise<void> {
    const idx = this.localDb.users.findIndex(u => u.user_id === user.user_id);
    if (idx !== -1) {
      this.localDb.users[idx] = user;
      this.saveLocalDb();
    }
    
    if (this.isCloudConnected) {
      try {
        await postToAppsScript('updateUser', { user });
      } catch (err) {
        console.error("Gagal sync update user ke cloud:", err);
      }
    }
  }

  public async addKelas(kelas: KelasRow): Promise<void> {
    this.localDb.kelas.push(kelas);
    this.saveLocalDb();
    
    if (this.isCloudConnected) {
      try {
        await postToAppsScript('addKelas', { kelas });
      } catch (err) {
        console.error("Gagal sync kelas ke cloud:", err);
      }
    }
  }

  public async updateKelas(kelas: KelasRow): Promise<void> {
    const idx = this.localDb.kelas.findIndex(k => k.kelas_id === kelas.kelas_id);
    if (idx !== -1) {
      this.localDb.kelas[idx] = kelas;
      this.saveLocalDb();
    }
    
    if (this.isCloudConnected) {
      try {
        await postToAppsScript('updateKelas', { kelas });
      } catch (err) {
        console.error("Gagal sync update kelas ke cloud:", err);
      }
    }
  }

  public async addSiswa(siswa: SiswaRow, operatorRole: UserRole = 'admin', operatorEmail: string = ''): Promise<void> {
    checkPermission(operatorRole, operatorEmail, 'add_siswa', {
      kelasId: siswa.kelas_id,
      database: this.localDb
    });
    this.localDb.siswa.push(siswa);
    this.saveLocalDb();
    
    if (this.isCloudConnected) {
      try {
        await postToAppsScript('addSiswa', { siswa });
      } catch (err) {
        console.error("Gagal sync siswa ke cloud:", err);
      }
    }
  }

  public async updateSiswa(siswa: SiswaRow): Promise<void> {
    const idx = this.localDb.siswa.findIndex(s => s.siswa_id === siswa.siswa_id);
    if (idx !== -1) {
      this.localDb.siswa[idx] = siswa;
      this.saveLocalDb();
    }
    
    if (this.isCloudConnected) {
      try {
        await postToAppsScript('updateSiswa', { siswa });
      } catch (err) {
        console.error("Gagal sync update siswa ke cloud:", err);
      }
    }
  }

  public async createTransaksi(transaksi: TransaksiRow, operatorId: string, operatorRole: UserRole = 'wali_kelas'): Promise<void> {
    checkPermission(operatorRole, operatorId, 'create_transaksi');

    const siswaIdx = this.localDb.siswa.findIndex(s => s.siswa_id === transaksi.siswa_id);
    if (siswaIdx === -1) {
      throw new Error("Siswa tidak ditemukan.");
    }

    const s = this.localDb.siswa[siswaIdx];
    const previousSaldo = s.saldo;
    
    let newSaldo = previousSaldo;
    if (transaksi.jenis === 'setor') {
      newSaldo += transaksi.nominal;
    } else {
      if (previousSaldo < transaksi.nominal) {
        throw new Error("Saldo tidak mencukupi untuk penarikan.");
      }
      newSaldo -= transaksi.nominal;
    }

    const updatedSiswa = { ...s, saldo: newSaldo };
    this.localDb.siswa[siswaIdx] = updatedSiswa;
    transaksi.saldo_setelah = newSaldo;
    this.localDb.transaksi.push(transaksi);

    const audit: LogAuditRow = {
      log_id: "L-" + crypto.randomUUID().slice(0, 8),
      user_id: operatorId,
      aksi: "create",
      target: transaksi.transaksi_id,
      detail_sebelum: "",
      detail_sesudah: JSON.stringify({ 
        siswa_id: transaksi.siswa_id, 
        nama_siswa: s.nama,
        jenis: transaksi.jenis, 
        nominal: transaksi.nominal, 
        saldo_sebelum: previousSaldo,
        saldo_setelah: newSaldo 
      }),
      timestamp: transaksi.timestamp
    };
    this.localDb.logs.push(audit);
    this.saveLocalDb();

    if (this.isCloudConnected) {
      try {
        await postToAppsScript('createTransaksi', { transaksi });
      } catch (err) {
        console.error("Gagal sync transaksi ke cloud:", err);
      }
    }
  }

  public async cancelTransaksi(transaksiId: string, operatorId: string, alasan: string, operatorRole: UserRole = 'kepala_sekolah'): Promise<void> {
    checkPermission(operatorRole, operatorId, 'cancel_transaksi');
    
    const txIdx = this.localDb.transaksi.findIndex(t => t.transaksi_id === transaksiId);
    if (txIdx === -1) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const tx = this.localDb.transaksi[txIdx];
    const siswaIdx = this.localDb.siswa.findIndex(s => s.siswa_id === tx.siswa_id);
    if (siswaIdx === -1) {
      throw new Error("Siswa terkait transaksi tidak ditemukan.");
    }

    const s = this.localDb.siswa[siswaIdx];
    const previousSaldo = s.saldo;

    let newSaldo = previousSaldo;
    if (tx.jenis === 'setor') {
      if (previousSaldo < tx.nominal) {
        throw new Error("Gagal membatalkan setoran: Saldo saat ini lebih kecil dari nominal setoran (uang sudah ditarik).");
      }
      newSaldo -= tx.nominal;
    } else {
      newSaldo += tx.nominal;
    }

    const updatedSiswa = { ...s, saldo: newSaldo };
    this.localDb.siswa[siswaIdx] = updatedSiswa;

    const audit: LogAuditRow = {
      log_id: "L-" + crypto.randomUUID().slice(0, 8),
      user_id: operatorId,
      aksi: "delete",
      target: transaksiId,
      detail_sebelum: JSON.stringify(tx),
      detail_sesudah: JSON.stringify({ alasan_pembatalan: alasan, saldo_baru_siswa: newSaldo }),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    this.localDb.logs.push(audit);
    this.localDb.transaksi.splice(txIdx, 1);
    this.saveLocalDb();

    if (this.isCloudConnected) {
      try {
        await postToAppsScript('cancelTransaksi', { 
          transaksi_id: transaksiId, 
          alasan, 
          operator_id: operatorId 
        });
      } catch (err) {
        console.error("Gagal sync pembatalan ke cloud:", err);
      }
    }
  }
}

export const sheetsService = new SheetsService();
