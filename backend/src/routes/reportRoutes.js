import { Router } from 'express';
import { expiryReport, lowStockReport, movementsReport } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/expiry', expiryReport);
router.get('/low-stock', lowStockReport);
router.get('/movements', movementsReport);

export default router;
