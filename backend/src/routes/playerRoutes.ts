import { Router } from 'express';
import { getPlayers, getPlayerCareer, getPlayerHistory, createPlayer, updatePlayer, deletePlayer, getLeaderboard, getCricketRecords } from '../controllers/playerController';
import { protect } from '../middlewares/authMiddleware';


const router = Router();

router.get('/', protect, getPlayers);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/records', protect, getCricketRecords);
router.post('/', protect, createPlayer);
router.get('/:id/career', protect, getPlayerCareer);
router.get('/:id/history', protect, getPlayerHistory);
router.put('/:id', protect, updatePlayer);
router.delete('/:id', protect, deletePlayer);

export default router;
