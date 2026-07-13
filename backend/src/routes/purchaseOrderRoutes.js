import { Router } from 'express';
import {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  generateSuggestedOrders,
  receivePurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('PHARMACIST'));

router.get('/', listPurchaseOrders);
router.post('/suggested', generateSuggestedOrders);
router.get('/:id', getPurchaseOrder);
router.post('/', createPurchaseOrder);
router.patch('/:id/status', updatePurchaseOrderStatus);
router.delete('/:id', deletePurchaseOrder);
router.post('/:id/receive', receivePurchaseOrder);

export default router;
