import { Router } from 'express';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listSuppliers);
router.get('/:id', getSupplier);
router.post('/', requireRole('PHARMACIST'), createSupplier);
router.patch('/:id', requireRole('PHARMACIST'), updateSupplier);
router.delete('/:id', requireRole('PHARMACIST'), deleteSupplier);

export default router;
