import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, FormRow, inputClass, btnPrimary, btnSecondary } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { dispenseProduct } from './api';

export const DispenseModal = ({ product, onClose, onSaved }) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Sale/dispense');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await dispenseProduct(product.id, { quantity: Number(quantity), reason });
      toast.success(
        `Dispensed ${result.quantityDispensed} unit(s) from ${result.deductions.length} batch(es) (FEFO)`
      );
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Dispense — ${product.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Stock is deducted automatically from the batch expiring soonest (FEFO). Currently in stock:{' '}
        <span className="font-medium text-slate-700">{product.totalQuantity} {product.unit}(s)</span>
      </p>
      <form onSubmit={handleSubmit}>
        <FormRow label="Quantity to dispense">
          <input
            required
            type="number"
            min="1"
            max={product.totalQuantity}
            className={inputClass}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormRow>
        <FormRow label="Reason / notes">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormRow>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving || product.totalQuantity === 0} className={btnPrimary}>
            {saving ? 'Dispensing…' : 'Confirm dispense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
