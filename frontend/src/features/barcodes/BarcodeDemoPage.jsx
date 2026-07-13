import { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchProducts } from '../products/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { btnSecondary, inputClass } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';

const BarcodeCard = ({ product }) => {
  useEffect(() => {
    try {
      JsBarcode(`#barcode-${product.id}`, product.barcode, {
        format: 'EAN13',
        width: 2,
        height: 60,
        fontSize: 14,
        margin: 8,
      });
    } catch {
      JsBarcode(`#barcode-${product.id}`, product.barcode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        fontSize: 14,
        margin: 8,
      });
    }
  }, [product]);

  return (
    <div className="flex flex-col items-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="mb-2 text-center text-sm font-medium text-slate-700">{product.name}</p>
      <svg id={`barcode-${product.id}`} />
    </div>
  );
};

export const BarcodeDemoPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner label="Loading barcodes…" />;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demo Barcodes</h1>
          <p className="text-sm text-slate-500">
            Render seeded product barcodes on screen — point the Scan page camera at another device to demo scanning without physical labels.
          </p>
        </div>
        <button onClick={() => window.print()} className={btnSecondary}>
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <input
        className={`${inputClass} no-print max-w-sm`}
        placeholder="Filter by product name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="print-area grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <BarcodeCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
};
