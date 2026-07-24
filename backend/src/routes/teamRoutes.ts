import { Router } from 'express';
import { createTeam, getTeams, getTeamById } from '../controllers/teamController';
import { protect } from '../middlewares/authMiddleware';
import { createTeamValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/', protect, createTeamValidator, validateFields, createTeam);
router.get('/', protect, getTeams);
router.get('/:id', protect, getTeamById);

export default router;
