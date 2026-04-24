import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { EmailService } from './email.service';
import { User } from './entities/user.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, TenantSettings]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'nodeguard-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, EmailService],
  exports: [AuthService],
})
export class AuthModule {}
