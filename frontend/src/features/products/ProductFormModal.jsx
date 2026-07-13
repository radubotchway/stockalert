import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, FormRow, inputClass, btnPrimary, btnSecondary } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createProduct, updateProduct } from './api';
import { fetchSuppliers } from '../suppliers/api';

const UNITS = ['tablet', 'bottle', 'box', 'tube', 'vial', 'sachet'];
const CATEGORIES = [
  'Analgesics',
  'Antibiotics',
  'Vitamins',
  'First Aid',
  'Antihistamines',
  'Respiratory',
  'Digestive',
  'Cardiovascular',
  'Diabetes Care',
  'Skin Care',
];

export const ProductFormModal = ({ initial, onClose, onSaved }) => {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || '',
    barcode: initial?.barcode || '',
    category: initial?.category || '',
    unit: initial?.unit || 'tablet',
    unitPrice: initial?.unitPrice ?? '',
    reorderLevel: initial?.reorderLevel ?? 10,
    supplierId: initial?.supplierId || '',
  });
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, supplierId: form.supplierId || null };
      const saved = isEdit ? await updateProduct(initial.id, payload) : await createProduct(payload);
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Product' : 'Add Product'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormRow label="Product name">
          <input required className={inputClass} value={form.name} onChange={set('name')} />
        </FormRow>
        <FormRow label="Barcode (EAN-13)">
          <input
            required
            className={inputClass}
            value={form.barcode}
            onChange={set('barcode')}
            pattern="\d{8,13}"
            title="8 to 13 digit barcode"
          />
        </FormRow>
        <FormRow label="Category">
          <input required list="category-options" className={inputClass} value={form.category} onChange={set('category')} />
          <datalist id="category-options">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormRow>
        <FormRow label="Unit">
          <select className={inputClass} value={form.unit} onChange={set('unit')}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Unit price (GHS)">
          <input required type="number" min="0" step="0.01" className={inputClass} value={form.unitPrice} onChange={set('unitPrice')} />
        </FormRow>
        <FormRow label="Reorder level">
          <input required type="number" min="0" className={inputClass} value={form.reorderLevel} onChange={set('reorderLevel')} />
        </FormRow>
        <FormRow label="Supplier">
          <select className={inputClass} value={form.supplierId} onChange={set('supplierId')}>
            <option value="">— None —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormRow>

        <div className="col-span-full mt-2 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
