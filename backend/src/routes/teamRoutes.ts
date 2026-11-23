import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  getTeamByTeamId,
  resolveTeam,
  bulkImportTeams,
  getTeamHeadToHead
} from '../controllers/teamController';
import { protect } from '../middlewares/authMiddleware';
import { createTeamValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/bulk-import', protect, bulkImportTeams);
router.post('/resolve', protect, resolveTeam);
router.get('/master/:teamId', protect, getTeamByTeamId);

router.get('/head-to-head', protect, getTeamHeadToHead);
router.get('/head-to-head/:id', protect, getTeamHeadToHead);

router.post('/', protect, createTeamValidator, validateFields, createTeam);
router.get('/', protect, getTeams);
router.get('/:id', protect, getTeamById);

export default router;
