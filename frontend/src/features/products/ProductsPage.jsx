import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ArrowUpDown, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchProducts, fetchCategories } from './api';
import { ProductFormModal } from './ProductFormModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { Badge, ExpiryBadge } from '../../components/Badge';
import { btnPrimary, inputClass } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

export const ProductsPage = () => {
  const { isPharmacist } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetchProducts({ search: search || undefined, category: category || undefined, sortBy, sortDir })
      .then(setProducts)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'unitPrice', label: 'Unit Price' },
      { key: 'reorderLevel', label: 'Reorder Level' },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Browse products, current stock, and expiry status.</p>
        </div>
        {isPharmacist && (
          <button onClick={() => setShowForm(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Add product
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by name or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={`${inputClass} w-48`} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try adjusting your search or filters, or add a new product."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                {columns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-4 py-3">
                    <button className="flex items-center gap-1 hover:text-slate-600" onClick={() => toggleSort(col.key)}>
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Nearest Expiry</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/products/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-400">{p.barcode}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.category}</td>
                  <td className="px-4 py-3 text-slate-600">GHS {p.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.reorderLevel}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{p.totalQuantity}</span>
                      {p.totalQuantity <= p.reorderLevel && <Badge color="amber">Low</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.nearestExpiry ? <ExpiryBadge expiryDate={p.nearestExpiry} /> : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProductFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
};
