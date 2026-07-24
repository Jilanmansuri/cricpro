import { Router } from 'express';
import {
  createTournament,
  getTournaments,
  getTournamentStandings,
  getTournamentLeaders
} from '../controllers/tournamentController';
import { protect } from '../middlewares/authMiddleware';
import { createTournamentValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/', protect, createTournamentValidator, validateFields, createTournament);
router.get('/', protect, getTournaments);
router.get('/:id/standings', protect, getTournamentStandings);
router.get('/:id/leaders', protect, getTournamentLeaders);

export default router;
