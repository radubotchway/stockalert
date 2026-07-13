import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { inputClass, btnPrimary } from '../../components/Modal';

const DEMO_ACCOUNTS = [
  { role: 'Pharmacist', email: 'frances@stockalert.demo', password: 'Pharmacist123!', note: 'Full access' },
  { role: 'Assistant', email: 'assistant@stockalert.demo', password: 'Assistant123!', note: 'View & dispense only' },
];

export const LoginPage = () => {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-4xl grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">StockAlert</p>
              <p className="text-xs text-slate-400">Community Pharmacy Inventory & Expiry Tracker</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@pharmacy.demo"
              />
            </label>
            <label className="mb-5 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </label>
            <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="mb-1 font-semibold text-slate-800">Demo accounts</p>
          <p className="mb-4 text-sm text-slate-500">Click a card to autofill the login form.</p>
          <div className="space-y-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="w-full rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{account.role}</span>
                  <span className="text-xs text-slate-400">{account.note}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{account.email}</p>
                <p className="font-mono text-xs text-slate-500">{account.password}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
