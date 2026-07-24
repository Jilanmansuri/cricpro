import { Router } from 'express';
import { getPlayers, getPlayerCareer, getPlayerHistory, createPlayer, updatePlayer, deletePlayer, getLeaderboard } from '../controllers/playerController';
import { protect } from '../middlewares/authMiddleware';


const router = Router();

router.get('/', protect, getPlayers);
router.get('/leaderboard', protect, getLeaderboard);
router.post('/', protect, createPlayer);
router.get('/:id/career', protect, getPlayerCareer);
router.get('/:id/history', protect, getPlayerHistory);
router.put('/:id', protect, updatePlayer);
router.delete('/:id', protect, deletePlayer);

export default router;
