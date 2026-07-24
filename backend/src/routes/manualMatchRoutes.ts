import { Router } from 'express';
import { saveManualMatch } from '../controllers/manualMatchController';
import { protect } from '../middlewares/authMiddleware';
import { saveMatchValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

// /save accepts the finalized JSON from the Manual Entry Screen and saves it to MongoDB inside a transaction
router.post('/save', protect, saveMatchValidator, validateFields, saveManualMatch);

export default router;
