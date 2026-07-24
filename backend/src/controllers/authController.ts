import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../middlewares/authMiddleware';

const authService = new AuthService();

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ success: false, message: 'Refresh token is required' });
    return;
  }

  try {
    const tokens = await authService.refresh(token);
    res.json({
      success: true,
      message: 'Token refresh successful',
      data: tokens
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ success: false, message: 'Refresh token is required to logout' });
    return;
  }

  try {
    await authService.logout(token);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, newPassword } = req.body;
  try {
    await authService.forgotPassword(email, newPassword);
    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new credentials.'
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        profilePic: req.user.profilePic,
        role: req.user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
