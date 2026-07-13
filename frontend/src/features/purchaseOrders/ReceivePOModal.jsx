import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, inputClass, btnPrimary, btnSecondary } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { receivePurchaseOrder } from './api';

export const ReceivePOModal = ({ order, onClose, onSaved }) => {
  const outstanding = order.items.filter((i) => i.quantityReceived < i.quantityOrdered);
  const [lines, setLines] = useState(
    outstanding.map((i) => ({
      itemId: i.id,
      productName: i.product.name,
      remaining: i.quantityOrdered - i.quantityReceived,
      quantityReceived: '',
      batchNumber: '',
      expiryDate: '',
      costPrice: '',
      include: false,
    }))
  );
  const [saving, setSaving] = useState(false);

  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const receipts = lines
      .filter((l) => l.include)
      .map((l) => ({
        itemId: l.itemId,
        quantityReceived: Number(l.quantityReceived),
        batchNumber: l.batchNumber,
        expiryDate: l.expiryDate,
        costPrice: Number(l.costPrice),
      }));
    if (receipts.length === 0) {
      toast.error('Select at least one line item to receive');
      return;
    }
    setSaving(true);
    try {
      await receivePurchaseOrder(order.id, receipts);
      toast.success('Stock received and batches created');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Receive Stock — PO #${order.id}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
          {lines.map((l, idx) => (
            <div key={l.itemId} className="rounded-lg border border-slate-200 p-3">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={l.include} onChange={(e) => updateLine(idx, { include: e.target.checked })} />
                {l.productName} <span className="text-xs font-normal text-slate-400">({l.remaining} outstanding)</span>
              </label>
              {l.include && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    required
                    type="number"
                    min="1"
                    max={l.remaining}
                    placeholder="Qty received"
                    className={inputClass}
                    value={l.quantityReceived}
                    onChange={(e) => updateLine(idx, { quantityReceived: e.target.value })}
                  />
                  <input
                    required
                    placeholder="Batch #"
                    className={inputClass}
                    value={l.batchNumber}
                    onChange={(e) => updateLine(idx, { batchNumber: e.target.value })}
                  />
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={l.expiryDate}
                    onChange={(e) => updateLine(idx, { expiryDate: e.target.value })}
                  />
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cost price"
                    className={inputClass}
                    value={l.costPrice}
                    onChange={(e) => updateLine(idx, { costPrice: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Receiving…' : 'Confirm receipt'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
