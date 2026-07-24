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

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
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

  public async forgotPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ email });
    if (!user) {
      throw new Error('User email not registered');
    }

    user.password = newPassword;
    await user.save();
  }
}
