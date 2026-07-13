import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wand2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPurchaseOrders, generateSuggestedOrders } from './api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { POStatusBadge } from '../../components/Badge';
import { btnPrimary, btnSecondary, inputClass } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

const STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

export const PurchaseOrdersPage = () => {
  const { isPharmacist } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    fetchPurchaseOrders({ status: status || undefined })
      .then(setOrders)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const handleSuggest = async () => {
    setGenerating(true);
    try {
      const res = await generateSuggestedOrders();
      if (res.created.length === 0) {
        toast('No products are currently below their reorder level.', { icon: 'ℹ️' });
      } else {
        toast.success(`Generated ${res.created.length} draft purchase order(s)`);
        load();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Track orders to suppliers from draft through to received.</p>
        </div>
        {isPharmacist && (
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSuggest} disabled={generating} className={btnSecondary}>
              <Wand2 className="h-4 w-4" /> {generating ? 'Generating…' : 'Suggested order'}
            </button>
            <Link to="/purchase-orders/new" className={btnPrimary}>
              <Plus className="h-4 w-4" /> New order
            </Link>
          </div>
        )}
      </div>

      <select className={`${inputClass} w-56`} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>

      {loading ? (
        <LoadingSpinner label="Loading purchase orders…" />
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No purchase orders" description="Create a new order or generate one from low-stock suggestions." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/purchase-orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      #{o.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.supplier.name}</td>
                  <td className="px-4 py-3 text-slate-600">{o.items.length}</td>
                  <td className="px-4 py-3"><POStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500">{o.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
