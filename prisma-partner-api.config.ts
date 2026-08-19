import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

for (const path of [
  'apps/fake-partner-api/.env.local',
  'apps/fake-partner-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}

export default defineConfig({
  schema: 'prisma-partner-api/schema.prisma',
  migrations: {
    path: 'prisma-partner-api/migrations',
  },
  datasource: {
    url: process.env['PARTNER_API_DATABASE_URL'],
  },
});
