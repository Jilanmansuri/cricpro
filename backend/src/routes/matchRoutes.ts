import { Router } from 'express';
import { getMatches, getMatchById, checkDuplicateMatch } from '../controllers/matchController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getMatches);
router.post('/check-duplicate', protect, checkDuplicateMatch);
router.get('/:id', protect, getMatchById);

export default router;
