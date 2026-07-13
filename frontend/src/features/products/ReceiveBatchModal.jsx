import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, FormRow, inputClass, btnPrimary, btnSecondary } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { receiveBatch } from './api';

export const ReceiveBatchModal = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({ batchNumber: '', quantity: '', expiryDate: '', costPrice: '' });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await receiveBatch(product.id, form);
      toast.success('Stock received');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Receive Stock — ${product.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormRow label="Batch number">
          <input required className={inputClass} value={form.batchNumber} onChange={set('batchNumber')} />
        </FormRow>
        <FormRow label="Quantity">
          <input required type="number" min="1" className={inputClass} value={form.quantity} onChange={set('quantity')} />
        </FormRow>
        <FormRow label="Expiry date">
          <input required type="date" className={inputClass} value={form.expiryDate} onChange={set('expiryDate')} />
        </FormRow>
        <FormRow label="Cost price per unit (GHS)">
          <input required type="number" min="0" step="0.01" className={inputClass} value={form.costPrice} onChange={set('costPrice')} />
        </FormRow>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : 'Receive stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
