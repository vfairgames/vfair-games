import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@vfair/prisma-client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env['DATABASE_URL'],
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
