import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtSecret } from '../config/required-env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
      issuer: process.env.JWT_ISSUER || 'nodeguard-auth',
      audience: process.env.JWT_AUDIENCE || 'nodeguard-api',
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, tenantId: payload.tenant_id, email: payload.email, role: payload.role };
  }
}
