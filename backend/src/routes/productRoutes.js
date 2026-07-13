import { Router } from 'express';
import {
  listProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
} from '../controllers/productController.js';
import { receiveBatch, disposeBatch, adjustBatch } from '../controllers/batchController.js';
import { dispenseProduct } from '../controllers/movementController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listProducts);
router.get('/categories', listCategories);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProduct);
router.post('/', requireRole('PHARMACIST'), createProduct);
router.patch('/:id', requireRole('PHARMACIST'), updateProduct);
router.delete('/:id', requireRole('PHARMACIST'), deleteProduct);

router.post('/:id/batches', requireRole('PHARMACIST'), receiveBatch);
router.post('/:id/dispense', dispenseProduct);

router.patch('/batches/:id/dispose', requireRole('PHARMACIST'), disposeBatch);
router.patch('/batches/:id/adjust', requireRole('PHARMACIST'), adjustBatch);

export default router;
