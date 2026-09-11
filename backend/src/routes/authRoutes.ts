import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  forgotPassword,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
  getUserProfile,
  updateUserProfile
} from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  sendOtpValidator,
  verifyOtpValidator,
  resetPasswordValidator
} from '../validators/schemas';
import { validateFields } from '../middlewares/validationMiddleware';

const router = Router();

router.post('/register', registerValidator, validateFields, registerUser);
router.post('/login', loginValidator, validateFields, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

// Password Reset Flow
router.post('/forgot-password', forgotPasswordValidator, validateFields, forgotPassword);
router.post('/send-otp', sendOtpValidator, validateFields, sendResetOtp);
router.post('/verify-otp', verifyOtpValidator, validateFields, verifyResetOtp);
router.post('/reset-password', resetPasswordValidator, validateFields, resetPassword);

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;
