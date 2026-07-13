import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPurchaseOrder } from './api';
import { fetchSuppliers } from '../suppliers/api';
import { fetchProducts } from '../products/api';
import { inputClass, btnPrimary, btnSecondary } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';

export const NewPurchaseOrderPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantityOrdered: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {});
    fetchProducts().then(setProducts).catch(() => {});
  }, []);

  const updateItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantityOrdered: '' }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.productId && Number(it.quantityOrdered) > 0);
    if (!supplierId || validItems.length === 0) {
      toast.error('Choose a supplier and at least one valid line item');
      return;
    }
    setSaving(true);
    try {
      const order = await createPurchaseOrder({
        supplierId: Number(supplierId),
        items: validItems.map((it) => ({ productId: Number(it.productId), quantityOrdered: Number(it.quantityOrdered) })),
      });
      toast.success('Purchase order created as draft');
      navigate(`/purchase-orders/${order.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/purchase-orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to purchase orders
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
        <p className="text-sm text-slate-500">Created as a draft — you can send it once it looks right.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Supplier</span>
          <select required className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-2 font-medium text-slate-700">Line items</p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  className={`${inputClass} flex-1`}
                  value={item.productId}
                  onChange={(e) => updateItem(idx, { productId: e.target.value })}
                >
                  <option value="">Select a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className={`${inputClass} w-28`}
                  value={item.quantityOrdered}
                  onChange={(e) => updateItem(idx, { quantityOrdered: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            <Plus className="h-4 w-4" /> Add line item
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={() => navigate('/purchase-orders')}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Creating…' : 'Create draft order'}
          </button>
        </div>
      </form>
    </div>
  );
};
