import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onAdminLogin: () => void;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onAdminLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <span className="text-base font-bold text-white">FX</span>
          </div>
          <span className="text-lg font-semibold text-white">Finance XML</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-dropdown">
          <h1 className="text-xl font-bold text-gray-900">Dobrodošli</h1>
          <p className="mt-1 text-sm text-gray-500">Prijavite se — podaci se sinhronizuju na svim uređajima</p>

          {error && (
            <div className="mt-5 rounded-lg border border-error-200/60 bg-error-50 px-4 py-3">
              <p className="text-sm font-medium text-error-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="input-label">Email adresa</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pl-10"
                  placeholder="vasa@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Lozinka</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10 pr-10"
                  placeholder="Unesite lozinku"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Prijavljivanje...
                </span>
              ) : 'Prijavite se'}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <button
              onClick={onAdminLogin}
              className="w-full text-sm font-medium text-gray-500 transition hover:text-gray-700"
            >
              Administratorska prijava
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
