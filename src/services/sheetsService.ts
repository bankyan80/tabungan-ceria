import { 
  type UserRow, 
  type KelasRow, 
  type SiswaRow, 
  type TransaksiRow, 
  type LogAuditRow, 
  type DatabaseState,
  type UserRole
} from '../types';

const HEADERS = {
  Users: ["user_id", "nama", "email", "role", "kelas_id", "siswa_id", "status"],
  Kelas: ["kelas_id", "nama_kelas", "wali_kelas_id", "tahun_ajaran"],
  Siswa: ["siswa_id", "nama", "nisn", "kelas_id", "saldo", "status"],
  Transaksi: ["transaksi_id", "siswa_id", "tanggal", "jenis", "nominal", "saldo_setelah", "keterangan", "input_by", "timestamp"],
  Log_Audit: ["log_id", "user_id", "aksi", "target", "detail_sebelum", "detail_sesudah", "timestamp"]
};

// Seed data
const INITIAL_USERS: UserRow[] = [
  { user_id: "U-101", nama: "Ahmad Subarjo", email: "wali_kelas_1@example.com", role: "wali_kelas", kelas_id: "K-101", siswa_id: "", status: "aktif" },
  { user_id: "U-102", nama: "Siti Rahma", email: "wali_kelas_2@example.com", role: "wali_kelas", kelas_id: "K-102", siswa_id: "", status: "aktif" },
  { user_id: "U-103", nama: "Rudi Pratama", email: "wali_siswa_1@example.com", role: "wali_siswa", kelas_id: "", siswa_id: "S-101", status: "aktif" },
  { user_id: "U-104", nama: "Drs. H. Mulyono", email: "kepala_sekolah@example.com", role: "kepala_sekolah", kelas_id: "", siswa_id: "", status: "aktif" }
];

const INITIAL_KELAS: KelasRow[] = [
  { kelas_id: "K-101", nama_kelas: "Kelas 6A", wali_kelas_id: "wali_kelas_1@example.com", tahun_ajaran: "2026/2027" },
  { kelas_id: "K-102", nama_kelas: "Kelas 6B", wali_kelas_id: "wali_kelas_2@example.com", tahun_ajaran: "2026/2027" }
];

const INITIAL_SISWA: SiswaRow[] = [
  { siswa_id: "S-101", nama: "Adit Pratama", nisn: "0012345678", kelas_id: "K-101", saldo: 150000, status: "aktif" },
  { siswa_id: "S-102", nama: "Budi Santoso", nisn: "0023456789", kelas_id: "K-101", saldo: 75000, status: "aktif" },
  { siswa_id: "S-103", nama: "Citra Lestari", nisn: "0034567890", kelas_id: "K-101", saldo: 200000, status: "aktif" },
  { siswa_id: "S-104", nama: "Dina Amalia", nisn: "0045678901", kelas_id: "K-102", saldo: 50000, status: "aktif" }
];

const INITIAL_TRANSAKSI: TransaksiRow[] = [
  { transaksi_id: "T-101", siswa_id: "S-101", tanggal: "2026-07-10", jenis: "setor", nominal: 100000, saldo_setelah: 100000, keterangan: "Setoran awal siswa baru", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-10 08:30:00" },
  { transaksi_id: "T-102", siswa_id: "S-101", tanggal: "2026-07-12", jenis: "setor", nominal: 50000, saldo_setelah: 150000, keterangan: "Tabungan mingguan rutin", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-12 09:15:00" },
  { transaksi_id: "T-103", siswa_id: "S-102", tanggal: "2026-07-11", jenis: "setor", nominal: 100000, saldo_setelah: 100000, keterangan: "Setoran perdana", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-11 10:00:00" },
  { transaksi_id: "T-104", siswa_id: "S-102", tanggal: "2026-07-14", jenis: "tarik", nominal: 25000, saldo_setelah: 75000, keterangan: "Beli buku tulis", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-14 11:30:00" },
  { transaksi_id: "T-105", siswa_id: "S-103", tanggal: "2026-07-13", jenis: "setor", nominal: 200000, saldo_setelah: 200000, keterangan: "Tabungan bulanan Juli", input_by: "wali_kelas_1@example.com", timestamp: "2026-07-13 08:00:00" },
  { transaksi_id: "T-106", siswa_id: "S-104", tanggal: "2026-07-14", jenis: "setor", nominal: 50000, saldo_setelah: 50000, keterangan: "Setoran awal", input_by: "wali_kelas_2@example.com", timestamp: "2026-07-14 09:00:00" }
];

const INITIAL_LOG_AUDIT: LogAuditRow[] = [
  { log_id: "L-101", user_id: "wali_kelas_1@example.com", aksi: "create", target: "T-101", detail_sebelum: "", detail_sesudah: "{\"siswa_id\":\"S-101\",\"nominal\":100000}", timestamp: "2026-07-10 08:30:00" },
  { log_id: "L-102", user_id: "wali_kelas_1@example.com", aksi: "create", target: "T-102", detail_sebelum: "", detail_sesudah: "{\"siswa_id\":\"S-101\",\"nominal\":50000}", timestamp: "2026-07-12 09:15:00" }
];

// Helper to convert sheet rows array of array to object arrays
function rowsToObjects<T>(headers: string[], rows: any[][]): T[] {
  if (!rows || rows.length === 0) return [];
  return rows.map((row) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      let val = row[index] !== undefined && row[index] !== null ? row[index] : "";
      if (header === "saldo" || header === "nominal" || header === "saldo_setelah") {
        obj[header] = Number(val) || 0;
      } else {
        obj[header] = val;
      }
    });
    return obj as T;
  });
}

function objectToRow(headers: string[], obj: any): any[] {
  return headers.map((header) => {
    const val = obj[header];
    if (val === undefined || val === null) return "";
    return typeof val === "object" ? JSON.stringify(val) : String(val);
  });
}

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

  // Additional scope check for wali_kelas: can only manage their own class
  if (userRole === 'wali_kelas' && context?.kelasId && context?.database) {
    const userClass = context.database.kelas.find(k => 
      k.wali_kelas_id === userEmail
    );
    if (userClass && userClass.kelas_id !== context.kelasId) {
      throw new Error('Akses ditolak: Wali Kelas hanya dapat mengelola kelas sendiri.');
    }
  }
}

export class SheetsService {
  private spreadsheetId: string | null = null;
  private accessToken: string | null = null;
  private sheetIdMap: Record<string, number> = {}; // sheet title -> sheetId
  private localDb: DatabaseState;

  constructor() {
    this.spreadsheetId = localStorage.getItem('tabungan_ceria_spreadsheet_id');
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
  }

  private getInitialLocalDb(): DatabaseState {
    return {
      users: [...INITIAL_USERS],
      kelas: [...INITIAL_KELAS],
      siswa: [...INITIAL_SISWA],
      transaksi: [...INITIAL_TRANSAKSI],
      logs: [...INITIAL_LOG_AUDIT]
    };
  }

  private saveLocalDb() {
    localStorage.setItem('tabungan_ceria_local_db', JSON.stringify(this.localDb));
  }

  public isConnected(): boolean {
    return !!this.spreadsheetId && !!this.accessToken;
  }

  public getSpreadsheetId(): string | null {
    return this.spreadsheetId;
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  // Find spreadsheet in Google Drive, or create a new one
  public async connectOrInitialize(token: string, userEmail: string, userDisplayName: string): Promise<string> {
    this.accessToken = token;
    
    try {
      // 1. Search for existing file
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='Tabungan Ceria Database' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!searchRes.ok) {
        throw new Error(`Gagal mencari file di Google Drive: ${searchRes.statusText}`);
      }
      
      const searchData = await searchRes.json();
      
      if (searchData.files && searchData.files.length > 0) {
        // Spreadsheet exists!
        const id = searchData.files[0].id;
        this.spreadsheetId = id;
        localStorage.setItem('tabungan_ceria_spreadsheet_id', id);
        await this.fetchSheetIds();
        return id;
      }
      
      // 2. Spreadsheet does not exist, create it!
      const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: "Tabungan Ceria Database"
          },
          sheets: [
            { properties: { title: "Users" } },
            { properties: { title: "Kelas" } },
            { properties: { title: "Siswa" } },
            { properties: { title: "Transaksi" } },
            { properties: { title: "Log_Audit" } }
          ]
        })
      });

      if (!createRes.ok) {
        throw new Error(`Gagal membuat Spreadsheet: ${createRes.statusText}`);
      }

      const createdSpreadsheet = await createRes.json();
      const id = createdSpreadsheet.spreadsheetId;
      this.spreadsheetId = id;
      localStorage.setItem('tabungan_ceria_spreadsheet_id', id);

      // Save sheets metadata
      createdSpreadsheet.sheets.forEach((sheet: any) => {
        this.sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
      });

      // 3. Populate default headers and seed data
      // For each sheet, we perform a batch update of values
      const valueRanges = [
        { range: "Users!A1", values: [HEADERS.Users, ...this.localDb.users.map(u => objectToRow(HEADERS.Users, u))] },
        { range: "Kelas!A1", values: [HEADERS.Kelas, ...this.localDb.kelas.map(k => objectToRow(HEADERS.Kelas, k))] },
        { range: "Siswa!A1", values: [HEADERS.Siswa, ...this.localDb.siswa.map(s => objectToRow(HEADERS.Siswa, s))] },
        { range: "Transaksi!A1", values: [HEADERS.Transaksi, ...this.localDb.transaksi.map(t => objectToRow(HEADERS.Transaksi, t))] },
        { range: "Log_Audit!A1", values: [HEADERS.Log_Audit, ...this.localDb.logs.map(l => objectToRow(HEADERS.Log_Audit, l))] }
      ];

      // Add the current logged-in user as Admin if not already present
      const alreadyInUser = this.localDb.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
      if (!alreadyInUser) {
        const newUser: UserRow = {
          user_id: "U-" + crypto.randomUUID().slice(0, 8),
          nama: userDisplayName || "Admin Utama",
          email: userEmail,
          role: "admin",
          kelas_id: "",
          siswa_id: "",
          status: "aktif"
        };
        valueRanges[0].values.push(objectToRow(HEADERS.Users, newUser));
        this.localDb.users.push(newUser);
        this.saveLocalDb();
      }

      const populateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchUpdate`;
      const populateRes = await fetch(populateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: valueRanges
        })
      });

      if (!populateRes.ok) {
        console.error("Gagal mengisi data awal sheet:", await populateRes.text());
      }

      return id;
    } catch (error) {
      console.error("Initialization error:", error);
      throw error;
    }
  }

  // Fetch sheetIds for the spreadsheet
  private async fetchSheetIds() {
    if (!this.spreadsheetId || !this.accessToken) return;
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?fields=sheets(properties(sheetId,title))`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        data.sheets.forEach((sheet: any) => {
          this.sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
        });
      }
    } catch (err) {
      console.error("Failed to fetch sheet IDs:", err);
    }
  }

  // Reset connection
  public disconnect() {
    this.spreadsheetId = null;
    this.accessToken = null;
    this.sheetIdMap = {};
    localStorage.removeItem('tabungan_ceria_spreadsheet_id');
  }

  // Fetch all data
  public async loadAllData(): Promise<DatabaseState> {
    if (!this.spreadsheetId || !this.accessToken) {
      // Return local database copy
      return { ...this.localDb };
    }

    try {
      // Query sheets in batch
      const ranges = ["Users!A:Z", "Kelas!A:Z", "Siswa!A:Z", "Transaksi!A:Z", "Log_Audit!A:Z"];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });

      if (!res.ok) {
        throw new Error(`Gagal memuat data dari Google Sheets: ${res.statusText}`);
      }

      const data = await res.json();
      const valueRanges = data.valueRanges || [];

      // Map each sheet
      const usersData = valueRanges[0]?.values || [];
      const kelasData = valueRanges[1]?.values || [];
      const siswaData = valueRanges[2]?.values || [];
      const transaksiData = valueRanges[3]?.values || [];
      const logsData = valueRanges[4]?.values || [];

      const users = rowsToObjects<UserRow>(HEADERS.Users, usersData.slice(1));
      const kelas = rowsToObjects<KelasRow>(HEADERS.Kelas, kelasData.slice(1));
      const siswa = rowsToObjects<SiswaRow>(HEADERS.Siswa, siswaData.slice(1));
      const transaksi = rowsToObjects<TransaksiRow>(HEADERS.Transaksi, transaksiData.slice(1));
      const logs = rowsToObjects<LogAuditRow>(HEADERS.Log_Audit, logsData.slice(1));

      // Update local storage db cache as backup
      this.localDb = { users, kelas, siswa, transaksi, logs };
      this.saveLocalDb();

      return this.localDb;
    } catch (err) {
      console.error("Error reading sheets, falling back to local DB cache", err);
      return { ...this.localDb };
    }
  }

  // Append a row to a sheet
  private async appendRow(sheetName: keyof typeof HEADERS, rowData: any) {
    if (this.spreadsheetId && this.accessToken) {
      try {
        const headers = HEADERS[sheetName];
        const row = objectToRow(headers, rowData);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED`;
        
        await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [row]
          })
        });
      } catch (err) {
        console.error(`Gagal menulis baris baru ke sheet ${sheetName}:`, err);
      }
    }
  }

  // Update a row in a sheet. Since Sheets API doesn't have a direct "update where ID=x",
  // we first need to query the row index, then overwrite. For safety & performance, we can
  // query the column (like A:A or entire sheet), find the index of the ID, and PUT to that row.
  private async updateRow(sheetName: keyof typeof HEADERS, idColumnIndex: number, idValue: string, rowData: any) {
    if (this.spreadsheetId && this.accessToken) {
      try {
        const headers = HEADERS[sheetName];
        // 1. Get the primary ID column
        const colLetter = String.fromCharCode(65 + idColumnIndex); // A, B, C...
        const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!${colLetter}:${colLetter}`;
        const resGet = await fetch(urlGet, {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        
        if (resGet.ok) {
          const colData = await resGet.json();
          const rows = colData.values || [];
          
          // Find row index (0-based)
          const rowIndex = rows.findIndex((row: any[]) => row[0] === idValue);
          if (rowIndex !== -1) {
            const rowNumber = rowIndex + 1; // 1-based index of Sheet
            const urlPut = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!A${rowNumber}:Z${rowNumber}?valueInputOption=USER_ENTERED`;
            
            const updatedRow = objectToRow(headers, rowData);
            await fetch(urlPut, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                values: [updatedRow]
              })
            });
          }
        }
      } catch (err) {
        console.error(`Gagal update baris di sheet ${sheetName}:`, err);
      }
    }
  }

  // Delete a row from sheet
  private async deleteRow(sheetName: keyof typeof HEADERS, idColumnIndex: number, idValue: string) {
    if (this.spreadsheetId && this.accessToken) {
      try {
        const sheetId = this.sheetIdMap[sheetName];
        if (sheetId === undefined) {
          await this.fetchSheetIds();
        }
        const activeSheetId = this.sheetIdMap[sheetName];
        if (activeSheetId === undefined) return;

        // Find the index of the ID
        const colLetter = String.fromCharCode(65 + idColumnIndex);
        const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!${colLetter}:${colLetter}`;
        const resGet = await fetch(urlGet, {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (resGet.ok) {
          const colData = await resGet.json();
          const rows = colData.values || [];
          const rowIndex = rows.findIndex((row: any[]) => row[0] === idValue);
          
          if (rowIndex !== -1) {
            const urlDelete = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`;
            await fetch(urlDelete, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requests: [
                  {
                    deleteDimension: {
                      range: {
                        sheetId: activeSheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                      }
                    }
                  }
                ]
              })
            });
          }
        }
      } catch (err) {
        console.error(`Gagal menghapus baris di sheet ${sheetName}:`, err);
      }
    }
  }

  // Business Logic API wrapper

  // 1. Users Operations
  public async addUser(user: UserRow, operatorRole: UserRole = 'admin', operatorEmail: string = ''): Promise<void> {
    checkPermission(operatorRole, operatorEmail, 'add_user');
    this.localDb.users.push(user);
    this.saveLocalDb();
    await this.appendRow("Users", user);
  }

  public async updateUser(user: UserRow): Promise<void> {
    const idx = this.localDb.users.findIndex(u => u.user_id === user.user_id);
    if (idx !== -1) {
      this.localDb.users[idx] = user;
      this.saveLocalDb();
    }
    await this.updateRow("Users", 0, user.user_id, user);
  }

  // 2. Kelas Operations
  public async addKelas(kelas: KelasRow): Promise<void> {
    this.localDb.kelas.push(kelas);
    this.saveLocalDb();
    await this.appendRow("Kelas", kelas);
  }

  public async updateKelas(kelas: KelasRow): Promise<void> {
    const idx = this.localDb.kelas.findIndex(k => k.kelas_id === kelas.kelas_id);
    if (idx !== -1) {
      this.localDb.kelas[idx] = kelas;
      this.saveLocalDb();
    }
    await this.updateRow("Kelas", 0, kelas.kelas_id, kelas);
  }

  // 3. Siswa Operations
  public async addSiswa(siswa: SiswaRow, operatorRole: UserRole = 'admin', operatorEmail: string = ''): Promise<void> {
    checkPermission(operatorRole, operatorEmail, 'add_siswa', {
      kelasId: siswa.kelas_id,
      database: this.localDb
    });
    this.localDb.siswa.push(siswa);
    this.saveLocalDb();
    await this.appendRow("Siswa", siswa);
  }

  public async updateSiswa(siswa: SiswaRow): Promise<void> {
    const idx = this.localDb.siswa.findIndex(s => s.siswa_id === siswa.siswa_id);
    if (idx !== -1) {
      this.localDb.siswa[idx] = siswa;
      this.saveLocalDb();
    }
    await this.updateRow("Siswa", 0, siswa.siswa_id, siswa);
  }

  // 4. Create Transaction (Atomic update of Siswa balance + append transaction + write audit log)
  public async createTransaksi(transaksi: TransaksiRow, operatorId: string, operatorRole: UserRole = 'wali_kelas'): Promise<void> {
    checkPermission(operatorRole, operatorId, 'create_transaksi');

    // 1. Find and update Student
    const siswaIdx = this.localDb.siswa.findIndex(s => s.siswa_id === transaksi.siswa_id);
    if (siswaIdx === -1) {
      throw new Error("Siswa tidak ditemukan.");
    }

    const s = this.localDb.siswa[siswaIdx];
    const previousSaldo = s.saldo;
    
    // Calculate new balance
    let newSaldo = previousSaldo;
    if (transaksi.jenis === 'setor') {
      newSaldo += transaksi.nominal;
    } else {
      if (previousSaldo < transaksi.nominal) {
        throw new Error("Saldo tidak mencukupi untuk penarikan.");
      }
      newSaldo -= transaksi.nominal;
    }

    // Update siswa balance locally
    const updatedSiswa = { ...s, saldo: newSaldo };
    this.localDb.siswa[siswaIdx] = updatedSiswa;

    // Set transactional properties
    transaksi.saldo_setelah = newSaldo;

    // Add transaction locally
    this.localDb.transaksi.push(transaksi);

    // Create Audit Log
    const audit: LogAuditRow = {
      log_id: "L-" + Math.floor(100000 + Math.random() * 900000),
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

    // Persist local DB
    this.saveLocalDb();

    // Persist to Google Sheets asynchronously
    if (this.spreadsheetId && this.accessToken) {
      try {
        // Run update on Siswa, append to Transaksi, append to Log_Audit
        await Promise.all([
          this.updateRow("Siswa", 0, updatedSiswa.siswa_id, updatedSiswa),
          this.appendRow("Transaksi", transaksi),
          this.appendRow("Log_Audit", audit)
        ]);
      } catch (err) {
        console.error("Gagal menyinkronkan transaksi ke Google Sheets:", err);
      }
    }
  }

  // 5. Cancel or Correct Transaction (Reverse the transaction + update Siswa balance + log)
  public async cancelTransaksi(transaksiId: string, operatorId: string, alasan: string, operatorRole: UserRole = 'kepala_sekolah'): Promise<void> {
    checkPermission(operatorRole, operatorId, 'cancel_transaksi');
    const txIdx = this.localDb.transaksi.findIndex(t => t.transaksi_id === transaksiId);
    if (txIdx === -1) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const tx = this.localDb.transaksi[txIdx];
    
    // Find Student
    const siswaIdx = this.localDb.siswa.findIndex(s => s.siswa_id === tx.siswa_id);
    if (siswaIdx === -1) {
      throw new Error("Siswa terkait transaksi tidak ditemukan.");
    }

    const s = this.localDb.siswa[siswaIdx];
    const previousSaldo = s.saldo;

    // Reverse logic
    let newSaldo = previousSaldo;
    if (tx.jenis === 'setor') {
      if (previousSaldo < tx.nominal) {
        throw new Error("Gagal membatalkan setoran: Saldo saat ini lebih kecil dari nominal setoran (uang sudah ditarik).");
      }
      newSaldo -= tx.nominal;
    } else {
      newSaldo += tx.nominal;
    }

    // Update siswa balance locally
    const updatedSiswa = { ...s, saldo: newSaldo };
    this.localDb.siswa[siswaIdx] = updatedSiswa;

    // Log detail
    const audit: LogAuditRow = {
      log_id: "L-" + Math.floor(100000 + Math.random() * 900000),
      user_id: operatorId,
      aksi: "delete",
      target: transaksiId,
      detail_sebelum: JSON.stringify(tx),
      detail_sesudah: JSON.stringify({ alasan_pembatalan: alasan, saldo_baru_siswa: newSaldo }),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    this.localDb.logs.push(audit);

    // Remove transaction locally
    this.localDb.transaksi.splice(txIdx, 1);

    // Persist local DB
    this.saveLocalDb();

    // Persist to Google Sheets
    if (this.spreadsheetId && this.accessToken) {
      try {
        await Promise.all([
          this.updateRow("Siswa", 0, updatedSiswa.siswa_id, updatedSiswa),
          this.deleteRow("Transaksi", 0, transaksiId),
          this.appendRow("Log_Audit", audit)
        ]);
      } catch (err) {
        console.error("Gagal sinkronisasi pembatalan transaksi ke Google Sheets:", err);
      }
    }
  }
}

export const sheetsService = new SheetsService();
