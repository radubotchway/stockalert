import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { ScanLine, Search, PackagePlus, PackageMinus, ClipboardList, Camera, CameraOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchProductByBarcode } from '../products/api';
import { ProductFormModal } from '../products/ProductFormModal';
import { ReceiveBatchModal } from '../products/ReceiveBatchModal';
import { DispenseModal } from '../products/DispenseModal';
import { ExpiryBadge } from '../../components/Badge';
import { btnPrimary, btnSecondary, inputClass } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const SCANNER_ID = 'stockalert-scanner';

// Retail barcodes only. Narrowing the format list means ZXing spends every frame
// on the 1D decoders instead of also trying QR, Aztec, PDF417 and friends.
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
];

// 1D barcodes are wide and short, so the scan region should be too. Too small a
// box and the bars fall outside it; too tall and it wastes decode budget.
const scanBox = (viewW, viewH) => ({
  width: Math.floor(Math.min(viewW * 0.92, 520)),
  height: Math.floor(Math.min(viewH * 0.45, 220)),
});

export const ScanPage = () => {
  const { isPharmacist } = useAuth();
  const [manualBarcode, setManualBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [modal, setModal] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
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

  const handleScan = (decodedText) => {
    if (decodedText === lastScanned.current) return;
    lastScanned.current = decodedText;
    lookup(decodedText.replace(/\D/g, '') || decodedText);
    setTimeout(() => {
      lastScanned.current = null;
    }, 2500);
  };

  const startCamera = async () => {
    setCameraError(null);
    setStarting(true);
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No camera was found on this device.');
      const instance = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: BARCODE_FORMATS,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      scannerRef.current = instance;
      await instance.start(
        cameras[0].id,
        {
          fps: 10,
          qrbox: scanBox,
          // Resolution has to go through videoConstraints. Passing it as the
          // first argument fails: that parameter accepts a camera id string, or
          // an object with exactly one key (facingMode or deviceId), nothing more.
          // A 640x480 feed leaves roughly one camera pixel per bar, which cannot
          // decode, so ask for 1280x720 and let the browser fall back if it must.
          videoConstraints: {
            deviceId: { exact: cameras[0].id },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        handleScan,
        undefined
      );
      setScanning(true);
    } catch (err) {
      scannerRef.current = null;
      // html5-qrcode rejects with bare strings as often as with Error objects,
      // so reading .message alone silently loses the actual reason.
      const reason = typeof err === 'string' ? err : err?.message;
      setCameraError(reason || 'The camera could not be started.');
    } finally {
      setStarting(false);
    }
  };

  const stopCamera = async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!instance) return;
    try {
      await instance.stop();
    } catch {
      /* already stopped */
    }
    try {
      instance.clear();
    } catch {
      /* nothing left to clear */
    }
  };

  useEffect(() => {
    return () => {
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
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
        <p className="text-sm text-slate-500">Point the camera at a barcode, or enter one manually, which is handy for demos without a webcam.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold text-slate-800">
              <ScanLine className="h-4 w-4" /> Camera scanner
            </p>
            {scanning ? (
              <button type="button" onClick={stopCamera} className={btnSecondary}>
                <CameraOff className="h-4 w-4" /> Stop
              </button>
            ) : (
              <button type="button" onClick={startCamera} disabled={starting} className={btnPrimary}>
                <Camera className="h-4 w-4" /> {starting ? 'Starting...' : 'Start camera'}
              </button>
            )}
          </div>
          <div id={SCANNER_ID} className="overflow-hidden rounded-lg" />
          {!scanning && !starting && !cameraError && (
            <p className="mt-3 text-sm text-slate-500">
              Camera is off. Press start, then hold a barcode inside the box.
              Printed labels scan far more reliably than a phone screen.
            </p>
          )}
          {cameraError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <CameraOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{cameraError} Use manual entry instead.</span>
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
