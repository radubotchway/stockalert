import { useEffect, useState } from 'react';
import { Plus, Truck, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSuppliers, deleteSupplier } from './api';
import { SupplierFormModal } from './SupplierFormModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { btnPrimary } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

export const SuppliersPage = () => {
  const { isPharmacist } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    fetchSuppliers()
      .then(setSuppliers)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (supplier) => {
    if (!confirm(`Delete ${supplier.name}? This only works if no products are linked to it.`)) return;
    try {
      await deleteSupplier(supplier.id);
      toast.success('Supplier deleted');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Manage the suppliers you order stock from.</p>
        </div>
        {isPharmacist && (
          <button
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" /> Add supplier
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading suppliers…" />
      ) : suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers yet" description="Add your first supplier to start creating purchase orders." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-slate-900">{s.name}</p>
                {isPharmacist && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(s);
                        setModal(true);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                {s.contactPerson && <p>{s.contactPerson}</p>}
                {s.phone && <p>{s.phone}</p>}
                {s.email && <p>{s.email}</p>}
                {s.address && <p>{s.address}</p>}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-400">
                <span>{s._count?.products ?? 0} products</span>
                <span>{s._count?.purchaseOrders ?? 0} purchase orders</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <SupplierFormModal
          initial={editing}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            load();
          }}
        />
      )}
    </div>
  );
};
