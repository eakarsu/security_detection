import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { WorkflowModule } from './workflow/workflow.module';
import { requiredEnv } from './config/required-env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
      username: process.env.POSTGRES_USER || process.env.DB_USER || 'nodeguard',
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || requiredEnv('POSTGRES_PASSWORD'),
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'nodeguard',
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      retryAttempts: 10,
      retryDelay: 3000,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule,
    SecurityModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
