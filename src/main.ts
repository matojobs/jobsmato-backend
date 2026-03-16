import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy (Nginx/Cloudflare) so redirects and URL building use correct protocol/host
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // CORS configuration - MUST be before other middleware, especially Helmet
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3100', // Frontend development port
        'https://jobsmato.com',
        'https://www.jobsmato.com',
        'https://jobsmato-frontend.vercel.app',
        'https://hrms.jobsmato.com', // Recruiter portal (HRMS) – can call API on prod
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200, // Changed to 200 for better compatibility
  });

  // Security middleware - Configure Helmet to not interfere with CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(morgan('combined'));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Jobsmato API')
    .setDescription('Complete API for Jobsmato job portal platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('jobs', 'Job management')
    .addTag('companies', 'Company management')
    .addTag('applications', 'Job applications')
    .addTag('candidates', 'Candidate database')
    .addTag('blog', 'Blog and content management')
    .addTag('notifications', 'Notifications and alerts')
    .addTag('analytics', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Register Express route for resume downloads with Google Drive URLs
  // NestJS wildcard routes don't handle URLs with colons (https:) properly
  // This middleware catches requests to /api/files/download/resume/* before NestJS routing
  // and ensures they're handled by the controller
  expressApp.use('/api/files/download/resume', (req: any, res: any, next: any) => {
    // Mark that this route should be handled
    req._resumeDownloadRoute = true;
    next();
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(`🚀 Jobsmato API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();