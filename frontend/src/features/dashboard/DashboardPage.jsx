import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle, Boxes, Coins, ClipboardList } from 'lucide-react';
import { fetchDashboard } from './api';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Badge } from '../../components/Badge';

// Validated categorical palette (fixed order — see dataviz skill, references/palette.md).
// "Other" is a muted gray so it never impersonates a real category slot.
const PIE_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
const OTHER_COLOR = '#898781';

const toChartCategories = (valueByCategory) => {
  if (valueByCategory.length <= PIE_COLORS.length) return valueByCategory;
  const head = valueByCategory.slice(0, PIE_COLORS.length - 1);
  const rest = valueByCategory.slice(PIE_COLORS.length - 1);
  const otherValue = rest.reduce((sum, c) => sum + c.value, 0);
  return [...head, { category: 'Other', value: otherValue }];
};

const MOVEMENT_LABELS = { RECEIPT: 'Received', DISPENSE: 'Dispensed', ADJUSTMENT: 'Adjusted', DISPOSAL: 'Disposed' };
const MOVEMENT_BADGE = { RECEIPT: 'green', DISPENSE: 'blue', ADJUSTMENT: 'amber', DISPOSAL: 'red' };

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">A snapshot of your pharmacy's stock, alerts, and activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Coins} label="Total Stock Value" value={`GHS ${data.totalStockValue.toFixed(2)}`} color="brand" />
        <StatCard icon={Boxes} label="Products" value={data.totalProducts} color="blue" to="/products" />
        <StatCard icon={AlertTriangle} label="Active Alerts" value={data.activeAlertsCount} color="red" to="/alerts" />
        <StatCard icon={ClipboardList} label="Pending Orders" value={data.pendingOrders} color="amber" to="/purchase-orders" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-red-700">Expired</p>
          <p className="text-3xl font-bold text-slate-900">{data.alertCounts.expired}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-amber-700">Expiring &le; 30 days</p>
          <p className="text-3xl font-bold text-slate-900">{data.alertCounts.expiring30}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-sky-700">Expiring &le; 90 days</p>
          <p className="text-3xl font-bold text-slate-900">{data.alertCounts.expiring90}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 font-semibold text-slate-800">Stock Value by Category</p>
          {data.valueByCategory.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No stock data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={toChartCategories(data.valueByCategory)} dataKey="value" nameKey="category" outerRadius={100}>
                  {toChartCategories(data.valueByCategory).map((entry, i) => (
                    <Cell key={entry.category} fill={entry.category === 'Other' ? OTHER_COLOR : PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `GHS ${v.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 font-semibold text-slate-800">Movements (last 30 days)</p>
          {data.movementsOverTime.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No movement activity yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.movementsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="RECEIPT" name="Received" stroke="#2f9169" strokeWidth={2} />
                <Line type="monotone" dataKey="DISPENSE" name="Dispensed" stroke="#0ea5e9" strokeWidth={2} />
                <Line type="monotone" dataKey="ADJUSTMENT" name="Adjusted" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="DISPOSAL" name="Disposed" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-3 font-semibold text-slate-800">Recent Stock Movements</p>
        {data.recentMovements.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No stock movements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Quantity</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">{m.product.name}</td>
                    <td className="py-2 pr-4">
                      <Badge color={MOVEMENT_BADGE[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge>
                    </td>
                    <td className="py-2 pr-4">{m.quantity}</td>
                    <td className="py-2 pr-4 text-slate-500">{m.user.name}</td>
                    <td className="py-2 pr-4 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
