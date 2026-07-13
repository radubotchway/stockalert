import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, PackagePlus, PackageMinus, Pencil, Trash2, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchProduct, deleteProduct, disposeBatch } from './api';
import { ReceiveBatchModal } from './ReceiveBatchModal';
import { DispenseModal } from './DispenseModal';
import { ProductFormModal } from './ProductFormModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ExpiryBadge, expiryRowClass } from '../../components/Badge';
import { btnPrimary, btnSecondary, btnDanger, inputClass } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPharmacist } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'receive' | 'dispense' | 'edit'
  const [disposing, setDisposing] = useState(null);
  const [disposeReason, setDisposeReason] = useState('');

  const load = () => {
    setLoading(true);
    fetchProduct(id)
      .then(setProduct)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleDelete = async () => {
    if (!confirm(`Delete ${product.name}? This only works if it has no stock history.`)) return;
    try {
      await deleteProduct(product.id);
      toast.success('Product deleted');
      navigate('/products');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitDispose = async (e) => {
    e.preventDefault();
    try {
      await disposeBatch(disposing.id, { reason: disposeReason });
      toast.success('Batch marked as disposed');
      setDisposing(null);
      setDisposeReason('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingSpinner label="Loading product…" />;
  if (!product) return null;

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to inventory
      </Link>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <p className="mt-1 font-mono text-sm text-slate-400">{product.barcode}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>Category: <strong>{product.category}</strong></span>
              <span>Unit: <strong>{product.unit}</strong></span>
              <span>Unit price: <strong>GHS {product.unitPrice.toFixed(2)}</strong></span>
              <span>Reorder level: <strong>{product.reorderLevel}</strong></span>
              <span>Supplier: <strong>{product.supplier?.name || '—'}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{product.totalQuantity}</p>
            <p className="text-sm text-slate-500">{product.unit}(s) in stock</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setModal('dispense')} disabled={product.totalQuantity === 0} className={btnPrimary}>
            <PackageMinus className="h-4 w-4" /> Dispense
          </button>
          {isPharmacist && (
            <>
              <button onClick={() => setModal('receive')} className={btnSecondary}>
                <PackagePlus className="h-4 w-4" /> Receive stock
              </button>
              <button onClick={() => setModal('edit')} className={btnSecondary}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button onClick={handleDelete} className={btnDanger}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 font-semibold text-slate-800">Batches</h2>
        {product.batches.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No batches recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Batch #</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2">Cost Price</th>
                  <th className="px-3 py-2">Status</th>
                  {isPharmacist && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {product.batches.map((b) => (
                  <tr key={b.id} className={`border-b border-slate-50 last:border-0 ${b.disposed ? '' : expiryRowClass(b.expiryDate)}`}>
                    <td className="px-3 py-2 font-medium text-slate-700">{b.batchNumber}</td>
                    <td className="px-3 py-2">{b.quantity}</td>
                    <td className="px-3 py-2">
                      {b.disposed ? (
                        new Date(b.expiryDate).toLocaleDateString()
                      ) : (
                        <ExpiryBadge expiryDate={b.expiryDate} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{new Date(b.dateReceived).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-slate-500">GHS {b.costPrice.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {b.disposed ? (
                        <span className="text-xs text-slate-400" title={b.disposedReason}>
                          Disposed
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">Active</span>
                      )}
                    </td>
                    {isPharmacist && (
                      <td className="px-3 py-2">
                        {!b.disposed && b.quantity > 0 && (
                          <button
                            onClick={() => setDisposing(b)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                          >
                            <Ban className="h-3.5 w-3.5" /> Dispose
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'receive' && (
        <ReceiveBatchModal product={product} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal === 'dispense' && (
        <DispenseModal product={product} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal === 'edit' && (
        <ProductFormModal initial={product} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
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
                value={disposeReason}
                onChange={(e) => setDisposeReason(e.target.value)}
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
