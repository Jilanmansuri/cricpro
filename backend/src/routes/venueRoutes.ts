import { Router } from 'express';
import { getVenues, createVenue } from '../controllers/venueController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getVenues);
router.post('/', protect, createVenue);

export default router;
