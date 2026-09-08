import { Router } from 'express';
import { registerUser, loginUser, refreshToken, logoutUser, forgotPassword, getUserProfile, updateUserProfile } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { registerValidator, loginValidator, forgotPasswordValidator } from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/register', registerValidator, validateFields, registerUser);
router.post('/login', loginValidator, validateFields, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPasswordValidator, validateFields, forgotPassword);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;
