import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  readonly client: Redis;

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
  ) {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 10000,
      commandTimeout: 1000,
      lazyConnect: true,
    });
    this.client.on('connect', () => {
      this.logger.info('Redis connected');
    });
    this.client.on('reconnecting', (delay: number) => {
      this.logger.warn({ delayMs: delay }, 'Redis reconnecting');
    });
    this.client.on('error', (error: unknown) => {
      this.logger.error({ error }, 'Redis error');
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this.client.status === 'end' || this.client.status === 'close') {
      return;
    }

    this.logger.info({ signal }, 'Closing Redis connection');

    try {
      await this.client.quit();
      this.logger.info('Redis connection closed');
    } catch (error: unknown) {
      this.logger.warn({ error }, 'Redis quit failed, forcing disconnect');
      this.client.disconnect();
    }
  }
}
