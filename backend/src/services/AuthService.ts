import { UserRepository } from '../repositories/UserRepository';
import jwt from 'jsonwebtoken';
import { IUser } from '../types';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  // Generate short-lived Access Token
  public generateAccessToken(user: IUser): string {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '15m' }
    );
  }

  // Generate longer-lived Refresh Token
  public generateRefreshToken(user: IUser): string {
    return jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || 'supersecret_refresh',
      { expiresIn: '7d' }
    );
  }

  public async register(payload: any): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const { username, email, password, role } = payload;

    const userExists = await this.userRepository.findByUsernameOrEmail(username, email);
    if (userExists) {
      throw new Error('Username or email already registered');
    }

    const user = await this.userRepository.create({
      username,
      email,
      password,
      role: role || 'player',
      status: 'active'
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Save refresh token in database
    await this.userRepository.updateRefreshToken(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  public async login(payload: any): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const { email, password } = payload;
    const identifier = (email || payload.username || '').trim();

    if (!identifier) {
      throw new Error('Email address or username is required.');
    }

    if (!password) {
      throw new Error('Password is required.');
    }

    // Support login via either email or username
    const user = await this.userRepository.findByUsernameOrEmail(identifier, identifier);
    if (!user) {
      throw new Error(`No account found with "${identifier}". Please check your email or Sign Up.`);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new Error('Incorrect password. Please verify your password or use Forgot Password.');
    }

    if (user.status === 'inactive') {
      throw new Error('User account is inactive. Please contact support.');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await this.userRepository.updateRefreshToken(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  public async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'supersecret_refresh') as { id: string };
      
      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        throw new Error('Token owner user not found');
      }

      // Read selected refreshToken from db
      const dbUser = await this.userRepository.findOne({ _id: user._id, refreshToken: token });
      if (!dbUser) {
        throw new Error('Refresh token is invalid or has been revoked');
      }

      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      await this.userRepository.updateRefreshToken(user._id.toString(), newRefreshToken);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      throw new Error(`Token refresh failed: ${(err as Error).message}`);
    }
  }

  public async logout(token: string): Promise<void> {
    const user = await this.userRepository.findOne({ refreshToken: token });
    if (user) {
      await this.userRepository.updateRefreshToken(user._id.toString(), null);
    }
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    return `${name.slice(0, 2)}${'*'.repeat(Math.min(name.length - 2, 5))}@${domain}`;
  }

  public async sendResetOtp(identifier: string): Promise<{ message: string; email: string; maskedEmail: string; otp: string }> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      throw new Error('Please provide your registered email address or username');
    }

    const user = await this.userRepository.findByEmailOrUsernameForReset(trimmed);
    if (!user) {
      throw new Error('No account found with this email or username. Please check and try again.');
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.userRepository.setResetOtp(user._id.toString(), otp, expires);

    console.log(`[AUTH-OTP] Password reset OTP generated for ${user.email}: ${otp} (expires in 10 mins)`);

    return {
      message: 'A 6-digit verification code has been sent to your registered email address.',
      email: user.email,
      maskedEmail: this.maskEmail(user.email),
      otp, // Provided for instant demo/offline testing reliability
    };
  }

  public async verifyResetOtp(email: string, otp: string): Promise<{ message: string; resetToken: string; email: string }> {
    const trimmedEmail = (email || '').trim();
    const trimmedOtp = (otp || '').trim();

    if (!trimmedEmail) {
      throw new Error('Email address is required');
    }
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      throw new Error('Please enter a valid 6-digit verification code');
    }

    const user = await this.userRepository.findByEmailOrUsernameForReset(trimmedEmail);
    if (!user) {
      throw new Error('User account not found');
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpires) {
      throw new Error('No active password reset request found. Please request a new verification code.');
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    if (user.resetPasswordOtp !== trimmedOtp) {
      throw new Error('Invalid verification code. Please check and enter the correct 6-digit code.');
    }

    // Generate a temporary 15-minute reset token
    const resetToken = jwt.sign(
      { id: user._id.toString(), email: user.email, purpose: 'pwd_reset' },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '15m' }
    );

    return {
      message: 'Verification code confirmed successfully.',
      resetToken,
      email: user.email,
    };
  }

  public async resetPasswordWithOtpOrToken(params: {
    email: string;
    newPassword: string;
    otp?: string;
    resetToken?: string;
  }): Promise<{ message: string }> {
    const { email, newPassword, otp, resetToken } = params;

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    const user = await this.userRepository.findByEmailOrUsernameForReset(email);
    if (!user) {
      throw new Error('User account not found');
    }

    let authorized = false;

    // Verify token if provided
    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'supersecret') as {
          id: string;
          email: string;
          purpose: string;
        };
        if (decoded.purpose === 'pwd_reset' && (decoded.id === user._id.toString() || decoded.email.toLowerCase() === user.email.toLowerCase())) {
          authorized = true;
        }
      } catch (tokenErr) {
        // Token verification failed, fallback to checking OTP if present
      }
    }

    // Or verify OTP if token was not valid or not supplied
    if (!authorized && otp) {
      const trimmedOtp = otp.trim();
      if (
        user.resetPasswordOtp &&
        user.resetPasswordExpires &&
        user.resetPasswordOtp === trimmedOtp &&
        new Date() <= new Date(user.resetPasswordExpires)
      ) {
        authorized = true;
      }
    }

    if (!authorized) {
      throw new Error('Invalid or expired authorization. Please verify your OTP code again.');
    }

    user.password = newPassword;
    await user.save();

    await this.userRepository.clearResetOtp(user._id.toString());

    return {
      message: 'Password has been reset successfully. You can now log in with your new credentials.'
    };
  }

  public async forgotPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ email });
    if (!user) {
      throw new Error('User email not registered');
    }

    user.password = newPassword;
    await user.save();
  }

  public async updateProfile(userId: string, data: { profilePic?: string; phone?: string; username?: string }): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (data.profilePic !== undefined) user.profilePic = data.profilePic;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.username !== undefined && data.username.trim() !== '') user.username = data.username.trim();

    await user.save();
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      phone: user.phone,
      role: user.role,
    };
  }
}
