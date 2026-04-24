import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { EmailService } from './email.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  private tokenBlacklist: Set<string> = new Set();

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.password_hash)) {
      if (user.status === 'suspended') {
        throw new UnauthorizedException('Account is suspended');
      }
      // Update last login
      user.last_login_at = new Date();
      await this.userRepository.save(user);
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
      };
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = uuidv4();

    const user = this.userRepository.create({
      email: dto.email,
      password_hash: passwordHash,
      first_name: dto.first_name,
      last_name: dto.last_name,
      role: dto.role || 'viewer',
      status: 'pending',
      email_verification_token: verificationToken,
      is_active: true,
    });

    const saved = await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(dto.email, verificationToken);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: saved.id,
        email: saved.email,
        first_name: saved.first_name,
        last_name: saved.last_name,
        role: saved.role,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetToken = uuidv4();
    user.password_reset_token = resetToken;
    user.password_reset_expires_at = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    await this.emailService.sendPasswordResetEmail(dto.email, resetToken);

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { password_reset_token: dto.token },
    });

    if (!user || !user.password_reset_expires_at || user.password_reset_expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password_hash = await bcrypt.hash(dto.new_password, 12);
    user.password_reset_token = null;
    user.password_reset_expires_at = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successful. You can now log in with your new password.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password_hash = await bcrypt.hash(dto.new_password, 12);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully.' };
  }

  async logout(token: string) {
    this.tokenBlacklist.add(token);
    return { message: 'Logged out successfully.' };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userRepository.findOne({
      where: { email_verification_token: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.email_verified_at = new Date();
    user.email_verification_token = null;
    user.status = 'active';
    await this.userRepository.save(user);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user || user.email_verified_at) {
      return { message: 'If the email exists and is not verified, a verification link has been sent.' };
    }

    const verificationToken = uuidv4();
    user.email_verification_token = verificationToken;
    await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(dto.email, verificationToken);

    return { message: 'If the email exists and is not verified, a verification link has been sent.' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      email_verified: !!user.email_verified_at,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }
}
