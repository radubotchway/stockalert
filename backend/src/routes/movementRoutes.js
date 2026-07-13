import { Router } from 'express';
import { listMovements } from '../controllers/movementController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listMovements);

export default router;
