import { config } from 'dotenv';

for (const path of [
  'apps/admin-api/.env.local',
  'apps/admin-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}
