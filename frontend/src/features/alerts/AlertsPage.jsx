import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, TrendingDown, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAlerts } from './api';
import { disposeBatch } from '../products/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { Badge, ExpiryBadge } from '../../components/Badge';
import { btnDanger, btnSecondary, inputClass } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

const TABS = [
  { key: 'expired', label: 'Expired', icon: AlertTriangle, color: 'red' },
  { key: 'expiring30', label: 'Expiring ≤ 30 days', icon: Clock, color: 'amber' },
  { key: 'expiring90', label: 'Expiring ≤ 90 days', icon: Clock, color: 'blue' },
  { key: 'belowReorder', label: 'Below Reorder Level', icon: TrendingDown, color: 'slate' },
];

export const AlertsPage = () => {
  const { isPharmacist } = useAuth();
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('expired');
  const [disposing, setDisposing] = useState(null);
  const [reason, setReason] = useState('');

  const load = () => {
    setLoading(true);
    fetchAlerts()
      .then(setAlerts)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submitDispose = async (e) => {
    e.preventDefault();
    try {
      await disposeBatch(disposing.id, { reason });
      toast.success('Batch disposed');
      setDisposing(null);
      setReason('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingSpinner label="Loading alerts…" />;
  if (!alerts) return null;

  const rows = alerts[tab];
  const isBatchTab = tab !== 'belowReorder';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-sm text-slate-500">Expiring stock and low-inventory products that need attention.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <Badge color={color}>{alerts[key].length}</Badge>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Nothing here" description="No items currently fall into this alert category." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Product</th>
                {isBatchTab ? (
                  <>
                    <th className="px-4 py-3">Batch #</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Supplier</th>
                    {isPharmacist && <th className="px-4 py-3" />}
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Current Stock</th>
                    <th className="px-4 py-3">Reorder Level</th>
                    <th className="px-4 py-3">Supplier</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {isBatchTab
                ? rows.map((b) => (
                    <tr key={b.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <Link to={`/products/${b.product.id}`} className="font-medium text-brand-700 hover:underline">
                          {b.product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.batchNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{b.quantity}</td>
                      <td className="px-4 py-3"><ExpiryBadge expiryDate={b.expiryDate} /></td>
                      <td className="px-4 py-3 text-slate-500">{b.product.supplier?.name || '—'}</td>
                      {isPharmacist && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDisposing(b)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                          >
                            <Ban className="h-3.5 w-3.5" /> Dispose
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                : rows.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <Link to={`/products/${p.id}`} className="font-medium text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.totalQuantity}</td>
                      <td className="px-4 py-3 text-slate-600">{p.reorderLevel}</td>
                      <td className="px-4 py-3 text-slate-500">{p.supplier?.name || '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {disposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 font-semibold text-slate-800">Dispose batch {disposing.batchNumber}</h3>
            <p className="mb-3 text-sm text-slate-500">This writes off the remaining {disposing.quantity} unit(s) and logs the reason.</p>
            <form onSubmit={submitDispose}>
              <input
                required
                className={inputClass}
                placeholder="Reason (e.g. expired, damaged)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className={btnSecondary} onClick={() => setDisposing(null)}>
                  Cancel
                </button>
                <button type="submit" className={btnDanger}>
                  Confirm dispose
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
