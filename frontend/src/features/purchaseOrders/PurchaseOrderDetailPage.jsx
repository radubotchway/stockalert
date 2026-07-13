import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Send, Ban, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder } from './api';
import { ReceivePOModal } from './ReceivePOModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { POStatusBadge } from '../../components/Badge';
import { btnPrimary, btnSecondary, btnDanger } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

const ALLOWED_TRANSITIONS = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CANCELLED'],
  PARTIALLY_RECEIVED: ['CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

export const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPharmacist } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchPurchaseOrder(id)
      .then(setOrder)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const transition = async (status) => {
    setBusy(true);
    try {
      await updatePurchaseOrderStatus(order.id, status);
      toast.success(`Order marked as ${status.replace('_', ' ').toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirm('Delete this draft purchase order?')) return;
    try {
      await deletePurchaseOrder(order.id);
      toast.success('Draft order deleted');
      navigate('/purchase-orders');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingSpinner label="Loading purchase order…" />;
  if (!order) return null;

  const totalCost = order.items.reduce((sum, i) => sum + i.quantityOrdered * i.product.unitPrice, 0);
  const canReceive = isPharmacist && ['SENT', 'PARTIALLY_RECEIVED'].includes(order.status);

  return (
    <div className="print-area mx-auto max-w-3xl space-y-5">
      <div className="no-print flex items-center justify-between">
        <Link to="/purchase-orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to purchase orders
        </Link>
        <button onClick={() => window.print()} className={btnSecondary}>
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100 print:shadow-none print:ring-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Purchase Order</p>
            <h1 className="text-2xl font-bold text-slate-900">#{order.id}</h1>
            <p className="mt-1 text-sm text-slate-500">Created {new Date(order.createdAt).toLocaleDateString()} by {order.createdBy.name}</p>
          </div>
          <POStatusBadge status={order.status} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Supplier</p>
            <p className="font-medium text-slate-800">{order.supplier.name}</p>
            <p className="text-sm text-slate-500">{order.supplier.contactPerson}</p>
            <p className="text-sm text-slate-500">{order.supplier.phone}</p>
            <p className="text-sm text-slate-500">{order.supplier.email}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Ordered</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Unit Price</th>
                <th className="px-3 py-2">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2 font-medium text-slate-700">{item.product.name}</td>
                  <td className="px-3 py-2">{item.quantityOrdered}</td>
                  <td className="px-3 py-2">{item.quantityReceived}</td>
                  <td className="px-3 py-2">GHS {item.product.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-2">GHS {(item.quantityOrdered * item.product.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-3 pt-3 text-right font-medium text-slate-600">
                  Estimated total
                </td>
                <td className="px-3 pt-3 font-bold text-slate-900">GHS {totalCost.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isPharmacist && (
        <div className="no-print flex flex-wrap gap-2">
          {ALLOWED_TRANSITIONS[order.status]?.includes('SENT') && (
            <button disabled={busy} onClick={() => transition('SENT')} className={btnPrimary}>
              <Send className="h-4 w-4" /> Mark as sent
            </button>
          )}
          {canReceive && (
            <button onClick={() => setShowReceive(true)} className={btnPrimary}>
              <PackageCheck className="h-4 w-4" /> Receive stock
            </button>
          )}
          {ALLOWED_TRANSITIONS[order.status]?.includes('CANCELLED') && (
            <button disabled={busy} onClick={() => transition('CANCELLED')} className={btnDanger}>
              <Ban className="h-4 w-4" /> Cancel order
            </button>
          )}
          {order.status === 'DRAFT' && (
            <button onClick={handleDeleteDraft} className={btnSecondary}>
              Delete draft
            </button>
          )}
        </div>
      )}

      {showReceive && (
        <ReceivePOModal order={order} onClose={() => setShowReceive(false)} onSaved={() => { setShowReceive(false); load(); }} />
      )}
    </div>
  );
};
