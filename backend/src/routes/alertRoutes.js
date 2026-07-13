import { Router } from 'express';
import { listAlerts } from '../controllers/alertController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listAlerts);

export default router;
