import React from 'react';
import { Shield, Users, Link, RefreshCw, LogOut, School, Eye } from 'lucide-react';
import { type UserRole, type DatabaseState, type UserRow } from '../types';

interface RoleSelectorProps {
  currentRole: UserRole;
  selectedKelasId: string;
  onKelasChange: (kelasId: string) => void;
  selectedSiswaId: string;
  onSiswaChange: (siswaId: string) => void;
  database: DatabaseState;
  isConnected: boolean;
  spreadsheetId: string | null;
  userEmail: string | null;
  userDisplayName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  
  // Custom login state
  loggedInUser: UserRow | null;
  onLogoutPortal: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  selectedKelasId,
  onKelasChange,
  selectedSiswaId,
  onSiswaChange,
  database,
  isConnected,
  spreadsheetId,
  userEmail,
  userDisplayName,
  onConnect,
  onDisconnect,
  onRefresh,
  isRefreshing,
  loggedInUser,
  onLogoutPortal,
}) => {
  return (
    <div className="bg-white border-b-4 border-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 p-2 border-2 border-slate-900 text-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <School size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase leading-none">
                TABUNGAN<span className="text-blue-600 underline decoration-4 decoration-amber-400">CERIA</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                Sistem Tabungan Sekolah Berbasis Online
              </p>
            </div>
          </div>

          {/* Sync, Auth & Custom Login Status Card */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Google Sheets Connection info */}
            {isConnected ? (
              <div className="flex items-center gap-2 bg-amber-50 border-2 border-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                <span className="w-2 rounded-full h-2 bg-emerald-500 border border-slate-900 animate-pulse"></span>
                <span className="hidden sm:inline uppercase tracking-widest text-[8px] font-black">SINKRON:</span>
                <a 
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 flex items-center gap-1 font-mono bg-white px-2 py-0.5 border border-slate-900 font-bold"
                >
                  {spreadsheetId?.substring(0, 8)}... <Link size={10} />
                </a>
                <button 
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Sinkronisasi Ulang"
                  className="p-1 hover:bg-slate-100 border border-slate-900 bg-white text-slate-900 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
                </button>
                <button 
                  onClick={onDisconnect}
                  title="Putuskan Hubungan"
                  className="p-1 hover:bg-rose-100 border border-slate-900 bg-white text-rose-600 cursor-pointer"
                >
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-3.5 py-1.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                <Link size={12} />
                Hubungkan Google Sheets
              </button>
            )}

            {/* Logged in custom user portal badge */}
            {loggedInUser && (
              <div className="flex items-center gap-2.5 bg-slate-100 border-2 border-slate-900 px-3 py-1 text-xs text-slate-900 font-bold">
                <div className="bg-slate-900 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-none">
                  {loggedInUser.nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-900 font-black text-xs leading-none">{loggedInUser.nama}</span>
                  <span className={`text-[8px] font-black uppercase tracking-wider ${
                    loggedInUser.role === 'kepala_sekolah' 
                      ? 'text-amber-600' 
                      : loggedInUser.role === 'wali_kelas' 
                        ? 'text-blue-600' 
                        : 'text-emerald-600'
                  }`}>
                    {loggedInUser.role === 'kepala_sekolah' ? 'Kepala Sekolah' : loggedInUser.role === 'wali_kelas' ? 'Wali Kelas' : 'Orang Tua / Wali'}
                  </span>
                </div>
                <span className="text-slate-300 mx-1">|</span>
                <button
                  onClick={onLogoutPortal}
                  title="Keluar dari Portal"
                  className="p-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <LogOut size={13} strokeWidth={2.5} />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Static context indicators based on active user role to lock navigation */}
        {loggedInUser && loggedInUser.role === 'wali_kelas' && (
          <div className="flex items-center gap-2 py-2.5 border-t-2 border-slate-900 text-xs text-slate-800">
            <span className="font-black uppercase tracking-wider text-[9px] bg-blue-100 border border-blue-900 text-blue-900 px-2 py-0.5">
              Kelas Dikelola
            </span>
            {database.kelas.filter(k => k.kelas_id === selectedKelasId).map((k) => (
              <span key={k.kelas_id} className="font-black text-xs text-slate-900 uppercase">
                {k.nama_kelas} &bull; Tahun Ajaran {k.tahun_ajaran}
              </span>
            ))}
          </div>
        )}

        {loggedInUser && loggedInUser.role === 'wali_siswa' && (
          <div className="flex items-center gap-2 py-2.5 border-t-2 border-slate-900 text-xs text-slate-800">
            <span className="font-black uppercase tracking-wider text-[9px] bg-emerald-100 border border-emerald-900 text-emerald-900 px-2 py-0.5">
              Siswa Pantauan
            </span>
            {database.siswa.filter(s => s.siswa_id === selectedSiswaId).map((s) => {
              const k = database.kelas.find(kl => kl.kelas_id === s.kelas_id);
              return (
                <span key={s.siswa_id} className="font-black text-xs text-slate-900 uppercase">
                  {s.nama} &bull; NISN {s.nisn} {k ? `(${k.nama_kelas})` : ''}
                </span>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
