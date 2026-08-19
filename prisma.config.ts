import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

for (const path of [
  'apps/admin-api/.env.local',
  'apps/admin-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
