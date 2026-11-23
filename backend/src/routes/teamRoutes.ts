import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  getTeamByTeamId,
  resolveTeam,
  bulkImportTeams,
  getTeamHeadToHead,
  triggerAutoUpdate,
  getAutoUpdateStatus
} from '../controllers/teamController';
import { protect } from '../middlewares/authMiddleware';
import { createTeamValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/bulk-import', protect, bulkImportTeams);
router.post('/resolve', protect, resolveTeam);
router.get('/master/:teamId', protect, getTeamByTeamId);

router.get('/head-to-head', getTeamHeadToHead);
router.get('/head-to-head/:id', getTeamHeadToHead);

router.post('/sync-stats', triggerAutoUpdate);
router.get('/sync-status', getAutoUpdateStatus);

router.post('/', protect, createTeamValidator, validateFields, createTeam);
router.get('/', getTeams);
router.get('/:id', getTeamById);

export default router;
