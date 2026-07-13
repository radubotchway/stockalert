import { useEffect, useState } from 'react';
import { Download, FileWarning, TrendingDown, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchExpiryReport, fetchLowStockReport, fetchMovementsReport, downloadCsv } from './api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { Badge, ExpiryBadge } from '../../components/Badge';
import { btnSecondary, inputClass } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';

const TABS = [
  { key: 'expiry', label: 'Expiry Report', icon: FileWarning },
  { key: 'lowStock', label: 'Low Stock Report', icon: TrendingDown },
  { key: 'movements', label: 'Movement History', icon: History },
];

const MOVEMENT_BADGE = { RECEIPT: 'green', DISPENSE: 'blue', ADJUSTMENT: 'amber', DISPOSAL: 'red' };

export const ReportsPage = () => {
  const [tab, setTab] = useState('expiry');
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '' });

  const loadExpiry = () => fetchExpiryReport().then(setExpiry);
  const loadLowStock = () => fetchLowStockReport().then(setLowStock);
  const loadMovements = () =>
    fetchMovementsReport({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      type: filters.type || undefined,
    }).then(setMovements);

  useEffect(() => {
    setLoading(true);
    const loader = tab === 'expiry' ? loadExpiry : tab === 'lowStock' ? loadLowStock : loadMovements;
    loader()
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const applyMovementFilters = () => {
    setLoading(true);
    loadMovements()
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const handleExport = () => {
    if (tab === 'expiry') downloadCsv('/reports/expiry', {}, 'expiry-report.csv');
    if (tab === 'lowStock') downloadCsv('/reports/low-stock', {}, 'low-stock-report.csv');
    if (tab === 'movements') downloadCsv('/reports/movements', filters, 'movements-report.csv');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Expiry, low-stock, and stock movement history — exportable to CSV.</p>
        </div>
        <button onClick={handleExport} className={btnSecondary}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'movements' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">From</span>
            <input type="date" className={inputClass} value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">To</span>
            <input type="date" className={inputClass} value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Type</span>
            <select className={inputClass} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              <option value="">All types</option>
              <option value="RECEIPT">Receipt</option>
              <option value="DISPENSE">Dispense</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="DISPOSAL">Disposal</option>
            </select>
          </label>
          <button onClick={applyMovementFilters} className={btnSecondary}>
            Apply filters
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading report…" />
      ) : tab === 'expiry' ? (
        <ExpiryReportTable data={expiry} />
      ) : tab === 'lowStock' ? (
        <LowStockReportTable data={lowStock} />
      ) : (
        <MovementsReportTable data={movements} />
      )}
    </div>
  );
};

const ExpiryReportTable = ({ data }) => {
  const rows = [...(data?.expired || []), ...(data?.expiring30 || []), ...(data?.expiring90 || [])];
  if (rows.length === 0) return <EmptyState icon={FileWarning} title="No expiry issues" description="No batches are expired or expiring soon." />;
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Batch #</th>
            <th className="px-4 py-3">Quantity</th>
            <th className="px-4 py-3">Expiry</th>
            <th className="px-4 py-3">Supplier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-700">{b.product.name}</td>
              <td className="px-4 py-3 text-slate-600">{b.batchNumber}</td>
              <td className="px-4 py-3 text-slate-600">{b.quantity}</td>
              <td className="px-4 py-3"><ExpiryBadge expiryDate={b.expiryDate} /></td>
              <td className="px-4 py-3 text-slate-500">{b.product.supplier?.name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const LowStockReportTable = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState icon={TrendingDown} title="Nothing below reorder level" description="All products currently meet their reorder threshold." />;
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Current Stock</th>
            <th className="px-4 py-3">Reorder Level</th>
            <th className="px-4 py-3">Supplier</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
              <td className="px-4 py-3 text-slate-600">{p.category}</td>
              <td className="px-4 py-3 text-slate-600">{p.totalQuantity}</td>
              <td className="px-4 py-3 text-slate-600">{p.reorderLevel}</td>
              <td className="px-4 py-3 text-slate-500">{p.supplier?.name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MovementsReportTable = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState icon={History} title="No movements found" description="Try widening your date range or clearing filters." />;
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Quantity</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">User</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{m.product.name}</td>
              <td className="px-4 py-3"><Badge color={MOVEMENT_BADGE[m.type]}>{m.type}</Badge></td>
              <td className="px-4 py-3 text-slate-600">{m.quantity}</td>
              <td className="px-4 py-3 text-slate-500">{m.reason}</td>
              <td className="px-4 py-3 text-slate-500">{m.user.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
