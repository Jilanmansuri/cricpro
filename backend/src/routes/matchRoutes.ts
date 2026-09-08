import { Router } from 'express';
import { getMatches, getMatchById, checkDuplicateMatch, uploadScorecard, exportScorecard } from '../controllers/matchController';
import { saveManualMatch } from '../controllers/manualMatchController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';
import { saveMatchValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.get('/', protect, getMatches);
router.post('/check-duplicate', protect, checkDuplicateMatch);
router.post('/upload', protect, upload.array('scorecard', 5), uploadScorecard);
router.post('/save', protect, saveMatchValidator, validateFields, saveManualMatch);
router.get('/:id/export', protect, exportScorecard);
router.get('/:id', protect, getMatchById);

export default router;
