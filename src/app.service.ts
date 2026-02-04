import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class AppService {
  private redisClient: Redis | null;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    // Initialize Redis client for health checks
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        retryStrategy: () => null, // Don't retry for health checks
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
    } catch (error) {
      // Redis not available, health check will report it
      this.redisClient = null;
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async checkDatabase(): Promise<{ status: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }

  async checkRedis(): Promise<{ status: string; responseTime?: number }> {
    if (!this.redisClient) {
      return { status: 'not_configured' };
    }

    try {
      const startTime = Date.now();
      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }

  async getHealthStatus(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    services: {
      database: { status: string; responseTime?: number };
      redis: { status: string; responseTime?: number };
    };
  }> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allHealthy =
      database.status === 'healthy' &&
      (redis.status === 'healthy' || redis.status === 'not_configured');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        database,
        redis,
      },
    };
  }
}
