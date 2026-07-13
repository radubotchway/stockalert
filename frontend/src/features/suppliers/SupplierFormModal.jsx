import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, FormRow, inputClass, btnPrimary, btnSecondary } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createSupplier, updateSupplier } from './api';

export const SupplierFormModal = ({ initial, onClose, onSaved }) => {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || '',
    contactPerson: initial?.contactPerson || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    address: initial?.address || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = isEdit ? await updateSupplier(initial.id, form) : await createSupplier(form);
      toast.success(isEdit ? 'Supplier updated' : 'Supplier created');
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Supplier' : 'Add Supplier'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormRow label="Supplier name">
          <input required className={inputClass} value={form.name} onChange={set('name')} />
        </FormRow>
        <FormRow label="Contact person">
          <input className={inputClass} value={form.contactPerson} onChange={set('contactPerson')} />
        </FormRow>
        <FormRow label="Phone">
          <input className={inputClass} value={form.phone} onChange={set('phone')} />
        </FormRow>
        <FormRow label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={set('email')} />
        </FormRow>
        <FormRow label="Address">
          <input className={inputClass} value={form.address} onChange={set('address')} />
        </FormRow>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : 'Save supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
