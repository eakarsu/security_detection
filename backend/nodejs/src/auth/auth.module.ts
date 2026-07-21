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
import { jwtSecret } from '../config/required-env';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, TenantSettings]),
    PassportModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: {
        expiresIn: '24h',
        issuer: process.env.JWT_ISSUER || 'nodeguard-auth',
        audience: process.env.JWT_AUDIENCE || 'nodeguard-api',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, EmailService],
  exports: [AuthService],
})
export class AuthModule {}
