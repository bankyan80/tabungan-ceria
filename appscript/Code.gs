/**
 * Tabungan Ceria - Google Apps Script Backend
 * 
 * This script acts as a REST API backend for the Tabungan Ceria app.
 * Deploy as a Web App to handle all CRUD operations via Google Sheets.
 * 
 * Endpoints:
 *   GET  ?action=init         - Initialize spreadsheet with headers & seed data
 *   GET  ?action=load         - Load all data (users, kelas, siswa, transaksi, logs)
 *   POST ?action=addUser      - Add a new user
 *   POST ?action=updateUser   - Update an existing user
 *   POST ?action=addKelas     - Add a new class
 *   POST ?action=updateKelas  - Update an existing class
 *   POST ?action=addSiswa     - Add a new student
 *   POST ?action=updateSiswa  - Update an existing student
 *   POST ?action=createTransaksi - Create a transaction (deposit/withdrawal)
 *   POST ?action=cancelTransaksi - Cancel a transaction
 */

const SPREADSHEET_ID = '11V4W2g9DEFzxYyM10nj302JLCAKiMTTuaj9G3qWQUxQ';

const SHEET_NAMES = ['Users', 'Kelas', 'Siswa', 'Transaksi', 'Log_Audit'];

const HEADERS = {
  Users: ['user_id', 'nama', 'email', 'role', 'kelas_id', 'siswa_id', 'status', 'provinsi', 'kabupaten', 'kecamatan', 'sekolah'],
  Kelas: ['kelas_id', 'nama_kelas', 'wali_kelas_id', 'tahun_ajaran'],
  Siswa: ['siswa_id', 'nama', 'nisn', 'kelas_id', 'saldo', 'status', 'provinsi', 'kabupaten', 'kecamatan', 'sekolah'],
  Transaksi: ['transaksi_id', 'siswa_id', 'tanggal', 'jenis', 'nominal', 'saldo_setelah', 'keterangan', 'input_by', 'timestamp'],
  Log_Audit: ['log_id', 'user_id', 'aksi', 'target', 'detail_sebelum', 'detail_sesudah', 'timestamp']
};

const INITIAL_USERS = [
  { user_id: 'U-101', nama: 'Ahmad Subarjo', email: 'wali_kelas_1@example.com', role: 'wali_kelas', kelas_id: 'K-101', siswa_id: '', status: 'aktif' },
  { user_id: 'U-102', nama: 'Siti Rahma', email: 'wali_kelas_2@example.com', role: 'wali_kelas', kelas_id: 'K-102', siswa_id: '', status: 'aktif' },
  { user_id: 'U-103', nama: 'Rudi Pratama', email: 'wali_siswa_1@example.com', role: 'wali_siswa', kelas_id: '', siswa_id: 'S-101', status: 'aktif' },
  { user_id: 'U-104', nama: 'Drs. H. Mulyono', email: 'kepala_sekolah@example.com', role: 'kepala_sekolah', kelas_id: '', siswa_id: '', status: 'aktif' }
];

const INITIAL_KELAS = [
  { kelas_id: 'K-101', nama_kelas: 'Kelas 6A', wali_kelas_id: 'wali_kelas_1@example.com', tahun_ajaran: '2026/2027' },
  { kelas_id: 'K-102', nama_kelas: 'Kelas 6B', wali_kelas_id: 'wali_kelas_2@example.com', tahun_ajaran: '2026/2027' }
];

const INITIAL_SISWA = [
  { siswa_id: 'S-101', nama: 'Adit Pratama', nisn: '0012345678', kelas_id: 'K-101', saldo: 150000, status: 'aktif' },
  { siswa_id: 'S-102', nama: 'Budi Santoso', nisn: '0023456789', kelas_id: 'K-101', saldo: 75000, status: 'aktif' },
  { siswa_id: 'S-103', nama: 'Citra Lestari', nisn: '0034567890', kelas_id: 'K-101', saldo: 200000, status: 'aktif' },
  { siswa_id: 'S-104', nama: 'Dina Amalia', nisn: '0045678901', kelas_id: 'K-102', saldo: 50000, status: 'aktif' }
];

const INITIAL_TRANSAKSI = [
  { transaksi_id: 'T-101', siswa_id: 'S-101', tanggal: '2026-07-10', jenis: 'setor', nominal: 100000, saldo_setelah: 100000, keterangan: 'Setoran awal siswa baru', input_by: 'wali_kelas_1@example.com', timestamp: '2026-07-10 08:30:00' },
  { transaksi_id: 'T-102', siswa_id: 'S-101', tanggal: '2026-07-12', jenis: 'setor', nominal: 50000, saldo_setelah: 150000, keterangan: 'Tabungan mingguan rutin', input_by: 'wali_kelas_1@example.com', timestamp: '2026-07-12 09:15:00' },
  { transaksi_id: 'T-103', siswa_id: 'S-102', tanggal: '2026-07-11', jenis: 'setor', nominal: 100000, saldo_setelah: 100000, keterangan: 'Setoran perdana', input_by: 'wali_kelas_1@example.com', timestamp: '2026-07-11 10:00:00' },
  { transaksi_id: 'T-104', siswa_id: 'S-102', tanggal: '2026-07-14', jenis: 'tarik', nominal: 25000, saldo_setelah: 75000, keterangan: 'Beli buku tulis', input_by: 'wali_kelas_1@example.com', timestamp: '2026-07-14 11:30:00' },
  { transaksi_id: 'T-105', siswa_id: 'S-103', tanggal: '2026-07-13', jenis: 'setor', nominal: 200000, saldo_setelah: 200000, keterangan: 'Tabungan bulanan Juli', input_by: 'wali_kelas_1@example.com', timestamp: '2026-07-13 08:00:00' },
  { transaksi_id: 'T-106', siswa_id: 'S-104', tanggal: '2026-07-14', jenis: 'setor', nominal: 50000, saldo_setelah: 50000, keterangan: 'Setoran awal', input_by: 'wali_kelas_2@example.com', timestamp: '2026-07-14 09:00:00' }
];

const INITIAL_LOG_AUDIT = [
  { log_id: 'L-101', user_id: 'wali_kelas_1@example.com', aksi: 'create', target: 'T-101', detail_sebelum: '', detail_sesudah: '{"siswa_id":"S-101","nominal":100000}', timestamp: '2026-07-10 08:30:00' },
  { log_id: 'L-102', user_id: 'wali_kelas_1@example.com', aksi: 'create', target: 'T-102', detail_sebelum: '', detail_sesudah: '{"siswa_id":"S-101","nominal":50000}', timestamp: '2026-07-12 09:15:00' }
];

// ─── WEB APP ENTRY POINTS ───────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  var action = '';
  
  if (method === 'GET') {
    action = e.parameter.action || '';
  } else if (method === 'POST') {
    var body = {};
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({ success: false, error: 'Invalid JSON body: ' + err.message });
    }
    action = body.action || e.parameter.action || '';
  }

  try {
    switch (action) {
      case 'init':
        return jsonResponse({ success: true, data: initSpreadsheet() });
      case 'load':
        return jsonResponse({ success: true, data: loadAllData() });
      case 'addUser':
        return jsonResponse({ success: true, data: addUser(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'updateUser':
        return jsonResponse({ success: true, data: updateUser(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'addKelas':
        return jsonResponse({ success: true, data: addKelas(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'updateKelas':
        return jsonResponse({ success: true, data: updateKelas(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'addSiswa':
        return jsonResponse({ success: true, data: addSiswa(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'updateSiswa':
        return jsonResponse({ success: true, data: updateSiswa(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'createTransaksi':
        return jsonResponse({ success: true, data: createTransaksi(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      case 'cancelTransaksi':
        return jsonResponse({ success: true, data: cancelTransaksi(method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter) });
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── SPREADSHEET HELPERS ────────────────────────────────────────────────────

function getOrCreateSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function ensureHeaders(sheet, sheetName) {
  var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var expectedHeaders = HEADERS[sheetName];
  
  if (existingHeaders.length === 0 || existingHeaders[0] === '') {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}

function sheetToObjects(sheet, sheetName) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return [];
  
  var headers = HEADERS[sheetName];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      var val = row[index] !== undefined && row[index] !== null ? row[index] : '';
      if (header === 'saldo' || header === 'nominal' || header === 'saldo_setelah') {
        obj[header] = Number(val) || 0;
      } else {
        obj[header] = String(val);
      }
    });
    return obj;
  });
}

function objectToRow(sheetName, obj) {
  var headers = HEADERS[sheetName];
  return headers.map(function(header) {
    var val = obj[header];
    if (val === undefined || val === null) return '';
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  });
}

function findRowIndex(sheet, sheetName, idValue) {
  var headers = HEADERS[sheetName];
  var idCol = 1; // First column is always the ID
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return -1;
  
  var idData = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < idData.length; i++) {
    if (String(idData[i][0]) === String(idValue)) {
      return i + 2; // 1-based, +1 for header row
    }
  }
  return -1;
}

// ─── INIT ───────────────────────────────────────────────────────────────────

function initSpreadsheet() {
  var ss = getOrCreateSpreadsheet();
  var results = {};
  
  SHEET_NAMES.forEach(function(sheetName) {
    var sheet = getOrCreateSheet(ss, sheetName);
    ensureHeaders(sheet, sheetName);
    results[sheetName] = 'initialized';
  });

  // Seed data only if sheets are empty
  seedSheet(ss, 'Users', INITIAL_USERS);
  seedSheet(ss, 'Kelas', INITIAL_KELAS);
  seedSheet(ss, 'Siswa', INITIAL_SISWA);
  seedSheet(ss, 'Transaksi', INITIAL_TRANSAKSI);
  seedSheet(ss, 'Log_Audit', INITIAL_LOG_AUDIT);
  
  return { spreadsheetId: ss.getId(), url: ss.getUrl() };
}

function seedSheet(ss, sheetName, seedData) {
  var sheet = ss.getSheetByName(sheetName);
  if (sheet.getLastRow() > 1) return; // Already has data
  
  var rows = seedData.map(function(item) {
    return objectToRow(sheetName, item);
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

// ─── LOAD ALL DATA ──────────────────────────────────────────────────────────

function loadAllData() {
  var ss = getOrCreateSpreadsheet();
  var result = {};
  
  SHEET_NAMES.forEach(function(sheetName) {
    var sheet = getOrCreateSheet(ss, sheetName);
    ensureHeaders(sheet, sheetName);
    result[sheetName.toLowerCase()] = sheetToObjects(sheet, sheetName);
  });
  
  return result;
}

// ─── USERS CRUD ─────────────────────────────────────────────────────────────

function addUser(data) {
  var user = data.user || data;
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Users');
  ensureHeaders(sheet, 'Users');
  
  var row = objectToRow('Users', user);
  sheet.appendRow(row);
  
  return user;
}

function updateUser(data) {
  var user = data.user || data;
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Users');
  
  var rowIdx = findRowIndex(sheet, 'Users', user.user_id);
  if (rowIdx === -1) throw new Error('User not found: ' + user.user_id);
  
  var row = objectToRow('Users', user);
  sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  
  return user;
}

// ─── KELAS CRUD ─────────────────────────────────────────────────────────────

function addKelas(data) {
  var kelas = data.kelas || data;
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Kelas');
  ensureHeaders(sheet, 'Kelas');
  
  var row = objectToRow('Kelas', kelas);
  sheet.appendRow(row);
  
  return kelas;
}

function updateKelas(data) {
  var kelas = data.kelas || data;
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Kelas');
  
  var rowIdx = findRowIndex(sheet, 'Kelas', kelas.kelas_id);
  if (rowIdx === -1) throw new Error('Kelas not found: ' + kelas.kelas_id);
  
  var row = objectToRow('Kelas', kelas);
  sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  
  return kelas;
}

// ─── SISWA CRUD ─────────────────────────────────────────────────────────────

function addSiswa(data) {
  var siswa = data.siswa || data;
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Siswa');
  ensureHeaders(sheet, 'Siswa');
  
  var row = objectToRow('Siswa', siswa);
  sheet.appendRow(row);
  
  return siswa;
}

function updateSiswa(data) {
  var siswa = data.siswa || data;
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Siswa');
  
  var rowIdx = findRowIndex(sheet, 'Siswa', siswa.siswa_id);
  if (rowIdx === -1) throw new Error('Siswa not found: ' + siswa.siswa_id);
  
  var row = objectToRow('Siswa', siswa);
  sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  
  return siswa;
}

// ─── TRANSAKSI CRUD ─────────────────────────────────────────────────────────

function createTransaksi(data) {
  var transaksi = data.transaksi || data;
  var ss = getOrCreateSpreadsheet();
  
  // Find student and update balance
  var siswaSheet = getOrCreateSheet(ss, 'Siswa');
  var siswaRowIdx = findRowIndex(siswaSheet, 'Siswa', transaksi.siswa_id);
  if (siswaRowIdx === -1) throw new Error('Siswa tidak ditemukan: ' + transaksi.siswa_id);
  
  var siswaHeaders = HEADERS.Siswa;
  var siswaRow = siswaSheet.getRange(siswaRowIdx, 1, 1, siswaHeaders.length).getValues()[0];
  var currentSaldo = Number(siswaRow[siswaHeaders.indexOf('saldo')]) || 0;
  var siswaName = siswaRow[siswaHeaders.indexOf('nama')] || '';
  
  var newSaldo = currentSaldo;
  if (transaksi.jenis === 'setor') {
    newSaldo += Number(transaksi.nominal);
  } else {
    if (currentSaldo < Number(transaksi.nominal)) {
      throw new Error('Saldo tidak mencukupi untuk penarikan.');
    }
    newSaldo -= Number(transaksi.nominal);
  }
  
  // Update student balance
  var saldoCol = siswaHeaders.indexOf('saldo') + 1;
  siswaSheet.getRange(siswaRowIdx, saldoCol).setValue(newSaldo);
  
  // Set saldo_setelah
  transaksi.saldo_setelah = newSaldo;
  
  // Append transaction
  var txSheet = getOrCreateSheet(ss, 'Transaksi');
  ensureHeaders(txSheet, 'Transaksi');
  var txRow = objectToRow('Transaksi', transaksi);
  txSheet.appendRow(txRow);
  
  // Create audit log
  var logSheet = getOrCreateSheet(ss, 'Log_Audit');
  ensureHeaders(logSheet, 'Log_Audit');
  var audit = {
    log_id: 'L-' + Utilities.getUuid().substring(0, 8),
    user_id: transaksi.input_by || '',
    aksi: 'create',
    target: transaksi.transaksi_id,
    detail_sebelum: '',
    detail_sesudah: JSON.stringify({
      siswa_id: transaksi.siswa_id,
      nama_siswa: siswaName,
      jenis: transaksi.jenis,
      nominal: Number(transaksi.nominal),
      saldo_sebelum: currentSaldo,
      saldo_setelah: newSaldo
    }),
    timestamp: transaksi.timestamp || ''
  };
  var logRow = objectToRow('Log_Audit', audit);
  logSheet.appendRow(logRow);
  
  return { transaksi: transaksi, audit: audit };
}

function cancelTransaksi(data) {
  var transaksiId = data.transaksi_id;
  var alasan = data.alasan || '';
  var operatorId = data.operator_id || '';
  
  if (!transaksiId) throw new Error('transaksi_id is required');
  
  var ss = getOrCreateSpreadsheet();
  
  // Find the transaction
  var txSheet = getOrCreateSheet(ss, 'Transaksi');
  var txRowIdx = findRowIndex(txSheet, 'Transaksi', transaksiId);
  if (txRowIdx === -1) throw new Error('Transaksi tidak ditemukan: ' + transaksiId);
  
  var txHeaders = HEADERS.Transaksi;
  var txRow = txSheet.getRange(txRowIdx, 1, 1, txHeaders.length).getValues()[0];
  var tx = {};
  txHeaders.forEach(function(h, i) { tx[h] = txRow[i]; });
  
  // Find student and reverse balance
  var siswaSheet = getOrCreateSheet(ss, 'Siswa');
  var siswaRowIdx = findRowIndex(siswaSheet, 'Siswa', tx.siswa_id);
  if (siswaRowIdx === -1) throw new Error('Siswa terkait transaksi tidak ditemukan.');
  
  var siswaHeaders = HEADERS.Siswa;
  var siswaRow = siswaSheet.getRange(siswaRowIdx, 1, 1, siswaHeaders.length).getValues()[0];
  var currentSaldo = Number(siswaRow[siswaHeaders.indexOf('saldo')]) || 0;
  
  var newSaldo = currentSaldo;
  if (tx.jenis === 'setor') {
    if (currentSaldo < Number(tx.nominal)) {
      throw new Error('Gagal membatalkan setoran: Saldo saat ini lebih kecil dari nominal setoran.');
    }
    newSaldo -= Number(tx.nominal);
  } else {
    newSaldo += Number(tx.nominal);
  }
  
  // Update student balance
  var saldoCol = siswaHeaders.indexOf('saldo') + 1;
  siswaSheet.getRange(siswaRowIdx, saldoCol).setValue(newSaldo);
  
  // Delete transaction row
  txSheet.deleteRow(txRowIdx);
  
  // Create audit log
  var logSheet = getOrCreateSheet(ss, 'Log_Audit');
  ensureHeaders(logSheet, 'Log_Audit');
  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  
  var audit = {
    log_id: 'L-' + Utilities.getUuid().substring(0, 8),
    user_id: operatorId,
    aksi: 'delete',
    target: transaksiId,
    detail_sebelum: JSON.stringify(tx),
    detail_sesudah: JSON.stringify({ alasan_pembatalan: alasan, saldo_baru_siswa: newSaldo }),
    timestamp: timestamp
  };
  var logRow = objectToRow('Log_Audit', audit);
  logSheet.appendRow(logRow);
  
  return { cancelled: transaksiId, audit: audit };
}
