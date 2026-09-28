import React, { useState, useEffect } from 'react';
import { Users, Settings, Activity, Plus, Trash2, Check, X, LogOut, Shield, Calendar, TrendingUp, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { User } from '../types/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_EDGE = `${SUPABASE_URL}/functions/v1/admin-users`;
const ADMIN_PASSWORD_KEY = 'xml_app_admin_v2';

const edgeHeaders = {
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${ADMIN_EDGE}${path}`, { ...init, headers: { ...edgeHeaders, ...(init?.headers as object || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API greška');
  return data;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  budget_user_id: string;
  treasury: string;
  role: 'user' | 'admin';
  status: 'active' | 'pending' | 'suspended';
  pdf_display_name: string;
}

const emptyNewUser: NewUserForm = {
  username: '', email: '', password: '', budget_user_id: '',
  treasury: '', role: 'user', status: 'active', pdf_display_name: ''
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'activity'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(emptyNewUser);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setNewUser(emptyNewUser);
      setShowUserForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri kreiranju korisnika');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovog korisnika? Svi njegovi podaci će biti obrisani.')) return;
    try {
      await apiFetch(`/${userId}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri brisanju');
    }
  };

  const handleSaveAdminSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newAdminPassword);
    }
    setShowSettingsForm(false);
    setNewAdminPassword('');
    setNewAdminUsername('');
    alert('Admin podaci su ažurirani!');
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { cls: string; label: string }> = {
      active: { cls: 'bg-emerald-100 text-emerald-800', label: 'Aktivan' },
      pending: { cls: 'bg-amber-100 text-amber-800', label: 'Na čekanju' },
      suspended: { cls: 'bg-red-100 text-red-800', label: 'Suspendovan' }
    };
    const { cls, label } = cfg[status] || { cls: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  const activeCount = users.filter(u => u.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Admin Panel</h1>
                <p className="text-xs text-gray-500">Upravljanje korisnicima</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadUsers}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Osveži"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Odjavi se</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ukupno korisnika', value: users.length },
            { icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Aktivni', value: activeCount },
            { icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Na čekanju', value: users.filter(u => u.status === 'pending').length },
            { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50', label: 'Suspendovani', value: users.filter(u => u.status === 'suspended').length },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 px-4 pt-2">
              {[
                { id: 'users', label: 'Korisnici', icon: Users },
                { id: 'settings', label: 'Podešavanja', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Korisnici sistema</h2>
                  <button
                    onClick={() => setShowUserForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Dodaj korisnika</span>
                  </button>
                </div>

                {/* Create User Modal */}
                {showUserForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Dodaj novog korisnika</h3>
                        <p className="text-sm text-gray-500 mt-1">Korisnik se prijavljuje email adresom i lozinkom</p>
                      </div>
                      <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Korisničko ime *</label>
                          <input
                            type="text"
                            value={newUser.username}
                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email adresa *</label>
                          <input
                            type="email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lozinka *</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={newUser.password}
                              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              required
                              minLength={6}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID budžeta *</label>
                            <input
                              type="text"
                              value={newUser.budget_user_id}
                              onChange={e => setNewUser({ ...newUser, budget_user_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trezor *</label>
                            <input
                              type="text"
                              value={newUser.treasury}
                              onChange={e => setNewUser({ ...newUser, treasury: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ime za PDF (opciono)</label>
                          <input
                            type="text"
                            value={newUser.pdf_display_name}
                            onChange={e => setNewUser({ ...newUser, pdf_display_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Prikazuje se na štampanim dokumentima"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={newUser.status}
                            onChange={e => setNewUser({ ...newUser, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="active">Aktivan</option>
                            <option value="pending">Na čekanju</option>
                            <option value="suspended">Suspendovan</option>
                          </select>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                          <button type="button" onClick={() => { setShowUserForm(false); setNewUser(emptyNewUser); }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                            Otkaži
                          </button>
                          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-60">
                            {submitting ? 'Kreiranje...' : 'Kreiraj korisnika'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Users Table */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-500">Učitavanje korisnika...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Nema korisnika. Dodajte prvog korisnika.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          {['Korisnik', 'Email', 'ID budžeta', 'Trezor', 'Status', 'Akcije'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{user.username}</div>
                              {user.pdf_display_name && <div className="text-xs text-gray-400">{user.pdf_display_name}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-700">{user.budget_user_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{user.treasury}</td>
                            <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    user.status === 'active'
                                      ? 'text-red-500 hover:bg-red-50'
                                      : 'text-emerald-500 hover:bg-emerald-50'
                                  }`}
                                  title={user.status === 'active' ? 'Suspenduj' : 'Aktiviraj'}
                                >
                                  {user.status === 'active' ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Obriši korisnika"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-md">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Admin podešavanja</h2>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Promeni admin lozinku</h3>
                  {showSettingsForm ? (
                    <form onSubmit={handleSaveAdminSettings} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Korisničko ime admina</label>
                        <input
                          type="text"
                          value={newAdminUsername}
                          onChange={e => setNewAdminUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          placeholder="denis.ivic"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova lozinka</label>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={e => setNewAdminPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          minLength={8}
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button type="button" onClick={() => setShowSettingsForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg">Otkaži</button>
                        <button type="submit" className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg">Sačuvaj</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowSettingsForm(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Promeni lozinku</span>
                    </button>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Napomena:</strong> Korisnici se prijavljuju putem email adrese i lozinke.
                    Sve promene se odmah sinhronizuju na svim uređajima korisnika.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
