import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { OpenRouterService } from './openrouter.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SecurityController],
  providers: [SecurityService, OpenRouterService],
  exports: [SecurityService, OpenRouterService],
})
export class SecurityModule {}
