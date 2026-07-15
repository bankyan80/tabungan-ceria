import React from 'react';
import logoUrl from '../assets/images/tabungan_ceria_logo_1784134960731.jpg';

interface OsisLogoProps {
  size?: number;
  className?: string;
}

export const OsisLogo: React.FC<OsisLogoProps> = ({ size = 36, className }) => {
  return (
    <img
      src={logoUrl}
      alt="Tabungan Ceria Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0 ${className || ''}`}
      referrerPolicy="no-referrer"
      id="tabungan-ceria-logo-img"
    />
  );
};
