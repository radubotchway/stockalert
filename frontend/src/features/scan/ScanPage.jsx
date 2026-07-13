import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { ScanLine, Search, PackagePlus, PackageMinus, ClipboardList, CameraOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchProductByBarcode } from '../products/api';
import { ProductFormModal } from '../products/ProductFormModal';
import { ReceiveBatchModal } from '../products/ReceiveBatchModal';
import { DispenseModal } from '../products/DispenseModal';
import { ExpiryBadge } from '../../components/Badge';
import { btnPrimary, btnSecondary, inputClass } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const SCANNER_ID = 'stockalert-scanner';

export const ScanPage = () => {
  const { isPharmacist } = useAuth();
  const [manualBarcode, setManualBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [modal, setModal] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef(null);
  const lastScanned = useRef(null);

  const lookup = async (barcode) => {
    if (!barcode) return;
    try {
      const found = await fetchProductByBarcode(barcode);
      setProduct(found);
      setNotFoundBarcode(null);
      toast.success(`Found: ${found.name}`);
    } catch (err) {
      if (err.response?.status === 404) {
        setProduct(null);
        setNotFoundBarcode(barcode);
        toast(`No product found for barcode ${barcode}`, { icon: '➕' });
      } else {
        toast.error('Lookup failed');
      }
    }
  };

  useEffect(() => {
    let scanner;
    try {
      scanner = new Html5QrcodeScanner(
        SCANNER_ID,
        { fps: 10, qrbox: { width: 250, height: 150 }, rememberLastUsedCamera: true },
        false
      );
      scanner.render(
        (decodedText) => {
          if (decodedText === lastScanned.current) return;
          lastScanned.current = decodedText;
          lookup(decodedText.replace(/\D/g, '') || decodedText);
          setTimeout(() => {
            lastScanned.current = null;
          }, 2500);
        },
        () => {}
      );
      scannerRef.current = scanner;
    } catch {
      setCameraError(true);
    }

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    lookup(manualBarcode.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scan</h1>
        <p className="text-sm text-slate-500">Point the camera at a barcode, or enter one manually — handy for demos without a webcam.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
            <ScanLine className="h-4 w-4" /> Camera scanner
          </p>
          <div id={SCANNER_ID} className="overflow-hidden rounded-lg" />
          {cameraError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <CameraOff className="h-4 w-4" /> Camera unavailable — use manual entry instead.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="mb-3 font-semibold text-slate-800">Manual barcode entry</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="e.g. 5901234123457"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
              />
              <button type="submit" className={btnPrimary}>
                <Search className="h-4 w-4" /> Look up
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400">
              Tip: open the <Link to="/barcodes" className="text-brand-600 hover:underline">demo barcodes page</Link> on another screen to scan with the camera.
            </p>
          </div>

          {product && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="font-mono text-xs text-slate-400">{product.barcode}</p>
                  <p className="mt-1 text-sm text-slate-500">{product.category} · {product.supplier?.name || 'No supplier'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{product.totalQuantity}</p>
                  <p className="text-xs text-slate-500">{product.unit}(s) in stock</p>
                </div>
              </div>

              {product.nearestExpiry && (
                <div className="mt-2">
                  <ExpiryBadge expiryDate={product.nearestExpiry} />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setModal('dispense')} disabled={product.totalQuantity === 0} className={btnPrimary}>
                  <PackageMinus className="h-4 w-4" /> Dispense
                </button>
                {isPharmacist && (
                  <button onClick={() => setModal('receive')} className={btnSecondary}>
                    <PackagePlus className="h-4 w-4" /> Receive stock
                  </button>
                )}
                <Link to={`/products/${product.id}`} className={btnSecondary}>
                  <ClipboardList className="h-4 w-4" /> View batches
                </Link>
              </div>
            </div>
          )}

          {notFoundBarcode && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
              <p className="font-medium text-slate-700">No product matches {notFoundBarcode}</p>
              <p className="mb-3 text-sm text-slate-500">You can add it as a new product now.</p>
              {isPharmacist ? (
                <button className={btnPrimary} onClick={() => setModal('add')}>
                  Add product with this barcode
                </button>
              ) : (
                <p className="text-xs text-slate-400">Ask a pharmacist to add this product.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {modal === 'dispense' && product && (
        <DispenseModal product={product} onClose={() => setModal(null)} onSaved={() => { setModal(null); lookup(product.barcode); }} />
      )}
      {modal === 'receive' && product && (
        <ReceiveBatchModal product={product} onClose={() => setModal(null)} onSaved={() => { setModal(null); lookup(product.barcode); }} />
      )}
      {modal === 'add' && (
        <ProductFormModal
          initial={{ barcode: notFoundBarcode }}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            setModal(null);
            setNotFoundBarcode(null);
            setProduct({ ...saved, batches: [], totalQuantity: 0, nearestExpiry: null });
          }}
        />
      )}
    </div>
  );
};
