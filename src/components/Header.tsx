import React from 'react';
import { Printer, Sun, Moon, Database } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenNeonModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNeonModal }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Printer className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>edit-pdf</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Susun dan cetak nota faktur ke lembar dokumen A4
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Ambil Data Buku Produksi Button */}
          {onOpenNeonModal && (
            <button
              type="button"
              onClick={onOpenNeonModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-800 shadow-2xs hover:shadow-xs active:scale-95"
              title="Ambil Data Laporan Gaji dari Database Neon Buku Produksi"
            >
              <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Buku Produksi (Neon)</span>
              <span className="sm:hidden">Neon</span>
            </button>
          )}

          {/* Dark Mode Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs active:scale-95"
            title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 scale-100" />
                <span className="hidden sm:inline text-slate-200">Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-600 transition-transform rotate-0 scale-100" />
                <span className="hidden sm:inline text-slate-700">Mode Gelap</span>
              </>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 dark:bg-amber-400/80 sm:hidden"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

