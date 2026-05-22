import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as express from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const customViewsRouter = require('./customViews');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS - Support both development ports
  app.enableCors({
    origin: [
      'http://localhost:3000',  // Docker frontend
      'http://localhost:3010',  // Local dev frontend
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ].filter(Boolean),
    credentials: true,
  });

  // Body parser explicitly so /api/custom-views POST routes get JSON
  app.use(express.json({ limit: '2mb' }));

  // Permissive CORS for the standalone custom-views router
  app.use('/api/custom-views', (req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  // Mount custom views BEFORE setGlobalPrefix so it lives at /api/custom-views
  app.use('/api/custom-views', (req: any, _res: any, next: any) => {
    console.log('[custom-views]', req.method, req.url);
    next();
  });
  app.use('/api/custom-views', customViewsRouter);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NodeGuard AI Security Platform API')
    .setDescription('AI-powered cybersecurity detection and response platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 NodeGuard API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Failed to start NodeGuard API:', error);
  process.exit(1);
});
