import React, { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, ChevronDown, LogOut } from 'lucide-react';
import { AuthState } from '../types/auth';

interface AppShellProps {
  authState: AuthState;
  isOnline: boolean;
  isSyncing: boolean;
  syncMessage: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Zapisi', active: true },
  { label: 'Validacija', active: false },
  { label: 'Import', active: false },
  { label: 'Export', active: false },
];

export const AppShell: React.FC<AppShellProps> = ({ authState, isOnline, isSyncing, syncMessage, onLogout, children }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = authState.user?.pdf_display_name || authState.user?.username || 'Korisnik';

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Application Header */}
      <header className="sticky top-0 z-30 border-b border-navy-700 bg-navy-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            {/* Product mark */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-sm font-bold text-white">FX</span>
              </div>
              <span className="text-[15px] font-semibold text-white">Finance XML</span>
            </div>
            {/* Navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                    item.active
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Online status */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {!isOnline ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  <WifiOff className="h-3.5 w-3.5" />
                  Offline
                </span>
              ) : isSyncing ? (
                <span className="flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-500">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Sinhronizacija
                </span>
              ) : syncMessage ? (
                <span className="flex items-center gap-1.5 rounded-full bg-success-600/15 px-2.5 py-1 text-xs font-medium text-success-600">
                  <Wifi className="h-3.5 w-3.5" />
                  {syncMessage}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-success-600/15 px-2.5 py-1 text-xs font-medium text-success-600">
                  <Wifi className="h-3.5 w-3.5" />
                  Online
                </span>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold text-gray-200">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-[13px] font-medium sm:block">{displayName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-dropdown animate-fade-in">
                    <div className="border-b border-gray-100 px-3 py-2.5">
                      <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                      {authState.user?.email && <p className="text-xs text-gray-500">{authState.user.email}</p>}
                      {authState.user?.budget_user_id && (
                        <p className="mt-1 text-xs text-gray-500">Budžet: {authState.user.budget_user_id}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); onLogout(); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Odjavi se
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
